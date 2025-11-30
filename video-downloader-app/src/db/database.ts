import Dexie from 'dexie';
import type { Video } from '../types';

/**
 * VideoDatabase class extending Dexie for IndexedDB management
 */
export class VideoDatabase extends Dexie {
  // Declare table with Video type
  videos!: Dexie.Table<Video>;

  constructor() {
    super('VideoDownloaderDB');
    
    // Define database schema
    this.version(1).stores({
      videos: 'id, title, platform, downloadDate, tags'
    });

    console.log('VideoDatabase: Database initialized with schema version 1');
  }

  /**
   * Add a new video to the database
   * @param video - Video object to add
   * @returns Promise that resolves when video is added
   */
  async addVideo(video: Video): Promise<string> {
    try {
      const id = await this.videos.add(video);
      console.log('VideoDatabase: Video added successfully with id:', id);
      return id;
    } catch (error) {
      console.error('VideoDatabase: Error adding video:', error);
      throw error;
    }
  }

  /**
   * Get all videos from the database
   * @returns Promise that resolves to an array of all videos
   */
  async getAllVideos(): Promise<Video[]> {
    try {
      const videos = await this.videos.toArray();
      console.log('VideoDatabase: Retrieved', videos.length, 'videos');
      return videos;
    } catch (error) {
      console.error('VideoDatabase: Error getting all videos:', error);
      throw error;
    }
  }

  /**
   * Get a single video by its ID
   * @param id - Video ID
   * @returns Promise that resolves to the video or undefined if not found
   */
  async getVideoById(id: string): Promise<Video | undefined> {
    try {
      const video = await this.videos.get(id);
      if (video) {
        console.log('VideoDatabase: Video found with id:', id);
      } else {
        console.log('VideoDatabase: Video not found with id:', id);
      }
      return video;
    } catch (error) {
      console.error('VideoDatabase: Error getting video by id:', error);
      throw error;
    }
  }

  /**
   * Delete a video from the database by ID
   * @param id - Video ID to delete
   * @returns Promise that resolves when video is deleted
   */
  async deleteVideo(id: string): Promise<void> {
    try {
      await this.videos.delete(id);
      console.log('VideoDatabase: Video deleted successfully with id:', id);
    } catch (error) {
      console.error('VideoDatabase: Error deleting video:', error);
      throw error;
    }
  }

  /**
   * Update video metadata
   * @param id - Video ID to update
   * @param changes - Partial Video object with fields to update
   * @returns Promise that resolves to the number of updated records
   */
  async updateVideo(id: string, changes: Partial<Video>): Promise<number> {
    try {
      const updatedCount = await this.videos.update(id, changes);
      if (updatedCount > 0) {
        console.log('VideoDatabase: Video updated successfully with id:', id);
      } else {
        console.log('VideoDatabase: No video found to update with id:', id);
      }
      return updatedCount;
    } catch (error) {
      console.error('VideoDatabase: Error updating video:', error);
      throw error;
    }
  }
}

// Create and export a single instance of VideoDatabase
export const db = new VideoDatabase();

// Test database connection on initialization
db.open()
  .then(() => {
    console.log('VideoDatabase: Database opened successfully');
    console.log('VideoDatabase: Database name:', db.name);
    console.log('VideoDatabase: Database version:', db.verno);
  })
  .catch((error) => {
    console.error('VideoDatabase: Error opening database:', error);
  });

