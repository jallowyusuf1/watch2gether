import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import VideoCard from './VideoCard';
import { VideoCardSkeleton } from './LoadingSkeleton';
import type { Video } from '../types';

interface LazyVideoCardProps {
  video: Video;
  index: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (videoId: string, selected: boolean) => void;
  onEdit?: (video: Video) => void;
  onTranscript?: (video: Video) => void;
  onDelete?: (video: Video) => void;
  onPlay?: (video: Video) => void;
  onExport?: (video: Video) => void;
}

export const LazyVideoCard: React.FC<LazyVideoCardProps> = ({
  video,
  index,
  ...props
}) => {
  const [ref, isIntersecting] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px',
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className="animate-fadeIn relative"
      style={{
        animationDelay: `${Math.min(index * 50, 500)}ms`,
      }}
    >
      {isIntersecting ? (
        <VideoCard video={video} {...props} />
      ) : (
        <VideoCardSkeleton />
      )}
    </div>
  );
};

