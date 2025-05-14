# SwanStudios Functionality Testing Guide

This guide helps you verify that core functionality works properly in your local environment before deploying to production.

## Prerequisites

1. Make sure your local PostgreSQL database is properly set up
2. Backend and frontend servers are running (`npm run start` from project root)
3. Database has been reset and seeded with initial data (`npm run db:reset` from backend directory)

## Test Cases

### 1. Admin Login

**Steps:**
1. Navigate to the login page
2. Enter admin credentials:
   - Username: `ogpswan` (or `admin`)
   - Password: `KlackKlack80` (or the password you've set during seeding)
3. Click "Login"

**Expected Result:**
- Admin should be logged in successfully
- Navigation should show admin-specific options
- User information should appear in the header/profile section

**If This Fails:**
- Check database to verify admin user exists with correct password hash
- Run `npm run verify-admin` to check admin user in database
- If needed, reset admin password with `npm run reset-password`

### 2. Storefront Display

**Steps:**
1. Navigate to `/store` or click "Store" in navigation
2. Wait for page to load

**Expected Result:**
- Storefront items should load and display correctly
- Each item should show name, description, price
- No console errors related to missing fields

**If This Fails:**
- Check if storefront items exist in database
- Run `npm run seed-storefront` to ensure items are seeded
- Check browser console for specific errors

### 3. Add to Cart (Admin)

**Steps:**
1. While logged in as admin, go to the storefront
2. Click "Add to Cart" on any item
3. View cart (click cart icon or navigate to cart page)

**Expected Result:**
- Item should be added to cart
- Cart icon should show updated count
- Cart page should display the item with correct details and price

**If This Fails:**
- Check browser console for errors
- Verify cart-related API calls in Network tab
- Ensure the database associations between cart and storefront items are working

### 4. User Signup

**Steps:**
1. Log out if currently logged in
2. Navigate to signup page
3. Fill in the registration form with test data:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `testuser@example.com`
   - Username: `testuser`
   - Password: `TestUser123!`
   - Other required fields
4. Click "Register" or "Sign Up"

**Expected Result:**
- New user should be created successfully
- User should be automatically logged in after registration
- Redirect to home page or dashboard

**If This Fails:**
- Check browser console for errors
- Check backend server logs for detailed error messages
- Verify database constraints and model validation rules
- Ensure the User model's password hashing hooks are working correctly

### 5. New User Login

**Steps:**
1. Log out if currently logged in
2. Navigate to login page
3. Enter credentials for the test user created in step 4
4. Click "Login"

**Expected Result:**
- User should be logged in successfully
- Navigation should show appropriate options for regular users
- User information should appear in the header/profile section

**If This Fails:**
- Check backend logs for authentication errors
- Verify JWT token generation and validation

### 6. Add to Cart (New User)

**Steps:**
1. While logged in as the test user, go to the storefront
2. Click "Add to Cart" on any item
3. View cart

**Expected Result:**
- Item should be added to cart
- Cart should be specific to this user (different from admin's cart)
- Cart should persist if user logs out and logs back in

**If This Fails:**
- Check user-to-cart relationship in database
- Verify cart API responses in Network tab

## Troubleshooting Common Issues

### Database Connection Issues

**Symptoms:**
- 500 errors when accessing API endpoints
- Backend console shows database connection errors

**Solutions:**
- Verify PostgreSQL is running
- Check database credentials in .env file
- Ensure database exists with correct name
- Run `npm run db:reset` to recreate database

### Password Hashing Issues

**Symptoms:**
- User registration works but login fails
- Admin login fails after resetting password

**Solutions:**
- Check User model's beforeCreate and beforeUpdate hooks
- Ensure passwords aren't being double-hashed
- Verify bcrypt is working correctly

### JWT Authentication Issues

**Symptoms:**
- Login succeeds but protected routes fail
- Constant redirects to login page
- "Invalid token" errors in console

**Solutions:**
- Check JWT_SECRET in .env file
- Verify token expiration settings
- Ensure authAxios is configured correctly in frontend

## Recording Test Results

Keep a record of test results for reference:

```
Test Date: [DATE]
Environment: Local / Test / Production

1. Admin Login: ✅/❌
2. Storefront Display: ✅/❌
3. Add to Cart (Admin): ✅/❌
4. User Signup: ✅/❌
5. New User Login: ✅/❌
6. Add to Cart (New User): ✅/❌

Notes:
- [Any specific observations]
- [Any workarounds applied]
```
