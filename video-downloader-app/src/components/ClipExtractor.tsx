import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Scissors,
  Play,
  Download,
  Save,
  X,
  Loader2,
  Clock,
  Zap,
  Check,
  AlertCircle
} from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { storageService } from '../services/storageService';
import type { Video } from '../types';

interface ClipExtractorProps {
  video: Video;
  videoRef: React.RefObject<HTMLVideoElement>;
  onClose: () => void;
  onClipExtracted?: (clipId: string) => void;
}

interface Preset {
  label: string;
  icon: typeof Zap;
  getRange: (duration: number) => { start: number; end: number };
}

const PRESETS: Preset[] = [
  {
    label: 'First 30s',
    icon: Zap,
    getRange: (duration) => ({ start: 0, end: Math.min(30, duration) })
  },
  {
    label: 'First minute',
    icon: Zap,
    getRange: (duration) => ({ start: 0, end: Math.min(60, duration) })
  },
  {
    label: 'Last 30s',
    icon: Zap,
    getRange: (duration) => ({ start: Math.max(0, duration - 30), end: duration })
  },
  {
    label: 'Last minute',
    icon: Zap,
    getRange: (duration) => ({ start: Math.max(0, duration - 60), end: duration })
  },
  {
    label: 'Middle minute',
    icon: Zap,
    getRange: (duration) => ({
      start: Math.max(0, duration / 2 - 30),
      end: Math.min(duration, duration / 2 + 30)
    })
  }
];

