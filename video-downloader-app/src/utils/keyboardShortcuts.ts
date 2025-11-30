// Keyboard shortcuts configuration and utilities

export type ShortcutAction =
  | 'focusSearch'
  | 'focusDownloadInput'
  | 'playPause'
  | 'toggleFullscreen'
  | 'toggleMute'
  | 'seekBackward'
  | 'seekForward'
  | 'volumeUp'
  | 'volumeDown'
  | 'jumpToStart'
  | 'jumpTo10'
  | 'jumpTo20'
  | 'jumpTo30'
  | 'jumpTo40'
  | 'jumpTo50'
  | 'jumpTo60'
  | 'jumpTo70'
  | 'jumpTo80'
  | 'jumpTo90'
  | 'closeModal'
  | 'deleteVideo'
  | 'saveMetadata'
  | 'showHelp';

export interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Command key on Mac
  description: string;
  category: 'global' | 'video' | 'downloads' | 'editing';
  action: ShortcutAction;
}

// Default shortcuts configuration
export const defaultShortcuts: ShortcutConfig[] = [
  // Global shortcuts
  {
    key: 'k',
    ctrl: true,
    meta: true,
    description: 'Focus search bar',
    category: 'global',
    action: 'focusSearch',
  },
  {
    key: 'n',
    ctrl: true,
    meta: true,
    description: 'Focus download input',
    category: 'global',
    action: 'focusDownloadInput',
  },
  {
    key: 'Escape',
    description: 'Close modal/dialog',
    category: 'global',
    action: 'closeModal',
  },
  {
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    category: 'global',
    action: 'showHelp',
  },

  // Video player shortcuts
  {
    key: ' ',
    description: 'Play/Pause video',
    category: 'video',
    action: 'playPause',
  },
  {
    key: 'f',
    description: 'Toggle fullscreen',
    category: 'video',
    action: 'toggleFullscreen',
  },
  {
    key: 'm',
    description: 'Mute/Unmute',
    category: 'video',
    action: 'toggleMute',
  },
  {
    key: 'ArrowLeft',
    description: 'Seek backward 5s',
    category: 'video',
    action: 'seekBackward',
  },
  {
    key: 'ArrowRight',
    description: 'Seek forward 5s',
    category: 'video',
    action: 'seekForward',
  },
  {
    key: 'ArrowUp',
    description: 'Volume up',
    category: 'video',
    action: 'volumeUp',
  },
  {
    key: 'ArrowDown',
    description: 'Volume down',
    category: 'video',
    action: 'volumeDown',
  },
  {
    key: '0',
    description: 'Jump to start',
    category: 'video',
    action: 'jumpToStart',
  },
  {
    key: '1',
    description: 'Jump to 10%',
    category: 'video',
    action: 'jumpTo10',
  },
  {
    key: '2',
    description: 'Jump to 20%',
    category: 'video',
    action: 'jumpTo20',
  },
  {
    key: '3',
    description: 'Jump to 30%',
    category: 'video',
    action: 'jumpTo30',
  },
  {
    key: '4',
    description: 'Jump to 40%',
    category: 'video',
    action: 'jumpTo40',
  },
  {
    key: '5',
    description: 'Jump to 50%',
    category: 'video',
    action: 'jumpTo50',
  },
  {
    key: '6',
    description: 'Jump to 60%',
    category: 'video',
    action: 'jumpTo60',
  },
  {
    key: '7',
    description: 'Jump to 70%',
    category: 'video',
    action: 'jumpTo70',
  },
  {
    key: '8',
    description: 'Jump to 80%',
    category: 'video',
    action: 'jumpTo80',
  },
  {
    key: '9',
    description: 'Jump to 90%',
    category: 'video',
    action: 'jumpTo90',
  },

  // Downloads/Editing shortcuts
  {
    key: 'Delete',
    description: 'Delete current video',
    category: 'downloads',
    action: 'deleteVideo',
  },
  {
    key: 's',
    ctrl: true,
    meta: true,
    description: 'Save metadata changes',
    category: 'editing',
    action: 'saveMetadata',
  },
];

// Check if an element is an input field
export const isInputElement = (element: EventTarget | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.isContentEditable;

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
};

// Check if a keyboard event matches a shortcut
export const matchesShortcut = (event: KeyboardEvent, shortcut: ShortcutConfig): boolean => {
  // Key match (case-insensitive for letters)
  const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

  // Modifier keys match
  const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
  const metaMatch = shortcut.meta ? (event.metaKey || event.ctrlKey) : !event.metaKey;
  const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.alt ? event.altKey : !event.altKey;

  // For Ctrl/Meta shortcuts, we check if either is pressed (for cross-platform)
  if (shortcut.ctrl || shortcut.meta) {
    return keyMatch && (event.ctrlKey || event.metaKey) &&
           (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
           (shortcut.alt ? event.altKey : !event.altKey);
  }

  return keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch;
};

// Format shortcut for display
export const formatShortcut = (shortcut: ShortcutConfig): string => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format the key
  let keyDisplay = shortcut.key;
  if (shortcut.key === ' ') keyDisplay = 'Space';
  else if (shortcut.key === 'ArrowLeft') keyDisplay = '←';
  else if (shortcut.key === 'ArrowRight') keyDisplay = '→';
  else if (shortcut.key === 'ArrowUp') keyDisplay = '↑';
  else if (shortcut.key === 'ArrowDown') keyDisplay = '↓';
  else if (shortcut.key === 'Escape') keyDisplay = 'Esc';
  else if (shortcut.key === 'Delete') keyDisplay = 'Del';
  else keyDisplay = shortcut.key.toUpperCase();

  parts.push(keyDisplay);

  return parts.join(isMac ? '' : '+');
};

// Get shortcut by action
export const getShortcutByAction = (action: ShortcutAction, shortcuts: ShortcutConfig[] = defaultShortcuts): ShortcutConfig | undefined => {
  return shortcuts.find(s => s.action === action);
};

// Group shortcuts by category
export const groupShortcutsByCategory = (shortcuts: ShortcutConfig[] = defaultShortcuts) => {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);
};

// Category display names
export const categoryNames: Record<string, string> = {
  global: 'Global',
  video: 'Video Player',
  downloads: 'Downloads Page',
  editing: 'Editing',
};
