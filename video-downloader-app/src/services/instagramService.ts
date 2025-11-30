import axios from 'axios';
import { parseVideoUrl } from '../utils/urlParser';

/**
 * Instagram video metadata response interface
 */
export interface InstagramVideoMetadata {
  postId?: string;
  reelId?: string;
  caption: string; // description
  thumbnail: string;
  duration: number; // in seconds, if available
  author: string; // username
  likeCount: number; // if accessible
  postDate: Date;
  isReel: boolean;
  videoUrl?: string; // direct video URL if available
}

/**
 * Instagram service for video operations
 * 
 * NOTE: Instagram's official API has strict limitations:
 * - Instagram Basic Display API requires OAuth authentication
 * - Instagram Graph API requires business account and app review
 * - Direct scraping is against Instagram's Terms of Service
 * - Instagram implements CORS restrictions and rate limiting
 * 
 * This service should use:
 * 1. A backend proxy endpoint that handles Instagram's restrictions
 * 2. Instagram Basic Display API with access token (limited functionality)
 * 3. Instagram Graph API for business accounts (requires app approval)
 * 
 * Downloading from Instagram is significantly more complex than YouTube due to:
 * - Authentication requirements
 * - CORS restrictions
 * - Rate limiting
 * - Dynamic content loading (requires browser automation)
 * - Frequent API changes
 * 
 * A backend service is HIGHLY RECOMMENDED for Instagram operations.
 */
