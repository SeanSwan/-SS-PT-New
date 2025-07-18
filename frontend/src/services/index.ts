import sessionService from './session-service';
import YoloAnalysisService from './yolo-analysis-service';
import { createClientProgressService } from './client-progress-service';
import { createEnhancedProgressAnalyticsService } from './enhanced-progress-analytics-service';
import axios from 'axios';

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

// Centralized export of all services
const services = {
  sessionService: sessionService,
  yoloAnalysis: YoloAnalysisService
};

export default services;

// Individual service exports
export { createClientProgressService } from './client-progress-service';
export { createEnhancedProgressAnalyticsService } from './enhanced-progress-analytics-service';
export type { 
  ClientProgressData, 
  ComparisonData, 
  InjuryRiskData, 
  GoalTrackingData 
} from './enhanced-progress-analytics-service';
