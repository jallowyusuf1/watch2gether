import { useState, useEffect, useRef, useMemo } from 'react';
import { Info, Copy, Download, Search, X } from 'lucide-react';

/**
 * Transcript segment with timestamp and text
 */
interface TranscriptSegment {
  timestamp: number; // in seconds
  text: string;
  formattedTime: string; // formatted as HH:MM:SS or MM:SS
}

/**
 * Props for TranscriptViewer component
 */
interface TranscriptViewerProps {
  transcript: string | null;
  currentTime: number; // current playback time in seconds
  onSeek: (time: number) => void; // callback to seek video to specific time
}

/**
 * Parse transcript text into segments
 * Supports formats like:
 * - [00:01:23] Text here
 * - [01:23] Text here
 * - 00:01:23 Text here
 * - 01:23 Text here
 */
const parseTranscript = (transcript: string): TranscriptSegment[] => {
  const segments: TranscriptSegment[] = [];
  
  // Split by lines
  const lines = transcript.split('\n').filter(line => line.trim());
  
  // Regex patterns for different timestamp formats
  const patterns = [
    // [HH:MM:SS] or [MM:SS]
    /\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s*(.+)/,
    // HH:MM:SS or MM:SS (without brackets)
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(.+)/,
  ];
  
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const hours = match[3] ? parseInt(match[1], 10) : 0;
        const minutes = match[3] ? parseInt(match[2], 10) : parseInt(match[1], 10);
        const seconds = match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10);
        const text = match[4] || match[match.length - 1];
        
        const timestamp = hours * 3600 + minutes * 60 + seconds;
        const formattedTime = match[3] 
          ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        segments.push({ timestamp, text: text.trim(), formattedTime });
        break;
      }
    }
  }
  
  // If no timestamps found, create a single segment
  if (segments.length === 0 && transcript.trim()) {
    segments.push({
      timestamp: 0,
      text: transcript.trim(),
      formattedTime: '00:00'
    });
  }
  
  return segments;
};

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Highlight search text in a string
 */
const highlightText = (text: string, searchQuery: string): React.ReactNode => {
  if (!searchQuery.trim()) {
    return text;
  }
  
  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-300 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

/**
 * Transcript Viewer Component
 * Displays video transcript with timestamps, search, and export functionality
 */
const TranscriptViewer = ({ transcript, currentTime, onSeek }: TranscriptViewerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);
  
  // Parse transcript into segments
  const segments = useMemo(() => {
    if (!transcript) return [];
    return parseTranscript(transcript);
  }, [transcript]);
  
  // Filter segments based on search query
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments;
    
    const query = searchQuery.toLowerCase();
    return segments.filter(segment => 
      segment.text.toLowerCase().includes(query)
    );
  }, [segments, searchQuery]);
  
  // Find current active segment based on currentTime
  const activeSegmentIndex = useMemo(() => {
    if (segments.length === 0) return -1;
    
    // Find the last segment whose timestamp is <= currentTime
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].timestamp <= currentTime) {
        return i;
      }
    }
    
    return 0;
  }, [segments, currentTime]);
  
  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const activeElement = activeSegmentRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      
      // Check if element is outside visible area
      const isAbove = elementRect.top < containerRect.top;
      const isBelow = elementRect.bottom > containerRect.bottom;
      
      if (isAbove || isBelow) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeSegmentIndex, currentTime]);
  
  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!transcript) return;
    
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };
  
  // Handle export transcript
  const handleExport = () => {
    if (!transcript) return;
    
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${new Date().getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // If no transcript, show message
  if (!transcript) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Info className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">Transcript not available for this video</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header with search and actions */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transcript..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                       rounded-lg transition-colors duration-200"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                       rounded-lg transition-colors duration-200"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
        
        {/* Search results count */}
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Found {filteredSegments.length} of {segments.length} segments
          </div>
        )}
      </div>
      
      {/* Transcript container */}
      <div
        ref={scrollContainerRef}
        className="max-h-96 overflow-y-auto p-4 space-y-1"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredSegments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No matching segments found</p>
          </div>
        ) : (
          filteredSegments.map((segment, index) => {
            const isActive = segments.indexOf(segment) === activeSegmentIndex;
            const segmentIndex = segments.indexOf(segment);
            
            return (
              <div
                key={`${segment.timestamp}-${index}`}
                ref={isActive ? activeSegmentRef : null}
                onClick={() => onSeek(segment.timestamp)}
                className={`
                  flex gap-4 p-3 rounded-lg cursor-pointer transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 shadow-sm' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-l-4 border-transparent'
                  }
                `}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSeek(segment.timestamp);
                  }
                }}
                aria-label={`Jump to ${segment.formattedTime}: ${segment.text.substring(0, 50)}...`}
              >
                {/* Timestamp */}
                <div className={`
                  font-mono text-sm flex-shrink-0 w-20
                  ${isActive 
                    ? 'text-blue-700 dark:text-blue-300 font-semibold' 
                    : 'text-gray-500 dark:text-gray-400'
                  }
                `}
                >
                  {segment.formattedTime}
                </div>
                
                {/* Text */}
                <div className={`
                  flex-1 text-sm leading-relaxed
                  ${isActive 
                    ? 'text-gray-900 dark:text-gray-100' 
                    : 'text-gray-700 dark:text-gray-300'
                  }
                `}
                >
                  {highlightText(segment.text, searchQuery)}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Footer with segment count */}
      <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {segments.length} transcript segment{segments.length !== 1 ? 's' : ''}
          {searchQuery && ` • ${filteredSegments.length} matching`}
        </p>
      </div>
    </div>
  );
};

export default TranscriptViewer;

