# Emergency Login Fix Guide

This guide provides a direct solution to the 401 Unauthorized error you're experiencing when trying to log in. We've created powerful emergency tools to fix persistent authentication issues.

## Quick Fix (Recommended)

### Step 1: Run the Emergency Fix Script

This script will directly update the database, bypassing all model hooks and validation:

```bash
# Run from the project root directory
npm run emergency-fix
```

This script will:
1. Find your admin user (either 'ogpswan' or 'admin')
2. Generate a secure password hash for 'password123'
3. Directly update the database with the new hash
4. Display your login credentials

### Step 2: Login with the Provided Credentials

After running the emergency fix script, you'll see login credentials displayed in the console. Use those credentials to log in:

- Username: ogpswan (or admin)
- Password: password123

## Verification & Troubleshooting

If you still encounter issues, we've provided a verification tool:

### Verify User Password

```bash
# Run from the project root directory
npm run verify-password
```

This interactive script will:
1. Prompt you for a username
2. Prompt you for a password
3. Check if the password matches the hash in the database
4. Show detailed information about the hash if it doesn't match

### Complete Reset Process

If all else fails, try a complete reset:

```bash
# Reset the database with corrected models
npm run db:reset

# Create admin user
npm run fix-admin

# Apply emergency fix directly to the database
npm run emergency-fix

# Seed storefront items
npm run seed-storefront
```

## Technical Details

These scripts work by:
1. Connecting directly to the database
2. Using SQL queries instead of Sequelize models
3. Updating the password hash directly in the users table
4. Bypassing the User model's hooks and validation 

This approach ensures that any issues with the model hooks or validation won't interfere with setting the password correctly.

## Database Connection Information

If the scripts report connection issues, verify your database connection settings in:
- `.env` file at the project root
- `backend/database.mjs` configuration

## If Problems Persist

If none of these solutions work, check:
1. The backend logs during login attempts for detailed error messages
2. Confirm PostgreSQL is running
3. Verify network connectivity between your application and database
4. Check for firewall rules blocking database connections

## After Successful Login

Once you can log in successfully, you may want to change your password to something more secure through the application's user interface.
