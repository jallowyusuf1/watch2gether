import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Youtube, Music, ArrowUpDown, X, Clock, Calendar, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { storageService } from '../services/storageService';
import { youtubeService } from '../services/youtubeService';
import { tiktokService } from '../services/tiktokService';
import { parseVideoUrl } from '../utils/urlParser';
import { useNotifications } from '../contexts/NotificationContext';
import type { Video, VideoPlatform } from '../types';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc';
type TranscriptStatus = 'idle' | 'processing' | 'completed' | 'error';

const Transcripts = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<VideoPlatform | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [transcriptUrl, setTranscriptUrl] = useState('');
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('idle');
  const [transcriptMessage, setTranscriptMessage] = useState('');
  const navigate = useNavigate();
  const { showSuccess, showError, showInfo } = useNotifications();
  const inputRef = useRef<HTMLInputElement>(null);

  // Load videos with transcripts from IndexedDB
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const allVideos = await storageService.getAllVideos();
      // Filter only videos that have transcripts
      const videosWithTranscripts = allVideos.filter(video => video.transcript && video.transcript.trim().length > 0);
      setVideos(videosWithTranscripts);
    } catch (error) {
      console.error('Error loading transcripts:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load videos on mount
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Debounce search query by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter and sort videos function
  const filterVideos = useCallback(
    (videosToFilter: Video[]): Video[] => {
      let filtered = [...videosToFilter];

      // Filter by platform
      if (platformFilter !== 'all') {
        filtered = filtered.filter((video) => video.platform === platformFilter);
      }

      // Filter by search query
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase();
        filtered = filtered.filter(
          (video) =>
            video.title.toLowerCase().includes(query) ||
            video.description?.toLowerCase().includes(query) ||
            video.author.toLowerCase().includes(query) ||
            video.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
            video.transcript?.toLowerCase().includes(query)
        );
      }

      // Sort videos
      filtered.sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return new Date(b.downloadDate).getTime() - new Date(a.downloadDate).getTime();
          case 'oldest':
            return new Date(a.downloadDate).getTime() - new Date(b.downloadDate).getTime();
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          default:
            return 0;
        }
      });

      return filtered;
    },
    [platformFilter, debouncedSearchQuery, sortOption]
  );

  // Update filtered videos when filters change
  useEffect(() => {
    const filtered = filterVideos(videos);
    setFilteredVideos(filtered);
  }, [videos, filterVideos]);

  // Format date
  const formatDate = (date: Date): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'tiktok':
        return <Music className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Get platform color
  const getPlatformColor = (platform: string): string => {
    switch (platform) {
      case 'youtube':
        return 'bg-red-600';
      case 'tiktok':
        return 'bg-black dark:bg-gray-700';
      default:
        return 'bg-gray-600';
    }
  };

  // Check if filters are active
  const hasActiveFilters = platformFilter !== 'all' || debouncedSearchQuery.trim() !== '';

  // Clear all filters
  const clearFilters = () => {
    setPlatformFilter('all');
    setSearchQuery('');
  };

  // Handle transcript generation from URL
  const handleGenerateTranscript = async () => {
    const trimmedUrl = transcriptUrl.trim();

    if (!trimmedUrl) {
      showError('Please enter a video URL');
      return;
    }

    const parsed = parseVideoUrl(trimmedUrl);
    if (!parsed) {
      showError('Invalid video URL. Please enter a valid YouTube or TikTok URL.');
      return;
    }

    try {
      setTranscriptStatus('processing');
      setTranscriptMessage('Fetching video metadata...');

      let videoData: any;
      let transcript: string = '';

      // Get video metadata and transcript based on platform
      if (parsed.platform === 'youtube') {
        const metadata = await youtubeService.getVideoMetadata(trimmedUrl);
        setTranscriptMessage('Generating transcript...');
        transcript = await youtubeService.getTranscript(trimmedUrl);

        videoData = {
          id: `yt_${parsed.videoId}_${Date.now()}`,
          videoId: parsed.videoId,
          title: metadata.title,
          author: metadata.author,
          platform: 'youtube' as VideoPlatform,
          description: metadata.description || '',
          thumbnail: metadata.thumbnail,
          duration: metadata.duration,
          downloadDate: new Date(),
          transcript,
          tags: [],
          quality: '1080p',
          format: 'mp4' as const,
        };
      } else if (parsed.platform === 'tiktok') {
        const metadata = await tiktokService.getVideoMetadata(trimmedUrl);
        setTranscriptMessage('Generating transcript...');
        transcript = await tiktokService.getTranscript(trimmedUrl);

        videoData = {
          id: `tt_${Date.now()}`,
          videoId: trimmedUrl,
          title: metadata.title || 'TikTok Video',
          author: metadata.author || 'Unknown',
          platform: 'tiktok' as VideoPlatform,
          description: metadata.description || '',
          thumbnail: metadata.thumbnail || '',
          duration: metadata.duration || 0,
          downloadDate: new Date(),
          transcript,
          tags: [],
          quality: '1080p',
          format: 'mp4' as const,
        };
      }

      if (!transcript || transcript.trim().length === 0) {
        throw new Error('No transcript available for this video');
      }

      // Save to IndexedDB
      setTranscriptMessage('Saving transcript...');
      await storageService.saveVideo(videoData);

      // Update UI
      setTranscriptStatus('completed');
      setTranscriptMessage('Transcript generated successfully!');
      showSuccess('Transcript generated and saved!');

      // Reload videos
      await loadVideos();

      // Reset form after delay
      setTimeout(() => {
        setTranscriptUrl('');
        setTranscriptStatus('idle');
        setTranscriptMessage('');
      }, 3000);

    } catch (error: any) {
      console.error('Transcript generation error:', error);
      setTranscriptStatus('error');
      setTranscriptMessage(error.message || 'Failed to generate transcript');
      showError(error.message || 'Failed to generate transcript');

      // Reset error after delay
      setTimeout(() => {
        setTranscriptStatus('idle');
        setTranscriptMessage('');
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white relative overflow-hidden pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white relative overflow-hidden pt-24">
      <div className="relative z-10 container mx-auto px-4 md:px-8 py-8 max-w-7xl">
        {/* Heading */}
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-white">
          Transcripts
        </h1>

        {/* URL Input Section for Transcript Generation */}
        <div className="mb-8 bubble-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Generate Transcript</h2>
          </div>
          <p className="text-gray-300 mb-4 text-sm">
            Enter a YouTube or TikTok URL to automatically generate and save its transcript
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={transcriptUrl}
                onChange={(e) => setTranscriptUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && transcriptStatus !== 'processing') {
                    handleGenerateTranscript();
                  }
                }}
                placeholder="https://youtube.com/watch?v=... or https://tiktok.com/..."
                disabled={transcriptStatus === 'processing'}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border-2 border-white/10
                         focus:border-purple-400 focus:outline-none
                         focus:ring-2 focus:ring-purple-400/20 text-white placeholder-gray-400
                         transition-all duration-200 backdrop-blur-sm disabled:opacity-50"
              />
              {transcriptStatus === 'processing' && (
                <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400 animate-spin" />
              )}
              {transcriptStatus === 'completed' && (
                <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
              )}
              {transcriptStatus === 'error' && (
                <AlertCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-400" />
              )}
            </div>
            <button
              onClick={handleGenerateTranscript}
              disabled={transcriptStatus === 'processing' || !transcriptUrl.trim()}
              className="bubble-btn px-6 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {transcriptStatus === 'processing' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {transcriptMessage && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 ${
              transcriptStatus === 'completed' ? 'bg-green-500/20 border border-green-500/30' :
              transcriptStatus === 'error' ? 'bg-red-500/20 border border-red-500/30' :
              'bg-purple-500/20 border border-purple-500/30'
            }`}>
              {transcriptStatus === 'processing' && <Loader2 className="w-4 h-4 animate-spin" />}
              {transcriptStatus === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
              {transcriptStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-sm">{transcriptMessage}</span>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcripts..."
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border-2 border-white/10
                       focus:border-purple-400 focus:outline-none
                       focus:ring-2 focus:ring-purple-400/20 text-white placeholder-gray-400
                       transition-all duration-200 backdrop-blur-sm"
            />
          </div>

          {/* Filter Buttons and Sort */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPlatformFilter('all')}
                className={platformFilter === 'all' ? 'bubble-btn px-4 py-2' : 'bubble-btn-secondary px-4 py-2'}
              >
                All
              </button>
              <button
                onClick={() => setPlatformFilter('youtube')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                  platformFilter === 'youtube'
                    ? 'bg-red-600 text-white'
                    : 'bubble-btn-secondary'
                }`}
              >
                <Youtube className="w-4 h-4" />
                YouTube
              </button>
              <button
                onClick={() => setPlatformFilter('tiktok')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                  platformFilter === 'tiktok'
                    ? 'bg-gray-800 text-white'
                    : 'bubble-btn-secondary'
                }`}
              >
                <Music className="w-4 h-4" />
                TikTok
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="bubble-btn-secondary px-4 py-2 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="appearance-none bg-white/5 border-2 border-white/10
                         rounded-lg px-4 py-2 pr-10 text-white
                         focus:border-purple-400 focus:outline-none
                         focus:ring-2 focus:ring-purple-400/20 cursor-pointer backdrop-blur-sm"
              >
                <option value="newest" className="bg-gray-800">Newest First</option>
                <option value="oldest" className="bg-gray-800">Oldest First</option>
                <option value="title-asc" className="bg-gray-800">Title A-Z</option>
                <option value="title-desc" className="bg-gray-800">Title Z-A</option>
              </select>
              <ArrowUpDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-200">
            <span>
              {hasActiveFilters
                ? `Showing ${filteredVideos.length} of ${videos.length} transcripts`
                : `${videos.length} transcript${videos.length !== 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        {/* Transcripts Grid or Empty State */}
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
            <div className="bg-purple-500/20 rounded-full p-6 mb-4">
              <FileText className="w-16 h-16 text-purple-400" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No transcripts found
            </h2>
            <p className="text-gray-300 mb-6">
              {debouncedSearchQuery || platformFilter !== 'all'
                ? 'No transcripts match your filters. Try adjusting your search or filters.'
                : 'No transcripts yet. Enter a video URL above to generate your first transcript.'}
            </p>
            {!debouncedSearchQuery && platformFilter === 'all' && (
              <button
                onClick={() => inputRef.current?.focus()}
                className="bubble-btn px-6 py-3"
              >
                Generate Transcript
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <div
                key={video.id}
                onClick={() => navigate(`/video/${video.id}?tab=transcript`)}
                className="bubble-card overflow-hidden cursor-pointer transform hover:scale-[1.02] animate-fadeIn"
                style={{
                  animationDelay: `${Math.min(index * 50, 500)}ms`,
                }}
              >
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-white line-clamp-2 flex-1">
                      {video.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold text-white flex items-center gap-1 ${getPlatformColor(
                        video.platform
                      )}`}
                    >
                      {getPlatformIcon(video.platform)}
                      {video.platform.charAt(0).toUpperCase() + video.platform.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">
                    {video.author}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(video.downloadDate)}
                    </div>
                  </div>
                </div>

                {/* Transcript Preview */}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                      Transcript Preview
                    </span>
                  </div>
                  <p
                    className="text-xs text-gray-300 line-clamp-3 leading-relaxed"
                    style={{
                      fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                    }}
                  >
                    {video.transcript?.replace(/\[.*?\]/g, '').trim().substring(0, 200) || 'No transcript preview available'}
                    {video.transcript && video.transcript.length > 200 && '...'}
                  </p>
                </div>

                {/* Footer */}
                <div className="px-4 pb-4 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-gray-300">
                    <span>{video.transcript?.split('\n').length || 0} segments</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Transcripts;

