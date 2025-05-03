# SwanStudios Production Deployment Guide

This guide provides instructions for deploying the SwanStudios application to Render and setting up the production environment correctly.

## Pre-Deployment Checklist

1. Verify all critical functionality works locally:
   - Admin login
   - User signup
   - Storefront display
   - Add to cart
   - Checkout process (if implemented)

2. Ensure all required environment variables are documented

3. Commit all changes to the `test` branch, then merge to `main` once ready for deployment

## Render Configuration

### PostgreSQL Database Service

1. Create a new PostgreSQL database in Render dashboard
2. Note the connection details (they'll be used automatically in your app via DATABASE_URL)

### Web Service (Backend)

1. Create a new Web Service in Render dashboard
2. Connect to your GitHub repository
3. Configure the following settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm run render-start`
   - **Environment Variables**:
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: [generate a secure random string]
     - `JWT_REFRESH_SECRET`: [generate a different secure random string]
     - `JWT_EXPIRES_IN`: `3h` (or your preferred token expiry)
     - `REFRESH_TOKEN_EXPIRES_IN`: `7d` (or your preferred refresh token expiry)
     - Add any other required variables (Stripe keys, SendGrid, etc.)
     - Do NOT manually add `DATABASE_URL` or `PORT` as Render injects these automatically

### Static Site (Frontend)

1. Create a new Static Site in Render dashboard
2. Connect to your GitHub repository
3. Configure the following settings:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Environment Variables**:
     - `VITE_API_URL`: [your backend service URL]

## Initial Database Setup

After your first successful deployment, you'll need to seed the production database with initial data. This is a one-time process that should be done via Render's Shell feature:

1. In the Render dashboard, go to your Web Service
2. Click on the "Shell" tab
3. Run the following commands to seed the database:

```bash
# Navigate to backend directory (if needed)
cd backend

# Create admin user
node scripts/create-admin-user.mjs

# Seed storefront items
node scripts/seed-storefront-items.mjs
```

## Ongoing Deployments

For future deployments:

1. The `render-start` script will automatically run migrations to keep the database schema up to date
2. You can update production data using the Render Shell as needed
3. Always test changes on the `test` branch before merging to `main` for deployment

## Troubleshooting

### Database Migration Issues

If migrations fail on Render:

1. Check the build logs for specific error messages
2. Connect to the Shell and inspect the database state
3. If necessary, manually run migrations through the Shell:
   ```bash
   cd backend
   npx sequelize-cli db:migrate --env production
   ```

### User Authentication Issues

If users can't log in or sign up:

1. Check that `JWT_SECRET` and `JWT_REFRESH_SECRET` are properly set
2. Verify that the database connection is working
3. Check the User model for any issues with password hashing

## Data Type Considerations

For a future update, consider converting price/currency fields from FLOAT to DECIMAL in the following files:

- StorefrontItem model
- Migration files
- Seeding scripts

This will prevent potential rounding issues with financial calculations in the production environment.
