import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Link as LinkIcon, Music } from 'lucide-react';
import { storageService } from '../services/storageService';
import { useNotifications } from '../contexts/NotificationContext';
import VideoCard from '../components/VideoCard';
import ShareModal from '../components/ShareModal';
import type { Video } from '../types';

const SharedWithMe = () => {
  const navigate = useNavigate();
  const { showError } = useNotifications();
  const [sharedVideos, setSharedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Load shared videos (for now, just show all videos as a placeholder)
  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        const allVideos = await storageService.getAllVideos();
        setSharedVideos(allVideos);
      } catch (error) {
        console.error('Error loading videos:', error);
        showError('Failed to load shared content');
      } finally {
        setLoading(false);
      }
    };
    loadVideos();
  }, [showError]);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <LinkIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Shared Videos</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sharedVideos.length}</p>
          </div>

          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-6 border border-purple-200 dark:border-purple-500/20">
            <div className="flex items-center gap-3 mb-2">
              <Share2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Content</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{sharedVideos.length}</p>
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
                  onClick={(v) => {
                    setSelectedVideo(v);
                    setShowShareModal(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {sharedVideos.length === 0 && (
          <div className="bg-white/80 dark:bg-purple-900/30 backdrop-blur-xl rounded-xl p-12 border border-purple-200 dark:border-purple-500/20 text-center">
            <Share2 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No shared content yet</p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">Content shared with you will appear here</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {selectedVideo && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setSelectedVideo(null);
          }}
          videoTitle={selectedVideo.title}
          videoDescription={selectedVideo.description}
          videoUrl={selectedVideo.url}
          shareUrl={window.location.origin + `/video/${selectedVideo.id}`}
        />
      )}
    </div>
  );
};

export default SharedWithMe;

