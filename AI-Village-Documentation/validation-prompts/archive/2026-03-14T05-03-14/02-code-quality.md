# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 45.1s
> **Files:** backend/routes/social/friendships.mjs, frontend/src/pages/Social/SocialPage.V3.tsx, frontend/src/components/Social/Feed/SocialFeed.tsx
> **Generated:** 3/13/2026, 10:03:14 PM

---

# Code Review: SwanStudios Social Features

## Executive Summary
**Overall Grade: B+ (85/100)**

The codebase demonstrates solid architecture with proper separation of concerns, good TypeScript usage, and modern React patterns. However, there are several critical security issues, performance anti-patterns, and DRY violations that need immediate attention.

---

## 🔴 CRITICAL Issues

### 1. **Security: Error Messages Expose Internal Details**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** Multiple catch blocks (e.g., lines 38-43, 80-85, etc.)  
**Severity:** CRITICAL

```javascript
return res.status(500).json({
  success: false,
  message: 'Failed to fetch friends list',
  error: error.message  // ❌ Exposes stack traces, DB errors to client
});
```

**Issue:** All error handlers return `error.message` to the client, potentially exposing:
- Database schema details
- Internal file paths
- Sequelize error messages
- Stack traces in development mode

**Fix:**
```javascript
console.error('Error fetching friends:', error);
return res.status(500).json({
  success: false,
  message: 'Failed to fetch friends list',
  // Remove error.message in production
  ...(process.env.NODE_ENV === 'development' && { error: error.message })
});
```

---

### 2. **Security: SQL Injection Risk via String Concatenation**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 431-434  
**Severity:** CRITICAL

```javascript
req.db.Sequelize.where(
  req.db.Sequelize.fn('concat', 
    req.db.Sequelize.col('firstName'), ' ', 
    req.db.Sequelize.col('lastName')),
  { [Op.iLike]: searchTerm }
)
```

**Issue:** While using Sequelize's `fn()`, the pattern is vulnerable if `searchTerm` isn't properly sanitized. The `%${String(q).trim()}%` pattern could allow SQL injection if special characters aren't escaped.

**Fix:**
```javascript
// Validate and sanitize input
const sanitizedQuery = String(q).trim().replace(/[%_]/g, '\\$&');
const searchTerm = `%${sanitizedQuery}%`;
```

---

### 3. **Race Condition: Friendship Status Swapping**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 356-363  
**Severity:** CRITICAL

```javascript
if (Number(friendship.recipientId) === req.user.id) {
  // Swap requester and recipient so current user is the blocker
  const temp = friendship.requesterId;
  friendship.requesterId = friendship.recipientId;
  friendship.recipientId = temp;
}
await friendship.save();
```

**Issue:** 
- Direct field manipulation without transaction
- No validation that the swap succeeded
- Could corrupt data if save fails mid-operation
- Violates database integrity (foreign key relationships)

**Fix:**
```javascript
// Use a transaction and proper status field
await req.db.sequelize.transaction(async (t) => {
  if (Number(friendship.recipientId) === req.user.id) {
    await friendship.destroy({ transaction: t });
    friendship = await Friendship.create({
      requesterId: req.user.id,
      recipientId: friendship.requesterId,
      status: 'blocked'
    }, { transaction: t });
  } else {
    friendship.status = 'blocked';
    await friendship.save({ transaction: t });
  }
});
```

---

## 🟠 HIGH Priority Issues

### 4. **Performance: Missing Database Indexes**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** All query operations  
**Severity:** HIGH

**Issue:** No evidence of indexes on frequently queried columns:
- `Friendship.requesterId` + `Friendship.recipientId` (composite)
- `Friendship.status`
- `User.username`, `User.firstName`, `User.lastName`

**Impact:** O(n) table scans on every friend lookup, search, and suggestion query.

**Fix (Migration):**
```javascript
// migrations/add-friendship-indexes.js
await queryInterface.addIndex('Friendships', ['requesterId', 'status']);
await queryInterface.addIndex('Friendships', ['recipientId', 'status']);
await queryInterface.addIndex('Friendships', ['requesterId', 'recipientId'], {
  unique: true
});
await queryInterface.addIndex('Users', ['username']);
await queryInterface.addIndex('Users', ['firstName', 'lastName']);
```

---

