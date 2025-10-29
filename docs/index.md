# SwanStudios Documentation

Welcome to the SwanStudios project documentation. This index provides quick access to all project documentation, organized by relevance and purpose.

---

## Current Documentation

Active documentation for the current state of the SwanStudios application.

### Architecture & Patterns

- **[Current Architecture Summary](current/CURRENT_ARCHITECTURE.md)** - High-level overview of the SwanStudios tech stack and architecture
- **[Golden Standard Pattern](current/GOLDEN-STANDARD-PATTERN.md)** - Template for UI Kit compound component development and V2 file refactoring
- **[UI Kit Migration Guide](current/UI-KIT-MIGRATION-GUIDE.md)** - Developer reference for migrating components from MUI to the custom UI Kit

### Design System

- **[Galaxy-Swan Theme Documentation](current/GALAXY-SWAN-THEME-DOCS.md)** - Complete design system documentation including color palette, design philosophy, and accessibility guidelines
- **[Implementation Status](current/IMPLEMENTATION_STATUS.md)** - Current theme system implementation details and performance optimizations
- **[Glow Button Refactor](current/GLOW-BUTTON-REFACTOR-COMPLETE.md)** - Current button system implementation and color hierarchy

### UI Kit Components

- **[Phase 2 Complete](current/PHASE-2-COMPLETE.md)** - UI Kit compound components completion: Table, Pagination, Badge, EmptyState, Container, Animations

### Dashboard Architecture

- **[Dashboard Revolution](current/DASHBOARD_REVOLUTION_DOCUMENTATION.md)** - Full space utilization revolution and Digital Alchemist design philosophy
- **[Gamification Dashboard Optimization](current/GAMIFICATION_DASHBOARD_OPTIMIZATION_COMPLETE.md)** - Animation fixes, import optimization, and performance improvements
- **[Trainer Dashboard Optimization](current/TRAINER_DASHBOARD_OPTIMIZATION_COMPLETE.md)** - Modular architecture transformation (600+ line monolithic → 5 focused components)
- **[User Dashboard Optimization](current/USER_DASHBOARD_OPTIMIZATION_COMPLETE.md)** - Complete refactoring documentation (1500+ line component → modular architecture)

### Backend - MCP Servers

- **[MCP Financial Events Implementation](current/MCP_FINANCIAL_EVENTS_IMPLEMENTATION.md)** - Financial Events MCP server implementation with gamification integration
- **[MCP Financial Events API](current/MCP_FINANCIAL_EVENTS_API.md)** - API endpoint specifications and webhook handling
- **[MCP Financial Events Testing](current/MCP_FINANCIAL_EVENTS_TESTING.md)** - Test cases, mock data, and integration testing procedures

---

## Archived Documentation

Historical documentation preserved for reference. These documents describe past implementations, completed migrations, or superseded patterns.

### Legacy SPA Era

- **[Admin Dashboard Restored](archive/ADMIN_DASHBOARD_RESTORED.md)** - Historical admin dashboard restoration work
- **[Syntax Fixes Applied](archive/SYNTAX_FIXES_APPLIED.md)** - One-time syntax error fixes during transition period
- **[Authentication Fixes Applied](archive/AUTHENTICATION_FIXES_APPLIED.md)** - Legacy authentication system fixes
- **[Header Imports Audit](archive/HEADER-IMPORTS-LINKS-AUDIT-COMPLETE.md)** - Comprehensive header imports verification (completed)

### Backend Legacy

- **[Master Prompt V26 Implementation](archive/MASTER_PROMPT_V26_IMPLEMENTATION_SUMMARY.md)** - Historical backend implementation summary
- **[Master Prompt V26 API](archive/MASTER_PROMPT_V26_API.md)** - Legacy API documentation
- **[Workout MCP Refactoring](archive/WORKOUT_MCP_REFACTORING.md)** - Historical MCP refactoring work
- **[MCP Import Fixes Summary](archive/MCP_IMPORT_FIXES_SUMMARY.md)** - Legacy import resolution fixes
- **[MCP Import Fixes Final V2](archive/MCP_IMPORT_FIXES_FINAL_V2.md)** - Final iteration of import fixes
- **[MCP Dependencies Fix](archive/MCP_DEPENDENCIES_FIX.md)** - Historical dependency resolution
- **[MCP Import Fixes Final](archive/MCP_IMPORT_FIXES_FINAL.md)** - Earlier import fix iteration

