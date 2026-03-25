# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 58.6s
> **Files:** backend/models/social/Hashtag.mjs, backend/models/social/PostHashtag.mjs, backend/models/social/UserHashtagFollow.mjs, backend/routes/social/hashtags.mjs, backend/routes/social/posts.mjs, backend/models/social/index.mjs, frontend/src/components/Social/Hashtags/HashtagChip.tsx
> **Generated:** 3/24/2026, 10:56:33 PM

---

# Code Review: SwanStudios Hashtag System

## CRITICAL Issues

### 1. **SQL Injection Vulnerability in Post Reporting**
**File:** `backend/routes/social/posts.mjs` (lines 715-730)  
**Severity:** CRITICAL

```javascript
await sequelize.query(
  `INSERT INTO "PostReports" ("reporterId", "contentType", "contentId", "contentAuthorId", "reason", "description", "status", "createdAt", "updatedAt")
   VALUES (:reporterId, 'post', :contentId, :authorId, :reason, :description, 'pending', NOW(), NOW())`,
  {
    replacements: {
      reporterId: req.user.id,
      contentId: postId,
      authorId: post.userId,
      reason,
      description: description || null,
    },
  }
);
```

**Issue:** While using parameterized queries, the `reason` field is validated but `description` is not sanitized. More critically, the raw SQL approach bypasses Sequelize's built-in protections.

**Fix:** Use Sequelize model methods instead of raw queries, or add strict validation on `description`.

---

### 2. **Missing Transaction Rollback on Hashtag Processing Failure**
**File:** `backend/routes/social/posts.mjs` (lines 355-370)  
**Severity:** CRITICAL

```javascript
// Create the post
const post = await SocialPost.create(postData);

// Extract and process hashtags from content
let linkedHashtags = [];
try {
  const { extractHashtags, processHashtags } = await import('./hashtags.mjs');
  const tagNames = extractHashtags(content);
  if (tagNames.length > 0) {
    linkedHashtags = await processHashtags(post.id, tagNames);
  }
} catch (hashtagErr) {
  // Non-fatal: hashtag processing failure should not block post creation
  console.warn('Hashtag processing failed (non-fatal):', hashtagErr.message);
}
```

**Issue:** Post is created without a transaction. If hashtag processing partially succeeds then fails, you'll have orphaned `PostHashtag` records and incorrect `usageCount` values. Media upload happens before post creation, so R2 cleanup on failure is also missing.

**Fix:** Wrap post creation, media upload, and hashtag processing in a Sequelize transaction with proper rollback.

---

### 3. **Race Condition in Hashtag Usage Count Increment**
**File:** `backend/routes/social/hashtags.mjs` (lines 71-75)  
**Severity:** CRITICAL

```javascript
// Increment usage counts
await hashtag.increment(['usageCount', 'weeklyCount'], {
  ...(transaction ? { transaction } : {})
});
```

**Issue:** Multiple concurrent posts with the same hashtag can cause lost updates. `increment()` is atomic at the DB level, but the surrounding `findOrCreate` + `PostHashtag.findOrCreate` is not, leading to duplicate join records or missed counts.

**Fix:** Use database-level unique constraints (already present) + proper error handling for constraint violations, or use `ON CONFLICT` upsert logic.

---

## HIGH Issues

### 4. **Missing TypeScript Types in Frontend Component**
**File:** `frontend/src/components/Social/Hashtags/HashtagChip.tsx` (truncated)  
**Severity:** HIGH

**Issue:** Component is truncated, but visible code shows proper TypeScript usage. However, the styled-component props use `$` prefix convention but don't show proper typing for the styled component itself.

**Expected:**
```typescript
const Chip = styled.button<{ 
  $active: boolean; 
  $color: string; 
  $size: 'sm' | 'md' | 'lg' 
}>`...`
```

**Current:** Uses `string` instead of discriminated union for `$size`.

---

