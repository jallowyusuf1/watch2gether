import { useState, useEffect } from 'react';
import { Tag as TagIcon, Plus, Edit2, Trash2, X, Check, Palette } from 'lucide-react';
import { tagGroupService } from '../services/tagGroupService';
import { tagService } from '../services/tagService';
import { useNotifications } from '../contexts/NotificationContext';
import type { TagGroup } from '../types/tag.types';

interface TagGroupManagerProps {
  onGroupSelect?: (groupId: string | null) => void;
  selectedGroupId?: string | null;
}

const PRESET_COLORS = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
];

export const TagGroupManager = ({ onGroupSelect, selectedGroupId }: TagGroupManagerProps) => {
  const { showSuccess, showError } = useNotifications();
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0]);
  const [newGroupDescription, setNewGroupDescription] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = () => {
    const allGroups = tagGroupService.getAllGroups();
    setGroups(allGroups);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      showError('Group name is required');
      return;
    }

    const newGroup = tagGroupService.createGroup(
      newGroupName.trim(),
      newGroupColor,
      newGroupDescription.trim() || undefined
    );
    showSuccess(`Tag group "${newGroup.name}" created`);
    loadGroups();
    setShowCreateForm(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupColor(PRESET_COLORS[0]);
  };

  const handleDeleteGroup = (id: string) => {
    if (window.confirm('Are you sure you want to delete this group? Tags will not be deleted.')) {
      tagGroupService.deleteGroup(id);
      showSuccess('Tag group deleted');
      loadGroups();
      if (selectedGroupId === id && onGroupSelect) {
        onGroupSelect(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-purple-400" />
          Tag Groups
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-glass flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {showCreateForm && (
        <div className="bubble-card p-4 space-y-3">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Group name (e.g., Educational, Entertainment)"
            className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          />
          <textarea
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 resize-none"
          />
          <div>
            <label className="block text-sm text-gray-300 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewGroupColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    newGroupColor === color
                      ? 'border-white scale-110'
                      : 'border-gray-600 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreateGroup} className="flex-1 btn-primary-glass">
              Create
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setNewGroupName('');
                setNewGroupDescription('');
              }}
              className="flex-1 btn-glass"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button
          onClick={() => onGroupSelect?.(null)}
          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
            selectedGroupId === null
              ? 'bg-purple-600/50 border border-purple-500/50'
              : 'hover:bg-purple-900/30 border border-transparent'
          }`}
        >
          <span className="text-sm text-white">All Tags</span>
        </button>
        {groups.map((group) => (
          <div
            key={group.id}
            className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors border ${
              selectedGroupId === group.id
                ? 'bg-purple-600/50 border-purple-500/50'
                : 'hover:bg-purple-900/30 border-transparent'
            }`}
          >
            <button
              onClick={() => onGroupSelect?.(group.id)}
              className="flex items-center gap-2 flex-1 text-left"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <span className="text-sm text-white">{group.name}</span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setEditingGroup(group.id)}
                className="p-1 hover:bg-purple-800/50 rounded transition-colors"
              >
                <Edit2 className="w-3 h-3 text-gray-400" />
              </button>
              <button
                onClick={() => handleDeleteGroup(group.id)}
                className="p-1 hover:bg-red-600/50 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

