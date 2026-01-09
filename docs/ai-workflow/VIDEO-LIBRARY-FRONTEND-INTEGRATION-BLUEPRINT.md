# VIDEO LIBRARY FRONTEND-BACKEND INTEGRATION BLUEPRINT

**System:** SwanStudios Personal Training Platform
**Component:** Video Library Frontend Integration
**Author:** Claude Code (Sonnet 4.5)
**Date:** 2026-01-08
**Status:** 🚧 In Progress
**Estimated Timeline:** 12-18 hours (3 phases)

---

## 1. EXECUTIVE SUMMARY

The Video Library has a **production-ready backend (90% complete)** and **well-designed frontend (70% complete)** but suffers from **API contract misalignment** preventing integration. This blueprint provides a focused, phased approach to connect the frontend to the backend and deliver a fully functional video library system.

**Current State**: Backend working, frontend disconnected
**Target State**: Fully integrated, production-ready video library
**Primary Blocker**: Frontend expects `/api/admin/videos` but backend provides `/api/admin/exercise-library`

---

## 2. CURRENT STATE ANALYSIS

### Backend Status (90% Complete)

**Working Endpoints** (10 total):
- ✅ `GET /api/admin/exercise-library` - List exercises with pagination
- ✅ `POST /api/admin/exercise-library` - Create exercise with video
- ✅ `GET /api/admin/exercise-library/:id` - Get single exercise
- ✅ `PUT /api/admin/exercise-library/:id` - Update exercise
- ✅ `DELETE /api/admin/exercise-library/:id` - Soft delete exercise
- ✅ `GET /api/admin/exercise-library/:id/videos` - Get exercise videos
- ✅ `PATCH /api/admin/exercise-library/videos/:id` - Update video metadata
- ✅ `DELETE /api/admin/exercise-library/videos/:id` - Soft delete video
- ✅ `POST /api/admin/exercise-library/videos/:id/restore` - Restore video
- ✅ `POST /api/admin/exercise-library/videos/:id/track-view` - Track analytics

**Missing**:
- ❌ `GET /api/admin/dashboard/stats` - Stats for dashboard banner

### Frontend Status (70% Complete)

**Working Components**:
- ✅ AdminVideoLibrary.tsx (686 lines) - Main library UI with search, filters, pagination
- ✅ VideoCard.tsx - Grid/list view cards with actions
- ✅ CreateExerciseWizard.tsx (527 lines) - 4-step wizard (partially complete)
- ✅ VideoPlayerModal.tsx (206 lines) - Modal with player placeholder
- ✅ useDebounce.ts - Search optimization hook

