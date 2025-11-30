import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Palette } from 'lucide-react';
import type { CollectionColorTheme } from '../types';

interface NewCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string, colorTheme: CollectionColorTheme) => void;
}

const colorThemes: { value: CollectionColorTheme; label: string; classes: string }[] = [
  { value: 'purple', label: 'Purple', classes: 'bg-purple-500 hover:bg-purple-600' },
  { value: 'blue', label: 'Blue', classes: 'bg-blue-500 hover:bg-blue-600' },
  { value: 'green', label: 'Green', classes: 'bg-green-500 hover:bg-green-600' },
  { value: 'red', label: 'Red', classes: 'bg-red-500 hover:bg-red-600' },
  { value: 'yellow', label: 'Yellow', classes: 'bg-yellow-500 hover:bg-yellow-600' },
  { value: 'pink', label: 'Pink', classes: 'bg-pink-500 hover:bg-pink-600' },
  { value: 'indigo', label: 'Indigo', classes: 'bg-indigo-500 hover:bg-indigo-600' },
  { value: 'orange', label: 'Orange', classes: 'bg-orange-500 hover:bg-orange-600' },
];

const NewCollectionModal = ({ isOpen, onClose, onCreate }: NewCollectionModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<CollectionColorTheme>('purple');

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), description.trim(), selectedColor);
      // Reset form
      setName('');
      setDescription('');
      setSelectedColor('purple');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bubble-card-no-tilt max-w-lg w-full pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FolderPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white dark:text-white">New Collection</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-300" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Name Input */}
                <div>
                  <label htmlFor="collection-name" className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-2">
                    Collection Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="collection-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter collection name..."
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 dark:border-gray-600
                             focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none
                             focus:ring-2 focus:ring-purple-500/20 bg-gray-700 dark:bg-gray-700 text-white dark:text-white
                             transition-all duration-200"
                    autoFocus
                  />
                </div>

                {/* Description Input */}
                <div>
                  <label htmlFor="collection-description" className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    id="collection-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter collection description..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border-2 border-gray-600 dark:border-gray-600
                             focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none
                             focus:ring-2 focus:ring-purple-500/20 bg-gray-700 dark:bg-gray-700 text-white dark:text-white
                             transition-all duration-200 resize-none"
                  />
                </div>

                {/* Color Theme Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color Theme
                  </label>
                  <div className="grid grid-cols-4 gap-3">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setSelectedColor(theme.value)}
                        className={`
                          relative p-4 rounded-lg transition-all duration-200
                          ${theme.classes}
                          ${selectedColor === theme.value
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800 scale-105'
                            : 'opacity-70 hover:opacity-100'
                          }
                        `}
                      >
                        <span className="sr-only">{theme.label}</span>
                        {selectedColor === theme.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
                    Selected: <span className="font-semibold">{colorThemes.find(t => t.value === selectedColor)?.label}</span>
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:bg-white/10
                           transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="px-6 py-2.5 rounded-lg font-medium text-white bg-purple-500 hover:bg-purple-600
                           disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                           flex items-center gap-2"
                >
                  <FolderPlus className="w-4 h-4" />
                  Create Collection
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewCollectionModal;
