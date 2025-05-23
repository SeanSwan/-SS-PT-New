// services.d.ts
// Service type declarations to ensure TypeScript compatibility
import { ClientProgressServiceInterface } from './client-progress-service'; 
import { ExerciseServiceInterface } from './exercise-service';

// Extend AxiosInstance to include services
declare module 'axios' {
  interface AxiosInstance {
    services?: {
      clientProgress: ClientProgressServiceInterface;
      exercise: ExerciseServiceInterface;
    };
  }
}
