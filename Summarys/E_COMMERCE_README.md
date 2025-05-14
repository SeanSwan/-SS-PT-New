# 🛍️ SwanStudios E-Commerce Database Integration

## 📋 Overview

This update migrates the SwanStudios e-commerce system from hard-coded packages to a database-driven solution while preserving the exact styling and functionality of the original StoreFront component.

## ✅ What's Included

### 1. Database Seeder
- **File**: `/backend/seeders/20241212000001-storefront-packages.cjs`
- **Purpose**: Populates database with your 7 original packages
- **Packages**:
  - **Fixed**: Gold Glimmer (8 sessions), Platinum Pulse (20 sessions), Rhodium Rise (50 sessions)
  - **Monthly**: Silver Storm (3 months), Gold Grandeur (6 months), Platinum Prestige (9 months), Rhodium Reign (12 months)

### 2. API-Based StoreFront
- **File**: `/frontend/src/pages/shop/StoreFrontAPI.component.tsx`
- **Features**:
  - Fetches packages from database API
  - Preserves all original styling and animations
  - Maintains cosmic, ruby, emerald, and purple themes
  - Handles loading and error states gracefully

### 3. Admin Management System
- **API Routes**: `/backend/routes/adminPackageRoutes.mjs`
- **Endpoints**:
  ```
  GET    /api/admin/storefront      # Get all packages for admin
  POST   /api/admin/storefront      # Create new package
  PUT    /api/admin/storefront/:id  # Update package
  DELETE /api/admin/storefront/:id  # Delete package
  GET    /api/admin/storefront/:id  # Get single package for editing
  ```
- **Admin Dashboard**: Updated to use new API endpoints

## 🚀 Setup Instructions

### Step 1: Run Database Seeder
```bash
# Option 1: Using npm
npm run db:seed -- --seed 20241212000001-storefront-packages.cjs

# Option 2: Using batch file
.\run-package-seeder.bat
```

### Step 2: Update StoreFront Component
```bash
# Using batch file (recommended)
.\update-storefront.bat

# Manual update
cp frontend\src\pages\shop\StoreFrontAPI.component.tsx frontend\src\pages\shop\StoreFront.component.tsx
```

### Step 3: Start Servers
```bash
# Start backend
npm run dev

# Start frontend (in separate terminal)
cd frontend
npm start
```

## 🔧 Header Navigation

The header navigation is already correctly configured to link to `/store`, which will now display the API-based component with database-driven packages.

## 📱 Features Preserved

### Visual Design
- ✅ All original animations (shimmer, float, pulse)
- ✅ Theme colors (cosmic, ruby, emerald, purple)
- ✅ Card hover effects and transitions
- ✅ Price reveal animations
- ✅ Mobile responsiveness

### Functionality
- ✅ Role-based price visibility
- ✅ Add to cart functionality
- ✅ Cart management
- ✅ Checkout process

## 🛠️ Admin Dashboard Features

### Package Management
1. **View All Packages**: See all packages with active/inactive status
2. **Create New Packages**: Add custom packages with themes
3. **Edit Packages**: Modify pricing, sessions, descriptions
4. **Delete Packages**: Remove unwanted packages
5. **Send Special Offers**: Send discounted offers to clients

### Package Fields
- Name, Description
- Package Type (fixed/monthly)
- Price per Session
- Number of Sessions (fixed) or Months/Sessions per Week (monthly)
- Theme (cosmic, ruby, emerald, purple)
- Active/Inactive status

## 🔒 Security & Permissions

- All admin routes require authentication
- Admin role verification for management operations
- Protected API endpoints with proper middleware

## 🐛 Troubleshooting

### Common Issues

1. **Packages not displaying**:
   - Ensure database seeder was run successfully
   - Check backend server is running and connected to database

2. **Admin can't edit packages**:
   - Verify user has admin role
   - Check browser console for API errors

3. **Cart not working**:
   - Ensure user is logged in as client
   - Check cart context is properly initialized

### Debug Steps
1. Check browser console for errors
2. Verify backend API responses
3. Ensure proper authentication tokens
4. Test with different user roles

## 📊 Database Schema

The packages are stored in the `storefront_items` table with the following structure:
- id (primary key)
- name, description
- packageType (fixed/monthly)
- pricePerSession, sessions
- months, sessionsPerWeek, totalSessions
- totalCost, price, displayPrice
- theme, isActive
- createdAt, updatedAt

## 🎯 Next Steps

### Potential Enhancements
1. **Product Categories**: Add apparel and supplements
2. **Image Management**: Upload and manage package images
3. **Inventory Tracking**: Track session usage
4. **Analytics**: Package purchase statistics
5. **Bulk Operations**: Mass edit multiple packages

## 💾 Backup & Recovery

- Original StoreFront component is backed up as `.backup`
- Database seeder can be re-run safely
- No data loss during updates

## 🤝 Support

For issues or questions:
1. Check this README first
2. Review console errors
3. Test with debug routes
4. Contact development team
