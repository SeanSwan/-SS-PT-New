export const VIEW_AS_SUPPORTED_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/gamification/profile', batch: '18.C.1A' },
  { method: 'GET', path: '/api/v1/gamification/dashboard', batch: '18.C.1A' },
  { method: 'GET', path: '/api/gamification/profile', batch: '18.C.1A' },
  { method: 'GET', path: '/api/gamification/dashboard', batch: '18.C.1A' },
];

export const VIEW_AS_UNSUPPORTED_ENDPOINTS = [
  {
    path: '/api/messaging/*',
    status: 'unsafe',
    reason: 'Messaging reads can expose auth tokens, participant state, and delivery side effects.',
  },
  {
    path: '/api/consent/*',
    status: 'self-only',
    reason: 'Consent flows are actor-bound and must not be impersonated.',
  },
  {
    path: '/api/auth/*',
    status: 'never',
    reason: 'Authentication endpoints are outside viewAs scope.',
  },
];

export default VIEW_AS_SUPPORTED_ENDPOINTS;
