import { sessionService } from './sessionService';
import axios from 'axios';

// Services interface
export interface Services {
  session: typeof sessionService;
}

// Function to create services with an axios instance
export const createServices = (axiosInstance: typeof axios): Services => {
  return {
    session: sessionService
  };
};

// Centralized export of all services
const services = {
  session: sessionService
};

export default services;
