# Cart and Storefront 500 Error Resolution

This guide provides instructions to fix the 500 Internal Server Errors on the `/api/cart` and `/api/storefront` endpoints.

## Root Cause

The primary issue was a type mismatch between the User.id (UUID) and the ShoppingCart/StorefrontItem associations (INTEGER). This resulted in foreign key constraint errors when the APIs tried to access the database.

## Fix Steps

### 1. Reset the Database with Corrected Model Associations

The major issue has been corrected in the `setupAssociations.mjs` file where the User-ShoppingCart association now correctly uses UUID type for the foreign key.

```bash
# Run from the project root directory
npm run db:reset
```

This will drop and recreate all tables with the correct schema.

### 2. Seed the Database with Required Data

After resetting the database, you need to recreate the admin user and seed the storefront items:

```bash
# Create the admin user
npm run fix-admin

# Seed the storefront items 
npm run seed-storefront
```

### 3. Start the Application

```bash
npm start
```

## Testing

After applying these fixes, test the following functionality:

1. **Admin Login**: Use the credentials created by the `fix-admin` script
2. **Storefront Display**: Navigate to /store and verify items load correctly
3. **Add to Cart**: Add items to cart and verify they show up
4. **User Registration**: Test the signup process

## Technical Notes

- The core fix was changing the `userId` field type in ShoppingCart's association definition from INTEGER to UUID to match the User.id
- The ShoppingCart model definition also needed to be updated to use UUID
- The database needed to be reset to apply these changes
- No complex schema migration scripts were needed, just proper model definitions and associations

If you still encounter issues, check the backend server logs for specific error details.
