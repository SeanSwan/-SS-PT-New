import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';
import { AuthProvider } from '../../context/AuthContext';
import workoutMcpApi from '../../services/mcp/workoutMcpService';
import gamificationMcpApi from '../../services/mcp/gamificationMcpService';

// Mock the MCP service APIs
vi.mock('../../services/mcp/workoutMcpService', () => ({
  __esModule: true,
  default: {
    getClientProgress: vi.fn(),
    getClientTrainingProgram: vi.fn()
  }
}));

vi.mock('../../services/mcp/gamificationMcpService', () => ({
  __esModule: true,
  default: {
    getGamificationProfile: vi.fn(),
    getAchievements: vi.fn(),
    getChallenges: vi.fn()
  }
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
    
    // Set up successful mock responses
    workoutMcpApi.getClientProgress.mockImplementation(() => 
      Promise.resolve({ data: { progress: mockProgress } })
    );
    
    workoutMcpApi.getClientTrainingProgram.mockImplementation(() => 
      Promise.resolve({ data: { program: mockTrainingProgram } })
    );
    
    gamificationMcpApi.getGamificationProfile.mockImplementation(() => 
      Promise.resolve({ data: { profile: mockGamificationProfile } })
    );
    
    gamificationMcpApi.getAchievements.mockImplementation(() => 
      Promise.resolve({ data: { achievements: mockAchievements } })
    );
    
    gamificationMcpApi.getChallenges.mockImplementation(() => 
      Promise.resolve({ data: { challenges: mockChallenges } })
    );
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
    expect(workoutMcpApi.getClientProgress).toHaveBeenCalledTimes(1);
    expect(workoutMcpApi.getClientTrainingProgram).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getGamificationProfile).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getAchievements).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getChallenges).toHaveBeenCalledTimes(1);
  });
  
  test('should tolerate API errors during refreshAll without crashing', async () => {
    // Mock one API to fail
    workoutMcpApi.getClientProgress.mockImplementation(() => 
      Promise.reject(new Error('API error'))
    );
    
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
    act(() => {
      result.current.refreshAll();
    });
    
    // Should be loading again
    expect(result.current.loading).toBe(true);
    
    // Wait for refresh to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    // Verify all APIs were called again
    expect(workoutMcpApi.getClientProgress).toHaveBeenCalledTimes(1);
    expect(workoutMcpApi.getClientTrainingProgram).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getGamificationProfile).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getAchievements).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getChallenges).toHaveBeenCalledTimes(1);
    
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
    expect(workoutMcpApi.getClientProgress).toHaveBeenCalledTimes(1);
    expect(workoutMcpApi.getClientTrainingProgram).toHaveBeenCalledTimes(0);
    expect(gamificationMcpApi.getGamificationProfile).toHaveBeenCalledTimes(0);
    
    // Reset mock call counts
    vi.clearAllMocks();
    
    // Call refreshGamification
    await act(async () => {
      await result.current.refreshGamification();
    });
    
    // Only gamification APIs should be called
    expect(workoutMcpApi.getClientProgress).toHaveBeenCalledTimes(0);
    expect(gamificationMcpApi.getGamificationProfile).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getAchievements).toHaveBeenCalledTimes(1);
    expect(gamificationMcpApi.getChallenges).toHaveBeenCalledTimes(1);
  });
});
