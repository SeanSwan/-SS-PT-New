import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import { useToast } from '../../../../../hooks/use-toast';

// Define interfaces
interface Client {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  photo?: string;
  points: number;
  level: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  streakDays: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
}

interface PointReason {
  id: string;
  name: string;
  description: string;
  pointValue: number;
  icon: string;
}

/**
 * Custom hook for trainer gamification functionality
 */
export const useTrainerGamification = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();
  
  // State
  const [loading, setLoading] = useState<boolean>(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  
  // Point reasons
  const pointReasons: PointReason[] = [
    { id: 'workout_completion', name: 'Workout Completion', description: 'Completed a workout session', pointValue: 50, icon: 'CheckCircle' },
    { id: 'exercise_completion', name: 'Exercise Completion', description: 'Completed an exercise', pointValue: 10, icon: 'Dumbbell' },
    { id: 'streak_bonus', name: 'Streak Bonus', description: 'Maintained a workout streak', pointValue: 20, icon: 'Zap' },
    { id: 'assessment_completion', name: 'Assessment Completion', description: 'Completed a fitness assessment', pointValue: 100, icon: 'Target' },
    { id: 'referral_bonus', name: 'Referral Bonus', description: 'Referred a new client', pointValue: 200, icon: 'Users' },
    { id: 'special_achievement', name: 'Special Achievement', description: 'Earned a special achievement', pointValue: 150, icon: 'Award' },
    { id: 'custom', name: 'Custom Reason', description: 'Custom reason for points', pointValue: 0, icon: 'Edit' }
  ];
  
  // Filter clients based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredClients(clients);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => 
      client.firstName.toLowerCase().includes(query) || 
      client.lastName.toLowerCase().includes(query) ||
      client.username.toLowerCase().includes(query)
    );
    
    setFilteredClients(filtered);
  }, [searchQuery, clients]);
  
  // Fetch clients
  const fetchClients = async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/clients');
      // const data = response.data.clients;
      
      // For demo purposes, we're using mock data
      const mockClients: Client[] = [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          username: 'johndoe',
          points: 4800,
          level: 24,
          tier: 'silver',
          streakDays: 8
        },
        {
          id: '2',
          firstName: 'Jane',
          lastName: 'Smith',
          username: 'janesmith',
          points: 2300,
          level: 15,
          tier: 'silver',
          streakDays: 3
        },
        {
          id: '3',
          firstName: 'Bob',
          lastName: 'Johnson',
          username: 'bjohnson',
          points: 750,
          level: 8,
          tier: 'bronze',
          streakDays: 0
        },
        {
          id: '4',
          firstName: 'Alice',
          lastName: 'Williams',
          username: 'awilliams',
          points: 11500,
          level: 36,
          tier: 'gold',
          streakDays: 15
        },
        {
          id: '5',
          firstName: 'Mike',
          lastName: 'Brown',
          username: 'mbrown',
          points: 450,
          level: 5,
          tier: 'bronze',
          streakDays: 1
        }
      ];
      
      setClients(mockClients);
      setFilteredClients(mockClients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to fetch clients.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Fetch achievements
  const fetchAchievements = async () => {
    try {
      // This would be a real API call in production
      // const response = await authAxios.get('/api/gamification/achievements?isActive=true');
      // const data = response.data.achievements;
      
      // For demo purposes, we're using mock data
      const mockAchievements: Achievement[] = [
        {
          id: '1',
          name: 'Fitness Starter',
          description: 'Complete 5 workout sessions',
          icon: 'Award',
          pointValue: 100,
          requirementType: 'session_count',
          requirementValue: 5,
          tier: 'bronze',
          isActive: true
        },
        {
          id: '2',
          name: 'Exercise Explorer',
          description: 'Try 15 different exercises',
          icon: 'Dumbbell',
          pointValue: 150,
          requirementType: 'exercise_count',
          requirementValue: 15,
          tier: 'bronze',
          isActive: true
        },
        {
          id: '3',
          name: 'Level 10 Champion',
          description: 'Reach level 10 in your fitness journey',
          icon: 'TrendingUp',
          pointValue: 250,
          requirementType: 'level_reached',
          requirementValue: 10,
          tier: 'silver',
          isActive: true
        },
        {
          id: '4',
          name: 'Squat Master',
          description: 'Perform 100 squats',
          icon: 'Target',
          pointValue: 200,
          requirementType: 'specific_exercise',
          requirementValue: 100,
          tier: 'silver',
          isActive: true
        },
        {
          id: '5',
          name: 'Consistency King',
          description: 'Maintain a 7-day workout streak',
          icon: 'Calendar',
          pointValue: 300,
          requirementType: 'streak_days',
          requirementValue: 7,
          tier: 'gold',
          isActive: true
        }
      ];
      
      setAchievements(mockAchievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast({
        title: "Error",
        description: "Failed to fetch achievements.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Award points to a client
  const awardPoints = async (
    clientId: string, 
    points: number, 
    reason: string, 
    description: string
  ) => {
    try {
      // This would be a real API call in production
      // await authAxios.post(`/api/gamification/users/${clientId}/points`, {
      //   points: points,
      //   source: reason,
      //   description: description
      // });
      
      // For demo purposes, we'll just update the state
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            points: client.points + points
          };
        }
        return client;
      });
      
      setClients(updatedClients);
      setFilteredClients(
        searchQuery.trim() === '' 
          ? updatedClients 
          : updatedClients.filter(client => 
              client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              client.username.toLowerCase().includes(searchQuery.toLowerCase())
            )
      );
      
      const client = clients.find(c => c.id === clientId);
      if (client) {
        toast({
          title: "Success",
          description: `Awarded ${points} points to ${client.firstName} ${client.lastName}`,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Error awarding points:', error);
      toast({
        title: "Error",
        description: "Failed to award points.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Award achievement to a client
  const awardAchievement = async (clientId: string, achievementId: string) => {
    try {
      // This would be a real API call in production
      // await authAxios.post(`/api/gamification/users/${clientId}/achievements/${achievementId}`);
      
      // For demo purposes, we'll just update the state
      const achievement = achievements.find(a => a.id === achievementId);
      
      if (!achievement) {
        throw new Error('Achievement not found');
      }
      
      // Add points from the achievement to the client
      const updatedClients = clients.map(client => {
        if (client.id === clientId) {
          return {
            ...client,
            points: client.points + achievement.pointValue
          };
        }
        return client;
      });
      
      setClients(updatedClients);
      setFilteredClients(
        searchQuery.trim() === '' 
          ? updatedClients 
          : updatedClients.filter(client => 
              client.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
              client.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              client.username.toLowerCase().includes(searchQuery.toLowerCase())
            )
      );
      
      const client = clients.find(c => c.id === clientId);
      if (client) {
        toast({
          title: "Success",
          description: `Awarded achievement "${achievement.name}" to ${client.firstName} ${client.lastName}`,
          variant: "default"
        });
      }
      
    } catch (error) {
      console.error('Error awarding achievement:', error);
      toast({
        title: "Error",
        description: "Failed to award achievement.",
        variant: "destructive"
      });
      throw error;
    }
  };
  
  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchClients(),
        fetchAchievements()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load gamification data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return {
    loading,
    clients,
    achievements,
    searchQuery,
    setSearchQuery,
    filteredClients,
    pointReasons,
    fetchClients,
    fetchAchievements,
    awardPoints,
    awardAchievement,
    loadInitialData
  };
};

export type { Client, Achievement, PointReason };