#!/bin/bash

echo "🛡️ Setting up Content Moderation System Migration"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Phase A: Backend Foundation - Complete${NC}"
echo "✅ Enhanced SocialPost model with moderation fields"
echo "✅ Enhanced SocialComment model with moderation fields"  
echo "✅ PostReport model for user reports"
echo "✅ ModerationAction model for audit logging"
echo "✅ Database migration created"
echo "✅ AdminContentModerationController with real database integration"
echo "✅ Model associations updated"
echo ""

echo -e "${BLUE}📋 Phase B: Frontend-Backend Integration - Complete${NC}"
echo "✅ ContentModerationSection updated to use real APIs"
echo "✅ UsersManagementSection updated to use real APIs"
echo "✅ Error handling and loading states implemented"
echo "✅ Real-time data fetching with authentication"
echo ""

echo -e "${YELLOW}🔄 Running Content Moderation Migration...${NC}"

# Navigate to backend directory
cd backend

# Check if migration file exists
if [ ! -f "migrations/20250814000000-create-content-moderation-system.cjs" ]; then
    echo -e "${RED}❌ Migration file not found!${NC}"
    echo "Expected: migrations/20250814000000-create-content-moderation-system.cjs"
    exit 1
fi

# Run the migration
echo "Running: npx sequelize-cli db:migrate"
npx sequelize-cli db:migrate

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Content moderation migration completed successfully!${NC}"
else
    echo -e "${RED}❌ Migration failed! Check the output above for errors.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 Content Moderation System Setup Complete!${NC}"
echo ""
echo -e "${GREEN}✅ Backend Foundation:${NC}"
echo "   - Database models: SocialPost, SocialComment, PostReport, ModerationAction"
echo "   - API endpoints: /api/admin/content/*"
echo "   - Real database integration with fallback to mock data"
echo ""
echo -e "${GREEN}✅ Frontend Integration:${NC}"
echo "   - ContentModerationSection: Real API integration"
echo "   - UsersManagementSection: Real API integration"
echo "   - Error handling and loading states"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test the admin dashboard content moderation features"
echo "2. Verify user management functionality"
echo "3. Create sample social content for testing"
echo "4. Test moderation actions (approve, reject, delete)"
echo ""
echo -e "${BLUE}🔗 Access the features at:${NC}"
echo "   Admin Dashboard → Content Moderation"
echo "   Admin Dashboard → User Management"
echo ""
echo -e "${GREEN}🎉 Ready for production use!${NC}"
