# Registration Troubleshooting Guide

This guide provides steps to diagnose and fix issues with the user registration functionality.

## Diagnostic Tools Created

We've created several tools to help diagnose the registration issue:

1. **Backend Test Script**: `scripts/test-registration.mjs` - Tests the registration endpoint directly.
2. **Simple Frontend Test Component**: `frontend/src/pages/SimpleSignupTest.component.tsx` - A minimal test UI.
3. **Enhanced Error Logging**: Added more detailed error logging in the AuthContext.

## Step 1: Run the Backend Test Script

This will help identify any server-side issues by bypassing the frontend:

```bash
# Make sure your backend server is running in a separate terminal
cd backend
npm run test-registration
```

### What to Look For:
- Error messages from the server
- Database errors
- Validation errors
- Stack traces

## Step 2: Test with Simplified Frontend Component

To test the registration process through the frontend API interface:

1. Add a route to the test component in your frontend router (App.jsx or similar):

```jsx
import SimpleSignupTest from './pages/SimpleSignupTest.component';

// Add this to your routes:
<Route path="/test-signup" element={<SimpleSignupTest />} />
```

2. Navigate to http://localhost:5173/test-signup
3. Click the "Test Registration" button
4. Check browser console and UI for errors

## Step 3: Check Server Logs

Monitor your backend server console for detailed error information:

```bash
# In the terminal where your backend is running
# Look for errors when registration requests are made
```

## Common Issues & Solutions

### 1. Database Connection Issues

**Symptoms**: 500 Internal Server Error, connection refused messages

**Solutions**:
- Verify database credentials in .env file
- Ensure PostgreSQL is running
- Check database logs

### 2. Model Validation Errors

**Symptoms**: 400 Bad Request with validation messages

**Solutions**:
- Ensure all required fields are provided in the correct format
- Check the validation rules in middleware/validationMiddleware.mjs
- Make sure the frontend form data matches backend expectations

### 3. Sequelize Model Constraints

**Symptoms**: Sequelize Error, unique constraint violations

**Solutions**:
- Try a different username/email if you get unique constraint errors
- Check the User model for any constraints

### 4. Transaction Errors

**Symptoms**: Transaction errors in logs, rollback messages

**Solutions**:
- Check the transaction handling in authController.mjs
- Look for any errors in the transaction

## Database Direct Check

If possible, check the database directly to see if users are being created:

```sql
SELECT * FROM users;
```

## Final Fix Checklist

Once you identify the issue, follow these steps:

1. Fix the identified problem (database, validation, model issues)
2. Test with both the backend script and frontend component
3. Verify that the fix works in the main signup form
4. Update documentation to reflect the changes made

## Emergency Fixes

If you need a temporary solution to get past registration:

1. Create users directly through the database or a script
2. Temporarily disable problematic validations
3. Create a simplified registration endpoint for testing

## Notes on Deployment

Remember to apply any fixes to both local development and the production environment when deploying to Render:

1. Update environment variables as needed
2. Ensure database migrations are run in production
3. Test registration in the production environment
