/**
 * get-image-url.ts
 * Utility for generating image URLs with consistent paths
 */

/**
 * Enum for image path categories
 */
export enum ImagePath {
    TESTAMENTS = 'testaments',
    USERS = 'users',
    ECOMMERCE = 'e-commerce',
    PROFILE = 'profile',
    BLOG = 'blog'
  }
  
  /**
   * Returns a fully qualified URL for an image
   * @param name - The image filename
   * @param path - The image path/category from ImagePath enum
   * @returns The complete URL to the image
   */
  export function getImageUrl(name: string, path: string): string {
    return new URL(`/src/assets/images/${path}/${name}`, import.meta.url).href;
  }
  
  /**
   * Helper function to get an avatar image URL
   * @param name - The avatar image filename
   * @returns The complete URL to the avatar
   */
  export function getAvatarUrl(name: string): string {
    return getImageUrl(name, ImagePath.USERS);
  }
  
  /**
   * Helper function to get a product image URL
   * @param name - The product image filename
   * @returns The complete URL to the product image
   */
  export function getProductUrl(name: string): string {
    return getImageUrl(name, ImagePath.ECOMMERCE);
  }