# SwanStudios Production Deployment Guide

This guide provides step-by-step instructions for deploying the SwanStudios application to Render.

## Step 1: Prepare Your Environment Variables

1. Open the `production-env.example` file in this directory
2. Create secure values for all secret keys (JWT_SECRET, JWT_REFRESH_SECRET, ADMIN_PASSWORD)
3. Set appropriate values for frontend URLs and email/Stripe configurations

## Step 2: Create Render Services

### Create PostgreSQL Database

1. Log in to your Render dashboard at https://dashboard.render.com
2. Navigate to "New +" → "PostgreSQL"
3. Configure the database:
   - Name: `swanstudios-postgres`
   - Database: `swanstudios`
   - User: Render will generate this
   - Region: Choose the closest to your users
   - Plan: Choose appropriate plan (Standard recommended for production)
4. Click "Create Database"
5. Note down the "Internal Database URL" from the database info page

### Create MongoDB Database

1. Navigate to "New +" → "MongoDB"
2. Configure the database:
   - Name: `swanstudios-mongodb`
   - Region: Choose the closest to your users
   - Plan: Choose appropriate plan (Standard recommended for production)
3. Click "Create Database"
4. Note down the "Internal Connection String" from the database info page

### Create Web Service

1. Navigate to "New +" → "Web Service"
2. Connect to your GitHub repository
3. Configure the service:
   - Name: `swanstudios-app`
   - Branch: `main` (or your production branch)
   - Root Directory: Leave blank
   - Runtime: `Node`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run render-start`
   - Plan: Choose appropriate plan (minimum Standard for production)
   - Advanced: Add Health Check Path as `/health`
4. Click "Create Web Service"

## Step 3: Configure Environment Variables

1. After creating the web service, go to the "Environment" tab
2. Add all variables from your prepared environment variables list
3. Make sure to add:
   - `DATABASE_URL`: Use the "Internal Database URL" from your PostgreSQL database
   - `MONGO_URI`: Use the "Internal Connection String" from your MongoDB database
   - All other variables from the `production-env.example` file
4. Click "Save Changes"

## Step 4: Initial Database Setup

After the first deployment is complete:

1. Go to your web service "Shell" tab
2. Run the following commands to set up your database:

```bash
# Ensure migrations have run
cd backend && npx sequelize-cli db:migrate --env production

# Seed initial admin user (if needed)
node scripts/create-admin-user.mjs

# Seed storefront items (if needed)
node scripts/seed-storefront-items.mjs
```

## Step 5: Verify Deployment

1. Go to your web service dashboard
2. Click the service URL to visit your deployed application
3. Check that you can:
   - Access the homepage
   - Register a new user
   - Log in as admin
   - View storefront items
   - Complete the checkout process

## Step 6: Monitoring and Maintenance

1. Set up Render's monitoring to track service health
2. Check logs regularly for any errors
3. Maintain database backups (automatic with Render's managed databases)

## Troubleshooting

### Database Connection Issues

- Verify environment variables are correctly set
- Check Render logs for connection errors
- Try manually connecting to the database using the Render Shell

### Server Startup Failures

- Check logs for specific error messages
- Verify the `render-start.sh` script has execute permissions
- Test startup commands manually in the Shell

## Security Checklist

- [x] Environment variables secured (no hardcoded secrets)
- [x] JWT secrets are strong and unique
- [x] CORS configuration limits access to known domains
- [x] Database connections use SSL in production
- [x] Admin password is secure
