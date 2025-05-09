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

export default mockUser;
