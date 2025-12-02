import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle, Download, FileText, Tag, Share2, Settings, Search, Play, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { settings } = useSettings();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const features = [
    {
      icon: Download,
      title: 'Downloading Videos',
      description: 'Paste a YouTube or TikTok URL in the download form and select your preferred quality and format.',
      steps: [
        'Go to Dashboard or Home page',
        'Paste video URL in the input field',
        'Select quality (1080p, 720p, etc.)',
        'Choose format (MP4 video or MP3 audio)',
        'Click Download button',
      ],
    },
    {
      icon: Play,
      title: 'Playing Videos',
      description: 'Click on any video card to open the video player with custom controls.',
      steps: [
        'Click on a video card',
        'Use play/pause button or spacebar',
        'Seek using progress bar or arrow keys',
        'Adjust volume with slider',
        'Press F for fullscreen',
      ],
    },
    {
      icon: Tag,
      title: 'Tags & Collections',
      description: 'Organize your videos with tags and create collections for easy access.',
      steps: [
        'Click on a video to open details',
        'Add tags in the tags section',
        'Create collections from Tags page',
        'Filter videos by tags or collections',
      ],
    },
    {
      icon: Search,
      title: 'Search & Filter',
      description: 'Quickly find videos using search or filter by platform, date, or tags.',
      steps: [
        'Use search bar to find by title/description',
        'Filter by platform (YouTube/TikTok)',
        'Sort by date, title, or duration',
        'Filter by tags using sidebar',
      ],
    },
    {
      icon: Share2,
      title: 'Sharing & Exporting',
      description: 'Share videos or export them to your device.',
      steps: [
        'Click on video menu (three dots)',
        'Select Export to download to device',
        'Use Share to generate QR code or link',
        'Export multiple videos as ZIP',
      ],
    },
    {
      icon: FileText,
      title: 'Transcripts',
      description: 'Generate and view transcripts for your videos.',
      steps: [
        'Go to Transcripts page',
        'Paste video URL or click Generate on video',
        'Search within transcript',
        'Export transcript as text file',
      ],
    },
    {
      icon: Settings,
      title: 'Settings',
      description: 'Customize your app experience.',
      steps: [
        'Change default download quality',
        'Switch between light/dark theme',
        'Manage storage and clear data',
        'Export/import settings',
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={prefersReducedMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 
                     md:max-w-4xl md:max-h-[90vh] w-full bg-gray-900 rounded-2xl shadow-2xl z-50 
                     overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Help & Guide</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close help"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bubble-card p-6"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-purple-500/20 rounded-lg flex-shrink-0">
                        <Icon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-300 mb-4">{feature.description}</p>
                        <ol className="list-decimal list-inside space-y-2 text-gray-300">
                          {feature.steps.map((step, i) => (
                            <li key={i} className="pl-2">{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-800/50">
              <p className="text-sm text-gray-400 text-center">
                Need more help? Check out the{' '}
                <button
                  onClick={() => {
                    onClose();
                    // Navigate to how-it-works page
                    window.location.href = '/how-it-works';
                  }}
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  How It Works
                </button>{' '}
                page for detailed information.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