### 5. **Hardcoded Color Values Instead of Theme Tokens**
**File:** `frontend/src/components/Social/Hashtags/HashtagChip.tsx` (lines 48-53)  
**Severity:** HIGH

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#8B5CF6',    // Wing Purple
  creative: '#C6A84B',   // Gilded Fern
  community: '#60C0F0',  // Ice Wing
  general: '#4070C0',    // Swan Lavender
};
```

**Issue:** Hardcoded hex values violate the styled-components theme token requirement. Should reference `theme.colors.*` or CSS custom properties.

**Fix:**
```typescript
const CATEGORY_COLORS: Record<string, string> = {
  fitness: 'var(--wing-purple, #8B5CF6)',
  creative: 'var(--gilded-fern, #C6A84B)',
  community: 'var(--ice-wing, #60C0F0)',
  general: 'var(--swan-lavender, #4070C0)',
};
```

---

### 6. **Unhandled Promise Rejection in Hashtag Extraction**
**File:** `backend/routes/social/posts.mjs` (lines 358-368)  
**Severity:** HIGH

```javascript
try {
  const { extractHashtags, processHashtags } = await import('./hashtags.mjs');
  const tagNames = extractHashtags(content);
  if (tagNames.length > 0) {
    linkedHashtags = await processHashtags(post.id, tagNames);
  }
} catch (hashtagErr) {
  console.warn('Hashtag processing failed (non-fatal):', hashtagErr.message);
}
```

**Issue:** If `processHashtags` throws after creating some hashtags, the counts will be inconsistent. The error is swallowed without user notification.

**Fix:** Either make hashtag processing atomic (transaction) or return partial success info to the user.

---

### 7. **Missing Error Boundary for Async Operations**
**File:** `backend/routes/social/hashtags.mjs` (multiple routes)  
**Severity:** HIGH

**Issue:** All routes use generic `catch` blocks that log to console but don't differentiate between validation errors, DB errors, and system errors. User gets same "Failed to fetch" message for all failures.

**Fix:** Implement error classification:
```javascript
} catch (error) {
  if (error.name === 'SequelizeValidationError') {
    return res.status(400).json({ success: false, message: error.errors[0].message });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'Hashtag already exists' });
  }
  logger.error('Hashtag route error:', error);
  return res.status(500).json({ success: false, message: 'Server error' });
}
```

---

## MEDIUM Issues

### 8. **DRY Violation: Duplicate Reaction Fetching Logic**
**File:** `backend/routes/social/posts.mjs` (lines 178-187, 317-326)  
**Severity:** MEDIUM

```javascript
// Appears twice with identical logic
let reactionCountsMap = {};
let userReactionsMap = {};
try {
  reactionCountsMap = await SocialLike.getReactionCounts(postIds);
  userReactionsMap = await SocialLike.getUserReactions(req.user.id, postIds);
} catch (err) {
  console.log('Reaction methods not available, falling back to legacy:', err.message);
}
```

**Fix:** Extract to helper function:
```javascript
async function fetchReactionData(userId, postIds) {
  try {
    return {
      counts: await SocialLike.getReactionCounts(postIds),
      userReactions: await SocialLike.getUserReactions(userId, postIds)
    };
  } catch (err) {
    return { counts: {}, userReactions: {} };
  }
}
```

---

### 9. **Inefficient N+1 Query Pattern in Hashtag Page**
**File:** `backend/routes/social/hashtags.mjs` (lines 197-213)  
**Severity:** MEDIUM

```javascript
const postIds = (await PostHashtag.findAll({
  where: { hashtagId: hashtag.id },
  attributes: ['postId'],
  order: [['createdAt', 'DESC']],
  limit: limit + offset
})).map(ph => ph.postId);

const paginatedIds = postIds.slice(offset, offset + limit);

const posts = paginatedIds.length > 0
  ? await SocialPost.findAll({
      where: {
        id: { [Op.in]: paginatedIds },
        moderationStatus: { [Op.or]: ['approved', null] }
      },
      // ...
    })
  : [];
