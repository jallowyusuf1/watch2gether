import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, Check, Folder } from 'lucide-react';
import { collectionService } from '../services/collectionService';
import type { Collection } from '../types';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  onAdd: (collectionIds: string[]) => void;
}

const AddToCollectionModal = ({ isOpen, onClose, videoId, onAdd }: AddToCollectionModalProps) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadCollections();
    }
  }, [isOpen, videoId]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const allCollections = await collectionService.getAllCollections();
      setCollections(allCollections);

      // Pre-select collections that already contain this video
      const collectionsWithVideo = allCollections.filter(c => c.videoIds.includes(videoId));
      setSelectedCollectionIds(new Set(collectionsWithVideo.map(c => c.id)));
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollection = (collectionId: string) => {
    const newSelected = new Set(selectedCollectionIds);
    if (newSelected.has(collectionId)) {
      newSelected.delete(collectionId);
    } else {
      newSelected.add(collectionId);
    }
    setSelectedCollectionIds(newSelected);
  };

  const handleSave = () => {
    onAdd(Array.from(selectedCollectionIds));
    onClose();
  };

  const getColorClass = (colorTheme: string) => {
    const colorMap: Record<string, string> = {
      purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
      blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
      green: 'bg-green-500/20 border-green-500/50 text-green-400',
      red: 'bg-red-500/20 border-red-500/50 text-red-400',
      yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
      pink: 'bg-pink-500/20 border-pink-500/50 text-pink-400',
      indigo: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400',
      orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    };
    return colorMap[colorTheme] || colorMap.purple;
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
              className="bubble-card-no-tilt max-w-lg w-full max-h-[80vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <FolderPlus className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white dark:text-white">Add to Collection</h2>
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
              <div className="overflow-y-auto max-h-[calc(80vh-180px)] p-6">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
                  </div>
                ) : collections.length === 0 ? (
                  <div className="text-center py-12">
                    <Folder className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 dark:text-gray-400">No collections yet</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Create a collection first to organize your videos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {collections.map((collection) => {
                      const isSelected = selectedCollectionIds.has(collection.id);
                      const colorClass = getColorClass(collection.colorTheme);

                      return (
                        <button
                          key={collection.id}
                          onClick={() => toggleCollection(collection.id)}
                          className={`
                            w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all
                            ${isSelected
                              ? `${colorClass} border-opacity-100 scale-[1.02]`
                              : 'bg-white/5 border-gray-600 hover:bg-white/10'
                            }
                          `}
                        >
                          <div className={`
                            w-6 h-6 rounded border-2 flex items-center justify-center transition-all
                            ${isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-500'
                            }
                          `}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>

                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                              <Folder className={`w-4 h-4 ${isSelected ? '' : 'text-gray-400'}`} />
                              <span className="font-medium text-white dark:text-white">
                                {collection.name}
                              </span>
                            </div>
                            {collection.description && (
                              <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 line-clamp-1">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {collection.videoIds.length} video{collection.videoIds.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-white/10">
                <p className="text-sm text-gray-400 dark:text-gray-400">
                  {selectedCollectionIds.size} collection{selectedCollectionIds.size !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-lg font-medium text-gray-300 hover:bg-white/10
                             transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={collections.length === 0}
                    className="px-6 py-2.5 rounded-lg font-medium text-white bg-purple-500 hover:bg-purple-600
                             disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddToCollectionModal;
