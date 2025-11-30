import type { VideoPlatform } from '../types';

interface QueuedDownload {
  id: string;
  url: string;
  platform: VideoPlatform;
  quality: string;
  format: 'mp4' | 'mp3';
  timestamp: Date;
  retries: number;
}

const QUEUE_STORAGE_KEY = 'offline-download-queue';

/**
 * Offline download queue service
 * Stores download requests made while offline and processes them when online
 */
export const offlineQueue = {
  /**
   * Add a download to the queue
   */
  async add(url: string, platform: VideoPlatform, quality: string, format: 'mp4' | 'mp3'): Promise<string> {
    const queue = this.getAll();
    const item: QueuedDownload = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url,
      platform,
      quality,
      format,
      timestamp: new Date(),
      retries: 0,
    };
    
    queue.push(item);
    this.save(queue);
    return item.id;
  },

  /**
   * Get all queued downloads
   */
  getAll(): QueuedDownload[] {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }));
      }
    } catch (error) {
      console.error('[OfflineQueue] Error loading queue:', error);
    }
    return [];
  },

  /**
   * Remove a download from the queue
   */
  remove(id: string): void {
    const queue = this.getAll();
    const filtered = queue.filter(item => item.id !== id);
    this.save(filtered);
  },

  /**
   * Clear all queued downloads
   */
  clear(): void {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  },

  /**
   * Save queue to localStorage
   */
  save(queue: QueuedDownload[]): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[OfflineQueue] Error saving queue:', error);
    }
  },

  /**
   * Increment retry count for a queued download
   */
  incrementRetry(id: string): void {
    const queue = this.getAll();
    const updated = queue.map(item =>
      item.id === id ? { ...item, retries: item.retries + 1 } : item
    );
    this.save(updated);
  },
};

