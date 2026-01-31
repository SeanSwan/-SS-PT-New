// TypeScript compilation + runtime shape tests for sessionService.ts

import { sessionService } from './sessionService';
import {
  Session,
  SessionRequest,
  FilterOptions,
  ScheduleStats
} from '../components/UniversalMasterSchedule/types';
import { describe, it, expect } from 'vitest';

// Test type compatibility
const testFilterOptions: FilterOptions = {
  trainerId: '',
  clientId: '',
  status: 'available',
  dateRange: 'week',
  location: '',
  searchTerm: ''
};

const testSessionRequest: SessionRequest = {
  sessionDate: new Date().toISOString(),
  duration: 60,
  status: 'available'
};

describe('sessionService shape', () => {
  it('exposes expected methods', () => {
    const testMethods = [
      'getSessions',
      'createSession',
      'updateSession',
      'deleteSession',
      'moveSession',
      'bookSession',
      'bulkSessionAction',
      'getSessionStatistics'
    ];

    testMethods.forEach((method) => {
      expect(typeof sessionService[method as keyof typeof sessionService]).toBe('function');
    });
  });

  it('accepts typed filter and request objects', () => {
    const _filter: FilterOptions = testFilterOptions;
    const _request: SessionRequest = testSessionRequest;
    expect(_filter.status).toBe('available');
    expect(_request.duration).toBe(60);
  });
});
