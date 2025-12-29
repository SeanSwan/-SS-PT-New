# Admin Video Library - Backend Implementation Plan

**Status:** 🚧 READY TO START
**Last Updated:** 2025-11-13
**Priority:** CRITICAL - Week 1 Deliverable
**Frontend Status:** ✅ Complete (950+ lines, 6 components)
**Backend Status:** ⏳ Pending (this plan)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Implementation Phases](#implementation-phases)
3. [Database Migrations](#database-migrations)
4. [API Endpoints](#api-endpoints)
5. [File Structure](#file-structure)
6. [Testing Strategy](#testing-strategy)
7. [Deployment Checklist](#deployment-checklist)

---

## Executive Summary

###What We're Building
**11 API endpoints** + **2 database tables** to power the Admin Video Library frontend.

**Goal:** Enable admins to create exercises with videos (YouTube OR uploads) and manage a comprehensive video library.

**Time Estimate:** 32-45 hours (4-6 business days)

**Dependencies:**
- PostgreSQL database (existing)
- Express.js backend (existing)
- AWS S3 or local storage (for video uploads - Phase 2)
- YouTube Data API v3 (for YouTube integration - Phase 2)

---

## Implementation Phases

### **Phase 1: Database + Core APIs** (12-16 hours) - START HERE

**Goal:** Get the frontend working with mock/YouTube data

**Deliverables:**
1. ✅ Database migrations (2 tables)
2. ✅ Exercise Library CRUD (4 endpoints)
3. ✅ YouTube validation API (1 endpoint)
4. ✅ Video Library GET API (1 endpoint)
5. ✅ Dashboard stats API (1 endpoint)

**No video upload yet** - just database structure and YouTube links.

---

### **Phase 2: Video Upload** (12-16 hours) - AFTER PHASE 1

**Goal:** Enable actual video uploads with processing

**Deliverables:**
1. ✅ Video upload endpoint (multipart)
2. ✅ Video processing status endpoint
3. ✅ S3/local storage setup
4. ✅ FFmpeg HLS encoding (background job)
5. ✅ Thumbnail generation

---

### **Phase 3: Advanced Features** (8-12 hours) - FUTURE

**Goal:** Polish and optimize

**Deliverables:**
1. ✅ Video analytics tracking
2. ✅ Search/filter optimization
3. ✅ CDN integration
4. ✅ Video chapters support
5. ✅ Admin approval workflow

---

## Database Migrations

### Migration 1: Create exercise_videos Table

**File:** `backend/migrations/20251113000000-create-exercise-videos-table.cjs`

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('exercise_videos', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('exercise_id').references('id').inTable('exercise_library').onDelete('CASCADE');
    table.string('video_type', 20).notNullable(); // 'upload', 'youtube', 'vimeo'
    table.string('video_id', 200).notNullable(); // YouTube ID or S3 path
    table.string('title', 200).notNullable();
    table.text('description');
    table.integer('duration_seconds').notNullable();
    table.string('thumbnail_url', 500);
    table.string('hls_manifest_url', 500); // for uploaded videos
    table.jsonb('chapters'); // [{time: number, title: string}]
    table.uuid('uploader_id').references('id').inTable('users');
    table.boolean('approved').defaultTo(true); // admin uploads auto-approved
    table.boolean('is_public').defaultTo(true);
    table.timestamp('deletedAt').nullable(); // For soft deletes
    table.integer('views').defaultTo(0);
    table.jsonb('tags'); // ['phase1', 'dumbbell', 'chest']
    table.timestamps(true, true); // created_at, updated_at
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_exercise_videos_exercise_id ON exercise_videos(exercise_id)');
  await knex.schema.raw('CREATE INDEX idx_exercise_videos_video_type ON exercise_videos(video_type)');
  await knex.schema.raw('CREATE INDEX idx_exercise_videos_approved ON exercise_videos(approved)');
  await knex.schema.raw('CREATE INDEX idx_exercise_videos_tags ON exercise_videos USING GIN(tags)');

  // Unique constraint: video_id must be unique per type
  await knex.schema.raw('CREATE UNIQUE INDEX idx_exercise_videos_unique_video ON exercise_videos(video_type, video_id)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('exercise_videos');
};
```

---

### Migration 2: Create video_analytics Table

**File:** `backend/migrations/20251113000001-create-video-analytics-table.cjs`

```javascript
exports.up = async function(knex) {
  await knex.schema.createTable('video_analytics', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('video_id').references('id').inTable('exercise_videos').onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users');
    table.integer('watched_duration_seconds').notNullable();
    table.decimal('completion_percentage', 5, 2); // 0.00 - 100.00
    table.timestamp('watched_at').defaultTo(knex.fn.now());
  });

  // Indexes
  await knex.schema.raw('CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id)');
  await knex.schema.raw('CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id)');
  await knex.schema.raw('CREATE INDEX idx_video_analytics_watched_at ON video_analytics(watched_at)');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('video_analytics');
};
```

---

### Migration 3: Enhance exercise_library Table (if needed)

**File:** `backend/migrations/20251113000002-enhance-exercise-library-table.cjs`

**Check if exercise_library table exists first.** If not, we'll need to create it with all NASM fields.

```javascript
exports.up = async function(knex) {
  const tableExists = await knex.schema.hasTable('exercise_library');

  if (!tableExists) {
    // Create new exercise_library table with all fields
    await knex.schema.createTable('exercise_library', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name', 200).notNullable();
      table.text('description').notNullable();
      table.string('primary_muscle', 50).notNullable();
      table.specificType('secondary_muscles', 'VARCHAR(50)[]'); // array
      table.string('equipment', 50).notNullable();
      table.string('difficulty', 20).notNullable(); // 'beginner', 'intermediate', 'advanced'
      table.specificType('movement_patterns', 'VARCHAR(50)[]'); // array
      table.specificType('nasm_phases', 'INTEGER[]'); // array [1,2,3,4,5]
      table.jsonb('contraindications'); // [{condition: string, modification: string}]
      table.jsonb('acute_variables'); // [{phase: number, reps: string, ...}]
      table.uuid('created_by').references('id').inTable('users');
      table.timestamp('deletedAt').nullable(); // For soft deletes
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    });

    // Indexes
    await knex.schema.raw('CREATE INDEX idx_exercise_library_primary_muscle ON exercise_library(primary_muscle)');
    await knex.schema.raw('CREATE INDEX idx_exercise_library_equipment ON exercise_library(equipment)');
    await knex.schema.raw('CREATE INDEX idx_exercise_library_difficulty ON exercise_library(difficulty)');
    await knex.schema.raw('CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN(nasm_phases)');
    await knex.schema.raw('CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN(movement_patterns)');
  } else {
    // Table exists, check for missing columns and add them
    const hasNasmPhases = await knex.schema.hasColumn('exercise_library', 'nasm_phases');
    if (!hasNasmPhases) {
      await knex.schema.alterTable('exercise_library', table => {
        table.specificType('nasm_phases', 'INTEGER[]');
        table.specificType('movement_patterns', 'VARCHAR(50)[]');
        table.jsonb('contraindications');
        table.jsonb('acute_variables');
        table.timestamp('deletedAt').nullable();
      });

      // Add indexes for new columns
      await knex.schema.raw('CREATE INDEX idx_exercise_library_nasm_phases ON exercise_library USING GIN(nasm_phases)');
      await knex.schema.raw('CREATE INDEX idx_exercise_library_movement_patterns ON exercise_library USING GIN(movement_patterns)');
    }
  }
};

exports.down = async function(knex) {
  // Only drop if we created it (check for created_by column as a marker)
  const hasCreatedBy = await knex.schema.hasColumn('exercise_library', 'created_by');
  if (hasCreatedBy) {
    await knex.schema.dropTableIfExists('exercise_library');
  }
};
```

---

## API Endpoints

### Phase 1 Endpoints (Start Here)

#### 1. Create Exercise with Video
```javascript
// POST /api/admin/exercise-library
// Authorization: Bearer {admin_token}, Role: 'admin'
POST /api/admin/exercise-library
Authorization: Bearer {admin_token}

Request Body:
{
  "name": "Dumbbell Chest Press",
  "description": "A compound pushing exercise...",
  "primary_muscle": "chest",
  "secondary_muscles": ["anterior_deltoid", "triceps"],
  "equipment": "dumbbell",
  "difficulty": "intermediate",
  "movement_patterns": ["pushing"],
  "nasm_phases": [2, 3, 4],
  "contraindications": [{"condition": "shoulder_impingement", "modification": "Use neutral grip"}],
  "acute_variables": [{
    "phase": 2,
    "reps": "12-15",
    "sets": "2-4",
    "tempo": "2/0/2",
    "rest": "30-60s"
  }],
  "video": {
    "type": "youtube", // or "upload"
    "video_id": "dQw4w9WgXcQ",
    "title": "Dumbbell Chest Press Demo",
    "duration_seconds": 154,
    "chapters": [{"time": 0, "title": "Introduction"}]
  }
}

Response 201:
{
  "id": "exercise-uuid",
  "video_id": "video-uuid",
  "message": "Exercise created successfully"
}
```

**Implementation:**
- Validate input (all required fields)
- Create exercise_library record
- Create exercise_videos record
- Return both IDs

---

#### 2. Get Exercise by ID
```javascript
GET /api/admin/exercise-library/:id
Authorization: Bearer {admin_token}

Response 200:
{
  "id": "uuid",
  "name": "Dumbbell Chest Press",
  ...all exercise fields...,
  "video": {
    "id": "video-uuid",
    "video_type": "youtube",
    "video_id": "dQw4w9WgXcQ",
    "thumbnail_url": "...",
    "duration_seconds": 154
  }
}
```

**Implementation:**
- Query exercise_library with LEFT JOIN on exercise_videos
- Return combined data

---

#### 3. Update Exercise
```javascript
PUT /api/admin/exercise-library/:id
Authorization: Bearer {admin_token}

Request Body: (same as create, all fields optional)

Response 200:
{
  "id": "uuid",
  "message": "Exercise updated successfully"
}
```

**Implementation:**
- Validate input
- Update exercise_library record
- If video object provided, update/create exercise_videos record
- Handle video swaps (delete old, create new)

---

#### 4. Delete Exercise
```javascript
DELETE /api/admin/exercise-library/:id
Authorization: Bearer {admin_token}

Response 200:
{
  "message": "Exercise deleted successfully"
}
```

**Implementation:**
- Delete exercise_library record
- CASCADE will delete exercise_videos automatically
- Return success

---

#### 5. Validate YouTube URL
```javascript
POST /api/admin/videos/validate-youtube
Authorization: Bearer {admin_token}

Request Body:
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}

Response 200:
{
  "valid": true,
  "videoId": "dQw4w9WgXcQ",
  "title": "Video Title from YouTube",
  "description": "Video description...",
  "duration_seconds": 154,
  "thumbnail_url": "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
  "channel": "Channel Name"
}
```

**Implementation (Simple - No API Key):**
```javascript
// Extract video ID from URL (regex)
const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
const match = url.match(youtubeRegex);
const videoId = match ? match[1] : null;

// Return basic info (thumbnail is predictable)
return {
  valid: !!videoId,
  videoId,
  thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  // For title/description/duration, need YouTube Data API (Phase 2)
  title: null,
  description: null,
  duration_seconds: null
};
```

**Implementation (Full - YouTube Data API v3):**
```javascript
// Requires API key: https://console.cloud.google.com/apis/library/youtube.googleapis.com
const response = await fetch(
  `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${process.env.YOUTUBE_API_KEY}`
);
const data = await response.json();
// Parse and return video metadata
```

---

#### 6. Get All Videos (Library)
```javascript
GET /api/admin/videos?page=1&limit=20&phase=2&equipment=dumbbell&search=chest
Authorization: Bearer {admin_token}

Response 200:
{
  "videos": [
    {
      "id": "video-uuid",
      "exercise_id": "exercise-uuid",
      "title": "Dumbbell Chest Press",
      "thumbnail_url": "...",
      "duration_seconds": 154,
      "views": 124,
      "phases": [2, 3, 4], // from exercise_library.nasm_phases
      "equipment": "dumbbell", // from exercise_library.equipment
      "primary_muscle": "chest", // from exercise_library.primary_muscle
      "video_type": "youtube",
      "created_at": "2025-11-13T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 247,
    "page": 1,
    "limit": 20,
    "totalPages": 13
  }
}
```

**Implementation:**
```javascript
// Join exercise_videos with exercise_library
// Filter by:
//   - search query (exercise name, description)
//   - nasm_phases (array contains value)
//   - equipment
//   - primary_muscle
// Paginate results
// Return combined data
```

---

#### 7. Delete Video
```javascript
DELETE /api/admin/videos/:id
Authorization: Bearer {admin_token}

Response 200:
{
  "message": "Video deleted successfully"
}
```

**Implementation:**
- Delete exercise_videos record
- If video_type === 'upload', also delete S3 files (Phase 2)
- Return success

---

#### 8. Get Dashboard Stats
```javascript
GET /api/admin/dashboard/stats
Authorization: Bearer {admin_token}

Response 200:
{
  "total_videos": 247,
  "total_exercises": 156,
  "total_templates": 92 // from workout_templates table (if exists)
}
```

**Implementation:**
```javascript
const stats = await db.transaction(async trx => {
  const [videos] = await trx('exercise_videos').count('id as count');
  const [exercises] = await trx('exercise_library').count('id as count');
  const [templates] = await trx('workout_templates').count('id as count').catch(() => [{count: 0}]);

  return {
    total_videos: parseInt(videos.count),
    total_exercises: parseInt(exercises.count),
    total_templates: parseInt(templates.count)
  };
});
```

---

### Phase 2 Endpoints (Later)

#### 9. Upload Video
```javascript
POST /api/admin/videos/upload
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

Request Body:
- video: File (required)
- title: string (optional)
- description: string (optional)
- tags: string[] (optional)

Response 201:
{
  "id": "video-uuid",
  "uploadId": "upload-uuid",
  "status": "processing",
  "message": "Video uploaded successfully, processing in background"
}
```

**Implementation:**
- Use multer for multipart upload
- Save to S3 or local storage
- Create exercise_videos record with status='processing'
- Trigger background job (FFmpeg HLS encoding)
- Return video ID

---

#### 10. Get Video Processing Status
```javascript
GET /api/admin/videos/:id/status
Authorization: Bearer {admin_token}

Response 200:
{
  "id": "video-uuid",
  "status": "ready", // 'uploading' | 'processing' | 'ready' | 'error'
  "progress": 100,
  "thumbnail_url": "https://cdn.../thumbnail.jpg",
  "hls_manifest_url": "https://cdn.../master.m3u8",
  "duration_seconds": 154
}
```

**Implementation:**
- Query exercise_videos table
- Return processing status
- If ready, return CDN URLs

---

#### 11. Get Video Analytics
```javascript
GET /api/admin/videos/:id/analytics
Authorization: Bearer {admin_token}

Response 200:
{
  "total_views": 124,
  "unique_viewers": 45,
  "avg_completion_rate": 78.5,
  "watch_time_hours": 12.3
}
```

**Implementation:**
- Query video_analytics table
- Aggregate stats
- Return summary

---

## File Structure

```
backend/
├── routes/
│   └── adminVideoRoutes.mjs          # All 11 endpoints
├── controllers/
│   └── adminVideoController.mjs      # Business logic
├── services/
│   ├── youtubeService.mjs            # YouTube validation
│   ├── videoUploadService.mjs        # S3 upload (Phase 2)
│   └── videoProcessingService.mjs    # FFmpeg HLS (Phase 2)
├── models/
│   ├── ExerciseLibrary.mjs           # Knex model
│   └── ExerciseVideo.mjs             # Knex model
├── middleware/
│   └── adminAuth.mjs                 # Admin role check (existing)
├── migrations/
│   ├── 20251113000000-create-exercise-videos-table.cjs
│   ├── 20251113000001-create-video-analytics-table.cjs
│   └── 20251113000002-enhance-exercise-library-table.cjs
└── core/
    └── routes.mjs                     # Import adminVideoRoutes

**Total Files to Create:** 10 files
**Total LOC Estimate:** 1,500-2,000 lines

---

## Testing Strategy

### Unit Tests (Backend)

**File:** `backend/tests/adminVideo.test.mjs`

```javascript
describe('Admin Video API', () => {
  describe('POST /api/admin/exercise-library', () => {
    it('should create exercise with YouTube video', async () => {
      // Test creating exercise with YouTube link
    });

    it('should reject invalid data', async () => {
      // Test validation
    });
  });

  describe('GET /api/admin/videos', () => {
    it('should return paginated videos', async () => {
      // Test pagination
    });

    it('should filter by phase and equipment', async () => {
      // Test filtering
    });
  });

  // ... more tests for all 11 endpoints
});
```

**Run tests:**
```bash
cd backend
npm test
```

---

### Integration Tests (Frontend + Backend)

**File:** `frontend/src/tests/admin-video-library.test.tsx`

```javascript
describe('Admin Video Library Integration', () => {
  it('should create exercise and display in library', async () => {
    // 1. Create exercise via API
    // 2. Verify it appears in library
    // 3. Verify video player works
  });
});
```

---

### Manual Testing Checklist

- [ ] Create exercise with YouTube video
- [ ] Verify video appears in library grid
- [ ] Search for video by name
- [ ] Filter by phase (e.g., Phase 2)
- [ ] Filter by equipment (e.g., Dumbbell)
- [ ] Click video card → player modal opens
- [ ] Play YouTube video inline
- [ ] Edit exercise details
- [ ] Delete exercise → video removed from library
- [ ] Check stats banner updates
- [ ] Test pagination (if > 20 videos)

---

## Deployment Checklist

### Development (Local)

1. **Run migrations:**
   ```bash
   cd backend
   npm run migrate:latest
   ```

2. **Verify tables:**
   ```bash
   psql -U postgres -d swanstudios -c "\dt" | grep exercise
   ```

3. **Start backend:**
   ```bash
   npm run dev
   ```

4. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/api/admin/dashboard/stats
   ```

---

### Staging

1. **Run migrations on staging DB**
2. **Deploy backend code**
3. **Test all 8 Phase 1 endpoints**
4. **Load test (100 concurrent requests)**
5. **Security audit (SQL injection, XSS)**

---

### Production

1. **Backup database**
2. **Run migrations**
3. **Deploy with feature flag:**
   ```javascript
   if (process.env.VIDEO_LIBRARY_ENABLED === 'true') {
     app.use('/api/admin', adminVideoRoutes);
   }
   ```
4. **Gradual rollout:**
   - 5% of admins (Week 1)
   - 25% of admins (Week 2)
   - 100% of admins (Week 3)
5. **Monitor error rates**

---

## Next Steps

### Step 1: Run Database Migrations (30 minutes)

```bash
cd backend
npm run migrate:latest
```

Verify tables created:
```bash
psql -U postgres -d swanstudios -c "SELECT * FROM exercise_videos LIMIT 1;"
```

---

### Step 2: Create Backend Files (8-12 hours)

**Priority order:**
1. `adminVideoRoutes.mjs` - Define all routes
2. `adminVideoController.mjs` - Business logic
3. `youtubeService.mjs` - YouTube validation
4. `ExerciseLibrary.mjs` - Knex model
5. `ExerciseVideo.mjs` - Knex model
6. Update `core/routes.mjs` - Import new routes

---

### Step 3: Test Each Endpoint (2-4 hours)

Use Postman or curl to test all 8 Phase 1 endpoints.

---

### Step 4: Connect Frontend (1-2 hours)

- Remove mock data from frontend
- Test full flow: Create Exercise → View in Library

---

### Step 5: Deploy to Staging (2-3 hours)

- Run migrations on staging
- Deploy backend
- Test end-to-end

---

## Time Breakdown

| Task | Est. Time |
|------|-----------|
| **Phase 1: Core APIs** | **12-16 hours** |
| - Database migrations | 1-2 hours |
| - Exercise CRUD (4 endpoints) | 4-6 hours |
| - YouTube validation | 2-3 hours |
| - Video library GET | 2-3 hours |
| - Dashboard stats | 1-2 hours |
| - Testing & debugging | 2-3 hours |
| **Phase 2: Video Upload** | **12-16 hours** |
| - Multer setup | 2-3 hours |
| - S3 integration | 3-4 hours |
| - FFmpeg HLS encoding | 4-6 hours |
| - Background jobs (Bull) | 2-3 hours |
| - Testing | 1-2 hours |
| **Phase 3: Advanced** | **8-12 hours** |
| - Video analytics | 3-4 hours |
| - Search optimization | 2-3 hours |
| - CDN setup | 2-3 hours |
| - Polish | 1-2 hours |
| **TOTAL** | **32-44 hours** |

---

## Success Criteria

### Phase 1 Success ✅

- [ ] 3 database tables created
- [ ] 8 API endpoints implemented
- [ ] All endpoints tested (Postman/curl)
- [ ] Frontend connects successfully
- [ ] Can create exercise with YouTube video
- [ ] Video appears in library grid
- [ ] Video plays in modal
- [ ] Stats banner shows correct counts

### Full Implementation Success ✅

- [ ] All 11 endpoints working
- [ ] Video upload with drag-drop
- [ ] HLS encoding complete
- [ ] Deployed to production
- [ ] 90%+ test coverage
- [ ] User acceptance testing passed

---

**Ready to start?** Let me know and I'll begin implementing Phase 1!
