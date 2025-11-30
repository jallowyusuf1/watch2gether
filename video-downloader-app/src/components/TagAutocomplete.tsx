import { useState, useEffect, useRef, useMemo } from 'react';
import { X, Tag as TagIcon, TrendingUp } from 'lucide-react';
import { storageService } from '../services/storageService';
import type { Video } from '../types';
import type { Tag } from '../types/tag.types';

interface TagAutocompleteProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

const MAX_TAGS = 10;

export const TagAutocomplete = ({
  value,
  onChange,
  maxTags = MAX_TAGS,
  placeholder = 'Add tags...',
  className = '',
}: TagAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load all tags from videos
  useEffect(() => {
    const loadTags = async () => {
      try {
        const videos = await storageService.getAllVideos();
        const tagMap = new Map<string, number>();

        videos.forEach((video) => {
          video.tags?.forEach((tag) => {
            const count = tagMap.get(tag) || 0;
            tagMap.set(tag, count + 1);
          });
        });

        const tags: Tag[] = Array.from(tagMap.entries())
          .map(([name, usageCount]) => ({
            id: name,
            name,
            usageCount,
            createdAt: Date.now(),
          }))
          .sort((a, b) => b.usageCount - a.usageCount);

        setAllTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };

    loadTags();
  }, []);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) {
      // Show popular tags when input is empty
      return allTags.slice(0, 10);
    }

    const lowerInput = inputValue.toLowerCase();
    return allTags
      .filter(
        (tag) =>
          tag.name.toLowerCase().includes(lowerInput) &&
          !value.includes(tag.name)
      )
      .slice(0, 10);
  }, [inputValue, allTags, value]);

  useEffect(() => {
    setSuggestions(filteredSuggestions);
  }, [filteredSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setShowSuggestions(true);
  };

  const handleAddTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (
      trimmed &&
      !value.includes(trimmed) &&
      value.length < maxTags
    ) {
      onChange([...value, trimmed]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      handleRemoveTag(value[value.length - 1]);
    }
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 p-3 min-h-[48px] bg-purple-900/30 backdrop-blur-xl border-2 border-purple-500/20 rounded-lg focus-within:border-purple-500 transition-colors">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/30 text-white text-sm rounded-full border border-purple-500/30"
          >
            <TagIcon className="w-3 h-3" />
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:bg-purple-500/30 rounded-full p-0.5 transition-colors"
              aria-label={`Remove ${tag} tag`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-white placeholder-gray-400 text-sm"
          />
        )}
        {value.length >= maxTags && (
          <span className="text-xs text-gray-400 self-center">
            Max {maxTags} tags
          </span>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-purple-900/95 backdrop-blur-xl border border-purple-500/30 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          <div className="p-2">
            {inputValue.trim() ? (
              <div className="text-xs text-gray-400 px-3 py-2">
                Suggestions
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-400 px-3 py-2">
                <TrendingUp className="w-3 h-3" />
                Popular Tags
              </div>
            )}
            {filteredSuggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleAddTag(tag.name)}
                className="w-full text-left px-3 py-2 hover:bg-purple-800/50 rounded-lg transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-white text-sm">{tag.name}</span>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-gray-300">
                  {tag.usageCount} {tag.usageCount === 1 ? 'video' : 'videos'}
                </span>
              </button>
            ))}
            {inputValue.trim() && !filteredSuggestions.some((t) => t.name.toLowerCase() === inputValue.toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleAddTag(inputValue)}
                className="w-full text-left px-3 py-2 hover:bg-purple-800/50 rounded-lg transition-colors flex items-center gap-2 mt-1 border-t border-purple-500/20 pt-2"
              >
                <TagIcon className="w-4 h-4 text-purple-400" />
                <span className="text-white text-sm">
                  Create "{inputValue.trim()}"
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

