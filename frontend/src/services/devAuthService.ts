/**
 * Dev Authentication Service
 * 
 * This service provides API access to developer-only functionality,
 * specifically for quickly setting up test accounts.
 * 
 * IMPORTANT: These functions should only be used during development!
 */

import axios from 'axios';
import { API_BASE_URL, DEV_BACKEND_URL } from '../config';

// Type for the response from the seed-test-accounts endpoint
interface SeedTestAccountsResponse {
  success: boolean;
  message: string;
}

// Type for the health check response
interface HealthCheckResponse {
  success: boolean;
  message: string;
  environment: string;
  timestamp: string;
}

// Define the API URL to use
const API_URL = process.env.NODE_ENV === 'development' ? DEV_BACKEND_URL : API_BASE_URL;

/**
 * Seed test accounts (admin, trainer, client, user) in the database
 * This is only available in development mode
 */
export const seedTestAccounts = async (): Promise<SeedTestAccountsResponse> => {
  try {
    const response = await axios.get(`${API_URL}/dev/seed-test-accounts`);
    return response.data;
  } catch (error) {
    console.error('Failed to seed test accounts:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Check if the development API is working
 */
export const checkDevApi = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await axios.get(`${API_URL}/dev/health-check`);
    return response.data;
  } catch (error) {
    console.error('Failed to check dev API:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      environment: 'unknown',
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Check if we're in development mode
 */
export const isDevelopmentMode = (): boolean => {
  return process.env.NODE_ENV === 'development';
};

export default {
  seedTestAccounts,
  checkDevApi,
  isDevelopmentMode
};