/**
 * SwanStudios Services - Enhanced Index
 * =====================================
 * 
 * Centralized export point for all services
 * Maintains backwards compatibility while providing better organization
 * Production-safe enhancements to existing service architecture
 */

// === CORE SERVICES (PRODUCTION READY) ===
import sessionService from './session-service';
import YoloAnalysisService from './yolo-analysis-service';
import { createClientProgressService } from './client-progress-service';
import { createEnhancedProgressAnalyticsService } from './enhanced-progress-analytics-service';
import axios from 'axios';

// === SPECIALIZED SERVICES ===
export { default as universalMasterScheduleService } from './universal-master-schedule-service';
export { default as clientTrainerAssignmentService } from './clientTrainerAssignmentService';
export { default as packageService } from './packageService';
export { default as exerciseService } from './exercise-service';
export { default as trainerService } from './trainerService';
export { default as profileService } from './profileService';
export { default as workoutPlannerService } from './workout-planner-service';
export { default as workoutSessionService } from './workout-session-service';
export { default as gamificationMCPService } from './gamificationMCPService';
export { default as nasmApiService } from './nasmApiService';
export { default as enterpriseAdminApiService } from './enterpriseAdminApiService';
export { default as enhancedClientDashboardService } from './enhancedClientDashboardService';
export { default as adminClientService } from './adminClientService';
export { default as devAuthService } from './devAuthService';

// === MCP SERVICES ===
export * from './mcp';
export * from './gamification';

// === LEGACY EXPORTS (BACKWARDS COMPATIBILITY) ===
// Services interface
export interface Services {
  sessionService: typeof sessionService;
  yoloAnalysis: typeof YoloAnalysisService;
  clientProgress: ReturnType<typeof createClientProgressService>;
  enhancedProgressAnalytics: ReturnType<typeof createEnhancedProgressAnalyticsService>;
}

// Function to create services with an axios instance
export const createServices = (axiosInstance: typeof axios): Services => {
  return {
    sessionService: sessionService,
    yoloAnalysis: YoloAnalysisService,
    clientProgress: createClientProgressService(axiosInstance),
    enhancedProgressAnalytics: createEnhancedProgressAnalyticsService(axiosInstance)
  };
};

// Centralized export of all services (ORIGINAL - DO NOT MODIFY)
const services = {
  sessionService: sessionService,
  yoloAnalysis: YoloAnalysisService
};

export default services;

// Individual service exports (ORIGINAL - DO NOT MODIFY)
export { createClientProgressService } from './client-progress-service';
export { createEnhancedProgressAnalyticsService } from './enhanced-progress-analytics-service';
export type { 
  ClientProgressData, 
  ComparisonData, 
  InjuryRiskData, 
  GoalTrackingData 
} from './enhanced-progress-analytics-service';

// === SERVICE CATEGORIES FOR BETTER ORGANIZATION ===
export const CoreServices = {
  session: sessionService,
  yoloAnalysis: YoloAnalysisService,
  clientProgress: createClientProgressService,
  enhancedProgressAnalytics: createEnhancedProgressAnalyticsService
};

export const AdminServices = {
  enterpriseAdmin: 'enterpriseAdminApiService',
  adminClient: 'adminClientService',
  userManagement: 'Universal through enterpriseAdminApiService'
};

export const FitnessServices = {
  exercise: 'exerciseService',
  workoutPlanner: 'workoutPlannerService',
  workoutSession: 'workoutSessionService',
  nasm: 'nasmApiService',
  trainer: 'trainerService'
};

export const SchedulingServices = {
  universalMasterSchedule: 'universalMasterScheduleService',
  clientTrainerAssignment: 'clientTrainerAssignmentService'
};

export const PlatformServices = {
  package: 'packageService',
  profile: 'profileService',
  gamification: 'gamificationMCPService',
  clientDashboard: 'enhancedClientDashboardService'
};

// === SERVICE CONSTANTS ===
export const SERVICE_VERSIONS = {
  CORE: '2.1.0',
  ADMIN: '1.5.0',
  FITNESS: '1.8.0',
  SCHEDULING: '2.0.0',
  PLATFORM: '1.6.0'
} as const;

export const DEFAULT_SERVICE_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
} as const;

// === UTILITY FUNCTIONS ===
export const getServiceHealth = () => {
  return {
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
    versions: SERVICE_VERSIONS,
    status: 'operational'
  };
};

export const createServiceLogger = (serviceName: string) => {
  return {
    info: (message: string, data?: any) => console.log(`[${serviceName}] ${message}`, data),
    error: (message: string, error?: any) => console.error(`[${serviceName}] ${message}`, error),
    warn: (message: string, data?: any) => console.warn(`[${serviceName}] ${message}`, data)
  };
};
