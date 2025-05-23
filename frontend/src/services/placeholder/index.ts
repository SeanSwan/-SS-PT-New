// Export the placeholder service
export { PlaceholderImageService, type PlaceholderOptions } from './PlaceholderImageService';

// Create a convenient hook for React components
import { useMemo } from 'react';
import { PlaceholderImageService, PlaceholderOptions } from './PlaceholderImageService';

/**
 * React hook for creating placeholder images
 */
export const usePlaceholder = (options: PlaceholderOptions) => {
  return useMemo(() => {
    return PlaceholderImageService.createPlaceholder(options);
  }, [options.width, options.height, options.text, options.backgroundColor, options.textColor, options.format]);
};

/**
 * React hook for replacing external placeholder URLs
 */
export const useReplacePlaceholder = (url: string) => {
  return useMemo(() => {
    return PlaceholderImageService.replacePlaceholderUrl(url);
  }, [url]);
};

/**
 * React hook for content-specific placeholders
 */
export const useContentPlaceholder = (
  contentType: 'dance' | 'artwork' | 'music' | 'video',
  size: { width: number; height: number }
) => {
  return useMemo(() => {
    return PlaceholderImageService.createContentPlaceholder(contentType, size);
  }, [contentType, size.width, size.height]);
};
