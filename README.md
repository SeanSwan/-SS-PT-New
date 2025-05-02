# SwanStudios

A comprehensive fitness application platform built with Node.js, React, and PostgreSQL.

## Project Structure

This project is a monorepo using npm workspaces with the following structure:

- `backend/` - Node.js Express API server
- `frontend/` - React front-end application
- `scripts/` - Helper scripts for development and deployment

## Prerequisites

- Node.js (v16+)
- npm (v7+)
- PostgreSQL (v12+)
- Git

## Quick Start

The easiest way to get started is to use the automated setup script:

```bash
# Clone the repository (if you haven't already)
git clone <repository-url>
cd SS-PT

# Run the automated setup script (works on both Windows and Unix-based systems)
npm run setup
```

This will:
1. Create a `.env` file from the example template
2. Install all dependencies
3. Set up the database, run migrations, and seed initial data
4. Provide login credentials for the admin user

## Manual Setup

If you prefer to set up manually, follow these steps:

### 1. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your database credentials and other settings
nano .env  # or use your preferred editor
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 3. Database Setup

```bash
# Run migrations and seed data
npm run db:migrate
npm run db:seed
```

### 4. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run start

# Or start with automatic database setup
npm run start-with-db
```

## Available Scripts

### Root Scripts

- `npm run start` - Start both frontend and backend
- `npm run start-with-db` - Start with automatic database setup
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Run database seeders
- `npm run db:setup` - Run migrations and seeders
- `npm run db:reset` - Reset the database and run migrations/seeders
- `npm run install-all` - Install all dependencies
- `npm run build` - Build the frontend for production

### Backend Scripts

- `cd backend && npm run dev` - Start backend in development mode
- `cd backend && npm run dev:with-migrations` - Start backend with migrations
- `cd backend && npm run db:reset-manual` - Reset database using custom script

### Frontend Scripts

- `cd frontend && npm run dev` - Start frontend in development mode
- `cd frontend && npm run build` - Build for production

## Admin Access

After setup, you can log in with the following credentials:

- **Username:** admin
- **Password:** 55555

## Features

- User authentication (JWT with refresh tokens)
- Role-based access control (admin, trainer, client)
- Storefront with product listings
- Shopping cart functionality
- Payment processing (via Stripe)
- Email notifications (via SendGrid or Nodemailer)
- SMS notifications (via Twilio)

## API Access Requirements

The application uses several external APIs that require keys:

- **Stripe** - For payment processing
- **SendGrid** - For email notifications
- **Twilio** - For SMS notifications

However, the application is designed to function properly even when these API keys are not available. Features dependent on missing API keys will be automatically disabled with clear error messages.

## Development Notes

- API endpoints are under `/api/`
- Authentication is handled via JWT tokens
- Database models use Sequelize ORM

## Troubleshooting

### Database Issues

If you encounter database problems, try resetting the database:

```bash
cd backend
npm run db:reset-manual
```

### API Key Issues

If features like payments or notifications aren't working, check your `.env` file for the required API keys. The application logs which features are disabled due to missing keys during startup.

## Production Deployment

For production deployment on Render:

1. Ensure `DATABASE_URL` is configured in the environment variables
2. Set `NODE_ENV=production`
3. Set all required API keys
4. Build the frontend with `npm run build`
5. Start the server with `npm start`

## Security Considerations

- JWT secrets and API keys should be stored securely
- The application uses HTTPS in production
- Password hashing is handled by bcrypt
- Rate limiting is implemented for sensitive endpoints

## License

This project is licensed under the ISC License.
