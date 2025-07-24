/**
 * Trainer Service - Business-Critical API Integration
 * ==================================================
 * 
 * Service layer for trainer management operations
 * Integrates with backend adminRoutes and trainer endpoints
 * 
 * FUNCTIONALITY:
 * - Fetch available trainers for assignment
 * - Get trainer details and specialties
 * - Trainer performance analytics
 * - Client-trainer matching algorithms
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
    console.error('Trainer Service API Error:', error.response?.data || error.message);
    throw error;
  }
);

/**
 * Trainer Service Class
 */
class TrainerService {
  /**
   * Get all available trainers for client assignment
   */
  async getAvailableTrainers() {
    try {
      const response = await api.get('/admin/trainers');
      
      // Transform trainer data for client assignment
      const trainers = response.data.trainers || [];
      
      return trainers.map(trainer => ({
        id: trainer.id,
        firstName: trainer.firstName,
        lastName: trainer.lastName,
        email: trainer.email,
        phone: trainer.phone,
        photo: trainer.photo,
        specialties: trainer.specialties || 'General Fitness',
        certifications: trainer.certifications || 'Certified Personal Trainer',
        experience: trainer.experience || 'Experienced',
        bio: trainer.bio || '',
        hourlyRate: trainer.hourlyRate || 75,
        isActive: trainer.isActive !== false,
        // Calculate availability score based on current client load
        availabilityScore: this.calculateAvailabilityScore(trainer),
        // Client capacity management
        currentClients: trainer.currentClients || 0,
        maxClients: trainer.maxClients || 20
      }));
    } catch (error) {
      console.error('Error fetching available trainers:', error);
      
      // Return fallback data if API fails (development resilience)
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackTrainers();
      }
      
      throw new Error('Failed to fetch available trainers');
    }
  }
  
  /**
   * Get detailed trainer information
   */
  async getTrainerDetails(trainerId) {
    try {
      const response = await api.get(`/admin/trainers/${trainerId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer details:', error);
      throw new Error('Failed to fetch trainer details');
    }
  }
  
  /**
   * Get trainer performance metrics
   */
  async getTrainerPerformance(trainerId, timeRange = '30d') {
    try {
      const response = await api.get(`/admin/trainers/${trainerId}/performance`, {
        params: { timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer performance:', error);
      throw new Error('Failed to fetch trainer performance data');
    }
  }
  
  /**
   * Search trainers with filters
   */
  async searchTrainers(searchQuery, filters = {}) {
    try {
      const response = await api.get('/admin/trainers/search', {
        params: {
          q: searchQuery,
          ...filters
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error searching trainers:', error);
      throw new Error('Failed to search trainers');
    }
  }
  
  /**
   * Get trainer availability schedule
   */
  async getTrainerAvailability(trainerId, dateRange = {}) {
    try {
      const response = await api.get(`/admin/trainers/${trainerId}/availability`, {
        params: dateRange
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trainer availability:', error);
      throw new Error('Failed to fetch trainer availability');
    }
  }
  
  /**
   * Get trainer-client assignment recommendations
   */
  async getTrainerRecommendations(clientProfile) {
    try {
      const response = await api.post('/admin/trainers/recommendations', {
        clientProfile
      });
      return response.data;
    } catch (error) {
      console.error('Error getting trainer recommendations:', error);
      throw new Error('Failed to get trainer recommendations');
    }
  }
  
  /**
   * Update trainer information
   */
  async updateTrainer(trainerId, updateData) {
    try {
      const response = await api.put(`/admin/trainers/${trainerId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating trainer:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to update trainer');
    }
  }
  
  /**
   * Create new trainer
   */
  async createTrainer(trainerData) {
    try {
      const response = await api.post('/admin/trainers', {
        ...trainerData,
        role: 'trainer',
        isActive: true
      });
      return response.data;
    } catch (error) {
      console.error('Error creating trainer:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Failed to create trainer');
    }
  }
  
  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Calculate trainer availability score based on current workload
   */
  calculateAvailabilityScore(trainer) {
    const currentClients = trainer.currentClients || 0;
    const maxClients = trainer.maxClients || 20;
    const utilizationRate = currentClients / maxClients;
    
    // Score from 0-100, higher is more available
    if (utilizationRate <= 0.5) return 100; // Low utilization - highly available
    if (utilizationRate <= 0.7) return 75;  // Moderate utilization
    if (utilizationRate <= 0.9) return 50;  // High utilization
    return 25; // Near capacity
  }
  
  /**
   * Match trainer to client based on goals and preferences
   */
  calculateMatchScore(trainer, clientProfile) {
    let score = 0;
    
    // Specialty matching
    if (trainer.specialties && clientProfile.fitnessGoal) {
      const specialties = trainer.specialties.toLowerCase();
      const goal = clientProfile.fitnessGoal.toLowerCase();
      
      if (specialties.includes(goal) || specialties.includes('general')) {
        score += 40;
      }
    }
    
    // Experience level matching
    if (trainer.experience && clientProfile.trainingExperience) {
      const trainerExp = trainer.experience.toLowerCase();
      const clientExp = clientProfile.trainingExperience.toLowerCase();
      
      // Match experienced trainers with advanced clients, etc.
      if ((trainerExp.includes('advanced') && clientExp.includes('advanced')) ||
          (trainerExp.includes('intermediate') && clientExp.includes('intermediate')) ||
          (trainerExp.includes('beginner') && clientExp.includes('beginner'))) {
        score += 30;
      }
    }
    
    // Availability factor
    score += trainer.availabilityScore * 0.3;
    
    return Math.min(100, Math.round(score));
  }
  
  /**
   * Fallback trainer data for development/offline scenarios
   */
  getFallbackTrainers() {
    return [
      {
        id: 1,
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        phone: '(555) 123-4567',
        photo: null,
        specialties: 'Strength Training, Weight Loss',
        certifications: 'NASM-CPT, CSCS',
        experience: 'Advanced (8+ years)',
        bio: 'Specialized in functional strength training and body transformation.',
        hourlyRate: 85,
        isActive: true,
        availabilityScore: 85,
        currentClients: 12,
        maxClients: 20
      },
      {
        id: 2,
        firstName: 'Mike',
        lastName: 'Chen',
        email: 'mike.chen@example.com',
        phone: '(555) 234-5678',
        photo: null,
        specialties: 'Cardio, Endurance Training',
        certifications: 'NASM-CPT, Running Coach',
        experience: 'Intermediate (5 years)',
        bio: 'Expert in cardiovascular fitness and marathon training.',
        hourlyRate: 75,
        isActive: true,
        availabilityScore: 92,
        currentClients: 8,
        maxClients: 18
      },
      {
        id: 3,
        firstName: 'Lisa',
        lastName: 'Rodriguez',
        email: 'lisa.rodriguez@example.com',
        phone: '(555) 345-6789',
        photo: null,
        specialties: 'Flexibility, Rehabilitation',
        certifications: 'NASM-CPT, NASM-CES',
        experience: 'Advanced (6 years)',
        bio: 'Focused on injury prevention and corrective exercise.',
        hourlyRate: 90,
        isActive: true,
        availabilityScore: 70,
        currentClients: 15,
        maxClients: 20
      }
    ];
  }
  
  /**
   * Format trainer data for display
   */
  formatTrainerData(trainer) {
    return {
      ...trainer,
      fullName: `${trainer.firstName} ${trainer.lastName}`,
      specialtiesArray: trainer.specialties ? trainer.specialties.split(',').map(s => s.trim()) : [],
      utilizationRate: trainer.currentClients && trainer.maxClients 
        ? Math.round((trainer.currentClients / trainer.maxClients) * 100)
        : 0,
      availabilityStatus: this.getAvailabilityStatus(trainer.availabilityScore)
    };
  }
  
  /**
   * Get availability status text
   */
  getAvailabilityStatus(score) {
    if (score >= 90) return 'Highly Available';
    if (score >= 70) return 'Available';
    if (score >= 50) return 'Limited Availability';
    return 'Nearly Full';
  }
  
  /**
   * Validate trainer data before submission
   */
  validateTrainerData(trainerData) {
    const errors = {};
    
    // Required fields
    if (!trainerData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    
    if (!trainerData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    
    if (!trainerData.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(trainerData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!trainerData.phone?.trim()) {
      errors.phone = 'Phone number is required';
    }
    
    if (!trainerData.certifications?.trim()) {
      errors.certifications = 'Certifications are required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}

// Export singleton instance
export const trainerService = new TrainerService();
export default trainerService;
