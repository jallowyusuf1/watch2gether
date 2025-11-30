import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import type { NotificationType } from '../contexts/NotificationContext';

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, removeNotification, clearAll } = useNotifications();

  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          textColor: 'text-green-700 dark:text-green-400',
          iconColor: 'text-green-600 dark:text-green-400',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          textColor: 'text-red-700 dark:text-red-400',
          iconColor: 'text-red-600 dark:text-red-400',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          textColor: 'text-yellow-700 dark:text-yellow-400',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500/10',
          borderColor: 'border-blue-500/30',
          textColor: 'text-blue-700 dark:text-blue-400',
          iconColor: 'text-blue-600 dark:text-blue-400',
        };
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(parseInt(timestamp.split('-')[1]));
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 md:px-8 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-6 h-6 text-black dark:text-white" />
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-white">
                Notifications
              </h1>
              <p className="text-sm text-black/70 dark:text-white/70 mt-1">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="btn-glass px-4 py-2 text-sm flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {notifications.map((notification) => {
                const config = getNotificationConfig(notification.type);
                const Icon = config.icon;

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className={`
                      ${config.bgColor} ${config.borderColor}
                      border-2 rounded-xl p-4 shadow-lg
                      hover:shadow-xl transition-all duration-200
                      backdrop-blur-sm
                    `}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${config.bgColor} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${config.textColor} mb-1`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-black/50 dark:text-white/50">
                          {formatTime(notification.id)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="p-1 hover:bg-white/10 dark:hover:bg-white/5 rounded-full transition-colors flex-shrink-0"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4 text-black/50 dark:text-white/50" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="p-6 bg-white/10 dark:bg-white/5 rounded-full mb-6">
              <Bell className="w-16 h-16 text-black/30 dark:text-white/30" />
            </div>
            <h2 className="text-2xl font-bold text-black dark:text-white mb-2">
              No notifications
            </h2>
            <p className="text-black/70 dark:text-white/70 text-center max-w-md mb-6">
              You're all caught up! When you download videos, get errors, or receive updates, they'll appear here.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary-glass px-6 py-3"
            >
              Start Downloading
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;

