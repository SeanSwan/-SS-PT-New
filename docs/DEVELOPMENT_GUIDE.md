# Development Workflow Guide

## 🚀 Quick Start

### Initial Setup
\`\`\`bash
# Clone repository
git clone [repository-url]
cd SS-PT

# Install all dependencies
npm run install-all

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development
npm run start-dev
\`\`\`

## 📋 Development Scripts

### Core Development
- \`npm run start\` - Full environment with all AI services
- \`npm run start-dev\` - Development without AI services (recommended)
- \`npm run start-core\` - Core services only (backend + frontend)

### Building & Testing
- \`npm run build\` - Production build (frontend)
- \`npm run test\` - Run test suite
- \`npm run verify-production\` - Pre-deployment validation

### Database Operations
- \`npm run db:setup\` - Initialize database
- \`npm run db:migrate\` - Run migrations
- \`npm run db:seed\` - Seed with test data
- \`npm run db:reset\` - Reset database

### Deployment
- \`./deploy.sh\` (Linux/Mac) or \`deploy.bat\` (Windows) - Production deployment
- \`./deploy.sh --force\` - Skip pre-deployment tests (emergency only)

## 🔄 Development Workflow

### 1. Feature Development
\`\`\`bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and test locally
npm run start-dev

# Run tests before committing
npm run test

# Commit with conventional commits
git add .
git commit -m \"feat: add new feature description\"
\`\`\`

### 2. Code Review & Merge
\`\`\`bash
# Push feature branch
git push origin feature/your-feature-name

# Create pull request
# After review and approval, merge to main
git checkout main
git pull origin main
\`\`\`

### 3. Production Deployment
\`\`\`bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Deploy to production
./deploy.sh

# Monitor deployment
# Check Render dashboard and application logs
\`\`\`

## 🧪 Testing Strategy

### Test Types
1. **Unit Tests** - Individual function testing
2. **Integration Tests** - API endpoint testing
3. **E2E Tests** - Full user journey testing
4. **Build Tests** - Deployment validation

### Running Tests
\`\`\`bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# Full test suite
npm run test

# Test with coverage
npm run test:coverage
\`\`\`

## 🔧 Debugging

### Local Development Issues
\`\`\`bash
# Check all services status
npm run check-system-status

# Restart backend only
npm run restart-backend

# Clear cache and restart
npm run clear-cache-restart

# Check MCP health
npm run check-mcp-health
\`\`\`

### Database Issues
\`\`\`bash
# Reset database
npm run db:reset-complete

# Check database connection
npm run test-database

# Verify user creation
npm run verify-admin
\`\`\`

### Build Issues
\`\`\`bash
# Clean build
rm -rf frontend/dist frontend/node_modules/.cache
cd frontend && npm run build

# Check for syntax errors
npm run fix-all-syntax
\`\`\`

## 📁 File Organization

### Frontend Structure
\`\`\`
frontend/src/
├── components/          # Reusable React components
├── pages/              # Route-based page components
├── services/           # API calls and external services
├── utils/              # Helper functions and utilities
├── context/            # React context providers
├── hooks/              # Custom React hooks
├── assets/             # Static assets (images, fonts)
└── styles/             # Global styles and themes
\`\`\`

### Backend Structure
\`\`\`
backend/
├── controllers/        # Route handlers
├── models/            # Database models
├── routes/            # API route definitions
├── middleware/        # Express middleware
├── services/          # Business logic services
├── utils/             # Helper functions
├── migrations/        # Database migrations
└── tests/             # Backend tests
\`\`\`

## 🔐 Environment Configuration

### Required Environment Variables
\`\`\`env
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Authentication
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optional)
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password

# Application
NODE_ENV=development
PORT=8000
FRONTEND_URL=http://localhost:5173
\`\`\`

### Production Environment
- All secrets managed via Render Environment Groups
- Automatic SSL certificate management
- Database backups configured
- Error monitoring enabled

## 🚨 Emergency Procedures

### If Deployment Fails
1. Check Render dashboard for error logs
2. Verify all environment variables are set
3. Run local build test: \`npm run build\`
4. If needed, rollback via Render dashboard

### If Database Issues
1. Check connection: \`npm run test-database\`
2. Run migrations: \`npm run db:migrate\`
3. If corrupted, restore from backup

### If API Issues
1. Check backend logs in Render dashboard
2. Verify environment variables
3. Test local backend: \`npm run start-backend\`
4. Check database connectivity

## 📊 Monitoring & Analytics

### Production Monitoring
- **Render Dashboard** - Application health and logs
- **Database Metrics** - Query performance and connections
- **Stripe Dashboard** - Payment processing and analytics
- **Error Tracking** - Application error monitoring

### Key Metrics to Watch
- Response times (<500ms average)
- Error rates (<1% of requests)
- Database connection pool usage
- Memory and CPU utilization
- User engagement and conversion rates

## 🤝 Code Standards

### TypeScript
- Use TypeScript for all new frontend code
- Define interfaces for all data structures
- Enable strict mode in tsconfig.json

### React Components
- Use functional components with hooks
- Implement proper prop validation
- Follow component composition patterns

### API Design
- RESTful endpoint design
- Consistent error response format
- Proper HTTP status codes
- Input validation on all endpoints

### Database
- Use migrations for schema changes
- Index frequently queried columns
- Follow naming conventions
- Implement proper foreign key constraints

## 📚 Additional Resources

- [React Documentation](https://react.dev)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Render Documentation](https://render.com/docs)
