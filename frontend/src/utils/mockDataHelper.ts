// mockDataHelper.ts
/**
 * Mock Data Helper
 * Utility to provide mock data for development and testing when backend is unavailable
 */

// Types for mock data
export interface MockNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  link?: string;
  image?: string;
  userId: string;
  sender?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface MockSession {
  id: string;
  sessionDate: string;
  endDate?: string;
  duration: number;
  status: string;
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    photo?: string;
  };
  location: string;
  sessionType: string;
  notes?: string;
  confirmed: boolean;
}

export interface MockWorkout {
  id: string;
  title: string;
  date: string;
  exercises: MockExercise[];
  duration: number;
  status: string;
  notes?: string;
}

export interface MockExercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  completed: boolean;
}

// Mock data collections
const mockNotifications: MockNotification[] = [
  {
    id: 'mock-notif-1',
    title: 'Welcome to SwanStudios',
    message: 'Thanks for joining SwanStudios! Your fitness journey begins here.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString(),
    userId: 'current-user'
  },
  {
    id: 'mock-notif-2',
    title: 'New Workout Plan Available',
    message: 'Your trainer has created a new workout plan for you.',
    type: 'workout',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    userId: 'current-user',
    link: '/client-dashboard/workouts'
  },
  {
    id: 'mock-notif-3',
    title: 'Reminder: Upcoming Session',
    message: 'You have a training session scheduled for tomorrow at 2:00 PM.',
    type: 'client',
    read: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    userId: 'current-user'
  },
  {
    id: 'mock-notif-4',
    title: 'Session Feedback',
    message: 'Please provide feedback for your recent training session.',
    type: 'client',
    read: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    userId: 'current-user',
    link: '/client-dashboard/sessions/feedback'
  },
  {
    id: 'mock-notif-5',
    title: 'Achievement Unlocked: First Workout',
    message: 'Congratulations! You\'ve completed your first workout.',
    type: 'system',
    read: true,
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    userId: 'current-user',
    image: '/assets/badges/first-workout.png'
  }
];

const mockSessions: MockSession[] = [
  {
    id: 'mock-session-1',
    sessionDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    duration: 60,
    status: 'scheduled',
    trainer: {
      id: 'trainer-1',
      firstName: 'John',
      lastName: 'Trainer',
      email: 'john@swanstudios.com',
      photo: '/assets/trainers/john.jpg'
    },
    location: 'Main Studio',
    sessionType: 'Strength Training',
    notes: 'Focus on upper body strength',
    confirmed: true
  },
  {
    id: 'mock-session-2',
    sessionDate: new Date(Date.now() + 259200000).toISOString(), // 3 days from now
    duration: 45,
    status: 'scheduled',
    trainer: {
      id: 'trainer-2',
      firstName: 'Sarah',
      lastName: 'Coach',
      email: 'sarah@swanstudios.com',
      photo: '/assets/trainers/sarah.jpg'
    },
    location: 'Cardio Room',
    sessionType: 'Cardio & HIIT',
    notes: 'Bring water and a towel',
    confirmed: true
  },
  {
    id: 'mock-session-3',
    sessionDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    duration: 60,
    status: 'completed',
    trainer: {
      id: 'trainer-1',
      firstName: 'John',
      lastName: 'Trainer',
      email: 'john@swanstudios.com',
      photo: '/assets/trainers/john.jpg'
    },
    location: 'Main Studio',
    sessionType: 'Full Body Workout',
    notes: 'Great progress on squats',
    confirmed: true
  }
];

const mockWorkouts: MockWorkout[] = [
  {
    id: 'mock-workout-1',
    title: 'Monday Strength Training',
    date: new Date().toISOString(),
    exercises: [
      {
        id: 'ex-1',
        name: 'Bench Press',
        sets: 3,
        reps: 10,
        weight: 135,
        completed: false
      },
      {
        id: 'ex-2',
        name: 'Squats',
        sets: 3,
        reps: 12,
        weight: 185,
        completed: false
      },
      {
        id: 'ex-3',
        name: 'Pull-ups',
        sets: 3,
        reps: 8,
        completed: false
      }
    ],
    duration: 60,
    status: 'pending'
  },
  {
    id: 'mock-workout-2',
    title: 'Wednesday Cardio',
    date: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
    exercises: [
      {
        id: 'ex-4',
        name: 'Treadmill',
        sets: 1,
        reps: 1,
        duration: 20,
        completed: false
      },
      {
        id: 'ex-5',
        name: 'Jumping Jacks',
        sets: 3,
        reps: 30,
        completed: false
      },
      {
        id: 'ex-6',
        name: 'Burpees',
        sets: 3,
        reps: 15,
        completed: false
      }
    ],
    duration: 45,
    status: 'pending'
  }
];

// Mock gamification data
const mockGamification = {
  points: 350,
  level: 2,
  badges: [
    {
      id: 'badge-1',
      name: 'First Login',
      description: 'Completed your first login',
      image: '/assets/badges/first-login.png',
      earnedAt: new Date(Date.now() - 604800000).toISOString() // 1 week ago
    },
    {
      id: 'badge-2',
      name: 'First Workout',
      description: 'Completed your first workout',
      image: '/assets/badges/first-workout.png',
      earnedAt: new Date(Date.now() - 259200000).toISOString() // 3 days ago
    }
  ],
  streak: 3,
  nextLevel: {
    requiredPoints: 500,
    currentProgress: 70 // percentage
  }
};

