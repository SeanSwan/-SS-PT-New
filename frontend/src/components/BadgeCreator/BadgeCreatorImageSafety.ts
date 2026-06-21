import { sanitizeImageUrl } from '../../utils/imageUrl';

export interface BadgeImageResult {
  success: boolean;
  imageUrl: string | null;
}

export const safeBadgeImageUrl = (imageUrl: string | null | undefined) =>
  sanitizeImageUrl(imageUrl);

export const normalizeBadgeImageResult = <T extends BadgeImageResult>(image: T): T => {
  const safeImageUrl = safeBadgeImageUrl(image.imageUrl);
  return image.success && safeImageUrl
    ? { ...image, imageUrl: safeImageUrl }
    : { ...image, success: false, imageUrl: null };
};
