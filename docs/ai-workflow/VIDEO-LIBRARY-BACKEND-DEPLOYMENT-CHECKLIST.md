# Video Library Backend Deployment Checklist

**Status:** Ready for Testing (Migrations Pending)
**Created:** 2025-11-13
**Phase:** Phase 1 - Core Backend Implementation

---

## Summary

All Video Library backend code is complete and ready for deployment:

✅ **3 Database Migrations** (soft deletes, security indexes, auto-update triggers)
✅ **Security Middleware** (requireAdmin, requireTrainerOrAdmin, optionalAuth)
✅ **7 API Endpoints** (create, list, get, update, delete, restore, track-view)
✅ **Controller with Transactions** (atomic exercise + video creation)
✅ **Routes Registered** (/api/admin/exercise-library)
✅ **Input Validation** (Joi schemas for all endpoints)
✅ **YouTube Integration** (YouTube Data API v3 for metadata fetching)

---

## Pre-Deployment Requirements

### 1. Fix Existing Migration Issue

**Problem:** Migration `20250714000002-create-daily-workout-forms.cjs` references non-existent `WorkoutSessions` table.

**Blocking:** This migration runs before our Video Library migrations and fails.

**Solution Options:**

**Option A: Fix WorkoutSessions Migration (Recommended)**
```bash
cd backend
# Create the missing WorkoutSessions table migration
# OR
# Fix the foreign key reference in 20250714000002-create-daily-workout-forms.cjs
```

**Option B: Temporarily Skip Problematic Migration**
```bash
cd backend
# Manually insert migration record to mark it as "up" without running it
psql -d swanstudios_pt -c "INSERT INTO \"SequelizeMeta\" (name) VALUES ('20250714000002-create-daily-workout-forms.cjs');"
```

**Option C: Run Video Library Migrations Manually (Quick Test)**
```sql
-- Connect to database
psql -d swanstudios_pt

-- Run migrations manually (copy SQL from migration files)
-- See "Manual Migration SQL" section below
```

---

### 2. Install Missing NPM Dependencies

The Video Library controller uses `joi` and `axios` which may not be installed:

```bash
cd backend
npm install joi axios
```

**Required packages:**
- `joi` - Input validation (used in all endpoints)
- `axios` - HTTP client (used for YouTube Data API v3)

---

### 3. Configure Environment Variables

Add to `backend/.env`:

```bash
# YouTube Data API v3 (for YouTube video metadata fetching)
YOUTUBE_API_KEY=your_youtube_api_key_here

# JWT Secret (should already exist, but verify)
JWT_SECRET=your_jwt_secret_key_here

# Database (should already exist)
DATABASE_URL=postgresql://user:password@localhost:5432/swanstudios_pt
```

**Get YouTube API Key:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project
3. Enable "YouTube Data API v3"
4. Create credentials → API Key
5. Restrict API key to YouTube Data API v3 only

---

## Deployment Steps

### Step 1: Install Dependencies

```bash
cd backend
npm install joi axios
```

**Expected output:**
```
added 2 packages in 3s
```

---

### Step 2: Run Database Migrations

**If WorkoutSessions issue is fixed:**
```bash
cd backend
npm run migrate
```

**If using manual migration (testing only):**
See "Manual Migration SQL" section below.

---

### Step 3: Verify Migrations Ran

```bash
cd backend
npm run migrate:status | grep "20251113"
```

**Expected output:**
```
up 20251113000000-create-exercise-videos-table.cjs
up 20251113000001-create-video-analytics-table.cjs
up 20251113000002-add-video-library-to-exercise-library.cjs
```

---

### Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected output:**
```
✅ Database connected successfully
🚀 Server running on http://localhost:3001
📋 API docs: http://localhost:3001/api-docs
```

---

### Step 5: Test API Endpoints

See "Testing Guide" section below for curl/Postman examples.

---

## Manual Migration SQL (Emergency Bypass)

If automated migrations are blocked, run this SQL manually in `psql`:

### Migration 1: Create exercise_videos Table

```sql
-- Create video_type enum
CREATE TYPE video_type_enum AS ENUM ('youtube', 'upload');

-- Create exercise_videos table
CREATE TABLE IF NOT EXISTS exercise_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercise_library(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
  video_type video_type_enum NOT NULL,
  video_id VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  duration_seconds INTEGER NOT NULL,
  thumbnail_url VARCHAR(500),
  hls_manifest_url VARCHAR(500),
  hls_variants JSONB,
  original_filename VARCHAR(300),
  file_size_bytes BIGINT,
  chapters JSONB,
  approved BOOLEAN NOT NULL DEFAULT true,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  is_public BOOLEAN NOT NULL DEFAULT true,
  views INTEGER NOT NULL DEFAULT 0,
  tags JSONB,
  "deletedAt" TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_uploader_id ON exercise_videos(uploader_id) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_video_type ON exercise_videos(video_type) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_approved ON exercise_videos(approved) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_is_public ON exercise_videos(is_public) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_created_at ON exercise_videos(created_at DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_views ON exercise_videos(views DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_tags ON exercise_videos USING GIN (tags) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_exercise_videos_active_public ON exercise_videos(exercise_id, approved, is_public)
  WHERE "deletedAt" IS NULL AND approved = true AND is_public = true;

-- Mark as migrated
INSERT INTO "SequelizeMeta" (name) VALUES ('20251113000000-create-exercise-videos-table.cjs');
```