export const ClipExtractor = ({ video, videoRef, onClose, onClipExtracted }: ClipExtractorProps) => {
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(30, video.duration));
  const [startInput, setStartInput] = useState('00:00:00');
  const [endInput, setEndInput] = useState(formatTime(Math.min(30, video.duration)));
  const [isDraggingStart, setIsDraggingStart] = useState(false);
  const [isDraggingEnd, setIsDraggingEnd] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [extractedBlob, setExtractedBlob] = useState<Blob | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  // Format seconds to HH:MM:SS
  function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  // Parse HH:MM:SS or MM:SS to seconds
  function parseTime(timeStr: string): number {
    const parts = timeStr.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  // Load FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message);
        });

        ffmpeg.on('progress', ({ progress }) => {
          setExtractProgress(Math.round(progress * 100));
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        setFfmpegLoaded(true);
      } catch (err) {
        console.error('Failed to load FFmpeg:', err);
        setError('Failed to load video processing library. Please refresh and try again.');
      }
    };

    loadFFmpeg();
  }, []);

  // Update input fields when times change
  useEffect(() => {
    setStartInput(formatTime(startTime));
  }, [startTime]);

  useEffect(() => {
    setEndInput(formatTime(endTime));
  }, [endTime]);

  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isDraggingStart || isDraggingEnd) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const clickedTime = percent * video.duration;

    // Set to nearest marker (start or end)
    const distToStart = Math.abs(clickedTime - startTime);
    const distToEnd = Math.abs(clickedTime - endTime);

    if (distToStart < distToEnd) {
      setStartTime(Math.max(0, Math.min(clickedTime, endTime - 1)));
    } else {
      setEndTime(Math.max(startTime + 1, Math.min(clickedTime, video.duration)));
    }
  };

  // Handle marker dragging
  const handleMarkerDrag = useCallback((e: MouseEvent, isStart: boolean) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const time = percent * video.duration;

    if (isStart) {
      setStartTime(Math.max(0, Math.min(time, endTime - 1)));
    } else {
      setEndTime(Math.max(startTime + 1, Math.min(time, video.duration)));
    }
  }, [endTime, startTime, video.duration]);

  // Mouse and touch event handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingStart) {
        handleMarkerDrag(e, true);
      } else if (isDraggingEnd) {
        handleMarkerDrag(e, false);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!timelineRef.current || (!isDraggingStart && !isDraggingEnd)) return;

      const touch = e.touches[0];
      const rect = timelineRef.current.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const time = percent * video.duration;

      if (isDraggingStart) {
        setStartTime(Math.max(0, Math.min(time, endTime - 1)));
      } else if (isDraggingEnd) {
        setEndTime(Math.max(startTime + 1, Math.min(time, video.duration)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    const handleTouchEnd = () => {
      setIsDraggingStart(false);
      setIsDraggingEnd(false);
    };

    if (isDraggingStart || isDraggingEnd) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDraggingStart, isDraggingEnd, handleMarkerDrag, endTime, startTime, video.duration]);

  // Handle time input change
  const handleStartInputChange = (value: string) => {
    setStartInput(value);
    const parsed = parseTime(value);
    if (parsed >= 0 && parsed < endTime && parsed <= video.duration) {
      setStartTime(parsed);
    }
  };

  const handleEndInputChange = (value: string) => {
    setEndInput(value);
    const parsed = parseTime(value);
    if (parsed > startTime && parsed <= video.duration) {
      setEndTime(parsed);
    }
  };

  // Preview clip
  const handlePreview = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = startTime;
      videoRef.current.play();

      // Stop at end time
      const checkTime = () => {
        if (videoRef.current && videoRef.current.currentTime >= endTime) {
          videoRef.current.pause();
        } else {
          requestAnimationFrame(checkTime);
        }
      };
      checkTime();
    }
  };

  // Apply preset
  const applyPreset = (preset: Preset) => {
    const range = preset.getRange(video.duration);
    setStartTime(range.start);
    setEndTime(range.end);
  };

  // Extract clip
  const handleExtractClip = async () => {
    if (!ffmpegRef.current || !ffmpegLoaded) {
      setError('Video processing library not loaded. Please wait or refresh the page.');
      return;
    }

    if (startTime >= endTime) {
      setError('End time must be after start time.');
      return;
    }

    setIsExtracting(true);
    setExtractProgress(0);
    setError(null);

    try {
      const ffmpeg = ffmpegRef.current;

      // Write input file to FFmpeg's virtual filesystem
      await ffmpeg.writeFile('input.mp4', await fetchFile(video.videoBlob));

      // Calculate duration
      const duration = endTime - startTime;

      // Execute FFmpeg command to extract clip
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-ss', startTime.toString(),
        '-t', duration.toString(),
        '-c', 'copy', // Copy codec for faster processing
        'output.mp4'
      ]);

      // Read output file
      const data = await ffmpeg.readFile('output.mp4');
      const blob = new Blob([data], { type: 'video/mp4' });

      setExtractedBlob(blob);
      setShowSaveOptions(true);
      setExtractProgress(100);
    } catch (err) {
      console.error('Extraction error:', err);
      setError('Failed to extract clip. Please try again.');
      setIsExtracting(false);
    }
  };

  // Save clip to library
  const handleSaveToLibrary = async () => {
    if (!extractedBlob) return;

    try {
      const clipTitle = `${video.title} - Clip (${formatTime(startTime)} - ${formatTime(endTime)})`;

      const clipData = {
        url: video.url,
        platform: video.platform,
        title: clipTitle,
        description: `Extracted clip from ${formatTime(startTime)} to ${formatTime(endTime)}\n\n${video.description}`,
        thumbnail: video.thumbnail,
        duration: endTime - startTime,
        author: video.author,
        quality: video.quality,
        format: video.format,
        videoBlob: extractedBlob,
        fileSize: extractedBlob.size,
        tags: [...video.tags, 'clip'],
      };

      const clipId = await storageService.saveVideo(clipData);

      if (onClipExtracted) {
        onClipExtracted(clipId);
      }

      onClose();
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save clip to library.');
    }
  };

  // Export clip directly
  const handleExportClip = () => {
    if (!extractedBlob) return;

    const url = URL.createObjectURL(extractedBlob);
    const link = document.createElement('a');
    link.href = url;
    const clipTitle = `${video.title.replace(/[^a-z0-9]/gi, '_')}_clip_${formatTime(startTime).replace(/:/g, '-')}_to_${formatTime(endTime).replace(/:/g, '-')}.mp4`;
    link.download = clipTitle;
    link.click();
    URL.revokeObjectURL(url);

    setIsExtracting(false);
    onClose();
  };

  const clipDuration = endTime - startTime;
  const startPercent = (startTime / video.duration) * 100;
  const endPercent = (endTime / video.duration) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Scissors className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Extract Clip
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a portion of the video to extract
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Preset buttons */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  disabled={isExtracting}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <preset.icon className="w-4 h-4" />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Timeline
            </label>
            <div className="relative">
              {/* Timeline background */}
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative h-20 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer overflow-hidden"
              >
                {/* Waveform representation (simulated with gradient) */}
                <div className="absolute inset-0 opacity-30">
                  <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
                </div>

                {/* Selected region */}
                <div
                  className="absolute top-0 bottom-0 bg-purple-500/40 border-l-2 border-r-2 border-purple-500"
                  style={{
                    left: `${startPercent}%`,
                    width: `${endPercent - startPercent}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-purple-600/20"></div>
                </div>

                {/* Start marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize group"
                  style={{ left: `${startPercent}%` }}
                  onMouseDown={() => setIsDraggingStart(true)}
                  onTouchStart={() => setIsDraggingStart(true)}
                >
                  {/* Handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-12 bg-green-500 rounded-lg shadow-lg flex items-center justify-center group-hover:bg-green-600 transition-colors touch-manipulation">
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                  {/* Label */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-500 text-white text-xs font-semibold rounded whitespace-nowrap">
                    Start
                  </div>
                </div>

                {/* End marker */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize group"
                  style={{ left: `${endPercent}%` }}
                  onMouseDown={() => setIsDraggingEnd(true)}
                  onTouchStart={() => setIsDraggingEnd(true)}
                >
                  {/* Handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-12 bg-red-500 rounded-lg shadow-lg flex items-center justify-center group-hover:bg-red-600 transition-colors touch-manipulation">
                    <div className="w-1 h-6 bg-white rounded"></div>
                  </div>
                  {/* Label */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded whitespace-nowrap">
                    End
                  </div>
                </div>
              </div>

              {/* Duration info */}
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>0:00</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    Clip duration: {formatTime(clipDuration)}
                  </span>
                </div>
                <span>{formatTime(video.duration)}</span>
              </div>
            </div>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                id="start-time"
                type="text"
                value={startInput}
                onChange={(e) => handleStartInputChange(e.target.value)}
                onBlur={() => setStartInput(formatTime(startTime))}
                disabled={isExtracting}
                placeholder="HH:MM:SS"
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-500 dark:focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                id="end-time"
                type="text"
                value={endInput}
                onChange={(e) => handleEndInputChange(e.target.value)}
                onBlur={() => setEndInput(formatTime(endTime))}
                disabled={isExtracting}
                placeholder="HH:MM:SS"
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-red-500 dark:focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Action buttons */}
          {!showSaveOptions ? (
            <div className="flex gap-3">
              <button
                onClick={handlePreview}
                disabled={isExtracting || !ffmpegLoaded}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                Preview Clip
              </button>
              <button
                onClick={handleExtractClip}
                disabled={isExtracting || !ffmpegLoaded || startTime >= endTime}
                className="flex-1 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Extracting... {extractProgress}%
                  </>
                ) : (
                  <>
                    <Scissors className="w-5 h-5" />
                    Extract Clip
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Success message */}
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                    Clip extracted successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    Duration: {formatTime(clipDuration)} • Size: {(extractedBlob!.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {/* Save options */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveToLibrary}
                  className="flex-1 py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Save to Library
                </button>
                <button
                  onClick={handleExportClip}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export Clip
                </button>
              </div>
            </div>
          )}

          {/* FFmpeg loading status */}
          {!ffmpegLoaded && !error && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Loading video processing library...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
