/**
 * Mock API Service
 * 
 * Provides mock responses for API endpoints when the backend is not running
 * Used as a fallback to prevent errors in the UI
 */

import { v4 as uuidv4 } from 'uuid';

// Types
interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string;
  image?: string;
  userId: string;
  senderId?: string;
}

interface MockSession {
  id: number;
  sessionDate: string;
  duration: number;
  status: string;
  trainerId?: string;
  userId?: string;
  location: string;
  notes?: string;
  confirmed: boolean;
}

interface MockUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  photo?: string;
}

// Mock data
export const generateMockNotifications = (userId: string, count = 5): MockNotification[] => {
  const types = ['system', 'workout', 'client', 'admin'];
  const notifications: MockNotification[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    
    notifications.push({
      id: uuidv4(),
      title: `Mock ${type} notification`,
      message: `This is a mock ${type} notification for testing purposes when the backend is offline.`,
      type,
      read: Math.random() > 0.7, // 30% chance of being unread
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Within last 7 days
      link: Math.random() > 0.7 ? '/dashboard' : undefined,
      userId,
      senderId: Math.random() > 0.5 ? uuidv4() : undefined
    });
  }
  
  return notifications.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const generateMockSessions = (count = 10): MockSession[] => {
  const statuses = ['available', 'scheduled', 'confirmed', 'completed', 'cancelled'];
  const sessions: MockSession[] = [];
  
  // Current date
  const now = new Date();
  
  // Generate some sessions in the past
  for (let i = 0; i < Math.floor(count / 2); i++) {
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() - Math.floor(Math.random() * 14)); // Within last 14 days
    sessionDate.setHours(9 + Math.floor(Math.random() * 8)); // Between 9 AM and 5 PM
    
    sessions.push({
      id: i + 1,
      sessionDate: sessionDate.toISOString(),
      duration: 60,
      status: 'completed',
      trainerId: uuidv4(),
      userId: uuidv4(),
      location: 'Main Studio',
      notes: 'This is a mock past session.',
      confirmed: true
    });
  }
  
  // Generate some sessions in the future
  for (let i = Math.floor(count / 2); i < count; i++) {
    const sessionDate = new Date(now);
    sessionDate.setDate(now.getDate() + Math.floor(Math.random() * 14)); // Within next 14 days
    sessionDate.setHours(9 + Math.floor(Math.random() * 8)); // Between 9 AM and 5 PM
    
    const status = statuses[Math.floor(Math.random() * 3)]; // Only use first 3 statuses for future sessions
    
    sessions.push({
      id: i + 1,
      sessionDate: sessionDate.toISOString(),
      duration: 60,
      status,
      trainerId: status !== 'available' ? uuidv4() : undefined,
      userId: status !== 'available' ? uuidv4() : undefined,
      location: 'Main Studio',
      notes: status !== 'available' ? 'This is a mock future session.' : undefined,
      confirmed: status === 'confirmed'
    });
  }
  
  return sessions.sort((a, b) => 
    new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );
};

export const generateMockUsers = (count = 5): MockUser[] => {
  const roles = ['admin', 'trainer', 'client'];
  const users: MockUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    
    users.push({
      id: uuidv4(),
      username: `mock_${role}_${i}`,
      email: `mock_${role}_${i}@example.com`,
      firstName: `Mock`,
      lastName: `${role.charAt(0).toUpperCase() + role.slice(1)} ${i}`,
      role,
    });
  }
  
  return users;
};

// Mock API response functions
export const getMockNotifications = (userId?: string) => {
  const mockUserId = userId || uuidv4();
  const notifications = generateMockNotifications(mockUserId, 10);
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return {
    notifications,
    unreadCount
  };
};

export const getMockSessions = () => {
  return generateMockSessions(15);
};

export const getMockUsers = () => {
  return generateMockUsers(8);
};

// Extended mock API with more detailed data
export const getMockGamificationProfile = (userId?: string) => {
  const mockUserId = userId || uuidv4();
  
  return {
    success: true,
    profile: {
      id: mockUserId,
      username: `mock_user`,
      firstName: 'Mock',
      lastName: 'User',
      points: 750,
      level: 3,
      tier: 'silver',
      streakDays: 5,
      totalWorkouts: 24,
      totalExercises: 120,
      leaderboardPosition: 12,
      nextLevelProgress: 65,
      nextTierProgress: 30,
      achievements: [
        {
          id: uuidv4(),
          name: 'First Workout',
          description: 'Complete your first workout',
          icon: 'Award',
          progress: 100,
          isCompleted: true
        },
        {
          id: uuidv4(),
          name: '10 Workouts',
          description: 'Complete 10 workouts',
          icon: 'Award',
          progress: 100,
          isCompleted: true
        },
        {
          id: uuidv4(),
          name: '50 Workouts',
          description: 'Complete 50 workouts',
          icon: 'Award',
          progress: 48,
          isCompleted: false
        }
      ]
    }
  };
};

// Mock API interceptor
export const setupMockApiInterceptor = (axios: any) => {
  // Add a response interceptor
  const interceptor = axios.interceptors.response.use(
    response => response,
    error => {
      // Any status codes that falls outside the range of 2xx cause this function to trigger
      if (error.message.includes('Network Error') || 
          error.message.includes('Connection Refused') ||
          error.code === 'ERR_NETWORK') {
        
        // Get the requested URL and method
        const { url, method } = error.config;
        console.warn(`[MOCK API] Backend connection failed. Using mock data for ${method} ${url}`);
        
        // Return mock data based on the endpoint
        if (url.includes('/notifications')) {
          return Promise.resolve({
            data: getMockNotifications(),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
        
        if (url.includes('/sessions')) {
          return Promise.resolve({
            data: getMockSessions(),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
        
        if (url.includes('/users')) {
          return Promise.resolve({
            data: getMockUsers(),
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config,
            isMock: true
          });
        }
        
        if (url.includes('/gamification/profile')) {
          return Promise.resolve({
            data: getMockGamificationProfile(),
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
  getMockNotifications,
  getMockSessions,
  getMockUsers,
  getMockGamificationProfile,
  setupMockApiInterceptor
};
