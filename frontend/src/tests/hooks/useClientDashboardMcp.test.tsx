import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';
import apiService from '../../services/api.service';

vi.mock('../../services/api.service', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id' }
  })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('useClientDashboardMcp', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up mock implementations
    const mockProgress = {
      lastUpdated: new Date().toISOString(),
      workoutsCompleted: 10,
      overallLevel: 5,
      achievements: ['core-10', 'balance-10'],
      bodyParts: [{ name: 'Chest', progress: 75 }]
    };
    
    const mockGamificationProfile = {
      level: 5,
      points: 1250,
      streak: 3,
      powerups: 2
    };
    
    const mockAchievements = [
      { id: 'achievement1', name: 'Achievement 1', progress: 100, completed: true },
      { id: 'achievement2', name: 'Achievement 2', progress: 50, completed: false }
    ];
    
    const mockChallenges = [
      { id: 'challenge1', name: 'Challenge 1', progress: 50, joined: true },
      { id: 'challenge2', name: 'Challenge 2', progress: 0, joined: false }
    ];
    
    const mockTrainingProgram = {
      activeProgram: {
        id: 'program1',
        name: 'Test Program',
        progress: 50
      },
      upcomingWorkouts: [],
      completedWorkouts: []
    };
    
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === '/api/workout/progress/test-user-id') {
        return Promise.resolve({ data: { progress: mockProgress } });
      }
      if (url === '/api/workout-plans/client/test-user-id') {
        return Promise.resolve({ data: { program: mockTrainingProgram } });
      }
      if (url === '/api/v1/gamification/profile') {
        return Promise.resolve({ data: { profile: mockGamificationProfile } });
      }
      if (url === '/api/v1/gamification/achievements') {
        return Promise.resolve({ data: { achievements: mockAchievements } });
      }
      if (url === '/api/v1/gamification/challenges?limit=3') {
        return Promise.resolve({ data: { challenges: mockChallenges } });
      }
      return Promise.reject(new Error(`Unexpected API path: ${url}`));
    });
  });
  
  test('should initialize with loading state and fetch data on mount', async () => {
    const { result } = renderHook(() => useClientDashboardMcp());
    
    // Initial state should have loading=true
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(null);
    expect(result.current.gamification).toBe(null);
    expect(result.current.trainingProgram).toBe(null);
    
    // Wait for data to be loaded
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // After loading, should have data and no error
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).not.toBe(null);
    expect(result.current.gamification).not.toBe(null);
    expect(result.current.trainingProgram).not.toBe(null);
    expect(result.current.lastSyncTime).not.toBe(null);
    
    // Verify all APIs were called
    expect(apiService.get).toHaveBeenCalledWith('/api/workout/progress/test-user-id');
    expect(apiService.get).toHaveBeenCalledWith('/api/workout-plans/client/test-user-id');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/profile');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/achievements');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/challenges?limit=3');
  });
  
  test('should tolerate API errors during refreshAll without crashing', async () => {
    // Mock one API to fail
    vi.mocked(apiService.get).mockImplementation((url: string) => {
      if (url === '/api/workout/progress/test-user-id') {
        return Promise.reject(new Error('API error'));
      }
      if (url === '/api/workout-plans/client/test-user-id') {
        return Promise.resolve({ data: { program: null } });
      }
      if (url === '/api/v1/gamification/profile') {
        return Promise.resolve({ data: { profile: null } });
      }
      if (url === '/api/v1/gamification/achievements') {
        return Promise.resolve({ data: { achievements: [] } });
      }
      if (url === '/api/v1/gamification/challenges?limit=3') {
        return Promise.resolve({ data: { challenges: [] } });
      }
      return Promise.reject(new Error(`Unexpected API path: ${url}`));
    });
    
    const { result } = renderHook(() => useClientDashboardMcp());
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // refreshAll uses Promise.allSettled; error may remain null
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.progress).toBe(null);
  });
  
  test('refreshAll function should reload all data', async () => {
    const { result } = renderHook(() => useClientDashboardMcp());
    
    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Reset mock call counts
    vi.clearAllMocks();
    
    // Call refreshAll
    await act(async () => {
      await result.current.refreshAll();
    });
    
    // Verify all APIs were called again
    expect(apiService.get).toHaveBeenCalledTimes(5);
    expect(apiService.get).toHaveBeenCalledWith('/api/workout/progress/test-user-id');
    expect(apiService.get).toHaveBeenCalledWith('/api/workout-plans/client/test-user-id');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/profile');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/achievements');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/challenges?limit=3');
    
    // lastSyncTime should be updated
    expect(result.current.lastSyncTime).not.toBe(null);
  });
  
  test('individual refresh functions should only update their specific data', async () => {
    const { result } = renderHook(() => useClientDashboardMcp());
    
    // Wait for initial load to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Reset mock call counts
    vi.clearAllMocks();
    
    // Call refreshProgress
    await act(async () => {
      await result.current.refreshProgress();
    });
    
    // Only workout API should be called
    expect(apiService.get).toHaveBeenCalledTimes(1);
    expect(apiService.get).toHaveBeenCalledWith('/api/workout/progress/test-user-id');
    
    // Reset mock call counts
    vi.clearAllMocks();
    
    // Call refreshGamification
    await act(async () => {
      await result.current.refreshGamification();
    });
    
    // Only gamification APIs should be called
    expect(apiService.get).toHaveBeenCalledTimes(3);
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/profile');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/achievements');
    expect(apiService.get).toHaveBeenCalledWith('/api/v1/gamification/challenges?limit=3');
  });
});
