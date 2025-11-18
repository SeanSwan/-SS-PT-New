/**
 * Video Library API Testing Script
 * ==================================
 *
 * Tests all 10 Video Library endpoints to verify implementation
 */

const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZXN0YWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3NjM0NzAwNTYsImV4cCI6MTc2MzU1NjQ1Nn0.EWibAJrPyD8mv2K-3WYE1BckhUUlKRnKL0Wm1bW6e7U";
const BASE_URL = "http://localhost:10000";

async function apiRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message
    };
  }
}

console.log('\n🧪 VIDEO LIBRARY API TESTING SUITE');
console.log('=====================================\n');

// TEST 1: List exercises
console.log('📋 TEST 1: List all exercises (GET /api/admin/exercise-library)');
let result = await apiRequest('/api/admin/exercise-library');
console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
if (result.ok) {
  console.log(`   Exercises found: ${result.data.data?.length || 0}`);
  console.log(`   Total: ${result.data.pagination?.total || 0}`);
  if (result.data.data?.[0]) {
    console.log(`   First exercise: ${result.data.data[0].name}`);
  }
} else {
  console.log(`   Error: ${JSON.stringify(result.data).substring(0, 100)}`);
}

// TEST 2: List with pagination
console.log('\n📄 TEST 2: List exercises with pagination (page=1, limit=2)');
result = await apiRequest('/api/admin/exercise-library?page=1&limit=2');
console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
if (result.ok) {
  console.log(`   Page: ${result.data.pagination?.page}`);
  console.log(`   Limit: ${result.data.pagination?.limit}`);
  console.log(`   Total pages: ${result.data.pagination?.totalPages}`);
} else {
  console.log(`   Error: ${JSON.stringify(result.data).substring(0, 100)}`);
}

// TEST 3: Get specific exercise (use first one from database)
console.log('\n🔍 TEST 3: Get specific exercise (GET /api/admin/exercise-library/:id)');
const exerciseId = '6b068ea7-2e6f-4182-9b00-21a47b8f6101'; // Barbell Back Squat
result = await apiRequest(`/api/admin/exercise-library/${exerciseId}`);
console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
if (result.ok) {
  console.log(`   Exercise: ${result.data.name}`);
  console.log(`   Videos attached: ${result.data.videos?.length || 0}`);
} else {
  console.log(`   Error: ${JSON.stringify(result.data).substring(0, 100)}`);
}

// TEST 4: Create new exercise WITHOUT video
console.log('\n➕ TEST 4: Create exercise without video (POST /api/admin/exercise-library)');
result = await apiRequest('/api/admin/exercise-library', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Test Exercise (No Video)',
    description: 'Created by automated test suite'
  })
});
console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
let newExerciseId = null;
if (result.ok) {
  newExerciseId = result.data.id;
  console.log(`   Created exercise ID: ${newExerciseId}`);
  console.log(`   Name: ${result.data.name}`);
} else {
  console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
}

// TEST 5: Create exercise WITH YouTube video (will test YouTube integration)
console.log('\n🎥 TEST 5: Create exercise with YouTube video (YouTube API integration)');
result = await apiRequest('/api/admin/exercise-library', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Push-Up Tutorial with Video',
    description: 'NASM proper form demonstration',
    video_url: 'https://www.youtube.com/watch?v=IODxDxX7oi4',
    video_type: 'youtube'
  })
});
console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
let exerciseWithVideoId = null;
if (result.ok) {
  exerciseWithVideoId = result.data.id;
  console.log(`   Created exercise ID: ${exerciseWithVideoId}`);
  console.log(`   Name: ${result.data.name}`);
  console.log(`   ⏳ YouTube metadata should be fetched in background...`);
} else {
  console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
}

