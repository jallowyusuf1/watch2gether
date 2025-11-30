import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Share2,
  Trash2,
  Youtube,
  Music,
  Calendar,
  FileText,
  X,
  AlertTriangle,
  Edit2,
  Check,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  Mic,
  Video as VideoIcon,
  AudioLines,
  Scissors,
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import TranscriptViewer from '../components/TranscriptViewer';
import ConfirmModal from '../components/ConfirmModal';
import ShareModal from '../components/ShareModal';
import { TagAutocomplete } from '../components/TagAutocomplete';
import { TagPill } from '../components/TagPill';
import { ClipExtractor } from '../components/ClipExtractor';
import { storageService } from '../services/storageService';
import { tagService } from '../services/tagService';
import { youtubeService } from '../services/youtubeService';
import { useNotifications } from '../contexts/NotificationContext';
import type { Video } from '../types';

const VideoDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useNotifications();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [generatingTranscript, setGeneratingTranscript] = useState(false);

  // Edit mode states
  const [editMode, setEditMode] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Export states
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Clip extractor state
  const [showClipExtractor, setShowClipExtractor] = useState(false);

  // Fetch video from IndexedDB
  useEffect(() => {
    const loadVideo = async () => {
      if (!id) {
        navigate('/downloads');
        return;
      }

      try {
        setLoading(true);
        const videoData = await storageService.getVideo(id);
        setVideo(videoData);
        setEditedTitle(videoData.title);
        setEditedDescription(videoData.description);
        setEditedTags(videoData.tags || []);
        
        // Load suggested tags
        try {
          const suggestions = await tagService.suggestTags(videoData);
          setSuggestedTags(suggestions);
        } catch (error) {
          console.error('Error loading suggested tags:', error);
        }
        
        // Set transcript if available
        if (videoData.transcript) {
          setTranscript(videoData.transcript);
        }
        
        // Check if transcript tab is requested
        if (searchParams.get('tab') === 'transcript') {
          setTranscriptOpen(true);
        }
      } catch (error) {
        console.error('Error loading video:', error);
        navigate('/downloads');
      } finally {
        setLoading(false);
      }
    };

    loadVideo();
  }, [id, navigate, searchParams]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const [currentTranscriptText, setCurrentTranscriptText] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  
  // Generate transcript using Web Speech API in real-time
  const handleGenerateTranscript = async () => {
    if (!video || !video.videoBlob || generatingTranscript) return;
    
    try {
      setGeneratingTranscript(true);
      setTranscriptError(null);
      setCurrentTranscriptText('');
      
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
      }
      
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = true;
      recognition.interimResults = true; // Get interim results for real-time display
      recognition.lang = 'en-US';
      
      const transcriptSegments: Array<{ time: number; text: string }> = [];
      const videoElement = videoRef.current;
      
      if (!videoElement) {
        throw new Error('Video element not found');
      }
      
      // Start recognition
      recognition.onresult = (event: any) => {
        const currentTime = videoElement.currentTime;
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            transcriptSegments.push({
              time: currentTime,
              text: transcript.trim(),
            });
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update real-time display
        const allText = transcriptSegments.map(s => s.text).join(' ') + interimTranscript;
        setCurrentTranscriptText(allText);
      };
      
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Continue, might be silence
          return;
        }
        if (event.error === 'aborted') {
          // User stopped it
          return;
        }
        setTranscriptError(`Speech recognition error: ${event.error}`);
        setGeneratingTranscript(false);
      };
      
      recognition.onend = () => {
        // Format transcript with timestamps
        const formattedTranscript = transcriptSegments
          .map((segment) => {
            const minutes = Math.floor(segment.time / 60);
            const seconds = Math.floor(segment.time % 60);
            return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}] ${segment.text}`;
          })
          .join('\n');
        
        setTranscript(formattedTranscript);
        setCurrentTranscriptText(formattedTranscript);
        
        // Save transcript to video
        if (video && formattedTranscript) {
          storageService.updateVideoMetadata(video.id, { transcript: formattedTranscript });
        }
        
        setGeneratingTranscript(false);
      };
      
      // Start video playback and recognition
      videoElement.play();
      recognition.start();
      
      // Stop after video ends
      const handleVideoEnd = () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        videoElement.removeEventListener('ended', handleVideoEnd);
      };
      videoElement.addEventListener('ended', handleVideoEnd);
      
    } catch (error) {
      console.error('Error generating transcript:', error);
      setTranscriptError(error instanceof Error ? error.message : 'Failed to generate transcript');
      setGeneratingTranscript(false);
    }
  };
  
  // Stop transcript generation
  const handleStopTranscript = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setGeneratingTranscript(false);
  };
  
  // Handle seek from transcript
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  // Format date
  const formatDate = (date: Date): string => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="w-5 h-5" />;
      case 'tiktok':
        return <Music className="w-5 h-5" />;
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

  // Show toast notification
  const showToast = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Handle export video
  const handleExportVideo = async () => {
    if (!video || exporting) return;

    try {
      setExporting(true);
      setShowExportMenu(false);

      // Create blob URL for download
      const blobUrl = URL.createObjectURL(video.videoBlob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      // Sanitize filename - replace invalid characters with underscore
      const sanitizedTitle = video.title.replace(/[^a-z0-9\s\-_]/gi, '_').replace(/\s+/g, '_');
      link.download = `${sanitizedTitle}.${video.format}`;
      link.style.display = 'none';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      showToast('success', 'Video export started. Check your downloads folder.');

      // Revoke the blob URL to free memory
      // Use setTimeout to ensure download starts before revoking
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error exporting video:', error);
      showToast('error', 'Failed to export video. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle export transcript
  const handleExportTranscript = async () => {
    if (!video || !transcript || exporting) return;

    try {
      setExporting(true);
      setShowExportMenu(false);

      // Create a blob from the transcript text
      const blob = new Blob([transcript], { type: 'text/plain;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;
      const sanitizedTitle = video.title.replace(/[^a-z0-9\s\-_]/gi, '_').replace(/\s+/g, '_');
      link.download = `${sanitizedTitle}_transcript.txt`;
      link.style.display = 'none';

      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      showToast('success', 'Transcript exported successfully.');

      // Revoke the blob URL
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error('Error exporting transcript:', error);
      showToast('error', 'Failed to export transcript. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Handle export as audio (Note: requires ffmpeg.wasm)
  const handleExportAudio = async () => {
    if (!video || exporting) return;

    setExporting(true);
    setShowExportMenu(false);

    // Show info about audio extraction
    showToast(
      'error',
      'Audio extraction requires ffmpeg.wasm library. Please install it first.'
    );

    setExporting(false);

    // TODO: Implement audio extraction using ffmpeg.wasm
    // This is an advanced feature that requires:
    // 1. Install ffmpeg.wasm: npm install @ffmpeg/ffmpeg @ffmpeg/util
    // 2. Load ffmpeg in the component
    // 3. Extract audio from video blob
    // 4. Export as mp3/wav file
    //
    // Example implementation (commented out):
    /*
    try {
      const { FFmpeg } = await import('@ffmpeg/ffmpeg');
      const { fetchFile } = await import('@ffmpeg/util');

      const ffmpeg = new FFmpeg();
      await ffmpeg.load();

      // Write video file to ffmpeg
      const videoData = await fetchFile(video.videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);

      // Extract audio
      await ffmpeg.exec(['-i', 'input.mp4', '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3']);

      // Read output file
      const audioData = await ffmpeg.readFile('output.mp3');
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });

      // Download audio file
      const blobUrl = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const sanitizedTitle = video.title.replace(/[^a-z0-9\s\-_]/gi, '_').replace(/\s+/g, '_');
      link.download = `${sanitizedTitle}.mp3`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

      showToast('success', 'Audio exported successfully.');
    } catch (error) {
      console.error('Error exporting audio:', error);
      showToast('error', 'Failed to export audio. Please try again.');
    } finally {
      setExporting(false);
    }
    */
  };

  // Handle share - open modal
  const handleShare = () => {
    setShowShareModal(true);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!video || deleting) return;

    try {
      setDeleting(true);
      await storageService.deleteVideo(video.id);
      showSuccess(`Video "${video.title}" deleted successfully.`);
      navigate('/downloads');
    } catch (error) {
      console.error('Error deleting video:', error);
      showError('Failed to delete video. Please try again.');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Handle tag click - navigate to downloads with filter
  const handleTagClick = (tag: string) => {
    navigate(`/downloads?tag=${encodeURIComponent(tag)}`);
  };

  // Show save message temporarily
  const showSaveMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  // Save individual field (inline editing)
  const saveField = async (field: 'title' | 'description' | 'tags', value: any) => {
    if (!video) return;

    // Validate title
    if (field === 'title' && (!value || value.trim() === '')) {
      showSaveMessage('error', 'Title cannot be empty');
      setEditedTitle(video.title);
      setEditingTitle(false);
      return;
    }

    try {
      setSaving(true);
      await storageService.updateVideoMetadata(video.id, { [field]: value });

      // Update local video state
      setVideo({ ...video, [field]: value });
      showSaveMessage('success', 'Saved successfully');

      // Reset editing state
      if (field === 'title') setEditingTitle(false);
      if (field === 'description') setEditingDescription(false);
    } catch (error) {
      console.error('Error saving field:', error);
      showSaveMessage('error', 'Failed to save. Please try again.');

      // Revert to original values
      if (field === 'title') setEditedTitle(video.title);
      if (field === 'description') setEditedDescription(video.description);
      if (field === 'tags') setEditedTags(video.tags || []);
    } finally {
      setSaving(false);
    }
  };

  // Handle title inline edit
  const handleTitleBlur = () => {
    if (editedTitle !== video?.title) {
      saveField('title', editedTitle.trim());
    } else {
      setEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setEditedTitle(video?.title || '');
      setEditingTitle(false);
    }
  };

  // Handle description inline edit
  const handleDescriptionBlur = () => {
    if (editedDescription !== video?.description) {
      saveField('description', editedDescription.trim());
    } else {
      setEditingDescription(false);
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      setEditedDescription(video?.description || '');
      setEditingDescription(false);
    }
  };

  // Handle tag changes from TagAutocomplete
  const handleTagsChange = (tags: string[]) => {
    setEditedTags(tags);
    saveField('tags', tags);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (editMode) {
      // Exiting edit mode - revert unsaved changes
      if (video) {
        setEditedTitle(video.title);
        setEditedDescription(video.description);
        setEditedTags(video.tags || []);
      }
    }
    setEditMode(!editMode);
  };

  // Save all changes in edit mode
  const handleSaveAllChanges = async () => {
    if (!video) return;

    // Validate
    if (!editedTitle.trim()) {
      showSaveMessage('error', 'Title cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await storageService.updateVideoMetadata(video.id, {
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        tags: editedTags,
      });

      // Update local state
      setVideo({
        ...video,
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        tags: editedTags,
      });

      showSaveMessage('success', 'All changes saved successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Error saving changes:', error);
      showSaveMessage('error', 'Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if description is long (more than 3 lines)
  const isDescriptionLong = video && video.description.length > 150;

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            Video not found
          </h2>
          <button
            onClick={() => navigate('/downloads')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Downloads
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-black to-black"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-8 py-8 max-w-6xl">
        {/* Back Button */}
        <button
          onClick={() => navigate('/downloads')}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-gray-300 
                   hover:text-white hover:bg-purple-900/30 backdrop-blur-xl
                   rounded-lg transition-all duration-200 font-medium border border-purple-500/20"
          aria-label="Back to downloads"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Downloads
        </button>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl overflow-hidden border border-purple-500/20">
              {video.videoBlob ? (
                <VideoPlayer 
                  videoBlob={video.videoBlob} 
                  videoRef={videoRef}
                  onTimeUpdate={setVideoCurrentTime}
                />
              ) : (
                <div className="aspect-video bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <p className="text-gray-500">Video not available</p>
                </div>
              )}
            </div>
            
            {/* Transcript Panel */}
            <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl border border-purple-500/20 overflow-hidden">
              {/* Transcript Toggle Button */}
              <button
                onClick={() => setTranscriptOpen(!transcriptOpen)}
                className="w-full px-6 py-4 flex items-center justify-between 
                         hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-white" />
                  <span className="font-semibold text-white">
                    {transcriptOpen ? 'Hide Transcript' : 'View Transcript'}
                  </span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-white transition-transform duration-300 ${
                    transcriptOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              
              {/* Collapsible Transcript Content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  transcriptOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6">
                  {generatingTranscript ? (
                    <div className="py-4">
                      {/* Real-time transcript display */}
                      {currentTranscriptText && (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-300 mb-2 font-medium uppercase tracking-wide">
                            Live Transcription
                          </p>
                          <p 
                            className="text-sm leading-relaxed text-white line-clamp-3"
                            style={{
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                              fontWeight: 400,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {currentTranscriptText}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-sm text-white">
                          Listening and transcribing...
                        </span>
                        <button
                          onClick={handleStopTranscript}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium
                                   rounded-lg transition-colors duration-200"
                        >
                          Stop
                        </button>
                      </div>
                    </div>
                  ) : transcriptError && !transcript ? (
                    <div className="py-6">
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-1">
                              Transcript not available
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400">
                              {transcriptError}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleGenerateTranscript}
                        disabled={generatingTranscript}
                        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                                 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Mic className="w-5 h-5" />
                        <span>Start Transcription</span>
                      </button>
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                        Note: This feature uses Web Speech API and requires Chrome or Edge browser.
                        The video will play while generating the transcript.
                      </p>
                    </div>
                  ) : transcript ? (
                    <>
                      {/* Real-time transcript display above video */}
                      {currentTranscriptText && generatingTranscript && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p
                            className="text-xs leading-relaxed text-white line-clamp-3"
                            style={{
                              fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                              fontWeight: 400,
                              letterSpacing: '0.01em',
                            }}
                          >
                            {currentTranscriptText}
                          </p>
                        </div>
                      )}
                      <TranscriptViewer
                        transcript={transcript}
                        currentTime={videoCurrentTime}
                        onSeek={handleSeek}
                      />
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-white mb-4">
                        No transcript available. Click below to start transcribing.
                      </p>
                      <button
                        onClick={handleGenerateTranscript}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                                 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mx-auto"
                      >
                        <Mic className="w-5 h-5" />
                        <span>Start Transcription</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Information Section */}
          <div className="space-y-6">
            {/* Save Message Notification */}
            {saveMessage && (
              <div
                className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fadeIn ${
                  saveMessage.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                {saveMessage.type === 'success' ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span className="font-medium">{saveMessage.text}</span>
              </div>
            )}

            {/* Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
              {/* Edit Mode Toggle */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={toggleEditMode}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    editMode
                      ? 'bg-gray-200 dark:bg-gray-700 text-black dark:text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {editMode ? (
                    <>
                      <X className="w-4 h-4" />
                      Cancel Edit
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      Edit Info
                    </>
                  )}
                </button>
              </div>

              {/* Title */}
              <div className="mb-4 group">
                {editingTitle || editMode ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={editMode ? undefined : handleTitleBlur}
                    onKeyDown={editMode ? undefined : handleTitleKeyDown}
                    disabled={saving}
                    autoFocus={editingTitle && !editMode}
                    className={`w-full text-2xl md:text-3xl font-bold text-black dark:text-white
                             bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600
                             rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
                             disabled:opacity-50 disabled:cursor-not-allowed ${
                               editMode ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600' : ''
                             }`}
                    placeholder="Enter video title"
                  />
                ) : (
                  <div
                    onClick={() => !editMode && setEditingTitle(true)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50
                             rounded-lg px-3 py-2 -mx-3 transition-colors"
                  >
                    <h1 className="text-2xl md:text-3xl font-bold text-white flex-1">
                      {video.title}
                    </h1>
                    <Edit2 className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>

              {/* Platform Badge and Author */}
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center gap-1.5 ${getPlatformColor(
                    video.platform
                  )}`}
                >
                  {getPlatformIcon(video.platform)}
                  {video.platform.charAt(0).toUpperCase() + video.platform.slice(1)}
                </span>
                <span className="text-white font-medium">
                  {video.author}
                </span>
              </div>

              {/* Download Date */}
              <div className="flex items-center gap-2 text-sm text-white mb-4">
                <Calendar className="w-4 h-4" />
                <span>Downloaded {formatDate(video.downloadDate)}</span>
              </div>

              {/* File Size and Quality Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                  {formatFileSize(video.fileSize)}
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                  {video.quality}
                </span>
                <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium uppercase">
                  {video.format}
                </span>
              </div>

              {/* Description */}
              <div className="mb-4 group">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-white">
                    Description
                  </h3>
                </div>
                {editingDescription || editMode ? (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    onBlur={editMode ? undefined : handleDescriptionBlur}
                    onKeyDown={editMode ? undefined : handleDescriptionKeyDown}
                    disabled={saving}
                    autoFocus={editingDescription && !editMode}
                    rows={5}
                    className={`w-full text-black dark:text-white text-sm leading-relaxed
                             bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600
                             rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
                             disabled:opacity-50 disabled:cursor-not-allowed resize-y ${
                               editMode ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600' : ''
                             }`}
                    placeholder="Enter video description"
                  />
                ) : (
                  <div
                    onClick={() => !editMode && setEditingDescription(true)}
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50
                             rounded-lg px-3 py-2 -mx-3 transition-colors relative"
                  >
                    {video.description ? (
                      <>
                        <p
                          className={`text-white text-sm leading-relaxed ${
                            !showFullDescription && isDescriptionLong
                              ? 'line-clamp-3'
                              : ''
                          }`}
                        >
                          {video.description}
                        </p>
                        {isDescriptionLong && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFullDescription(!showFullDescription);
                            }}
                            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                          >
                            {showFullDescription ? 'Read less' : 'Read more'}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm italic">
                        No description. Click to add one.
                      </p>
                    )}
                    <Edit2 className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">
                    Tags
                  </h3>
                  {suggestedTags.length > 0 && editedTags.length < 10 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-xs text-gray-400">Suggestions:</span>
                      {suggestedTags.slice(0, 3).map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            if (!editedTags.includes(suggestion) && editedTags.length < 10) {
                              handleTagsChange([...editedTags, suggestion]);
                            }
                          }}
                          className="text-xs px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded-full hover:bg-purple-600/30 transition-colors"
                        >
                          + {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <TagAutocomplete
                  value={editedTags}
                  onChange={handleTagsChange}
                  maxTags={10}
                  placeholder="Add tags..."
                  className="w-full"
                />
                {editedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {editedTags.map((tag) => (
                      <TagPill
                        key={tag}
                        tag={tag}
                        onClick={() => handleTagClick(tag)}
                        size="sm"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Save All Changes Button (Edit Mode) */}
              {editMode && (
                <div className="mb-4">
                  <button
                    onClick={handleSaveAllChanges}
                    disabled={saving || !editedTitle.trim()}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold
                             rounded-lg transition-colors duration-200 flex items-center justify-center gap-2
                             shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                             disabled:hover:bg-green-600"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save All Changes
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                {/* Export Dropdown */}
                <div className="flex-1 relative" ref={exportMenuRef}>
                  <button
                    onClick={handleExportVideo}
                    disabled={editMode || exporting}
                    className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                             rounded-lg transition-colors duration-200 flex items-center justify-center gap-2
                             shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed
                             disabled:hover:bg-blue-600"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        Export Video
                      </>
                    )}
                  </button>

                  {/* Dropdown Toggle Button */}
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={editMode || exporting}
                    className="absolute right-0 top-0 bottom-0 px-3 bg-blue-700 hover:bg-blue-800
                             text-white rounded-r-lg transition-colors duration-200
                             disabled:opacity-50 disabled:cursor-not-allowed border-l border-blue-500"
                    aria-label="Export options"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Export Options Menu */}
                  {showExportMenu && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800
                                  rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
                                  overflow-hidden z-50 animate-fadeIn"
                    >
                      <button
                        onClick={handleExportVideo}
                        disabled={exporting}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors duration-200 flex items-center gap-3
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <VideoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="font-medium text-white">
                            Export Video
                          </div>
                          <div className="text-xs text-gray-300">
                            Download as {video.format.toUpperCase()} file
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportAudio}
                        disabled={exporting || video.format !== 'mp4'}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors duration-200 flex items-center gap-3
                                 disabled:opacity-50 disabled:cursor-not-allowed border-t
                                 border-gray-200 dark:border-gray-700"
                      >
                        <AudioLines className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <div>
                          <div className="font-medium text-white">
                            Export as Audio
                          </div>
                          <div className="text-xs text-gray-300">
                            {video.format === 'mp4' ? 'Extract audio as MP3 (Advanced)' : 'Only available for MP4 videos'}
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={handleExportTranscript}
                        disabled={exporting || !transcript}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700
                                 transition-colors duration-200 flex items-center gap-3
                                 disabled:opacity-50 disabled:cursor-not-allowed border-t
                                 border-gray-200 dark:border-gray-700"
                      >
                        <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <div className="font-medium text-white">
                            Export Transcript
                          </div>
                          <div className="text-xs text-gray-300">
                            {transcript ? 'Download as TXT file' : 'No transcript available'}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowClipExtractor(true)}
                  disabled={editMode}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg
                           transition-colors duration-200 flex items-center justify-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-600"
                >
                  <Scissors className="w-5 h-5" />
                  Extract Clip
                </button>
                <button
                  onClick={handleShare}
                  disabled={editMode}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600
                           text-black dark:text-white font-semibold rounded-lg transition-colors
                           duration-200 flex items-center justify-center gap-2 disabled:opacity-50
                           disabled:cursor-not-allowed disabled:hover:bg-gray-200 dark:disabled:hover:bg-gray-700"
                >
                  <Share2 className="w-5 h-5" />
                  Share
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={editMode}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg
                           transition-colors duration-200 flex items-center justify-center gap-2
                           disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        videoTitle={video.title}
        videoDescription={video.description}
        videoUrl={video.url}
        shareUrl={window.location.href}
      />

      {/* Clip Extractor */}
      {showClipExtractor && (
        <ClipExtractor
          video={video}
          videoRef={videoRef}
          onClose={() => setShowClipExtractor(false)}
          onClipExtracted={(clipId) => {
            setShowClipExtractor(false);
            navigate(`/video/${clipId}`);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Video?"
        message={`This will permanently delete "${video.title}" from your library. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => {
          if (!deleting) {
            setShowDeleteModal(false);
          }
        }}
        danger={true}
        isLoading={deleting}
      />
    </div>
  );
};

export default VideoDetail;
