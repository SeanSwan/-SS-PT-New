import { useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { GamificationProfile, Achievement, Reward } from './useGamificationData';

/**
 * Custom hook to handle real-time gamification updates
 * Uses Socket.IO to listen for events and update the React Query cache
 */
export const useGamificationRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Handle real-time points award
  const handlePointsAwarded = useCallback((data: { 
    userId: string; 
    points: number; 
    source: string; 
    description: string;
    balance: number;
  }) => {
    // Only process if this is for the current user
    if (data.userId !== user?.id) return;
    
    // Update the profile in React Query cache
    queryClient.setQueryData(['gamification', 'profile', user.id], (oldData: GamificationProfile | undefined) => {
      if (!oldData) return oldData;
      
      // Create a new transaction
      const newTransaction = {
        id: Date.now().toString(),
        points: data.points,
        balance: data.balance,
        transactionType: 'earn' as const,
        source: data.source,
        description: data.description,
        createdAt: new Date().toISOString()
      };
      
      // Return updated profile
      return {
        ...oldData,
        points: data.balance,
        recentTransactions: [newTransaction, ...oldData.recentTransactions]
      };
    });
    
    // Show a toast notification
    toast({
      title: "Points Awarded!",
      description: `You've earned ${data.points} points: ${data.description}`,
      variant: "default"
    });
  }, [queryClient, toast, user?.id]);
  
  // Handle achievement unlocked
  const handleAchievementUnlocked = useCallback((data: { 
    userId: string; 
    achievement: Achievement;
    pointsAwarded: number;
  }) => {
    // Only process if this is for the current user
    if (data.userId !== user?.id) return;
    
    // Update the profile in React Query cache
    queryClient.setQueryData(['gamification', 'profile', user.id], (oldData: GamificationProfile | undefined) => {
      if (!oldData) return oldData;
      
      // Create a new user achievement
      const newUserAchievement = {
        id: Date.now().toString(),
        achievementId: data.achievement.id,
        earnedAt: new Date().toISOString(),
        progress: 100,
        isCompleted: true,
        pointsAwarded: data.pointsAwarded,
        achievement: data.achievement
      };
      
      // Create a new transaction
      const newTransaction = {
        id: Date.now().toString(),
        points: data.pointsAwarded,
        balance: oldData.points + data.pointsAwarded,
        transactionType: 'earn' as const,
        source: 'achievement_earned',
        description: `Achievement Earned: ${data.achievement.name}`,
        createdAt: new Date().toISOString()
      };
      
      // Return updated profile
      return {
        ...oldData,
        points: oldData.points + data.pointsAwarded,
        achievements: [...oldData.achievements, newUserAchievement],
        recentTransactions: [newTransaction, ...oldData.recentTransactions]
      };
    });
    
    // Show a toast notification
    toast({
      title: "Achievement Unlocked!",
      description: `${data.achievement.name}: ${data.achievement.description}`,
      variant: "default"
    });
  }, [queryClient, toast, user?.id]);
  
  // Set up Socket.IO connection
  useEffect(() => {
    if (!user?.id) return;
    
    // In a production app, you would connect to your real Socket.IO server
    // const socket: Socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
    
    // For demo purposes, we'll mock the socket events
    const mockSocket = {
      on: (event: string, callback: Function) => {
        // Store the callbacks for mock triggering
        if (event === 'points_awarded') {
          (window as any).mockTriggerPointsAwarded = (data: any) => callback(data);
        } else if (event === 'achievement_unlocked') {
          (window as any).mockTriggerAchievementUnlocked = (data: any) => callback(data);
        }
      },
      off: () => {},
      disconnect: () => {}
    } as unknown as Socket;
    
    // Set up event listeners
    mockSocket.on('points_awarded', handlePointsAwarded);
    mockSocket.on('achievement_unlocked', handleAchievementUnlocked);
    
    // Return cleanup function
    return () => {
      mockSocket.off('points_awarded', handlePointsAwarded);
      mockSocket.off('achievement_unlocked', handleAchievementUnlocked);
      mockSocket.disconnect();
    };
  }, [handlePointsAwarded, handleAchievementUnlocked, user?.id]);
  
  // Method to manually trigger mock events (for demo purposes)
  const triggerMockEvent = useCallback((event: 'points_awarded' | 'achievement_unlocked', data: any) => {
    if (event === 'points_awarded' && (window as any).mockTriggerPointsAwarded) {
      (window as any).mockTriggerPointsAwarded({
        userId: user?.id,
        ...data
      });
    } else if (event === 'achievement_unlocked' && (window as any).mockTriggerAchievementUnlocked) {
      (window as any).mockTriggerAchievementUnlocked({
        userId: user?.id,
        ...data
      });
    }
  }, [user?.id]);
  
  return {
    triggerMockEvent
  };
};
