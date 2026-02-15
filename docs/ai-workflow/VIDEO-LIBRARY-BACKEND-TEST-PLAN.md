# 🧪 Video Library Backend Test Plan (Phase 1)

## 📋 Test Objectives
Verify all Video Library backend functionality meets requirements from:
- [`ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md`](ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md)
- [`videoLibraryController.mjs`](../../backend/controllers/videoLibraryController.mjs)

## 🧰 Test Environment
- PostgreSQL 15
- Node.js 18
- Sequelize 7
- YouTube Data API v3

## ✅ Test Cases

### 1. Exercise CRUD Operations
- [ ] Create exercise with YouTube video (auto-fetch metadata)
- [ ] Create exercise without video
- [ ] Get exercise details
- [ ] Update exercise metadata
- [ ] Soft delete exercise
- [ ] Restore soft-deleted exercise

### 2. Video Management
- [ ] Add YouTube video to existing exercise
- [ ] Update video metadata (title, description, tags)
- [ ] Soft delete video
- [ ] Restore soft-deleted video
- [ ] List videos for exercise

### 3. YouTube Integration
- [ ] Validate YouTube URL formats
- [ ] Extract YouTube ID from URL
- [ ] Fetch YouTube metadata (title, description, duration, thumbnail)
- [ ] Handle invalid/private YouTube videos

### 4. Analytics Tracking
- [ ] Track video view start
- [ ] Update watch progress
- [ ] Mark video as completed
- [ ] Track chapter views
- [ ] Increment view counter

### 5. Error Handling
- [ ] Invalid input validation
- [ ] Non-existent exercise/video
- [ ] YouTube API quota exceeded
- [ ] Database constraints

## 🚀 Test Execution
```bash
# Run tests
cd backend && npm test videoLibraryController.test.mjs
```

## 📊 Expected Results
All test cases should pass with:
- Correct HTTP status codes
- Expected response formats
- Proper database state changes
- Accurate YouTube metadata fetching

## 📝 Test Data
Sample YouTube URLs:
- Valid: https://www.youtube.com/watch?v=dQw4w9WgXcQ
- Invalid: https://www.youtube.com/watch?v=INVALID_ID
- Private: https://www.youtube.com/watch?v=PRIVATE_VIDEO

## ⏱️ Performance Benchmarks
- YouTube metadata fetch: < 500ms
- Exercise creation: < 200ms
- Video list query (100 items): < 100ms