### 5. **DRY Violation: Duplicated Authorization Logic**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 234-240, 277-283, 315-321  
**Severity:** HIGH

**Issue:** Same authorization check repeated in 3 endpoints:

```javascript
// Accept endpoint (line 234)
if (Number(friendship.recipientId) !== Number(req.user.id)) {
  return res.status(403).json({
    success: false,
    message: 'You are not authorized to accept this friend request'
  });
}

// Decline endpoint (line 277) — IDENTICAL
// Remove endpoint (line 315) — SIMILAR
```

**Fix:**
```javascript
// middleware/friendshipAuth.mjs
export const requireFriendshipParticipant = (allowedStatuses = []) => {
  return async (req, res, next) => {
    const friendship = await Friendship.findByPk(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found'
      });
    }
    
    const isParticipant = 
      friendship.requesterId === req.user.id || 
      friendship.recipientId === req.user.id;
    
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to modify this friendship'
      });
    }
    
    if (allowedStatuses.length && !allowedStatuses.includes(friendship.status)) {
      return res.status(400).json({
        success: false,
        message: `This friendship cannot be modified (status: ${friendship.status})`
      });
    }
    
    req.friendship = friendship;
    next();
  };
};

// Usage
router.post('/accept/:friendshipId', 
  requireFriendshipParticipant(['pending']),
  async (req, res) => {
    const friendship = req.friendship; // Already loaded
    // ... rest of logic
  }
);
```

---

### 6. **Performance: N+1 Query in Friend Suggestions**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 479-511  
**Severity:** HIGH

**Issue:** Three separate queries to build exclusion list:
1. Get friendships (line 479)
2. Get blocks (line 488)
3. Get suggested users (line 502)

**Impact:** For a user with 100 friends + 10 blocks, this executes 3 queries when 1 would suffice.

**Fix:**
```javascript
router.get('/suggestions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const Op = req.db.Sequelize.Op;
    
    // Single query with subquery
    const suggestedUsers = await User.findAll({
      where: {
        id: {
          [Op.notIn]: req.db.Sequelize.literal(`(
            SELECT CASE 
              WHEN "requesterId" = ${req.user.id} THEN "recipientId"
              ELSE "requesterId"
            END
            FROM "Friendships"
            WHERE ("requesterId" = ${req.user.id} OR "recipientId" = ${req.user.id})
              AND status IN ('accepted', 'blocked', 'pending')
          )`)
        },
        id: { [Op.ne]: req.user.id },
        role: { [Op.in]: ['client', 'trainer'] }
      },
      attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'role'],
      limit,
      order: [['createdAt', 'DESC']]
    });
    
    return res.status(200).json({
      success: true,
      suggestions: suggestedUsers
    });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch friend suggestions'
    });
  }
});
```

---

### 7. **React: Stale Closure in useEffect**
**File:** `frontend/src/components/Social/Feed/SocialFeed.tsx`  
**Lines:** 224-236  
**Severity:** HIGH

```typescript
useEffect(() => {
  if (posts.length === 0) return;

  const latestPost = posts[0];
  const timeDiff = Date.now() - new Date(latestPost.createdAt).getTime();

  if (timeDiff < 300000) {
    setRecentActivity(`New ${latestPost.type} post from ${latestPost.user.firstName}`);
    const timer = setTimeout(() => setRecentActivity(null), 10000);
    return () => clearTimeout(timer);
  }
}, [posts]); // ❌ Runs on EVERY posts change
```

**Issue:**
- Effect runs every time `posts` array reference changes (every fetch, like, comment)
- Creates new timers without cleaning up previous ones
- Memory leak: timers accumulate if posts update rapidly

**Fix:**
```typescript
useEffect(() => {
  if (posts.length === 0) return;

  const latestPost = posts[0];
  const postAge = Date.now() - new Date(latestPost.createdAt).getTime();

  // Only show for truly new posts (< 5 min old)
  if (postAge < 300000) {
    setRecentActivity(`New ${latestPost.type} post from ${latestPost.user.firstName}`);
    const timer = setTimeout(() => setRecentActivity(null), 10000);
    return () => clearTimeout(timer);
  } else {
    setRecentActivity(null); // Clear stale activity
  }
}, [posts[0]?.id]); // ✅ Only run when latest post ID changes
```

---

### 8. **TypeScript: Unsafe Type Coercion**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 122, 127, 234, 277, etc.  
**Severity:** HIGH

