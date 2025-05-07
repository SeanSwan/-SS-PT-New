/**
 * Utility functions for formatting various data types
 */

/**
 * Format a date string or timestamp into a human-readable format
 * 
 * @param {string | number | Date} dateInput - The date to format
 * @param {Intl.DateTimeFormatOptions} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (
  dateInput: string | number | Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
): string => {
  if (!dateInput) return 'N/A';
  
  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error';
  }
};

/**
 * Format a number as currency
 * 
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale code (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currency = 'USD',
  locale = 'en-US'
): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'N/A';
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `${amount}`;
  }
};

/**
 * Format a number with thousand separators
 * 
 * @param {number} num - The number to format
 * @param {string} locale - Locale code (default: 'en-US')
 * @returns {string} Formatted number string
 */
export const formatNumber = (
  num: number,
  locale = 'en-US'
): string => {
  if (typeof num !== 'number' || isNaN(num)) {
    return 'N/A';
  }
  
  try {
    return new Intl.NumberFormat(locale).format(num);
  } catch (error) {
    console.error('Error formatting number:', error);
    return `${num}`;
  }
};

/**
 * Truncate a string to a specific length and add ellipsis if needed
 * 
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string
 */
export const truncateString = (
  str: string,
  maxLength: number
): string => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  
  return `${str.substring(0, maxLength)}...`;
};

/**
 * Convert bytes to human-readable file size
 * 
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Human-readable file size
 */
export const formatFileSize = (
  bytes: number,
  decimals = 2
): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format a duration in seconds to a human-readable time string (MM:SS or HH:MM:SS)
 * 
 * @param {number} seconds - Duration in seconds
 * @param {boolean} showHours - Whether to always show hours (default: false)
 * @returns {string} Formatted time string
 */
export const formatDuration = (
  seconds: number,
  showHours = false
): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  const format = (num: number) => num.toString().padStart(2, '0');
  
  if (hours > 0 || showHours) {
    return `${format(hours)}:${format(minutes)}:${format(remainingSeconds)}`;
  }
  
  return `${format(minutes)}:${format(remainingSeconds)}`;
};

/**
 * Format a phone number to a standard format
 * 
 * @param {string} phoneNumber - The phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if the number is valid
  const match = cleaned.match(/^(\d{1,3})?(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    const [, countryCode, areaCode, firstPart, secondPart] = match;
    
    if (countryCode) {
      return `+${countryCode} (${areaCode}) ${firstPart}-${secondPart}`;
    }
    
    return `(${areaCode}) ${firstPart}-${secondPart}`;
  }
  
  return phoneNumber;
};