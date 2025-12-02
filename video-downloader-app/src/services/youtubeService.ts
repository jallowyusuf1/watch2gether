import { Innertube } from 'youtubei.js/web';
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
   * Get video metadata from YouTube using YouTube.js (no backend required)
   *
   * @param urlOrId - YouTube video URL or video ID
   * @returns Promise that resolves to video metadata
   * @throws Error for various failure scenarios (not found, private, age-restricted, network errors)
   */
  async getVideoMetadata(urlOrId: string): Promise<YouTubeVideoMetadata> {
    const videoId = this.extractVideoId(urlOrId);
    const isShort = this.isShort(urlOrId);

    try {
      console.log('[YouTube Service] Fetching metadata for:', videoId);

      // Create YouTube client
      const youtube = await Innertube.create({
        cache: new Map(),
        fetch: fetch.bind(globalThis)
      });

      // Get video info
      const videoInfo = await youtube.getInfo(videoId);

      if (!videoInfo || !videoInfo.basic_info) {
        throw new Error('Video not found or unavailable');
      }

      const basicInfo = videoInfo.basic_info;

      // Get best thumbnail
      const thumbnails = basicInfo.thumbnail;
      let thumbnail = '';
      if (thumbnails && thumbnails.length > 0) {
        // Get the highest quality thumbnail
        const bestThumb = thumbnails[thumbnails.length - 1];
        thumbnail = bestThumb.url || '';
      }

      return {
        videoId,
        title: basicInfo.title || 'Untitled',
        description: basicInfo.short_description || '',
        thumbnail,
        duration: basicInfo.duration || 0,
        author: basicInfo.author || 'Unknown Channel',
        viewCount: basicInfo.view_count || 0,
        uploadDate: new Date(basicInfo.publish_date || Date.now()),
        isShort,
      };
    } catch (error) {
      console.error('[YouTube Service] Error fetching metadata:', error);

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          throw new Error('Video not found. The video may have been deleted or the URL is incorrect.');
        }

        if (errorMessage.includes('private') || errorMessage.includes('403')) {
          throw new Error('This video is private or unavailable');
        }

        if (errorMessage.includes('age') || errorMessage.includes('restricted')) {
          throw new Error('This video is age-restricted');
        }

        throw error;
      }

      throw new Error('Failed to fetch video metadata. Please check the URL and try again.');
    }
  },

  /**
   * Parse YouTube Data API v3 response (DEPRECATED - now using YouTube.js)
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
   * Parse backend proxy response (DEPRECATED - now using YouTube.js)
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
   * Get available qualities for a YouTube video
   * @param videoId - YouTube video ID
   * @param duration - Video duration in seconds (for file size estimation)
   * @param isShort - Whether the video is a Short
   * @returns Promise that resolves to array of quality options
   */
  async getAvailableQualities(
    videoId: string,
    duration: number = 0,
    isShort: boolean = false
  ): Promise<Array<{
    resolution: string;
    width: number;
    height: number;
    fileSize: number;
    bitrate: number;
    available: boolean;
    recommended?: boolean;
    label?: string;
  }>> {
    // Standard YouTube video qualities
    const standardQualities = [
      { resolution: '2160p', width: 3840, height: 2160, bitrate: 15000, label: '4K' },
      { resolution: '1440p', width: 2560, height: 1440, bitrate: 9000, label: '2K' },
      { resolution: '1080p', width: 1920, height: 1080, bitrate: 5000, label: 'Full HD' },
      { resolution: '720p', width: 1280, height: 720, bitrate: 2500, label: 'HD' },
      { resolution: '480p', width: 854, height: 480, bitrate: 1500, label: 'SD' },
      { resolution: '360p', width: 640, height: 360, bitrate: 1000, label: 'Low' },
      { resolution: '240p', width: 426, height: 240, bitrate: 500, label: 'Very Low' },
    ];

    // YouTube Shorts are vertical videos (9:16 aspect ratio)
    const shortsQualities = [
      { resolution: '1080p', width: 1080, height: 1920, bitrate: 5000, label: 'Full HD' },
      { resolution: '720p', width: 720, height: 1280, bitrate: 2500, label: 'HD' },
      { resolution: '480p', width: 480, height: 854, bitrate: 1500, label: 'SD' },
      { resolution: '360p', width: 360, height: 640, bitrate: 1000, label: 'Low' },
    ];

    const qualities = isShort ? shortsQualities : standardQualities;

    const availableQualities = qualities.map((q) => {
      // Estimate file size: (bitrate in kbps * duration in seconds) / 8 = bytes
      const estimatedSize = (q.bitrate * duration) / 8;

      // Shorts don't have 4K typically
      let available = true;
      if (isShort && (q.resolution === '2160p' || q.resolution === '1440p')) {
        available = false;
      }

      // 4K and 2K might not always be available for regular videos
      if (!isShort && (q.resolution === '2160p' || q.resolution === '1440p')) {
        available = Math.random() > 0.6; // Simulate availability
      }

      return {
        resolution: q.resolution,
        width: q.width,
        height: q.height,
        fileSize: Math.round(estimatedSize),
        bitrate: q.bitrate,
        available,
        recommended: q.resolution === '1080p',
        label: q.label,
      };
    });

    return availableQualities.filter(q => q.available);
  },

  /**
   * Download video from YouTube (DEPRECATED - requires backend)
   * @param videoId - YouTube video ID
   * @param quality - Desired quality (e.g., '1080p')
   * @param format - Desired format ('mp4' or 'mp3')
   * @returns Promise that resolves to video blob data
   * @throws Error if download fails
   */
  async downloadVideo(videoId: string, quality: string = '1080p', format: 'mp4' | 'mp3' = 'mp4'): Promise<Blob> {
    throw new Error(
      'Direct video download is not available. This feature requires a backend server. ' +
      'Please start the server by running "npm run server" in a terminal.'
    );
  },

  /**
   * Get video transcript/captions from YouTube using YouTube.js
   *
   * @param urlOrId - YouTube video URL or video ID
   * @returns Promise that resolves to transcript text
   * @throws Error if transcript is unavailable or fetch fails
   */
  async getTranscript(urlOrId: string): Promise<string> {
    const videoId = this.extractVideoId(urlOrId);

    try {
      console.log('[YouTube Service] Fetching transcript for:', videoId);

      // Create YouTube client
      const youtube = await Innertube.create({
        cache: new Map(),
        fetch: fetch.bind(globalThis)
      });

      // Get video info
      const videoInfo = await youtube.getInfo(videoId);

      if (!videoInfo) {
        throw new Error('Video not found');
      }

      // Get transcript
      const transcriptData = await videoInfo.getTranscript();

      if (!transcriptData || !transcriptData.transcript) {
        throw new Error('No captions available for this video');
      }

      // Format transcript
      const transcript = transcriptData.transcript;
      const segments = transcript.content?.body?.initial_segments;

      if (!segments || segments.length === 0) {
        throw new Error('Could not extract transcript text');
      }

      // Extract text from segments
      const transcriptLines: string[] = [];
      for (const segment of segments) {
        if (segment.snippet && segment.snippet.text) {
          transcriptLines.push(segment.snippet.text);
        }
      }

      if (transcriptLines.length === 0) {
        throw new Error('Could not extract transcript text');
      }

      return transcriptLines.join('\n');

    } catch (error) {
      console.error('[YouTube Service] Error fetching transcript:', error);

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('no captions') || errorMessage.includes('not available')) {
          throw new Error('No captions available for this video');
        }

        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          throw new Error('Video not found or unavailable');
        }

        throw error;
      }

      throw new Error('Failed to fetch transcript. The video may not have captions available.');
    }
  },
};

