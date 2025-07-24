/**
 * Package Service - Business-Critical API Integration
 * ==================================================
 * 
 * Service layer for session package management operations
 * Integrates with backend adminPackageRoutes and storefront endpoints
 * 
 * FUNCTIONALITY:
 * - Fetch available session packages for client selection
 * - Package pricing and session management
 * - Client package assignments and tracking
 * - Payment integration support
 */

import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Package Service API Error:', error.response?.data || error.message);
    throw error;
  }
);

/**
 * Package Service Class
 */
class PackageService {
  /**
   * Get all available packages for client selection
   */
  async getAvailablePackages() {
    try {
      const response = await api.get('/admin/storefront');
      
      // Transform storefront items to package format
      const items = response.data.items || response.data || [];
      
      return items
        .filter(item => item.isActive !== false && item.type === 'session_package')
        .map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: parseFloat(item.price) || 0,
          sessionCount: item.sessionCount || this.extractSessionCount(item.name, item.description),
          duration: item.duration || '60 minutes',
          category: item.category || 'Personal Training',
          features: this.parseFeatures(item.features || item.description),
          isPopular: item.isPopular || false,
          discountPercentage: item.discountPercentage || 0,
          originalPrice: item.originalPrice || item.price,
          validityPeriod: item.validityPeriod || '6 months',
          // Business logic fields
          pricePerSession: this.calculatePricePerSession(item.price, item.sessionCount),
          value: this.calculatePackageValue(item),
          recommended: this.isRecommendedPackage(item)
        }))
        .sort((a, b) => a.sessionCount - b.sessionCount); // Sort by session count
    } catch (error) {
      console.error('Error fetching available packages:', error);
      
      // Return fallback data if API fails (development resilience)
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackPackages();
      }
      
      throw new Error('Failed to fetch available packages');
    }
  }
  
  /**
   * Get detailed package information
   */
  async getPackageDetails(packageId) {
    try {
      const response = await api.get(`/admin/storefront/${packageId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching package details:', error);
      throw new Error('Failed to fetch package details');
    }
  }
  
  /**
   * Get package pricing tiers
   */
  async getPackagePricingTiers() {
    try {
      const packages = await this.getAvailablePackages();
      
      return {
        starter: packages.find(p => p.sessionCount <= 4) || packages[0],
        popular: packages.find(p => p.sessionCount >= 8 && p.sessionCount <= 12) || packages[1],
        premium: packages.find(p => p.sessionCount >= 16) || packages[packages.length - 1],
        all: packages
      };
    } catch (error) {
      console.error('Error fetching pricing tiers:', error);
      throw new Error('Failed to fetch pricing tiers');
    }
  }
  
  /**
   * Search packages with filters
   */
  async searchPackages(searchQuery, filters = {}) {
    try {
      const response = await api.get('/admin/storefront/search', {
        params: {
          q: searchQuery,
          type: 'session_package',
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching packages:', error);
      throw new Error('Failed to search packages');
    }
  }
  
  /**
   * Create new package
   */
  async createPackage(packageData) {
    try {
      const response = await api.post('/admin/storefront', {
        ...packageData,
        type: 'session_package',
        isActive: true
      });
      return response.data;
    } catch (error) {
      console.error('Error creating package:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create package');
    }
  }
  
  /**
   * Update existing package
   */
  async updatePackage(packageId, updateData) {
    try {
      const response = await api.put(`/admin/storefront/${packageId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating package:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update package');
    }
  }
  
  /**
   * Delete package (soft delete)
   */
  async deletePackage(packageId) {
    try {
      await api.delete(`/admin/storefront/${packageId}`);
      return true;
    } catch (error) {
      console.error('Error deleting package:', error);
      throw new Error('Failed to delete package');
    }
  }
  
  /**
   * Get package purchase analytics
   */
  async getPackageAnalytics(timeRange = '30d') {
    try {
      const response = await api.get('/admin/storefront/analytics', {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching package analytics:', error);
      throw new Error('Failed to fetch package analytics');
    }
  }
  
  /**
   * Get recommended packages for client based on profile
   */
  async getRecommendedPackages(clientProfile) {
    try {
      const allPackages = await this.getAvailablePackages();
      
      // Apply recommendation logic based on client profile
      return allPackages.map(pkg => ({
        ...pkg,
        matchScore: this.calculatePackageMatchScore(pkg, clientProfile),
        recommendationReason: this.getRecommendationReason(pkg, clientProfile)
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 3); // Return top 3 recommendations
    } catch (error) {
      console.error('Error getting package recommendations:', error);
      throw new Error('Failed to get package recommendations');
    }
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Extract session count from package name or description
   */
  extractSessionCount(name, description) {
    const text = `${name} ${description}`.toLowerCase();
    
    // Look for patterns like "4 sessions", "8-session", "12 training sessions"
    const sessionMatch = text.match(/(\d+)[\s-]*(session|training)/i);
    if (sessionMatch) {
      return parseInt(sessionMatch[1]);
    }
    
    // Default based on common package names
    if (text.includes('starter') || text.includes('trial')) return 4;
    if (text.includes('popular') || text.includes('standard')) return 8;
    if (text.includes('premium') || text.includes('unlimited')) return 16;
    
    return 1; // Default fallback
  }
  
  /**
   * Parse features from description text
   */
  parseFeatures(featuresText) {
    if (!featuresText) return [];
    
    // Common feature patterns
    const features = [];
    const text = featuresText.toLowerCase();
    
    if (text.includes('personal trainer') || text.includes('1-on-1')) {
      features.push('One-on-one personal training');
    }
    if (text.includes('nutrition') || text.includes('meal')) {
      features.push('Nutrition guidance');
    }
    if (text.includes('workout plan') || text.includes('custom plan')) {
      features.push('Custom workout plans');
    }
    if (text.includes('progress tracking') || text.includes('monitoring')) {
      features.push('Progress tracking');
    }
    if (text.includes('flexible') || text.includes('schedule')) {
      features.push('Flexible scheduling');
    }
    if (text.includes('support') || text.includes('24/7')) {
      features.push('Ongoing support');
    }
    
    return features.length > 0 ? features : ['Personal training sessions', 'Professional guidance'];
  }
  
  /**
   * Calculate price per session
   */
  calculatePricePerSession(totalPrice, sessionCount) {
    if (!sessionCount || sessionCount === 0) return totalPrice;
    return Math.round((totalPrice / sessionCount) * 100) / 100; // Round to 2 decimal places
  }
  
  /**
   * Calculate overall package value score
   */
  calculatePackageValue(pkg) {
    const pricePerSession = this.calculatePricePerSession(pkg.price, pkg.sessionCount);
    const sessionCount = pkg.sessionCount || 1;
    
    // Value score based on price per session and bulk discount
    let valueScore = 0;
    
    // Better value for lower price per session
    if (pricePerSession <= 60) valueScore += 40;
    else if (pricePerSession <= 80) valueScore += 30;
    else if (pricePerSession <= 100) valueScore += 20;
    else valueScore += 10;
    
    // Better value for bulk packages
    if (sessionCount >= 16) valueScore += 30;
    else if (sessionCount >= 8) valueScore += 20;
    else if (sessionCount >= 4) valueScore += 10;
    
    // Discount bonus
    if (pkg.discountPercentage > 0) {
      valueScore += Math.min(pkg.discountPercentage, 30);
    }
    
    return Math.min(100, valueScore);
  }
  
  /**
   * Determine if package should be marked as recommended
   */
  isRecommendedPackage(pkg) {
    const sessionCount = pkg.sessionCount || 0;
    const pricePerSession = this.calculatePricePerSession(pkg.price, sessionCount);
    
    // Recommend packages with good value (8-12 sessions, reasonable price per session)
    return sessionCount >= 8 && sessionCount <= 12 && pricePerSession <= 85;
  }
  
  /**
   * Calculate package match score for client profile
   */
  calculatePackageMatchScore(pkg, clientProfile) {
    let score = 50; // Base score
    
    // Match based on training experience
    if (clientProfile.trainingExperience) {
      const experience = clientProfile.trainingExperience.toLowerCase();
      const sessionCount = pkg.sessionCount || 0;
      
      if (experience.includes('beginner') && sessionCount >= 8) score += 20;
      if (experience.includes('intermediate') && sessionCount >= 6) score += 15;
      if (experience.includes('advanced') && sessionCount >= 4) score += 10;
    }
    
    // Match based on fitness goal
    if (clientProfile.fitnessGoal) {
      const goal = clientProfile.fitnessGoal.toLowerCase();
      const description = (pkg.description || '').toLowerCase();
      
      if (description.includes(goal) || description.includes('transformation')) {
        score += 15;
      }
    }
    
    // Boost popular packages
    if (pkg.isPopular) score += 10;
    
    // Boost packages with good value
    if (pkg.value > 70) score += 10;
    
    return Math.min(100, score);
  }
  
  /**
   * Get human-readable recommendation reason
   */
  getRecommendationReason(pkg, clientProfile) {
    const sessionCount = pkg.sessionCount || 0;
    const experience = clientProfile.trainingExperience?.toLowerCase() || '';
    
    if (experience.includes('beginner') && sessionCount >= 8) {
      return 'Perfect for building a solid foundation with consistent training';
    }
    
    if (pkg.isPopular) {
      return 'Most popular choice among our clients';
    }
    
    if (pkg.value > 80) {
      return 'Excellent value with the best price per session';
    }
    
    if (sessionCount >= 12) {
      return 'Great for long-term commitment and maximum results';
    }
    
    return 'Well-balanced package for your fitness journey';
  }
  
  /**
   * Fallback package data for development/offline scenarios
   */
  getFallbackPackages() {
    return [
      {
        id: 1,
        name: 'Starter Package',
        description: '4 personal training sessions to get you started on your fitness journey',
        price: 320,
        sessionCount: 4,
        duration: '60 minutes',
        category: 'Personal Training',
        features: ['One-on-one personal training', 'Custom workout plans', 'Progress tracking'],
        isPopular: false,
        discountPercentage: 0,
        originalPrice: 320,
        validityPeriod: '3 months',
        pricePerSession: 80,
        value: 60,
        recommended: false
      },
      {
        id: 2,
        name: 'Popular Package',
        description: '8 personal training sessions with nutrition guidance for balanced results',
        price: 600,
        sessionCount: 8,
        duration: '60 minutes',
        category: 'Personal Training',
        features: ['One-on-one personal training', 'Nutrition guidance', 'Custom workout plans', 'Progress tracking'],
        isPopular: true,
        discountPercentage: 6.25,
        originalPrice: 640,
        validityPeriod: '4 months',
        pricePerSession: 75,
        value: 85,
        recommended: true
      },
      {
        id: 3,
        name: 'Premium Package',
        description: '16 personal training sessions with comprehensive support and meal planning',
        price: 1120,
        sessionCount: 16,
        duration: '60 minutes',
        category: 'Personal Training',
        features: ['One-on-one personal training', 'Nutrition guidance', 'Custom workout plans', 'Progress tracking', 'Meal planning', 'Ongoing support'],
        isPopular: false,
        discountPercentage: 12.5,
        originalPrice: 1280,
        validityPeriod: '6 months',
        pricePerSession: 70,
        value: 90,
        recommended: true
      },
      {
        id: 4,
        name: 'Trial Session',
        description: 'Single personal training session to experience our service',
        price: 85,
        sessionCount: 1,
        duration: '60 minutes',
        category: 'Personal Training',
        features: ['One-on-one personal training', 'Fitness assessment', 'Goal setting'],
        isPopular: false,
        discountPercentage: 0,
        originalPrice: 85,
        validityPeriod: '1 month',
        pricePerSession: 85,
        value: 50,
        recommended: false
      }
    ];
  }
  
  /**
   * Format package data for display
   */
  formatPackageData(pkg) {
    return {
      ...pkg,
      formattedPrice: `$${pkg.price.toFixed(2)}`,
      formattedPricePerSession: `$${pkg.pricePerSession.toFixed(2)}`,
      savings: pkg.discountPercentage > 0 
        ? `Save ${pkg.discountPercentage}%` 
        : null,
      valueRating: this.getValueRating(pkg.value),
      sessionText: pkg.sessionCount === 1 
        ? '1 Session' 
        : `${pkg.sessionCount} Sessions`,
      totalSavings: pkg.originalPrice > pkg.price 
        ? pkg.originalPrice - pkg.price 
        : 0
    };
  }
  
  /**
   * Get value rating text
   */
  getValueRating(valueScore) {
    if (valueScore >= 90) return 'Excellent Value';
    if (valueScore >= 80) return 'Great Value';
    if (valueScore >= 70) return 'Good Value';
    if (valueScore >= 60) return 'Fair Value';
    return 'Standard';
  }
  
  /**
   * Validate package data before submission
   */
  validatePackageData(packageData) {
    const errors = {};
    
    // Required fields
    if (!packageData.name?.trim()) {
      errors.name = 'Package name is required';
    }
    
    if (!packageData.description?.trim()) {
      errors.description = 'Package description is required';
    }
    
    if (!packageData.price || packageData.price <= 0) {
      errors.price = 'Valid price is required';
    }
    
    if (!packageData.sessionCount || packageData.sessionCount <= 0) {
      errors.sessionCount = 'Session count must be greater than 0';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export singleton instance
export const packageService = new PackageService();
export default packageService;
