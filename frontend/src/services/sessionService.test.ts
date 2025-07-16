// TypeScript compilation test for sessionService.ts
// This file verifies that all imports and types are working correctly

import { sessionService } from './sessionService';
import {
  Session,
  SessionRequest,
  FilterOptions,
  ScheduleStats
} from '../components/UniversalMasterSchedule/types';

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

// Test service instantiation
console.log('SessionService initialized successfully:', !!sessionService);

// Test method availability
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

testMethods.forEach(method => {
  if (typeof sessionService[method as keyof typeof sessionService] === 'function') {
    console.log(`✅ Method ${method} is available`);
  } else {
    console.error(`❌ Method ${method} is missing`);
  }
});

export { sessionService, testFilterOptions, testSessionRequest };
