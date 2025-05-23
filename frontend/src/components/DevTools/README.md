# SwanStudios Development Tools

## Quick Authentication Panel

This module provides a floating panel that allows developers to quickly switch between different user roles (admin, trainer, client) during development without having to repeatedly log in.

## Features

- Quick one-click login as Admin, Trainer, Client, or Social User
- Persistent login state between refreshes
- Automatic navigation to the appropriate dashboard
- Reset test accounts with one click
- Minimizable panel that stays out of the way

## How to Use

The Development Tools panel is **automatically enabled in development mode only**. You don't need to do anything special to activate it - when you run the application in development mode, the panel will appear in the bottom-right corner of the screen.

### Quick Role Switching

1. Click on the "Login as Admin" button to instantly log in with admin privileges
2. Click on "Login as Trainer" to switch to trainer role
3. Click on "Login as Client" to switch to client role
4. Click on "Login as User" to switch to regular social user role

The panel will show your current role and provide a logout button if needed.

### Test Account Credentials

These are the credentials used by the quick login buttons:

- **Admin**: admin@swanstudios.com / admin123
- **Trainer**: trainer@swanstudios.com / trainer123
- **Client**: client@test.com / client123
- **User**: user@test.com / user123

### Resetting Test Accounts

If you need to refresh the test accounts (for example, after changing the database schema), click the refresh icon in the top-right corner of the panel. This will trigger the backend to recreate all test accounts with their default settings.

## Implementation Notes

### Components

1. **DevLoginPanel**: The floating UI component visible in the app
2. **DevToolsProvider**: A wrapper component that conditionally renders dev tools based on environment
3. **dev-auth-helper.ts**: Utilities for managing authentication state in development
4. **devAuthService.ts**: Service for communicating with the development API endpoints

### Backend Integration

The tool connects to the following API endpoints:

- `GET /api/dev/seed-test-accounts`: Creates or resets test accounts in the database
- `GET /api/dev/health-check`: Checks if the development API is functioning

## Security Notes

- The development tools are automatically disabled in production environments
- The backend routes are protected by environment checks and will return 404 in production
- No sensitive authentication data is exposed through these tools

## Troubleshooting

If the quick login buttons don't work:

1. Ensure your backend server is running
2. Check that the DATABASE_URL in your .env file is correctly set
3. Verify that the dev-routes.mjs is properly registered in server.mjs
4. Check the browser console for any error messages

If you need to manually reset the test accounts, you can run:

```bash
cd backend
node scripts/seed-test-accounts.mjs
```