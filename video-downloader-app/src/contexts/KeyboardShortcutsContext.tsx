import { createContext, useContext, useState, ReactNode } from 'react';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import { getShortcutByAction } from '../utils/keyboardShortcuts';

interface KeyboardShortcutsContextType {
  showHelp: () => void;
  hideHelp: () => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export const KeyboardShortcutsProvider = ({ children }: { children: ReactNode }) => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const showHelp = () => setIsHelpOpen(true);
  const hideHelp = () => setIsHelpOpen(false);

  // Register global shortcut to show help
  useKeyboardShortcut(
    getShortcutByAction('showHelp') || null,
    showHelp,
    { allowInInput: false }
  );

  // Register Escape to close help modal
  useKeyboardShortcut(
    isHelpOpen ? getShortcutByAction('closeModal') || null : null,
    hideHelp,
    { allowInInput: true }
  );

  return (
    <KeyboardShortcutsContext.Provider value={{ showHelp, hideHelp }}>
      {children}
      <KeyboardShortcutsModal isOpen={isHelpOpen} onClose={hideHelp} />
    </KeyboardShortcutsContext.Provider>
  );
};

export const useKeyboardShortcutsHelp = () => {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcutsHelp must be used within a KeyboardShortcutsProvider');
  }
  return context;
};
