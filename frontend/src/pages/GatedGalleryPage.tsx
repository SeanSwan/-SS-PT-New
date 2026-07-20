/**
 * Gallery vNext — the ONE seam. `main-routes.tsx` binds this instead of `GalleryPage`, so both `/gallery`
 * routes are gated by a single import change and the current GalleryPage stays untouched as the flag-OFF
 * fallback (children of the gate). Flag off → the exact gallery that ships today.
 */
import GalleryGate from './GalleryGate';
import GalleryPage from './GalleryPage';

export default function GatedGalleryPage() {
  return (
    <GalleryGate>
      <GalleryPage />
    </GalleryGate>
  );
}
