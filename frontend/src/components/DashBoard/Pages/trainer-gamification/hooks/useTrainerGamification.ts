import { useState, useEffect, useCallback } from 'react';
import { workoutMcpApi } from '../../../../../services/mcp/workoutMcpService';
import { gamificationMcpApi } from '../../../../../services/mcp/gamificationMcpService';
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
  const [mcpStatus, setMcpStatus] = useState<{workout: boolean; gamification: boolean}>({workout: false, gamification: false});
  const [mcpDataAvailable, setMcpDataAvailable] = useState<boolean>(false);
  
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
  
  // Check MCP servers status
  const checkMcpStatus = useCallback(async () => {
    try {
      // Check workout MCP server
      const workoutStatus = await workoutMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      // Check gamification MCP server
      const gamificationStatus = await gamificationMcpApi.checkServerStatus()
        .then(() => true)
        .catch(() => false);
      
      const newStatus = {
        workout: workoutStatus,
        gamification: gamificationStatus
      };
      
      setMcpStatus(newStatus);
      setMcpDataAvailable(workoutStatus || gamificationStatus);
      
      return newStatus;
    } catch (error) {
      console.error('[MCP] Error checking MCP servers status', error);
      return { workout: false, gamification: false };
    }
  }, []);
  
  // Get client data from MCP servers
  const fetchClientFromMcp = useCallback(async (clientId: string) => {
    try {
      let clientData: any = {};
      let hasData = false;
      
      // Get workout data from workout MCP if available
      if (mcpStatus.workout) {
        try {
          // Get client progress
          const progressResponse = await workoutMcpApi.getClientProgress({
            userId: clientId
          });
          
          // Get workout statistics
          const statsResponse = await workoutMcpApi.getWorkoutStatistics({
            userId: clientId,
            includeExerciseBreakdown: true,
            includeMuscleGroupBreakdown: true
          });
          
          if (progressResponse.data || statsResponse.data) {
            clientData.workoutData = {
              progress: progressResponse.data,
              statistics: statsResponse.data
            };
            hasData = true;
          }
        } catch (error) {
          console.error(`[MCP] Error fetching workout data for client ${clientId}`, error);
        }
      }
      
      // Get gamification data from gamification MCP if available
      if (mcpStatus.gamification) {
        try {
          // Get gamification profile
          const profileResponse = await gamificationMcpApi.getGamificationProfile({
            userId: clientId
          });
          
          // Get achievements
          const achievementsResponse = await gamificationMcpApi.getAchievements({
            userId: clientId,
            includeCompleted: true,
            includeInProgress: true
          });
          
          if (profileResponse.data || achievementsResponse.data) {
            clientData.gamificationData = {
              profile: profileResponse.data,
              achievements: achievementsResponse.data
            };
            hasData = true;
          }
        } catch (error) {
          console.error(`[MCP] Error fetching gamification data for client ${clientId}`, error);
        }
      }
      
      return hasData ? clientData : null;
    } catch (error) {
      console.error(`[MCP] Error fetching data for client ${clientId}`, error);
      return null;
    }
  }, [mcpStatus]);
  
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
      // First check if MCP servers are available
      await checkMcpStatus();
      
      if (mcpDataAvailable) {
        console.log('[MCP] Attempting to fetch data from MCP servers');
        try {
          // For demo purposes, we'll use the same client IDs from mock data
          // In a real app, we would fetch the actual client list first
          const clientIds = ['1', '2', '3', '4', '5'];
          const clientsWithMcpData = [];
          
          // Fetch MCP data for each client
          for (const clientId of clientIds) {
            const mcpData = await fetchClientFromMcp(clientId);
            
            if (mcpData) {
              // We have MCP data for this client, create a combined client object
              const gamProfile = mcpData.gamificationData?.profile;
              const workoutProgress = mcpData.workoutData?.progress;
              
              // Use MCP data where available, fall back to mock data
              const client: Client = {
                id: clientId,
                firstName: workoutProgress?.firstName || (clientId === '1' ? 'John' : clientId === '2' ? 'Jane' : clientId === '3' ? 'Bob' : clientId === '4' ? 'Alice' : 'Mike'),
                lastName: workoutProgress?.lastName || (clientId === '1' ? 'Doe' : clientId === '2' ? 'Smith' : clientId === '3' ? 'Johnson' : clientId === '4' ? 'Williams' : 'Brown'),
                username: workoutProgress?.username || (clientId === '1' ? 'johndoe' : clientId === '2' ? 'janesmith' : clientId === '3' ? 'bjohnson' : clientId === '4' ? 'awilliams' : 'mbrown'),
                photo: workoutProgress?.photo,
                points: gamProfile?.points || (clientId === '1' ? 4800 : clientId === '2' ? 2300 : clientId === '3' ? 750 : clientId === '4' ? 11500 : 450),
                level: gamProfile?.level || (clientId === '1' ? 24 : clientId === '2' ? 15 : clientId === '3' ? 8 : clientId === '4' ? 36 : 5),
                tier: gamProfile?.tier || (clientId === '1' ? 'silver' : clientId === '2' ? 'silver' : clientId === '3' ? 'bronze' : clientId === '4' ? 'gold' : 'bronze') as any,
                streakDays: gamProfile?.streakDays || (clientId === '1' ? 8 : clientId === '2' ? 3 : clientId === '3' ? 0 : clientId === '4' ? 15 : 1),
                mcpData: mcpData // Store the full MCP data for detailed views
              };
              
              clientsWithMcpData.push(client);
            }
          }
          
          if (clientsWithMcpData.length > 0) {
            // If we have data from MCP for at least some clients, use that
            setClients(clientsWithMcpData);
            setFilteredClients(clientsWithMcpData);
            
            // If we have gamification data, update achievements
            const allAchievements = clientsWithMcpData
              .flatMap(client => client.mcpData?.gamificationData?.achievements || [])
              .filter((achievement, index, self) => 
                // Filter out duplicates by ID
                index === self.findIndex(a => a.id === achievement.id)
              )
              .map(mcpAchievement => ({
                id: mcpAchievement.id,
                name: mcpAchievement.name,
                description: mcpAchievement.description,
                icon: mcpAchievement.icon || 'Award',
                pointValue: mcpAchievement.pointValue || 100,
                requirementType: mcpAchievement.requirementType || 'custom',
                requirementValue: mcpAchievement.requirementValue || 1,
                tier: mcpAchievement.tier || 'bronze',
                isActive: true
              }));
              
            if (allAchievements.length > 0) {
              setAchievements(allAchievements);
            } else {
              // Fall back to mock achievements if no MCP achievements
              await fetchAchievements();
            }
            
            return; // Successfully loaded data from MCP
          }
        } catch (error) {
          console.error('[MCP] Error loading data from MCP servers, falling back to mock data', error);
        }
      }
      
      // If we couldn't get data from MCP or it wasn't available, fall back to mock data
      console.log('[MCP] Using mock data as fallback');
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
  
  // Set up interval to check MCP status
  useEffect(() => {
    // Initial check
    checkMcpStatus();
    
    const interval = setInterval(checkMcpStatus, 30000);
    return () => clearInterval(interval);
  }, [checkMcpStatus]);
  
  return {
    loading,
    clients,
    achievements,
    searchQuery,
    setSearchQuery,
    filteredClients,
    pointReasons,
    mcpStatus,
    mcpDataAvailable,
    fetchClients,
    fetchAchievements,
    awardPoints,
    awardAchievement,
    loadInitialData,
    checkMcpStatus,
    fetchClientFromMcp
  };
};

export type { Client, Achievement, PointReason };