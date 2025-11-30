import { Check, Info } from 'lucide-react';
import type { QualityOption } from '../types';

interface QualityCardProps {
  quality: QualityOption;
  selected: boolean;
  onSelect: () => void;
  duration?: number;
}

/**
 * Format file size to human-readable format
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

/**
 * Estimate download time based on file size and average internet speed
 * Assumes average speed of 10 Mbps (1.25 MB/s)
 */
const estimateDownloadTime = (bytes: number): string => {
  const avgSpeedMBps = 1.25; // 10 Mbps in MB/s
  const megabytes = bytes / (1024 * 1024);
  const seconds = megabytes / avgSpeedMBps;

  if (seconds < 1) return '< 1s';
  if (seconds < 60) return `~${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 1) return `~${remainingSeconds}s`;
  return remainingSeconds > 0 ? `~${minutes}m ${remainingSeconds}s` : `~${minutes}m`;
};

export const QualityCard = ({ quality, selected, onSelect, duration }: QualityCardProps) => {
  const { resolution, width, height, fileSize, label, recommended } = quality;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative w-full p-4 rounded-xl border-2 text-left transition-all
        ${selected
          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm'
        }
      `}
    >
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-3 right-3 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Recommended badge */}
      {recommended && (
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
          Recommended
        </div>
      )}

      {/* Quality info */}
      <div className={`${recommended ? 'mt-6' : ''}`}>
        {/* Resolution and label */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {resolution}
          </span>
          {label && (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {label}
            </span>
          )}
        </div>

        {/* Dimensions */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {width} × {height} pixels
        </div>

        {/* File size and download time */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">File size: </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatFileSize(fileSize)}
            </span>
          </div>

          {fileSize > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <div>
                <span className="text-gray-600 dark:text-gray-400">~</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {estimateDownloadTime(fileSize)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Additional info for selected quality */}
        {selected && (
          <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
            <div className="flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>
                This quality offers the best balance between file size and video clarity.
              </span>
            </div>
          </div>
        )}
      </div>
    </button>
  );
};
