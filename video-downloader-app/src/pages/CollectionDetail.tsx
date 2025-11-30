import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Folder,
  Edit2,
  Trash2,
  Play,
  GripVertical,
  ArrowLeft,
  Download as DownloadIcon,
  Share2,
  Clock,
  HardDrive,
  Video as VideoIcon,
} from 'lucide-react';
import { collectionService } from '../services/collectionService';
import { storageService } from '../services/storageService';
import { useNotifications } from '../contexts/NotificationContext';
import type { Collection, Video, CollectionStats } from '../types';

interface SortableVideoItemProps {
  video: Video;
  onRemove: (videoId: string) => void;
  onPlay: (videoId: string) => void;
}

const SortableVideoItem = ({ video, onRemove, onPlay }: SortableVideoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bubble-card p-4 hover:scale-[1.01] transition-transform"
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </button>

        {/* Thumbnail */}
        <div className="w-32 h-20 rounded-lg overflow-hidden bg-gray-800 flex-shrink-0 relative group">
          {video.thumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoIcon className="w-8 h-8 text-gray-600" />
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
            {formatDuration(video.duration || 0)}
          </div>
          <button
            onClick={() => onPlay(video.id)}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                     flex items-center justify-center"
          >
            <Play className="w-8 h-8 text-white" fill="white" />
          </button>
        </div>

        {/* Video Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white dark:text-white font-medium truncate mb-1">{video.title}</h3>
          <p className="text-sm text-gray-400 dark:text-gray-400 truncate">{video.author}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-500">
            <span>{video.platform}</span>
            <span>•</span>
            <span>{video.quality}</span>
            <span>•</span>
            <span>{(video.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPlay(video.id)}
            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors group"
            title="Play video"
          >
            <Play className="w-5 h-5 text-gray-400 group-hover:text-purple-400" />
          </button>
          <button
            onClick={() => onRemove(video.id)}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
            title="Remove from collection"
          >
            <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) {
      loadCollection();
    }
  }, [id]);

  const loadCollection = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const coll = await collectionService.getCollection(id);
      if (!coll) {
        showError('Collection not found');
        navigate('/downloads');
        return;
      }

      setCollection(coll);
      setEditName(coll.name);
      setEditDescription(coll.description || '');

      const vids = await collectionService.getCollectionVideos(id);
      setVideos(vids);

      const statistics = await collectionService.getCollectionStats(id);
      setStats(statistics);
    } catch (error) {
      console.error('Error loading collection:', error);
      showError('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = videos.findIndex((v) => v.id === active.id);
      const newIndex = videos.findIndex((v) => v.id === over.id);

      const newVideos = arrayMove(videos, oldIndex, newIndex);
      setVideos(newVideos);

      // Update order in database
      try {
        await collectionService.reorderVideos(id!, newVideos.map((v) => v.id));
        showSuccess('Videos reordered');
      } catch (error) {
        console.error('Error reordering videos:', error);
        showError('Failed to reorder videos');
        // Revert on error
        loadCollection();
      }
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    if (!window.confirm('Remove this video from the collection?')) return;

    try {
      await collectionService.removeVideoFromCollection(id!, videoId);
      showSuccess('Video removed from collection');
      loadCollection();
    } catch (error) {
      console.error('Error removing video:', error);
      showError('Failed to remove video');
    }
  };

  const handlePlayVideo = (videoId: string) => {
    navigate(`/video/${videoId}`);
  };

  const handlePlayAll = () => {
    if (videos.length > 0) {
      // Navigate to first video with playlist context
      navigate(`/video/${videos[0].id}`, {
        state: { playlist: videos.map((v) => v.id), playlistName: collection?.name },
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!collection) return;

    try {
      const updated = {
        ...collection,
        name: editName.trim(),
        description: editDescription.trim(),
      };
      await collectionService.updateCollection(updated);
      setCollection(updated);
      setIsEditing(false);
      showSuccess('Collection updated');
    } catch (error) {
      console.error('Error updating collection:', error);
      showError('Failed to update collection');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete collection "${collection?.name}"? Videos will not be deleted.`)) {
      return;
    }

    try {
      await collectionService.deleteCollection(id!);
      showSuccess('Collection deleted');
      navigate('/downloads');
    } catch (error) {
      console.error('Error deleting collection:', error);
      showError('Failed to delete collection');
    }
  };

  const handleExport = async () => {
    try {
      const json = await collectionService.exportCollection(id!);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${collection?.name || 'collection'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('Collection exported');
    } catch (error) {
      console.error('Error exporting collection:', error);
      showError('Failed to export collection');
    }
  };

  const handleShare = async () => {
    try {
      const link = await collectionService.generateShareableLink(id!);
      await navigator.clipboard.writeText(link);
      showSuccess('Share link copied to clipboard');
    } catch (error) {
      console.error('Error generating share link:', error);
      showError('Failed to generate share link');
    }
  };

  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getColorClass = (colorTheme: string) => {
    const colorMap: Record<string, string> = {
      purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
      blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
      green: 'from-green-500/20 to-green-600/20 border-green-500/50',
      red: 'from-red-500/20 to-red-600/20 border-red-500/50',
      yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/50',
      pink: 'from-pink-500/20 to-pink-600/20 border-pink-500/50',
      indigo: 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/50',
      orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50',
    };
    return colorMap[colorTheme] || colorMap.purple;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Collection not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/downloads')}
          className="mb-6 flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Collections
        </button>

        {/* Collection Header */}
        <div className={`bubble-card p-8 mb-8 bg-gradient-to-br ${getColorClass(collection.colorTheme)} border-2`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              <Folder className="w-12 h-12 text-white" />
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border-2 border-gray-600 text-white
                               focus:border-purple-500 focus:outline-none"
                    />
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 rounded-lg bg-gray-700 border-2 border-gray-600 text-white
                               focus:border-purple-500 focus:outline-none resize-none"
                      placeholder="Description (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditing(false);
                          setEditName(collection.name);
                          setEditDescription(collection.description || '');
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-white mb-2">{collection.name}</h1>
                    {collection.description && (
                      <p className="text-gray-300">{collection.description}</p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Edit collection"
                >
                  <Edit2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Share collection"
                >
                  <Share2 className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleExport}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Export collection"
                >
                  <DownloadIcon className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  title="Delete collection"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="flex items-center gap-2">
              <VideoIcon className="w-5 h-5 text-white/70" />
              <div>
                <p className="text-sm text-white/70">Videos</p>
                <p className="text-xl font-bold text-white">{stats?.totalVideos || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-white/70" />
              <div>
                <p className="text-sm text-white/70">Size</p>
                <p className="text-xl font-bold text-white">{formatStorage(stats?.totalSize || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-white/70" />
              <div>
                <p className="text-sm text-white/70">Duration</p>
                <p className="text-xl font-bold text-white">{formatDuration(stats?.totalDuration || 0)}</p>
              </div>
            </div>
          </div>

          {/* Play All Button */}
          {videos.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg font-medium text-white
                       flex items-center justify-center gap-2 transition-colors"
            >
              <Play className="w-5 h-5" />
              Play All ({videos.length} videos)
            </button>
          )}
        </div>

        {/* Videos List */}
        {videos.length === 0 ? (
          <div className="bubble-card p-12 text-center">
            <Folder className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No videos in this collection yet</p>
            <p className="text-sm text-gray-500 mt-2">Add videos from the Downloads page</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Videos ({videos.length})</h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={videos.map((v) => v.id)} strategy={verticalListSortingStrategy}>
                {videos.map((video) => (
                  <SortableVideoItem
                    key={video.id}
                    video={video}
                    onRemove={handleRemoveVideo}
                    onPlay={handlePlayVideo}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionDetail;