### Migration 2: Create video_analytics Table

```sql
-- Create view_context enum
CREATE TYPE view_context_enum AS ENUM ('admin_library', 'client_dashboard', 'workout_plan', 'exercise_detail');

-- Create video_analytics table
CREATE TABLE IF NOT EXISTS video_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES exercise_videos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  watch_duration_seconds INTEGER NOT NULL DEFAULT 0,
  completion_percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  completed BOOLEAN NOT NULL DEFAULT false,
  chapters_viewed JSONB,
  replay_count INTEGER NOT NULL DEFAULT 0,
  pause_count INTEGER NOT NULL DEFAULT 0,
  session_id VARCHAR(100),
  device_type VARCHAR(50),
  user_agent VARCHAR(500),
  view_context view_context_enum,
  workout_id UUID,
  "deletedAt" TIMESTAMP,
  viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_viewed_at ON video_analytics(viewed_at DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_completed ON video_analytics(completed) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_workout_id ON video_analytics(workout_id) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_video_viewed ON video_analytics(video_id, viewed_at DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_user_viewed ON video_analytics(user_id, viewed_at DESC) WHERE "deletedAt" IS NULL;
CREATE INDEX idx_video_analytics_chapters ON video_analytics USING GIN (chapters_viewed) WHERE "deletedAt" IS NULL;

-- Mark as migrated
INSERT INTO "SequelizeMeta" (name) VALUES ('20251113000001-create-video-analytics-table.cjs');
```

### Migration 3: Add Video Fields to exercise_library

```sql
-- Add columns to exercise_library
ALTER TABLE exercise_library
  ADD COLUMN IF NOT EXISTS video_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS primary_video_id UUID REFERENCES exercise_videos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Create index
CREATE INDEX IF NOT EXISTS idx_exercise_library_deleted_at ON exercise_library("deletedAt") WHERE "deletedAt" IS NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION update_exercise_video_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE exercise_library
  SET video_count = (
    SELECT COUNT(*)
    FROM exercise_videos
    WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id)
      AND "deletedAt" IS NULL
      AND approved = true
      AND is_public = true
  )
  WHERE id = COALESCE(NEW.exercise_id, OLD.exercise_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_video_count_on_insert ON exercise_videos;
CREATE TRIGGER trigger_video_count_on_insert
AFTER INSERT ON exercise_videos
FOR EACH ROW
EXECUTE FUNCTION update_exercise_video_count();

DROP TRIGGER IF EXISTS trigger_video_count_on_update ON exercise_videos;
CREATE TRIGGER trigger_video_count_on_update
AFTER UPDATE OF approved, is_public, "deletedAt" ON exercise_videos
FOR EACH ROW
EXECUTE FUNCTION update_exercise_video_count();

DROP TRIGGER IF EXISTS trigger_video_count_on_delete ON exercise_videos;
CREATE TRIGGER trigger_video_count_on_delete
AFTER DELETE ON exercise_videos
FOR EACH ROW
EXECUTE FUNCTION update_exercise_video_count();

-- Backfill video_count
UPDATE exercise_library el
SET video_count = (
  SELECT COUNT(*)
  FROM exercise_videos ev
  WHERE ev.exercise_id = el.id
    AND ev."deletedAt" IS NULL
    AND ev.approved = true
    AND ev.is_public = true
);

-- Mark as migrated
INSERT INTO "SequelizeMeta" (name) VALUES ('20251113000002-add-video-library-to-exercise-library.cjs');
```

---

## Testing Guide

### Get Admin Token

First, log in as admin to get JWT token:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@swanstudios.com",
    "password": "your_admin_password"
  }'
```

**Copy the `token` from response.**

---

### Test 1: Create Exercise with YouTube Video

```bash
curl -X POST http://localhost:3001/api/admin/exercise-library \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dumbbell Chest Press",
    "description": "A compound pushing exercise targeting chest, shoulders, and triceps",
    "primary_muscle": "chest",
    "secondary_muscles": ["shoulders", "triceps"],
    "equipment": "dumbbell",
    "difficulty": "intermediate",
    "movement_patterns": ["pushing"],
    "nasm_phases": [2, 3, 4],
    "contraindications": ["shoulder_impingement"],
    "acute_variables": {
      "sets": "3-4",
      "reps": "8-12",
      "tempo": "2-0-2",
      "rest": "60-90s"
    },
    "video": {
      "type": "youtube",
      "video_id": "VmB1G1K7v94",
      "tags": ["beginner-friendly", "home-workout"]
    }
  }'
