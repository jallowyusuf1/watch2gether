export interface Tag {
  id: string;
  name: string;
  color?: string;
  groupId?: string;
  usageCount: number;
  createdAt: number;
}

export interface TagGroup {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: number;
}

export type TagFilterLogic = 'AND' | 'OR';

