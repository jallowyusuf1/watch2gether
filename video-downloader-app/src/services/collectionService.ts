import type { Collection, CollectionStats, CollectionColorTheme, SmartCollectionRule, Video } from '../types';
import { storageService } from './storageService';

const DB_NAME = 'VideoDownloaderDB';
const COLLECTION_STORE = 'collections';
const DB_VERSION = 3; // Increment version for new object store

class CollectionService {
  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database with collections store
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create collections store if it doesn't exist
        if (!db.objectStoreNames.contains(COLLECTION_STORE)) {
          const collectionStore = db.createObjectStore(COLLECTION_STORE, { keyPath: 'id' });
          collectionStore.createIndex('createdDate', 'createdDate', { unique: false });
          collectionStore.createIndex('modifiedDate', 'modifiedDate', { unique: false });
          collectionStore.createIndex('isSmart', 'isSmart', { unique: false });
          collectionStore.createIndex('parentId', 'parentId', { unique: false });
        }
      };
    });
  }

  /**
   * Ensure database is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  /**
   * Create a new collection
   */
  async createCollection(
    name: string,
    description?: string,
    colorTheme: CollectionColorTheme = 'purple',
    isSmart: boolean = false,
    smartRules?: SmartCollectionRule[],
    parentId?: string
  ): Promise<Collection> {
    const db = await this.ensureDB();

    const collection: Collection = {
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      videoIds: [],
      createdDate: new Date(),
      modifiedDate: new Date(),
      colorTheme,
      isSmart,
      smartRules,
      parentId,
      videoOrder: [],
    };

    // If it's a smart collection, populate it with matching videos
    if (isSmart && smartRules && smartRules.length > 0) {
      const matchingVideos = await this.getVideosMatchingRules(smartRules);
      collection.videoIds = matchingVideos.map(v => v.id);
      collection.videoOrder = collection.videoIds;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COLLECTION_STORE], 'readwrite');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.add(collection);

      request.onsuccess = () => resolve(collection);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all collections
   */
  async getAllCollections(): Promise<Collection[]> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COLLECTION_STORE], 'readonly');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const collections = request.result as Collection[];
        // Convert date strings back to Date objects
        collections.forEach(collection => {
          collection.createdDate = new Date(collection.createdDate);
          collection.modifiedDate = new Date(collection.modifiedDate);
        });
        resolve(collections);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get collection by ID
   */
  async getCollection(id: string): Promise<Collection | null> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COLLECTION_STORE], 'readonly');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        const collection = request.result as Collection | undefined;
        if (collection) {
          collection.createdDate = new Date(collection.createdDate);
          collection.modifiedDate = new Date(collection.modifiedDate);
          resolve(collection);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Update collection
   */
  async updateCollection(collection: Collection): Promise<Collection> {
    const db = await this.ensureDB();
    collection.modifiedDate = new Date();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COLLECTION_STORE], 'readwrite');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.put(collection);

      request.onsuccess = () => resolve(collection);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete collection
   */
  async deleteCollection(id: string): Promise<void> {
    const db = await this.ensureDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([COLLECTION_STORE], 'readwrite');
      const store = transaction.objectStore(COLLECTION_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add video to collection
   */
  async addVideoToCollection(collectionId: string, videoId: string): Promise<Collection> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    if (!collection.videoIds.includes(videoId)) {
      collection.videoIds.push(videoId);
      if (!collection.videoOrder) {
        collection.videoOrder = [];
      }
      collection.videoOrder.push(videoId);
    }

    return this.updateCollection(collection);
  }

  /**
   * Remove video from collection
   */
  async removeVideoFromCollection(collectionId: string, videoId: string): Promise<Collection> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    collection.videoIds = collection.videoIds.filter(id => id !== videoId);
    if (collection.videoOrder) {
      collection.videoOrder = collection.videoOrder.filter(id => id !== videoId);
    }

    return this.updateCollection(collection);
  }

  /**
   * Reorder videos in collection
   */
  async reorderVideos(collectionId: string, videoOrder: string[]): Promise<Collection> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    collection.videoOrder = videoOrder;
    return this.updateCollection(collection);
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionId: string): Promise<CollectionStats> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const videos = await Promise.all(
      collection.videoIds.map(id => storageService.getVideo(id))
    );

    const validVideos = videos.filter((v): v is Video => v !== null);

    const stats: CollectionStats = {
      totalVideos: validVideos.length,
      totalSize: validVideos.reduce((sum, v) => sum + (v.fileSize || 0), 0),
      totalDuration: validVideos.reduce((sum, v) => sum + (v.duration || 0), 0),
      platforms: [...new Set(validVideos.map(v => v.platform))],
    };

    return stats;
  }

  /**
   * Get videos in collection
   */
  async getCollectionVideos(collectionId: string): Promise<Video[]> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      return [];
    }

    const videos = await Promise.all(
      collection.videoIds.map(id => storageService.getVideo(id))
    );

    const validVideos = videos.filter((v): v is Video => v !== null);

    // Sort by videoOrder if it exists
    if (collection.videoOrder && collection.videoOrder.length > 0) {
      const orderMap = new Map(collection.videoOrder.map((id, index) => [id, index]));
      validVideos.sort((a, b) => {
        const orderA = orderMap.get(a.id) ?? Infinity;
        const orderB = orderMap.get(b.id) ?? Infinity;
        return orderA - orderB;
      });
    }

    return validVideos;
  }

  /**
   * Get collections containing a specific video
   */
  async getCollectionsForVideo(videoId: string): Promise<Collection[]> {
    const allCollections = await this.getAllCollections();
    return allCollections.filter(c => c.videoIds.includes(videoId));
  }

  /**
   * Get videos matching smart collection rules
   */
  private async getVideosMatchingRules(rules: SmartCollectionRule[]): Promise<Video[]> {
    const allVideos = await storageService.getAllVideos();

    return allVideos.filter(video => {
      return rules.every(rule => {
        let value: string;

        switch (rule.type) {
          case 'platform':
            value = video.platform;
            break;
          case 'tag':
            return video.tags.some(tag => this.matchValue(tag, rule.value, rule.operator));
          case 'author':
            value = video.author;
            break;
          case 'quality':
            value = video.quality;
            break;
          default:
            return false;
        }

        return this.matchValue(value, rule.value, rule.operator);
      });
    });
  }

  /**
   * Match value against rule
   */
  private matchValue(value: string, ruleValue: string, operator: SmartCollectionRule['operator']): boolean {
    const valueLower = value.toLowerCase();
    const ruleValueLower = ruleValue.toLowerCase();

    switch (operator) {
      case 'equals':
        return valueLower === ruleValueLower;
      case 'contains':
        return valueLower.includes(ruleValueLower);
      case 'startsWith':
        return valueLower.startsWith(ruleValueLower);
      case 'endsWith':
        return valueLower.endsWith(ruleValueLower);
      default:
        return false;
    }
  }

  /**
   * Update smart collection (refresh videos based on rules)
   */
  async updateSmartCollection(collectionId: string): Promise<Collection> {
    const collection = await this.getCollection(collectionId);
    if (!collection || !collection.isSmart || !collection.smartRules) {
      throw new Error('Not a smart collection');
    }

    const matchingVideos = await this.getVideosMatchingRules(collection.smartRules);
    collection.videoIds = matchingVideos.map(v => v.id);
    collection.videoOrder = collection.videoIds;

    return this.updateCollection(collection);
  }

  /**
   * Get nested collections (children of a parent collection)
   */
  async getNestedCollections(parentId: string): Promise<Collection[]> {
    const allCollections = await this.getAllCollections();
    return allCollections.filter(c => c.parentId === parentId);
  }

  /**
   * Export collection as JSON
   */
  async exportCollection(collectionId: string): Promise<string> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const videos = await this.getCollectionVideos(collectionId);

    const exportData = {
      collection,
      videos: videos.map(v => ({
        id: v.id,
        title: v.title,
        author: v.author,
        platform: v.platform,
        url: v.url,
        thumbnail: v.thumbnail,
        duration: v.duration,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate shareable link for collection
   */
  async generateShareableLink(collectionId: string): Promise<string> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Generate a base64 encoded shareable link
    const shareData = {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      videoIds: collection.videoIds,
    };

    const encoded = btoa(JSON.stringify(shareData));
    return `${window.location.origin}/collection/shared/${encoded}`;
  }

  /**
   * Update collection thumbnail (use first video's thumbnail)
   */
  async updateCollectionThumbnail(collectionId: string): Promise<Collection> {
    const collection = await this.getCollection(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }

    if (collection.videoIds.length > 0) {
      const firstVideo = await storageService.getVideo(collection.videoIds[0]);
      if (firstVideo) {
        collection.thumbnail = firstVideo.thumbnail;
      }
    }

    return this.updateCollection(collection);
  }
}

export const collectionService = new CollectionService();
