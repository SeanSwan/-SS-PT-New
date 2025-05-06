# Swan Studios Application Startup Guide

This guide explains how to start, restart, and troubleshoot the Swan Studios application.

## Available Scripts

### `start-mongodb.bat`
This script starts MongoDB on port 5001 (instead of the default 27017). Run this before starting the application if MongoDB isn't already running.

**Usage:**
```
start-mongodb.bat
```

### `start-app.bat`
The standard way to start the application. This script:
- Checks if MongoDB is running on port 5001 and starts it if needed
- Kills any processes using required ports (5000, 5173)
- Runs fix scripts to ensure all backend files are properly set up
- Fixes authentication validation issues
- Ensures the admin user exists
- Starts both frontend and backend servers

**Usage:**
```
start-app.bat
```

### `restart-app.bat`
A quick way to restart the application when needed. This script:
- Kills all processes using the application ports
- Clears temporary Vite cache files
- Ensures the admin user exists
- Restarts both frontend and backend servers

**Usage:**
```
restart-app.bat
```

### `clean-start.bat`
A more thorough restart that terminates all Node.js processes and starts fresh. Use this when experiencing persistent issues. This script:
- Terminates ALL Node.js processes on your system
- Clears port processes
- Cleans Vite cache
- Runs all fix scripts
- Ensures admin user exists
- Starts the application with a clean slate

**Usage:**
```
clean-start.bat
```

### `ensure-admin.bat`
A utility script to create/verify the admin user account. Run this if you're having trouble logging in as admin. This script:
- Runs the admin seeder script to ensure the admin user exists in the database

**Usage:**
```
ensure-admin.bat
```

### `kill-ports.bat`
A utility script that kills processes using ports 5000 (backend) and 5173 (frontend). Run this if you get "address already in use" errors. This script:
- Finds and terminates processes using the required ports

**Usage:**
```
kill-ports.bat
```

## Default Admin Credentials

- **Username:** ogpswan
- **Password:** Password123!

## Common Issues and Solutions

### "Address already in use" Error
If you get an error like `listen EADDRINUSE: address already in use :::5000`, it means there's already a process using that port.

**Solution:**
1. Run `kill-ports.bat` to terminate the process
2. Try starting the application again with `start-app.bat`
3. If that doesn't work, use `clean-start.bat` for a complete reset

### Login Issues
If you're having trouble logging in as admin:

**Solution:**
1. Run `ensure-admin.bat` to recreate the admin user
2. Try logging in with the default credentials
3. If problems persist, use `clean-start.bat` which fixes authentication validation

### Application Crashes or Behaves Strangely
If the application is unstable or showing unexpected behavior:

**Solution:**
Use `clean-start.bat` to restart everything with a clean slate

## Need Further Help?
Check the application logs in the console for more specific error messages.
