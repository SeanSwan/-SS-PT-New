# Login Authentication Fix Guide

This guide provides instructions to solve the 401 Unauthorized error you're experiencing when trying to log in.

## Root Cause

The primary issue is a password mismatch between what you're entering in the login form and what's stored (hashed) in the database. This happened because after resetting the database and creating the admin user, the stored password isn't what you expect.

## Fix Steps

### 1. Reset the Admin Password

We've created a script to reset the admin password to a simple, known value:

```bash
# Run from the project root directory
npm run reset-admin-password
```

This script will:
- Find all users with 'admin' role in the database
- Reset their passwords to `admin123`
- Print the usernames and new password

### 2. Use the Debug Route to Verify Passwords

If the reset script doesn't fix the issue, we've added a debug route to verify passwords directly:

```
POST http://localhost:5000/api/debug/verify-password
```

With JSON body:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

You can use tools like Postman, Insomnia, or even your browser's developer console to test this endpoint.

### 3. Check for Existing Users

To see what users exist in the database, use:

```
POST http://localhost:5000/api/debug/check-user
```

With JSON body:
```json
{
  "username": "admin"
}
```

Replace "admin" with whatever username you're trying to check. This will tell you if the user exists and show its role.

## Common Troubleshooting Steps

1. **Double-check the username**: Make sure you're using the exact username that exists in the database (case-sensitive).

2. **Careful password entry**: When testing, type the password carefully, watching for typos, caps lock, or extra spaces.

3. **Backend logs**: Monitor the backend console for detailed error messages.

4. **Multiple admin users**: If you've run multiple user creation scripts, you might have several admin users. The reset-admin-password script will reset all of them.

## If Problems Persist

If you still can't log in after these steps:

1. Stop the backend server
2. Run the database reset: `npm run db:reset`
3. Create a fresh admin user: `npm run fix-admin`
4. Reset the admin password: `npm run reset-admin-password`
5. Seed the storefront items: `npm run seed-storefront`
6. Restart the backend server: `npm run start-backend`
7. Start the frontend in another terminal: `npm run start-frontend`
8. Log in using the credentials from the reset-admin-password script

## Advanced Testing

For advanced debugging with the console:

```javascript
// Check if a user exists
fetch('http://localhost:5000/api/debug/check-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin' })
}).then(r => r.json()).then(console.log)

// Verify a password
fetch('http://localhost:5000/api/debug/verify-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
}).then(r => r.json()).then(console.log)

// Test login directly
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
}).then(r => r.json()).then(console.log)
```

Copy and paste these into your browser console to test the authentication endpoints directly.
