import { Tag as TagIcon, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { tagGroupService } from '../services/tagGroupService';

interface TagPillProps {
  tag: string;
  onClick?: () => void;
  onRemove?: () => void;
  showRemove?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const TagPill = ({
  tag,
  onClick,
  onRemove,
  showRemove = false,
  size = 'md',
  className = '',
}: TagPillProps) => {
  const navigate = useNavigate();
  const group = tagGroupService.getGroupForTag(tag);
  const tagGroupMap = tagGroupService.getTagGroupMap();
  const groupId = tagGroupMap[tag];
  const assignedGroup = groupId ? tagGroupService.getGroupById(groupId) : null;
  const groupColor = assignedGroup?.color || group?.color || '#8b5cf6';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      navigate(`/downloads?tag=${encodeURIComponent(tag)}`);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <span
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium transition-all cursor-pointer hover:scale-105 ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${groupColor}20`,
        color: groupColor,
        border: `1px solid ${groupColor}40`,
      }}
    >
      <TagIcon className="w-3 h-3" />
      <span>{tag}</span>
      {showRemove && onRemove && (
        <button
          onClick={handleRemove}
          className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${tag} tag`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

