# SwanStudios Current Architecture

> **Last Updated:** 2026-05-15
> **Architecture Version:** v2.1 (First-party API runtime, retired MCP compatibility)

This document provides a high-level overview of the SwanStudios application architecture, tech stack, and key design decisions.

---

## Table of Contents

1. [Overview](#overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Design System](#design-system)
5. [State Management](#state-management)
6. [API Communication](#api-communication)
7. [Authentication & Authorization](#authentication--authorization)
8. [Database](#database)
9. [Deployment](#deployment)
10. [Key Architectural Decisions](#key-architectural-decisions)

---

## Overview

SwanStudios is a personal training management platform built with a modern React frontend and Node.js backend. The application underwent a comprehensive MUI elimination in late 2024/early 2025, transitioning to a custom UI Kit based on styled-components and compound component patterns.

**Project Type:** Full-stack web application
**Architecture:** Monorepo (frontend + backend)
**Primary Use Case:** Personal training session management, client tracking, gamification, and financial management

---

## Frontend Architecture

### Tech Stack

- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite
- **Styling:** styled-components (no Material-UI)
- **Routing:** React Router v6
- **State Management:** React Context API + Custom Hooks
- **Form Handling:** Custom form hooks (`useForm`)
- **Data Fetching:** Axios with custom API service layer
- **Real-time:** WebSocket connections for live updates

### UI Kit (Compound Components Pattern)

The application uses a **custom UI Kit** built with compound component patterns for maximum flexibility and composition:

**Core Components:**
- **Table** - Data table with sorting, filtering, pagination
- **Pagination** - Standalone pagination control
- **Badge** - Status indicators and labels
- **EmptyState** - Empty state messaging
- **Container** - Layout container with responsive behavior
- **Animations** - Reusable animation wrappers
- **GlowButton** - Themed button system with color hierarchy
  - Blue = PRIMARY (main actions)
  - Purple = SECONDARY (secondary actions)

**Pattern Reference:** See [GOLDEN-STANDARD-PATTERN.md](GOLDEN-STANDARD-PATTERN.md) for compound component architecture.

### Component Architecture

**Dashboard Structure:**
- Modular, feature-based component organization
- Lazy loading for performance optimization
- Compound components for complex UI patterns
- Styled-components for all styling (no CSS/SCSS files)

**Key Dashboard Components:**
- Client Dashboard (optimized, 1500+ lines → modular)
- Trainer Dashboard (600+ lines → 5 focused components)
- Admin Dashboard (real-time metrics, analytics panels)
- Gamification Dashboard (animation-optimized)

### Directory Structure

```
frontend/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui-kit/       # Custom UI Kit compound components
│   │   ├── ClientDashboard/
│   │   ├── DashBoard/
│   │   └── Schedule/
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API services and MCP integration
│   ├── types/            # TypeScript type definitions
│   ├── mcp/              # MCP client integration
│   └── docs/             # Component-specific documentation
```

---

## Backend Architecture

### Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Language:** JavaScript (ES Modules)
- **Database ORM:** Sequelize
- **Authentication:** JWT (JSON Web Tokens)
- **Real-time:** WebSocket (ws library)
- **File Upload:** Multer
- **Email:** Nodemailer
- **Payment Processing:** Stripe integration

### AI And Automation Runtime

The retired MCP server stack is no longer part of the active runtime. AI-powered
features now use SwanStudios first-party API routes and backend services.

- Workout and workout planning: `/api/workout`, `/api/workout/sessions`
- Gamification: `/api/v1/gamification`, `/api/gamification`
- Client analytics: `/api/client/analytics`
- Form analysis and equipment scanning: first-party backend routes
- Legacy `/api/mcp` paths return retired/fail-closed responses only.

### API Architecture

- **RESTful API** design
- **Route structure:**
  - `/api/auth` - Authentication endpoints
  - `/api/users` - User management
  - `/api/sessions` - Training session management
  - `/api/packages` - Package management
  - `/api/gamification` - Gamification features
  - `/api/financial-events` - Financial tracking
  - `/api/mcp` - retired compatibility responses only

### Directory Structure

```
backend/
├── config/              # Configuration files
├── controllers/         # Route controllers
├── middleware/          # Express middleware
├── models/             # Sequelize models
├── routes/             # API routes
├── services/           # Business logic services
├── migrations/         # Database migrations
├── seeders/            # Database seeders
└── scripts/            # Utility scripts
```

---

## Design System

### Enchanted Apex / Crystalline Swan

The application uses the **Enchanted Apex / Crystalline Swan** design system:
- **Dark-first premium surfaces** using Obsidian Black, Midnight Sapphire, Royal Depth, and Carbon.
- **Crystalline accents** using Ice Wing cyan, Wing Purple, Gilded Fern, and Frost White.
- **Theme-token governance** through CSS custom properties with fallback values so the header theme changer reaches every dashboard surface.

**Theme Documentation:** See [SWAN-CINEMATIC-DESIGN-SYSTEM.md](../ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md) and [THEME-CHANGER-COMPAT.md](../ai-workflow/references/THEME-CHANGER-COMPAT.md).

### Design Principles

1. **Full Space Utilization** - Dashboard Revolution philosophy
2. **Performance First** - Lazy loading, code splitting, animation optimization
3. **Accessibility** - WCAG 2.1 AA compliance
4. **Responsive Design** - Mobile-first approach
5. **Consistent Patterns** - Compound component architecture

---

## State Management

### Approach

**React Context API** for global state:
- `AuthContext` - User authentication state
- `ThemeContext` - Theme preferences
- `WebSocketContext` - Real-time connection state

**Custom Hooks** for local state:
- `useForm` - Form state and validation
- `useTable` - Table data, sorting, filtering, pagination
- `useWebSocket` - WebSocket connection management
- Component-specific hooks for encapsulated logic

### Why Not Redux/Zustand?

- React Context API provides sufficient state management for current scale
- Reduces bundle size and complexity
- Easier to understand and maintain for team members
- Can migrate to external state management if needed in the future

---

## API Communication

### Frontend API Layer

**Service Architecture:**
```
services/
├── api.js              # Axios instance configuration
├── authService.js      # Authentication API calls
├── userService.js      # User management API calls
├── sessionService.js   # Session management API calls
└── mcp/               # MCP integration services
```

**Features:**
- Centralized Axios configuration
- Request/response interceptors for auth tokens
- Error handling and retry logic
- TypeScript type safety for API responses

### Real-time Communication

**WebSocket Integration:**
- Connection management with auto-reconnect
- Event-based message handling
- Dashboard live updates
- Session status notifications

---

## Authentication & Authorization

### Authentication Flow

1. **Login:** POST `/api/auth/login` → JWT token
2. **Token Storage:** localStorage (token) + Context (user data)
3. **Protected Routes:** `PrivateRoute` component checks auth state
4. **Token Refresh:** Automatic token refresh on API 401 responses

### Authorization

**Role-Based Access Control (RBAC):**
- **Admin** - Full system access
- **Trainer** - Client management, session tracking, package creation
- **Client** - Personal dashboard, session booking, progress tracking

**Implementation:**
- Backend: Middleware checks user role from JWT
- Frontend: Conditional rendering based on user role from AuthContext

---

## Database

### Technology

- **Database:** PostgreSQL
- **ORM:** Sequelize
- **Migrations:** Sequelize CLI
- **Connection Pooling:** Configured for production performance

### Key Models

```
Users
├── Trainers (extends Users)
├── Clients (extends Users)
└── Admins (extends Users)

Sessions
├── SessionTemplates
└── SessionAttendance

Packages
├── PackagePurchases
└── PackageUsage

Gamification
├── Achievements
├── Leaderboards
└── Rewards

FinancialEvents
└── Transactions
```

### Data Relationships

- **Users ↔ Sessions** - Many-to-many (trainers and clients)
- **Users ↔ Packages** - One-to-many (clients purchase packages)
- **Users ↔ Achievements** - Many-to-many (gamification)
- **Sessions ↔ FinancialEvents** - One-to-many (session payments)

---

## Deployment

### Hosting

- **Frontend:** Render (Static Site)
- **Backend:** Render (Web Service)
- **Database:** Render PostgreSQL

### CI/CD

- **Platform:** GitHub Actions
- **Pipeline:**
  1. Run tests
  2. Build frontend (Vite)
  3. Deploy to Render on push to `main` branch

### Environment Variables

**Frontend:**
```
VITE_API_URL=<backend URL>
VITE_WS_URL=<WebSocket URL>
```

**Backend:**
```
DATABASE_URL=<PostgreSQL connection string>
JWT_SECRET=<secret key>
STRIPE_SECRET_KEY=<Stripe API key>
SMTP_HOST=<email server>
```

### Build Process

**Frontend:**
```bash
npm run build  # Vite build
```

**Backend:**
```bash
npm start  # Node.js server
```

---

## Key Architectural Decisions

### 1. MUI Elimination (2024-2025)

**Decision:** Remove all Material-UI dependencies and build custom UI Kit

**Rationale:**
- Reduce bundle size (MUI is heavy)
- Greater design control and customization
- Better performance with styled-components
- Eliminate theme conflicts and override complexity

**Outcome:**
- Complete MUI removal across entire codebase
- Custom UI Kit with compound component patterns
- Improved performance and bundle size reduction

### 2. Compound Component Pattern

**Decision:** Use compound components for complex UI elements

**Rationale:**
- Flexible composition
- Better API surface
- Easier to understand and maintain
- Follows React best practices

**Example:**
```jsx
<Table>
  <Table.Header>
    <Table.Row>
      <Table.HeaderCell>Name</Table.HeaderCell>
    </Table.Row>
  </Table.Header>
  <Table.Body>
    {data.map(item => (
      <Table.Row key={item.id}>
        <Table.Cell>{item.name}</Table.Cell>
      </Table.Row>
    ))}
  </Table.Body>
</Table>
```

### 3. Modular Dashboard Architecture

**Decision:** Break large dashboard components into focused modules

**Rationale:**
- User Dashboard: 1500+ lines → modular components
- Trainer Dashboard: 600+ lines → 5 focused components
- Improved maintainability and testability
- Better code organization and reusability

### 4. Retired MCP Servers, First-Party API Runtime

**Decision:** Decommission the default MCP server runtime and keep fail-closed compatibility adapters only.

**Rationale:**
- Render cost and operational overhead were too high for always-on MCP services.
- SwanStudios production workflows now route through first-party REST APIs and backend services.
- Legacy MCP route names may remain as compatibility wrappers, but they must not start servers, poll retired endpoints, or become the source of truth.

### 5. Styled-Components Over CSS Modules

**Decision:** Use styled-components for all styling

**Rationale:**
- Component-scoped styles (no global CSS conflicts)
- Dynamic styling based on props
- Better TypeScript integration
- Easier theme management

---

## Performance Optimizations

### Frontend

- **Code Splitting:** Route-based lazy loading
- **Image Optimization:** Lazy loading, WebP format
- **Animation Optimization:** RequestAnimationFrame, GPU acceleration
- **Bundle Size:** Tree-shaking, dead code elimination
- **Caching:** Service worker for static assets

### Backend

- **Database Query Optimization:** Indexes, eager loading
- **Connection Pooling:** PostgreSQL connection pool
- **Caching:** Redis for session data (future enhancement)
- **Rate Limiting:** API rate limiting middleware

---

## Testing Strategy

### Frontend

- **Unit Tests:** Vitest (coming soon)
- **Integration Tests:** React Testing Library
- **E2E Tests:** Playwright (future)

### Backend

- **Unit Tests:** Jest
- **Integration Tests:** Supertest
- **Retired MCP Contract Tests:** Compatibility routes and adapters must fail closed and point callers to first-party APIs.

---

## Future Enhancements

### Planned Features

1. **Redis Caching** - Improve API response times
2. **GraphQL API** - Flexible data fetching for complex queries
3. **Progressive Web App (PWA)** - Offline support, push notifications
4. **Advanced Analytics** - More detailed client and trainer insights
5. **Mobile App** - React Native mobile application

### Technical Debt

- Migrate remaining class components to functional components
- Add comprehensive test coverage (target: 80%+)
- Implement end-to-end testing with Playwright
- Add Storybook for UI Kit component documentation

---

## Quick Reference

### Starting Development

```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm start
```

### Key Commands

```bash
# Build frontend
npm run build

# Run migrations
npm run migrate

# Seed database
npm run seed

# Run tests
npm test
```

### Documentation Links

- [Golden Standard Pattern](GOLDEN-STANDARD-PATTERN.md) - Component development guide
- [UI Kit Migration Guide](UI-KIT-MIGRATION-GUIDE.md) - MUI to UI Kit migration
- [Crystalline Swan Design System](../ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md) - Current design-system source of truth
- [Theme Changer Compatibility](../ai-workflow/references/THEME-CHANGER-COMPAT.md) - Dashboard theme-token expectations

---

**For Questions or Contributions:**
Refer to component-specific README files or the main documentation index at [/docs/index.md](../index.md).

---

*This document is maintained as the single source of truth for SwanStudios architecture.*
