# SwanStudios - Personal Training Platform 🦢

**A revolutionary digital ecosystem where gamified social engagement drives conversion to high-value personal training services.**

## 🚀 Project Overview

SwanStudios is a comprehensive fitness platform that combines:
- **AI-Powered Workout Generation** via the Olympian's Forge
- **Gamified Social Features** for community engagement  
- **Enterprise Stripe Analytics** for business intelligence
- **NASM-Certified Training Programs** for professional results
- **Real-Time Progress Tracking** and performance analytics

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 18 + Vite + TypeScript + Styled Components
- **Backend**: Node.js + Express + PostgreSQL + Redis
- **AI Services**: Private MCP Cloud with Python-based agents
- **Payment Processing**: Stripe with enterprise analytics
- **Deployment**: Render with automated CI/CD
- **Real-Time**: WebSocket integration for live updates

### Project Structure
```
SS-PT/
├── frontend/          # React application with Vite
├── backend/           # Node.js/Express API server
├── scripts/           # Deployment and utility scripts
├── public/            # Static assets and PWA configuration
├── .archive/          # Historical files (excluded from production)
└── docs/              # Project documentation
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+ and npm 8+
- Python 3.9+ for AI services
- PostgreSQL database
- Redis (for caching)

### Quick Start
\`\`\`bash
# Install dependencies
npm run install-all

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development environment
npm run start-dev
\`\`\`

### Available Scripts
- \`npm run start\` - Full development environment with all services
- \`npm run start-dev\` - Development without AI services
- \`npm run build\` - Production build
- \`npm run test\` - Run test suite
- \`npm run verify-production\` - Pre-deployment validation

## 📚 Key Features

### For Clients
- **AI Workout Generation** - Personalized routines via Olympian's Forge
- **Progress Tracking** - Comprehensive analytics and visualizations
- **Social Features** - Share achievements and get community support
- **Session Booking** - Easy scheduling with assigned trainers

### For Trainers  
- **Client Management** - Comprehensive dashboard for all assigned clients
- **Workout Logging** - Professional-grade exercise tracking
- **Progress Analysis** - Data-driven insights for program optimization
- **NASM Integration** - Evidence-based exercise prescription

### For Administrators
- **Business Intelligence** - Real-time revenue and user analytics
- **User Management** - Role-based access control
- **Payment Processing** - Stripe integration with manual fallbacks
- **System Monitoring** - Health checks and performance metrics

## 🔐 Security & Compliance

- **Zero-Trust Architecture** - All services authenticate independently
- **WCAG AA Compliance** - Accessible design for all users
- **Secure Payment Processing** - PCI-compliant Stripe integration
- **Environment Isolation** - Secrets managed via Render Environment Groups

## 📈 Analytics & Business Intelligence

### Real-Time Dashboards
- **Revenue Analytics** - Daily, weekly, monthly revenue tracking
- **User Funnel Analysis** - Conversion metrics from signup to payment
- **Trainer Performance** - Session completion and client satisfaction
- **System Health** - API response times and error rates

### Stripe Enterprise Integration
- **Customer Lifecycle Tracking** - From prospect to loyal customer
- **Payment Method Analytics** - Success rates by payment type
- **Churn Prevention** - Early warning system for at-risk clients
- **Revenue Forecasting** - Predictive analytics for business planning

## 🤖 AI & MCP Integration

### Private MCP Cloud
All AI services are internal and secure:
- **Olympian's Forge** - Workout generation with NASM principles
- **Gamification Engine** - Dynamic challenge and reward systems
- **Culinary Codex** - Nutrition planning and meal recommendations
- **Business Intelligence** - Automated insights and reporting

### Data Flow
\`\`\`
Client Request → API Gateway → MCP Agent → PostgreSQL → Response
                    ↓
                Analytics & Logging
\`\`\`

## 📱 Mobile & PWA Features

- **Progressive Web App** - Native-like experience on all devices
- **Offline Capability** - Core features work without internet
- **Push Notifications** - Workout reminders and social updates
- **Camera Integration** - Progress photos and form checking

## 🚀 Deployment

### Production Environment
- **Platform**: Render.com with PostgreSQL
- **Domain**: sswanstudios.com
- **CDN**: Integrated asset delivery
- **Monitoring**: Real-time health checks

### Deployment Process
\`\`\`bash
# Automated deployment on main branch push
git add .
git commit -m "feat: description of changes"
git push origin main
# Render automatically builds and deploys
\`\`\`

## 🧪 Testing & Quality

### Test Coverage
- **Unit Tests** - Core business logic
- **Integration Tests** - API endpoints and database
- **E2E Tests** - Critical user journeys
- **Performance Tests** - Load testing for peak usage

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Consistent code formatting
- **TypeScript** - Type safety and developer experience
- **Husky** - Pre-commit hooks for quality gates

## 📞 Support & Maintenance

### Monitoring
- **Health Checks** - Automated system monitoring
- **Error Tracking** - Comprehensive error logging
- **Performance Metrics** - Response time and throughput tracking
- **User Analytics** - Behavior and engagement analysis

### Backup & Recovery
- **Database Backups** - Daily automated PostgreSQL backups
- **Code Repository** - Git-based version control with branch protection
- **Environment Configuration** - Secure secrets management

## 🤝 Contributing

### Development Workflow
1. **Feature Branch** - Create branch from main
2. **Development** - Implement feature with tests  
3. **Code Review** - Peer review before merge
4. **Deployment** - Automatic deployment to production

### Coding Standards
- **TypeScript First** - Prefer TypeScript for new code
- **Functional Programming** - Pure functions where possible
- **Component Architecture** - Reusable, tested components
- **API Design** - RESTful endpoints with clear documentation

## 📄 License

Proprietary - SwanStudios Training Platform
All rights reserved.

---

**Built with ❤️ by The Swan Alchemist, Code Cartographer & Foundry Master**
