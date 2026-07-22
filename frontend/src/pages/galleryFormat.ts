/**
 * galleryFormat.ts
 * ===============
 * Small pure formatters for the gallery. Kept out of GalleryPage.tsx so the page file
 * only exports its component (react-refresh) and these stay unit-testable in isolation.
 */

/** Correct singular/plural for the photo-count badge (fixes the "1 photos" bug). */
export const formatPhotoCount = (n: number): string => `${n} ${n === 1 ? 'photo' : 'photos'}`;
