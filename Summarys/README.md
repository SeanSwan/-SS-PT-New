# SwanStudios - Personal Training Platform

## Setup and Running

### Prerequisites

- Node.js and npm
- PostgreSQL
- MongoDB (configured to run on port 5001)

### Installing Dependencies

```bash
# Install all dependencies (frontend and backend)
npm run install-all
```

### Starting the Application

The application uses both PostgreSQL and MongoDB databases. MongoDB is used for workout tracking, while PostgreSQL is used for the main application data.

```bash
# Start the complete application (including MongoDB)
npm start
```

This command will:
1. Start MongoDB on port 5001
2. Start the frontend server
3. Start the backend server with MongoDB connection check

### Alternative Start Commands

```bash
# Start MongoDB separately
npm run start-mongodb

# Start just the frontend and backend (assuming MongoDB is already running)
npm run start-frontend
npm run start-backend
```

## Database Management

```bash
# Run PostgreSQL migrations
npm run db:migrate

# Seed the database with initial data
npm run db:seed

# Set up the database (migrations + seed)
npm run db:setup

# Reset the database
npm run db:reset

# Seed the storefront with products
npm run seed-storefront
```

## Admin User

The default admin credentials are:
- Username: ogpswan
- Password: Password123!

To ensure the admin user exists:
```bash
npm run force-create-admin
```

## Deployment to Render

This project includes a `render.yaml` configuration file for deploying to Render.com.

The deployment automatically sets up:
1. The main web service
2. A PostgreSQL database
3. A MongoDB database

### Environment Variables

Make sure to set up the following environment variables in Render:
- `JWT_SECRET` (for authentication)
- `ADMIN_PASSWORD` (for the admin user)

Other environment variables are configured in the `render.yaml` file.

## Development Notes

### MongoDB Configuration

The application is configured to use MongoDB on port 5001 instead of the default port 27017. This is to avoid conflicts with other MongoDB instances that might be running on your system.

If you need to change the MongoDB port, update the following files:
- `.env` - Update MONGO_URI
- `backend/mongodb-connect.mjs` - Update the default connection URI
- `package.json` - Update the start-mongodb script

### Adding New Features

1. Create backend routes in `backend/routes/`
2. Implement controllers in `backend/controllers/`
3. Create frontend components in `frontend/src/components/`
4. Update the frontend routes in `frontend/src/App.jsx`