### Component Evolution

- **[Cleanup Documentation](archive/CLEANUP_DOCUMENTATION.md)** - Production readiness cleanup procedures
- **[Client Dashboard Revolution](archive/CLIENT_DASHBOARD_REVOLUTION.md)** - Historical client dashboard transformation
- **[Connection Fix Complete](archive/CONNECTION_FIX_COMPLETE.md)** - WebSocket connection fixes
- **[Dashboard Fix](archive/DASHBOARD_FIX.md)** - Early dashboard issue resolutions
- **[Enhancement Complete](archive/ENHANCEMENT_COMPLETE.md)** - Historical enhancement work
- **[WebSocket Config](archive/WEBSOCKET_CONFIG.md)** - Legacy WebSocket configuration
- **[Icon Export Fix](archive/ICON_EXPORT_FIX.md)** - Admin dashboard icon export resolution
- **[Duplicate Import Fix](archive/DUPLICATE_IMPORT_FIX.md)** - Import duplication cleanup
- **[Import Verification](archive/IMPORT_VERIFICATION.md)** - Import path verification work
- **[Admin Sessions Optimization](archive/ADMIN_SESSIONS_OPTIMIZATION_COMPLETE.md)** - Historical sessions page optimization
- **[Schedule Accessibility Improvements](archive/ACCESSIBILITY_IMPROVEMENTS.md)** - Schedule component accessibility work
- **[Schedule Enhancement Summary](archive/ENHANCEMENT_SUMMARY.md)** - Schedule component enhancements
- **[Shop Cleanup Documentation](archive/SHOP_CLEANUP_DOCUMENTATION.md)** - Shop component cleanup work
- **[Workout Testing](archive/TESTING.md)** - Workout page testing documentation
- **[Workout Accessibility](archive/ACCESSIBILITY.md)** - Workout page accessibility work

### Additional Historical Documentation

For comprehensive historical documentation including deployment guides, fix summaries, and production deployment records, see:
- **[scripts/archived_documentation/](../scripts/archived_documentation/)** - Complete archive of deployment guides, authentication fixes, and production documentation

---

## Component-Specific README Files

Component and module READMEs remain in their respective directories for contextual reference:

### Frontend
- [Frontend Root README](../frontend/README.md) - Vite setup and project structure
- [Source README](../frontend/src/README.md) - Source directory structure
- [Client Dashboard README](../frontend/src/components/ClientDashboard/README.md) - Client dashboard implementation
- [Admin Dashboard README](../frontend/src/components/DashBoard/Pages/admin-dashboard/README.md) - Admin dashboard architecture
- [Schedule README](../frontend/src/components/Schedule/README.md) - Schedule component guide
- [DevTools README](../frontend/src/components/DevTools/README.md) - Development tools documentation
- [Workout Page README](../frontend/src/pages/workout/README.md) - Workout page implementation
- [MCP Frontend README](../frontend/src/mcp/README.md) - Frontend MCP integration
- [MCP Services README](../frontend/src/services/mcp/README.md) - MCP service layer
- [MCP Types README](../frontend/src/types/mcp/README.md) - MCP TypeScript types

### Backend
- [MCP Server README](../backend/mcp_server/README.md) - MCP servers overview and setup
- [Gamification MCP README](../backend/mcp_server/gamification_mcp_server/README.md) - Gamification server documentation
- [Workout MCP README](../backend/mcp_server/workout_mcp_server/README.md) - Workout server documentation
- [YOLO MCP README](../backend/mcp_server/yolo_mcp_server/README.md) - YOLO detection server documentation
- [Backup Scripts README](../backend/scripts/backup/README.md) - Database backup procedures
- [Seeders Backup README](../backend/seeders/backup/README.md) - Seeder backup documentation

---

---

## Development & Deployment Guides

Essential guides for development workflow and production deployment.

### Development
- **[Development Guide](DEVELOPMENT_GUIDE.md)** - Complete development workflow, scripts, testing, and debugging procedures

### Deployment
- **[Deployment Checklist (Stripe & Analytics)](deployment/DEPLOYMENT_CHECKLIST_REAL_STRIPE_ANALYTICS.md)** - Production deployment checklist with Stripe and analytics verification
- **[Deployment Commands](deployment/DEPLOYMENT_COMMANDS.md)** - Quick reference for deployment commands

