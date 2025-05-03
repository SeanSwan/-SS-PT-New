# Interactive Admin Password Reset Guide

This guide will help you resolve the 401 Unauthorized error when trying to log in to your application. The root cause of this issue is a password mismatch between what's stored in the database and what you're trying to use.

## Using the Interactive Password Reset Script

We've created an interactive script that lets you reset any user's password:

### Step 1: Run the Script

From the project root directory, run:

```bash
npm run reset-password
```

### Step 2: Follow the Interactive Prompts

The script will ask you:

1. **Username to reset**: Enter the admin username (either `admin` or `ogpswan` - whichever was created by your fix-admin script)
2. **New password**: Enter the password you want to use
3. **Confirm password**: Confirm the new password

### Step 3: Verify Success

When the script completes successfully, you'll see:

```
✅ Password for '[username]' successfully updated in the database!
--- Script Complete ---
```

## Troubleshooting Steps

If you're still experiencing login issues after resetting the password:

### 1. Verify User Existence

Make sure the admin user actually exists in the database. You may need to create one first:

```bash
npm run fix-admin
```

This will create or update the admin user, then run:

```bash
npm run reset-password
```

### 2. Database Reset (If Needed)

If you're still having issues, you might need to completely reset your database:

```bash
# Reset the database with the corrected models
npm run db:reset

# Create admin user
npm run fix-admin

# Reset admin password
npm run reset-password 

# Seed storefront items
npm run seed-storefront
```

### 3. Restart Your Servers

After successfully resetting the password:

```bash
# Start the backend (in one terminal)
npm run start-backend

# Start the frontend (in another terminal)
npm run start-frontend
```

## Testing the Login

Go to your application at http://localhost:5173 and attempt to log in with:
- **Username**: The username you provided to the reset script
- **Password**: The password you set in the reset script

## Additional Information

- The password is stored in the database as a bcrypt hash
- The interactive script ensures the hash is generated correctly
- This script can be used to reset any user's password, not just admins

If you continue to have issues, please check the backend console for detailed error messages while attempting to log in.
