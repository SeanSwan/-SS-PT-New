import { PlaceholderImageService } from '../../services/placeholder';

/**
 * Global Image Error Handler
 * This utility provides methods to handle image loading errors across the application
 */

export interface ImageErrorConfig {
  enableGlobalHandler: boolean;
  defaultFallback: {
    width: number;
    height: number;
    text: string;
  };
  onError?: (src: string, error: Event) => void;
}

class ImageErrorHandler {
  private config: ImageErrorConfig;
  private isInitialized = false;

  constructor(config: Partial<ImageErrorConfig> = {}) {
    this.config = {
      enableGlobalHandler: true,
      defaultFallback: {
        width: 400,
        height: 200,
        text: 'Image not found',
      },
      ...config,
    };
  }

  /**
   * Initialize the global image error handler
   * This sets up event listeners to catch image loading errors
   */
  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    if (this.config.enableGlobalHandler) {
      // Add a global error handler for all images
      document.addEventListener('error', this.handleGlobalImageError, true);
      
      // Also replace any existing placeholder URLs in the DOM
      this.replaceExistingPlaceholders();
    }

    this.isInitialized = true;
    console.log('[ImageErrorHandler] Global image error handler initialized');
  }

  /**
   * Handle global image errors
   */
  private handleGlobalImageError = (event: Event): void => {
    const target = event.target as HTMLImageElement;
    
    if (target && target.tagName === 'IMG') {
      const originalSrc = target.src;
      
      // Check if this is a placeholder URL error
      if (originalSrc.includes('via.placeholder.com') || originalSrc.includes('placeholder.com')) {
        // Extract dimensions from the URL if possible
        const match = originalSrc.match(/(\d+)x(\d+)/);
        
        if (match) {
          const width = parseInt(match[1]) || this.config.defaultFallback.width;
          const height = parseInt(match[2]) || this.config.defaultFallback.height;
          
          // Get text from URL if available
          const textMatch = originalSrc.match(/[?&]text=([^&]*)/);
          const text = textMatch ? decodeURIComponent(textMatch[1]) : this.config.defaultFallback.text;
          
          // Replace with local placeholder
          const replacementSrc = PlaceholderImageService.createPlaceholder({
            width,
            height,
            text,
            backgroundColor: '#f5f5f5',
            textColor: '#999999',
          });
          
          target.src = replacementSrc;
          target.setAttribute('data-original-src', originalSrc);
          target.setAttribute('data-replaced-placeholder', 'true');
          
          console.log(`[ImageErrorHandler] Replaced placeholder URL: ${originalSrc} -> ${replacementSrc}`);
        }
      }
      
      // Call custom error handler if provided
      this.config.onError?.(originalSrc, event);
    }
  };

  /**
   * Replace existing placeholder URLs in the DOM
   */
  private replaceExistingPlaceholders(): void {
    // Find all images with placeholder URLs
    const images = document.querySelectorAll('img[src*="placeholder"]');
    
    images.forEach((img: HTMLImageElement) => {
      const originalSrc = img.src;
      const replacedSrc = PlaceholderImageService.replacePlaceholderUrl(originalSrc);
      
      if (replacedSrc !== originalSrc) {
        img.src = replacedSrc;
        img.setAttribute('data-original-src', originalSrc);
        img.setAttribute('data-replaced-placeholder', 'true');
        
        console.log(`[ImageErrorHandler] Proactively replaced placeholder: ${originalSrc} -> ${replacedSrc}`);
      }
    });
  }

  /**
   * Cleanup the global image error handler
   */
  cleanup(): void {
    if (this.isInitialized && typeof window !== 'undefined') {
      document.removeEventListener('error', this.handleGlobalImageError, true);
      this.isInitialized = false;
      console.log('[ImageErrorHandler] Global image error handler cleaned up');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ImageErrorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if handler is initialized
   */
  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Create a singleton instance
export const imageErrorHandler = new ImageErrorHandler();

// Export the class for custom instances if needed
export { ImageErrorHandler };

/**
 * Hook to ensure image error handler is initialized
 */
export const useImageErrorHandler = (config?: Partial<ImageErrorConfig>) => {
  React.useEffect(() => {
    if (config) {
      imageErrorHandler.updateConfig(config);
    }
    
    imageErrorHandler.initialize();
    
    return () => {
      imageErrorHandler.cleanup();
    };
  }, []);
};