```

**Issue:** Fetches all post IDs up to `limit + offset`, then slices in memory. For large hashtags, this is inefficient.

**Fix:** Use proper pagination with `LIMIT` and `OFFSET` in the initial query, or use cursor-based pagination.

---

### 10. **Missing Input Validation on Hashtag Search**
**File:** `backend/routes/social/hashtags.mjs` (lines 124-127)  
**Severity:** MEDIUM

```javascript
const q = (req.query.q || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
if (q.length < 1) {
  return res.json({ success: true, data: [] });
}
```

**Issue:** No max length check. A malicious user could send a 10,000-character query that passes the regex but causes DB performance issues.

**Fix:**
```javascript
const q = (req.query.q || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
```

---

### 11. **Inconsistent Error Logging**
**File:** Multiple files  
**Severity:** MEDIUM

**Issue:** Some routes use `console.error`, some use `console.log`, some check for `logger` existence. Inconsistent logging makes debugging harder.

**Fix:** Standardize on logger utility:
```javascript
import logger from '../../utils/logger.mjs';
// Always use logger.error, logger.warn, logger.info
```

---

### 12. **Magic Numbers in Pagination**
**File:** `backend/routes/social/hashtags.mjs` (lines 109, 130, etc.)  
**Severity:** MEDIUM

```javascript
const limit = Math.min(parseInt(req.query.limit) || 20, 50);
```

**Issue:** Hardcoded limits scattered throughout. Should be constants.

**Fix:**
```javascript
const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  MAX_HASHTAG_SEARCH_LIMIT: 30
};
```

---

## LOW Issues

### 13. **Unused Import in Hashtag Model**
**File:** `backend/models/social/Hashtag.mjs`  
**Severity:** LOW

**Issue:** `classifyHashtag` is exported but only used in `hashtags.mjs` route. Not a problem, but worth noting for tree-shaking.

---

### 14. **Missing JSDoc for Exported Functions**
**File:** `backend/routes/social/hashtags.mjs` (lines 34-40)  
**Severity:** LOW

```javascript
export function extractHashtags(content) {
  if (!content || typeof content !== 'string') return [];
  const matches = content.match(HASHTAG_REGEX) || [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))].slice(0, 10);
}
```

**Issue:** Missing JSDoc comment explaining the 10-hashtag limit and deduplication logic.

---

### 15. **Inconsistent Naming: `weeklyCount` vs `usageCount`**
**File:** `backend/models/social/Hashtag.mjs` (lines 73-83)  
**Severity:** LOW

**Issue:** No documentation on when `weeklyCount` is reset. Should have a cron job reference or migration script comment.

**Fix:** Add comment:
```javascript
weeklyCount: {
  type: DataTypes.INTEGER,
  defaultValue: 0,
  allowNull: false,
  comment: 'Posts this week — reset weekly by cron job (see scripts/resetWeeklyCounts.mjs)'
}
```

---

### 16. **Potential Memory Leak in Hashtag Suggestions**
**File:** `backend/routes/social/hashtags.mjs` (lines 162-185)  
**Severity:** LOW

```javascript
const usedTagIds = postIds.length > 0
  ? (await PostHashtag.findAll({
      where: { postId: { [Op.in]: postIds } },
      attributes: ['hashtagId'],
      group: ['hashtagId']
    })).map(ph => ph.hashtagId)
  : [];
```

**Issue:** If a user has 1000+ posts, this could fetch a large result set. Should limit to recent posts (already done with `limit: 20` on posts, but worth documenting).

---

### 17. **Missing Index on `PostHashtag.createdAt`**
**File:** `backend/models/social/PostHashtag.mjs` (lines 39-44)  
**Severity:** LOW

**Issue:** Hashtag page sorts by `PostHashtag.createdAt DESC` but no index exists on that column.

**Fix:** Add index:
```javascript
indexes: [
  { unique: true, fields: ['postId', 'hashtagId'] },
  { fields: ['postId'] },
  { fields: ['hashtagId'] },
  { fields: ['createdAt'] } // Add this
]
```

---

### 18. **Truncated Frontend Component**
**File:** `frontend/src/components/Social/Hashtags/HashtagChip.tsx`  
**Severity:** LOW

**Issue:** Component is incomplete (ends mid-template literal). Cannot fully review hover states, click handlers, or accessibility attributes.

**Expected:** Full component with `onClick` handler, keyboard navigation, and ARIA labels.

---

## Performance Anti-Patterns

### 19. **Inline Function Creation in Map**
**File:** `backend/routes/social/posts.mjs` (lines 188-200)  
**Severity:** LOW

```javascript
const formattedPosts = posts.map(post => {
  const postObj = post.toJSON();
  postObj.commentsCount = commentCountMap[post.id] || 0;
  postObj.isLiked = likedPostIds.has(post.id);
  postObj.reactionCounts = reactionCountsMap[post.id] || { thumbs_up: 0, heart: 0, swan: 0 };
  postObj.userReactions = userReactionsMap[post.id] || [];
  return postObj;
});
```

**Issue:** Not a problem in Node.js backend, but if this pattern appears in React components, it would cause re-renders.

---

### 20. **Missing Memoization in Category Color Lookup**
**File:** `frontend/src/components/Social/Hashtags/HashtagChip.tsx` (lines 48-53)  
**Severity:** LOW

**Issue:** `CATEGORY_COLORS` is a constant object, so no issue. But if this were computed, it should be memoized.

---

## Summary Table

| Severity | Count | Key Issues |
|----------|-------|------------|
| CRITICAL | 3 | SQL injection risk, missing transactions, race conditions |
| HIGH | 4 | Missing TypeScript types, hardcoded colors, unhandled promises, poor error handling |
| MEDIUM | 6 | DRY violations, N+1 queries, missing validation, inconsistent logging |
| LOW | 7 | Missing docs, potential memory issues, missing indexes, truncated component |

---

## Recommendations Priority

1. **Immediate (CRITICAL):**
   - Wrap post creation in transaction with rollback
   - Add proper error handling for hashtag race conditions
   - Replace raw SQL with Sequelize models in reporting

2. **Short-term (HIGH):**
   - Implement proper error classification in all routes
   - Replace hardcoded colors with theme tokens
   - Add TypeScript discriminated unions for size props

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
