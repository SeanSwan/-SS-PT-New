// services/index.ts
import { AxiosInstance } from 'axios';
import { createClientProgressService, ClientProgressServiceInterface } from './client-progress-service';
import { createExerciseService, ExerciseServiceInterface } from './exercise-service';

export interface Services {
  clientProgress: ClientProgressServiceInterface;
  exercise: ExerciseServiceInterface;
}

export const createServices = (axios: AxiosInstance): Services => {
  return {
    clientProgress: createClientProgressService(axios),
    exercise: createExerciseService(axios)
  };
};

export * from './client-progress-service';
export * from './exercise-service';
