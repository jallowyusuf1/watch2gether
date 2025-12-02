import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animate = true,
}) => {
  const baseClasses = 'bg-gray-700/50 rounded';
  
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
    card: 'rounded-xl',
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? height : '100%'),
    height: height || (variant === 'text' ? '1rem' : variant === 'circular' ? width : 'auto'),
  };

  if (animate) {
    return (
      <motion.div
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={style}
        animate={{
          opacity: [0.5, 1, 0.5],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
};

export const VideoCardSkeleton: React.FC = () => {
  return (
    <div className="bubble-card overflow-hidden">
      <Skeleton variant="rectangular" height="200px" className="w-full mb-4" />
      <div className="p-4 space-y-3">
        <Skeleton variant="text" width="80%" height="20px" />
        <Skeleton variant="text" width="60%" height="16px" />
        <div className="flex gap-2 mt-4">
          <Skeleton variant="rectangular" width="60px" height="24px" className="rounded-full" />
          <Skeleton variant="rectangular" width="60px" height="24px" className="rounded-full" />
        </div>
      </div>
    </div>
  );
};

export const VideoGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
};

export const StatsCardSkeleton: React.FC = () => {
  return (
    <div className="bubble-card p-8">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width="64px" height="64px" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" height="16px" />
          <Skeleton variant="text" width="40%" height="32px" />
        </div>
      </div>
    </div>
  );
};

export const ListItemSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-4 p-4 bubble-card">
      <Skeleton variant="rectangular" width="80px" height="60px" className="rounded" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" width="70%" height="18px" />
        <Skeleton variant="text" width="50%" height="14px" />
      </div>
      <Skeleton variant="circular" width="32px" height="32px" />
    </div>
  );
};