/**
 * Check if mock data mode is enabled
 */
export const isMockDataEnabled = (): boolean => {
  try {
    return localStorage.getItem('useMockData') === 'true';
  } catch (error) {
    console.warn('Error checking mock data mode:', error);
    return false;
  }
};

/**
 * Enable mock data mode
 */
export const enableMockData = (): void => {
  try {
    localStorage.setItem('useMockData', 'true');
    
    // Store mock data in localStorage
    localStorage.setItem('mockNotifications', JSON.stringify(mockNotifications));
    localStorage.setItem('mockSessions', JSON.stringify(mockSessions));
    localStorage.setItem('mockWorkouts', JSON.stringify(mockWorkouts));
    localStorage.setItem('mockGamification', JSON.stringify(mockGamification));
    
    console.log('[DEV MODE] Mock data mode enabled');
  } catch (error) {
    console.warn('Error enabling mock data mode:', error);
  }
};

/**
 * Disable mock data mode
 */
export const disableMockData = (): void => {
  try {
    localStorage.removeItem('useMockData');
    
    // Clean up mock data
    localStorage.removeItem('mockNotifications');
    localStorage.removeItem('mockSessions');
    localStorage.removeItem('mockWorkouts');
    localStorage.removeItem('mockGamification');
    
    console.log('[DEV MODE] Mock data mode disabled');
  } catch (error) {
    console.warn('Error disabling mock data mode:', error);
  }
};

/**
 * Get mock notifications
 */
export const getMockNotifications = (): { notifications: MockNotification[], unreadCount: number } => {
  try {
    const storedData = localStorage.getItem('mockNotifications');
    const notifications = storedData ? JSON.parse(storedData) : mockNotifications;
    const unreadCount = notifications.filter(n => !n.read).length;
    
    return { notifications, unreadCount };
  } catch (error) {
    console.warn('Error getting mock notifications:', error);
    return { 
      notifications: mockNotifications, 
      unreadCount: mockNotifications.filter(n => !n.read).length 
    };
  }
};

/**
 * Get mock sessions
 */
export const getMockSessions = (): MockSession[] => {
  try {
    const storedData = localStorage.getItem('mockSessions');
    return storedData ? JSON.parse(storedData) : mockSessions;
  } catch (error) {
    console.warn('Error getting mock sessions:', error);
    return mockSessions;
  }
};

/**
 * Get mock workouts
 */
export const getMockWorkouts = (): MockWorkout[] => {
  try {
    const storedData = localStorage.getItem('mockWorkouts');
    return storedData ? JSON.parse(storedData) : mockWorkouts;
  } catch (error) {
    console.warn('Error getting mock workouts:', error);
    return mockWorkouts;
  }
};

/**
 * Get mock gamification data
 */
export const getMockGamification = () => {
  try {
    const storedData = localStorage.getItem('mockGamification');
    return storedData ? JSON.parse(storedData) : mockGamification;
  } catch (error) {
    console.warn('Error getting mock gamification data:', error);
    return mockGamification;
  }
};

/**
 * Mark a mock notification as read
 */
export const markMockNotificationAsRead = (notificationId: string): void => {
  try {
    const { notifications } = getMockNotifications();
    const updatedNotifications = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    
    localStorage.setItem('mockNotifications', JSON.stringify(updatedNotifications));
  } catch (error) {
    console.warn('Error marking mock notification as read:', error);
  }
};

/**
 * Mark all mock notifications as read
 */
export const markAllMockNotificationsAsRead = (): void => {
  try {
    const { notifications } = getMockNotifications();
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    
    localStorage.setItem('mockNotifications', JSON.stringify(updatedNotifications));
  } catch (error) {
    console.warn('Error marking all mock notifications as read:', error);
  }
};

/**
 * Initialize mock data if enabled
 * Call this at application startup
 */
export const initializeMockData = (): void => {
  if (isMockDataEnabled()) {
    // Ensure all mock data is set in localStorage
    if (!localStorage.getItem('mockNotifications')) {
      localStorage.setItem('mockNotifications', JSON.stringify(mockNotifications));
    }
    
    if (!localStorage.getItem('mockSessions')) {
      localStorage.setItem('mockSessions', JSON.stringify(mockSessions));
    }
    
    if (!localStorage.getItem('mockWorkouts')) {
      localStorage.setItem('mockWorkouts', JSON.stringify(mockWorkouts));
    }
    
    if (!localStorage.getItem('mockGamification')) {
      localStorage.setItem('mockGamification', JSON.stringify(mockGamification));
    }
    
    console.log('[DEV MODE] Mock data initialized');
  }
};

export default {
  isMockDataEnabled,
  enableMockData,
  disableMockData,
  getMockNotifications,
  getMockSessions,
  getMockWorkouts,
  getMockGamification,
  markMockNotificationAsRead,
  markAllMockNotificationsAsRead,
  initializeMockData
};