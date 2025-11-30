import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Loader2,
  AlertCircle,
  Youtube,
  Music,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Pause,
  SkipForward,
  X,
  FileText,
  RefreshCw,
  History,
  Download as DownloadIcon,
  Trash2,
  FileDown
} from 'lucide-react';
import { parseVideoUrl } from '../utils/urlParser';
import { youtubeService } from '../services/youtubeService';
import { tiktokService } from '../services/tiktokService';
import { storageService } from '../services/storageService';
import type { VideoPlatform } from '../types';

type QueueItemStatus = 'pending' | 'downloading' | 'completed' | 'failed' | 'skipped';

interface QueueItem {
  id: string;
  url: string;
  platform: VideoPlatform | null;
  status: QueueItemStatus;
  progress: number;
  error?: string;
  title?: string;
  videoId?: string;
}

interface BatchHistory {
  id: string;
  timestamp: Date;
  total: number;
  completed: number;
  failed: number;
  items: QueueItem[];
}

const STORAGE_KEY = 'batchDownloader_queue';
const HISTORY_STORAGE_KEY = 'batchDownloader_history';

const BatchDownloader = () => {
  const navigate = useNavigate();
  const [urlsText, setUrlsText] = useState('');
  const [parsedUrls, setParsedUrls] = useState<QueueItem[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<BatchHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [quality, setQuality] = useState('1080p');
  const [format, setFormat] = useState<'mp4' | 'mp3'>('mp4');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load queue from localStorage on mount
  useEffect(() => {
    const savedQueue = localStorage.getItem(STORAGE_KEY);
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue);
        // Convert date strings back to Date objects
        const queueWithDates = parsed.map((item: any) => ({
          ...item,
        }));
        setQueue(queueWithDates);
      } catch (error) {
        console.error('Error loading queue from localStorage:', error);
      }
    }

    // Load history
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        const historyWithDates = parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
          items: h.items || [],
        }));
        setHistory(historyWithDates);
      } catch (error) {
        console.error('Error loading history from localStorage:', error);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    if (queue.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [queue]);

  // Parse URLs from textarea
  const handleParseUrls = () => {
    const lines = urlsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const parsed: QueueItem[] = lines.map((url, index) => {
      const parsedUrl = parseVideoUrl(url);
      return {
        id: `item-${Date.now()}-${index}`,
        url,
        platform: parsedUrl?.platform || null,
        status: parsedUrl ? 'pending' : 'failed',
        progress: 0,
        error: parsedUrl ? undefined : 'Invalid URL format',
        videoId: parsedUrl?.videoId,
      };
    });

    setParsedUrls(parsed);
    setQueue(parsed);
  };

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
      try {
        const proxyUrl = import.meta.env.VITE_YOUTUBE_API_PROXY || 'http://localhost:3000/api/youtube';
        const response = await fetch(`${proxyUrl}?id=test`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });
        return true;
      } catch {
        return false;
      }
    }
  };

  // Download a single video
  const downloadVideo = useCallback(async (item: QueueItem): Promise<void> => {
    if (!item.platform || !item.videoId) {
      throw new Error('Invalid video URL or platform');
    }

    const serverRunning = await checkServerConnection();
    if (!serverRunning) {
      throw new Error('Download server is not running. Please start the server.');
    }

    let videoBlob: Blob;
    let metadata: any;

    // Get metadata
    if (item.platform === 'youtube') {
      metadata = await youtubeService.getVideoMetadata(item.url);
      videoBlob = await youtubeService.downloadVideo(item.videoId, quality, format);
    } else if (item.platform === 'tiktok') {
      metadata = await tiktokService.getVideoMetadata(item.url);
      videoBlob = await tiktokService.downloadVideo(item.url, false);
    } else {
      throw new Error('Unsupported platform');
    }

    // Save to IndexedDB
    const videoData = {
      url: item.url,
      platform: item.platform,
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

    await storageService.saveVideo(videoData);
  }, [quality, format]);

  // Process queue
  const processQueue = useCallback(async () => {
    if (isPaused) {
      setIsDownloading(false);
      return;
    }

    setQueue(currentQueue => {
      if (currentQueue.length === 0) {
        setIsDownloading(false);
        return currentQueue;
      }

      const pendingItems = currentQueue.filter(item => item.status === 'pending');
      if (pendingItems.length === 0) {
        setIsDownloading(false);
        // All done - save to history
        const completed = currentQueue.filter(item => item.status === 'completed').length;
        const failed = currentQueue.filter(item => item.status === 'failed').length;
        
        if (completed > 0 || failed > 0) {
          const historyItem: BatchHistory = {
            id: `batch-${Date.now()}`,
            timestamp: new Date(),
            total: currentQueue.length,
            completed,
            failed,
            items: [...currentQueue],
          };
          
          setHistory(prevHistory => {
            const newHistory = [historyItem, ...prevHistory].slice(0, 10); // Keep last 10
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            return newHistory;
          });
        }
        
        return currentQueue;
      }

      setIsDownloading(true);
      const currentItem = pendingItems[0];
      const currentItemIndex = currentQueue.findIndex(item => item.id === currentItem.id);
      setCurrentIndex(currentItemIndex);

      // Update status to downloading
      const updatedQueue = currentQueue.map((item, index) =>
        index === currentItemIndex
          ? { ...item, status: 'downloading', progress: 0 }
          : item
      );

      // Create abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      // Start download process
      (async () => {
        try {
          // Simulate progress updates
          const progressInterval = setInterval(() => {
            if (signal.aborted) {
              clearInterval(progressInterval);
              return;
            }
            setQueue(prev => prev.map((item, idx) =>
              idx === currentItemIndex && item.status === 'downloading'
                ? { ...item, progress: Math.min(item.progress + 2, 95) }
                : item
            ));
          }, 500);

          await downloadVideo(currentItem);

          if (signal.aborted) {
            clearInterval(progressInterval);
            return;
          }

          clearInterval(progressInterval);

          // Update status to completed
          setQueue(prev => prev.map((item, idx) =>
            idx === currentItemIndex
              ? { ...item, status: 'completed', progress: 100 }
              : item
          ));
        } catch (error: any) {
          let errorMessage = 'Download failed';

          if (error instanceof Error) {
            errorMessage = error.message;

            // Categorize errors with helpful suggestions
            if (errorMessage.includes('quota exceeded') || errorMessage.includes('quotaExceeded')) {
              errorMessage = 'YouTube API quota exceeded. Try again tomorrow.';
            } else if (errorMessage.includes('Network error') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
              errorMessage = 'Cannot connect to server. Ensure server is running.';
            } else if (errorMessage.includes('404') || errorMessage.includes('not found') || errorMessage.includes('Video not found')) {
              errorMessage = 'Video not found. May be deleted or private.';
            } else if (errorMessage.includes('403') || errorMessage.includes('Access denied') || errorMessage.includes('forbidden')) {
              errorMessage = 'Access denied. Video may be private, age-restricted, or requires sign-in.';
            } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
              errorMessage = 'Request timeout. Check internet connection.';
            } else if (errorMessage.includes('Invalid YouTube API key') || errorMessage.includes('invalidCredentials')) {
              errorMessage = 'Invalid YouTube API key. Check configuration.';
            } else if (errorMessage.includes('private') || errorMessage.includes('age-restricted')) {
              errorMessage = 'Cannot download: Video is private or age-restricted.';
            }
          }

          setQueue(prev => prev.map((item, idx) =>
            idx === currentItemIndex
              ? {
                  ...item,
                  status: 'failed',
                  error: errorMessage,
                }
              : item
          ));
        } finally {
          abortControllerRef.current = null;
          // Continue with next item
          setTimeout(() => {
            processQueue();
          }, 500);
        }
      })();

      return updatedQueue;
    });
  }, [isPaused, downloadVideo]);

  // Start downloads
  const handleStart = () => {
    if (queue.length === 0) {
      handleParseUrls();
      // Wait for queue to be set, then start
      setTimeout(() => {
        setIsPaused(false);
        processQueue();
      }, 100);
      return;
    }
    setIsPaused(false);
    processQueue();
  };

  // Pause downloads
  const handlePause = () => {
    setIsPaused(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  // Resume downloads
  const handleResume = () => {
    setIsPaused(false);
    processQueue();
  };

  // Skip current video
  const handleSkip = (itemId: string) => {
    setQueue(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, status: 'skipped' }
        : item
    ));
    if (isDownloading) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setTimeout(() => processQueue(), 100);
    }
  };

  // Cancel all
  const handleCancel = () => {
    setIsPaused(true);
    setIsDownloading(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setQueue(prev => prev.map(item =>
      item.status === 'downloading' || item.status === 'pending'
        ? { ...item, status: 'pending', progress: 0 }
        : item
    ));
  };

  // Retry failed
  const handleRetryFailed = () => {
    setQueue(prev => prev.map(item =>
      item.status === 'failed'
        ? { ...item, status: 'pending', progress: 0, error: undefined }
        : item
    ));
    setIsPaused(false);
    processQueue();
  };

  // Clear queue
  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear the queue?')) {
      setQueue([]);
      setParsedUrls([]);
      setUrlsText('');
      setIsPaused(false);
      setIsDownloading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  };

  // Export batch list
  const handleExport = () => {
    const urls = queue.map(item => item.url).join('\n');
    const blob = new Blob([urls], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-download-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get platform icon
  const getPlatformIcon = (platform: VideoPlatform | null) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4 text-red-600" />;
      case 'tiktok':
        return <Music className="w-4 h-4 text-black dark:text-white" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get status badge
  const getStatusBadge = (status: QueueItemStatus) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit';
    switch (status) {
      case 'pending':
        return (
          <span className={`${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'downloading':
        return (
          <span className={`${baseClasses} bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300`}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Downloading
          </span>
        );
      case 'completed':
        return (
          <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300`}>
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300`}>
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'skipped':
        return (
          <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300`}>
            <SkipForward className="w-3 h-3" />
            Skipped
          </span>
        );
    }
  };

  // Calculate overall progress
  const overallProgress = queue.length > 0
    ? Math.round((queue.filter(item => item.status === 'completed').length / queue.length) * 100)
    : 0;

  const completedCount = queue.filter(item => item.status === 'completed').length;
  const failedCount = queue.filter(item => item.status === 'failed').length;
  const pendingCount = queue.filter(item => item.status === 'pending').length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Batch Download
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            History
          </button>
          {queue.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* URL Input */}
      <div>
        <label htmlFor="batch-urls" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Video URLs (one per line)
        </label>
        <textarea
          id="batch-urls"
          value={urlsText}
          onChange={(e) => setUrlsText(e.target.value)}
          placeholder="Paste video URLs here, one per line:&#10;https://youtube.com/watch?v=...&#10;https://tiktok.com/@user/video/...&#10;https://youtube.com/watch?v=..."
          className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white resize-none min-h-[150px] font-mono text-sm"
          rows={6}
          disabled={isDownloading}
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleParseUrls}
            disabled={!urlsText.trim() || isDownloading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Parse URLs
          </button>
          {queue.length > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Quality and Format Selectors */}
      {queue.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="batch-quality" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Quality
            </label>
            <select
              id="batch-quality"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              disabled={isDownloading}
              className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:bg-gray-700 dark:text-white"
            >
              <option value="1080p">1080p (Full HD)</option>
              <option value="720p">720p (HD)</option>
              <option value="480p">480p (SD)</option>
              <option value="360p">360p (Low)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Format
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batch-format"
                  value="mp4"
                  checked={format === 'mp4'}
                  onChange={(e) => setFormat(e.target.value as 'mp4' | 'mp3')}
                  disabled={isDownloading}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">MP4</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="batch-format"
                  value="mp3"
                  checked={format === 'mp3'}
                  onChange={(e) => setFormat(e.target.value as 'mp4' | 'mp3')}
                  disabled={isDownloading}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700 dark:text-gray-300">MP3</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Overall Progress */}
      {queue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Overall Progress
            </h3>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {overallProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Completed: {completedCount} / {queue.length}</span>
            <span>Failed: {failedCount}</span>
            <span>Pending: {pendingCount}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      {queue.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {!isDownloading && !isPaused && (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start
            </button>
          )}
          {isDownloading && !isPaused && (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Resume
            </button>
          )}
          {failedCount > 0 && (
            <button
              onClick={handleRetryFailed}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Failed ({failedCount})
            </button>
          )}
          {isDownloading && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel All
            </button>
          )}
        </div>
      )}

      {/* Queue Table */}
      {queue.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {queue.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`${
                      index % 2 === 0
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-900/50'
                    } hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getPlatformIcon(item.platform)}
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.platform || 'Invalid'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs truncate text-sm text-gray-700 dark:text-gray-300" title={item.url}>
                        {item.url}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3">
                      {item.status === 'downloading' ? (
                        <div className="w-32">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 block">
                            {item.progress}%
                          </span>
                        </div>
                      ) : item.status === 'failed' ? (
                        <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate" title={item.error}>
                          {item.error}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && (
                          <button
                            onClick={() => handleSkip(item.id)}
                            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Skip"
                          >
                            <SkipForward className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                        )}
                        {item.status === 'failed' && (
                          <button
                            onClick={() => {
                              setQueue(prev => prev.map(i =>
                                i.id === item.id
                                  ? { ...i, status: 'pending', progress: 0, error: undefined }
                                  : i
                              ));
                              if (!isDownloading && !isPaused) {
                                processQueue();
                              }
                            }}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                            title="Retry"
                          >
                            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {queue.length > 0 && pendingCount === 0 && !isDownloading && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Batch Complete!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Downloaded {completedCount} of {queue.length} videos. {failedCount} failed.
              </p>
            </div>
          </div>
          {failedCount > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                Failed Downloads:
              </h4>
              {queue
                .filter(item => item.status === 'failed')
                .map((item) => (
                  <div key={item.id} className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    <div className="font-medium">{item.url}</div>
                    <div className="text-xs mt-1">{item.error}</div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Download History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No download history yet
                </p>
              ) : (
                history.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {new Date(batch.timestamp).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {batch.completed} completed, {batch.failed} failed of {batch.total} total
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Export"
                      >
                        <FileDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchDownloader;

