import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Zap, Shield, CheckCircle, Youtube, Music } from 'lucide-react';

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden pt-24">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950 via-black to-black"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 md:px-8 py-12 md:py-20">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            How It Works
          </h1>
          <p className="text-lg text-gray-200 max-w-3xl">
            Learn how to download videos from YouTube and TikTok, save them offline, and generate transcripts with our easy-to-use video downloader.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-8 mb-16">
          {/* Step 1 */}
          <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-400">1</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Download className="w-6 h-6 text-purple-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Enter Video URL
                  </h2>
                </div>
                <p className="text-gray-200 mb-4">
                  Copy the URL of any YouTube or TikTok video you want to download. You can paste it in the download form on the Dashboard or Home page.
                </p>
                <div className="bg-purple-900/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-sm font-mono text-gray-200">
                    Example URLs:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <li>• YouTube: youtube.com/watch?v=VIDEO_ID</li>
                    <li>• YouTube Shorts: youtube.com/shorts/VIDEO_ID</li>
                    <li>• TikTok: tiktok.com/@username/video/VIDEO_ID</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">2</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Choose Quality & Format
                  </h2>
                </div>
                <p className="text-gray-200 mb-4">
                  Select your preferred video quality (1080p, 720p, 480p, or 360p) and format (MP4 for video or MP3 for audio only).
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-white mb-2">Video Quality</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• 1080p - Full HD (Best quality)</li>
                      <li>• 720p - HD (Recommended)</li>
                      <li>• 480p - SD (Smaller file size)</li>
                      <li>• 360p - Low (Smallest file size)</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-white mb-2">Format Options</h3>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• MP4 - Full video with audio</li>
                      <li>• MP3 - Audio only (extracted)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">3</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Download & Save
                  </h2>
                </div>
                <p className="text-gray-200 mb-4">
                  Click the Download button and watch the progress. Your video will be automatically saved to your library and stored locally in your browser.
                </p>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-200">
                    <strong>Note:</strong> All videos are stored locally in your browser using IndexedDB. They won't be uploaded to any server, ensuring your privacy and security.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">4</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  <h2 className="text-2xl font-bold text-white">
                    Generate Transcripts
                  </h2>
                </div>
                <p className="text-gray-200 mb-4">
                  After downloading, you can generate transcripts for your videos using the Web Speech API. Transcripts are automatically saved and can be viewed, searched, and exported.
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Youtube className="w-4 h-4" />
                    <span>YouTube</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Music className="w-4 h-4" />
                    <span>TikTok</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 mb-16">
          <h2 className="text-3xl font-bold text-white mb-6">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Privacy First
                </h3>
                <p className="text-sm text-gray-300">
                  All processing happens locally in your browser. No data is sent to external servers.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Fast Downloads
                </h3>
                <p className="text-sm text-gray-300">
                  Optimized download process with real-time progress tracking.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Download className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Batch Downloads
                </h3>
                <p className="text-sm text-gray-300">
                  Download multiple videos at once with our batch download feature.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Auto Transcripts
                </h3>
                <p className="text-sm text-gray-300">
                  Automatically generate and save transcripts for all your videos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Start Downloading Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;

