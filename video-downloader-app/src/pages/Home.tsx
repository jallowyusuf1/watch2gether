import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  ArrowRight,
  Sparkles,
  Youtube,
  Music,
  Zap,
  Shield,
  CheckCircle,
} from 'lucide-react';
import VideoCard from '../components/VideoCard';
import { storageService } from '../services/storageService';
import { useSettings } from '../contexts/SettingsContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { Video } from '../types';

const Home = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { showSuccess, showError } = useNotifications();
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [visibleElements, setVisibleElements] = useState<Set<string>>(new Set());
  
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const videosRef = useRef<HTMLDivElement>(null);
  const aboutRef = useRef<HTMLDivElement>(null);

  // Load recent videos
  useEffect(() => {
    const loadRecentVideos = async () => {
      try {
        setLoadingRecent(true);
        const allVideos = await storageService.getAllVideos();
        setRecentVideos(allVideos.slice(0, 6));
      } catch (error) {
        console.error('Error loading recent videos:', error);
      } finally {
        setLoadingRecent(false);
      }
    };

    loadRecentVideos();
  }, []);

  // Intersection Observer for scroll animations - works both up and down
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '100px', // Increased margin for earlier trigger
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const id = entry.target.getAttribute('data-section-id');
        if (id) {
          if (entry.isIntersecting) {
            // Element is visible - animate in
            setVisibleElements((prev) => new Set(prev).add(id));
            entry.target.classList.add('visible');
            entry.target.classList.remove('scroll-hidden');
          } else {
            // Element is not visible - reset for re-animation when scrolling back
            // Only remove visible class, keep the element in observer
            entry.target.classList.remove('visible');
            entry.target.classList.add('scroll-hidden');
          }
        }
      });
    }, observerOptions);

    const elements = document.querySelectorAll('.scroll-animate');
    elements.forEach((el) => {
      // Initialize all elements as hidden
      el.classList.add('scroll-hidden');
      observer.observe(el);
    });

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);


  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero Section */}
      <div
        ref={heroRef}
        className="container mx-auto px-4 md:px-8 pt-24 md:pt-32 pb-16 relative"
      >
        {/* Animated Background - Looping Animation */}
        <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          {/* Animated gradient orbs */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Floating particles animation */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/10 rounded-full animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                }}
              />
            ))}
          </div>
          
          {/* Gradient overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-20">
          <motion.h1 
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.span 
              className="text-white drop-shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Download Videos from{' '}
            </motion.span>
            <motion.span
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }}
            >
              <Sparkles className="inline w-8 h-8 md:w-10 md:h-10 text-purple-400 animate-pulse" />
            </motion.span>
            <motion.span 
              className="text-white drop-shadow-lg"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              {' '}YouTube & TikTok
            </motion.span>
            <br />
            <motion.span 
              className="text-white drop-shadow-lg bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              Fast, Free & Easy
            </motion.span>
          </motion.h1>

          <motion.p 
            className="text-lg md:text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed drop-shadow-md"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            Download your favorite videos from YouTube and TikTok in high quality. Save them offline, generate transcripts, and manage your video library all in one place.
          </motion.p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 scroll-animate" data-section-id="hero-buttons">
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                navigate('/dashboard');
              }}
              className="bubble-btn flex items-center gap-2"
              data-scroll-to-top
            >
              Let's start
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div
        ref={statsRef}
        className="container mx-auto px-4 md:px-8 py-16"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Card 1 - Dark */}
          <div className="bubble-card p-8 scroll-animate" data-section-id="stat-1">
            <h2 className="text-5xl font-bold text-white mb-4">100%</h2>
            <p className="text-sm text-gray-300">Free to use<br />no hidden costs.</p>
          </div>

          {/* Card 2 - Purple Accent */}
          <div className="bubble-card p-8 scroll-animate ring-2 ring-purple-500/50" data-section-id="stat-2">
            <h2 className="text-5xl font-bold text-white mb-4">HD+</h2>
            <p className="text-sm text-gray-300">High quality downloads<br />up to 4K resolution.</p>
          </div>

          {/* Card 3 - Dark */}
          <div className="bubble-card p-8 scroll-animate" data-section-id="stat-3">
            <h2 className="text-5xl font-bold text-white mb-4">2</h2>
            <p className="text-sm text-gray-300">Platforms supported<br />YouTube & TikTok.</p>
          </div>

          {/* Card 4 - Dark */}
          <div className="bubble-card p-8 scroll-animate" data-section-id="stat-4">
            <h2 className="text-5xl font-bold text-white mb-4">Fast</h2>
            <p className="text-sm text-gray-300">Lightning quick downloads<br />in seconds.</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div 
        ref={featuresRef}
        className="container mx-auto px-4 md:px-8 py-16"
      >
        <div className="text-center mb-12 scroll-animate" data-section-id="features-title">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Why Choose Us</h2>
          <p className="text-xl text-white">Powerful features for all your video needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { icon: Download, title: 'Fast Downloads', description: 'Download videos in seconds with our optimized system' },
            { icon: FileText, title: 'Auto Transcripts', description: 'Generate accurate transcripts automatically' },
            { icon: Shield, title: '100% Secure', description: 'Your data is private and secure' },
          ].map((feature, i) => (
            <div
              key={i}
              className="bubble-card p-8 scroll-animate"
              data-section-id={`feature-${i}`}
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 mx-auto">
                <feature.icon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-center text-white">{feature.title}</h3>
              <p className="text-gray-300 text-center">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* About Section */}
      <div 
        ref={aboutRef}
        className="container mx-auto px-4 md:px-8 py-16"
      >
        <div className="max-w-4xl mx-auto bubble-card p-8 md:p-12 scroll-animate" data-section-id="about">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-center text-white">About Our Platform</h2>
          <p className="text-xl text-gray-300 leading-relaxed mb-8 text-center">
            Video Downloader is the ultimate solution for downloading and managing videos from YouTube and TikTok.
            Our platform combines speed, security, and simplicity to give you the best video downloading experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Youtube, text: 'YouTube Support' },
              { icon: Music, text: 'TikTok Integration' },
              { icon: Zap, text: 'Lightning Fast' },
              { icon: CheckCircle, text: 'High Quality' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <item.icon className="w-6 h-6 text-purple-400" />
                </div>
                <span className="text-lg text-white">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Downloads Section */}
      {recentVideos.length > 0 && (
        <div 
          ref={videosRef}
          className="container mx-auto px-4 md:px-8 py-16"
        >
          <div className="text-center mb-12 scroll-animate" data-section-id="videos-title">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">Recent Downloads</h2>
            <p className="text-xl text-white">Your recently downloaded videos</p>
          </div>

          {loadingRecent ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
              {recentVideos.map((video, index) => (
                <div
                  key={video.id}
                  className="scroll-animate"
                  data-section-id={`video-${index}`}
                >
                  <VideoCard 
                    video={video}
                    onEdit={(video) => navigate(`/video/${video.id}?edit=true`)}
                    onTranscript={(video) => navigate(`/video/${video.id}?tab=transcript`)}
                    onDelete={async (video) => {
                      if (window.confirm(`Are you sure you want to delete "${video.title}"?`)) {
                        try {
                          await storageService.deleteVideo(video.id);
                          const allVideos = await storageService.getAllVideos();
                          setRecentVideos(allVideos.slice(0, 6));
                          showSuccess(`Video "${video.title}" deleted successfully.`);
                        } catch (error) {
                          console.error('Error deleting video:', error);
                          showError('Failed to delete video. Please try again.');
                        }
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA Section */}
      <div className="container mx-auto px-4 md:px-8 py-16">
        <div className="max-w-4xl mx-auto bubble-card p-12 text-center scroll-animate" data-section-id="cta">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Ready to Get Started?</h2>
          <p className="text-xl mb-8 text-gray-300">Join thousands of users downloading videos every day</p>
          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              navigate('/dashboard');
            }}
            className="bubble-btn inline-flex items-center gap-2"
            data-scroll-to-top
          >
            Start Downloading Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 md:px-8 py-12 md:py-16 mt-16 border-t border-white/10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Video Downloader</h3>
            <p className="text-sm text-gray-300">
              Download and manage videos from YouTube and TikTok. Save them offline and generate transcripts.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    navigate('/dashboard');
                  }}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                  data-scroll-to-top
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    navigate('/downloads');
                  }}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                  data-scroll-to-top
                >
                  Downloads
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/transcripts')}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                >
                  Transcripts
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => navigate('/how-it-works')}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                >
                  How it Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/privacy-policy')}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/contact')}
                  className="text-sm text-gray-300 hover:text-purple-400 transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-sm text-gray-300">
            © {new Date().getFullYear()} Video Downloader. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
