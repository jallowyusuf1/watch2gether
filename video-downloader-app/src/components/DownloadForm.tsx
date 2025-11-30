import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Loader2,
  AlertCircle,
  Youtube,
  Music,
  CheckCircle2,
  Video,
  X,
  Info,
  FileDown,
  Save,
  CheckCircle,
  XCircle,
  ArrowRight,
  ChevronDown,
  Clock,
  Scissors,
  List
} from 'lucide-react';
import { parseVideoUrl, getPlatformFromUrl } from '../utils/urlParser';
import { youtubeService } from '../services/youtubeService';
import { tiktokService } from '../services/tiktokService';
import { storageService } from '../services/storageService';
import { offlineQueue } from '../services/offlineQueue';
import { useOffline } from '../hooks/useOffline';
import { useNotifications } from '../contexts/NotificationContext';
import { QualityCard } from './QualityCard';
import BatchDownloader from './BatchDownloader';
import type { VideoPlatform, QualityOption } from '../types';

type DownloadStatus = 'idle' | 'fetching-metadata' | 'downloading' | 'processing' | 'saving' | 'completed' | 'failed';

export interface DownloadFormRef {
  focusInput: () => void;
}

/**
 * Download form component for video URL input and download initiation
 */
const DownloadForm = forwardRef<DownloadFormRef>((props, ref) => {
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo, showWarning } = useNotifications();
  const isOnline = useOffline();
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [batchMode, setBatchMode] = useState(false);

  // Expose focus function to parent components
  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    },
  }));
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState<VideoPlatform | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [stageMessage, setStageMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  const [urlValidation, setUrlValidation] = useState<'valid' | 'invalid' | 'empty'>('empty');
  const [showPlatformIndicator, setShowPlatformIndicator] = useState(false);
  const [savedVideoId, setSavedVideoId] = useState<string | null>(null);
  const [availableQualities, setAvailableQualities] = useState<QualityOption[]>([]);
  const [fetchingQualities, setFetchingQualities] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [audioQuality, setAudioQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [clipStartTime, setClipStartTime] = useState('');
  const [clipEndTime, setClipEndTime] = useState('');

  // Debounced URL validation and quality fetching
  useEffect(() => {
    const trimmedUrl = url.trim();

    // Clear validation if URL is empty
    if (!trimmedUrl) {
      setUrlValidation('empty');
      setPlatform(null);
      setShowPlatformIndicator(false);
      setError(null);
      setAvailableQualities([]);
      setVideoMetadata(null);
      return;
    }

    // Debounce validation by 500ms
    const timeoutId = setTimeout(async () => {
      const parsed = parseVideoUrl(trimmedUrl);

      if (parsed) {
        setPlatform(parsed.platform);
        setUrlValidation('valid');
        setShowPlatformIndicator(true);
        setError(null);

        // Fetch video metadata and available qualities
        setFetchingQualities(true);
        try {
          let metadata: any;
          let qualities: QualityOption[] = [];

          if (parsed.platform === 'youtube') {
            metadata = await youtubeService.getVideoMetadata(trimmedUrl);
            const isShort = youtubeService.isShort(trimmedUrl);
            qualities = await youtubeService.getAvailableQualities(
              parsed.videoId,
              metadata.duration,
              isShort
            );
          } else if (parsed.platform === 'tiktok') {
            metadata = await tiktokService.getVideoMetadata(trimmedUrl);
            qualities = await tiktokService.getAvailableQualities(
              trimmedUrl,
              metadata.duration
            );
          }

          setVideoMetadata(metadata);
          setAvailableQualities(qualities);

          // Set default quality to recommended or first available
          const recommended = qualities.find((q) => q.recommended);
          if (recommended) {
            setQuality(recommended.resolution);
          } else if (qualities.length > 0) {
            setQuality(qualities[0].resolution);
          }
        } catch (err) {
          console.error('Error fetching qualities:', err);
          // Don't show error for quality fetching failures, just use defaults
          setAvailableQualities([]);
        } finally {
          setFetchingQualities(false);
        }
      } else {
        setPlatform(null);
        setUrlValidation('invalid');
        setShowPlatformIndicator(false);
        setAvailableQualities([]);
        setVideoMetadata(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [url]);

  // Check if server is running
  const checkServerConnection = async (): Promise<boolean> => {
    try {
      const proxyUrl = import.meta.env.VITE_YOUTUBE_API_PROXY || 'http://localhost:3000/api/youtube';
      const baseUrl = proxyUrl.replace('/api/youtube', '');
      const response = await fetch(`${baseUrl}/health`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      // Try to ping the YouTube endpoint as a health check
      try {
        const proxyUrl = import.meta.env.VITE_YOUTUBE_API_PROXY || 'http://localhost:3000/api/youtube';
        const response = await fetch(`${proxyUrl}?id=test`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        // Even if it fails with 400, server is running
        return true;
      } catch {
        return false;
      }
    }
  };

  // Cancel download
  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setDownloadStatus('idle');
    setProgress(0);
    setStageMessage('');
    setError(null);
    setSavedVideoId(null);
    abortControllerRef.current = null;
  };

  // Handle download function
  const handleDownload = async () => {
    // Validate URL
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      setError('Invalid video URL. Please enter a valid YouTube or TikTok URL.');
      setDownloadStatus('failed');
      return;
    }

    // Check if offline - queue the download
    const isOffline = !isOnline;
    if (isOffline) {
      try {
        await offlineQueue.add(url, parsed.platform, quality, format);
        setDownloadStatus('completed');
        setStageMessage('Queued for download when online');
        setError(null);
        setProgress(100);
        
        // Show success message
        setTimeout(() => {
          resetForm();
        }, 2000);
        return;
      } catch (error) {
        setError('Failed to queue download. Please try again when online.');
        setDownloadStatus('failed');
        return;
      }
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Check server connection first
    setDownloadStatus('fetching-metadata');
    setStageMessage('Checking server connection...');
    setProgress(2);
    setError(null);

    const serverRunning = await checkServerConnection();
    if (!serverRunning) {
      const errorMsg = 'Download server is not running. Please start the server by running "npm run server" in a terminal, then try again.';
      showError(errorMsg);
      setError(errorMsg);
      setDownloadStatus('failed');
      return;
    }

    try {
      let videoBlob: Blob;
      let metadata: any;

      // Step 1: Get video metadata (0-20% progress)
      setDownloadStatus('fetching-metadata');
      setStageMessage('Fetching video information...');
      setProgress(5);
      showInfo(`Starting download from ${parsed.platform === 'youtube' ? 'YouTube' : 'TikTok'}...`);

      if (parsed.platform === 'youtube') {
        metadata = await youtubeService.getVideoMetadata(url);
        setProgress(20);
        
        // Step 2: Download video (20-80% progress)
        setDownloadStatus('downloading');
        setStageMessage('Downloading video...');
        
        // Track download progress
        let downloadProgress = 20;
        const progressInterval = setInterval(() => {
          if (!signal.aborted && downloadProgress < 80) {
            downloadProgress += 2;
            setProgress(downloadProgress);
            setStageMessage(`Downloading video... ${downloadProgress}%`);
          }
        }, 300);

        try {
          videoBlob = await youtubeService.downloadVideo(
            parsed.videoId,
            quality,
            format
          );
        } finally {
          clearInterval(progressInterval);
        }
      } else if (parsed.platform === 'tiktok') {
        metadata = await tiktokService.getVideoMetadata(url);
        setProgress(20);
        
        // Step 2: Download video (20-80% progress)
        setDownloadStatus('downloading');
        setStageMessage('Downloading video...');
        
        // Track download progress
        let downloadProgress = 20;
        const progressInterval = setInterval(() => {
          if (!signal.aborted && downloadProgress < 80) {
            downloadProgress += 2;
            setProgress(downloadProgress);
            setStageMessage(`Downloading video... ${downloadProgress}%`);
          }
        }, 300);

        try {
          videoBlob = await tiktokService.downloadVideo(url, false);
        } finally {
          clearInterval(progressInterval);
        }
      } else {
        throw new Error('Platform not supported. Only YouTube and TikTok are currently supported.');
      }

      if (signal.aborted) {
        return;
      }

      setProgress(85);
      setDownloadStatus('processing');
      setStageMessage('Processing video...');

      // Small delay to show processing state
      await new Promise(resolve => setTimeout(resolve, 500));

      if (signal.aborted) {
        return;
      }

      setProgress(90);
      setDownloadStatus('saving');
      setStageMessage('Saving to library...');

      // Step 3: Save to IndexedDB (90-100% progress)
      const videoData = {
        url: url,
        platform: parsed.platform,
        title: metadata.title || 'Untitled Video',
        description: metadata.description || metadata.caption || '',
        thumbnail: metadata.thumbnail || '',
        duration: metadata.duration || 0,
        author: metadata.author || 'Unknown',
        quality: quality,
        format: format,
        videoBlob: videoBlob,
        fileSize: videoBlob.size,
      };

      setProgress(95);
      const videoId = await storageService.saveVideo(videoData);
      setSavedVideoId(videoId);
      setProgress(100);
      setDownloadStatus('completed');
      setStageMessage('Complete!');
      showSuccess(`Video "${metadata.title || 'Untitled Video'}" downloaded successfully!`);
    } catch (err: any) {
      if (signal.aborted) {
        // User cancelled, don't show error
        return;
      }

      console.error('Download error:', err);
      let errorMessage = 'An error occurred during download';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Check for common errors and provide helpful messages
        if (errorMessage.includes('quota exceeded') || errorMessage.includes('quotaExceeded')) {
          errorMessage = 'YouTube API quota exceeded. The daily limit has been reached. Please try again tomorrow or use a different API key.';
        } else if (errorMessage.includes('Network error') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
          errorMessage = 'Cannot connect to download server. Please make sure the server is running on port 3000. Run "npm run server" in a terminal.';
        } else if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Video not found')) {
          errorMessage = 'Video not found. The video may have been deleted, is private, or the URL is incorrect.';
        } else if (errorMessage.includes('403') || errorMessage.includes('Access denied') || errorMessage.includes('forbidden')) {
          errorMessage = 'Access denied. The video may be private, age-restricted, or your API key lacks permissions.';
        } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
          errorMessage = 'Request timeout. The connection to YouTube API timed out. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Invalid YouTube API key') || errorMessage.includes('invalidCredentials')) {
          errorMessage = 'Invalid YouTube API key. Please check your API key configuration in the .env file.';
        } else if (errorMessage.includes('Unknown error') || (errorMessage.includes('Unknown') && !errorMessage.includes('network'))) {
          errorMessage = 'An unexpected error occurred. Please check the console for details and try again.';
        }
      }
      
      showError(errorMessage);
      setError(errorMessage);
      setDownloadStatus('failed');
    }
  };

  // Get platform icon
  const getPlatformIcon = () => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-6 h-6 text-red-600 dark:text-red-500" />;
      case 'tiktok':
        return <Video className="w-6 h-6 text-black dark:text-white" />;
      default:
        return null;
    }
  };

  // Get platform display name
  const getPlatformName = () => {
    switch (platform) {
      case 'youtube':
        return 'YouTube';
      case 'tiktok':
        return 'TikTok';
      default:
        return '';
    }
  };

  // Get status icon
  const getStatusIcon = () => {
    switch (downloadStatus) {
      case 'fetching-metadata':
      case 'downloading':
      case 'processing':
      case 'saving':
        return <Loader2 className="w-6 h-6 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Info className="w-6 h-6 text-gray-600" />;
    }
  };

  // Download button is only enabled when valid platform is detected and not downloading
  const isDownloadDisabled = !platform || downloadStatus !== 'idle' || urlValidation !== 'valid';
  const isDownloading = downloadStatus !== 'idle' && downloadStatus !== 'completed' && downloadStatus !== 'failed';

  // Show batch mode if toggled
  if (batchMode) {
    return (
      <div className="w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Batch Download
            </h1>
            <button
              onClick={() => setBatchMode(false)}
              className="btn-glass px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 transition-all duration-200 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Single Mode
            </button>
          </div>
          <BatchDownloader />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-10">
        {/* Heading */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Download Videos
          </h1>
          <button
            onClick={() => setBatchMode(true)}
            className="btn-glass px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all duration-200 flex items-center gap-2"
          >
            <List className="w-4 h-4" />
            Batch Mode
          </button>
        </div>

        {/* URL Input */}
        <div className="mb-4">
          <label htmlFor="video-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Video URL
          </label>
          <textarea
            ref={inputRef}
            id="video-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste YouTube or TikTok video URL here..."
            aria-label="Video URL input"
            aria-describedby="url-helper url-validation"
            disabled={isDownloading}
            className={`w-full px-4 py-3 rounded-lg border-2 
                     focus:outline-none focus:ring-2 
                     dark:bg-gray-700 dark:text-white
                     resize-none transition-all duration-200 min-h-[100px]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${
                       urlValidation === 'valid'
                         ? 'border-green-500 dark:border-green-400 focus:border-green-500 dark:focus:border-green-400 focus:ring-green-500/20'
                         : urlValidation === 'invalid'
                         ? 'border-orange-500 dark:border-orange-400 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-orange-500/20'
                         : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-blue-500/20'
                     }`}
            rows={3}
          />
          
          {/* Helper Text */}
          <div id="url-helper" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p className="font-medium mb-1">Example URLs:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>YouTube: youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID</li>
              <li>TikTok: tiktok.com/@username/video/VIDEO_ID</li>
            </ul>
          </div>

          {/* URL Validation Messages */}
          <div id="url-validation" className="mt-2 min-h-[24px]">
            {urlValidation === 'invalid' && url.trim() && (
              <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                <span>Invalid URL format</span>
              </p>
            )}
          </div>
        </div>

        {/* Platform Detection Indicator */}
        {showPlatformIndicator && platform && downloadStatus === 'idle' && (
          <div
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 animate-fadeIn"
            role="status"
            aria-live="polite"
            aria-label={`Platform detected: ${getPlatformName()}`}
          >
            <div className="flex items-center gap-3">
              {getPlatformIcon()}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Platform Detected
                  </p>
                </div>
                <p className="text-lg font-semibold text-green-700 dark:text-green-300 mt-0.5">
                  {getPlatformName()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Card - Replaces download button during download */}
        {isDownloading && (
          <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 animate-fadeIn">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {stageMessage}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {downloadStatus === 'fetching-metadata' && 'Retrieving video details...'}
                    {downloadStatus === 'downloading' && 'Downloading video file...'}
                    {downloadStatus === 'processing' && 'Preparing video for storage...'}
                    {downloadStatus === 'saving' && 'Saving to your library...'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                aria-label="Cancel download"
              >
                <X className="w-5 h-5 text-red-600 dark:text-red-400" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full 
                         transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {progress}% complete
              </span>
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                {downloadStatus === 'fetching-metadata' && <FileDown className="w-4 h-4 inline mr-1" />}
                {downloadStatus === 'downloading' && <Download className="w-4 h-4 inline mr-1" />}
                {downloadStatus === 'processing' && <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />}
                {downloadStatus === 'saving' && <Save className="w-4 h-4 inline mr-1" />}
                {stageMessage}
              </span>
            </div>
          </div>
        )}

        {/* Success Card */}
        {downloadStatus === 'completed' && (
          <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-200 dark:border-green-800 animate-fadeIn">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  Download Complete!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Video has been saved to your library
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (savedVideoId) {
                  navigate(`/video/${savedVideoId}`);
                } else {
                  navigate('/downloads');
                }
              }}
              className="btn-glass w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full transition-all duration-200 flex items-center justify-center gap-2"
            >
              View in Library
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Error Card */}
        {downloadStatus === 'failed' && error && (
          <div className="mb-6 p-6 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-xl border-2 border-red-200 dark:border-red-800 animate-fadeIn">
            <div className="flex items-start gap-3 mb-4">
              <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-1">
                  Download Failed
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={resetForm}
              className="btn-glass w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Quality Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Video Quality
          </label>

          {fetchingQualities ? (
            <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              <span>Loading available qualities...</span>
            </div>
          ) : availableQualities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableQualities.map((qualityOption) => (
                <QualityCard
                  key={qualityOption.resolution}
                  quality={qualityOption}
                  selected={quality === qualityOption.resolution}
                  onSelect={() => setQuality(qualityOption.resolution)}
                  duration={videoMetadata?.duration}
                />
              ))}
            </div>
          ) : (
            <select
              id="quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={isDownloading}
              aria-label="Video quality selector"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600
                       focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none
                       focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white
                       transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="360p">360p (Low)</option>
            </select>
          )}
        </div>

        {/* Format Selector */}
        <div className="mb-6" role="radiogroup" aria-label="Video format selector">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Format
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="format"
                value="mp4"
                checked={format === 'mp4'}
                onChange={(e) => setFormat(e.target.value as 'mp4' | 'mp3')}
                disabled={isDownloading}
                aria-label="MP4 video format"
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2
                         border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                MP4 (Video)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="format"
                value="mp3"
                checked={format === 'mp3'}
                onChange={(e) => setFormat(e.target.value as 'mp4' | 'mp3')}
                disabled={isDownloading}
                aria-label="MP3 audio format"
                className="w-5 h-5 text-blue-600 focus:ring-blue-500 focus:ring-2
                         border-gray-300 dark:border-gray-600 cursor-pointer disabled:opacity-50"
              />
              <span className="text-gray-700 dark:text-gray-300 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                MP3 (Audio Only)
              </span>
            </label>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            disabled={isDownloading}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`}
            />
            <span>Advanced Options</span>
          </button>

          {showAdvancedOptions && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4 animate-fadeIn">
              {/* Audio Quality Selector (for video format) */}
              {format === 'mp4' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Audio Quality
                  </label>
                  <div className="flex gap-3">
                    {(['high', 'medium', 'low'] as const).map((aq) => (
                      <button
                        key={aq}
                        type="button"
                        onClick={() => setAudioQuality(aq)}
                        disabled={isDownloading}
                        className={`
                          flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all
                          ${audioQuality === aq
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {aq.charAt(0).toUpperCase() + aq.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {audioQuality === 'high' && '320 kbps - Best quality, larger file size'}
                    {audioQuality === 'medium' && '192 kbps - Balanced quality and size'}
                    {audioQuality === 'low' && '128 kbps - Smaller file size'}
                  </p>
                </div>
              )}

              {/* Clip Extraction */}
              {format === 'mp4' && videoMetadata && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Scissors className="w-4 h-4" />
                    Extract Clip (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="clip-start" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Start Time
                      </label>
                      <input
                        id="clip-start"
                        type="text"
                        value={clipStartTime}
                        onChange={(e) => setClipStartTime(e.target.value)}
                        placeholder="00:00:00"
                        disabled={isDownloading}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label htmlFor="clip-end" className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        End Time
                      </label>
                      <input
                        id="clip-end"
                        type="text"
                        value={clipEndTime}
                        onChange={(e) => setClipEndTime(e.target.value)}
                        placeholder="00:00:00"
                        disabled={isDownloading}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Format: HH:MM:SS or MM:SS (e.g., 1:30 or 01:30:00)
                    {videoMetadata.duration && (
                      <span className="ml-2">
                        • Video duration: {Math.floor(videoMetadata.duration / 60)}:{String(videoMetadata.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Download Button - Only shown when idle */}
        {downloadStatus === 'idle' && (
          <button
            onClick={handleDownload}
            disabled={isDownloadDisabled}
            aria-label={platform ? `Download ${getPlatformName()} video` : 'Download video (disabled - enter valid URL)'}
            className="btn-glass w-full py-4 px-6 rounded-full font-semibold text-white text-lg
                     bg-gradient-to-r from-blue-600 to-purple-600 
                     hover:from-blue-700 hover:to-purple-700
                     disabled:from-gray-400 disabled:to-gray-500
                     disabled:cursor-not-allowed
                     focus:outline-none focus:ring-4 focus:ring-blue-500/50
                     transition-all duration-200 transform hover:scale-[1.02] 
                     active:scale-[0.98] shadow-lg hover:shadow-xl
                     flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>
        )}
      </div>
    </div>
  );
});

DownloadForm.displayName = 'DownloadForm';

export default DownloadForm;
