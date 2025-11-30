import { storageService } from './storageService';
import { db } from '../db/database';
import type { Video } from '../types';
import type { Tag, TagGroup, TagFilterLogic } from '../types/tag.types';

/**
 * Tag Service for managing tags across all videos
 */
export const tagService = {
  /**
   * Get all unique tags with usage counts
   */
  async getAllTags(): Promise<Tag[]> {
    try {
      const videos = await storageService.getAllVideos();
      const tagMap = new Map<string, number>();

      videos.forEach((video) => {
        video.tags?.forEach((tag) => {
          const count = tagMap.get(tag) || 0;
          tagMap.set(tag, count + 1);
        });
      });

      return Array.from(tagMap.entries())
        .map(([name, usageCount]) => ({
          id: name,
          name,
          usageCount,
          createdAt: Date.now(),
        }))
        .sort((a, b) => b.usageCount - a.usageCount);
    } catch (error) {
      console.error('Error getting all tags:', error);
      throw error;
    }
  },

  /**
   * Rename a tag globally across all videos
   */
  async renameTag(oldName: string, newName: string): Promise<void> {
    try {
      const videos = await storageService.getAllVideos();
      const updates = videos
        .filter((video) => video.tags?.includes(oldName))
        .map((video) => {
          const updatedTags = video.tags?.map((tag) =>
            tag === oldName ? newName : tag
          );
          return db.updateVideo(video.id, { tags: updatedTags });
        });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error renaming tag:', error);
      throw error;
    }
  },

  /**
   * Merge two tags into one
   */
  async mergeTags(sourceTag: string, targetTag: string): Promise<void> {
    try {
      const videos = await storageService.getAllVideos();
      const updates = videos
        .filter((video) => video.tags?.includes(sourceTag))
        .map((video) => {
          const tags = video.tags || [];
          const hasSource = tags.includes(sourceTag);
          const hasTarget = tags.includes(targetTag);

          if (hasSource && !hasTarget) {
            // Replace source with target
            const updatedTags = tags.map((tag) =>
              tag === sourceTag ? targetTag : tag
            );
            return db.updateVideo(video.id, { tags: updatedTags });
          } else if (hasSource && hasTarget) {
            // Remove source, keep target
            const updatedTags = tags.filter((tag) => tag !== sourceTag);
            return db.updateVideo(video.id, { tags: updatedTags });
          }
          return Promise.resolve(0);
        });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error merging tags:', error);
      throw error;
    }
  },

  /**
   * Delete a tag from all videos
   */
  async deleteTag(tagName: string): Promise<void> {
    try {
      const videos = await storageService.getAllVideos();
      const updates = videos
        .filter((video) => video.tags?.includes(tagName))
        .map((video) => {
          const updatedTags = video.tags?.filter((tag) => tag !== tagName);
          return db.updateVideo(video.id, { tags: updatedTags });
        });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  },

  /**
   * Get videos filtered by tags
   */
  async getVideosByTags(
    tags: string[],
    logic: TagFilterLogic = 'OR'
  ): Promise<Video[]> {
    try {
      const allVideos = await storageService.getAllVideos();

      if (tags.length === 0) {
        return allVideos;
      }

      if (logic === 'AND') {
        // All tags must be present
        return allVideos.filter((video) => {
          const videoTags = video.tags || [];
          return tags.every((tag) => videoTags.includes(tag));
        });
      } else {
        // At least one tag must be present
        return allVideos.filter((video) => {
          const videoTags = video.tags || [];
          return tags.some((tag) => videoTags.includes(tag));
        });
      }
    } catch (error) {
      console.error('Error filtering videos by tags:', error);
      throw error;
    }
  },

  /**
   * Get tag statistics
   */
  async getTagStatistics(): Promise<{
    totalTags: number;
    totalVideos: number;
    averageTagsPerVideo: number;
    mostUsedTags: Tag[];
    leastUsedTags: Tag[];
  }> {
    try {
      const videos = await storageService.getAllVideos();
      const tags = await this.getAllTags();

      const videosWithTags = videos.filter((v) => v.tags && v.tags.length > 0);
      const totalTagCount = videos.reduce(
        (sum, v) => sum + (v.tags?.length || 0),
        0
      );

      return {
        totalTags: tags.length,
        totalVideos: videos.length,
        averageTagsPerVideo:
          videosWithTags.length > 0
            ? totalTagCount / videosWithTags.length
            : 0,
        mostUsedTags: tags.slice(0, 10),
        leastUsedTags: tags.slice(-10).reverse(),
      };
    } catch (error) {
      console.error('Error getting tag statistics:', error);
      throw error;
    }
  },

  /**
   * Export tags to JSON
   */
  async exportTags(): Promise<string> {
    try {
      const tags = await this.getAllTags();
      const videos = await storageService.getAllVideos();

      const exportData = {
        tags: tags.map((tag) => ({
          name: tag.name,
          usageCount: tag.usageCount,
        })),
        videos: videos.map((video) => ({
          id: video.id,
          title: video.title,
          tags: video.tags || [],
        })),
        exportedAt: new Date().toISOString(),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting tags:', error);
      throw error;
    }
  },

  /**
   * Import tags from JSON
   */
  async importTags(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      // This would need to be implemented based on your import requirements
      // For now, we'll just validate the structure
      if (!data.tags || !Array.isArray(data.tags)) {
        throw new Error('Invalid import format');
      }
      // Implementation would update videos with imported tags
    } catch (error) {
      console.error('Error importing tags:', error);
      throw error;
    }
  },

  /**
   * Suggest tags based on video content
   */
  async suggestTags(video: Video): Promise<string[]> {
    const suggestions: string[] = [];

    // Platform-based suggestions
    if (video.platform === 'youtube') {
      suggestions.push('YouTube', 'Video');
    } else if (video.platform === 'tiktok') {
      suggestions.push('TikTok', 'Short Video');
    }

    // Title-based suggestions (extract keywords)
    const titleWords = video.title
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 3);
    suggestions.push(...titleWords);

    // Description-based suggestions (if available)
    if (video.description) {
      const descWords = video.description
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 4)
        .slice(0, 2);
      suggestions.push(...descWords);
    }

    // Get popular tags that might match
    const allTags = await this.getAllTags();
    const popularTags = allTags
      .slice(0, 5)
      .map((tag) => tag.name)
      .filter((tag) => !suggestions.includes(tag));

    suggestions.push(...popularTags);

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 5);
  },
};

