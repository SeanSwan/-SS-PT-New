import { describe, expect, it } from 'vitest';
import {
  buildClientHubWorkoutCompleteReturnPath,
  normalizeDashboardReturnTo,
  parseLoggerClientId,
  parseLoggerSessionId,
} from './EnhancedWorkoutLogger.logic';

describe('EnhancedWorkoutLogger return path normalization', () => {
  it('keeps dashboard-local return paths', () => {
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management?clientId=61'))
      .toBe('/dashboard/admin/client-management?clientId=61');
  });

  it('rejects empty, external, and protocol-relative values', () => {
    expect(normalizeDashboardReturnTo(null)).toBeNull();
    expect(normalizeDashboardReturnTo('https://evil.example/dashboard/admin')).toBeNull();
    expect(normalizeDashboardReturnTo('//evil.example/dashboard/admin')).toBeNull();
    expect(normalizeDashboardReturnTo('/marketing')).toBeNull();
  });

  it('rejects dashboard-looking paths with control characters or backslashes', () => {
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management\n?clientId=61')).toBeNull();
    expect(normalizeDashboardReturnTo('/dashboard/admin/client-management\t?clientId=61')).toBeNull();
    expect(normalizeDashboardReturnTo('/dashboard\\admin\\client-management')).toBeNull();
  });
});

describe('EnhancedWorkoutLogger client identity parsing', () => {
  it('accepts only complete positive integer client ids', () => {
    expect(parseLoggerClientId('61')).toBe(61);
    expect(parseLoggerClientId(' 61 ')).toBe(61);
    expect(parseLoggerClientId(61)).toBe(61);
    expect(parseLoggerClientId('61junk')).toBeNull();
    expect(parseLoggerClientId('0')).toBeNull();
    expect(parseLoggerClientId(null)).toBeNull();
  });
});

describe('EnhancedWorkoutLogger scheduled session identity parsing', () => {
  it('keeps only complete positive integer scheduled session ids', () => {
    expect(parseLoggerSessionId('314')).toBe('314');
    expect(parseLoggerSessionId(' 314 ')).toBe('314');
    expect(parseLoggerSessionId('314junk')).toBeNull();
    expect(parseLoggerSessionId('0')).toBeNull();
    expect(parseLoggerSessionId(null)).toBeNull();
  });
});

describe('EnhancedWorkoutLogger Client Hub completion return path', () => {
  it('returns completed Client Hub logs to training history while preserving client identity', () => {
    expect(buildClientHubWorkoutCompleteReturnPath('/dashboard/admin/client-management?clientId=61'))
      .toBe('/dashboard/admin/client-management?clientId=61&tab=training&trainingSection=history');
  });

  it('does not rewrite non Client Hub dashboard return paths', () => {
    expect(buildClientHubWorkoutCompleteReturnPath('/dashboard/admin/schedule?sessionId=314'))
      .toBe('/dashboard/admin/schedule?sessionId=314');
  });
});
