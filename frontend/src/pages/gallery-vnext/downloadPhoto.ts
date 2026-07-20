/**
 * Gallery vNext — photo download. BIND-ONLY mirror of GalleryPage.tsx:1653-1689: resolve the signed URL,
 * fetch it as a blob so the browser's download manager takes it (a cross-origin URL would otherwise just
 * open in a new tab), fall back to a direct link if the blob fetch is blocked by CORS, and fall back again
 * to opening the photo URL if the whole call fails. The bytes served are the watermarked object — this
 * introduces no un-watermarked path.
 */
import { getDownloadUrl } from './gallery.api';
import type { GalleryPhoto } from './gallery.types';

function triggerAnchor(href: string, filename: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function downloadPhoto(token: string, photo: GalleryPhoto): Promise<void> {
  try {
    const data = await getDownloadUrl(token, photo.id);
    if (!data.success || !data.downloadUrl) return;
    const filename = data.filename || 'photo.jpg';
    try {
      const blobRes = await fetch(data.downloadUrl);
      const blob = await blobRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      triggerAnchor(blobUrl, filename);
      URL.revokeObjectURL(blobUrl);
    } catch {
      triggerAnchor(data.downloadUrl, filename); // blob blocked (CORS) → direct link
    }
  } catch {
    window.open(photo.url, '_blank'); // last resort, same as the shipped page
  }
}
