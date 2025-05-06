// services/index.ts
import { AxiosInstance } from 'axios';
import { createClientProgressService, ClientProgressServiceInterface } from './client-progress-service';
import { createExerciseService, ExerciseServiceInterface } from './exercise-service';
import sessionService from './session-service';
import type { SessionServiceResponse, Session, SessionPackage } from './session-service';

export interface Services {
  clientProgress: ClientProgressServiceInterface;
  exercise: ExerciseServiceInterface;
  session: typeof sessionService;
}

export const createServices = (axios: AxiosInstance): Services => {
  // Update the session service's internal axios instance to match the provided one
  // This ensures it has the proper authentication headers
  const api = axios;
  
  return {
    clientProgress: createClientProgressService(axios),
    exercise: createExerciseService(axios),
    session: sessionService
  };
};

export * from './client-progress-service';
export * from './exercise-service';
export { SessionServiceResponse, Session, SessionPackage };
