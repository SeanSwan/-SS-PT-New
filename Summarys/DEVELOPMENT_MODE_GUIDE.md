# SwanStudios Development Mode Guide

This guide explains how to use the enhanced development mode to work on the SwanStudios platform without needing a running backend server.

## What is Development Mode?

Development mode provides a fully mocked environment that allows you to:

- Login with any username/password combination
- Access all protected routes
- Test all frontend features
- Develop new UI components
- Implement the YOLO AI Form & Posture Analysis feature

All API calls are intercepted and handled with mock responses, eliminating the need for a running backend server.

## How to Start Development Mode

1. Simply run the development script:
   ```
   run-dev.bat
   ```

2. This will:
   - Start the frontend server on port 5175
   - Set all necessary environment variables
   - Enable mock data mode

3. Access the application:
   ```
   http://localhost:5175
   ```

## Login & Authentication

In development mode, you can log in with any username and password combination:

- Username: Any value (e.g., "ogpswan")
- Password: Any value (e.g., "password")

The system will automatically create a mock user with the role "client" (or "admin" if the username contains "admin").

## Protected Routes

All protected routes will work with the mock authentication. The application will:

1. Create a mock JWT token
2. Store user data in localStorage
3. Allow full access to client dashboard, admin sections, and other protected areas

## Working with Mock Data

When implementing new features that require data:

1. For static data, add mock objects directly to your component state
2. For dynamic data that would normally come from the API, add mock implementations in `api.service.ts`

Example for adding a new mock endpoint:

```typescript
// In api.service.ts, add to the generateMockResponse method:

if (url.includes('/api/your-new-endpoint')) {
  return {
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as any,
    data: {
      // Your mock response data
      items: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' }
      ]
    }
  };
}
```

## Implementing YOLO AI Form & Posture Analysis

When implementing the YOLO AI Form & Posture Analysis feature, you should:

1. Create all necessary UI components
2. Implement frontend logic for video upload, display, and feedback
3. Create mock data for posture analysis results
4. Design the gamification integration

Since you're working in development mode, you don't need to worry about actual AI processing - just focus on the user experience and UI components.

## Troubleshooting

If you encounter any issues in development mode:

1. **Login Redirect Loop**: Check localStorage for token and user_data - clear browser storage if necessary
2. **Missing Mock Data**: Add the required mock endpoint in api.service.ts
3. **Component Errors**: Check browser console for specific error messages

For any other issues, you can manually reset the development environment by:
1. Clearing browser localStorage
2. Restarting the frontend server
3. Running `run-dev.bat` again

## Next Steps

Now that you have development mode configured, you can proceed with implementing the YOLO AI Form & Posture Analysis feature as specified in your Master Prompt v21.
