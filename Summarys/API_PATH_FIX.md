# API Path Configuration Guide

## Problem Description

The API paths in this application need to match the expected routes on the backend server. Based on testing, we've determined that the backend expects API paths with the `/api` prefix (e.g., `/api/auth/login`).

## Solution Implemented

We've updated all API service files to correctly use the `/api` prefix in their endpoint paths:

1. Updated `AuthContext.tsx` to use proper API paths:
   - `/api/auth/login`
   - `/api/auth/register`
   - `/api/auth/me`
   - `/api/auth/profile`

2. Updated `schedule-service.ts` to use proper API paths:
   - `/api/sessions`
   - `/api/users`
   - `/api/sessions/{id}/action`

3. Simplified the Vite proxy configuration to only handle the `/api` path:
   ```javascript
   proxy: {
     '/api': {
       target: 'http://localhost:5000',
       changeOrigin: true,
       secure: false,
     },
   }
   ```

## Troubleshooting API Routes

If you encounter 404 errors with API requests:

1. Check the browser console to see the full URL being requested
2. Verify the API path matches what your backend expects
3. Ensure the backend route exists and is correctly configured
4. Check your Vite proxy configuration to ensure it's correctly forwarding requests

## Common Issues

### 1. 404 Not Found Errors

If you get a 404 error, check:
- Is the API endpoint path correct?
- Does the backend have a route handler for this path?
- Is the HTTP method correct (GET, POST, PATCH, etc.)?

### 2. Authentication Errors

If you get a 401 Unauthorized error:
- Is the token being correctly added to the request headers?
- Is the token valid and not expired?
- Does the user have permission to access this resource?

### 3. Proxy Configuration

If the request doesn't reach the backend:
- Is the Vite proxy correctly configured?
- Is the backend server running on the expected port?
- Are there any CORS issues?

## Backend Routes

Based on the logs, these are the expected backend routes:

- Authentication:
  - POST `/api/auth/login`
  - POST `/api/auth/register`
  - GET `/api/auth/me`
  - PATCH `/api/auth/profile`

- Sessions:
  - GET `/api/sessions`
  - POST `/api/sessions`
  - GET `/api/sessions/:id`
  - POST `/api/sessions/:id/book`
  - PATCH `/api/sessions/:id/cancel`
  - PATCH `/api/sessions/:id/confirm`
  - PATCH `/api/sessions/:id/complete`
  - PATCH `/api/sessions/:id/assign`
  - PATCH `/api/sessions/:id/notes`

- Users:
  - GET `/api/users?role=trainer`
  - GET `/api/users?role=client`
