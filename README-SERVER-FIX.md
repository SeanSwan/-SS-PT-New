# Server Startup Fix Guide

This guide addresses common server startup issues with the SwanStudios application, particularly around missing utility files, model files, and export issues.

## 🔍 Problem Overview

The application was encountering these main issues:

1. **Missing Utility Files**: The backend fails to start due to missing utility files:
   - `responseUtils.mjs`: Required by controllers for API responses
   - `apiResponse.mjs`: Alternative response utility used by some controllers
   - Various other utility files needed by the server

2. **Missing Model Files**: Several required model files are missing:
   - `Gamification.mjs`: User gamification data model
   - Potentially other models referenced in the associations.mjs file

3. **Missing Middleware Exports**: Required exports missing from middleware files:
   - `authorize` function missing from `authMiddleware.mjs`
   - This function is required by several route files

4. **Missing Association Exports**: Required model exports missing from `associations.mjs`:
   - `GamificationSettings` model not exported properly
   - Missing imports for junction models (UserAchievement, UserReward, UserMilestone)
   - Import/export mismatches for Reward, Milestone, and PointTransaction models
   - These models are used by gamificationController.mjs but not properly exported

5. **Frontend Connection Issues**: The frontend fails to connect to the backend with "ERR_CONNECTION_REFUSED" errors.

## 🛠️ Quick Fix Solution

We've added an automated fix script to resolve these issues. Here's how to use it:

### Option 1: Run the complete fix script and start the application (recommended)

```bash
# On Windows - Using the batch file (easiest)
start-fixed-app.bat

# OR using npm from the root directory
npm run start-fixed
```

This command will:
1. Run the enhanced server fix script that creates any missing utility files
2. Run the enhanced models fix script that creates any missing model files and fixes exports
3. Run the fix-all script to handle database setup and admin user creation
4. Start both the frontend and backend servers

### Option 2: Run individual fix scripts

```bash
# From the root directory
# Fix only utility files
npm run fix-server

# Fix only model files
npm run fix-models

# Fix both utility and model files without starting servers
npm run fix-all
```

Then start the application normally with:

```bash
npm run start
```

## 🗂️ Created/Fixed Files

The fix scripts create these files if they're missing:

1. **Utility Files**:
   - `backend/utils/responseUtils.mjs` - Response formatting utilities
   - `backend/utils/apiResponse.mjs` - Alternative response utilities
   - `backend/utils/logger.mjs` - Logging utilities
   - `backend/utils/apiKeyChecker.mjs` - API key validation
   - `backend/middleware/nasmAuthMiddleware.mjs` - Authentication middleware for API routes

2. **Model Files**:
   - `backend/models/Gamification.mjs` - User gamification data model
   - `backend/models/GamificationSettings.mjs` - Global gamification settings
   - `backend/models/UserAchievement.mjs` - Junction model for user achievements
   - `backend/models/UserReward.mjs` - Junction model for user rewards
   - `backend/models/UserMilestone.mjs` - Junction model for user milestones
   - Any other missing models referenced in associations.mjs

3. **Middleware Exports**:
   - Added `authorize` function to `backend/middleware/authMiddleware.mjs`

4. **Association Exports**:
   - Updated `backend/models/associations.mjs` to export all imported models
   - Added missing imports and exports for junction models
   - Fixed import paths for all models used in controllers

5. **Controller Imports**:
   - Updated `backend/controllers/gamificationController.mjs` with correct imports

## 🤖 MCP Server

The Python-based MCP server is also included in the application:

1. **Location**: `backend/mcp_server/workout_mcp_server.py`
2. **Features**:
   - Provides workout recommendations
   - Manages client progress data
   - Generates workout statistics
   - Logs workout sessions
   - Creates personalized workout plans

3. **Dependencies**: The server requires the following Python packages:
   - fastapi==0.100.0
   - uvicorn[standard]==0.22.0
   - pydantic==2.0.0
   - requests==2.31.0
   - python-dotenv==1.0.0

4. **Setup**:
   ```bash
   cd backend/mcp_server
   pip install -r requirements.txt
   python workout_mcp_server.py
   ```

## 🔌 Frontend-Backend Connection

The fix also improves the frontend's ability to handle backend connection issues by:

1. Extending the proxy timeout to 60 seconds
2. Adding better error handling for connection issues
3. Providing meaningful error messages when the backend is unavailable

## 🔍 Troubleshooting

If you're still experiencing issues:

### Backend Startup Issues

1. Look for error messages in the console when starting the backend
2. Make sure you have PostgreSQL running if the application uses a database
3. Check that all environment variables are properly set (see `.env.example`)
4. Run database migrations if needed: `cd backend && npx sequelize-cli db:migrate`
5. Verify that the fix scripts completed successfully without errors

### Frontend Connection Issues

1. Make sure the backend is running and listening on port 5000
2. Check that the frontend is correctly configured to use the backend URL
3. Look for proxy errors in the Vite development server logs

### MCP Server Issues

1. Ensure Python 3.7+ is installed on your system
2. Install all required dependencies with pip
3. Verify that the server can connect to the backend API
4. Check if the proper environment variables are set in the `.env` file in the mcp_server directory

## 📚 Additional Commands

There are several helpful maintenance commands available:

- `npm run check-server` - Check the server status
- `npm run db:setup` - Set up the database with migrations and seed data
- `npm run db:reset` - Reset the database to a clean state

## 📊 Common Error Messages and Solutions

1. **ERR_MODULE_NOT_FOUND**: This indicates a missing file or module
   - Solution: Run `npm run fix-all` to create missing files

2. **SyntaxError: The requested module does not provide an export named X**
   - Solution: Run `npm run fix-models` to fix export issues in model files

3. **ReferenceError: Cannot access 'dirname' before initialization**
   - Solution: ESM modules require a different approach to get the current directory:
     ```javascript
     import { fileURLToPath } from 'url';
     import path from 'path';
     const __filename = fileURLToPath(import.meta.url);
     const __dirname = path.dirname(__filename);
     ```

4. **Database connection errors**
   - Solution: Ensure PostgreSQL is running and check your .env file for correct credentials

## 🚀 Next Steps

After fixing these startup issues, you might want to:

1. Make sure authentication is working correctly by logging in with the default admin credentials
2. Set up any additional required environment variables
3. Add test data to the database using the seed commands
4. Explore the API endpoints using tools like Postman
5. Start developing and enhancing the application features

## 📝 Default Login Credentials

If you used the fix-all script, an admin user has been created with these credentials:

- **Username**: ogpswan
- **Password**: Password123!

You can change these in the .env file before running the fix script:

```
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password
ADMIN_EMAIL=your_email@example.com
```

---

If you encounter any other issues, please report them on the project's issue tracker.
