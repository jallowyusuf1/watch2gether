import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Link as LinkIcon, Calendar, Eye, Download, FileJson, Music } from 'lucide-react';
import { db } from '../db/database';
import type { ShareHistory } from '../services/sharingService';
import { storageService } from '../services/storageService';
import { collectionService } from '../services/collectionService';
import { useNotifications } from '../contexts/NotificationContext';
import VideoCard from '../components/VideoCard';
import ShareModal from '../components/ShareModal';
import type { Video } from '../types';
import type { Collection } from '../types/video.types';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const [shareHistory, setShareHistory] = useState<ShareHistory[]>([]);
  const [sharedVideos, setSharedVideos] = useState<Video[]>([]);
  const [sharedCollections, setSharedCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    loadShareHistory();
  }, []);

  const loadShareHistory = async () => {
    try {
      setLoading(true);
      const history = await db.getAllShareHistory();
      setShareHistory(history);

      // Load shared videos and collections
      const videoIds = new Set<string>();
      const collectionIds = new Set<string>();

      history.forEach((share) => {
        if (share.type === 'video') {
          videoIds.add(share.itemId);
        } else if (share.type === 'collection') {
          collectionIds.add(share.itemId);
        }
      });

      // Load videos
      const videos = await Promise.all(
        Array.from(videoIds).map(async (id) => {
          try {
            return await storageService.getVideo(id);
          } catch {
            return null;
          }
        })
      );
      setSharedVideos(videos.filter(Boolean) as Video[]);

      // Load collections
      const collections = await Promise.all(
        Array.from(collectionIds).map(async (id) => {
          try {
            return await collectionService.getCollectionById(id);
          } catch {
            return null;
          }
        })
      );
      setSharedCollections(collections.filter(Boolean) as Collection[]);
    } catch (error) {
      console.error('Error loading share history:', error);
      showError('Failed to load shared content');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShareMethodIcon = (method: ShareHistory['shareMethod']) => {
    switch (method) {
      case 'link':
        return LinkIcon;
      case 'social':
        return Share2;
      case 'email':
        return LinkIcon;
      case 'embed':
        return LinkIcon;
      case 'file':
        return FileJson;
      default:
        return Share2;
    }
  };

  const groupedHistory = shareHistory.reduce((acc, share) => {
    const date = new Date(share.sharedAt).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(share);
    return acc;
  }, {} as Record<string, ShareHistory[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-purple-900/30 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-900/30 rounded-xl">
              <Share2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shared with Me</h1>
              <p className="text-gray-600 dark:text-gray-400">Content shared with you</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Shares</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{shareHistory.length}</p>
          </div>

          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Shared Videos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sharedVideos.length}</p>
          </div>

          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Music className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Shared Collections</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sharedCollections.length}</p>
          </div>
        </div>

        {/* Shared Videos */}
        {sharedVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Shared Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sharedVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onShare={(v) => {
                    setSelectedVideo(v);
                    setShowShareModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Share History Timeline */}
        <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Share History</h2>
          
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="text-center py-12">
              <Share2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No share history yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedHistory)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .map(([date, shares]) => (
                  <div key={date}>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <div className="space-y-3">
                      {shares.map((share) => {
                        const Icon = getShareMethodIcon(share.shareMethod);
                        return (
                          <div
                            key={share.id}
                            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                          >
                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                              <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {share.type === 'video' ? 'Video' : share.type === 'collection' ? 'Collection' : 'Playlist'}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Shared via {share.shareMethod}
                                {share.recipient && ` to ${share.recipient}`}
                              </p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(share.sharedAt)}
                                </div>
                                {share.viewCount !== undefined && (
                                  <div className="flex items-center gap-1">
                                    <Eye className="w-3 h-3" />
                                    {share.viewCount} views
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {selectedVideo && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedVideo(null);
          }}
          video={selectedVideo}
        />
      )}
    </div>
  );
};

export default SharedWithMe;

