import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import type { NotificationType } from '../contexts/NotificationContext';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotifications();
  const [swiping, setSwiping] = useState<{ [key: string]: { startX: number; currentX: number } }>({});

  const getNotificationConfig = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-500/95',
          borderColor: 'border-green-600',
          textColor: 'text-white',
          iconColor: 'text-white',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-500/95',
          borderColor: 'border-red-600',
          textColor: 'text-white',
          iconColor: 'text-white',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-500/95',
          borderColor: 'border-yellow-600',
          textColor: 'text-white',
          iconColor: 'text-white',
        };
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-500/95',
          borderColor: 'border-blue-600',
          textColor: 'text-white',
          iconColor: 'text-white',
        };
    }
  };

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwiping((prev) => ({
      ...prev,
      [id]: { startX: touch.clientX, currentX: touch.clientX },
    }));
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    setSwiping((prev) => ({
      ...prev,
      [id]: { ...prev[id], currentX: touch.clientX },
    }));
  };

  const handleTouchEnd = (id: string) => {
    const swipe = swiping[id];
    if (swipe) {
      const deltaX = swipe.currentX - swipe.startX;
      // If swiped right more than 100px, dismiss
      if (deltaX > 100) {
        removeNotification(id);
      }
      // Reset swipe state
      setSwiping((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const config = getNotificationConfig(notification.type);
          const Icon = config.icon;
          const swipeDelta = swiping[notification.id]
            ? swiping[notification.id].currentX - swiping[notification.id].startX
            : 0;

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 400, scale: 0.8 }}
              animate={{
                opacity: 1,
                x: Math.max(0, swipeDelta),
                scale: 1,
              }}
              exit={{ opacity: 0, x: 400, scale: 0.8 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 30,
              }}
              className="pointer-events-auto"
              onTouchStart={(e) => handleTouchStart(notification.id, e)}
              onTouchMove={(e) => handleTouchMove(notification.id, e)}
              onTouchEnd={() => handleTouchEnd(notification.id)}
            >
              <div
                onClick={() => removeNotification(notification.id)}
                className={`
                  ${config.bgColor} ${config.borderColor}
                  border-2 rounded-xl p-4 shadow-2xl
                  cursor-pointer hover:scale-[1.02] active:scale-[0.98]
                  transition-transform duration-200
                  backdrop-blur-sm bg-opacity-95
                `}
                style={{
                  transform: `translateX(${Math.max(0, swipeDelta)}px)`,
                }}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-6 h-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${config.textColor} break-words`}>
                      {notification.message}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    className={`
                      ${config.iconColor} hover:opacity-70
                      transition-opacity flex-shrink-0
                      p-1 rounded-full hover:bg-white/20
                    `}
                    aria-label="Close notification"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NotificationContainer;

