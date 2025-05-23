/**
 * Enhanced Mock API Interceptor with StoreFront Support
 * This fixes the missing storefront mock data
 */

import { v4 as uuidv4 } from 'uuid';

// Enhanced mock storefront data with all required fields
const mockStorefrontItems = [
  {
    id: 1,
    name: "Platinum Swan Transformation",
    description: "Elite 12-week comprehensive transformation program with Sean Swan",
    displayPrice: 2499,
    pricePerSession: 105,
    imageUrl: "/storefront-images/platinum-package.jpg",
    theme: "cosmic",
    sessions: 24,
    months: 6,
    sessionsPerWeek: 1,
    totalSessions: 24,
    category: "Premium",
    itemType: "TRAINING_PACKAGE_FIXED",
    includedFeatures: JSON.stringify([
      "personalized nutrition planning",
      "weekly progress assessments",
      "supplement recommendations",
      "recovery protocols"
    ]),
    packageType: "fixed",
    isActive: true
  },
  {
    id: 2,
    name: "Gold Swan Monthly",
    description: "Ongoing monthly training with flexible scheduling",
    displayPrice: 799,
    pricePerSession: 100,
    imageUrl: "/storefront-images/gold-package.jpg",
    theme: "purple",
    months: 1,
    sessionsPerWeek: 2,
    category: "Monthly",
    itemType: "TRAINING_PACKAGE_SUBSCRIPTION",
    includedFeatures: JSON.stringify([
      "flexible scheduling",
      "progress tracking",
      "email support"
    ]),
    packageType: "monthly",
    isActive: true
  },
  {
    id: 3,
    name: "Silver Swan 8-Pack",
    description: "8 sessions to kickstart your fitness journey",
    displayPrice: 799,
    pricePerSession: 100,
    imageUrl: "/storefront-images/silver-package.jpg",
    theme: "ruby",
    sessions: 8,
    category: "Starter",
    itemType: "TRAINING_PACKAGE_FIXED",
    includedFeatures: JSON.stringify([
      "fundamental movement patterns",
      "basic nutrition guidance",
      "form training"
    ]),
    packageType: "fixed",
    isActive: true
  },
  {
    id: 4,
    name: "Rhodium Swan Elite",
    description: "Monthly premium training with advanced protocols",
    displayPrice: 1199,
    pricePerSession: 150,
    imageUrl: "/storefront-images/rhodium-package.jpg",
    theme: "emerald",
    months: 1,
    sessionsPerWeek: 2,
    category: "Elite",
    itemType: "TRAINING_PACKAGE_SUBSCRIPTION",
    includedFeatures: JSON.stringify([
      "advanced movement protocols",
      "recovery optimization",
      "supplement protocols",
      "priority scheduling"
    ]),
    packageType: "monthly",
    isActive: true
  },
  {
    id: 5,
    name: "Bronze Swan 4-Pack",
    description: "4 introductory sessions perfect for beginners",
    displayPrice: 399,
    pricePerSession: 100,
    imageUrl: "/storefront-images/bronze-package.jpg",
    theme: "bronze",
    sessions: 4,
    category: "Intro",
    itemType: "TRAINING_PACKAGE_FIXED",
    includedFeatures: JSON.stringify([
      "assessment session",
      "basic movement training",
      "goal setting"
    ]),
    packageType: "fixed",
    isActive: true
  },
  {
    id: 6,
    name: "Trial Swan Session",
    description: "Single trial session to experience Swan Studios",
    displayPrice: 149,
    pricePerSession: 149,
    imageUrl: "/storefront-images/trial-session.jpg",
    theme: "trial",
    sessions: 1,
    category: "Trial",
    itemType: "TRAINING_PACKAGE_FIXED",
    includedFeatures: JSON.stringify([
      "fitness assessment",
      "introduction to training style",
      "basic exercise instruction"
    ]),
    packageType: "fixed",
    isActive: true
  },
  {
    id: 7,
    name: "Year-Long Swan Journey",
    description: "Comprehensive year-long transformation program",
    displayPrice: 11999,
    pricePerSession: 92,
    imageUrl: "/storefront-images/year-package.jpg",
    theme: "yearly",
    sessions: 130,
    months: 12,
    sessionsPerWeek: 2.5,
    totalSessions: 130,
    category: "Annual",
    itemType: "TRAINING_PACKAGE_FIXED",
    includedFeatures: JSON.stringify([
      "quarterly assessments",
      "nutrition overhauls",
      "supplement protocols",
      "recovery optimization",
      "lifestyle coaching"
    ]),
    packageType: "fixed",
    isActive: true
  }
];

// Enhanced mock API interceptor with storefront support
export const setupEnhancedMockApiInterceptor = (axios: any) => {
  console.log('[Mock API] Setting up enhanced interceptor with storefront support');
  
  const interceptor = axios.interceptors.response.use(
    response => response,
    error => {
      console.log('[Mock API] Intercepting error:', error.message);
      
      // Check if it's a network error or connection refused
      if (error.message.includes('Network Error') || 
          error.message.includes('Connection Refused') ||
          error.message.includes('ECONNREFUSED') ||
          error.code === 'ERR_NETWORK' ||
          error.request?.readyState === 4 && error.request?.status === 0) {
        
        const { url, method } = error.config;
        console.log(`[Mock API] Backend connection failed. Using mock data for ${method} ${url}`);
        
        // Handle storefront endpoints
        if (url.includes('/api/storefront')) {
          console.log(`[Mock API] Mock storefront request`);
          return Promise.resolve({
            data: {
              success: true,
              items: mockStorefrontItems
            },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
        
        // Handle notifications
        if (url.includes('/notifications')) {
          return Promise.resolve({
            data: { notifications: [], unreadCount: 0 },
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
        
        // Handle sessions
        if (url.includes('/sessions')) {
          return Promise.resolve({
            data: [],
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
      }
      
      // If it's not a network error or we don't have mock data for this endpoint,
      // reject with the original error
      return Promise.reject(error);
    }
  );
  
  // Return a function to eject the interceptor if needed
  return () => {
    axios.interceptors.response.eject(interceptor);
  };
};

export default {
  setupEnhancedMockApiInterceptor,
  mockStorefrontItems
};