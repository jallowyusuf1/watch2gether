import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Database,
  Palette,
  Shield,
  Wrench,
  Trash2,
  FileDown,
  FileUp,
  HardDrive,
  Moon,
  Sun,
  Monitor,
  Globe,
  LayoutGrid,
  Zap,
  Bug,
  Save,
  RotateCcw,
  AlertTriangle,
  Check,
  Info,
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { storageService } from '../services/storageService';
import ConfirmModal from '../components/ConfirmModal';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, updateSetting, resetSettings, clearAllData, exportSettings, importSettings } = useSettings();

  const [storageUsed, setStorageUsed] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load storage stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const total = await storageService.getTotalStorageUsed();
        const videos = await storageService.getAllVideos();
        setStorageUsed(total);
        setVideoCount(videos.length);
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      }
    };

    loadStats();

    // Refresh stats every 10 seconds
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  // Show toast message
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  // Format bytes to human-readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // Clear all downloads
  const handleClearAllDownloads = async () => {
    try {
      setClearing(true);
      const videos = await storageService.getAllVideos();

      for (const video of videos) {
        await storageService.deleteVideo(video.id);
      }

      setStorageUsed(0);
      setVideoCount(0);
      setShowClearModal(false);
      showToast('success', 'All downloads cleared successfully');
    } catch (error) {
      console.error('Failed to clear downloads:', error);
      showToast('error', 'Failed to clear downloads. Please try again.');
    } finally {
      setClearing(false);
    }
  };

  // Clear all data and reset app
  const handleClearAllData = async () => {
    try {
      setClearing(true);
      await clearAllData();
    } catch (error) {
      console.error('Failed to clear all data:', error);
      showToast('error', 'Failed to clear all data. Please try again.');
      setClearing(false);
    }
  };

  // Export all data
  const handleExportAllData = async () => {
    try {
      const videos = await storageService.getAllVideos();
      const data = {
        settings,
        videos: videos.map((v) => ({
          ...v,
          videoBlob: undefined, // Don't export blobs
          downloadDate: v.downloadDate.toISOString(),
        })),
        exportDate: new Date().toISOString(),
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `video-downloader-data-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      showToast('success', 'Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      showToast('error', 'Failed to export data. Please try again.');
    }
  };

  // Export settings
  const handleExportSettings = () => {
    const json = exportSettings();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-downloader-settings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Settings exported successfully');
  };

  // Import settings
  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const success = importSettings(text);
          if (success) {
            showToast('success', 'Settings imported successfully');
          } else {
            showToast('error', 'Invalid settings file');
          }
        } catch (error) {
          showToast('error', 'Failed to import settings');
        }
      }
    };
    input.click();
  };

  // Export logs
  const handleExportLogs = () => {
    // In a real app, you'd collect actual logs
    const logs = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      settings,
      storageUsed,
      videoCount,
      // Add more debug info as needed
    };

    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-downloader-logs-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Logs exported successfully');
  };

  return (
    <div className="min-h-screen text-white relative overflow-hidden pb-20">
      <div className="relative z-10 pt-8">
        {/* Header */}
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-gray-300" />
            </button>
            <h1 className="text-3xl font-bold text-white">Settings</h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Download Preferences */}
          <section className="bubble-card-no-tilt p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-600/30 rounded-lg border border-purple-500/20">
                <Download className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Download Preferences</h2>
            </div>

            <div className="space-y-6">
              {/* Default Quality */}
              <div>
                <label htmlFor="default-quality" className="block text-sm font-medium text-gray-200 mb-2">
                  Default Video Quality
                </label>
                <select
                  id="default-quality"
                  value={settings.defaultQuality}
                  onChange={(e) => updateSetting('defaultQuality', e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-purple-500/20 rounded-lg bg-purple-900/30 backdrop-blur-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="2160p">2160p (4K Ultra HD)</option>
                  <option value="1440p">1440p (2K Quad HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="720p">720p (HD)</option>
                  <option value="480p">480p (SD)</option>
                  <option value="360p">360p (Low)</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  This will be the default selection when downloading videos
                </p>
              </div>

              {/* Default Format */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                  Default Format
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="default-format"
                      value="mp4"
                      checked={settings.defaultFormat === 'mp4'}
                      onChange={(e) => updateSetting('defaultFormat', e.target.value as any)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span className="text-gray-200 font-medium group-hover:text-purple-400 transition-colors">
                      MP4 (Video)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="radio"
                      name="default-format"
                      value="mp3"
                      checked={settings.defaultFormat === 'mp3'}
                      onChange={(e) => updateSetting('defaultFormat', e.target.value as any)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                    />
                    <span className="text-gray-200 font-medium group-hover:text-purple-400 transition-colors">
                      MP3 (Audio Only)
                    </span>
                  </label>
                </div>
              </div>

              {/* Auto-generate Transcripts */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="auto-transcripts" className="block text-sm font-medium text-gray-200">
                    Auto-generate Transcripts
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Automatically generate transcripts for downloaded videos (requires YouTube API)
                  </p>
                </div>
                <button
                  id="auto-transcripts"
                  onClick={() => updateSetting('autoGenerateTranscripts', !settings.autoGenerateTranscripts)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoGenerateTranscripts
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoGenerateTranscripts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  />
                </button>
              </div>

              {/* Download Location Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Download Location
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                      Your browser controls where files are saved. Videos are stored in your browser's default download folder. You can change this in your browser settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Storage Management */}
          <section className="bubble-card-no-tilt p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Storage Management</h2>
            </div>

            <div className="space-y-6">
              {/* Storage Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-200">
                    Storage Used
                  </label>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatBytes(storageUsed)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                    style={{ width: `${Math.min((storageUsed / (5 * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>{videoCount} videos stored</span>
                  <span>Estimated limit: ~5 GB</span>
                </div>
              </div>

              {/* Storage Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-start gap-3">
                  <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-200">
                    <p className="font-medium mb-1">About Storage Limits</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      Videos are stored locally in your browser's IndexedDB. The actual limit depends on your browser and available disk space. Most browsers allow several GB of storage per site.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearModal(true)}
                  className="flex-1 py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All Downloads
                </button>
                <button
                  onClick={handleExportAllData}
                  className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileDown className="w-5 h-5" />
                  Export All Data
                </button>
              </div>
            </div>
          </section>

          {/* Interface Preferences */}
          <section className="bubble-card-no-tilt p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Palette className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Interface Preferences</h2>
            </div>

            <div className="space-y-6">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                  Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => updateSetting('theme', 'light')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                    settings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  >
                    <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                    <span className="text-sm font-medium text-gray-200">Light</span>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'dark')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                    settings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  >
                    <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-200">Dark</span>
                  </button>
                  <button
                    onClick={() => updateSetting('theme', 'auto')}
                    className={`p-4 border-2 rounded-lg transition-all ${
                    settings.theme === 'auto'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                  }`}
                  >
                    <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-200">Auto</span>
                  </button>
                </div>
              </div>

              {/* Language */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-200 mb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Language
                  </div>
                </label>
                <select
                  id="language"
                  value={settings.language}
                  onChange={(e) => updateSetting('language', e.target.value as any)}
                  className="w-full px-4 py-2 border-2 border-purple-500/20 rounded-lg bg-purple-900/30 backdrop-blur-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="en">English</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  More languages coming soon
                </p>
              </div>

              {/* Compact View */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="compact-view" className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    <LayoutGrid className="w-4 h-4" />
                    Compact View
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Show more videos on the downloads page with smaller cards
                  </p>
                </div>
                <button
                  id="compact-view"
                  onClick={() => updateSetting('compactView', !settings.compactView)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.compactView
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.compactView ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Privacy & Data */}
          <section className="bubble-card-no-tilt p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Privacy & Data</h2>
            </div>

            <div className="space-y-6">
              {/* Privacy Info */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold text-white mb-3">What data is stored locally?</h3>
                <ul className="space-y-2 text-sm text-gray-200">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Videos:</strong> Downloaded video files and metadata (title, description, etc.)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Transcripts:</strong> Video transcripts if generated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Settings:</strong> Your preferences and app configuration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span><strong>Tags:</strong> Custom tags you add to videos</span>
                  </li>
                </ul>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  All data is stored locally in your browser. Nothing is sent to external servers except when downloading videos from their original sources.
                </p>
              </div>

              {/* Clear All Data */}
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Danger Zone
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                      This will permanently delete all videos, settings, and data. This action cannot be undone.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="w-full py-3 px-6 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  Clear All Data & Reset App
                </button>
              </div>
            </div>
          </section>

          {/* Advanced */}
          <section className="bubble-card-no-tilt p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Wrench className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Advanced</h2>
            </div>

            <div className="space-y-6">
              {/* Experimental Features */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="experimental" className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    <Zap className="w-4 h-4" />
                    Experimental Features
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enable beta features that may be unstable
                  </p>
                </div>
                <button
                  id="experimental"
                  onClick={() => updateSetting('experimentalFeatures', !settings.experimentalFeatures)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.experimentalFeatures
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.experimentalFeatures ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  />
                </button>
              </div>

              {/* Developer Mode */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="developer-mode" className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    <Bug className="w-4 h-4" />
                    Developer Mode
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Show additional debug information and console logs
                  </p>
                </div>
                <button
                  id="developer-mode"
                  onClick={() => updateSetting('developerMode', !settings.developerMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.developerMode
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.developerMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                  />
                </button>
              </div>

              {/* Export/Import Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-3">
                  Settings Management
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportSettings}
                    className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Export Settings
                  </button>
                  <button
                    onClick={handleImportSettings}
                    className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <FileUp className="w-4 h-4" />
                    Import Settings
                  </button>
                </div>
              </div>

              {/* Export Logs */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Debug Tools
                </label>
                <button
                  onClick={handleExportLogs}
                  className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export Debug Logs
                </button>
              </div>

              {/* Reset Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">
                  Reset Settings
                </label>
                <button
                  onClick={resetSettings}
                  className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Toast */}
        {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
          <div className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

        {/* Clear All Downloads Modal */}
        <ConfirmModal
          isOpen={showClearModal}
          title="Clear All Downloads?"
          message="This will permanently delete all downloaded videos and their data. This action cannot be undone."
          confirmText={clearing ? 'Clearing...' : 'Clear All'}
          cancelText="Cancel"
          onConfirm={handleClearAllDownloads}
          onCancel={() => setShowClearModal(false)}
          danger={true}
          isLoading={clearing}
        />

        {/* Reset App Modal */}
        <ConfirmModal
          isOpen={showResetModal}
          title="Clear All Data & Reset App?"
          message="This will permanently delete ALL data including videos, settings, and preferences. The app will reload after clearing. This action cannot be undone."
          confirmText={clearing ? 'Resetting...' : 'Reset Everything'}
          cancelText="Cancel"
          onConfirm={handleClearAllData}
          onCancel={() => setShowResetModal(false)}
          danger={true}
          isLoading={clearing}
        />
      </div>
    </div>
  );
};

export default Settings;
