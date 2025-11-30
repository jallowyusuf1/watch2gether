import { storageService } from './storageService';
import { db } from '../db/database';
import type { TagGroup } from '../types/tag.types';

/**
 * Tag Group Service for managing tag categories/groups
 * Uses localStorage for persistence
 */
const STORAGE_KEY = 'tagGroups';

export const tagGroupService = {
  /**
   * Get all tag groups
   */
  getAllGroups(): TagGroup[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading tag groups:', error);
      return [];
    }
  },

  /**
   * Get a specific tag group by ID
   */
  getGroupById(id: string): TagGroup | undefined {
    const groups = this.getAllGroups();
    return groups.find((g) => g.id === id);
  },

  /**
   * Create a new tag group
   */
  createGroup(name: string, color: string, description?: string): TagGroup {
    const groups = this.getAllGroups();
    const newGroup: TagGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      color,
      description,
      createdAt: Date.now(),
    };
    groups.push(newGroup);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    return newGroup;
  },

  /**
   * Update a tag group
   */
  updateGroup(id: string, updates: Partial<TagGroup>): TagGroup | null {
    const groups = this.getAllGroups();
    const index = groups.findIndex((g) => g.id === id);
    if (index === -1) return null;

    groups[index] = { ...groups[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    return groups[index];
  },

  /**
   * Delete a tag group
   */
  deleteGroup(id: string): boolean {
    const groups = this.getAllGroups();
    const filtered = groups.filter((g) => g.id !== id);
    if (filtered.length === groups.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  /**
   * Get group for a tag (if assigned)
   */
  getGroupForTag(tagName: string): TagGroup | undefined {
    const groups = this.getAllGroups();
    // In a real implementation, you'd have a mapping of tags to groups
    // For now, we'll check if the tag name matches a group name pattern
    return groups.find((g) => g.name.toLowerCase() === tagName.toLowerCase());
  },

  /**
   * Assign a tag to a group
   */
  assignTagToGroup(tagName: string, groupId: string): void {
    const tagGroupMap = this.getTagGroupMap();
    tagGroupMap[tagName] = groupId;
    localStorage.setItem('tagGroupMap', JSON.stringify(tagGroupMap));
  },

  /**
   * Get tag to group mapping
   */
  getTagGroupMap(): Record<string, string> {
    try {
      const stored = localStorage.getItem('tagGroupMap');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading tag group map:', error);
      return {};
    }
  },

  /**
   * Remove tag from group
   */
  removeTagFromGroup(tagName: string): void {
    const tagGroupMap = this.getTagGroupMap();
    delete tagGroupMap[tagName];
    localStorage.setItem('tagGroupMap', JSON.stringify(tagGroupMap));
  },
};