### Testing & Verification
- **[Mobile PWA Testing Guide](guides/MOBILE_PWA_TESTING_GUIDE.md)** - Progressive Web App testing procedures
- **[Stripe Data Verification Guide](guides/STRIPE_DATA_VERIFICATION_GUIDE.md)** - Stripe integration testing and verification

---

## 🤖 AI Workflow System

The structured, multi-AI collaborative development process for SwanStudios. This system enforces a "design-first" methodology with a mandatory **Phase 0 (Design Consensus)** followed by a **7-checkpoint code approval pipeline**.

### 🚫 Golden Rule: No Code Before Design Approval

- **AI Workflow Quick Start** - The main entry point for the AI workflow.
- **Phase 0: Design Approval Guide** - **READ FIRST.** The mandatory design review process.
- **Brainstorm & Consensus Tracker** - The shared file where all AIs review and approve designs.
- **AI Role Prompts** - Copy-paste ready prompts for all AIs and checkpoints.
- **Feature Template** - The standard template for tracking a feature from design to deployment.

### How It Works

1.  **Phase 0:** Create design artifacts → All AIs review in `BRAINSTORM-CONSENSUS.md` → Get consensus → **ONLY THEN** proceed to code.
2.  **Phase 1-7:** Implement code → Run through the 7-checkpoint pipeline → All checkpoints must pass → Deploy.

---

## Quick Links
This section provides curated learning paths for common tasks.

### New Developer Onboarding
1. Start with [Development Guide](DEVELOPMENT_GUIDE.md) for setup and workflow
2. Review [Current Architecture Summary](current/CURRENT_ARCHITECTURE.md) for tech stack overview
3. Study [Golden Standard Pattern](current/GOLDEN-STANDARD-PATTERN.md) for component development
4. Reference [UI Kit Migration Guide](current/UI-KIT-MIGRATION-GUIDE.md) for component patterns
5. Understand [Galaxy-Swan Theme](current/GALAXY-SWAN-THEME-DOCS.md) for design system
1. **Setup & Workflow**: Start with the [Development Guide](DEVELOPMENT_GUIDE.md).
2. **System Overview**: Review the [Current Architecture Summary](current/CURRENT_ARCHITECTURE.md).
3. **Component Development**: Study the [Golden Standard Pattern](current/GOLDEN-STANDARD-PATTERN.md).
4. **Design System**: Understand the [Galaxy-Swan Theme](current/GALAXY-SWAN-THEME-DOCS.md).

### Working with Components
- Follow the [Golden Standard Pattern](current/GOLDEN-STANDARD-PATTERN.md)
- Reference dashboard optimization docs for architecture patterns
- Check component-specific READMEs for implementation details

### Working with MCP Servers
- Start with [MCP Server README](../backend/mcp_server/README.md)
- Review specific server documentation for implementation details
- Reference [MCP Financial Events API](current/MCP_FINANCIAL_EVENTS_API.md) for API patterns

### Deploying to Production
1. Review [Development Guide - Production Deployment](DEVELOPMENT_GUIDE.md#3-production-deployment)
2. Follow [Deployment Checklist](deployment/DEPLOYMENT_CHECKLIST_REAL_STRIPE_ANALYTICS.md)
3. Use [Deployment Commands](deployment/DEPLOYMENT_COMMANDS.md) reference
4. Verify with [Stripe Data Verification Guide](guides/STRIPE_DATA_VERIFICATION_GUIDE.md)
1. **Process**: Review the [Production Deployment Section](DEVELOPMENT_GUIDE.md#3-production-deployment) in the main development guide.
2. **Checklist**: Follow the [Deployment Checklist (Stripe & Analytics)](deployment/DEPLOYMENT_CHECKLIST_REAL_STRIPE_ANALYTICS.md).
3. **Commands**: Use the [Deployment Commands](deployment/DEPLOYMENT_COMMANDS.md) for quick reference.
4. **Verification**: After deployment, use the [Stripe Data Verification Guide](guides/STRIPE_DATA_VERIFICATION_GUIDE.md).

---

*Last Updated: 2025-10-27*
*Documentation Structure: v1.0*