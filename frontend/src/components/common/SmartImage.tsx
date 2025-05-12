import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { PlaceholderImageService } from '../../services/placeholder';

export interface SmartImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackPlaceholder?: {
    width: number;
    height: number;
    text?: string;
  };
  onError?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * SmartImage component that automatically handles placeholder replacement
 * and provides fallback handling for broken images
 */
export const SmartImage = forwardRef<HTMLImageElement, SmartImageProps>(
  ({ src, fallbackPlaceholder, onError, onLoad, alt, ...props }, ref) => {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(() => {
      // Replace external placeholder URLs with local ones
      return PlaceholderImageService.replacePlaceholderUrl(src);
    });
    const imgRef = useRef<HTMLImageElement>(null);
    
    useImperativeHandle(ref, () => imgRef.current!, []);

    const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageError(true);
      
      // Generate a fallback placeholder if needed
      if (fallbackPlaceholder) {
        const fallbackSrc = PlaceholderImageService.createPlaceholder({
          width: fallbackPlaceholder.width,
          height: fallbackPlaceholder.height,
          text: fallbackPlaceholder.text || 'Image not found',
          backgroundColor: '#f5f5f5',
          textColor: '#999999',
        });
        setImageSrc(fallbackSrc);
      }
      
      onError?.(event);
    };

    const handleLoad = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setImageError(false);
      onLoad?.(event);
    };

    // Update imageSrc when src prop changes
    React.useEffect(() => {
      const newSrc = PlaceholderImageService.replacePlaceholderUrl(src);
      if (newSrc !== imageSrc) {
        setImageSrc(newSrc);
        setImageError(false);
      }
    }, [src]); // Don't include imageSrc in deps to avoid infinite loops

    return (
      <img
        {...props}
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onError={handleError}
        onLoad={handleLoad}
        // Add data attribute to track if this was a replaced placeholder
        data-placeholder-replaced={src !== imageSrc}
        data-image-error={imageError}
      />
    );
  }
);

SmartImage.displayName = 'SmartImage';

export default SmartImage;
