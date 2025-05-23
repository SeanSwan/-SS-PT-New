import { sessionService } from './sessionService';
import YoloAnalysisService from './yolo-analysis-service';
import axios from 'axios';

// Services interface
export interface Services {
  session: typeof sessionService;
  yoloAnalysis: typeof YoloAnalysisService;
}

// Function to create services with an axios instance
export const createServices = (axiosInstance: typeof axios): Services => {
  return {
    session: sessionService,
    yoloAnalysis: YoloAnalysisService
  };
};

// Centralized export of all services
const services = {
  session: sessionService,
  yoloAnalysis: YoloAnalysisService
};

export default services;
