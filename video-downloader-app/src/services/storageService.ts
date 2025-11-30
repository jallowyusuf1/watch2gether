import { db } from '../db/database';
import type { Video, VideoPlatform } from '../types';

/**
 * Storage service for managing video data in IndexedDB
 */
export const storageService = {
  /**
   * Save a video to the database
   * Validates required fields, assigns unique ID, and sets download date
   * @param video - Video object to save (id and downloadDate will be auto-generated if not provided)
   * @returns Promise that resolves to the video ID
   */
  async saveVideo(video: Partial<Video>): Promise<string> {
    // Validate required fields
    if (!video.url) {
      throw new Error('Video URL is required');
    }
    if (!video.platform) {
      throw new Error('Video platform is required');
    }
    if (!video.title) {
      throw new Error('Video title is required');
    }
    if (!video.videoBlob) {
      throw new Error('Video blob is required');
    }

    // Create complete video object with auto-generated fields
    const completeVideo: Video = {
      id: video.id || crypto.randomUUID(),
      url: video.url,
      platform: video.platform,
      title: video.title,
      description: video.description || '',
      thumbnail: video.thumbnail || '',
      duration: video.duration || 0,
      author: video.author || '',
      downloadDate: video.downloadDate || new Date(),
      fileSize: video.fileSize || video.videoBlob.size,
      quality: video.quality || 'unknown',
      format: video.format || 'mp4',
      videoBlob: video.videoBlob,
      transcript: video.transcript || null,
      tags: video.tags || [],
    };

    await db.addVideo(completeVideo);
    return completeVideo.id;
  },

  /**
   * Get a video by its ID
   * @param id - Video ID
   * @returns Promise that resolves to the Video object
   * @throws Error if video is not found
   */
  async getVideo(id: string): Promise<Video> {
    const video = await db.getVideoById(id);
    if (!video) {
      throw new Error(`Video with id ${id} not found`);
    }
    return video;
  },

  /**
   * Get all videos sorted by download date (newest first)
   * @returns Promise that resolves to an array of videos
   */
  async getAllVideos(): Promise<Video[]> {
    const videos = await db.getAllVideos();
    // Sort by downloadDate in descending order (newest first)
    return videos.sort((a, b) => {
      const dateA = a.downloadDate instanceof Date ? a.downloadDate : new Date(a.downloadDate);
      const dateB = b.downloadDate instanceof Date ? b.downloadDate : new Date(b.downloadDate);
      return dateB.getTime() - dateA.getTime();
    });
  },

  /**
   * Delete a video by ID and revoke any blob URLs to prevent memory leaks
   * @param id - Video ID to delete
   * @returns Promise that resolves when video is deleted
   */
  async deleteVideo(id: string): Promise<void> {
    // Get the video first to revoke blob URLs
    const video = await db.getVideoById(id);
    
    if (video) {
      // Revoke blob URL if thumbnail is a blob URL
      if (video.thumbnail && video.thumbnail.startsWith('blob:')) {
        URL.revokeObjectURL(video.thumbnail);
      }
      
      // Revoke video blob URL if it exists
      if (video.videoBlob) {
        // If videoBlob is stored as a blob URL string, revoke it
        // Otherwise, the blob will be garbage collected when deleted
        const blobUrl = URL.createObjectURL(video.videoBlob);
        URL.revokeObjectURL(blobUrl);
      }
    }

    await db.deleteVideo(id);
  },

  /**
   * Update video metadata
   * @param id - Video ID to update
   * @param changes - Partial Video object with fields to update
   * @returns Promise that resolves to the number of updated records
   */
  async updateVideoMetadata(id: string, changes: Partial<Video>): Promise<number> {
    // Don't allow updating id, videoBlob, or downloadDate through this method
    const { id: _, videoBlob: __, downloadDate: ___, ...allowedChanges } = changes;
    
    const updatedCount = await db.updateVideo(id, allowedChanges);
    if (updatedCount === 0) {
      throw new Error(`Video with id ${id} not found`);
    }
    return updatedCount;
  },

  /**
   * Search videos by query string
   * Searches through titles, descriptions, and tags
   * @param query - Search query string
   * @returns Promise that resolves to an array of matching videos
   */
  async searchVideos(query: string): Promise<Video[]> {
    if (!query.trim()) {
      return this.getAllVideos();
    }

    const allVideos = await db.getAllVideos();
    const lowerQuery = query.toLowerCase().trim();

    return allVideos.filter((video) => {
      const titleMatch = video.title.toLowerCase().includes(lowerQuery);
      const descriptionMatch = video.description.toLowerCase().includes(lowerQuery);
      const tagsMatch = video.tags.some((tag) => tag.toLowerCase().includes(lowerQuery));
      
      return titleMatch || descriptionMatch || tagsMatch;
    });
  },

  /**
   * Get videos filtered by platform
   * @param platform - Platform type to filter by
   * @returns Promise that resolves to an array of videos from the specified platform
   */
  async getVideosByPlatform(platform: VideoPlatform): Promise<Video[]> {
    const allVideos = await db.getAllVideos();
    return allVideos.filter((video) => video.platform === platform);
  },

  /**
   * Calculate total storage used by all videos
   * @returns Promise that resolves to total file size in bytes
   */
  async getTotalStorageUsed(): Promise<number> {
    const allVideos = await db.getAllVideos();
    return allVideos.reduce((total, video) => {
      return total + (video.fileSize || 0);
    }, 0);
  },

  /**
   * Export/download a video file to user's downloads folder
   * Creates a download link, triggers download, and cleans up blob URL
   * Works in all modern browsers (Chrome, Firefox, Safari, Edge, Arc, etc.)
   * @param id - Video ID to export
   * @returns Promise that resolves when download is triggered
   */
  async exportVideo(id: string): Promise<void> {
    const video = await this.getVideo(id);
    
    // Create blob URL for download
    const blobUrl = URL.createObjectURL(video.videoBlob);
    
    try {
      // Sanitize filename - remove invalid characters
      const sanitizedTitle = video.title
        .replace(/[<>:"/\\|?*]/g, '_') // Remove invalid filename characters
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .substring(0, 200); // Limit length
      
      const filename = `${sanitizedTitle}.${video.format}`;
      
      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename; // This triggers download to browser's default downloads folder
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`[Storage Service] Video exported: ${filename}`);
    } catch (error) {
      console.error('[Storage Service] Error exporting video:', error);
      throw new Error('Failed to export video. Please try again.');
    } finally {
      // Always revoke the blob URL to prevent memory leaks
      // Use setTimeout to ensure download starts before revoking
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    }
  },
};

