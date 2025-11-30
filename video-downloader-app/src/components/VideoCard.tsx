import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  MoreVertical,
  Youtube,
  Music,
  Clock,
  Download,
  Eye,
  Trash2,
  Check,
  Edit,
  FileText,
} from 'lucide-react';
import type { Video } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import { storageService } from '../services/storageService';
import { TagPill } from './TagPill';
import { useNotifications } from '../contexts/NotificationContext';

interface VideoCardProps {
  video: Video;
  onClick?: (video: Video) => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (videoId: string, selected: boolean) => void;
  onPlay?: (video: Video) => void;
  onExport?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onEdit?: (video: Video) => void;
  onTranscript?: (video: Video) => void;
  // Legacy props for backward compatibility
  onViewDetails?: (video: Video) => void;
}

/**
 * Reusable VideoCard component for displaying video information
 */
const VideoCard = ({
  video,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
  onPlay,
  onExport,
  onDelete,
  onEdit,
  onTranscript,
}: VideoCardProps) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if video is vertical (TikTok, YouTube Shorts)
  const isVertical = video.platform === 'tiktok' || 
                     (video.platform === 'youtube' && video.url.includes('/shorts/'));

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins < 60) return `${mins}:${secs.toString().padStart(2, '0')}`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Get platform icon
  const getPlatformIcon = () => {
    switch (video.platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'tiktok':
        return <Music className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get platform badge color
  const getPlatformBadgeColor = (): string => {
    switch (video.platform) {
      case 'youtube':
        return 'bg-red-600 dark:bg-red-700';
      case 'tiktok':
        return 'bg-black dark:bg-gray-800';
      default:
        return 'bg-gray-600 dark:bg-gray-700';
    }
  };

  // Handle card click
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on menu or checkbox
    if (
      menuRef.current?.contains(e.target as Node) ||
      (e.target as HTMLElement).closest('input[type="checkbox"]')
    ) {
      return;
    }

    if (onClick) {
      onClick(video);
    } else {
      navigate(`/video/${video.id}`);
    }
  };

  // Handle checkbox change
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(video.id, e.target.checked);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  // Handle menu actions
  const handleMenuAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);

    switch (action) {
      case 'play':
        if (onPlay) {
          onPlay(video);
        } else {
          navigate(`/video/${video.id}`);
        }
        break;
      case 'view':
        if (onClick) {
          onClick(video);
        } else if (onEdit) {
          // Legacy: onEdit was used for viewing details
          onEdit(video);
        } else {
          navigate(`/video/${video.id}`);
        }
        break;
      case 'export':
        if (onExport) {
          onExport(video);
        } else {
          handleExport();
        }
        break;
      case 'delete':
        if (onDelete) {
          onDelete(video);
        } else {
          handleDelete();
        }
        break;
    }
  };

  // Default export handler
  const handleExport = async () => {
    try {
      await storageService.exportVideo(video.id);
      showSuccess(`Video "${video.title}" exported successfully.`);
    } catch (error) {
      console.error('Error exporting video:', error);
      showError('Failed to export video. Please try again.');
    }
  };

  // Default delete handler
  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
      if (onDelete) {
        onDelete(video);
      } else {
        storageService.deleteVideo(video.id)
          .then(() => {
            showSuccess(`Video "${video.title}" deleted successfully.`);
          })
          .catch((error) => {
            console.error('Error deleting video:', error);
            showError('Failed to delete video. Please try again.');
          });
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(e as any);
    }
    if (e.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Video: ${video.title} by ${video.author}`}
      className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden 
                 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer 
                 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      {/* Thumbnail Container */}
      <div
        className={`relative ${
          isVertical ? 'aspect-[9/16]' : 'aspect-video'
        } bg-gray-200 dark:bg-gray-700 overflow-hidden`}
      >
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225"%3E%3Crect fill="%23ddd" width="400" height="225"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
            <Eye className="w-12 h-12" />
          </div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
          <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-90 group-hover:scale-100">
            <Play className="w-8 h-8 text-gray-900 dark:text-white fill-current" />
          </div>
        </div>

        {/* Checkbox for Selection (top-left) */}
        {selectable && (
          <div
            className="absolute top-2 left-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <label className="cursor-pointer">
              <input
                type="checkbox"
                checked={selected}
                onChange={handleCheckboxChange}
                className="sr-only"
                aria-label={`Select ${video.title}`}
              />
              <div
                className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  selected
                    ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                    : 'bg-white/90 dark:bg-gray-800/90 border-white dark:border-gray-700'
                } shadow-lg`}
              >
                {selected && <Check className="w-4 h-4 text-white" />}
              </div>
            </label>
          </div>
        )}

        {/* Platform Badge (top-left, or top-right if checkbox is present) */}
        <div
          className={`absolute ${
            selectable ? 'top-2 right-2' : 'top-2 left-2'
          } z-10`}
        >
          <div
            className={`${getPlatformBadgeColor()} px-2 py-1 rounded-md text-white text-xs font-semibold flex items-center gap-1 shadow-lg backdrop-blur-sm`}
          >
            {getPlatformIcon()}
            <span className="hidden sm:inline">
              {video.platform.charAt(0).toUpperCase() + video.platform.slice(1)}
            </span>
          </div>
        </div>

        {/* Duration Badge (bottom-right) */}
        {video.duration > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/80 dark:bg-black/90 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-lg backdrop-blur-sm">
            <Clock className="w-3 h-3" />
            {formatDuration(video.duration)}
          </div>
        )}

        {/* Three-Dot Menu (top-right, or adjusted if checkbox is present) */}
        <div
          className={`absolute ${
            selectable ? 'top-2 right-12' : 'top-2 right-2'
          } z-10`}
          ref={menuRef}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 bg-black/70 hover:bg-black/90 dark:bg-black/80 dark:hover:bg-black text-white rounded-full 
                     transition-all duration-200 backdrop-blur-sm
                     focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="More options"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-2xl 
                        border border-gray-200 dark:border-gray-700 py-1 z-50
                        animate-fadeIn"
              role="menu"
              aria-orientation="vertical"
            >
              <button
                onClick={(e) => handleMenuAction('play', e)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3
                         transition-colors duration-150"
                role="menuitem"
              >
                <Play className="w-4 h-4" />
                <span>Play</span>
              </button>
              <button
                onClick={(e) => handleMenuAction('view', e)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3
                         transition-colors duration-150"
                role="menuitem"
              >
                <Eye className="w-4 h-4" />
                <span>View Details</span>
              </button>
              {(onEdit || onTranscript) && (
                <>
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(video);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3
                               transition-colors duration-150"
                      role="menuitem"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  {onTranscript && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onTranscript(video);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                               hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3
                               transition-colors duration-150"
                      role="menuitem"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Transcript</span>
                    </button>
                  )}
                </>
              )}
              <button
                onClick={(e) => handleMenuAction('export', e)}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3
                         transition-colors duration-150"
                role="menuitem"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={(e) => handleMenuAction('delete', e)}
                className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3
                         transition-colors duration-150"
                role="menuitem"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title - Truncated to 2 lines */}
        <h3
          className="font-bold text-base text-gray-900 dark:text-white mb-2 line-clamp-2 
                     group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
          title={video.title}
        >
          {video.title}
        </h3>

        {/* Author - Smaller, gray text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 truncate" title={video.author}>
          {video.author}
        </p>

        {/* Download Date - Relative format */}
        <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
          {formatRelativeTime(video.downloadDate)}
        </div>

        {/* File Size and Quality Badges */}
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-medium">
            {formatFileSize(video.fileSize)}
          </span>
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md text-xs font-medium">
            {video.quality}
          </span>
        </div>

        {/* Tags */}
        {video.tags && video.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {video.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} size="sm" />
            ))}
            {video.tags.length > 3 && (
              <span className="text-xs text-gray-400 px-2 py-0.5">
                +{video.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
