/**
 * Client Source Zod Schemas
 * AI Village consensus: STRING + Zod validation (not database ENUM)
 * Allows adding new sources without database migrations
 */
import { z } from 'zod';

export const ClientSourceSchema = z.enum([
  'swanstudios',
  'move_fitness',
  'external'
]);

export const CreateExternalClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Must be a valid email address'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  weight: z.number().positive().optional(),
  height: z.number().positive().optional(),
  fitnessGoal: z.string().optional(),
  trainingExperience: z.string().optional(),
  healthConcerns: z.string().optional(),
  emergencyContact: z.string().optional(),
  clientSource: ClientSourceSchema.default('move_fitness'),
  password: z.string().min(8).optional(),
});

export default { ClientSourceSchema, CreateExternalClientSchema };
