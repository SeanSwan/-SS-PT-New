# Dashboard RBAC & Route Guard Matrix

**Created:** 2025-11-08
**Status:** 📋 Phase 0 Documentation
**Owner:** Claude Code (based on AI Village feedback)

---

## 🎯 Purpose

This document defines role-based access control (RBAC) for all dashboard routes, ensuring proper authorization gates and redirect behavior.

**Feedback Addressed:**
- Kilo Code: "Add a compact RBAC table mapping Admin/Trainer/Client to routes and CRUD actions"
- Gemini: "Include redirect targets (e.g., unauthorized → UnauthorizedPage)"

---

## 🔐 RBAC Route Guard Matrix

### Admin Dashboard Routes

| Route | Admin | Trainer | Client | Unauthorized Redirect | Notes |
|-------|-------|---------|--------|----------------------|-------|
| `/dashboard/default` | ✅ Full | ❌ | ❌ | `/unauthorized` | Admin home - full analytics |
| `/dashboard/analytics` | ✅ Full | ❌ | ❌ | `/unauthorized` | User analytics, metrics |
| `/dashboard/user-management` | ✅ CRUD | ❌ | ❌ | `/unauthorized` | All users management |
| `/dashboard/trainers` | ✅ CRUD | ✅ Read (self) | ❌ | `/unauthorized` | Trainer management |
| `/dashboard/trainers/permissions` | ✅ CRUD | ❌ | ❌ | `/unauthorized` | Trainer permission config |
| `/dashboard/client-trainer-assignments` | ✅ CRUD | ✅ Read (assigned) | ❌ | `/unauthorized` | Assign trainers to clients |
| `/dashboard/client-management` | ✅ Read | ✅ Read (assigned) | ❌ | `/unauthorized` | Client progress view |
| `/dashboard/clients` | ✅ CRUD | ✅ Read (assigned) | ❌ | `/unauthorized` | Client registry |
| `/dashboard/client-onboarding` | ✅ Create | ❌ | ❌ | `/unauthorized` | **NEW** - Create new clients |
| `/dashboard/packages` | ✅ CRUD | ✅ Read | ❌ | `/unauthorized` | Package management |
| `/dashboard/admin-sessions` | ✅ CRUD | ✅ Create/Read (own) | ❌ | `/unauthorized` | Session logging |
| `/dashboard/content` | ✅ CRUD | ❌ | ❌ | `/unauthorized` | Content moderation |
| `/dashboard/revenue` | ✅ Read | ❌ | ❌ | `/unauthorized` | Revenue analytics |
| `/dashboard/gamification` | ✅ CRUD | ✅ Read | ❌ | `/unauthorized` | Gamification admin |
| `/dashboard/notifications` | ✅ CRUD | ✅ Read | ❌ | `/unauthorized` | Notification management |
| `/dashboard/mcp-servers` | ✅ CRUD | ❌ | ❌ | `/unauthorized` | MCP/AI configuration |
| `/dashboard/settings` | ✅ CRUD | ❌ | ❌ | `/unauthorized` | Admin settings |

### Trainer Dashboard Routes

| Route | Admin | Trainer | Client | Unauthorized Redirect | Notes |
|-------|-------|---------|--------|----------------------|-------|
| `/trainer-dashboard` | ✅ View | ✅ Full | ❌ | `/unauthorized` | Trainer home |
| `/trainer-dashboard/my-clients` | ✅ View | ✅ Read (assigned) | ❌ | `/unauthorized` | Assigned clients only |
| `/trainer-dashboard/schedule` | ✅ View | ✅ CRUD | ❌ | `/unauthorized` | Personal schedule |
| `/trainer-dashboard/sessions` | ✅ View | ✅ Create/Read (own) | ❌ | `/unauthorized` | Session logging |
| `/trainer-dashboard/progress` | ✅ View | ✅ Read (assigned) | ❌ | `/unauthorized` | Client progress tracking |

### Client Dashboard Routes

| Route | Admin | Trainer | Client | Unauthorized Redirect | Notes |
|-------|-------|---------|--------|----------------------|-------|
| `/client-dashboard` | ✅ View | ✅ View (assigned) | ✅ Full (self) | `/unauthorized` | Client home |
| `/client-dashboard/today` | ✅ View | ✅ View (assigned) | ✅ Read (self) | `/unauthorized` | Today's workout |
| `/client-dashboard/progress` | ✅ View | ✅ View (assigned) | ✅ Read (self) | `/unauthorized` | Progress charts |
| `/client-dashboard/gamification` | ✅ View | ✅ View (assigned) | ✅ Read (self) | `/unauthorized` | Gamification hub |
| `/client-dashboard/workouts` | ✅ View | ✅ View (assigned) | ✅ Read (self) | `/unauthorized` | Workout history |
| `/client-dashboard/nutrition` | ✅ View | ✅ View (assigned) | ✅ Read (self) | `/unauthorized` | Meal plans |

---

## 🛡️ Authorization Levels

