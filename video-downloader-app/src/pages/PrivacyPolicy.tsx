import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, FileX } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const lastUpdated = new Date('2024-01-15').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-600/30 backdrop-blur-sm rounded-xl border border-purple-500/20">
              <Shield className="w-8 h-8 text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white">
                Privacy Policy
              </h1>
              <p className="text-gray-300 mt-2">
                Last updated: {lastUpdated}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl space-y-8">
          {/* Introduction */}
          <section className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Introduction
            </h2>
            <p className="text-gray-200 leading-relaxed">
              At Video Downloader, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your information when you use our video downloading service. We are committed to ensuring your data remains private and secure.
            </p>
          </section>

          {/* Data Collection */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-white">
                Data Collection
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  What We Don't Collect
                </h3>
                <ul className="list-disc list-inside space-y-2 text-gray-300">
                  <li>We do not collect personal information such as names, email addresses, or phone numbers</li>
                  <li>We do not track your browsing history or online behavior</li>
                  <li>We do not share your data with third parties</li>
                  <li>We do not use cookies for tracking purposes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Local Storage Only
                </h3>
                <p className="text-gray-300">
                  All downloaded videos and their metadata are stored locally in your browser using IndexedDB. This means:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 mt-2">
                  <li>Your videos are stored on your device only</li>
                  <li>No data is transmitted to our servers</li>
                  <li>You have full control over your downloaded content</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Data */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h2 className="text-2xl font-bold text-white">
                How We Use Your Data
              </h2>
            </div>
            <p className="text-gray-300 mb-4">
              Since all data is stored locally, we don't have access to your information. However, here's what happens with your data:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
              <li>Videos are processed entirely in your browser using client-side technologies</li>
              <li>Metadata (titles, descriptions, etc.) is stored locally for your convenience</li>
              <li>Transcripts are generated using your browser's Web Speech API</li>
              <li>No information leaves your device during the download or processing process</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h2 className="text-2xl font-bold text-white">
                Data Security
              </h2>
            </div>
            <div className="space-y-4">
              <p className="text-gray-300">
                We implement several security measures to protect your data:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-300">
                <li><strong>Local Storage:</strong> All data is stored in your browser's IndexedDB, which is sandboxed and secure</li>
                <li><strong>No Server Transmission:</strong> Videos and metadata never leave your device</li>
                <li><strong>HTTPS:</strong> If deployed, the application uses secure HTTPS connections</li>
                <li><strong>Browser Security:</strong> We rely on your browser's built-in security features</li>
              </ul>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Third-Party Services
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300">
                Our application may interact with the following services:
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  YouTube Data API
                </h3>
                <p className="text-sm text-gray-300">
                  We use YouTube's Data API to fetch video metadata. This is done through a backend proxy server that you control. No personal data is shared with YouTube beyond what's necessary to retrieve public video information.
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  TikTok Content
                </h3>
                <p className="text-sm text-gray-300">
                  TikTok video access is handled through a backend proxy. We only access publicly available video content and do not collect any personal information from TikTok.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Your Rights
            </h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <FileX className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    Delete Your Data
                  </h3>
                  <p className="text-sm text-gray-300">
                    You can delete any downloaded video or transcript at any time through the application interface. Deleted data is permanently removed from your browser's storage.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    Export Your Data
                  </h3>
                  <p className="text-sm text-gray-300">
                    You can export your videos and transcripts at any time. All data belongs to you and can be downloaded or removed as you see fit.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white mb-1">
                    No Tracking
                  </h3>
                  <p className="text-sm text-gray-300">
                    We don't track your usage, collect analytics, or monitor your behavior. Your privacy is our priority.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="bg-purple-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
            <h2 className="text-2xl font-bold text-white mb-4">
              Changes to This Privacy Policy
            </h2>
            <p className="text-gray-300">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last updated" date. We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-8 border-2 border-blue-200 dark:border-blue-800">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Questions About Privacy?
            </h2>
            <p className="text-gray-300 mb-4">
              If you have any questions or concerns about this Privacy Policy or our data practices, please contact us.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Contact Us
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