```javascript
const recipientIdNum = parseInt(recipientId, 10);
if (isNaN(recipientIdNum)) {
  return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
}
// ... later
if (Number(friendship.recipientId) !== Number(req.user.id)) { // ❌ Inconsistent
```

**Issue:**
- Mixing `parseInt()` and `Number()` coercion
- `Number()` doesn't validate—returns `NaN` silently
- Inconsistent validation patterns across endpoints

**Fix:**
```javascript
// utils/validation.mjs
export const parseUserId = (id) => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid user ID');
  }
  return parsed;
};

// Usage
try {
  const recipientIdNum = parseUserId(recipientId);
  // ... rest of logic
} catch (error) {
  return res.status(400).json({
    success: false,
    message: error.message
  });
}
```

---

## 🟡 MEDIUM Priority Issues

### 9. **Performance: Inline Function Creation in Render**
**File:** `frontend/src/pages/Social/SocialPage.V3.tsx`  
**Lines:** 444-448, 452-456, etc.  
**Severity:** MEDIUM

```tsx
<NavButton
  $active={activeTab === 'feed'}
  onClick={() => handleTabChange('feed')} // ❌ New function every render
>
```

**Issue:** Creates new function instances on every render, breaking memoization of child components.

**Fix:**
```tsx
const handleFeedClick = useCallback(() => handleTabChange('feed'), [handleTabChange]);
const handleReelsClick = useCallback(() => handleTabChange('reels'), [handleTabChange]);
// ... etc

<NavButton $active={activeTab === 'feed'} onClick={handleFeedClick}>
```

---

### 10. **Styled-Components: Hardcoded Color Values**
**File:** `frontend/src/components/Social/Feed/SocialFeed.tsx`  
**Lines:** 84, 98, 127, etc.  
**Severity:** MEDIUM

```typescript
const WelcomeCard = styled.div`
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.15); // ❌ Hardcoded #8B5CF6
`;
```

**Issue:** 
- Violates theme token usage requirement
- Makes theme switching impossible
- Duplicates color values across 20+ components

**Fix:**
```typescript
const WelcomeCard = styled.div`
  background: linear-gradient(
    135deg, 
    ${({ theme }) => theme.colors.wingPurple}15, 
    ${({ theme }) => theme.colors.wingPurple}08
  );
  border: 1px solid ${({ theme }) => theme.colors.wingPurple}15;
`;
```

**Required Theme Setup:**
```typescript
// theme.ts
export const enchantedApexTheme = {
  colors: {
    midnightSapphire: '#002060',
    royalDepth: '#003080',
    iceWing: '#60C0F0',
    arcticCyan: '#50A0F0',
    gildedFern: '#C6A84B',
    frostWhite: '#E0ECF4',
    swanLavender: '#4070C0',
    wingPurple: '#8B5CF6',
  },
  // ... rest
};
```

---

### 11. **DRY Violation: Duplicated User Attribute Selection**
**File:** `backend/routes/social/friendships.mjs`  
**Lines:** 20-21, 25-26, 86-87, 250-251, etc.  
**Severity:** MEDIUM

```javascript
// Repeated 8+ times
attributes: ['id', 'firstName', 'lastName', 'username', 'photo', 'points', 'role']
```

**Fix:**
```javascript
// models/User.mjs
export const USER_PUBLIC_ATTRIBUTES = [
  'id', 'firstName', 'lastName', 'username', 'photo', 'points', 'role'
];

export const USER_BASIC_ATTRIBUTES = [
  'id', 'firstName', 'lastName', 'username', 'photo'
];

// Usage
import { USER_PUBLIC_ATTRIBUTES } from '../../models/User.mjs';

include: [{
  model: User,
  as: 'requester',
  attributes: USER_PUBLIC_ATTRIBUTES
}]
```

---

### 12. **Performance: Missing React.memo on PostCard**
**File:** `frontend/src/components/Social/Feed/SocialFeed.tsx`  
**Lines:** 336-345  
**Severity:** MEDIUM

```tsx
{posts.map(post => (
  <PostCard
    key={post.id}
    post={post}
    onLike={() => handleLikeToggle(post.id, post.isLiked)} // ❌ New function
    onReact={reactToPost}
    onRemoveReaction={removeReaction}

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
