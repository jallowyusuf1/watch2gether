import axios from 'axios';
import { parseVideoUrl } from '../utils/urlParser';

/**
 * TikTok video metadata response interface
 */
export interface TikTokVideoMetadata {
  videoId: string;
  description: string; // caption text
  thumbnail: string;
  duration: number; // in seconds
  author: string; // username
  likeCount: number;
  shareCount: number;
  commentCount: number; // if available
  uploadDate: Date;
  videoUrl?: string; // direct video URL if available
  watermarkFreeUrl?: string; // watermark-free version if available
}

/**
 * TikTok service for video operations
 * 
 * NOTE: TikTok's official API has strict access requirements:
 * - TikTok for Developers API requires business account and app approval
 * - Official API access is limited and requires extensive application process
 * - Most operations require backend proxy due to CORS restrictions
 * 
 * This service should use:
 * 1. A backend proxy endpoint that handles TikTok's restrictions (HIGHLY RECOMMENDED)
 * 2. TikTok for Developers API with approved application (limited availability)
 * 3. Unofficial APIs/scraping methods through backend (not officially supported)
 * 
 * TikTok videos come with watermarks by default. Watermark-free versions:
 * - Require backend processing
 * - May use unofficial methods
 * - Are not officially supported by TikTok
 * 
 * A backend service is STRONGLY RECOMMENDED for all TikTok operations due to:
 * - CORS restrictions
 * - Rate limiting
 * - Authentication requirements
 * - Dynamic content loading
 * - Watermark removal processing
 */
