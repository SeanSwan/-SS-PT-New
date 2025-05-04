# User Registration Fix

## Issue Identified
The user registration was failing with the following error:
```
invalid input value for enum enum_users_role: "user"
```

## Root Cause
In the User model, the `role` field is defined as an enum that only accepts specific values:
```javascript
role: {
  type: DataTypes.ENUM('client', 'trainer', 'admin'),
  allowNull: false,
  defaultValue: 'client',
},
```

However, in the `authController.mjs` file, when creating a new user, the role was being set to 'user' which is not one of the allowed values:
```javascript
role: 'user', // default role
```

## Fix Applied
Changed the default role from 'user' to 'client' in the authController.mjs file:
```javascript
role: 'client', // changed from 'user' to 'client' to match enum values
```

This ensures that new users are created with a valid role value that matches one of the allowed enum values in the database.

## How to Test
1. Run the registration test script:
```bash
cd backend
npm run test-registration
```

2. Try to register a new user through the frontend:
   - Navigate to the signup page
   - Fill out the form with valid data
   - Submit the form

## Additional Diagnostic Tools
Several diagnostic tools were created to help troubleshoot server and registration issues:

1. **Server Status Check**:
```bash
cd backend
npm run check-server
```
This will check which port the server is running on and test basic endpoints.

2. **Multi-Port Registration Test**:
The test-registration script now tries multiple ports (3000, 5000, 8000, 10000) to find where the server is running.

3. **Health Check Endpoints**:
- `/api/health` - Basic API health check
- `/api/health/database` - Database connectivity check

## Production Considerations
When deploying to Render, remember that:
1. The PORT environment variable is already set to 5000
2. The role enum values must match across your database and application code

If you add more role types in the future, you'll need to update:
1. The enum definition in the User model
2. The database schema (requires migration)
3. Any references to the role values in your code
