/**
 * Main API Service Export
 * ======================
 * Central entry point for API services throughout the application
 * Exports the production-ready API service with authentication handling
 */

// Import the production API service
import productionApiService from './api.service';

// Export as default for compatibility with existing imports
export default productionApiService;

// Named exports for flexibility
export { productionApiService as apiService };

// Legacy session API (kept for backward compatibility)
export const sessionAPI = {
  // This is a placeholder - the Universal Master Schedule uses fetch directly
  // for maximum compatibility and minimal dependencies
  
  getSessions: async () => {
    // Implementation handled directly in component
    return [];
  },
  
  createSession: async (data: any) => {
    // Implementation handled directly in component  
    return {};
  },
  
  updateSession: async (id: number, data: any) => {
    // Implementation handled directly in component
    return {};
  },
  
  deleteSession: async (id: number) => {
    // Implementation handled directly in component
    return {};
  }
};

// Re-export types and utilities from api.service for convenience
export type { ProductionApiService, ProductionTokenManager } from './api.service';