```

**Expected Response:** 201 Created with exercise and video details

---

### Test 2: List Exercises with Videos

```bash
curl -X GET "http://localhost:3001/api/admin/exercise-library?page=1&limit=20&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** 200 OK with exercises array and pagination

---

### Test 3: Get Videos for Specific Exercise

```bash
curl -X GET http://localhost:3001/api/admin/exercise-library/EXERCISE_ID/videos \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** 200 OK with exercise details and videos array

---

### Test 4: Update Video Metadata

```bash
curl -X PATCH http://localhost:3001/api/admin/exercise-library/videos/VIDEO_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Video Title",
    "tags": ["updated-tag"],
    "is_public": false
  }'
```

**Expected Response:** 200 OK with updated video

---

### Test 5: Soft Delete Video

```bash
curl -X DELETE http://localhost:3001/api/admin/exercise-library/videos/VIDEO_ID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** 200 OK with soft delete confirmation

---

### Test 6: Restore Deleted Video

```bash
curl -X POST http://localhost:3001/api/admin/exercise-library/videos/VIDEO_ID/restore \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Expected Response:** 200 OK with restored video

---

### Test 7: Track Video View

```bash
curl -X POST http://localhost:3001/api/admin/exercise-library/videos/VIDEO_ID/track-view \
  -H "Content-Type: application/json" \
  -d '{
    "watch_duration_seconds": 120,
    "completion_percentage": 75.5,
    "device_type": "desktop",
    "view_context": "admin_library"
  }'
```

**Expected Response:** 201 Created

---

## Error Handling Checklist

### Common Errors and Solutions

**Error:** `JWT_SECRET is not defined`
- **Solution:** Add `JWT_SECRET` to `backend/.env`

**Error:** `YouTube API key not configured`
- **Solution:** Add `YOUTUBE_API_KEY` to `backend/.env`

**Error:** `YouTube video not found`
- **Solution:** Verify video ID is correct and video is public

**Error:** `relation "exercise_videos" does not exist`
- **Solution:** Run migrations (Step 2)

**Error:** `Cannot read property 'id' of undefined` (req.user)
- **Solution:** Ensure Authorization header is included: `Bearer YOUR_TOKEN`

**Error:** `Validation failed`
- **Solution:** Check request body matches Joi schema (see controller comments)

---

## Rollback Plan

If deployment causes issues, rollback with:

```bash
cd backend

# Rollback migrations
npm run migrate:undo
npm run migrate:undo
npm run migrate:undo

# Or manually via SQL
psql -d swanstudios_pt -c "DELETE FROM \"SequelizeMeta\" WHERE name LIKE '20251113%';"
psql -d swanstudios_pt -c "DROP TABLE IF EXISTS video_analytics;"
psql -d swanstudios_pt -c "DROP TABLE IF EXISTS exercise_videos;"
psql -d swanstudios_pt -c "ALTER TABLE exercise_library DROP COLUMN IF EXISTS video_count, DROP COLUMN IF EXISTS primary_video_id, DROP COLUMN IF EXISTS deletedAt;"

# Restart server
npm run dev
```

---

## Success Criteria

### ✅ Deployment Successful When:

1. **Migrations Run Without Errors**
   - All 3 migrations show "up" in `npm run migrate:status`
   - Tables `exercise_videos` and `video_analytics` exist
   - Column `exercise_library.video_count` exists

2. **Server Starts Without Errors**
   - No import errors for `videoLibraryController.mjs`
   - No route registration errors
   - Server logs show: "Server running on http://localhost:3001"

3. **API Endpoints Respond**
   - POST /api/admin/exercise-library returns 201 Created
   - GET /api/admin/exercise-library returns 200 OK with data
   - Authorization middleware correctly rejects non-admin users

4. **YouTube Integration Works**
   - Creating exercise with YouTube video fetches metadata
   - Video title/description/thumbnail auto-populate

5. **Soft Deletes Work**
   - Deleting video sets `deletedAt` timestamp
   - Deleted videos don't appear in list endpoint
   - Restore endpoint can recover deleted videos

6. **Database Triggers Work**
   - Creating video increments `exercise_library.video_count`
   - Soft deleting video decrements count
   - Approving/unapproving video updates count

---

## Next Steps After Deployment

1. **Connect Frontend**
   - Update frontend API client to use new endpoints
   - Test Create Exercise Wizard with real backend
   - Test video playback with YouTube videos

2. **Add Seed Data**
   - Create 10-20 NASM exercises with YouTube demos
   - Populate all 5 NASM phases
   - Cover all major muscle groups

3. **Phase 2: Video Upload**
   - Implement S3/storage upload endpoint
   - Add FFmpeg video processing
   - Generate HLS variants for adaptive streaming

4. **Monitor & Optimize**
   - Add logging for slow queries
   - Monitor YouTube API quota usage
   - Optimize indexes if queries are slow

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-11-13
**Prepared By:** Claude Code
**Next Review:** After successful deployment

