/**
 * Client Source Zod Schemas
 * AI Village consensus: STRING + Zod validation (not database ENUM)
 * Allows adding new sources without database migrations
 */
import { z } from 'zod';

const normalizeClientSourceInput = (value) => {
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized === 'movefitness') return 'move_fitness';
  if (normalized === 'swan_studios') return 'swanstudios';
  return normalized;
};

const CanonicalClientSourceSchema = z.enum([
  'swanstudios',
  'move_fitness',
  'external'
]);

const CanonicalExternalClientSourceSchema = z.enum([
  'move_fitness',
  'external'
]);

export const ClientSourceSchema = z.preprocess(
  normalizeClientSourceInput,
  CanonicalClientSourceSchema,
);

export const ExternalClientSourceSchema = z.preprocess(
  normalizeClientSourceInput,
  CanonicalExternalClientSourceSchema,
);

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
  clientSource: ExternalClientSourceSchema.default('move_fitness'),
  password: z.string().min(8).optional(),
  trainerId: z.union([z.string().min(1), z.number().int().positive()]).optional(),
});

export default { ClientSourceSchema, CreateExternalClientSchema };
