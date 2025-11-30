# Collections Feature Implementation Guide

## ✅ Completed Components

### 1. Types & Interfaces
- **Location**: `src/types/video.types.ts`
- **Added**:
  - `Collection` interface
  - `CollectionStats` interface
  - `SmartCollectionRule` interface
  - `CollectionColorTheme` type
  - `SmartCollectionRuleType` type

### 2. Collection Service
- **Location**: `src/services/collectionService.ts`
- **Features**:
  - IndexedDB integration with `collections` object store
  - CRUD operations for collections
  - Add/remove videos from collections
  - Reorder videos with drag-and-drop support
  - Smart collections with rule-based filtering
  - Nested collections support
  - Collection statistics calculation
  - Export collection as JSON
  - Generate shareable links
  - Auto-update collection thumbnails

### 3. UI Components
- **NewCollectionModal**: `src/components/NewCollectionModal.tsx`
  - Create new collections with name, description
  - Choose color theme (8 options)
  - Form validation

- **AddToCollectionModal**: `src/components/AddToCollectionModal.tsx`
  - Show all collections with checkboxes
  - Multi-select support
  - Pre-select collections that already contain the video
  - Shows video count for each collection

## 🚧 Next Steps to Complete

### 1. CollectionDetail Page
Create `/src/pages/CollectionDetail.tsx` with:
- Display collection metadata (name, description, stats)
- List all videos in the collection
- Drag-and-drop reordering using @dnd-kit
- Play all videos sequentially
- Edit collection name/description
- Remove videos from collection
- Delete collection

### 2. Update Downloads Page
Modify `/src/pages/Downloads.tsx`:
- Add "Collections" vs "Videos" view toggle
- Display collections as cards in Collections view
- Show collection thumbnail, name, video count, total duration
- Add "New Collection" button
- Click collection to navigate to CollectionDetail

### 3. Update VideoCard Component
Modify `/src/components/VideoCard.tsx`:
- Add "Add to Collection" option in the three-dot menu
- Open AddToCollectionModal on click
- Handle collection assignment

### 4. Update Sidebar Navigation
Modify `/src/components/Layout.tsx`:
- Add "Collections" link to sidebar
- Show recent collections for quick access

### 5. Add Collection Route
Update `/src/App.tsx`:
- Add route: `<Route path="/collection/:id" element={<CollectionDetailPage />} />`

### 6. Smart Collections Modal
Create `/src/components/SmartCollectionModal.tsx`:
- UI for creating smart collections
- Add rules: platform, tag, author, quality
- Choose operator: equals, contains, starts with, ends with
- Preview matching videos

## 🎨 Color Theme System

Collections use the following color themes:
- Purple (default)
- Blue
- Green
- Red
- Yellow
- Pink
- Indigo
- Orange

Each theme has associated CSS classes for consistent styling across the app.

## 📊 Collection Statistics

Each collection tracks:
- Total number of videos
- Total storage size
- Total duration
- Platforms represented

## 🔧 Smart Collections

Smart collections automatically update based on rules:
- **Platform**: All YouTube videos, All TikTok videos
- **Tag**: Videos with specific tags
- **Author**: Videos from specific creators
- **Quality**: Videos in specific quality (1080p, 720p, etc.)

Multiple rules can be combined (AND logic).

## 🔗 Sharing Collections

Collections can be shared via:
1. **Shareable Link**: Base64 encoded link with collection metadata
2. **JSON Export**: Full export including video metadata

## 📁 Nested Collections

Collections can be nested (collections inside collections) using the `parentId` field.

## 🎯 Usage Example

```typescript
import { collectionService } from '../services/collectionService';

// Create a collection
const collection = await collectionService.createCollection(
  'Favorite Music Videos',
  'My top music videos from YouTube',
  'purple'
);

// Add video to collection
await collectionService.addVideoToCollection(collection.id, videoId);

// Get collection stats
const stats = await collectionService.getCollectionStats(collection.id);

// Create smart collection
const smartCollection = await collectionService.createCollection(
  'All YouTube Videos',
  'Automatically includes all YouTube videos',
  'red',
  true,
  [{ type: 'platform', value: 'youtube', operator: 'equals' }]
);

// Export collection
const json = await collectionService.exportCollection(collection.id);

// Generate share link
const link = await collectionService.generateShareableLink(collection.id);
```

## 🛠️ Development Tasks

### Priority 1 (Critical)
- [ ] Create CollectionDetail page with drag-and-drop
- [ ] Update Downloads page with Collections view
- [ ] Add "Add to Collection" to VideoCard menu
- [ ] Add Collections route to App.tsx

### Priority 2 (Important)
- [ ] Update sidebar with Collections link
- [ ] Create SmartCollectionModal
- [ ] Implement sequential video playback
- [ ] Add collection export/import UI

### Priority 3 (Enhancement)
- [ ] Add collection shortcuts to sidebar
- [ ] Implement nested collections UI
- [ ] Add collection sharing UI
- [ ] Create collection templates

## 📝 Notes

- Collections use IndexedDB version 3 (increment when adding)
- Smart collections auto-update when videos are added/removed
- Collection thumbnails auto-update to use the first video's thumbnail
- Video order is preserved in `videoOrder` array
- Collections are independent of video deletion (broken references are handled gracefully)

