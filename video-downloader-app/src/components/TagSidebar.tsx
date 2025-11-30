import { useState, useEffect } from 'react';
import { Tag as TagIcon, X, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { tagService } from '../services/tagService';
import type { Tag, TagFilterLogic } from '../types/tag.types';

interface TagSidebarProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  filterLogic: TagFilterLogic;
  onFilterLogicChange: (logic: TagFilterLogic) => void;
  className?: string;
}

export const TagSidebar = ({
  selectedTags,
  onTagsChange,
  filterLogic,
  onFilterLogicChange,
  className = '',
}: TagSidebarProps) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const allTags = await tagService.getAllTags();
      setTags(allTags);
    } catch (error) {
      console.error('Error loading tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTagClick = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onTagsChange(selectedTags.filter((t) => t !== tagName));
    } else {
      onTagsChange([...selectedTags, tagName]);
    }
  };

  const clearFilters = () => {
    onTagsChange([]);
    setSearchQuery('');
  };

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className={`fixed left-4 top-1/2 transform -translate-y-1/2 z-40 p-3 bg-purple-900/90 backdrop-blur-xl border border-purple-500/30 rounded-r-lg hover:bg-purple-800/90 transition-colors ${className}`}
        aria-label="Show tag filters"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
    );
  }

  return (
    <div
      className={`bubble-card p-4 md:p-6 ${className} transition-all duration-300`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TagIcon className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Tags</h3>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="lg:hidden p-1.5 hover:bg-purple-800/50 rounded-lg transition-colors"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Filter Logic Toggle */}
      {selectedTags.length > 1 && (
        <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/20">
          <div className="text-xs text-gray-400 mb-2">Filter Logic</div>
          <div className="flex gap-2">
            <button
              onClick={() => onFilterLogicChange('AND')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterLogic === 'AND'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/50'
              }`}
            >
              AND
            </button>
            <button
              onClick={() => onFilterLogicChange('OR')}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterLogic === 'OR'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-900/30 text-gray-300 hover:bg-purple-800/50'
              }`}
            >
              OR
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {filterLogic === 'AND'
              ? 'Show videos with ALL selected tags'
              : 'Show videos with ANY selected tag'}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tags..."
          className="w-full pl-8 pr-8 py-2 bg-purple-900/30 border border-purple-500/20 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
        />
        <TagIcon className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">
              Selected ({selectedTags.length})
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-2.5 py-1 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors flex items-center gap-1"
              >
                {tag}
                <X className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {searchQuery ? 'No tags found' : 'No tags yet'}
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {filteredTags.map((tag) => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <button
                key={tag.id}
                onClick={() => handleTagClick(tag.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between group ${
                  isSelected
                    ? 'bg-purple-600/50 border border-purple-500/50'
                    : 'hover:bg-purple-900/30 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      isSelected ? 'bg-purple-400' : 'bg-purple-500/30'
                    }`}
                  />
                  <span
                    className={`text-sm truncate ${
                      isSelected ? 'text-white font-medium' : 'text-gray-300'
                    }`}
                  >
                    {tag.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500 group-hover:text-gray-400 flex-shrink-0 ml-2">
                  {tag.usageCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <div className="text-xs text-gray-400 text-center">
          {tags.length} {tags.length === 1 ? 'tag' : 'tags'} total
        </div>
      </div>
    </div>
  );
};

