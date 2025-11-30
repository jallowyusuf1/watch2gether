import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Download, Youtube, Music, ArrowUpDown, X, CheckSquare, Square, Loader2, Package } from 'lucide-react';
import JSZip from 'jszip';
import VideoCard from '../components/VideoCard';
import { TagSidebar } from '../components/TagSidebar';
import { storageService } from '../services/storageService';
import { tagService } from '../services/tagService';
import { useNotifications } from '../contexts/NotificationContext';
import type { Video, VideoPlatform } from '../types';
import type { TagFilterLogic } from '../types/tag.types';

type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'duration-long' | 'duration-short';

const Downloads = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<VideoPlatform | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterLogic, setTagFilterLogic] = useState<TagFilterLogic>('OR');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useNotifications();

  // Selection states
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });

  // Load videos from IndexedDB
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      const allVideos = await storageService.getAllVideos();
      setVideos(allVideos);
    } catch (error) {
      console.error('Error loading videos:', error);
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

      // Step 1: Filter by platform
      if (platformFilter !== 'all') {
        filtered = filtered.filter((video) => video.platform === platformFilter);
      }

      // Step 2: Filter by search query (case-insensitive)
      if (debouncedSearchQuery.trim()) {
        const query = debouncedSearchQuery.toLowerCase().trim();
        filtered = filtered.filter((video) => {
          const titleMatch = video.title.toLowerCase().includes(query);
          const descriptionMatch = video.description.toLowerCase().includes(query);
          const authorMatch = video.author.toLowerCase().includes(query);
          const tagsMatch = video.tags.some((tag) => tag.toLowerCase().includes(query));
          return titleMatch || descriptionMatch || authorMatch || tagsMatch;
        });
      }

      // Step 3: Apply sorting
      filtered.sort((a, b) => {
        switch (sortOption) {
          case 'newest':
            return (
              new Date(b.downloadDate).getTime() - new Date(a.downloadDate).getTime()
            );
          case 'oldest':
            return (
              new Date(a.downloadDate).getTime() - new Date(b.downloadDate).getTime()
            );
          case 'title-asc':
            return a.title.localeCompare(b.title);
          case 'title-desc':
            return b.title.localeCompare(a.title);
          case 'duration-long':
            return b.duration - a.duration;
          case 'duration-short':
            return a.duration - b.duration;
          default:
            return 0;
        }
      });

      return filtered;
    },
    [platformFilter, debouncedSearchQuery, sortOption]
  );

  // Apply filters and update filtered videos state
  useEffect(() => {
    const filtered = filterVideos(videos);
    setFilteredVideos(filtered);
  }, [videos, filterVideos]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return debouncedSearchQuery.trim() !== '' || platformFilter !== 'all' || selectedTags.length > 0;
  }, [debouncedSearchQuery, platformFilter, selectedTags]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setPlatformFilter('all');
    setSortOption('newest');
    setSelectedTags([]);
  }, []);

  // Calculate total storage
  const totalStorage = videos.reduce((sum, video) => sum + (video.fileSize || 0), 0);

  // Format storage size
  const formatStorage = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Get platform icon
  const getPlatformIcon = (platform: VideoPlatform | 'all') => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'tiktok':
        return <Music className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Selection handlers
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedVideos(new Set(filteredVideos.map((v) => v.id)));
  };

  const clearSelection = () => {
    setSelectedVideos(new Set());
  };

  const isAllSelected = useMemo(
    () => filteredVideos.length > 0 && selectedVideos.size === filteredVideos.length,
    [filteredVideos, selectedVideos]
  );

  // Bulk export as ZIP
  const handleBulkExport = async () => {
    if (selectedVideos.size === 0 || exporting) return;

    try {
      setExporting(true);
      setExportProgress({ current: 0, total: selectedVideos.size });

      const zip = new JSZip();
      const selectedVideosList = videos.filter((v) => selectedVideos.has(v.id));

      // Add each video to the zip
      for (let i = 0; i < selectedVideosList.length; i++) {
        const video = selectedVideosList[i];
        setExportProgress({ current: i + 1, total: selectedVideos.size });

        // Sanitize filename
        const sanitizedTitle = video.title.replace(/[^a-z0-9\s\-_]/gi, '_').replace(/\s+/g, '_');
        const filename = `${sanitizedTitle}.${video.format}`;

        // Add video to zip
        zip.file(filename, video.videoBlob);

        // Add transcript if available
        if (video.transcript) {
          zip.file(`${sanitizedTitle}_transcript.txt`, video.transcript);
        }
      }

      // Generate ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' }, (metadata) => {
        // Optional: Update progress during ZIP generation
        const progress = Math.round(metadata.percent);
        console.log(`Generating ZIP: ${progress}%`);
      });

      // Download ZIP
      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `videos_export_${new Date().toISOString().split('T')[0]}.zip`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);

      // Clear selection after export
      clearSelection();
      showSuccess(`Successfully exported ${selectedVideos.size} video(s) as ZIP file!`);
    } catch (error) {
      console.error('Error exporting videos:', error);
      showError('Failed to export videos. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden pt-24">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
        {/* Heading */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            My Downloads
          </h1>
        </div>

        {/* Main Content with Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tag Sidebar */}
          <div className="lg:col-span-1">
            <TagSidebar
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              filterLogic={tagFilterLogic}
              onFilterLogicChange={setTagFilterLogic}
              className="sticky top-24"
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* Search and Filters */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border-2 border-white/10
                       focus:border-purple-400 focus:outline-none
                       focus:ring-2 focus:ring-purple-400/20 text-white placeholder-gray-400
                       transition-all duration-200 backdrop-blur-sm"
                />
              </div>

              {/* Filter Buttons and Sort */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Platform Filters */}
                <div className="flex flex-wrap gap-2">
                  {(['all', 'youtube', 'tiktok'] as const).map((platform) => (
                    <button
                      key={platform}
                      onClick={() => setPlatformFilter(platform)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all duration-200
                    ${
                      platformFilter === platform
                        ? platform === 'all'
                          ? 'bubble-btn'
                          : platform === 'youtube'
                          ? 'bg-red-600 text-white shadow-lg'
                          : 'bg-gray-800 text-white shadow-lg'
                        : 'bubble-btn-secondary border-2 border-white/20 hover:border-purple-400'
                    }
                    flex items-center gap-2`}
                    >
                      {getPlatformIcon(platform)}
                      <span className="capitalize">{platform}</span>
                    </button>
              ))}
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="appearance-none pl-10 pr-8 py-2 rounded-lg bg-white/5 border-2 border-white/10
                         focus:border-purple-400 focus:outline-none
                         focus:ring-2 focus:ring-purple-400/20 text-white
                         transition-all duration-200 cursor-pointer backdrop-blur-sm"
                  >
                    <option value="newest" className="bg-gray-800">Newest First</option>
                    <option value="oldest" className="bg-gray-800">Oldest First</option>
                    <option value="title-asc" className="bg-gray-800">Title A-Z</option>
                    <option value="title-desc" className="bg-gray-800">Title Z-A</option>
                    <option value="duration-long" className="bg-gray-800">Longest Duration</option>
                    <option value="duration-short" className="bg-gray-800">Shortest Duration</option>
                  </select>
                  <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Stats and Clear Filters */}
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="text-sm text-white">
                {hasActiveFilters ? (
                  <>
                    Showing <span className="font-semibold">{filteredVideos.length}</span> of{' '}
                    <span className="font-semibold">{videos.length}</span> video
                    {videos.length !== 1 ? 's' : ''} •{' '}
                    <span className="font-semibold">{formatStorage(totalStorage)}</span> total storage
                  </>
            ) : (
              <>
                <span className="font-semibold">{filteredVideos.length}</span> video
                {filteredVideos.length !== 1 ? 's' : ''} •{' '}
                <span className="font-semibold">{formatStorage(totalStorage)}</span> total storage
              </>
            )}
              </div>

              {/* Clear Filters Button */}
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

            {/* Bulk Selection Toolbar */}
            {filteredVideos.length > 0 && (
            <div className="mb-6 bubble-card p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Selection Controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={isAllSelected ? clearSelection : selectAllVisible}
                    className="bubble-btn-secondary px-4 py-2 flex items-center gap-2"
                  >
                    {isAllSelected ? (
                      <>
                        <CheckSquare className="w-5 h-5 text-purple-400" />
                        Deselect All
                      </>
                  ) : (
                    <>
                      <Square className="w-5 h-5" />
                      Select All
                    </>
                  )}
                  </button>

                  {selectedVideos.size > 0 && (
                  <div className="text-sm font-medium text-white">
                    {selectedVideos.size} video{selectedVideos.size !== 1 ? 's' : ''} selected
                  </div>
                )}
                </div>

                {/* Export Actions */}
                {selectedVideos.size > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBulkExport}
                    disabled={exporting}
                    className="bubble-btn px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Exporting {exportProgress.current}/{exportProgress.total}...
                      </>
                    ) : (
                      <>
                        <Package className="w-5 h-5" />
                        Export as ZIP
                      </>
                    )}
                  </button>

                  <button
                    onClick={clearSelection}
                    disabled={exporting}
                    className="bubble-btn-secondary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              )}
              </div>
            </div>
        )}

            {/* Videos Grid or Empty State */}
            {filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fadeIn">
                <div className="bg-purple-500/20 rounded-full p-6 mb-4">
                  <Download className="w-16 h-16 text-purple-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">
                  No videos downloaded yet
                </h2>
                <p className="text-gray-300 mb-6">
                  {debouncedSearchQuery || platformFilter !== 'all'
                ? 'No videos match your filters. Try adjusting your search or filters.'
                : 'Start downloading videos to see them here.'}
                </p>
                {!debouncedSearchQuery && platformFilter === 'all' && (
                <button
                  onClick={() => navigate('/')}
                  className="bubble-btn px-6 py-3"
                >
                  Go to Download Page
                </button>
            )}
              </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <div
                key={video.id}
                className="animate-fadeIn relative"
                style={{
                  animationDelay: `${Math.min(index * 50, 500)}ms`,
                }}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideoSelection(video.id);
                    }}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border-2 border-white/20
                             hover:border-purple-400 transition-all duration-200 shadow-sm"
                    aria-label={selectedVideos.has(video.id) ? 'Deselect video' : 'Select video'}
                  >
                    {selectedVideos.has(video.id) ? (
                      <CheckSquare className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>

                <VideoCard
                  video={video}
                  onEdit={(video) => navigate(`/video/${video.id}?edit=true`)}
                  onTranscript={(video) => navigate(`/video/${video.id}?tab=transcript`)}
                  onDelete={async (video) => {
                    if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
                      try {
                        await storageService.deleteVideo(video.id);
                        await loadVideos();
                        // Remove from selection if deleted
                        setSelectedVideos((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(video.id);
                          return newSet;
                        });
                      } catch (error) {
                        console.error('Error deleting video:', error);
                        alert('Failed to delete video. Please try again.');
                      }
                    }
                  }}
                />
              </div>
            ))}
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
