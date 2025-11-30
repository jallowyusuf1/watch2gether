import { useEffect } from 'react';
import { useOffline } from '../hooks/useOffline';
import { offlineQueue } from '../services/offlineQueue';
import { youtubeService } from '../services/youtubeService';
import { tiktokService } from '../services/tiktokService';
import { storageService } from '../services/storageService';
import { parseVideoUrl } from '../utils/urlParser';

/**
 * Component that processes queued downloads when user comes back online
 */
export const OfflineQueueProcessor = () => {
  const { isOnline, wasOffline } = useOffline();

  useEffect(() => {
    if (!isOnline || !wasOffline) return;

    const processQueue = async () => {
      const queue = offlineQueue.getAll();
      if (queue.length === 0) return;

      console.log(`[OfflineQueueProcessor] Processing ${queue.length} queued downloads...`);

      for (const item of queue) {
        try {
          // Check if server is available
          const proxyUrl = import.meta.env.VITE_YOUTUBE_API_PROXY || 'http://localhost:3000/api/youtube';
          const baseUrl = proxyUrl.replace('/api/youtube', '');
          const healthCheck = await fetch(`${baseUrl}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000)
          }).catch(() => null);

          if (!healthCheck || !healthCheck.ok) {
            console.log('[OfflineQueueProcessor] Server not available, keeping in queue');
            continue;
          }

          // Process the download
          let videoBlob: Blob;
          let metadata: any;

          if (item.platform === 'youtube') {
            const parsed = parseVideoUrl(item.url);
            if (!parsed) continue;
            
            metadata = await youtubeService.getVideoMetadata(item.url);
            videoBlob = await youtubeService.downloadVideo(parsed.videoId, item.quality, item.format);
          } else if (item.platform === 'tiktok') {
            metadata = await tiktokService.getVideoMetadata(item.url);
            videoBlob = await tiktokService.downloadVideo(item.url, false);
          } else {
            continue;
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
            quality: item.quality,
            format: item.format,
            videoBlob: videoBlob,
            fileSize: videoBlob.size,
          };

          await storageService.saveVideo(videoData);

          // Remove from queue
          offlineQueue.remove(item.id);
          console.log(`[OfflineQueueProcessor] Successfully processed: ${item.url}`);
        } catch (error) {
          console.error(`[OfflineQueueProcessor] Error processing ${item.url}:`, error);
          
          // Increment retry count
          offlineQueue.incrementRetry(item.id);
          
          // Remove if too many retries
          if (item.retries >= 3) {
            offlineQueue.remove(item.id);
            console.log(`[OfflineQueueProcessor] Removed ${item.url} after 3 retries`);
          }
        }
      }
    };

    // Small delay to ensure connection is stable
    const timeoutId = setTimeout(() => {
      processQueue();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isOnline, wasOffline]);

  return null;
};

