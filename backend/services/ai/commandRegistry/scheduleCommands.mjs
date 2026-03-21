/**
 * Command Registry — Category C: Scheduling (8 commands)
 */
import { z } from 'zod';
import { registerCommands, DateSchema, TimeSchema } from './baseSchemas.mjs';

const commands = [
  {
    type: 'view_today_schedule',
    description: 'Show today\'s schedule',
    naturalLanguagePatterns: ['show me today\'s schedule', 'what\'s on the schedule today', 'who do I have today'],
    method: 'GET', endpoint: '/api/schedule',
    inputSchema: z.object({ range: z.literal('day').default('day') }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'C',
  },
  {
    type: 'view_week_schedule',
    description: 'Show this week\'s schedule',
    naturalLanguagePatterns: ['show me this week\'s schedule', 'weekly schedule', 'what\'s this week look like'],
    method: 'GET', endpoint: '/api/schedule',
    inputSchema: z.object({ range: z.literal('week').default('week') }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'C',
  },
  {
    type: 'schedule_session',
    description: 'Schedule a client for a session at a specific date and time',
    naturalLanguagePatterns: ['schedule {client} for {date} at {time}', 'book {client} on {date}', 'add session for {client}'],
    method: 'POST', endpoint: '/api/sessions/admin/create',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      date: DateSchema,
      time: TimeSchema,
      duration: z.number().int().min(15).max(180).default(60),
      notes: z.string().max(500).optional(),
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'C',
  },
  {
    type: 'cancel_session',
    description: 'Cancel a client\'s session on a specific date',
    naturalLanguagePatterns: ['cancel {client}\'s session on {date}', 'remove {client}\'s appointment', 'cancel session {id}'],
    method: 'PATCH', endpoint: '/api/sessions/:sessionId/cancel',
    inputSchema: z.object({
      sessionId: z.number().int().positive().optional(),
      clientId: z.number().int().positive().optional(),
      date: DateSchema.optional(),
    }),
    destructive: true, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'C',
  },
  {
    type: 'view_trainer_availability',
    description: 'Show a trainer\'s availability',
    naturalLanguagePatterns: ['show {trainer}\'s availability', 'when is {trainer} available', 'my availability'],
    method: 'GET', endpoint: '/api/availability/trainer/:trainerId',
    inputSchema: z.object({ trainerId: z.number().int().positive() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'C',
  },
  {
    type: 'set_availability',
    description: 'Set trainer availability for a specific day and time range',
    naturalLanguagePatterns: ['set my availability for {day} {time}-{time}', 'I\'m available on {day} from {time} to {time}'],
    method: 'POST', endpoint: '/api/availability/trainer/:trainerId',
    inputSchema: z.object({
      trainerId: z.number().int().positive(),
      dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      startTime: TimeSchema,
      endTime: TimeSchema,
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'C',
  },
  {
    type: 'view_today_sessions',
    description: 'Show who has sessions today',
    naturalLanguagePatterns: ['who has sessions today', 'today\'s appointments', 'today\'s clients'],
    method: 'GET', endpoint: '/api/sessions',
    inputSchema: z.object({ date: DateSchema.optional() }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'C',
  },
  {
    type: 'reschedule_session',
    description: 'Reschedule a client from one date to another',
    naturalLanguagePatterns: ['reschedule {client} from {date} to {date}', 'move {client}\'s session to {date}'],
    method: 'POST', endpoint: '/api/sessions/admin/create',
    inputSchema: z.object({
      clientId: z.number().int().positive(),
      originalDate: DateSchema,
      newDate: DateSchema,
      newTime: TimeSchema,
    }),
    destructive: false, requiresConfirmation: true,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'C',
    isComposite: true, // cancel old + create new (atomic)
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
