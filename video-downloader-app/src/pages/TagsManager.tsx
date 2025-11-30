import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Tag as TagIcon,
  Edit2,
  Trash2,
  Merge,
  Download,
  Upload,
  Search,
  X,
  TrendingUp,
  AlertTriangle,
  Check,
  XCircle,
} from 'lucide-react';
import { tagService } from '../services/tagService';
import { tagGroupService } from '../services/tagGroupService';
import { TagGroupManager } from '../components/TagGroupManager';
import { useNotifications } from '../contexts/NotificationContext';
import ConfirmModal from '../components/ConfirmModal';
import type { Tag } from '../types/tag.types';

const TagsManager = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotifications();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [mergingTags, setMergingTags] = useState<{ source: string; target: string } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [tagGroupMap, setTagGroupMap] = useState<Record<string, string>>({});

  // Load tags
  useEffect(() => {
    loadTags();
    loadStatistics();
  }, [selectedGroupId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const allTags = await tagService.getAllTags();
      const groupMap = tagGroupService.getTagGroupMap();
      setTagGroupMap(groupMap);
      
      // Filter by selected group if any
      let filteredTags = allTags;
      if (selectedGroupId) {
        filteredTags = allTags.filter((tag) => groupMap[tag.name] === selectedGroupId);
      }
      
      setTags(filteredTags);
    } catch (error) {
      console.error('Error loading tags:', error);
      showError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await tagService.getTagStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartEdit = (tag: Tag) => {
    setEditingTag(tag.id);
    setNewTagName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setNewTagName('');
  };

  const handleSaveEdit = async (oldName: string) => {
    if (!newTagName.trim()) {
      showError('Tag name cannot be empty');
      return;
    }

    if (newTagName.trim() === oldName) {
      handleCancelEdit();
      return;
    }

    try {
      await tagService.renameTag(oldName, newTagName.trim());
      showSuccess(`Tag renamed from "${oldName}" to "${newTagName.trim()}"`);
      await loadTags();
      handleCancelEdit();
    } catch (error) {
      console.error('Error renaming tag:', error);
      showError('Failed to rename tag');
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    try {
      await tagService.deleteTag(tagName);
      showSuccess(`Tag "${tagName}" deleted from all videos`);
      await loadTags();
      await loadStatistics();
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Error deleting tag:', error);
      showError('Failed to delete tag');
    }
  };

  const handleStartMerge = (sourceTag: string) => {
    setMergingTags({ source: sourceTag, target: '' });
    setShowMergeModal(true);
  };

  const handleMergeTags = async () => {
    if (!mergingTags || !mergingTags.target.trim()) {
      showError('Please select a target tag to merge into');
      return;
    }

    if (mergingTags.source === mergingTags.target) {
      showError('Cannot merge a tag into itself');
      return;
    }

    try {
      await tagService.mergeTags(mergingTags.source, mergingTags.target.trim());
      showSuccess(
        `Tag "${mergingTags.source}" merged into "${mergingTags.target.trim()}"`
      );
      await loadTags();
      await loadStatistics();
      setShowMergeModal(false);
      setMergingTags(null);
    } catch (error) {
      console.error('Error merging tags:', error);
      showError('Failed to merge tags');
    }
  };

  const handleExportTags = async () => {
    try {
      const jsonData = await tagService.exportTags();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tags-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showSuccess('Tags exported successfully');
    } catch (error) {
      console.error('Error exporting tags:', error);
      showError('Failed to export tags');
    }
  };

  const handleImportTags = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await tagService.importTags(text);
      showSuccess('Tags imported successfully');
      await loadTags();
      await loadStatistics();
    } catch (error) {
      console.error('Error importing tags:', error);
      showError('Failed to import tags. Please check the file format.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-black to-black"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-8 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              navigate(-1);
            }}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
            data-scroll-to-top
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Tag Management
              </h1>
              <p className="text-gray-300">
                Manage all tags across your video library
              </p>
            </div>
            <div className="flex gap-3">
              <label className="btn-glass cursor-pointer">
                <Upload className="w-4 h-4" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportTags}
                  className="hidden"
                />
              </label>
              <button
                onClick={handleExportTags}
                className="btn-glass flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bubble-card p-4">
                <div className="text-2xl font-bold text-white mb-1">
                  {statistics.totalTags}
                </div>
                <div className="text-sm text-gray-300">Total Tags</div>
              </div>
              <div className="bubble-card p-4">
                <div className="text-2xl font-bold text-white mb-1">
                  {statistics.totalVideos}
                </div>
                <div className="text-sm text-gray-300">Total Videos</div>
              </div>
              <div className="bubble-card p-4">
                <div className="text-2xl font-bold text-white mb-1">
                  {statistics.averageTagsPerVideo.toFixed(1)}
                </div>
                <div className="text-sm text-gray-300">Avg Tags/Video</div>
              </div>
              <div className="bubble-card p-4">
                <div className="text-2xl font-bold text-white mb-1">
                  {statistics.mostUsedTags[0]?.usageCount || 0}
                </div>
                <div className="text-sm text-gray-300">Most Used</div>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-3 bg-purple-900/30 backdrop-blur-xl border border-purple-500/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tag Groups Sidebar */}
          <div className="lg:col-span-1">
            <TagGroupManager
              selectedGroupId={selectedGroupId}
              onGroupSelect={setSelectedGroupId}
            />
          </div>

          {/* Tags List */}
          <div className="lg:col-span-3 bubble-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {selectedGroupId ? 'Tags in Group' : 'All Tags'} ({filteredTags.length})
              </h2>
            </div>

            {filteredTags.length === 0 ? (
              <div className="text-center py-12">
                <TagIcon className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <p className="text-gray-400">
                  {searchQuery ? 'No tags found matching your search' : 'No tags yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-4 bg-purple-900/20 rounded-lg border border-purple-500/10 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <TagIcon className="w-5 h-5 text-purple-400" />
                      {editingTag === tag.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit(tag.name);
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1 px-3 py-1.5 bg-purple-900/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(tag.name)}
                            className="p-1.5 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                          >
                            <Check className="w-4 h-4 text-white" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="font-semibold text-white">{tag.name}</div>
                            <div className="text-sm text-gray-400">
                              Used in {tag.usageCount} {tag.usageCount === 1 ? 'video' : 'videos'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(tag)}
                              className="p-2 hover:bg-purple-800/50 rounded-lg transition-colors"
                              title="Rename tag"
                            >
                              <Edit2 className="w-4 h-4 text-purple-400" />
                            </button>
                            <button
                              onClick={() => handleStartMerge(tag.name)}
                              className="p-2 hover:bg-purple-800/50 rounded-lg transition-colors"
                              title="Merge tag"
                            >
                              <Merge className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(tag.name)}
                              className="p-2 hover:bg-purple-800/50 rounded-lg transition-colors"
                              title="Delete tag"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
        onConfirm={() => {
          if (showDeleteModal) {
            handleDeleteTag(showDeleteModal);
          }
        }}
        title="Delete Tag"
        message={
          showDeleteModal
            ? `Are you sure you want to delete "${showDeleteModal}"? This will remove the tag from all videos. This action cannot be undone.`
            : ''
        }
        confirmText="Delete"
        confirmColor="red"
      />

      {/* Merge Modal */}
      {showMergeModal && mergingTags && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMergeModal(false)} />
          <div className="relative bubble-card p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Merge Tags</h3>
            <p className="text-gray-300 mb-4">
              Merge "{mergingTags.source}" into another tag. All videos with "{mergingTags.source}" will be updated.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Tag (merge into)
                </label>
                <input
                  type="text"
                  value={mergingTags.target}
                  onChange={(e) =>
                    setMergingTags({ ...mergingTags, target: e.target.value })
                  }
                  placeholder="Enter tag name..."
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  list="tag-suggestions"
                />
                <datalist id="tag-suggestions">
                  {tags
                    .filter((t) => t.name !== mergingTags.source)
                    .map((tag) => (
                      <option key={tag.id} value={tag.name} />
                    ))}
                </datalist>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleMergeTags}
                  className="flex-1 btn-primary-glass"
                >
                  Merge
                </button>
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergingTags(null);
                  }}
                  className="flex-1 btn-glass"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsManager;

