/**
 * Mock user data for development and testing
 * This data is used when the backend server is not available
 */

export const mockUser = {
  id: 'mock-dev-123',
  email: 'client@swanstudios.dev',
  username: 'clientuser',
  firstName: 'Demo',
  lastName: 'Client',
  role: 'client',
  profileImage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
  stats: {
    sessionsCompleted: 24,
    sessionsRemaining: 12,
    daysActive: 32,
    streak: 7
  }
};

export const mockAdminUser = {
  id: 'mock-admin-123',
  email: 'admin@swanstudios.dev',
  username: 'adminuser',
  firstName: 'Admin',
  lastName: 'User',
  role: 'admin',
  profileImage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  }
};

// NEW: Mock trainer user for testing trainer dashboard
export const mockTrainerUser = {
  id: 'mock-trainer-123',
  email: 'trainer@swanstudios.dev',
  username: 'traineruser',
  firstName: 'John',
  lastName: 'Trainer',
  role: 'trainer',
  profileImage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  },
  stats: {
    totalClients: 15,
    activeSessions: 8,
    completedSessions: 145,
    clientRetentionRate: 89
  }
};

// Mock regular user for testing user dashboard
export const mockRegularUser = {
  id: 'mock-user-123',
  email: 'user@swanstudios.dev',
  username: 'regularuser',
  firstName: 'Jane',
  lastName: 'User',
  role: 'user',
  profileImage: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  settings: {
    theme: 'dark',
    notifications: true,
    language: 'en',
  }
};

export default mockUser;
