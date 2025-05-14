# SwanStudios Startup Troubleshooting Guide

This guide helps you troubleshoot and resolve common startup issues with the SwanStudios platform.

## Quick Solutions

### 1. Use Development Mode (No Backend Required)

The fastest way to get up and running is to use our development mode, which doesn't require MongoDB or a backend server:

```
run-dev-mode.bat
```

This will:
- Start the frontend on port 5173
- Enable mock data and authentication
- Allow you to login with any username/password
- Provide full access to all features

### 2. Port Issues

If you encounter port conflicts:

```
Error: Port 5173 is already in use
```

Run the included script to kill processes on the port:

```
kill-ports.bat
```

Then try starting again with:

```
run-dev-mode.bat
```

### 3. MongoDB Issues

If you see:

```
'mongod' is not recognized as an internal or external command
```

You have two options:

1. **Use Development Mode**: Run `run-dev-mode.bat` (recommended)
2. **Install MongoDB**: 
   - Download from [MongoDB website](https://www.mongodb.com/try/download/community)
   - Add the bin directory to your PATH
   - Create the data directory: `mkdir C:/data/db`

### 4. Backend Connection Errors

If you see:

```
POST http://localhost:5000/api/auth/login net::ERR_CONNECTION_REFUSED
```

Use development mode with mock authentication:

```
run-dev-mode.bat
```

### 5. Syntax Errors in Code

If you see errors like:

```
Error: Unexpected end of file
```

The development mode includes fixes for known syntax errors in the codebase.

## How to Run in Development Mode

The development mode provides a complete mock environment that allows you to:

1. Work on the frontend without a backend
2. Test all features with mock data
3. Implement new UI components without dependencies
4. Have a seamless development experience

To run in development mode:

1. Run `run-dev-mode.bat`
2. Access at http://localhost:5173
3. Login with any username (e.g., "ogpswan")
4. Enjoy full access to all features

## Implementing YOLO AI Feature

With development mode, you can now focus on implementing the YOLO AI Form & Posture Analysis feature as specified in your Master Prompt v21.

## Additional Help

If you continue experiencing issues:

1. Clear your browser cache
2. Delete the `.vite-cache` directory in the frontend folder
3. Run `frontend/npm run clear-cache` to clean cache files
4. Restart your computer
5. Try `npm install` in both root and frontend directories

## Next Steps

Once you have the application running in development mode, you can proceed with implementing the YOLO AI Form & Posture Analysis feature as outlined in the Master Prompt v21.
