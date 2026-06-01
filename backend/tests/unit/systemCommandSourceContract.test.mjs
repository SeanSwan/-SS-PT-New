/**
 * System command registry contracts
 * =================================
 * Locks Swan Coach system commands to mounted AI monitoring / AI Village routes
 * and keeps AI Village run commands confirmation-gated.
 */
import { describe, expect, it } from 'vitest';
import systemCommands from '../../services/ai/commandRegistry/systemCommands.mjs';

const byType = (type) => systemCommands.find((command) => command.type === type);

describe('system command registry contracts', () => {
  it('targets mounted AI Village and AI monitoring routes', () => {
    expect(byType('run_ai_village')).toMatchObject({
      method: 'POST',
      endpoint: '/api/ai-village/run',
      destructive: false,
      requiresConfirmation: true,
    });
    expect(byType('view_validation_results')).toMatchObject({
      method: 'GET',
      endpoint: '/api/ai-village/latest',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('view_ai_system_status')).toMatchObject({
      method: 'GET',
      endpoint: '/api/ai-monitoring/metrics',
      destructive: false,
      requiresConfirmation: false,
    });
    expect(byType('run_health_check')).toMatchObject({
      method: 'GET',
      endpoint: '/api/ai-monitoring/health',
      destructive: false,
      requiresConfirmation: false,
    });
  });

  it('preserves supported read filters and AI Village run inputs', () => {
    expect(byType('run_ai_village').inputSchema.parse({
      files: ['backend/routes/sessionRoutes.mjs'],
      since: '2h',
      staged: true,
    })).toEqual({
      files: ['backend/routes/sessionRoutes.mjs'],
      since: '2h',
      staged: true,
    });
    expect(byType('view_validation_results').inputSchema.parse({
      track: '03-security.md',
    })).toEqual({
      track: '03-security.md',
    });
    expect(byType('run_health_check').inputSchema.parse({
      includeVillage: false,
    })).toEqual({
      includeVillage: false,
    });
  });
});
