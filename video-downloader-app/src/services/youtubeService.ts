import axios from 'axios';
import { parseVideoUrl } from '../utils/urlParser';
import type { VideoMetadata } from '../types';

/**
 * YouTube video metadata response interface
 */
export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number; // in seconds
  author: string; // channel name
  viewCount: number;
  uploadDate: Date;
  isShort: boolean;
}

/**
 * YouTube service for video operations
 * 
 * NOTE: Direct YouTube API access requires an API key.
 * This service should either:
 * 1. Use YouTube Data API v3 with API key stored in environment variables (VITE_YOUTUBE_API_KEY)
 * 2. Use a backend proxy endpoint that handles API authentication
 * 
 * For video downloads, direct download from YouTube is restricted by CORS.
 * Consider using:
 * - A backend service with youtube-dl or yt-dlp
 * - A serverless function (e.g., Vercel/Netlify function)
 * - A third-party service that provides download capabilities
 */
export const youtubeService = {
  /**
   * Extract video ID from URL or return ID if already provided
   * @param urlOrId - YouTube video URL or video ID
   * @returns Video ID string
   * @throws Error if URL is invalid or not a YouTube URL
   */
  extractVideoId(urlOrId: string): string {
    // If it's already a video ID (11 characters, alphanumeric with dashes/underscores)
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
      return urlOrId;
    }

    // Parse URL to extract video ID
    const parsed = parseVideoUrl(urlOrId);
    if (!parsed || parsed.platform !== 'youtube') {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video URL or video ID.');
    }

    return parsed.videoId;
  },

  /**
   * Check if a YouTube URL is a Short
   * @param url - YouTube video URL
   * @returns true if the URL is a YouTube Short
   */
  isShort(url: string): boolean {
    return url.includes('/shorts/');
  },

  /**
   * Get video metadata from YouTube
   * 
   * This function requires either:
   * - YouTube Data API v3 key in VITE_YOUTUBE_API_KEY environment variable
   * - A backend proxy endpoint at VITE_YOUTUBE_API_PROXY (if set)
   * 
   * @param urlOrId - YouTube video URL or video ID
   * @returns Promise that resolves to video metadata
   * @throws Error for various failure scenarios (not found, private, age-restricted, network errors)
   */
  async getVideoMetadata(urlOrId: string): Promise<YouTubeVideoMetadata> {
    const videoId = this.extractVideoId(urlOrId);
    const isShort = this.isShort(urlOrId);

    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    // Use environment variable or default to localhost server
    const apiProxy = import.meta.env.VITE_YOUTUBE_API_PROXY || 
                    'http://localhost:3000/api/youtube';

    try {
      let response;

      // Prefer proxy if available, otherwise use API key
      if (apiProxy && !apiProxy.includes('undefined')) {
        // Use backend proxy endpoint
        console.log('[YouTube Service] Using proxy:', apiProxy);
        response = await axios.get(apiProxy, {
          params: {
            id: videoId,
          },
          timeout: 10000,
          validateStatus: (status) => status < 500, // Don't throw on 4xx errors
        });
        
        // Check if server returned an error response (4xx status or error object)
        if (response.status >= 400 || (response.data && response.data.error)) {
          const serverError = response.data;
          const errorMessage = serverError?.message || serverError?.error || 'Unknown error';
          const errorReason = serverError?.reason;
          
          // Map server error reasons to user-friendly messages
          if (errorReason === 'quotaExceeded') {
            throw new Error('YouTube API quota exceeded. The daily limit has been reached. Please try again tomorrow or use a different API key.');
          } else if (errorReason === 'invalidCredentials') {
            throw new Error('Invalid YouTube API key. Please check your API key configuration in the .env file.');
          } else if (errorReason === 'videoNotFound') {
            throw new Error('Video not found. The video may have been deleted or is unavailable.');
          } else if (errorReason === 'forbidden') {
            throw new Error('Access denied. The video may be private or restricted.');
          }
          
          // Use the server's error message
          throw new Error(errorMessage);
        }
      } else if (apiKey) {
        // Use YouTube Data API v3 directly
        const apiUrl = 'https://www.googleapis.com/youtube/v3/videos';
        response = await axios.get(apiUrl, {
          params: {
            id: videoId,
            key: apiKey,
            part: 'snippet,contentDetails,statistics',
          },
          timeout: 10000,
        });
      } else {
        throw new Error(
          'YouTube API key or proxy endpoint not configured. ' +
          'Please set VITE_YOUTUBE_API_KEY or VITE_YOUTUBE_API_PROXY in your .env file.'
        );
      }

      // Handle YouTube API response
      // Check if response is an error (from our server - 4xx status or error object without items)
      if (response.status >= 400 || (response.data && response.data.error && !response.data.items)) {
        // This is an error response from our server
        const serverError = response.data;
        const errorMessage = serverError?.message || serverError?.error || 'Unknown error from server';
        const errorReason = serverError?.reason;
        
        // Map error reasons to user-friendly messages
        if (errorReason === 'quotaExceeded') {
          throw new Error('YouTube API quota exceeded. The daily limit has been reached. Please try again tomorrow or use a different API key.');
        } else if (errorReason === 'invalidCredentials') {
          throw new Error('Invalid YouTube API key. Please check your API key configuration in the .env file.');
        }
        
        throw new Error(errorMessage);
      }
      
      // Both proxy and direct API return the same YouTube Data API v3 format
      return this.parseYouTubeApiResponse(response.data, videoId, isShort);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP errors
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 404) {
            throw new Error('Video not found. The video may have been deleted or the URL is incorrect.');
          }

          if (status === 403) {
            // Check for specific error reasons
            if (data?.error?.errors?.[0]?.reason === 'private') {
              throw new Error('This video is private and cannot be accessed.');
            }
            if (data?.error?.errors?.[0]?.reason === 'restricted') {
              throw new Error('This video is age-restricted and requires authentication.');
            }
            throw new Error('Access denied. Please check your API key permissions.');
          }

          if (status === 400) {
            throw new Error('Invalid request. Please check the video URL or ID.');
          }

          // Provide more detailed error message
          const errorReason = data?.error?.errors?.[0]?.reason;
          let errorMessage = data?.error?.message || 'Unknown error';
          
          // Map common error reasons to user-friendly messages
          if (errorReason === 'quotaExceeded') {
            errorMessage = 'YouTube API quota exceeded. Please try again later.';
          } else if (errorReason === 'invalidCredentials') {
            errorMessage = 'Invalid YouTube API key. Please check your configuration.';
          } else if (errorReason === 'videoNotFound') {
            errorMessage = 'Video not found. The video may have been deleted or is unavailable.';
          } else if (errorReason === 'forbidden') {
            errorMessage = 'Access denied. The video may be private or restricted.';
          } else if (errorMessage === 'Unknown error') {
            errorMessage = `YouTube API error: ${errorReason || 'Unknown error occurred'}`;
          }
          
          throw new Error(errorMessage);
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new Error('Request timeout. Please check your internet connection and try again.');
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Network error. Unable to connect to YouTube API.');
        }

        throw new Error(`Network error: ${error.message}`);
      }

      // Handle unknown axios errors
      throw new Error(`YouTube API error: ${error.message || 'Unknown network error'}`);
    }

    // Handle non-axios errors
    if (err instanceof Error) {
      // Re-throw if it's already our custom error
      throw err;
    }

    // Generic error fallback
    throw new Error(`Failed to fetch video metadata: ${err instanceof Error ? err.message : 'Unknown error'}`);
  },

  /**
   * Parse YouTube Data API v3 response
   * @private
   */
  parseYouTubeApiResponse(data: any, videoId: string, isShort: boolean): YouTubeVideoMetadata {
    if (!data.items || data.items.length === 0) {
      throw new Error('Video not found. The video may have been deleted or is unavailable.');
    }

    const item = data.items[0];
    const snippet = item.snippet;
    const contentDetails = item.contentDetails;
    const statistics = item.statistics;

    // Parse duration (ISO 8601 format: PT1H2M10S)
    const duration = this.parseDuration(contentDetails?.duration || 'PT0S');

    // Get highest quality thumbnail
    const thumbnail =
      snippet.thumbnails?.maxresdefault?.url ||
      snippet.thumbnails?.high?.url ||
      snippet.thumbnails?.medium?.url ||
      snippet.thumbnails?.default?.url ||
      '';

    return {
      videoId,
      title: snippet.title || 'Untitled',
      description: snippet.description || '',
      thumbnail,
      duration,
      author: snippet.channelTitle || 'Unknown Channel',
      viewCount: parseInt(statistics?.viewCount || '0', 10),
      uploadDate: new Date(snippet.publishedAt || Date.now()),
      isShort,
    };
  },

  /**
   * Parse backend proxy response
   * @private
   */
  parseProxyResponse(data: any, videoId: string, isShort: boolean): YouTubeVideoMetadata {
    // Backend proxy should return data in this format
    return {
      videoId: data.videoId || videoId,
      title: data.title || 'Untitled',
      description: data.description || '',
      thumbnail: data.thumbnail || '',
      duration: data.duration || 0,
      author: data.author || data.channelName || 'Unknown Channel',
      viewCount: data.viewCount || 0,
      uploadDate: new Date(data.uploadDate || data.publishedAt || Date.now()),
      isShort: data.isShort !== undefined ? data.isShort : isShort,
    };
  },

  /**
   * Parse ISO 8601 duration string to seconds
   * @private
   */
  parseDuration(duration: string): number {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 3600 + minutes * 60 + seconds;
  },

  /**
   * Get available quality options for YouTube videos
   * @param videoId - YouTube video ID or URL
   * @param duration - Video duration in seconds (for file size estimation)
   * @param isShort - Whether the video is a YouTube Short
   * @returns Promise that resolves to array of quality options
   */
  async getAvailableQualities(videoId: string, duration: number = 0, isShort: boolean = false): Promise<Array<{
    resolution: string;
    width: number;
    height: number;
    fileSize: number;
    bitrate: number;
    available: boolean;
    recommended?: boolean;
    label?: string;
  }>> {
    // Extract video ID if URL was provided
    const id = this.extractVideoId(videoId);

    // Define quality options for regular YouTube videos
    const regularQualities = [
      { resolution: '2160p', width: 3840, height: 2160, bitrate: 50000, label: '4K Ultra HD' },
      { resolution: '1440p', width: 2560, height: 1440, bitrate: 24000, label: '2K Quad HD' },
      { resolution: '1080p', width: 1920, height: 1080, bitrate: 8000, label: 'Full HD' },
      { resolution: '720p', width: 1280, height: 720, bitrate: 5000, label: 'HD' },
      { resolution: '480p', width: 854, height: 480, bitrate: 2500, label: 'SD' },
      { resolution: '360p', width: 640, height: 360, bitrate: 1000, label: 'Low' },
    ];

    // Define quality options for YouTube Shorts (vertical format)
    const shortsQualities = [
      { resolution: '1080p', width: 1080, height: 1920, bitrate: 8000, label: 'Full HD' },
      { resolution: '720p', width: 720, height: 1280, bitrate: 5000, label: 'HD' },
      { resolution: '480p', width: 480, height: 854, bitrate: 2500, label: 'SD' },
      { resolution: '360p', width: 360, height: 640, bitrate: 1000, label: 'Low' },
    ];

    const qualities = isShort ? shortsQualities : regularQualities;

    // In a real implementation, you would make an API call to get actual available formats
    // For now, we'll simulate it by making most qualities available, with 1080p as recommended
    const availableQualities = qualities.map((q, index) => {
      // Estimate file size: (bitrate in kbps * duration in seconds) / 8 = bytes
      const estimatedSize = (q.bitrate * duration) / 8;

      // For YouTube, typically 1080p and below are commonly available
      // 4K and 1440p might not always be available
      let available = true;
      if (q.resolution === '2160p' || q.resolution === '1440p') {
        available = Math.random() > 0.3; // Simulate that 4K/1440p might not always be available
      }

      return {
        resolution: q.resolution,
        width: q.width,
        height: q.height,
        fileSize: Math.round(estimatedSize),
        bitrate: q.bitrate,
        available,
        recommended: q.resolution === '1080p', // 1080p is recommended
        label: q.label,
      };
    });

    return availableQualities.filter(q => q.available);
  },

  /**
   * Download video from YouTube
   * 
   * NOTE: Direct download from YouTube is restricted by CORS.
   * This function is a placeholder and should be implemented using:
   * - A backend service with youtube-dl or yt-dlp
   * - A serverless function that handles the download
   * - A third-party service that provides download capabilities
   * 
   * @param videoId - YouTube video ID
   * @param quality - Video quality (e.g., '1080p', '720p')
   * @param format - Video format ('mp4' or 'mp3')
   * @returns Promise that resolves to video blob data
   * @throws Error if download fails
   */
  async downloadVideo(
    videoId: string,
    quality: string = '720p',
    format: 'mp4' | 'mp3' = 'mp4'
  ): Promise<Blob> {
    // Use environment variable or default to localhost server
    const downloadProxy = import.meta.env.VITE_YOUTUBE_DOWNLOAD_PROXY || 
                         'http://localhost:3000/api/youtube/download';

    console.log('[YouTube Service] Download proxy:', downloadProxy);

    try {
      const response = await axios.get(downloadProxy, {
        params: {
          id: videoId,
          quality,
          format,
        },
        responseType: 'blob',
        timeout: 300000, // 5 minutes timeout for large files
        onDownloadProgress: (progressEvent) => {
          // Progress can be handled by the caller
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            // You can emit progress events here if needed
          }
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          const status = error.response.status;
          if (status === 404) {
            throw new Error('Video not found or unavailable for download.');
          }
          if (status === 403) {
            throw new Error('Access denied. The video may be private or age-restricted.');
          }
          throw new Error(`Download failed: ${error.response.statusText}`);
        }

        if (error.code === 'ECONNABORTED') {
          throw new Error('Download timeout. The file may be too large or the connection is slow.');
        }

        throw new Error(`Network error during download: ${error.message}`);
      }

      throw new Error('An unexpected error occurred during video download.');
    }
  },
};

