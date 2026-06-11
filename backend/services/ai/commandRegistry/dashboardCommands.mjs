/**
 * Command Registry — Category G: Dashboard Intelligence (8 commands)
 */
import { z } from 'zod';
import { registerCommands } from './baseSchemas.mjs';

const PositiveIntSchema = (defaultValue, maxValue) => z.coerce.number()
  .int()
  .min(1)
  .max(maxValue)
  .default(defaultValue);

const RevenuePeriodSchema = z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month');
const BusinessKpiPeriodSchema = z.enum(['30d', '90d', '12m']).default('30d');
const TimeRangeSchema = z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d');

const commands = [
  {
    type: 'scan_command_center',
    description: 'Scan the Command Center dashboard for a full overview',
    naturalLanguagePatterns: ['scan my command center', 'show me the dashboard', 'give me an overview', 'what\'s happening'],
    method: 'GET', endpoint: '/api/admin/ai-bff/command-center',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_revenue',
    description: 'Show revenue for a time period',
    naturalLanguagePatterns: ['what\'s my revenue this month', 'show revenue', 'how much did I make'],
    method: 'GET', endpoint: '/api/admin/analytics/revenue',
    inputSchema: z.object({
      period: RevenuePeriodSchema,
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_business_kpis',
    description: 'Show business KPIs and metrics',
    naturalLanguagePatterns: ['show me business KPIs', 'business metrics', 'key performance indicators'],
    method: 'GET', endpoint: '/api/admin/analytics/business-kpis',
    inputSchema: z.object({
      period: BusinessKpiPeriodSchema,
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'brief_my_day',
    description: 'Day sheet — today\'s sessions with per-client attention flags',
    naturalLanguagePatterns: ['how\'s my day look', 'brief my day', 'what\'s my day like', 'today\'s day sheet', 'who am I training today'],
    method: 'GET', endpoint: '/api/ai-command/brief-my-day',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'brief_client',
    description: 'Brief me on a client — cross-domain status summary with attention flags',
    naturalLanguagePatterns: ['brief me on', 'give me a rundown on', 'client status for', 'how is client doing', 'tell me about client'],
    method: 'GET', endpoint: '/api/ai-command/brief-client',
    inputSchema: z.object({
      clientId: z.coerce.number().int().min(1),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin', 'trainer'],
    requiresClientRef: true, category: 'G',
  },
  {
    type: 'view_recent_signups',
    description: 'Show who signed up recently',
    naturalLanguagePatterns: ['who signed up recently', 'recent signups', 'new clients this week'],
    method: 'GET', endpoint: '/api/admin/recent-signups',
    inputSchema: z.object({
      hours: PositiveIntSchema(24, 168),
      limit: PositiveIntSchema(50, 100),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_system_health',
    description: 'Show system health status',
    naturalLanguagePatterns: ['what\'s the system health', 'system status', 'is everything running'],
    method: 'GET', endpoint: '/health',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_user_engagement',
    description: 'Show user engagement metrics',
    naturalLanguagePatterns: ['show user engagement', 'engagement metrics', 'how active are users'],
    method: 'GET', endpoint: '/api/admin/analytics/users',
    inputSchema: z.object({
      timeRange: TimeRangeSchema,
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_active_user_count',
    description: 'Show how many active users there are',
    naturalLanguagePatterns: ['how many active users', 'active user count', 'total users'],
    method: 'GET', endpoint: '/api/admin/dashboard-stats',
    inputSchema: z.object({}).optional(),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
  {
    type: 'view_visitor_intelligence',
    description: 'Show visitor intelligence and traffic data',
    naturalLanguagePatterns: ['show visitor intelligence', 'visitor data', 'site traffic'],
    method: 'GET', endpoint: '/api/admin/dashboard/anonymous-visitors',
    inputSchema: z.object({
      source: z.enum(['anonymous', 'geo', 'history']).default('anonymous'),
      limit: PositiveIntSchema(50, 200),
    }),
    destructive: false, requiresConfirmation: false,
    roleRequired: ['admin'],
    requiresClientRef: false, category: 'G',
  },
];

export function register() {
  registerCommands(commands);
}

export default commands;
