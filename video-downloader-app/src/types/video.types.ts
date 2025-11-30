/**
 * Video platform types
 */
export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok';

/**
 * Video format types
 */
export type VideoFormat = 'mp4' | 'mp3';

/**
 * Download status types
 */
export type DownloadStatus = 'pending' | 'downloading' | 'processing' | 'completed' | 'failed';

/**
 * Video interface representing a downloaded video with all metadata
 */
export interface Video {
  /** Unique identifier for the video */
  id: string;
  /** Original video URL */
  url: string;
  /** Platform where the video is from */
  platform: VideoPlatform;
  /** Video title */
  title: string;
  /** Video description or caption */
  description: string;
  /** Base64 encoded image or blob URL for thumbnail */
  thumbnail: string;
  /** Duration in seconds */
  duration: number;
  /** Channel name or username */
  author: string;
  /** Date when the video was downloaded */
  downloadDate: Date;
  /** File size in bytes */
  fileSize: number;
  /** Video quality (e.g., '1080p', '720p', '480p') */
  quality: string;
  /** Video format */
  format: VideoFormat;
  /** Actual video file data as Blob */
  videoBlob: Blob;
  /** Video captions/transcript, null if not available */
  transcript: string | null;
  /** User-added categories/tags */
  tags: string[];
}

/**
 * Download progress interface for tracking download status
 */
export interface DownloadProgress {
  /** Video ID being downloaded */
  videoId: string;
  /** Download progress percentage (0-100) */
  progress: number;
  /** Current download status */
  status: DownloadStatus;
  /** Error message if download failed */
  error?: string;
}

/**
 * Video metadata interface for initial video information before download
 */
export interface VideoMetadata {
  /** Original video URL */
  url: string;
  /** Platform where the video is from */
  platform: VideoPlatform;
  /** Video title */
  title: string;
  /** Base64 encoded image or blob URL for thumbnail */
  thumbnail: string;
  /** Duration in seconds */
  duration: number;
  /** Channel name or username */
  author: string;
}

/**
 * Quality option interface for available video quality settings
 */
export interface QualityOption {
  /** Resolution label (e.g., '1080p', '720p', '480p') */
  resolution: string;
  /** Video width in pixels */
  width: number;
  /** Video height in pixels */
  height: number;
  /** Estimated file size in bytes (based on duration and bitrate) */
  fileSize: number;
  /** Video bitrate in kbps */
  bitrate: number;
  /** Whether this quality is available for the current video */
  available: boolean;
  /** Whether this is the recommended quality */
  recommended?: boolean;
  /** Quality description (e.g., 'Full HD', 'HD', 'SD') */
  label?: string;
}

/**
 * Collection color theme type
 */
export type CollectionColorTheme =
  | 'purple'
  | 'blue'
  | 'green'
  | 'red'
  | 'yellow'
  | 'pink'
  | 'indigo'
  | 'orange';

/**
 * Smart collection rule type
 */
export type SmartCollectionRuleType = 'platform' | 'tag' | 'author' | 'quality';

/**
 * Smart collection rule interface
 */
export interface SmartCollectionRule {
  /** Type of rule */
  type: SmartCollectionRuleType;
  /** Value to match */
  value: string;
  /** Operator (equals, contains, etc.) */
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith';
}

/**
 * Collection interface for organizing videos into playlists
 */
export interface Collection {
  /** Unique identifier for the collection */
  id: string;
  /** Collection name */
  name: string;
  /** Optional description */
  description?: string;
  /** Thumbnail URL (uses first video's thumbnail) */
  thumbnail?: string;
  /** Array of video IDs in this collection */
  videoIds: string[];
  /** Date when collection was created */
  createdDate: Date;
  /** Last modified date */
  modifiedDate: Date;
  /** Color theme for the collection */
  colorTheme: CollectionColorTheme;
  /** Whether this is a smart collection */
  isSmart: boolean;
  /** Smart collection rules (if isSmart is true) */
  smartRules?: SmartCollectionRule[];
  /** Parent collection ID for nested collections */
  parentId?: string;
  /** Order of videos in collection */
  videoOrder?: string[];
}

/**
 * Collection statistics interface
 */
export interface CollectionStats {
  /** Total number of videos */
  totalVideos: number;
  /** Total size in bytes */
  totalSize: number;
  /** Total duration in seconds */
  totalDuration: number;
  /** Platforms represented */
  platforms: VideoPlatform[];
}
