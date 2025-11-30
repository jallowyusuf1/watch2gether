import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  HardDrive,
  Clock,
  Youtube,
  Music,
  BarChart3,
  Download,
  Sparkles,
  Calendar,
  User,
  FileVideo,
  FileAudio,
  Tag as TagIcon,
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { tagService } from '../services/tagService';
import type { Video } from '../types';

type DateRange = '7days' | '30days' | '90days' | 'all';
type PlatformFilter = 'all' | 'youtube' | 'tiktok';

const Insights = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('30days');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [tagStatistics, setTagStatistics] = useState<any>(null);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setLoading(true);
        const allVideos = await storageService.getAllVideos();
        setVideos(allVideos);
      } catch (error) {
        console.error('Error loading videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVideos();
  }, []);

  // Filter videos based on date range and platform
  const filteredVideos = useMemo(() => {
    let filtered = [...videos];

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const daysMap = { '7days': 7, '30days': 30, '90days': 90 };
      const days = daysMap[dateRange];
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      filtered = filtered.filter(v => new Date(v.downloadedAt) >= cutoffDate);
    }

    // Apply platform filter
    if (platformFilter !== 'all') {
      filtered = filtered.filter(v => v.platform === platformFilter);
    }

    return filtered;
  }, [videos, dateRange, platformFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalVideos = filteredVideos.length;
    const totalStorage = filteredVideos.reduce((sum, v) => sum + (v.fileSize || 0), 0);
    const totalDuration = filteredVideos.reduce((sum, v) => sum + (v.duration || 0), 0);

    const youtubeCount = filteredVideos.filter(v => v.platform === 'youtube').length;
    const tiktokCount = filteredVideos.filter(v => v.platform === 'tiktok').length;

    const mostUsedPlatform = youtubeCount >= tiktokCount ? 'YouTube' : 'TikTok';

    // Estimate available storage (5GB for demo purposes)
    const estimatedTotalStorage = 5 * 1024 * 1024 * 1024; // 5GB in bytes
    const storagePercentage = (totalStorage / estimatedTotalStorage) * 100;

    return {
      totalVideos,
      totalStorage,
      totalDuration,
      mostUsedPlatform,
      storagePercentage,
      youtubeCount,
      tiktokCount,
    };
  }, [filteredVideos]);

  // Platform distribution data
  const platformData = useMemo(() => {
    return [
      { name: 'YouTube', count: metrics.youtubeCount, color: '#FF0000' },
      { name: 'TikTok', count: metrics.tiktokCount, color: '#000000' },
    ].filter(d => d.count > 0);
  }, [metrics]);

  // Downloads over time data
  const timelineData = useMemo(() => {
    const groupedByDate: { [key: string]: number } = {};

    filteredVideos.forEach(video => {
      const date = new Date(video.downloadDate);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      groupedByDate[dateKey] = (groupedByDate[dateKey] || 0) + 1;
    });

    return Object.entries(groupedByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredVideos]);

  // Format distribution data
  const formatData = useMemo(() => {
    const mp4Count = filteredVideos.filter(v => v.format === 'mp4').length;
    const mp3Count = filteredVideos.filter(v => v.format === 'mp3').length;

    return [
      { name: 'MP4 (Video)', value: mp4Count, color: '#6366f1' },
      { name: 'MP3 (Audio)', value: mp3Count, color: '#ec4899' },
    ].filter(d => d.value > 0);
  }, [filteredVideos]);

  // Quality distribution data
  const qualityData = useMemo(() => {
    const qualityCount: { [key: string]: number } = {};

    filteredVideos.forEach(video => {
      const quality = video.quality || 'Unknown';
      qualityCount[quality] = (qualityCount[quality] || 0) + 1;
    });

    return Object.entries(qualityCount)
      .map(([quality, count]) => ({ quality, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredVideos]);

  // Top authors data
  const topAuthors = useMemo(() => {
    const authorCount: { [key: string]: number } = {};

    filteredVideos.forEach(video => {
      const author = video.author || 'Unknown';
      authorCount[author] = (authorCount[author] || 0) + 1;
    });

    return Object.entries(authorCount)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredVideos]);

  // Average file size per platform
  const avgFileSizePerPlatform = useMemo(() => {
    const youtubeVideos = filteredVideos.filter(v => v.platform === 'youtube');
    const tiktokVideos = filteredVideos.filter(v => v.platform === 'tiktok');

    const youtubeAvg = youtubeVideos.length > 0
      ? youtubeVideos.reduce((sum, v) => sum + (v.fileSize || 0), 0) / youtubeVideos.length
      : 0;

    const tiktokAvg = tiktokVideos.length > 0
      ? tiktokVideos.reduce((sum, v) => sum + (v.fileSize || 0), 0) / tiktokVideos.length
      : 0;

    return { youtubeAvg, tiktokAvg };
  }, [filteredVideos]);

  // Recent downloads
  const recentDownloads = useMemo(() => {
    return [...filteredVideos]
      .sort((a, b) => new Date(b.downloadDate).getTime() - new Date(a.downloadDate).getTime())
      .slice(0, 6);
  }, [filteredVideos]);

  // Format storage size
  const formatStorage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 pb-20">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <BarChart3 className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white dark:text-white">
                Insights
              </h1>
              <p className="text-gray-300 dark:text-gray-300 mt-1">
                Analytics and statistics for your video collection
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="flex gap-2">
              {[
                { value: '7days', label: '7 Days' },
                { value: '30days', label: '30 Days' },
                { value: '90days', label: '90 Days' },
                { value: 'all', label: 'All Time' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value as DateRange)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateRange === option.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'youtube', label: 'YouTube' },
                { value: 'tiktok', label: 'TikTok' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPlatformFilter(option.value as PlatformFilter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    platformFilter === option.value
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bubble-card p-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 dark:text-gray-300">Total Videos</p>
                <p className="text-3xl font-bold text-white dark:text-white">{metrics.totalVideos}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <HardDrive className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 dark:text-gray-300">Storage Used</p>
                <p className="text-3xl font-bold text-white dark:text-white">{formatStorage(metrics.totalStorage)}</p>
                <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">
                  {metrics.storagePercentage.toFixed(1)}% of available
                </p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Clock className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 dark:text-gray-300">Total Watch Time</p>
                <p className="text-3xl font-bold text-white dark:text-white">{formatDuration(metrics.totalDuration)}</p>
              </div>
            </div>
          </div>

          <div className="bubble-card p-6">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-gray-300 dark:text-gray-300">Most Used Platform</p>
                <p className="text-2xl font-bold text-white dark:text-white">{metrics.mostUsedPlatform}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Platform Distribution */}
          <div className="bubble-card-no-tilt p-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Downloads by Platform
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Downloads Over Time */}
          <div className="bubble-card-no-tilt p-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              Downloads Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9ca3af"
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Format Distribution */}
          <div className="bubble-card-no-tilt p-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-green-400" />
              Format Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Quality Distribution */}
          <div className="bubble-card-no-tilt p-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Quality Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={qualityData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="quality" stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Authors */}
        <div className="bubble-card-no-tilt p-6 mb-8">
          <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-purple-400" />
            Top Authors
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topAuthors.map((author, index) => (
              <div
                key={author.author}
                className="bg-white/5 hover:bg-white/10 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-purple-400">#{index + 1}</span>
                  <span className="text-sm font-semibold text-white dark:text-white bg-purple-500/20 px-2 py-1 rounded">
                    {author.count} videos
                  </span>
                </div>
                <p className="text-sm text-gray-300 dark:text-gray-300 truncate" title={author.author}>
                  {author.author}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Average File Size per Platform */}
        <div className="bubble-card-no-tilt p-6 mb-8">
          <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-400" />
            Average File Size by Platform
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white/5 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Youtube className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-gray-300 dark:text-gray-300">YouTube</p>
                  <p className="text-2xl font-bold text-white dark:text-white">
                    {formatStorage(avgFileSizePerPlatform.youtubeAvg)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-400">per video</p>
                </div>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-2">
                <Music className="w-8 h-8 text-black dark:text-white" />
                <div>
                  <p className="text-sm text-gray-300 dark:text-gray-300">TikTok</p>
                  <p className="text-2xl font-bold text-white dark:text-white">
                    {formatStorage(avgFileSizePerPlatform.tiktokAvg)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-400">per video</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recently Downloaded */}
        <div className="bubble-card-no-tilt p-6">
          <h2 className="text-xl font-bold text-white dark:text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5 text-green-400" />
            Recently Downloaded
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentDownloads.map((video) => (
              <div
                key={video.id}
                className="bg-white/5 hover:bg-white/10 rounded-lg overflow-hidden transition-colors cursor-pointer"
                onClick={() => window.location.href = `/video/${video.id}`}
              >
                <div className="aspect-video bg-gray-800 relative">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileVideo className="w-8 h-8 text-gray-600" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-xs text-white">
                    {formatDuration(video.duration || 0)}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-gray-300 dark:text-gray-300 truncate" title={video.title}>
                    {video.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                    {video.author}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