**Frontend Expects**:
- ❌ `GET /api/admin/videos` (should be `/api/admin/exercise-library`)
- ❌ `DELETE /api/admin/videos/:id` (should be `/api/admin/exercise-library/videos/:id`)
- ❌ `GET /api/admin/dashboard/stats` (doesn't exist yet)

**Incomplete Features**:
- ⚠️ CreateExerciseWizard Steps 3-4 (NASM phases + Review)
- ⚠️ VideoPlayerModal (placeholder only, needs video.js or react-player)

---

## 3. INTEGRATION STRATEGY

### Philosophy: Minimal Backend Changes, Maximum Compatibility

**Why Backend Stability Matters**:
- Backend is production-tested with 10 working endpoints
- Changing backend routes risks breaking existing integrations
- Adding aliases is non-breaking and maintains flexibility

**Approach**:
1. **Phase 1**: Add backend aliases + missing stats endpoint (make it work)
2. **Phase 2**: Complete frontend components (make it complete)
3. **Phase 3**: Polish + video processing pipeline (make it production-ready)

---

## 4. PHASE 1: QUICK WIN - MAKE IT WORK (2-4 hours)

**Goal**: Connect frontend to backend with minimal changes, get basic functionality working

### Task 1.1: Add Missing Stats Endpoint (30 minutes)

**File**: `backend/routes/dashboard/adminDashboardRoutes.mjs`

**Create if doesn't exist, or add route**:

```javascript
/**
 * GET /api/admin/dashboard/stats
 * Dashboard statistics for admin banner
 */
router.get('/stats', async (req, res) => {
  try {
    // Get video count (non-deleted)
    const [videoResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM exercise_videos WHERE "deletedAt" IS NULL'
    );

    // Get exercise count (non-deleted)
    const [exerciseResult] = await sequelize.query(
      'SELECT COUNT(*) as count FROM exercise_library WHERE "deletedAt" IS NULL'
    );

    // Get workout template count (if table exists)
    let templateCount = 0;
    try {
      const [templateResult] = await sequelize.query(
        'SELECT COUNT(*) as count FROM workout_templates'
      );
      templateCount = parseInt(templateResult[0]?.count || 0);
    } catch (err) {
      // Table might not exist yet, use 0
      logger.warn('workout_templates table not found, using count=0');
    }

    return res.status(200).json({
      success: true,
      stats: {
        total_videos: parseInt(videoResult[0]?.count || 0),
        total_exercises: parseInt(exerciseResult[0]?.count || 0),
        total_templates: templateCount
      }
    });
  } catch (error) {
    logger.error('Error fetching admin dashboard stats', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message
    });
  }
});
```

**Then register route in `backend/core/routes.mjs`** (if not already):

```javascript
import adminDashboardRoutes from './routes/dashboard/adminDashboardRoutes.mjs';

// Add with other routes
app.use('/api/admin/dashboard', protect, adminOnly, adminDashboardRoutes);
```

### Task 1.2: Add Route Aliases for Frontend Compatibility (15 minutes)

**File**: `backend/core/routes.mjs`

**Add alias route BEFORE existing videoLibraryRoutes**:

```javascript
// Video Library Routes (aliased for frontend compatibility)
// Original endpoint: /api/admin/exercise-library
// Frontend alias: /api/admin/videos
app.use('/api/admin/videos', protect, adminOnly, videoLibraryRoutes);
app.use('/api/admin/exercise-library', protect, adminOnly, videoLibraryRoutes);

logger.info('✅ Video Library routes registered at /api/admin/videos and /api/admin/exercise-library');
```

**Why Both Routes**:
- `/api/admin/videos` - Frontend compatibility (what UI expects)
- `/api/admin/exercise-library` - Semantic correctness (what makes sense architecturally)
- Allows gradual migration without breaking changes

### Task 1.3: Verify Frontend API Calls (30 minutes)

**File**: `frontend/src/pages/admin/AdminVideoLibrary.tsx`

**Current API Calls** (lines 68, 83):
```typescript
// Line 68 - List videos
const response = await axios.get(`/api/admin/videos?${params}`);

// Line 83 - Delete video
await axios.delete(`/api/admin/videos/${videoId}`);
```

**Issue**: Delete endpoint should be `/api/admin/videos/videos/${videoId}` based on backend structure

**Fix** (Line 83):
```typescript
// Before
await axios.delete(`/api/admin/videos/${videoId}`);

// After (matches backend route structure)
await axios.delete(`/api/admin/exercise-library/videos/${videoId}`);
```

**OR** create additional alias in backend to handle both:
```javascript
// In videoLibraryRoutes.mjs, add shortcut route
router.delete('/:id', async (req, res) => {
  // Delegate to videos/:id delete
  req.params.id = req.params.id;
  return deleteVideo(req, res);
});
```

### Task 1.4: Test End-to-End (1-2 hours)

**Test Checklist**:
1. ✅ Start backend: `cd backend && npm run dev`
2. ✅ Start frontend: `cd frontend && npm run dev`
3. ✅ Navigate to admin video library page
4. ✅ Verify stats banner shows counts (total_videos, total_exercises, total_templates)
5. ✅ Verify video list loads (even if empty)
6. ✅ Test search functionality
7. ✅ Test filter functionality
8. ✅ Test pagination (if data exists)
9. ✅ Create a test exercise via CreateExerciseWizard (Steps 1-2 only)
10. ✅ Verify video appears in library
11. ✅ Test delete functionality
12. ✅ Verify video is soft-deleted (check database `deletedAt` column)

**Expected Issues & Fixes**:
- **CORS errors**: Add frontend origin to backend CORS config
- **Auth errors**: Ensure admin user is logged in with valid JWT
- **404 errors**: Check route registration in routes.mjs
- **Empty library**: Seed database with test data

---

## 5. PHASE 2: COMPLETE CORE FEATURES (4-6 hours)

**Goal**: Complete CreateExerciseWizard and implement VideoPlayerModal

### Task 2.1: Complete CreateExerciseWizard Step 3 - NASM Phases (2 hours)

**File**: `frontend/src/components/Admin/CreateExerciseWizard.tsx`

**Current Issue**: Step 3 rendering incomplete (case statement cut off at line 157)

**Step 3: NASM Phases Selection**

```typescript
case 3: // NASM Phases
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          NASM Training Phases
        </h3>
        <p className="text-gray-400 text-sm">
          Select which NASM training phases this exercise is suitable for
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { phase: 1, name: 'Stabilization Endurance', description: 'Focus on muscular endurance and core stability' },
          { phase: 2, name: 'Strength Endurance', description: 'Combination of stabilization and strength' },
          { phase: 3, name: 'Muscular Development (Hypertrophy)', description: 'Focus on muscle growth' },
          { phase: 4, name: 'Maximal Strength', description: 'High-intensity strength training' },
          { phase: 5, name: 'Power', description: 'Speed and explosiveness' },
        ].map(({ phase, name, description }) => (
          <label
            key={phase}
            className="flex items-start space-x-3 p-4 border-2 border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors"
          >
            <input
              type="checkbox"
              checked={formData.nasmPhases?.includes(phase) || false}
              onChange={(e) => {
                const currentPhases = formData.nasmPhases || [];
                const newPhases = e.target.checked
                  ? [...currentPhases, phase]
                  : currentPhases.filter((p) => p !== phase);

                setFormData({
                  ...formData,
                  nasmPhases: newPhases.sort((a, b) => a - b),
                });
              }}
              className="mt-1 h-5 w-5 text-purple-600 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-900"
            />
            <div className="flex-1">
              <div className="font-medium text-white">
                Phase {phase}: {name}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {description}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* Optional: Additional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Difficulty Level
          </label>
          <select
            value={formData.difficultyLevel || 'intermediate'}
            onChange={(e) =>
              setFormData({ ...formData, difficultyLevel: e.target.value })
            }
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Equipment Required
          </label>
          <input
            type="text"
            value={formData.equipmentRequired || ''}
            onChange={(e) =>
              setFormData({ ...formData, equipmentRequired: e.target.value })
            }
            placeholder="e.g., Dumbbells, Barbell, Resistance Band"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Validation Warning */}
      {(!formData.nasmPhases || formData.nasmPhases.length === 0) && (
        <div className="flex items-center space-x-2 text-yellow-500 text-sm">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Select at least one NASM phase</span>
        </div>
      )}
    </div>
  );
```

### Task 2.2: Complete CreateExerciseWizard Step 4 - Review (1 hour)

**Step 4: Review & Submit**

```typescript
case 4: // Review
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">
          Review Exercise
        </h3>
        <p className="text-gray-400 text-sm">
          Please review all details before creating the exercise
        </p>
      </div>

      {/* Exercise Details */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h4 className="text-lg font-semibold text-purple-400 mb-4">
          Exercise Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Exercise Name</div>
            <div className="text-white font-medium">{formData.name}</div>
          </div>

          <div>
            <div className="text-sm text-gray-400">Muscle Group</div>
            <div className="text-white font-medium">{formData.muscleGroup}</div>
          </div>

          {formData.difficultyLevel && (
            <div>
              <div className="text-sm text-gray-400">Difficulty</div>
              <div className="text-white font-medium capitalize">
                {formData.difficultyLevel}
              </div>
            </div>
          )}

          {formData.equipmentRequired && (
            <div>
              <div className="text-sm text-gray-400">Equipment</div>
              <div className="text-white font-medium">
                {formData.equipmentRequired}
              </div>
            </div>
          )}
        </div>

        {formData.description && (
          <div>
            <div className="text-sm text-gray-400 mb-1">Description</div>
            <div className="text-white text-sm">{formData.description}</div>
          </div>
        )}
      </div>

      {/* Video Details */}
      <div className="bg-gray-800 rounded-lg p-6 space-y-4">
        <h4 className="text-lg font-semibold text-purple-400 mb-4">
          Video Information
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-400">Video Type</div>
            <div className="text-white font-medium capitalize">
              {formData.videoSource}
            </div>
          </div>

          {formData.videoSource === 'youtube' && formData.youtubeUrl && (
            <div>
              <div className="text-sm text-gray-400">YouTube URL</div>
              <div className="text-white font-medium text-sm truncate">
                {formData.youtubeUrl}
              </div>
            </div>
          )}

          {formData.videoSource === 'upload' && formData.videoFile && (
            <div>
              <div className="text-sm text-gray-400">Video File</div>
              <div className="text-white font-medium">
                {formData.videoFile.name}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NASM Phases */}
      {formData.nasmPhases && formData.nasmPhases.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-purple-400 mb-4">
            NASM Training Phases
          </h4>
          <div className="flex flex-wrap gap-2">
            {formData.nasmPhases.map((phase) => (
              <span
                key={phase}
                className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
              >
                Phase {phase}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button in Review Step */}
      <div className="flex justify-center pt-4">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Exercise...' : 'Create Exercise'}
        </button>
      </div>
    </div>
  );
```

### Task 2.3: Implement VideoPlayerModal with react-player (2 hours)

**Install Dependencies**:
```bash
cd frontend
npm install react-player
```

**File**: `frontend/src/components/Admin/VideoPlayerModal.tsx`

**Replace placeholder with actual player** (around line 80):

```typescript
import ReactPlayer from 'react-player/lazy';

// ... existing imports and props ...

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  video,
}) => {
  if (!isOpen || !video) return null;

  const getVideoUrl = () => {
    if (video.video_type === 'youtube') {
      return `https://www.youtube.com/watch?v=${video.video_id}`;
    } else if (video.hls_manifest_url) {
      return video.hls_manifest_url; // HLS stream
    } else if (video.playbackUrl) {
      return video.playbackUrl; // Direct video URL
    }
    return null;
  };

  const videoUrl = getVideoUrl();

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">
            {video.title || 'Video Player'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Video Player */}
        <div className="relative bg-black" style={{ paddingTop: '56.25%' }}>
          {videoUrl ? (
            <ReactPlayer
              url={videoUrl}
              controls
              playing={false}
              width="100%"
              height="100%"
              style={{ position: 'absolute', top: 0, left: 0 }}
              config={{
                youtube: {
                  playerVars: { showinfo: 1 }
                },
                file: {
                  attributes: {
                    controlsList: 'nodownload'
                  }
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p>Video source not available</p>
              </div>
            </div>
          )}
        </div>

        {/* Video Details */}
        <div className="p-6 space-y-4">
          {video.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">Description</h4>
              <p className="text-white">{video.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            {video.duration_seconds && (
              <div>
                <span className="text-gray-400">Duration:</span>
                <span className="text-white ml-2">
                  {Math.floor(video.duration_seconds / 60)}:{String(video.duration_seconds % 60).padStart(2, '0')}
                </span>
              </div>
            )}

            {video.view_count !== undefined && (
              <div>
                <span className="text-gray-400">Views:</span>
                <span className="text-white ml-2">{video.view_count}</span>
              </div>
            )}

            {video.video_type && (
              <div>
                <span className="text-gray-400">Type:</span>
                <span className="text-white ml-2 capitalize">{video.video_type}</span>
              </div>
            )}
          </div>

          {/* NASM Phases */}
          {video.nasm_phases && video.nasm_phases.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">NASM Phases</h4>
              <div className="flex flex-wrap gap-2">
                {video.nasm_phases.map((phase) => (
                  <span
                    key={phase}
                    className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs"
                  >
                    Phase {phase}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Task 2.4: Test Complete Flow (1 hour)

**Test Checklist**:
1. ✅ Open CreateExerciseWizard
2. ✅ Complete Step 1: Exercise name, muscle group, description
3. ✅ Complete Step 2: YouTube URL or file upload
4. ✅ Complete Step 3: Select NASM phases, set difficulty, add equipment
5. ✅ Complete Step 4: Review all details
6. ✅ Submit exercise
7. ✅ Verify exercise appears in library with video
8. ✅ Click video to open VideoPlayerModal
9. ✅ Verify YouTube video plays (if YouTube)
10. ✅ Verify uploaded video shows placeholder (processing not yet implemented)

---

## 6. PHASE 3: POLISH & PRODUCTION (8-12 hours)

**Goal**: Add video processing, testing, and production deployment

### Task 3.1: Video Processing Pipeline (4-6 hours)

**Out of Scope for Initial Integration** - Defer to future sprint

**Components Needed**:
- FFmpeg for HLS transcoding
- Background job queue (Bull/BullMQ)
- Thumbnail generation (FFmpeg screenshots)
- Processing status tracking in database
- Webhook for completion notifications

### Task 3.2: Comprehensive Testing (2-3 hours)

**Create Test Suite**:

**File**: `backend/test-video-library-integration.mjs`

```javascript
/**
 * Video Library Integration Tests
 * ===============================
 * Tests for frontend-backend integration
 *
 * Run: node backend/test-video-library-integration.mjs
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE = process.env.API_URL || 'http://localhost:10000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// Test suites:
// 1. Stats endpoint
// 2. Exercise listing with pagination
// 3. Exercise creation (YouTube)
// 4. Exercise creation (file upload)
// 5. Video deletion and restore
// 6. Video analytics tracking
```

**Testing Checklist**:
- ✅ Unit tests for stats endpoint
- ✅ Integration tests for create/read/update/delete
- ✅ Frontend component tests (React Testing Library)
- ✅ E2E tests (Playwright or Cypress)
- ✅ Mobile responsiveness testing
- ✅ Accessibility testing (WCAG 2.1 AA)

### Task 3.3: Production Deployment (2-3 hours)

**Deployment Checklist**:
- ✅ Run migrations in production
- ✅ Configure CDN for video delivery (CloudFront, Cloudflare)
- ✅ Set up environment variables (YouTube API key, Redis, etc.)
- ✅ Configure CORS for production frontend domain
- ✅ Set up monitoring (Sentry, LogRocket)
- ✅ Load testing with 100+ videos
- ✅ Database indexes verified
- ✅ Redis cache tested
- ✅ Update deployment documentation

---

## 7. SUCCESS CRITERIA

### Phase 1 Success (Must Have)
- ✅ Stats endpoint returns data without errors
- ✅ Video library loads and displays exercises
- ✅ Search and filters work
- ✅ Can create exercise with YouTube video (Steps 1-2)
- ✅ Can delete exercise/video

### Phase 2 Success (Should Have)
- ✅ CreateExerciseWizard completes all 4 steps
- ✅ NASM phases can be selected
- ✅ Review step shows all entered data
- ✅ VideoPlayerModal plays YouTube videos
- ✅ VideoPlayerModal shows placeholder for uploads

### Phase 3 Success (Nice to Have)
- ✅ Uploaded videos are transcoded to HLS
- ✅ Video thumbnails auto-generate
- ✅ Comprehensive test coverage (>80%)
- ✅ Production deployment successful
- ✅ CDN configured and tested
- ✅ Monitoring and alerts set up

---

## 8. RISK MITIGATION

### Technical Risks

**Risk**: CORS errors prevent frontend-backend communication
**Mitigation**: Configure CORS in backend to allow frontend origin, test in dev first

**Risk**: JWT auth fails for admin routes
**Mitigation**: Verify admin user exists, test token generation, check middleware order

**Risk**: Video upload size exceeds limits
**Mitigation**: Current limit 500MB, increase if needed, add progress indicator

**Risk**: YouTube API quota exhausted
**Mitigation**: Implement Redis caching (24h TTL), fallback to basic validation

**Risk**: Redis not available in production
**Mitigation**: Memory fallback already implemented in redisWrapper.mjs

### Integration Risks

**Risk**: API contract changes break frontend
**Mitigation**: Maintain both `/api/admin/videos` and `/api/admin/exercise-library` routes

**Risk**: Database migrations fail in production
**Mitigation**: Test migrations on staging, have rollback plan, backup database first

**Risk**: Video processing delays frustrate users
**Mitigation**: Show processing status, send email when complete, allow preview before processing

---

## 9. TIMELINE ESTIMATES

### Phase 1: Quick Win (2-4 hours)
- Stats endpoint: 30 min
- Route aliases: 15 min
- Frontend fixes: 30 min
- Testing: 1-2 hours
- **Buffer**: 30 min
- **Total**: 2.5-4 hours

### Phase 2: Complete Features (4-6 hours)
- Wizard Step 3: 2 hours
- Wizard Step 4: 1 hour
- Video player: 2 hours
- Testing: 1 hour
- **Buffer**: 30 min
- **Total**: 4.5-6.5 hours

### Phase 3: Production Ready (8-12 hours)
- Video processing: 4-6 hours
- Comprehensive testing: 2-3 hours
- Deployment: 2-3 hours
- **Buffer**: 1 hour
- **Total**: 9-13 hours

**Grand Total**: 16-24 hours (2-3 days)

---

## 10. NEXT IMMEDIATE ACTIONS

**Start Here**:

1. **Create Stats Endpoint**:
   ```bash
   # Edit backend/routes/dashboard/adminDashboardRoutes.mjs
   # Add GET /stats route
   ```

2. **Add Route Aliases**:
   ```bash
   # Edit backend/core/routes.mjs
   # Add /api/admin/videos alias
   ```

3. **Test Integration**:
   ```bash
   # Terminal 1
   cd backend && npm run dev

   # Terminal 2
   cd frontend && npm run dev

   # Terminal 3
   # Generate admin token
   node backend/scripts/generate-admin-token.mjs
   ```

4. **Verify Working**:
   - Visit admin video library page
   - Check stats banner loads
   - Check video list loads (may be empty)
   - Try creating exercise (Steps 1-2)

---

## 11. DEFINITION OF DONE

**Phase 1 Complete When**:
- [ ] Stats endpoint returns valid data
- [ ] Video library page loads without errors
- [ ] Can create exercise with YouTube video
- [ ] Can view exercise in library
- [ ] Can delete exercise
- [ ] No console errors in browser

**Phase 2 Complete When**:
- [ ] All 4 wizard steps functional
- [ ] NASM phases selection works
- [ ] Review step shows all data
- [ ] VideoPlayerModal plays YouTube videos
- [ ] Can complete full exercise creation flow

**Phase 3 Complete When**:
- [ ] Video processing pipeline functional
- [ ] 80%+ test coverage
- [ ] Production deployment successful
- [ ] CDN configured
- [ ] Monitoring active
- [ ] Documentation updated

---

**Blueprint Status**: 🚧 **In Progress** - Proceeding to Phase 1 Implementation
**Next Step**: Create stats endpoint and route aliases
**Estimated Completion**: 2026-01-08 (Phase 1), 2026-01-09 (Phase 2)
