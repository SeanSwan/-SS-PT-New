/**
 * YouTube Validation Service
 * =========================
 * 
 * Purpose: Validate YouTube URLs and fetch video metadata
 * 
 * Blueprint Reference: docs/ai-workflow/ADMIN-VIDEO-LIBRARY-ARCHITECTURE.mermaid.md
 * 
 * Sequence Diagram:
 * ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 * │   Client    │──▶│   Server    │──▶│ YouTube API │
 * └─────────────┘   └─────────────┘   └─────────────┘
 *        │                 │                 │
 *        │ POST /validate  │                 │
 *        │────────────────▶│                 │
 *        │                 │ GET /videos     │
 *        │                 │─────────────────▶│
 *        │                 │                 │
 *        │                 │     Metadata     │
 *        │                 │◀─────────────────│
 *        │     Response    │                 │
 *        │◀───────────────│                 │
 * 
 * Caching Strategy:
 * - Redis cache with 24h TTL
 * - Cache key: youtube:{video_id}
 * 
 * Error Handling:
 * - Invalid URL format
 * - Private/deleted videos
 * - API quota limits
 */

import axios from 'axios';
import redis from './cache/redisWrapper.mjs';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// Regex to extract YouTube video ID from various URL formats
const YOUTUBE_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

export const validateYouTubeUrl = async (url) => {
  // Check cache first
  const cached = await redis.get(`youtube:${url}`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Extract video ID
  const match = url.match(YOUTUBE_REGEX);
  if (!match || !match[1]) {
    throw new Error('Invalid YouTube URL format');
  }

  const videoId = match[1];

  try {
    // Call YouTube API
    const response = await axios.get(YOUTUBE_API_URL, {
      params: {
        part: 'snippet,contentDetails',
        id: videoId,
        key: YOUTUBE_API_KEY
      }
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('YouTube video not found');
    }

    const video = response.data.items[0];
    const result = {
      valid: true,
      videoId,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.default.url,
      duration: video.contentDetails.duration
    };

    // Cache result for 24 hours
    await redis.set(`youtube:${url}`, JSON.stringify(result), 86400);

    return result;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      throw new Error('YouTube video not found');
    }
    throw new Error('Failed to validate YouTube video');
  }
};

export const extractYouTubeId = (url) => {
  const match = url.match(YOUTUBE_REGEX);
  return match ? match[1] : null;
};