export const instagramService = {
  /**
   * Validate Instagram URL format
   * @param url - Instagram URL to validate
   * @returns true if URL is a valid Instagram post/reel URL
   */
  isValidInstagramUrl(url: string): boolean {
    const instagramPatterns = [
      /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[a-zA-Z0-9_-]+\/?/i,
      /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/(p|reel|tv)\/[a-zA-Z0-9_-]+\/?/i,
    ];

    return instagramPatterns.some((pattern) => pattern.test(url));
  },

  /**
   * Extract post or reel ID from Instagram URL
   * @param url - Instagram post or reel URL
   * @returns Post ID or reel ID string
   * @throws Error if URL is invalid
   */
  extractPostId(url: string): string {
    // Validate URL first
    if (!this.isValidInstagramUrl(url)) {
      throw new Error('Invalid Instagram URL. Please provide a valid Instagram post or reel URL.');
    }

    // Try parsing with urlParser first
    const parsed = parseVideoUrl(url);
    if (parsed && parsed.platform === 'instagram') {
      return parsed.videoId;
    }

    // Fallback: extract ID using regex
    const patterns = [
      /instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i,
      /instagram\.com\/[^\/]+\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    throw new Error('Could not extract post or reel ID from URL.');
  },

  /**
   * Check if URL is a reel versus a regular post
   * @param url - Instagram URL
   * @returns true if URL is a reel, false if regular post
   */
  isReel(url: string): boolean {
    return url.includes('/reel/') || url.includes('/reels/');
  },

  /**
   * Get video metadata from Instagram
   * 
   * This function requires either:
   * - Instagram Basic Display API access token in VITE_INSTAGRAM_ACCESS_TOKEN
   * - A backend proxy endpoint at VITE_INSTAGRAM_API_PROXY (HIGHLY RECOMMENDED)
   * 
   * @param url - Instagram post or reel URL
   * @returns Promise that resolves to video metadata
   * @throws Error for various failure scenarios (invalid URL, private account, deleted post, rate limiting)
   */
  async getVideoMetadata(url: string): Promise<InstagramVideoMetadata> {
    const postId = this.extractPostId(url);
    const isReel = this.isReel(url);

    const accessToken = import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN;
    const apiProxy = import.meta.env.VITE_INSTAGRAM_API_PROXY;

    try {
      let response;

      if (apiProxy) {
        // Use backend proxy endpoint (RECOMMENDED)
        response = await axios.get(apiProxy, {
          params: {
            url: url,
            id: postId,
          },
          timeout: 15000,
        });
      } else if (accessToken) {
        // Use Instagram Basic Display API (limited functionality)
        // Note: This API has very limited access and may not work for all posts
        const apiUrl = 'https://graph.instagram.com/v18.0';
        response = await axios.get(`${apiUrl}/${postId}`, {
          params: {
            fields: 'id,caption,media_type,media_url,thumbnail_url,timestamp,username,like_count',
            access_token: accessToken,
          },
          timeout: 15000,
        });
      } else {
        throw new Error(
          'Instagram API access token or proxy endpoint not configured. ' +
          'Please set VITE_INSTAGRAM_ACCESS_TOKEN or VITE_INSTAGRAM_API_PROXY in your .env file. ' +
          'Note: A backend proxy is highly recommended for Instagram operations.'
        );
      }

      // Parse response based on source
      if (apiProxy) {
        return this.parseProxyResponse(response.data, postId, isReel);
      } else {
        return this.parseInstagramApiResponse(response.data, postId, isReel);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Handle specific HTTP errors
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 404) {
            throw new Error(
              'Post not found. The post may have been deleted, the URL is incorrect, or the account is private.'
            );
          }

          if (status === 403) {
            // Check for specific error reasons
            if (data?.error?.error_subcode === 2108016) {
              throw new Error('This account is private. You cannot access posts from private accounts.');
            }
            if (data?.error?.code === 10) {
              throw new Error('Access denied. Invalid or expired access token.');
            }
            throw new Error('Access denied. The post may be private or you lack permission to view it.');
          }

          if (status === 429) {
            throw new Error(
              'Rate limit exceeded. Instagram has temporarily restricted access. Please wait before trying again.'
            );
          }

          if (status === 400) {
            throw new Error('Invalid request. Please check the Instagram URL or post ID.');
          }

          throw new Error(`Instagram API error: ${data?.error?.message || 'Unknown error'}`);
        }

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          throw new Error('Request timeout. Please check your internet connection and try again.');
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
          throw new Error('Network error. Unable to connect to Instagram API or proxy.');
        }

        throw new Error(`Network error: ${error.message}`);
      }

      // Re-throw if it's already our custom error
      if (error instanceof Error) {
        throw error;
      }

      throw new Error('An unexpected error occurred while fetching Instagram metadata.');
    }
  },

  /**
   * Parse Instagram Graph API response
   * @private
   */
  parseInstagramApiResponse(data: any, postId: string, isReel: boolean): InstagramVideoMetadata {
    // Instagram Graph API response structure
    return {
      postId: isReel ? undefined : postId,
      reelId: isReel ? postId : undefined,
      caption: data.caption || '',
      thumbnail: data.thumbnail_url || data.media_url || '',
      duration: 0, // Instagram API doesn't provide duration
      author: data.username || 'Unknown User',
      likeCount: data.like_count || 0,
      postDate: new Date(data.timestamp || Date.now()),
      isReel,
      videoUrl: data.media_type === 'VIDEO' ? data.media_url : undefined,
    };
  },

  /**
   * Parse backend proxy response
   * @private
   */
  parseProxyResponse(data: any, postId: string, isReel: boolean): InstagramVideoMetadata {
    // Backend proxy should return data in this format
    return {
      postId: data.postId || (isReel ? undefined : postId),
      reelId: data.reelId || (isReel ? postId : undefined),
      caption: data.caption || data.description || '',
      thumbnail: data.thumbnail || data.thumbnailUrl || '',
      duration: data.duration || 0,
      author: data.author || data.username || 'Unknown User',
      likeCount: data.likeCount || data.likes || 0,
      postDate: new Date(data.postDate || data.timestamp || Date.now()),
      isReel: data.isReel !== undefined ? data.isReel : isReel,
      videoUrl: data.videoUrl || data.video_url,
    };
  },

  /**
   * Download video from Instagram
   * 
   * NOTE: Instagram videos are heavily protected:
   * - CORS restrictions prevent direct browser downloads
   * - Videos are often behind authentication
   * - Dynamic content loading requires browser automation
   * - Rate limiting is strictly enforced
   * 
   * This function REQUIRES a backend proxy that can:
   * - Handle authentication
   * - Bypass CORS restrictions
   * - Use browser automation (Puppeteer/Playwright) if needed
   * - Manage rate limiting
   * 
   * @param url - Instagram post or reel URL
   * @returns Promise that resolves to video blob data
   * @throws Error if download fails
   */
  async downloadVideo(url: string): Promise<Blob> {
    const downloadProxy = import.meta.env.VITE_INSTAGRAM_DOWNLOAD_PROXY;

    if (!downloadProxy) {
      throw new Error(
        'Instagram download proxy not configured. ' +
        'Please set VITE_INSTAGRAM_DOWNLOAD_PROXY in your .env file. ' +
        'Direct download from Instagram is not possible due to CORS restrictions and authentication requirements. ' +
        'A backend service with browser automation is required.'
      );
    }

    const postId = this.extractPostId(url);

    try {
      const response = await axios.get(downloadProxy, {
        params: {
          url: url,
          id: postId,
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
            throw new Error('Post not found or unavailable for download.');
          }
          if (status === 403) {
            throw new Error(
              'Access denied. The post may be private, deleted, or you lack permission to download it.'
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

      throw new Error('An unexpected error occurred during Instagram video download.');
    }
  },
};

