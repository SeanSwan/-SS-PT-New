# SwanStudios Project Setup Guide

This guide will help you set up and run the SwanStudios project.

## Prerequisites

- Node.js (v16 or later)
- PostgreSQL (v12 or later)
- npm (comes with Node.js)

## Quick Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/swanstudios.git
cd swanstudios
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit the `.env` file and update the configuration settings, particularly:
- Database credentials
- JWT secrets
- Email/SMS configuration (if needed)
- Stripe API key (if needed)

### 3. Install dependencies

```bash
npm run install-all
```

This will install dependencies for both frontend and backend.

### 4. Set up the database

Make sure PostgreSQL is running, then:

```bash
npm run db:setup
```

This will:
- Run all database migrations
- Seed the database with:
  - Admin user (username: `admin`, password: `55555`)
  - Storefront items

### 5. Start the application

```bash
npm start
```

This will start both the frontend and backend servers.

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

## Verify Installation

1. Open http://localhost:5173 in your browser
2. Log in with:
   - Username: `admin`
   - Password: `55555`
3. You should see the admin dashboard

## Missing External Services

The application will start even if external service API keys are missing:

- Without **Stripe**: Payment features will be disabled, but checkout process will still work up to the payment step
- Without **SendGrid/Email**: Email notifications will be disabled
- Without **Twilio**: SMS notifications will be disabled

Check the server logs for messages about missing API keys.

## Troubleshooting

### Database Issues

If you encounter database issues, you can reset the database:

```bash
npm run db:reset
```

### Verifying Database Setup

To verify the database is properly set up:

```bash
cd backend
node scripts/verify-database.mjs
```

### Authentication Issues

If you have issues logging in with the admin account:
1. Check the backend logs for authentication errors
2. Ensure the database migrations ran successfully
3. Try resetting the database to recreate the admin user

## Next Steps

Once the setup is complete, you can:
1. Add more users with different roles
2. Create more storefront items
3. Test the checkout process
4. Customize the application settings

For more information about the MCP framework integration, see the Master Prompt documentation.
