import sessionService from './session-service';
import YoloAnalysisService from './yolo-analysis-service';
import axios from 'axios';

// Services interface
export interface Services {
  sessionService: typeof sessionService;
  yoloAnalysis: typeof YoloAnalysisService;
}

// Function to create services with an axios instance
export const createServices = (axiosInstance: typeof axios): Services => {
  return {
    sessionService: sessionService,
    yoloAnalysis: YoloAnalysisService
  };
};

// Centralized export of all services
const services = {
  sessionService: sessionService,
  yoloAnalysis: YoloAnalysisService
};

export default services;
