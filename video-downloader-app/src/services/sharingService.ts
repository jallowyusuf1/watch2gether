import type { Video } from '../types';
import type { Collection } from '../types/video.types';

/**
 * Sharing service for generating shareable content
 */

export interface ShareOptions {
  includeTitle?: boolean;
  includeDescription?: boolean;
  includeThumbnail?: boolean;
  expiryDate?: Date;
  password?: string;
  maxViews?: number;
  maxDownloads?: number;
  isPublic?: boolean;
}

export interface ShareHistory {
  id: string;
  type: 'video' | 'collection' | 'playlist';
  itemId: string;
  sharedAt: Date;
  shareMethod: 'link' | 'social' | 'email' | 'embed' | 'file';
  recipient?: string;
  expiresAt?: Date;
  viewCount?: number;
  downloadCount?: number;
}

/**
 * Generate M3U playlist file content
 */
export const generateM3UPlaylist = (videos: Video[]): string => {
  let m3u = '#EXTM3U\n';
  
  videos.forEach((video) => {
    // Use blob URL if available, otherwise original URL
    const videoUrl = video.videoBlob 
      ? URL.createObjectURL(video.videoBlob)
      : video.url;
    
    m3u += `#EXTINF:${Math.floor(video.duration || 0)},${video.title}\n`;
    m3u += `${videoUrl}\n`;
  });
  
  return m3u;
};

/**
 * Download M3U playlist file
 */
export const downloadM3UPlaylist = (videos: Video[], filename: string = 'playlist.m3u'): void => {
  const m3uContent = generateM3UPlaylist(videos);
  const blob = new Blob([m3uContent], { type: 'application/vnd.apple.mpegurl' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Generate social media share URLs
 */
export const getSocialShareUrls = (url: string, title: string, description?: string) => {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description || '');

  return {
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%20${encodedUrl}`,
  };
};

/**
 * Copy text to clipboard with fallback
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate embed code for video
 */
export const generateEmbedCode = (
  videoId: string,
  width: number = 560,
  height: number = 315,
  autoplay: boolean = false,
  controls: boolean = true
): string => {
  // For now, generate a simple iframe embed
  // In a real implementation, you'd need a public video hosting service
  const embedUrl = `${window.location.origin}/embed/${videoId}${autoplay ? '?autoplay=1' : ''}`;
  
  return `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
};

/**
 * Export collection as JSON
 */
export const exportCollectionAsJSON = (collection: Collection, videos: Video[]): string => {
  const exportData = {
    collection: {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      color: collection.color,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    },
    videos: videos.map(v => {
      const { videoBlob, ...videoMeta } = v;
      return videoMeta;
    }),
    exportedAt: new Date().toISOString(),
    appVersion: '1.0.0',
  };
  
  return JSON.stringify(exportData, null, 2);
};

/**
 * Download collection as JSON file
 */
export const downloadCollectionJSON = (collection: Collection, videos: Video[], filename?: string): void => {
  const jsonContent = exportCollectionAsJSON(collection, videos);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${collection.name.replace(/\s+/g, '_')}_collection.json`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Generate shareable link with metadata
 */
export const generateShareableLink = (
  type: 'video' | 'collection' | 'playlist',
  id: string,
  options?: ShareOptions
): string => {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams();
  
  params.append('type', type);
  params.append('id', id);
  
  if (options?.expiryDate) {
    params.append('expires', options.expiryDate.toISOString());
  }
  
  if (options?.password) {
    params.append('p', btoa(options.password)); // Simple encoding (not secure, just obfuscation)
  }
  
  if (options?.maxViews) {
    params.append('maxViews', options.maxViews.toString());
  }
  
  if (options?.isPublic) {
    params.append('public', 'true');
  }
  
  return `${baseUrl}/shared?${params.toString()}`;
};

/**
 * Generate email HTML template
 */
export const generateEmailTemplate = (video: Video, message?: string): string => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${video.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #6366f1;">${video.title}</h2>
    ${video.thumbnail ? `<img src="${video.thumbnail}" alt="${video.title}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 20px 0;">` : ''}
    ${video.description ? `<p style="color: #666;">${video.description}</p>` : ''}
    ${message ? `<p style="color: #333; font-style: italic;">${message}</p>` : ''}
    <div style="margin: 30px 0;">
      <a href="${video.url}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Watch Video</a>
    </div>
    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
    <p style="color: #999; font-size: 12px;">Shared via Video Downloader App</p>
  </div>
</body>
</html>
  `.trim();
  
  return html;
};

/**
 * Generate video report/summary
 */
export const generateVideoReport = (video: Video, transcript?: string, notes?: string): string => {
  const report = `
# Video Report: ${video.title}

## Metadata
- **Platform:** ${video.platform}
- **Author:** ${video.author || 'Unknown'}
- **Duration:** ${Math.floor((video.duration || 0) / 60)}:${String(Math.floor((video.duration || 0) % 60)).padStart(2, '0')}
- **Quality:** ${video.quality || 'Unknown'}
- **Format:** ${video.format || 'Unknown'}
- **Downloaded:** ${video.downloadDate ? new Date(video.downloadDate).toLocaleDateString() : 'Unknown'}

## Description
${video.description || 'No description available.'}

${transcript ? `## Transcript\n${transcript}` : ''}

${notes ? `## Notes\n${notes}` : ''}

## Link
${video.url}

---
Generated on ${new Date().toLocaleString()}
  `.trim();
  
  return report;
};

/**
 * Export video report as file
 */
export const downloadVideoReport = (video: Video, transcript?: string, notes?: string, filename?: string): void => {
  const report = generateVideoReport(video, transcript, notes);
  const blob = new Blob([report], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${video.title.replace(/\s+/g, '_')}_report.md`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const sharingService = {
  generateM3UPlaylist,
  downloadM3UPlaylist,
  getSocialShareUrls,
  copyToClipboard,
  generateEmbedCode,
  exportCollectionAsJSON,
  downloadCollectionJSON,
  generateShareableLink,
  generateEmailTemplate,
  generateVideoReport,
  downloadVideoReport,
};

