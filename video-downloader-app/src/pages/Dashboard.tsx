import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  FileText,
  TrendingUp,
  Clock,
  HardDrive,
  Youtube,
  Music,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';
import DownloadForm from '../components/DownloadForm';
import type { DownloadFormRef } from '../components/DownloadForm';
import VideoCard from '../components/VideoCard';
import { storageService } from '../services/storageService';
import { useNotifications } from '../contexts/NotificationContext';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { getShortcutByAction } from '../utils/keyboardShortcuts';
import type { Video } from '../types';

const Dashboard = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotifications();
  const downloadFormRef = useRef<DownloadFormRef>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalStorage: 0,
    youtubeCount: 0,
    tiktokCount: 0,
    totalTranscripts: 0,
    totalDuration: 0,
  });

  // Register keyboard shortcut to focus download input
  useKeyboardShortcut(
    getShortcutByAction('focusDownloadInput') || null,
    () => {
      downloadFormRef.current?.focusInput();
    },
    { allowInInput: false }
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingRecent(true);
        const allVideos = await storageService.getAllVideos();
        const recent = allVideos.slice(0, 6);
        setRecentVideos(recent);

        const totalStorage = await storageService.getTotalStorageUsed();
        const youtubeVideos = allVideos.filter(v => v.platform === 'youtube');
        const tiktokVideos = allVideos.filter(v => v.platform === 'tiktok');
        const videosWithTranscripts = allVideos.filter(v => v.transcript && v.transcript.length > 0);
        const totalDuration = allVideos.reduce((acc, v) => acc + (v.duration || 0), 0);

        setStats({
          totalVideos: allVideos.length,
          totalStorage,
          youtubeCount: youtubeVideos.length,
          tiktokCount: tiktokVideos.length,
          totalTranscripts: videosWithTranscripts.length,
          totalDuration: totalDuration,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoadingRecent(false);
      }
    };

    loadData();
  }, []);

  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen relative overflow-hidden pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Dashboard
              </h1>
              <p className="text-gray-300 mt-1">
                Download and manage your videos
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid - 6 Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-purple-500/20 rounded-lg">
                <Download className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Total Videos</p>
                <p className="text-4xl font-bold text-white">{stats.totalVideos}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-purple-500/20 rounded-lg">
                <HardDrive className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Storage Used</p>
                <p className="text-4xl font-bold text-white">{formatStorage(stats.totalStorage)}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-red-500/20 rounded-lg">
                <Youtube className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">YouTube Videos</p>
                <p className="text-4xl font-bold text-white">{stats.youtubeCount}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-gray-500/20 rounded-lg">
                <Music className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">TikTok Videos</p>
                <p className="text-4xl font-bold text-white">{stats.tiktokCount}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-blue-500/20 rounded-lg">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Total Transcripts</p>
                <p className="text-4xl font-bold text-white">
                  {stats.totalTranscripts}
                </p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 bg-green-500/20 rounded-lg">
                <Clock className="w-8 h-8 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 mb-1">Total Duration</p>
                <p className="text-4xl font-bold text-white">
                  {Math.round(stats.totalDuration / 60)}m
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Form */}
        <div className="mb-8 md:mb-12">
          <div className="bubble-card p-6 md:p-8">
            <DownloadForm ref={downloadFormRef} />
          </div>
        </div>

        {/* Recent Downloads */}
        {loadingRecent ? (
          <div className="bubble-card p-6 md:p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            </div>
          </div>
        ) : recentVideos.length > 0 ? (
          <div className="bubble-card p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Downloads</h2>
              <button
                onClick={() => navigate('/downloads')}
                className="bubble-btn-secondary px-4 py-2 flex items-center gap-2"
                aria-label="View all downloads"
              >
                View All
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {recentVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  onEdit={(video) => navigate(`/video/${video.id}?edit=true`)}
                  onTranscript={(video) => navigate(`/video/${video.id}?tab=transcript`)}
                  onDelete={async (video) => {
                    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
                      try {
                        await storageService.deleteVideo(video.id);
                        const allVideos = await storageService.getAllVideos();
                        setRecentVideos(allVideos.slice(0, 6));
                        const totalStorage = await storageService.getTotalStorageUsed();
                        setStats(prev => ({ ...prev, totalVideos: allVideos.length, totalStorage }));
                        showSuccess(`Video "${video.title}" deleted successfully.`);
                      } catch (error) {
                        console.error('Error deleting video:', error);
                        showError('Failed to delete video. Please try again.');
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="bubble-card p-6 md:p-8">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-purple-500/20 rounded-full p-6 mb-4">
                <Download className="w-16 h-16 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">No videos yet</h2>
              <p className="text-gray-300 mb-6">Start downloading videos to see them here.</p>
              <button
                onClick={() => downloadFormRef.current?.focusInput()}
                className="bubble-btn px-6 py-3"
              >
                Download Your First Video
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
