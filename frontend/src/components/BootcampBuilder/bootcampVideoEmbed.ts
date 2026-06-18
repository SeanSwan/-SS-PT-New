/**
 * bootcampVideoEmbed
 * ------------------
 * Pure helpers for resolving a bootcamp exercise's video URL into something the
 * demo board can render: a direct file (inline <video>), an embeddable
 * YouTube/Vimeo URL (iframe in the depth modal), and a derived poster image.
 * Kept pure + unit-tested so the demo board stays presentational.
 */

const YOUTUBE_ID_PATTERNS: RegExp[] = [
  /youtu\.be\/([\w-]{11})/i,
  /youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^&]*&)*v=|embed\/|shorts\/|v\/|live\/)([\w-]{11})/i,
];

const DIRECT_VIDEO_FILE = /\.(mp4|webm|ogg|mov|m4v)(?:[?#].*)?$/i;

/** Extract an 11-char YouTube id from common URL shapes, or null. */
export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/** Extract a numeric Vimeo id, or null. */
export function getVimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/|channels\/[\w]+\/|groups\/[\w]+\/videos\/)?(\d{6,})/i);
  return match ? match[1] : null;
}

/** True when the URL is a YouTube/Vimeo link that must be shown via an iframe embed. */
export function isEmbeddableVideoUrl(url: string | null | undefined): boolean {
  return Boolean(getYouTubeId(url) || getVimeoId(url));
}

/** True when the URL points directly at a playable video file (inline-loopable). */
export function isDirectVideoFile(url: string | null | undefined): boolean {
  return Boolean(url && DIRECT_VIDEO_FILE.test(url));
}

/** A poster image derived from the video URL (YouTube thumbnail), or null. */
export function getVideoPoster(url: string | null | undefined): string | null {
  const youTubeId = getYouTubeId(url);
  if (youTubeId) return `https://i.ytimg.com/vi/${youTubeId}/hqdefault.jpg`;
  return null; // Vimeo posters require an API call — left to a real thumbnailUrl.
}

/** An autoplay embed URL for the depth modal, or null when not embeddable. */
export function getVideoEmbedUrl(url: string | null | undefined): string | null {
  const youTubeId = getYouTubeId(url);
  if (youTubeId) {
    return `https://www.youtube-nocookie.com/embed/${youTubeId}?autoplay=1&rel=0&modestbranding=1`;
  }
  const vimeoId = getVimeoId(url);
  if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}?autoplay=1`;
  return null;
}
