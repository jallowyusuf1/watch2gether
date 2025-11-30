import type { VideoPlatform } from '../types';

/**
 * Result object returned by parseVideoUrl
 */
export interface ParsedVideoUrl {
  platform: VideoPlatform;
  videoId: string;
}

/**
 * Regex patterns for different video platforms
 */
const URL_PATTERNS = {
  // YouTube regular videos: youtube.com/watch?v=VIDEO_ID or youtu.be/VIDEO_ID
  youtube: [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i,
  ],
  
  // YouTube Shorts: youtube.com/shorts/VIDEO_ID
  youtubeShorts: [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  ],
  
  
  // TikTok videos: tiktok.com/@username/video/VIDEO_ID or vm.tiktok.com/SHORT_CODE
  tiktok: [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/i,
    /vm\.tiktok\.com\/([a-zA-Z0-9]+)/i,
    /tiktok\.com\/t\/([a-zA-Z0-9]+)/i,
  ],
};

/**
 * Parse a video URL and extract platform and video ID
 * 
 * @param url - The video URL to parse
 * @returns Object with platform and videoId, or null if invalid
 * 
 * @example
 * // YouTube regular video
 * parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns: { platform: 'youtube', videoId: 'dQw4w9WgXcQ' }
 * 
 * @example
 * // YouTube Shorts
 * parseVideoUrl('https://youtube.com/shorts/abc123def45')
 * // Returns: { platform: 'youtube', videoId: 'abc123def45' }
 * 
 * @example
 * // YouTube short link
 * parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')
 * // Returns: { platform: 'youtube', videoId: 'dQw4w9WgXcQ' }
 * 
 * @example
 * // TikTok video
 * parseVideoUrl('https://www.tiktok.com/@user/video/1234567890123456789')
 * // Returns: { platform: 'tiktok', videoId: '1234567890123456789' }
 * 
 * @example
 * // TikTok short link
 * parseVideoUrl('https://vm.tiktok.com/ZMabc123def/')
 * // Returns: { platform: 'tiktok', videoId: 'ZMabc123def' }
 * 
 * @example
 * // Invalid URL
 * parseVideoUrl('https://example.com/video')
 * // Returns: null
 * 
 * @example
 * // URL with query parameters
 * parseVideoUrl('https://youtube.com/watch?v=dQw4w9WgXcQ&t=30s')
 * // Returns: { platform: 'youtube', videoId: 'dQw4w9WgXcQ' }
 * 
 * @example
 * // URL with trailing slash
 * parseVideoUrl('https://youtube.com/shorts/abc123def45/')
 * // Returns: { platform: 'youtube', videoId: 'abc123def45' }
 */
export function parseVideoUrl(url: string): ParsedVideoUrl | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Normalize URL: remove trailing slashes, handle www vs non-www
  const normalizedUrl = url.trim().replace(/\/+$/, '');

  // Test YouTube Shorts first (more specific pattern)
  for (const pattern of URL_PATTERNS.youtubeShorts) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return {
        platform: 'youtube',
        videoId: match[1],
      };
    }
  }

  // Test YouTube regular videos
  for (const pattern of URL_PATTERNS.youtube) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return {
        platform: 'youtube',
        videoId: match[1],
      };
    }
  }

  // Test TikTok
  for (const pattern of URL_PATTERNS.tiktok) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return {
        platform: 'tiktok',
        videoId: match[1],
      };
    }
  }

  return null;
}

/**
 * Check if a URL is a valid video URL
 * 
 * @param url - The URL to validate
 * @returns true if the URL is a valid video URL, false otherwise
 * 
 * @example
 * isValidVideoUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns: true
 * 
 * @example
 * isValidVideoUrl('https://example.com/video')
 * // Returns: false
 */
export function isValidVideoUrl(url: string): boolean {
  return parseVideoUrl(url) !== null;
}

/**
 * Get the platform name from a video URL
 * 
 * @param url - The video URL
 * @returns Platform name string or null if URL is invalid
 * 
 * @example
 * getPlatformFromUrl('https://youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns: 'youtube'
 * 
 * 
 * @example
 * getPlatformFromUrl('https://tiktok.com/@user/video/123')
 * // Returns: 'tiktok'
 * 
 * @example
 * getPlatformFromUrl('https://example.com/video')
 * // Returns: null
 */
export function getPlatformFromUrl(url: string): VideoPlatform | null {
  const parsed = parseVideoUrl(url);
  return parsed ? parsed.platform : null;
}

