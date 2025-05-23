/**
 * Placeholder Image Service
 * Handles creation and management of placeholder images for development
 */

export interface PlaceholderOptions {
  width: number;
  height: number;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  format?: 'svg' | 'canvas';
}

export class PlaceholderImageService {
  private static readonly DEFAULT_BACKGROUND_COLOR = '#f0f0f0';
  private static readonly DEFAULT_TEXT_COLOR = '#666666';
  private static readonly DEFAULT_FORMAT = 'svg';

  /**
   * Create a placeholder image URL
   * This replaces external placeholder services with local generation
   */
  static createPlaceholder(options: PlaceholderOptions): string {
    const {
      width,
      height,
      text = `${width}x${height}`,
      backgroundColor = this.DEFAULT_BACKGROUND_COLOR,
      textColor = this.DEFAULT_TEXT_COLOR,
      format = this.DEFAULT_FORMAT,
    } = options;

    if (format === 'svg') {
      return this.createSVGPlaceholder(width, height, text, backgroundColor, textColor);
    } else {
      return this.createCanvasPlaceholder(width, height, text, backgroundColor, textColor);
    }
  }

  /**
   * Create an SVG-based placeholder image
   */
  private static createSVGPlaceholder(
    width: number,
    height: number,
    text: string,
    backgroundColor: string,
    textColor: string
  ): string {
    // Calculate optimal font size based on content area
    const fontSize = Math.min(width, height) * 0.1;
    
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text 
          x="50%" 
          y="50%" 
          dominant-baseline="middle" 
          text-anchor="middle" 
          fill="${textColor}" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}px"
        >
          ${text}
        </text>
      </svg>
    `.trim();

    const encoded = encodeURIComponent(svg);
    return `data:image/svg+xml,${encoded}`;
  }

  /**
   * Create a canvas-based placeholder image
   */
  private static createCanvasPlaceholder(
    width: number,
    height: number,
    text: string,
    backgroundColor: string,
    textColor: string
  ): string {
    // Note: This creates a data URL that can be computed later
    // For server-side or build-time generation, we'd need a different approach
    return `/api/placeholder/${width}x${height}?text=${encodeURIComponent(text)}&bg=${backgroundColor.slice(1)}&color=${textColor.slice(1)}`;
  }

  /**
   * Replace external placeholder URLs with local equivalents
   */
  static replacePlaceholderUrl(url: string): string {
    // Check if this is a via.placeholder.com URL
    if (url.includes('via.placeholder.com')) {
      const match = url.match(/(\d+)x(\d+)/);
      
      if (match) {
        const width = parseInt(match[1]);
        const height = parseInt(match[2]);
        
        // Extract text parameter if present
        const textMatch = url.match(/[?&]text=([^&]*)/);
        const text = textMatch ? decodeURIComponent(textMatch[1]) : `${width}x${height}`;
        
        return this.createPlaceholder({ width, height, text });
      }
    }
    
    // If not a placeholder URL, return as-is
    return url;
  }

  /**
   * Create specific placeholder for common SwanStudios content types
   */
  static createContentPlaceholder(contentType: 'dance' | 'artwork' | 'music' | 'video', size: { width: number; height: number }): string {
    const placeholderMap = {
      dance: { text: 'Dance Video', color: '#e3f2fd' },
      artwork: { text: 'Artwork', color: '#f3e5f5' },
      music: { text: 'Music Track', color: '#e8f5e9' },
      video: { text: 'Video', color: '#fff3e0' },
    };
    
    const config = placeholderMap[contentType];
    
    return this.createPlaceholder({
      width: size.width,
      height: size.height,
      text: config.text,
      backgroundColor: config.color,
      textColor: '#424242',
    });
  }
}

export default PlaceholderImageService;
