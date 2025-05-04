# Adding 'user' Role to SwanStudios Application

## The Issue

Your application needs a 'user' role for social media users, but your database schema's enum only allows 'client', 'trainer', and 'admin' roles.

## Solution

We need to update both the User model and the database schema to include 'user' as a valid role value.

### Changes Made:

1. **Updated User Model**:
   ```javascript
   // Role - now supports user, client, trainer, and admin
   role: {
     type: DataTypes.ENUM('user', 'client', 'trainer', 'admin'),
     allowNull: false,
     defaultValue: 'client',
   }
   ```

2. **Set Default Role in Auth Controller**:
   ```javascript
   role: 'user', // default role for social media users
   ```

3. **Created Role Update Scripts**:
   - `add-user-role.mjs`: Simple script to add 'user' to the enum
   - `manual-update-role-enum.mjs`: More comprehensive script for when data exists

## Implementation Steps

### 1. Update the Database Schema

PostgreSQL enums are special - they need to be updated at the database level. Run one of the scripts:

```bash
# Try the simple method first:
npm run add-user-role

# If that fails, use the manual method:
npm run update-role-enum
```

### 2. Restart Your Server

```bash
npm run start-backend
```

### 3. Test User Registration

```bash
npm run test-registration
```

## Technical Details

### The Simple Method

This attempts to add the 'user' value to the existing enum:

```sql
ALTER TYPE "enum_users_role" ADD VALUE 'user'
```

This only works if:
- The enum is not used in any default constraint
- There's no transaction with the enum type cached

### The Manual Method

This is more involved but always works:
1. Create a new enum type with all values
2. Add a new column with the new enum type
3. Copy data from old column to new column
4. Drop old column
5. Rename new column to match original name

## Database Considerations for Production

When deploying to Render:

1. **When applying the first time**:
   - Use the db:reset script to create tables with the correct enum

2. **When updating an existing deployment**:
   - Run the migration scripts on the production database
   - Be careful with data migration

## Future Role Changes

If you need to add more roles in the future:

1. Update the User model
2. Create a similar migration script
3. Update any role-based logic in your application

## Troubleshooting

If you encounter issues:

- Check PostgreSQL logs
- Verify the current enum values:
  ```sql
  SELECT e.enumlabel
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'enum_users_role'
  ```
- Ensure all instances of the app are using the updated model
