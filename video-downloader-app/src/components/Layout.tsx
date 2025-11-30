import { useState, useEffect, useRef, ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Download,
  Settings,
  Menu,
  X,
  Bell,
  HardDrive,
  Video,
  FileText,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { storageService } from '../services/storageService';
import type { NotificationType } from '../contexts/NotificationContext';

interface LayoutProps {
  children: ReactNode;
}

interface NavLink {
  path: string;
  label: string;
  icon: typeof Home;
}

const navLinks: NavLink[] = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/downloads', label: 'Downloads', icon: Download },
  { path: '/transcripts', label: 'Transcripts', icon: FileText },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, showWarning, removeNotification } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);
  const [storageLimit] = useState(5 * 1024 * 1024 * 1024); // 5 GB
  const [storageWarningShown, setStorageWarningShown] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  // Load storage stats
  useEffect(() => {
    const loadStorage = async () => {
      try {
        const total = await storageService.getTotalStorageUsed();
        setStorageUsed(total);
        
        // Show warning when storage is getting full (80% or more)
        const storagePercent = (total / storageLimit) * 100;
        if (storagePercent >= 80 && !storageWarningShown) {
          showWarning(`Storage is ${storagePercent.toFixed(0)}% full. Consider deleting old videos.`);
          setStorageWarningShown(true);
        } else if (storagePercent < 80) {
          setStorageWarningShown(false);
        }
      } catch (error) {
        console.error('Failed to load storage:', error);
      }
    };

    loadStorage();
    const interval = setInterval(loadStorage, 30000);
    return () => clearInterval(interval);
  }, [showWarning, storageLimit, storageWarningShown]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationDropdownOpen(false);
      }
    };

    if (notificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notificationDropdownOpen]);

  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'error':
        return {
          icon: AlertCircle,
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'info':
        return {
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  const formatBytes = (bytes: number): string => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb < 0.01 ? '0 GB' : `${gb.toFixed(2)} GB`;
  };

  const storagePercent = (storageUsed / storageLimit) * 100;

  return (
    <div className="min-h-screen">
      {/* Backdrop Blur for Notifications Dropdown - Outside relative container */}
      <AnimatePresence>
        {notificationDropdownOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-md z-[45]"
            onClick={() => setNotificationDropdownOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Floating Bubble Navigation */}
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-auto max-w-6xl px-4">
        <div className="bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full px-8 py-4 shadow-2xl shadow-black/10">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-2 text-white text-xl font-bold hover:scale-105 transition-transform"
              data-scroll-to-top
            >
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="hidden sm:inline bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                VidDL
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;

                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`relative px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-white/20 text-white shadow-lg'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                        data-scroll-to-top
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{link.label}</span>
                        </div>
                        {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full -z-10"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                      </Link>
                );
              })}
            </div>

            {/* Storage Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/10">
              <HardDrive className="w-4 h-4 text-white/80" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {formatBytes(storageUsed)}
                </span>
                <div className="w-16 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(storagePercent, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                className="relative p-2.5 hover:bg-white/10 rounded-full transition-all hover:scale-110"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5 text-white/80 hover:text-white" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white/20" />
                )}
              </button>

              {/* Dropdown */}
              <AnimatePresence>
                {notificationDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white/30 dark:bg-black/60 backdrop-blur-2xl border-2 border-white/60 dark:border-white/50 rounded-2xl shadow-2xl overflow-hidden z-[60]"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Notifications</h3>
                      {notifications.length > 0 && (
                        <span className="text-xs text-white/70">{notifications.length}</span>
                      )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-white/10">
                          {notifications.slice(0, 5).map((notification) => {
                            const config = getNotificationConfig(notification.type);
                            const Icon = config.icon;

                            return (
                              <div
                                key={notification.id}
                                className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => {
                                  removeNotification(notification.id);
                                  setNotificationDropdownOpen(false);
                                }}
                              >
                                <div className="flex items-start gap-3">
                                  <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white line-clamp-2">
                                      {notification.message}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeNotification(notification.id);
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                                    aria-label="Dismiss"
                                  >
                                    <X className="w-3 h-3 text-white/50" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* Empty State */
                        <div className="px-4 py-8 text-center">
                          <Bell className="w-12 h-12 text-white/30 mx-auto mb-3" />
                          <p className="text-sm text-white/70 mb-4">
                            No notifications yet
                          </p>
                          <button
                            onClick={() => {
                              setNotificationDropdownOpen(false);
                              navigate('/notifications');
                            }}
                            className="btn-glass px-4 py-2 text-sm flex items-center gap-2 mx-auto"
                          >
                            <span>View Notifications Page</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-white/10">
                        <button
                          onClick={() => {
                            setNotificationDropdownOpen(false);
                            navigate('/notifications');
                          }}
                          className="w-full btn-glass w-full flex items-center justify-center gap-2 text-sm"
                        >
                          <span>View All Notifications</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 hover:bg-white/10 rounded-full transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-white" />
              ) : (
                <Menu className="w-6 h-6 text-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-28"></div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm lg:hidden z-40"
              style={{ top: '112px' }}
            />

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed top-32 left-1/2 transform -translate-x-1/2 w-11/12 max-w-md lg:hidden z-50"
            >
              <div className="bg-white/10 dark:bg-black/30 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl">
                <div className="space-y-2">
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;

                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => {
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                              setMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all ${
                              isActive
                                ? 'bg-white/20 text-white shadow-lg'
                                : 'text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                            data-scroll-to-top
                          >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{link.label}</span>
                          </Link>
                    );
                  })}
                </div>

                {/* Mobile Storage */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-white/70">Storage Used</span>
                    <span className="text-sm font-bold text-white">{formatBytes(storageUsed)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(storagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/50 mt-2">{formatBytes(storageLimit)} total</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 pb-12 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
