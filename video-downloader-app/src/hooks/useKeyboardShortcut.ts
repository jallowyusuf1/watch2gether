import { useEffect, useCallback, useRef } from 'react';
import type { ShortcutConfig } from '../utils/keyboardShortcuts';
import { isInputElement, matchesShortcut } from '../utils/keyboardShortcuts';

interface UseKeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  allowInInput?: boolean;
}

/**
 * Hook to register a keyboard shortcut
 * @param shortcut - The shortcut configuration
 * @param callback - Function to call when shortcut is triggered
 * @param options - Additional options
 */
export const useKeyboardShortcut = (
  shortcut: ShortcutConfig | null,
  callback: () => void,
  options: UseKeyboardShortcutOptions = {}
) => {
  const {
    enabled = true,
    preventDefault = true,
    allowInInput = false,
  } = options;

  const callbackRef = useRef(callback);

  // Update callback ref when it changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !shortcut) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field (unless allowed)
      if (!allowInInput && isInputElement(event.target)) {
        return;
      }

      // Check if the event matches the shortcut
      if (matchesShortcut(event, shortcut)) {
        if (preventDefault) {
          event.preventDefault();
          event.stopPropagation();
        }
        callbackRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcut, enabled, preventDefault, allowInInput]);
};

/**
 * Hook to register multiple keyboard shortcuts
 * @param shortcuts - Array of shortcut configurations with their callbacks
 * @param options - Additional options
 */
export const useKeyboardShortcuts = (
  shortcuts: Array<{ shortcut: ShortcutConfig; callback: () => void }>,
  options: UseKeyboardShortcutOptions = {}
) => {
  const {
    enabled = true,
    preventDefault = true,
    allowInInput = false,
  } = options;

  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field (unless allowed)
      if (!allowInInput && isInputElement(event.target)) {
        return;
      }

      // Check each shortcut
      for (const { shortcut, callback } of shortcutsRef.current) {
        if (matchesShortcut(event, shortcut)) {
          if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }
          callback();
          break; // Only trigger first matching shortcut
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, preventDefault, allowInInput]);
};
