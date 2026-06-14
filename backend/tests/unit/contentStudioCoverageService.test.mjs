import { describe, expect, it } from 'vitest';

import {
  buildContentStudioCoveragePayload,
  buildSwanCoachCoveragePromptBlock,
  getCoverageExerciseAttributes,
} from '../../services/contentStudioCoverageService.mjs';

const exerciseModel = {
  rawAttributes: {
    id: {},
    name: {},
    exerciseType: {},
    primaryMuscles: {},
    secondaryMuscles: {},
    exercise_key: {},
    bodyPartCategory: {},
    difficulty: {},
    equipmentNeeded: {},
    source: {},
    description: {},
    videoUrl: {},
    imageUrl: {},
    thumbnailUrl: {},
    defaultTempo: {},
    recommendedSets: {},
  },
};

describe('contentStudioCoverageService', () => {
  it('uses the shared Rolodex media attributes for coverage reads', () => {
    expect(getCoverageExerciseAttributes(exerciseModel)).toEqual(expect.arrayContaining([
      'id',
      'name',
      'exercise_key',
      'bodyPartCategory',
      'videoUrl',
      'imageUrl',
      'thumbnailUrl',
      'defaultTempo',
    ]));
  });

  it('builds video coverage without counting poster-only media as recorded video', () => {
    const payload = buildContentStudioCoveragePayload([
      {
        id: 'ex-video',
        name: 'Video Squat',
        exercise_key: 'video-squat',
        exerciseType: 'strength',
        bodyPartCategory: 'legs',
        primaryMuscles: '["glutes"]',
        difficulty: 420,
        source: 'swanstudios',
        videoUrl: 'https://media.swanstudios.test/squat.mp4',
        imageUrl: 'https://media.swanstudios.test/squat.jpg',
        thumbnailUrl: 'https://media.swanstudios.test/squat.gif',
      },
      {
        id: 'ex-poster-only',
        name: 'Poster Only Plank',
        exercise_key: 'poster-only-plank',
        exerciseType: 'core',
        bodyPartCategory: 'core',
        primaryMuscles: '["core"]',
        difficulty: 320,
        source: 'nasm',
        videoUrl: '',
        imageUrl: 'https://media.swanstudios.test/plank.jpg',
        thumbnailUrl: 'https://media.swanstudios.test/plank.gif',
      },
      {
        id: 'ex-catalog',
        name: 'Catalog Row',
        exercise_key: 'catalog-row',
        exerciseType: 'strength',
        bodyPartCategory: 'back',
        primaryMuscles: '["lats"]',
        difficulty: 500,
        source: 'nasm',
      },
    ], { 'ex-catalog': 2 });

    expect(payload.summary).toEqual({
      totalExercises: 3,
      coveredCount: 2,
      gapCount: 1,
      coveragePercent: 66.7,
    });
    expect(payload.byBodyPart).toMatchObject({
      legs: { total: 1, covered: 1, gaps: 0 },
      core: { total: 1, covered: 0, gaps: 1 },
      back: { total: 1, covered: 1, gaps: 0 },
    });
    expect(payload.exercises[0]).toMatchObject({
      id: 'ex-video',
      exerciseKey: 'video-squat',
      videoUrl: 'https://media.swanstudios.test/squat.mp4',
      imageUrl: 'https://media.swanstudios.test/squat.jpg',
      thumbnailUrl: 'https://media.swanstudios.test/squat.gif',
      mediaPreviewUrl: 'https://media.swanstudios.test/squat.gif',
      hasLegacyVideo: true,
      catalogVideoCount: 0,
      covered: true,
    });
    expect(payload.exercises[1]).toMatchObject({
      id: 'ex-poster-only',
      mediaPreviewUrl: 'https://media.swanstudios.test/plank.gif',
      hasLegacyVideo: false,
      catalogVideoCount: 0,
      covered: false,
    });
    expect(payload.exercises[2]).toMatchObject({
      id: 'ex-catalog',
      hasLegacyVideo: false,
      catalogVideoCount: 2,
      covered: true,
    });
  });

  it('attaches safe catalog demo samples without leaking private hosted media keys', () => {
    const payload = buildContentStudioCoveragePayload([
      {
        id: 'ex-youtube',
        name: 'YouTube Demo Press',
        exercise_key: 'youtube-demo-press',
        exerciseType: 'strength',
        bodyPartCategory: 'chest',
        primaryMuscles: '["pecs"]',
        source: 'nasm',
      },
      {
        id: 'ex-upload',
        name: 'Uploaded Demo Row',
        exercise_key: 'uploaded-demo-row',
        exerciseType: 'strength',
        bodyPartCategory: 'back',
        primaryMuscles: '["lats"]',
        source: 'swanstudios',
      },
    ], {
      'ex-youtube': 1,
      'ex-upload': 1,
    }, {
      'ex-youtube': {
        title: 'Incline Press Demo',
        source: 'youtube',
        youtubeVideoId: 'abc123XYZ',
        thumbnailUrl: 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg',
        durationSeconds: 42,
        hostedKey: 'r2/private/youtube-should-not-leak.mp4',
        posterKey: 'r2/private/poster.jpg',
      },
      'ex-upload': {
        title: 'Studio Row Demo',
        source: 'upload',
        hostedKey: 'r2/private/studio-row.mp4',
        thumbnailKey: 'r2/private/studio-row-thumb.jpg',
        captionsKey: 'r2/private/studio-row.vtt',
        hlsManifestUrl: 'https://private-signed.example/hls.m3u8',
      },
    });

    expect(payload.exercises[0]).toMatchObject({
      id: 'ex-youtube',
      catalogVideoCount: 1,
      mediaPreviewUrl: 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg',
      catalogVideoSample: {
        title: 'Incline Press Demo',
        source: 'youtube',
        videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ',
        thumbnailUrl: 'https://img.youtube.com/vi/abc123XYZ/hqdefault.jpg',
        durationSeconds: 42,
      },
      covered: true,
    });
    expect(payload.exercises[1]).toMatchObject({
      id: 'ex-upload',
      catalogVideoCount: 1,
      catalogVideoSample: {
        title: 'Studio Row Demo',
        source: 'upload',
        videoUrl: null,
        thumbnailUrl: null,
      },
      covered: true,
    });
    const serialized = JSON.stringify(payload.exercises);
    expect(serialized).not.toContain('hostedKey');
    expect(serialized).not.toContain('thumbnailKey');
    expect(serialized).not.toContain('posterKey');
    expect(serialized).not.toContain('captionsKey');
    expect(serialized).not.toContain('hlsManifestUrl');
    expect(serialized).not.toContain('r2/private');
    expect(serialized).not.toContain('private-signed');
  });

  it('builds a compact Swan Coach prompt block without leaking media URLs', () => {
    const payload = buildContentStudioCoveragePayload([
      {
        id: 'ex-video',
        name: 'Video Squat',
        exercise_key: 'video-squat',
        bodyPartCategory: 'legs',
        videoUrl: 'https://media.swanstudios.test/squat.mp4',
      },
      {
        id: 'ex-gap',
        name: 'Plank',
        exercise_key: 'plank',
        bodyPartCategory: 'core',
        thumbnailUrl: 'https://media.swanstudios.test/plank.gif',
      },
    ]);

    const block = buildSwanCoachCoveragePromptBlock(payload);

    expect(block).toContain('CONTENT STUDIO EXERCISE VIDEO COVERAGE');
    expect(block).toContain('1/2 exercises have recorded demo coverage (50%)');
    expect(block).toContain('core: 1 gap');
    expect(block).toContain('Prefer video-covered exercises for floor mode');
    expect(block).not.toContain('https://media.swanstudios.test');
  });
});
