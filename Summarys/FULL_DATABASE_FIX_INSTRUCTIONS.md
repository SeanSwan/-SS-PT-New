# Complete Database Schema Fix Instructions

This guide provides comprehensive instructions to fix database schema issues, particularly the 500 Internal Server errors related to foreign key constraints.

## Root Cause

The core issue identified is a type mismatch between the User.id (which is UUID) and the foreign key references to it in other models (which were incorrectly defined as INTEGER). This caused PostgreSQL to reject the foreign key constraints during table creation.

## Fixes Applied

We have fixed the following issues:

1. **Session Model**: Updated userId, trainerId, and cancelledBy fields from INTEGER to UUID
2. **Orientation Model**: Updated userId field from INTEGER to UUID
3. **Contact Model**: Added an explicit userId field as UUID
4. **AdminSettings Model**: Added an explicit userId field as UUID
5. **setupAssociations.mjs**: Updated all association definitions that reference User.id to use DataTypes.UUID instead of DataTypes.INTEGER

## How to Apply the Fix

### 1. Reset the Database Schema

Run the database reset script to recreate all tables with the corrected schema:

```bash
# Run from the project root directory
npm run db:reset
```

### 2. Seed the Database

After the schema is reset, you need to recreate the admin user and seed the required data:

```bash
# Create the admin user
npm run fix-admin

# Seed the storefront items
npm run seed-storefront
```

### 3. Restart the Backend Server

```bash
npm run start-backend
```

### 4. Test the Application

With the backend running, start the frontend in another terminal:

```bash
npm run start-frontend
```

Test the following functionality:

1. **Admin Login**: Use the credentials created by the fix-admin script
2. **Storefront Display**: Navigate to /store and verify items load correctly
3. **Add to Cart**: Add items to cart and verify they show up
4. **User Registration**: Test the signup process

## Technical Details

The key issue was that Sequelize's sync() operation tries to create the foreign key constraints in the database based on the association definitions and model field types. When there was a mismatch between:

- User.id (defined as UUID)
- Foreign keys referencing User.id (defined as INTEGER)

PostgreSQL correctly rejected the constraint with the error:
```
foreign key constraint "sessions_userId_fkey" cannot be implemented
```

By aligning all foreign key types with their referenced primary key types, we ensure database integrity and proper constraint creation.

## Verification

After running the fix, you should see all tables created successfully without foreign key constraint errors. The backend logs should show:

```
✅ Database reset successfully. All tables have been recreated.
```

If you encounter any additional issues, check the backend server logs for specific error details.