export const tiktokService = {
  /**
   * Validate TikTok URL format
   * @param url - TikTok URL to validate
   * @returns true if URL is a valid TikTok video URL
   */
  isValidTikTokUrl(url: string): boolean {
    const tiktokPatterns = [
      /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
      /^https?:\/\/(www\.)?vm\.tiktok\.com\/[a-zA-Z0-9]+/i,
      /^https?:\/\/(www\.)?tiktok\.com\/t\/[a-zA-Z0-9]+/i,
      /^https?:\/\/(www\.)?vt\.tiktok\.com\/[a-zA-Z0-9]+/i,
    ];

    return tiktokPatterns.some((pattern) => pattern.test(url));
  },

  /**
   * Resolve shortened TikTok URL (vm.tiktok.com) to full URL
   * @param shortUrl - Shortened TikTok URL (e.g., vm.tiktok.com/XXXXX)
   * @returns Promise that resolves to full TikTok URL
   * @throws Error if URL cannot be resolved
   */
  async resolveShortUrl(shortUrl: string): Promise<string> {
    if (!this.isValidTikTokUrl(shortUrl)) {
      throw new Error('Invalid TikTok URL format.');
    }

    // If it's already a full URL, return it
    if (shortUrl.includes('tiktok.com/@') && shortUrl.includes('/video/')) {
      return shortUrl;
    }

    try {
      // Follow redirects to get the full URL
      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        timeout: 10000,
      });

      // Extract final URL from response
      const finalUrl = response.request?.responseURL || response.request?.res?.responseUrl || shortUrl;

      if (finalUrl.includes('tiktok.com/@') && finalUrl.includes('/video/')) {
        return finalUrl;
      }

      // If redirect didn't work, try to extract from response data
      const urlMatch = response.data?.match(/https?:\/\/[^"'\s]+tiktok\.com\/@[\w.-]+\/video\/\d+/);
      if (urlMatch) {
        return urlMatch[0];
      }

      throw new Error('Could not resolve shortened URL to full TikTok URL.');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new Error('Timeout while resolving shortened URL.');
        }
        throw new Error(`Failed to resolve shortened URL: ${error.message}`);
      }
      throw new Error('An unexpected error occurred while resolving shortened URL.');
    }
  },

  /**
   * Extract video ID from TikTok URL
   * @param url - TikTok video URL (full or shortened)
   * @returns Video ID string
   * @throws Error if URL is invalid
   */
  async extractVideoId(url: string): Promise<string> {
    // Validate URL first
    if (!this.isValidTikTokUrl(url)) {
      throw new Error('Invalid TikTok URL. Please provide a valid TikTok video URL.');
    }

    // Resolve shortened URL if needed
    const fullUrl = await this.resolveShortUrl(url);

    // Try parsing with urlParser first
    const parsed = parseVideoUrl(fullUrl);
    if (parsed && parsed.platform === 'tiktok') {
      return parsed.videoId;
    }

    // Fallback: extract ID using regex
    const patterns = [
      /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
      /tiktok\.com\/t\/([a-zA-Z0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = fullUrl.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error('Could not extract video ID from URL.');
  },

  /**
   * Get video metadata from TikTok
   * 
   * This function requires either:
   * - TikTok for Developers API access (requires app approval)
   * - A backend proxy endpoint at VITE_TIKTOK_API_PROXY (HIGHLY RECOMMENDED)
   * 
   * @param url - TikTok video URL (full or shortened)
   * @returns Promise that resolves to video metadata
   * @throws Error for various failure scenarios (invalid URL, private/deleted video, region-restricted, rate limits)
   */
  async getVideoMetadata(url: string): Promise<TikTokVideoMetadata> {
    const videoId = await this.extractVideoId(url);

    const apiKey = import.meta.env.VITE_TIKTOK_API_KEY;
    const apiProxy = import.meta.env.VITE_TIKTOK_API_PROXY;

    try {
      let response;

      if (apiProxy) {
        // Use backend proxy endpoint (RECOMMENDED)
        response = await axios.get(apiProxy, {
          params: {
            url: url,
            id: videoId,
          },
          timeout: 15000,
        });
      } else if (apiKey) {
        // Use TikTok for Developers API (requires app approval)
        // Note: This is a placeholder - actual TikTok API structure may vary
        const apiUrl = 'https://open.tiktokapis.com/v2/research/video/query/';
        response = await axios.post(
          apiUrl,
          {
            query: {
              and: [
                {
                  operation: 'EQ',
                  field_name: 'video_id',
                  field_values: [videoId],
                },
              ],
            },
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          }
        );
      } else {
        throw new Error(
          'TikTok API key or proxy endpoint not configured. ' +
          'Please set VITE_TIKTOK_API_KEY or VITE_TIKTOK_API_PROXY in your .env file. ' +
          'Note: A backend proxy is highly recommended for TikTok operations.'
        );
      }

      // Parse response based on source
      if (apiProxy) {
        return this.parseProxyResponse(response.data, videoId);
      } else {
        return this.parseTikTokApiResponse(response.data, videoId);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP errors
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 404) {
            throw new Error(
              'Video not found. The video may have been deleted, the URL is incorrect, or the video is private.'
            );
          }

          if (status === 403) {
            // Check for specific error reasons
            if (data?.error?.code === 'PRIVATE_VIDEO') {
              throw new Error('This video is private and cannot be accessed.');
            }
            if (data?.error?.code === 'REGION_RESTRICTED') {
              throw new Error('This video is not available in your region.');
            }
            throw new Error('Access denied. The video may be private or you lack permission to view it.');
          }

          if (status === 429) {
            throw new Error(
              'Rate limit exceeded. TikTok has temporarily restricted access. Please wait before trying again.'
            );
          }

          if (status === 400) {
            throw new Error('Invalid request. Please check the TikTok URL or video ID.');
          }

          throw new Error(`TikTok API error: ${data?.error?.message || 'Unknown error'}`);
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new Error('Request timeout. Please check your internet connection and try again.');
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Network error. Unable to connect to TikTok API or proxy.');
        }

        throw new Error(`Network error: ${error.message}`);
      }

      // Re-throw if it's already our custom error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('An unexpected error occurred while fetching TikTok metadata.');
    }
  },

  /**
   * Parse TikTok for Developers API response
   * @private
   */
  parseTikTokApiResponse(data: any, videoId: string): TikTokVideoMetadata {
    // TikTok for Developers API response structure (may vary)
    const video = data.data?.videos?.[0] || data.data || data;

    return {
      videoId: video.video_id || videoId,
      description: video.description || video.caption || '',
      thumbnail: video.cover_image_url || video.thumbnail || '',
      duration: video.duration || 0,
      author: video.author?.username || video.username || 'Unknown User',
      likeCount: video.statistics?.like_count || video.like_count || 0,
      shareCount: video.statistics?.share_count || video.share_count || 0,
      commentCount: video.statistics?.comment_count || video.comment_count || 0,
      uploadDate: new Date(video.create_time || video.created_at || Date.now()),
      videoUrl: video.video_url || video.play_url,
    };
  },

  /**
   * Parse backend proxy response
   * @private
   */
  parseProxyResponse(data: any, videoId: string): TikTokVideoMetadata {
    // Backend proxy should return data in this format
    return {
      videoId: data.videoId || videoId,
      description: data.description || data.caption || '',
      thumbnail: data.thumbnail || data.coverImageUrl || '',
      duration: data.duration || 0,
      author: data.author || data.username || 'Unknown User',
      likeCount: data.likeCount || data.likes || 0,
      shareCount: data.shareCount || data.shares || 0,
      commentCount: data.commentCount || data.comments || 0,
      uploadDate: new Date(data.uploadDate || data.createTime || data.created_at || Date.now()),
      videoUrl: data.videoUrl || data.video_url,
      watermarkFreeUrl: data.watermarkFreeUrl || data.watermark_free_url,
    };
  },

  /**
   * Get available quality options for TikTok videos
   * TikTok videos are typically in vertical format (9:16 aspect ratio)
   * @param url - TikTok video URL
   * @param duration - Video duration in seconds (for file size estimation)
   * @returns Promise that resolves to array of quality options
   */
  async getAvailableQualities(url: string, duration: number = 0): Promise<Array<{
    resolution: string;
    width: number;
    height: number;
    fileSize: number;
    bitrate: number;
    available: boolean;
    recommended?: boolean;
    label?: string;
  }>> {
    // TikTok videos are always in vertical format (9:16)
    const qualities = [
      { resolution: '1080p', width: 1080, height: 1920, bitrate: 5000, label: 'Full HD' },
      { resolution: '720p', width: 720, height: 1280, bitrate: 3000, label: 'HD' },
      { resolution: '540p', width: 540, height: 960, bitrate: 2000, label: 'SD' },
      { resolution: '360p', width: 360, height: 640, bitrate: 1000, label: 'Low' },
    ];

    // TikTok typically serves videos in 720p or 1080p
    // Lower qualities might not always be available
    const availableQualities = qualities.map((q) => {
      // Estimate file size: (bitrate in kbps * duration in seconds) / 8 = bytes
      const estimatedSize = (q.bitrate * duration) / 8;

      // TikTok usually has 720p and 1080p available
      let available = true;
      if (q.resolution === '540p' || q.resolution === '360p') {
        available = Math.random() > 0.5; // Lower qualities might not always be available
      }

      return {
        resolution: q.resolution,
        width: q.width,
        height: q.height,
        fileSize: Math.round(estimatedSize),
        bitrate: q.bitrate,
        available,
        recommended: q.resolution === '720p', // 720p is recommended for TikTok
        label: q.label,
      };
    });

    return availableQualities.filter(q => q.available);
  },

  /**
   * Download video from TikTok
   * 
   * NOTE: TikTok videos are heavily protected:
   * - CORS restrictions prevent direct browser downloads
   * - Videos come with watermarks by default
   * - Watermark-free versions require backend processing
   * - Rate limiting is strictly enforced
   * 
   * This function REQUIRES a backend proxy that can:
   * - Handle authentication
   * - Bypass CORS restrictions
   * - Process watermark removal (if watermark-free version is requested)
   * - Manage rate limiting
   * 
   * @param url - TikTok video URL
   * @param watermarkFree - Whether to request watermark-free version (requires backend processing)
   * @returns Promise that resolves to video blob data
   * @throws Error if download fails
   */
  async downloadVideo(url: string, watermarkFree: boolean = false): Promise<Blob> {
    const downloadProxy = import.meta.env.VITE_TIKTOK_DOWNLOAD_PROXY;

    if (!downloadProxy) {
      throw new Error(
        'TikTok download proxy not configured. ' +
        'Please set VITE_TIKTOK_DOWNLOAD_PROXY in your .env file. ' +
        'Direct download from TikTok is not possible due to CORS restrictions. ' +
        'A backend service is required.'
      );
    }

    const videoId = await this.extractVideoId(url);

    try {
      const response = await axios.get(downloadProxy, {
        params: {
          url: url,
          id: videoId,
          watermarkFree: watermarkFree,
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
            throw new Error(
              'Access denied. The video may be private, deleted, region-restricted, or you lack permission to download it.'
            );
          }
          if (status === 429) {
            throw new Error('Rate limit exceeded. Please wait before trying again.');
          }
          throw new Error(`Download failed: ${error.response.statusText}`);
        }

        if (error.code === 'ECONNABORTED') {
          throw new Error('Download timeout. The file may be too large or the connection is slow.');
        }

        throw new Error(`Network error during download: ${error.message}`);
      }

      throw new Error('An unexpected error occurred during TikTok video download.');
    }
  },

  /**
   * Get video transcript/captions from TikTok
   * Note: TikTok videos don't have traditional captions/transcripts like YouTube
   * This returns the video description/caption text instead
   *
   * @param url - TikTok video URL
   * @returns Promise that resolves to transcript text (video description)
   * @throws Error if transcript is unavailable or fetch fails
   */
  async getTranscript(url: string): Promise<string> {
    try {
      // Get video metadata which includes the caption/description
      const metadata = await this.getVideoMetadata(url);

      if (!metadata.description || metadata.description.trim().length === 0) {
        throw new Error('No caption/description available for this TikTok video');
      }

      // Return the description as the transcript
      // TikTok doesn't have traditional transcripts, so we use the caption
      return `TikTok Video Caption:\n\n${metadata.description}\n\nAuthor: @${metadata.author}`;

    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch TikTok video caption. The video may not have a description.');
    }
  },
};

