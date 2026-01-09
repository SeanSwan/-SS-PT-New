/**
 * Rate Limit Configuration
 * Production-ready rate limiting settings
 */

export const RATE_LIMIT_CONFIG = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many requests from this IP',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 15 * 60
    },
    // Skip rate limiting for health checks
    skip: (req) => req.path === '/health'
  },

  // Stricter rate limit for auth endpoints
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5, // 5 attempts per 15 minutes
    message: {
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT',
      retryAfter: 15 * 60
    },
    // Only apply to auth-related routes
    skip: (req) => !['/auth/login', '/auth/register', '/auth/forgot-password'].includes(req.path)
  },

  // Stricter rate limit for sensitive operations
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 requests per hour
    message: {
      error: 'Too many sensitive operations',
      code: 'SENSITIVE_RATE_LIMIT',
      retryAfter: 60 * 60
    },
    // Apply to sensitive operations
    skip: (req) => !['/admin', '/payments', '/users/me/delete'].includes(req.path)
  },

  // Rate limit for feedback/rating submissions
  feedback: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 feedback submissions per hour
    message: {
      error: 'Too many feedback submissions',
      code: 'FEEDBACK_RATE_LIMIT',
      retryAfter: 60 * 60
    }
  }
};

export default RATE_LIMIT_CONFIG;