### Access Types
- **Full**: Complete CRUD (Create, Read, Update, Delete)
- **CRUD**: Explicit Create, Read, Update, Delete permissions
- **Read**: View-only access
- **Read (self)**: Can only view own data
- **Read (assigned)**: Can only view assigned clients/trainers
- **Create**: Can create new records
- **Create/Read (own)**: Can create and view own records
- **View**: Observer access (admin viewing other role's dashboard)
- ❌: No access (401 Unauthorized)

### Redirect Behavior
| Scenario | Redirect Target | HTTP Status |
|----------|----------------|-------------|
| Not logged in | `/login` | 401 Unauthorized |
| Logged in, wrong role | `/unauthorized` | 403 Forbidden |
| Valid role, expired token | `/login?expired=true` | 401 Unauthorized |
| Admin viewing other role's dashboard | No redirect (observer mode) | 200 OK |

---

## 🔒 Route Guard Implementation

### Current Implementation Status

**Files:**
- `frontend/src/routes/main-routes.tsx` - Route definitions
- `frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx` - Admin routes
- `frontend/src/utils/ProtectedRoute.tsx` (if exists) - Route guard wrapper

**Required Guard Logic:**
```typescript
// Pseudocode - NOT IMPLEMENTED YET
const RouteGuard = ({ route, user }) => {
  // 1. Check if user is authenticated
  if (!user || !user.token) {
    return <Redirect to="/login" />;
  }

  // 2. Check token expiration
  if (isTokenExpired(user.token)) {
    return <Redirect to="/login?expired=true" />;
  }

  // 3. Check role authorization
  const accessLevel = RBAC_MATRIX[route][user.role];

  if (accessLevel === 'DENIED') {
    return <Redirect to="/unauthorized" />;
  }

  // 4. Render route with access level context
  return <RouteComponent accessLevel={accessLevel} />;
};
```

---

## 📋 Data Scope Filters

### Admin Data Scope
- **Users**: All users (admin, trainer, client)
- **Clients**: All clients
- **Trainers**: All trainers
- **Sessions**: All sessions
- **Revenue**: All transactions
- **Analytics**: Platform-wide metrics

### Trainer Data Scope
- **Users**: Self + assigned clients
- **Clients**: Assigned clients only (via `client_trainer_assignments` table)
- **Trainers**: Self only
- **Sessions**: Own sessions + assigned client sessions
- **Revenue**: Read-only (own earnings)
- **Analytics**: Assigned clients only

### Client Data Scope
- **Users**: Self only
- **Clients**: Self only
- **Trainers**: Assigned trainer (read-only)
- **Sessions**: Own sessions only
- **Revenue**: Own packages/purchases
- **Analytics**: Personal metrics only

---

## 🔍 Backend Authorization Verification

### Required Middleware Checks

**Example for `/api/onboarding` (Client Onboarding):**
```javascript
// backend/controllers/onboardingController.mjs
// MUST verify:
// 1. User is authenticated (JWT valid)
// 2. User has 'admin' role
// 3. Request contains required fields

if (req.user.role !== 'admin') {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'Only admins can create new clients'
  });
}
```

**Example for `/api/clients/:id` (Client Data Access):**
```javascript
// MUST verify:
// 1. User is authenticated
// 2. Admin: can access any client
// 3. Trainer: can only access assigned clients
// 4. Client: can only access self

const clientId = req.params.id;

if (req.user.role === 'client' && req.user.id !== clientId) {
  return res.status(403).json({
    error: 'Forbidden',
    message: 'You can only access your own data'
  });
}

if (req.user.role === 'trainer') {
  const isAssigned = await checkTrainerClientAssignment(req.user.id, clientId);
  if (!isAssigned) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You can only access your assigned clients'
    });
  }
}

// Admin passes through - has access to all clients
```

---

## ⚠️ Security Considerations

### Critical Rules
1. **Never trust frontend authorization alone** - Always verify on backend
2. **Token expiration** - Refresh tokens before they expire
3. **Role elevation attacks** - Prevent clients from changing role to admin
4. **Data leakage** - Don't return sensitive data in unauthorized responses
5. **Audit logging** - Log all authorization failures for security monitoring

### Missing Implementation (Phase 4)
- [ ] Backend middleware for RBAC enforcement
- [ ] Frontend route guards with redirect logic
- [ ] Token refresh mechanism
- [ ] Audit logging for authorization failures
- [ ] Rate limiting for unauthorized access attempts

---

## 📊 Expected Behavior Matrix

### Scenario: Admin Accesses Client Dashboard
- **Access**: ✅ Allowed (observer mode)
- **Data Scope**: All clients
- **Actions**: Read-only (no modifications)
- **UI Indication**: "Viewing as Admin" banner

### Scenario: Trainer Accesses Admin Dashboard
- **Access**: ❌ Denied
- **Redirect**: `/unauthorized`
- **HTTP Status**: 403 Forbidden
- **Error Message**: "Trainers do not have access to admin features"

### Scenario: Client Accesses Trainer Dashboard
- **Access**: ❌ Denied
- **Redirect**: `/unauthorized`
- **HTTP Status**: 403 Forbidden
- **Error Message**: "Clients do not have access to trainer features"

### Scenario: Unauthenticated User Accesses Any Dashboard
- **Access**: ❌ Denied
- **Redirect**: `/login`
- **HTTP Status**: 401 Unauthorized
- **Error Message**: "Please log in to access this page"

---

## 🎯 Phase 1 RBAC Tasks

**After Admin Dashboard Fix:**
1. Verify `/dashboard/client-onboarding` requires `admin` role
2. Test unauthorized access redirects to `/unauthorized`
3. Confirm admin can access all routes in matrix
4. Validate trainer/client cannot access admin routes

**Testing Checklist:**
- [ ] Admin login → should access `/dashboard/default`
- [ ] Trainer login → should NOT access `/dashboard/default` (403)
- [ ] Client login → should NOT access `/dashboard/default` (403)
- [ ] Admin accessing `/dashboard/client-onboarding` → ✅ allowed
- [ ] Trainer accessing `/dashboard/client-onboarding` → ❌ 403
- [ ] Logout → all dashboard routes redirect to `/login`

---

**Status:** 📋 DOCUMENTATION COMPLETE
**Next Action:** Share with AI Village for review
**Implementation:** Phase 4 (after critical fixes)
