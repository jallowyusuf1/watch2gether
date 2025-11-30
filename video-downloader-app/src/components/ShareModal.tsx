import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Link as LinkIcon,
  Share2,
  Mail,
  Download,
  QrCode,
  Check,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoTitle: string;
  videoDescription: string;
  videoUrl: string;
  shareUrl?: string; // URL to share (defaults to current page URL)
}

const ShareModal = ({
  isOpen,
  onClose,
  videoTitle,
  videoDescription,
  videoUrl,
  shareUrl,
}: ShareModalProps) => {
  const { showSuccess, showError } = useNotifications();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrCodeRef = useRef<HTMLDivElement>(null);

  // Use current page URL as share URL if not provided
  const urlToShare = shareUrl || window.location.href;

  if (!isOpen) return null;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      showSuccess('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      showError('Failed to copy link. Please try again.');
    }
  };

  // Web Share API
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: videoTitle,
          text: videoDescription,
          url: urlToShare,
        });
      } catch (error) {
        // User cancelled or error occurred
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  // Social media sharing
  const handleTwitterShare = () => {
    const text = encodeURIComponent(`${videoTitle}\n\n`);
    const url = encodeURIComponent(urlToShare);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const handleFacebookShare = () => {
    const url = encodeURIComponent(urlToShare);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`${videoTitle}\n${urlToShare}`);
    window.open(
      `https://wa.me/?text=${text}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(urlToShare);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      '_blank',
      'noopener,noreferrer,width=600,height=400'
    );
  };

  const handleRedditShare = () => {
    const url = encodeURIComponent(urlToShare);
    const title = encodeURIComponent(videoTitle);
    window.open(
      `https://reddit.com/submit?url=${url}&title=${title}`,
      '_blank',
      'noopener,noreferrer,width=800,height=600'
    );
  };

  // Email sharing
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Check out: ${videoTitle}`);
    const body = encodeURIComponent(
      `I thought you might be interested in this video:\n\n${videoTitle}\n\n${videoDescription}\n\nWatch it here: ${urlToShare}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Download QR code
  const handleDownloadQR = () => {
    if (!qrCodeRef.current) return;

    const svg = qrCodeRef.current.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${videoTitle.replace(/[^a-z0-9]/gi, '_')}_qr_code.png`;
        link.click();
        URL.revokeObjectURL(blobUrl);
      });

      URL.revokeObjectURL(url);
    };

    img.src = url;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Share Video
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* QR Code Section */}
          {showQR ? (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">QR Code</h4>
                <button
                  onClick={() => setShowQR(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Back to options
                </button>
              </div>
              <div
                ref={qrCodeRef}
                className="bg-white p-6 rounded-lg border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center"
              >
                <QRCodeSVG
                  value={urlToShare}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                Scan this code to open the video
              </p>
              <button
                onClick={handleDownloadQR}
                className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold
                         rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download QR Code
              </button>
            </div>
          ) : (
            <>
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="w-full mb-3 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600
                         rounded-lg transition-colors duration-200 flex items-center gap-3 text-left"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <LinkIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {copied ? 'Copied!' : 'Copy Link'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Copy video URL to clipboard
                  </div>
                </div>
              </button>

              {/* Native Share (if available) */}
              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full mb-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <Share2 className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Share via...</div>
                    <div className="text-xs opacity-90">Use native share sheet</div>
                  </div>
                </button>
              )}

              {/* Social Media Options */}
              <div className="space-y-2 mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Share on social media
                </p>

                {/* Twitter */}
                <button
                  onClick={handleTwitterShare}
                  className="w-full px-4 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Twitter</div>
                    <div className="text-xs opacity-90">Share on Twitter</div>
                  </div>
                </button>

                {/* Facebook */}
                <button
                  onClick={handleFacebookShare}
                  className="w-full px-4 py-3 bg-[#1877F2] hover:bg-[#166FE5] text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Facebook</div>
                    <div className="text-xs opacity-90">Share on Facebook</div>
                  </div>
                </button>

                {/* WhatsApp */}
                <button
                  onClick={handleWhatsAppShare}
                  className="w-full px-4 py-3 bg-[#25D366] hover:bg-[#22c55e] text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">WhatsApp</div>
                    <div className="text-xs opacity-90">Share via WhatsApp</div>
                  </div>
                </button>

                {/* LinkedIn */}
                <button
                  onClick={handleLinkedInShare}
                  className="w-full px-4 py-3 bg-[#0A66C2] hover:bg-[#095196] text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">LinkedIn</div>
                    <div className="text-xs opacity-90">Share on LinkedIn</div>
                  </div>
                </button>

                {/* Reddit */}
                <button
                  onClick={handleRedditShare}
                  className="w-full px-4 py-3 bg-[#FF4500] hover:bg-[#e63e00] text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                  </svg>
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Reddit</div>
                    <div className="text-xs opacity-90">Share on Reddit</div>
                  </div>
                </button>
              </div>

              {/* Email and QR Code */}
              <div className="space-y-2">
                <button
                  onClick={handleEmailShare}
                  className="w-full px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <Mail className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Share via Email</div>
                    <div className="text-xs opacity-90">Open email client</div>
                  </div>
                </button>

                <button
                  onClick={() => setShowQR(true)}
                  className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white
                           rounded-lg transition-colors duration-200 flex items-center gap-3"
                >
                  <QrCode className="w-5 h-5" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Generate QR Code</div>
                    <div className="text-xs opacity-90">Create scannable QR code</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
