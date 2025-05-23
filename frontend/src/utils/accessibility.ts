/**
 * accessibility.ts
 * Utility functions for improving accessibility across the application
 */

/**
 * Creates a consistent, accessible label for screen readers
 * Improves the clarity of navigation elements for assistive technology users
 * 
 * @param text The text to format as an accessible label
 * @param context Optional context to add to the label
 * @returns Formatted accessible label string
 */
export const accessibleLabelGenerator = (text: string, context?: string): string => {
  if (!text) return '';
  
  // Clean the text - remove extra spaces, normalize case
  const cleanedText = text.trim().replace(/\s+/g, ' ');
  
  if (context) {
    return `${cleanedText} - ${context}`;
  }
  
  return cleanedText;
};

/**
 * Strips HTML tags from a string for use in aria-label attributes
 * Provides clean, accessible text descriptions for screen readers
 * 
 * @param html HTML string to clean
 * @returns Text-only string with HTML tags removed
 */
export const stripHtmlForAria = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
};

/**
 * Gets a human-readable file size string
 * Makes file size information more accessible and understandable
 * 
 * @param bytes File size in bytes
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted file size string (e.g., "2.5 MB")
 */
export const getReadableFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Creates a unique ID for associating form controls with labels
 * Ensures proper labeling for screen readers
 * 
 * @param prefix Optional prefix for the ID
 * @returns Unique ID string
 */
export const generateAccessibleId = (prefix: string = 'a11y'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
};

export default {
  accessibleLabelGenerator,
  stripHtmlForAria,
  getReadableFileSize,
  generateAccessibleId
};
