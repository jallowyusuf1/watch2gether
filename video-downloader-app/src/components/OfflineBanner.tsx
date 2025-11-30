import { useOffline } from '../hooks/useOffline';
import { WifiOff, Wifi, X } from 'lucide-react';
import { useState } from 'react';

export const OfflineBanner = () => {
  const { isOffline, wasOffline } = useOffline();
  const [dismissed, setDismissed] = useState(false);

  if (!isOffline && !wasOffline) return null;
  if (dismissed && !isOffline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isOffline || wasOffline ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div
        className={`${
          isOffline
            ? 'bg-red-600 dark:bg-red-800'
            : 'bg-green-600 dark:bg-green-800'
        } text-white px-4 py-3 shadow-lg`}
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOffline ? (
              <WifiOff className="w-5 h-5" />
            ) : (
              <Wifi className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isOffline
                ? 'You are offline. Downloaded videos are still available.'
                : 'Connection restored! You are back online.'}
            </span>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

