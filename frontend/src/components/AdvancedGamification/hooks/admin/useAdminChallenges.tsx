/**
 * 🔧 ADMIN CHALLENGES HOOK - CHALLENGE CRUD MANAGEMENT
 * ====================================================
 * Custom hook for admin challenge creation, editing, analytics,
 * and management operations
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Challenge,
  CreateChallengeRequest,
  UpdateChallengeRequest,
  ChallengeTemplate,
  BulkChallengeAction,
  ChallengeAnalytics,
  ChallengeFormValidation,
  ChallengeBuilderState
} from '../../types/challenge.types';

import adminGamificationAPI from '../../services/adminGamificationAPI';
import { validateCreateChallenge, validateUpdateChallenge } from '../../utils/challengeValidation';
import { challengeTemplates, sampleChallenges } from '../../utils/mockData';

// ================================================================
// TYPES FOR ADMIN HOOK
// ================================================================

interface UseAdminChallengesReturn {
  // Challenge data
  challenges: Challenge[];
  templates: ChallengeTemplate[];
  selectedChallenge: Challenge | null;
  analytics: ChallengeAnalytics | null;
  
  // Challenge builder state
  builderState: ChallengeBuilderState;
  formValidation: ChallengeFormValidation;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkAction: boolean;
  isLoadingAnalytics: boolean;
  
  // Error states
  error: string | null;
  createError: string | null;
  updateError: string | null;
  deleteError: string | null;
  analyticsError: string | null;
  
  // Statistics
  stats: {
    totalChallenges: number;
    activeChallenges: number;
    draftChallenges: number;
    completedChallenges: number;
    averageParticipation: number;
    topPerforming: Challenge[];
  };
  
  // CRUD Actions
  createChallenge: (challengeData: CreateChallengeRequest) => Promise<Challenge | null>;
  updateChallenge: (challengeId: string, updates: UpdateChallengeRequest) => Promise<Challenge | null>;
  deleteChallenge: (challengeId: string) => Promise<boolean>;
  duplicateChallenge: (challengeId: string, modifications?: Partial<CreateChallengeRequest>) => Promise<Challenge | null>;
  publishChallenge: (challengeId: string) => Promise<Challenge | null>;
  archiveChallenge: (challengeId: string) => Promise<Challenge | null>;
  bulkAction: (action: BulkChallengeAction) => Promise<{ successful: string[]; failed: any[] }>;
  
  // Template Actions
  createTemplate: (templateData: any) => Promise<ChallengeTemplate | null>;
  useTemplate: (templateId: string) => void;
  
  // Builder Actions
  updateBuilderStep: (step: number, data: Partial<CreateChallengeRequest>) => void;
  validateBuilderStep: (step: number) => boolean;
  nextBuilderStep: () => boolean;
  prevBuilderStep: () => void;
  resetBuilder: () => void;
  saveDraft: () => Promise<boolean>;
  loadDraft: (challengeId: string) => Promise<void>;
  
  // Analytics
  loadAnalytics: (challengeId: string, period?: { startDate: string; endDate: string }) => Promise<void>;
  
  // Utility functions
  getChallengeById: (id: string) => Challenge | undefined;
  getTemplateById: (id: string) => ChallengeTemplate | undefined;
  canModifyChallenge: (challenge: Challenge) => { canModify: boolean; reason?: string };
  getPopularTemplates: () => ChallengeTemplate[];
}

interface UseAdminChallengesOptions {
  autoLoad?: boolean;
  useMockData?: boolean;
  enableRealTime?: boolean;
}

// ================================================================
// INITIAL BUILDER STATE
// ================================================================

const initialBuilderState: ChallengeBuilderState = {
  currentStep: 0,
  steps: [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Challenge title, description, and category',
      isCompleted: false,
      isRequired: true,
      validationRules: ['title', 'description', 'category', 'type', 'difficulty']
    },
    {
      id: 'targets-duration',
      title: 'Goals & Duration',
      description: 'Set challenge targets and time frame',
      isCompleted: false,
      isRequired: true,
      validationRules: ['targets', 'duration']
    },
    {
      id: 'rewards-participation',
      title: 'Rewards & Participation',
      description: 'Configure rewards and participation rules',
      isCompleted: false,
      isRequired: true,
      validationRules: ['rewards', 'maxParticipants']
    },
    {
      id: 'social-settings',
      title: 'Social & Advanced',
      description: 'Social features and advanced settings',
      isCompleted: false,
      isRequired: false,
      validationRules: []
    },
    {
      id: 'review-publish',
      title: 'Review & Publish',
      description: 'Review challenge and publish or save as draft',
      isCompleted: false,
      isRequired: false,
      validationRules: []
    }
  ],
  formData: {},
  validation: { isValid: false, errors: {} },
  isDraft: false,
  lastSaved: ''
};

// ================================================================
// MAIN ADMIN HOOK IMPLEMENTATION
// ================================================================

export const useAdminChallenges = (
  options: UseAdminChallengesOptions = {}
): UseAdminChallengesReturn => {
  const {
    autoLoad = true,
    useMockData = process.env.NODE_ENV === 'development',
    enableRealTime = false
  } = options;
  
  // Challenge data state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [templates, setTemplates] = useState<ChallengeTemplate[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [analytics, setAnalytics] = useState<ChallengeAnalytics | null>(null);
  
  // Builder state
  const [builderState, setBuilderState] = useState<ChallengeBuilderState>(initialBuilderState);
  const [formValidation, setFormValidation] = useState<ChallengeFormValidation>({
    isValid: false,
    errors: {}
  });
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkAction, setIsBulkAction] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  
  // ================================================================
  // COMPUTED STATISTICS
  // ================================================================
  
  const stats = useMemo(() => {
    const totalChallenges = challenges.length;
    const activeChallenges = challenges.filter(c => c.status === 'active').length;
    const draftChallenges = challenges.filter(c => c.status === 'draft').length;
    const completedChallenges = challenges.filter(c => c.status === 'completed').length;
    
    const averageParticipation = totalChallenges > 0
      ? challenges.reduce((sum, c) => sum + c.progressData.totalParticipants, 0) / totalChallenges
      : 0;
    
    const topPerforming = challenges
      .filter(c => c.status === 'active' || c.status === 'completed')
      .sort((a, b) => b.progressData.totalParticipants - a.progressData.totalParticipants)
      .slice(0, 5);
    
    return {
      totalChallenges,
      activeChallenges,
      draftChallenges,
      completedChallenges,
      averageParticipation: Math.round(averageParticipation),
      topPerforming
    };
  }, [challenges]);
  
  // ================================================================
  // DATA FETCHING FUNCTIONS
  // ================================================================
  
  /**
   * Load all challenges for admin
   */
  const loadChallenges = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (useMockData) {
        setChallenges(sampleChallenges);
        return;
      }
      
      const response = await adminGamificationAPI.getAdminChallenges();
      
      if (response.success && response.data) {
        setChallenges(response.data.challenges);
      } else {
        setError(response.error?.message || 'Failed to load challenges');
      }
      
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  }, [useMockData]);
  
  /**
   * Load challenge templates
   */
  const loadTemplates = useCallback(async (): Promise<void> => {
    try {
      if (useMockData) {
        setTemplates(challengeTemplates);
        return;
      }
      
      const response = await adminGamificationAPI.getChallengeTemplates();
      
      if (response.success && response.data) {
        setTemplates(response.data);
      }
      
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  }, [useMockData]);
  
  // ================================================================
  // CRUD OPERATIONS
  // ================================================================
  
  /**
   * Create a new challenge
   */
  const createChallenge = useCallback(async (
    challengeData: CreateChallengeRequest
  ): Promise<Challenge | null> => {
    try {
      setIsCreating(true);
      setCreateError(null);
      
      // Validate challenge data
      const validation = validateCreateChallenge(challengeData);
      if (!validation.isValid) {
        setCreateError('Please fix validation errors before creating');
        setFormValidation(validation);
        return null;
      }
      
      if (useMockData) {
        // Create mock challenge
        const newChallenge: Challenge = {
          id: `challenge-${Date.now()}`,
          ...challengeData,
          status: 'draft',
          participationData: [],
          progressData: {
            totalParticipants: 0,
            activeParticipants: 0,
            completedParticipants: 0,
            averageProgress: 0,
            completionRate: 0,
            participationTrend: []
          },
          engagementMetrics: {
            views: 0,
            likes: 0,
            shares: 0,
            comments: 0
          },
          createdBy: 'admin-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          isTemplate: false,
          searchKeywords: challengeData.tags
        } as Challenge;
        
        setChallenges(prev => [...prev, newChallenge]);
        setSelectedChallenge(newChallenge);
        return newChallenge;
      }
      
      const response = await adminGamificationAPI.createChallenge(challengeData);
      
      if (response.success && response.data) {
        setChallenges(prev => [...prev, response.data!]);
        setSelectedChallenge(response.data);
        return response.data;
      } else {
        setCreateError(response.error?.message || 'Failed to create challenge');
        return null;
      }
      
    } catch (err) {
      console.error('Error creating challenge:', err);
      setCreateError('Failed to create challenge');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [useMockData]);
  
  /**
   * Update an existing challenge
   */
  const updateChallenge = useCallback(async (
    challengeId: string,
    updates: UpdateChallengeRequest
  ): Promise<Challenge | null> => {
    try {
      setIsUpdating(true);
      setUpdateError(null);
      
      // Validate updates
      const validation = validateUpdateChallenge(updates);
      if (!validation.isValid) {
        setUpdateError('Please fix validation errors before updating');
        setFormValidation(validation);
        return null;
      }
      
      if (useMockData) {
        setChallenges(prev => prev.map(challenge => 
          challenge.id === challengeId
            ? { ...challenge, ...updates, updatedAt: new Date().toISOString() }
            : challenge
        ));
        
        const updatedChallenge = challenges.find(c => c.id === challengeId);
        if (updatedChallenge) {
          const merged = { ...updatedChallenge, ...updates };
          setSelectedChallenge(merged);
          return merged;
        }
        return null;
      }
      
      const response = await adminGamificationAPI.updateChallenge(challengeId, updates);
      
      if (response.success && response.data) {
        setChallenges(prev => prev.map(challenge =>
          challenge.id === challengeId ? response.data! : challenge
        ));
        setSelectedChallenge(response.data);
        return response.data;
      } else {
        setUpdateError(response.error?.message || 'Failed to update challenge');
        return null;
      }
      
    } catch (err) {
      console.error('Error updating challenge:', err);
      setUpdateError('Failed to update challenge');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, [useMockData, challenges]);
  
  /**
   * Delete a challenge
   */
  const deleteChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      setIsDeleting(true);
      setDeleteError(null);
      
      if (useMockData) {
        setChallenges(prev => prev.filter(c => c.id !== challengeId));
        if (selectedChallenge?.id === challengeId) {
          setSelectedChallenge(null);
        }
        return true;
      }
      
      const response = await adminGamificationAPI.deleteChallenge(challengeId);
      
      if (response.success) {
        setChallenges(prev => prev.filter(c => c.id !== challengeId));
        if (selectedChallenge?.id === challengeId) {
          setSelectedChallenge(null);
        }
        return true;
      } else {
        setDeleteError(response.error?.message || 'Failed to delete challenge');
        return false;
      }
      
    } catch (err) {
      console.error('Error deleting challenge:', err);
      setDeleteError('Failed to delete challenge');
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [useMockData, selectedChallenge]);
  
  /**
   * Duplicate a challenge
   */
  const duplicateChallenge = useCallback(async (
    challengeId: string,
    modifications?: Partial<CreateChallengeRequest>
  ): Promise<Challenge | null> => {
    try {
      if (useMockData) {
        const originalChallenge = challenges.find(c => c.id === challengeId);
        if (!originalChallenge) return null;
        
        const duplicatedChallenge: Challenge = {
          ...originalChallenge,
          id: `challenge-${Date.now()}`,
          title: `${originalChallenge.title} (Copy)`,
          status: 'draft',
          participationData: [],
          progressData: {
            totalParticipants: 0,
            activeParticipants: 0,
            completedParticipants: 0,
            averageProgress: 0,
            completionRate: 0,
            participationTrend: []
          },
          engagementMetrics: {
            views: 0,
            likes: 0,
            shares: 0,
            comments: 0
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          ...modifications
        };
        
        setChallenges(prev => [...prev, duplicatedChallenge]);
        return duplicatedChallenge;
      }
      
      const response = await adminGamificationAPI.duplicateChallenge(challengeId, modifications);
      
      if (response.success && response.data) {
        setChallenges(prev => [...prev, response.data!]);
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error duplicating challenge:', err);
      return null;
    }
  }, [useMockData, challenges]);
  
  /**
   * Publish a challenge
   */
  const publishChallenge = useCallback(async (challengeId: string): Promise<Challenge | null> => {
    try {
      if (useMockData) {
        const updatedChallenge = challenges.find(c => c.id === challengeId);
        if (updatedChallenge) {
          const published = { 
            ...updatedChallenge, 
            status: 'active' as const, 
            publishedAt: new Date().toISOString() 
          };
          setChallenges(prev => prev.map(c => c.id === challengeId ? published : c));
          return published;
        }
        return null;
      }
      
      const response = await adminGamificationAPI.publishChallenge(challengeId);
      
      if (response.success && response.data) {
        setChallenges(prev => prev.map(c => c.id === challengeId ? response.data! : c));
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error publishing challenge:', err);
      return null;
    }
  }, [useMockData, challenges]);
  
  /**
   * Archive a challenge
   */
  const archiveChallenge = useCallback(async (challengeId: string): Promise<Challenge | null> => {
    try {
      if (useMockData) {
        const updatedChallenge = challenges.find(c => c.id === challengeId);
        if (updatedChallenge) {
          const archived = { 
            ...updatedChallenge, 
            status: 'archived' as const,
            archivedAt: new Date().toISOString() 
          };
          setChallenges(prev => prev.map(c => c.id === challengeId ? archived : c));
          return archived;
        }
        return null;
      }
      
      const response = await adminGamificationAPI.archiveChallenge(challengeId);
      
      if (response.success && response.data) {
        setChallenges(prev => prev.map(c => c.id === challengeId ? response.data! : c));
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error archiving challenge:', err);
      return null;
    }
  }, [useMockData, challenges]);
  
  /**
   * Perform bulk actions on challenges
   */
  const bulkAction = useCallback(async (
    action: BulkChallengeAction
  ): Promise<{ successful: string[]; failed: any[] }> => {
    try {
      setIsBulkAction(true);
      
      if (useMockData) {
        // Mock bulk action implementation
        const successful: string[] = [];
        const failed: any[] = [];
        
        action.challengeIds.forEach(id => {
          const challenge = challenges.find(c => c.id === id);
          if (challenge) {
            successful.push(id);
            // Update challenge based on action
            if (action.action === 'activate') {
              setChallenges(prev => prev.map(c => 
                c.id === id ? { ...c, status: 'active' as const } : c
              ));
            } else if (action.action === 'archive') {
              setChallenges(prev => prev.map(c => 
                c.id === id ? { ...c, status: 'archived' as const } : c
              ));
            }
          } else {
            failed.push({ id, error: 'Challenge not found' });
          }
        });
        
        return { successful, failed };
      }
      
      const response = await adminGamificationAPI.bulkChallengeActions(action);
      
      if (response.success && response.data) {
        // Refresh challenges after bulk action
        await loadChallenges();
        return response.data;
      }
      
      return { successful: [], failed: action.challengeIds.map(id => ({ id, error: 'Unknown error' })) };
      
    } catch (err) {
      console.error('Error performing bulk action:', err);
      return { successful: [], failed: action.challengeIds.map(id => ({ id, error: 'Failed to process' })) };
    } finally {
      setIsBulkAction(false);
    }
  }, [useMockData, challenges, loadChallenges]);
  
  // ================================================================
  // TEMPLATE OPERATIONS
  // ================================================================
  
  /**
   * Create a challenge template
   */
  const createTemplate = useCallback(async (
    templateData: any
  ): Promise<ChallengeTemplate | null> => {
    try {
      if (useMockData) {
        const newTemplate: ChallengeTemplate = {
          id: `template-${Date.now()}`,
          ...templateData,
          usageCount: 0,
          createdAt: new Date().toISOString()
        };
        setTemplates(prev => [...prev, newTemplate]);
        return newTemplate;
      }
      
      const response = await adminGamificationAPI.createChallengeTemplate(templateData);
      
      if (response.success && response.data) {
        setTemplates(prev => [...prev, response.data!]);
        return response.data;
      }
      
      return null;
    } catch (err) {
      console.error('Error creating template:', err);
      return null;
    }
  }, [useMockData]);
  
  /**
   * Use a template to populate builder
   */
  const useTemplate = useCallback((templateId: string): void => {
    const template = templates.find(t => t.id === templateId);
    if (template && template.templateData) {
      setBuilderState(prev => ({
        ...prev,
        formData: { ...template.templateData },
        isDraft: false,
        lastSaved: ''
      }));
      
      // Validate the template data
      const validation = validateCreateChallenge(template.templateData);
      setFormValidation(validation);
    }
  }, [templates]);
  
  // ================================================================
  // BUILDER OPERATIONS
  // ================================================================
  
  /**
   * Update builder step data
   */
  const updateBuilderStep = useCallback((
    step: number,
    data: Partial<CreateChallengeRequest>
  ): void => {
    setBuilderState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data }
    }));
    
    // Validate current form data
    const validation = validateCreateChallenge({ ...builderState.formData, ...data });
    setFormValidation(validation);
    
    // Update step completion status
    setBuilderState(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => 
        i === step ? { ...s, isCompleted: true } : s
      )
    }));
  }, [builderState.formData]);
  
  /**
   * Validate builder step
   */
  const validateBuilderStep = useCallback((step: number): boolean => {
    const stepData = builderState.steps[step];
    if (!stepData) return false;
    
    const validation = validateCreateChallenge(builderState.formData);
    
    // Check if required fields for this step are valid
    return stepData.validationRules.every(rule => !validation.errors[rule as keyof typeof validation.errors]);
  }, [builderState]);
  
  /**
   * Move to next builder step
   */
  const nextBuilderStep = useCallback((): boolean => {
    const currentStep = builderState.currentStep;
    const isValid = validateBuilderStep(currentStep);
    
    if (!isValid) {
      return false;
    }
    
    if (currentStep < builderState.steps.length - 1) {
      setBuilderState(prev => ({
        ...prev,
        currentStep: currentStep + 1
      }));
      return true;
    }
    
    return false;
  }, [builderState, validateBuilderStep]);
  
  /**
   * Move to previous builder step
   */
  const prevBuilderStep = useCallback((): void => {
    if (builderState.currentStep > 0) {
      setBuilderState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1
      }));
    }
  }, [builderState.currentStep]);
  
  /**
   * Reset builder to initial state
   */
  const resetBuilder = useCallback((): void => {
    setBuilderState(initialBuilderState);
    setFormValidation({ isValid: false, errors: {} });
  }, []);
  
  /**
   * Save challenge as draft
   */
  const saveDraft = useCallback(async (): Promise<boolean> => {
    try {
      const draftData: CreateChallengeRequest = {
        ...builderState.formData as CreateChallengeRequest,
        // Add any missing required fields with defaults
      };
      
      const challenge = await createChallenge(draftData);
      
      if (challenge) {
        setBuilderState(prev => ({
          ...prev,
          isDraft: true,
          lastSaved: new Date().toISOString()
        }));
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error saving draft:', err);
      return false;
    }
  }, [builderState.formData, createChallenge]);
  
  /**
   * Load draft challenge into builder
   */
  const loadDraft = useCallback(async (challengeId: string): Promise<void> => {
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      if (challenge && challenge.status === 'draft') {
        setBuilderState(prev => ({
          ...prev,
          formData: {
            title: challenge.title,
            description: challenge.description,
            shortDescription: challenge.shortDescription,
            type: challenge.type,
            difficulty: challenge.difficulty,
            category: challenge.category,
            targets: challenge.targets,
            duration: challenge.duration,
            rewards: challenge.rewards,
            maxParticipants: challenge.maxParticipants,
            isPublic: challenge.isPublic,
            tags: challenge.tags
          },
          isDraft: true,
          lastSaved: challenge.updatedAt
        }));
        
        setSelectedChallenge(challenge);
      }
    } catch (err) {
      console.error('Error loading draft:', err);
    }
  }, [challenges]);
  
  // ================================================================
  // ANALYTICS
  // ================================================================
  
  /**
   * Load challenge analytics
   */
  const loadAnalytics = useCallback(async (
    challengeId: string,
    period?: { startDate: string; endDate: string }
  ): Promise<void> => {
    try {
      setIsLoadingAnalytics(true);
      setAnalyticsError(null);
      
      if (useMockData) {
        // Mock analytics data
        const mockAnalytics: ChallengeAnalytics = {
          challengeId,
          period: period || {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date().toISOString()
          },
          participation: {
            totalViews: 156,
            totalJoins: 45,
            totalCompletions: 12,
            conversionRate: 28.8,
            completionRate: 26.7,
            averageCompletionTime: 120
          },
          engagement: {
            averageSessionsPerUser: 3.2,
            averageProgressUpdates: 5.8,
            socialInteractions: 23,
            returnRate: 67.5
          },
          benchmarks: {
            categoryAverage: 23.4,
            difficultyAverage: 28.1,
            typeAverage: 25.9
          },
          trends: []
        };
        
        setAnalytics(mockAnalytics);
        return;
      }
      
      const response = await adminGamificationAPI.getChallengeAnalytics(challengeId, period);
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        setAnalyticsError(response.error?.message || 'Failed to load analytics');
      }
      
    } catch (err) {
      console.error('Error loading analytics:', err);
      setAnalyticsError('Failed to load analytics');
    } finally {
      setIsLoadingAnalytics(false);
    }
  }, [useMockData]);
  
  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================
  
  /**
   * Get challenge by ID
   */
  const getChallengeById = useCallback((id: string): Challenge | undefined => {
    return challenges.find(c => c.id === id);
  }, [challenges]);
  
  /**
   * Get template by ID
   */
  const getTemplateById = useCallback((id: string): ChallengeTemplate | undefined => {
    return templates.find(t => t.id === id);
  }, [templates]);
  
  /**
   * Check if challenge can be modified
   */
  const canModifyChallenge = useCallback((challenge: Challenge) => {
    if (challenge.status === 'completed' || challenge.status === 'archived') {
      return {
        canModify: false,
        reason: 'Cannot modify completed or archived challenges'
      };
    }
    
    if (challenge.status === 'active' && challenge.progressData.totalParticipants > 0) {
      return {
        canModify: false,
        reason: 'Cannot modify active challenges with participants'
      };
    }
    
    return { canModify: true };
  }, []);
  
  /**
   * Get popular templates
   */
  const getPopularTemplates = useCallback((): ChallengeTemplate[] => {
    return templates
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [templates]);
  
  // ================================================================
  // EFFECTS
  // ================================================================
  
  /**
   * Auto-load data on mount
   */
  useEffect(() => {
    if (autoLoad) {
      loadChallenges();
      loadTemplates();
    }
  }, [autoLoad, loadChallenges, loadTemplates]);
  
  // ================================================================
  // RETURN HOOK INTERFACE
  // ================================================================
  
  return {
    // Challenge data
    challenges,
    templates,
    selectedChallenge,
    analytics,
    
    // Builder state
    builderState,
    formValidation,
    
    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkAction,
    isLoadingAnalytics,
    
    // Error states
    error,
    createError,
    updateError,
    deleteError,
    analyticsError,
    
    // Statistics
    stats,
    
    // CRUD Actions
    createChallenge,
    updateChallenge,
    deleteChallenge,
    duplicateChallenge,
    publishChallenge,
    archiveChallenge,
    bulkAction,
    
    // Template Actions
    createTemplate,
    useTemplate,
    
    // Builder Actions
    updateBuilderStep,
    validateBuilderStep,
    nextBuilderStep,
    prevBuilderStep,
    resetBuilder,
    saveDraft,
    loadDraft,
    
    // Analytics
    loadAnalytics,
    
    // Utility functions
    getChallengeById,
    getTemplateById,
    canModifyChallenge,
    getPopularTemplates
  };
};

export default useAdminChallenges;