// TEST 6: Update exercise
if (newExerciseId) {
  console.log('\n✏️  TEST 6: Update exercise (PUT /api/admin/exercise-library/:id)');
  result = await apiRequest(`/api/admin/exercise-library/${newExerciseId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: 'Test Exercise (UPDATED)',
      description: 'Updated by automated test'
    })
  });
  console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  if (result.ok) {
    console.log(`   Updated name: ${result.data.name}`);
  } else {
    console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
  }
}

// TEST 7: Get exercise videos
if (exerciseWithVideoId) {
  // Wait 2 seconds for YouTube metadata to be fetched
  console.log('\n⏳ Waiting 2 seconds for YouTube metadata fetch...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🎬 TEST 7: Get exercise videos (GET /api/admin/exercise-library/:id/videos)');
  result = await apiRequest(`/api/admin/exercise-library/${exerciseWithVideoId}/videos`);
  console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
  if (result.ok && Array.isArray(result.data)) {
    console.log(`   Videos found: ${result.data.length}`);
    if (result.data[0]) {
      const video = result.data[0];
      console.log(`   ✅ YouTube metadata fetched successfully!`);
      console.log(`      Video ID: ${video.id}`);
      console.log(`      Title: ${video.title}`);
      console.log(`      Thumbnail: ${video.thumbnail_url ? 'Yes' : 'No'}`);
      console.log(`      Duration: ${video.duration_seconds}s`);

      // TEST 8: Update video metadata
      console.log('\n🔧 TEST 8: Update video metadata (PATCH /api/admin/exercise-library/videos/:id)');
      result = await apiRequest(`/api/admin/exercise-library/videos/${video.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          approved: true,
          is_public: true,
          tags: ['beginner', 'bodyweight', 'chest']
        })
      });
      console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
      if (result.ok) {
        console.log(`   Approved: ${result.data.approved}`);
        console.log(`   Public: ${result.data.is_public}`);
        console.log(`   Tags: ${JSON.stringify(result.data.tags)}`);
      }

      // TEST 9: Track video view
      console.log('\n📊 TEST 9: Track video view (POST /api/admin/exercise-library/videos/:id/track-view)');
      result = await apiRequest(`/api/admin/exercise-library/videos/${video.id}/track-view`, {
        method: 'POST',
        body: JSON.stringify({
          watch_duration_seconds: 45,
          completion_percentage: 75.5,
          completed: false,
          chapters_viewed: [1, 2],
          replay_count: 1,
          pause_count: 2
        })
      });
      console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
      if (result.ok) {
        console.log(`   Analytics recorded: ${result.data.id}`);
        console.log(`   Watch duration: ${result.data.watch_duration_seconds}s`);
        console.log(`   Completion: ${result.data.completion_percentage}%`);
      }

      // TEST 10: Delete video (soft delete)
      console.log('\n🗑️  TEST 10: Soft delete video (DELETE /api/admin/exercise-library/videos/:id)');
      result = await apiRequest(`/api/admin/exercise-library/videos/${video.id}`, {
        method: 'DELETE'
      });
      console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);

      // TEST 11: Restore video
      console.log('\n♻️  TEST 11: Restore video (POST /api/admin/exercise-library/videos/:id/restore)');
      result = await apiRequest(`/api/admin/exercise-library/videos/${video.id}/restore`, {
        method: 'POST'
      });
      console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
      if (result.ok) {
        console.log(`   Video restored: ${result.data.id}`);
        console.log(`   deletedAt: ${result.data.deletedAt || 'null (restored)'}`);
      }
    }
  } else {
    console.log(`   Error or no videos: ${JSON.stringify(result.data).substring(0, 100)}`);
  }
}

// TEST 12: Delete exercise
if (newExerciseId) {
  console.log('\n🗑️  TEST 12: Soft delete exercise (DELETE /api/admin/exercise-library/:id)');
  result = await apiRequest(`/api/admin/exercise-library/${newExerciseId}`, {
    method: 'DELETE'
  });
  console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
}

console.log('\n\n✅ VIDEO LIBRARY API TESTING COMPLETE!');
console.log('=====================================\n');
