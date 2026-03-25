# Architecture & Bug Hunter — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.5-20260211 | **Duration:** 71.2s
> **Files:** backend/models/social/Hashtag.mjs, backend/models/social/PostHashtag.mjs, backend/models/social/UserHashtagFollow.mjs, backend/routes/social/hashtags.mjs, backend/routes/social/posts.mjs, backend/models/social/index.mjs, frontend/src/components/Social/Hashtags/HashtagChip.tsx
> **Generated:** 3/24/2026, 10:56:33 PM

---

# Deep Code Review: SwanStudios Social Hashtag System

## Executive Summary

This review identifies **CRITICAL** bugs that will cause runtime failures, **HIGH** severity architectural flaws, and **MEDIUM** production readiness issues. The codebase has significant data integrity risks around hashtag-post relationships and point awarding.

---

## 1. Bug Detection

### CRITICAL: Data Integrity Failure in Hashtag Processing

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `hashtags.mjs` lines 68-98 | `processHashtags` increments `usageCount` and `weeklyCount` on every post creation, but **there is no corresponding decrement when posts are deleted**. This causes permanently inflated usage statistics. | Add a `decrementHashtagCounts` function called in `posts.mjs` DELETE endpoint that decrements both counters. Use a transaction to ensure atomicity. |
| **CRITICAL** | `hashtags.mjs` line 72 | **Dynamic import inside a loop** — `await import('../../models/social/Hashtag.mjs')` is called for every hashtag in the loop, causing N module reloads. This is a severe performance bug. | Move the import to the top of the function: `const { classifyHashtag } = await import(...)` once before the loop, or better, import it at module level. |
| **CRITICAL** | `posts.mjs` line 66 | In `getEnhancedFallbackFeed`, the `where` clause compares `userId: String(userId)` but the fallback query uses `raw: true` and the EnhancedSocialPost may store numeric IDs. This will fail to match the user's own posts. | Change to `userId: userId` (numeric) and ensure consistent type handling, or use `sequelize.cast()` for cross-database compatibility. |

### HIGH: Race Conditions & Async Issues

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `hashtags.mjs` lines 68-98 | `processHashtags` has **no transaction wrapping**. If `PostHashtag.findOrCreate` succeeds but `hashtag.increment()` fails, the join record exists without the count being updated. | Wrap the entire operation in `sequelize.transaction()` and pass to all queries. |
| **HIGH** | `posts.mjs` lines 304-306 | Comment count is updated manually (`post.commentsCount += 1`) instead of using database increment. If the response fails after save but before returning, the count is already incremented but client sees error. | Use `await post.increment('commentsCount')` instead of manual increment. |
| **HIGH** | `posts.mjs` lines 304-306 | Same issue with comment deletion - manual decrement can cause inconsistency | Use `await post.decrement('commentsCount')` |

### MEDIUM: Null/Undefined Access Without Guards

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `hashtags.mjs` line 177 | `req.user.id` is used without checking if `req.user` exists. If `protect` middleware fails silently, this throws. | Add guard: `if (!req.user?.id) return res.status(401)...` |
| **MEDIUM** | `posts.mjs` line 68 | `parseInt(req.query.limit)` can return `NaN` if invalid string passed, then `Math.max(1, NaN)` returns `NaN`, causing SQL error. | Add: `const limit = Math.max(1, parseInt(req.query?.limit) || 20)` |
| **MEDIUM** | `hashtags.mjs` line 132 | `parseInt(req.query.limit)` can be negative if someone passes `?limit=-5`. | Add: `const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 20, 50))` |

---

## 2. Architecture Flaws

### CRITICAL: Unused Parameter & Dead Code

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `hashtags.mjs` line 117 | **Dead code**: `period` query parameter is accepted (`?period=24h|7d|30d`) but **never used**. The trending endpoint always returns the same data regardless of period. | Either implement weekly count reset logic via cron job, or remove the unused parameter and update API docs. |
| **CRITICAL** | `HashtagChip.tsx` line 89-91 | **Syntax error**: The styled-component template is truncated mid-line with incomplete `color-mix()` call. This will cause build failure. | Complete the hover state: `background: color-mix(in srgb, ${$color} 30%, var(--bg-elevated, #141419));` |
| **HIGH** | `hashtags.mjs` lines 155-170 | The `suggestions` endpoint makes **5 separate database queries** that could be combined into 2-3. This is an N+1 pattern. | Use Sequelize `include` with `through` to fetch used/followed tags in one query. |

### HIGH: Prop Drilling & Component Issues

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `HashtagChip.tsx` entire file | The component imports `Hash` and `CheckCircle` from `lucide-react` but **never uses them**. Dead imports. | Remove unused imports or implement the icons in the render. |
| **MEDIUM** | `HashtagChip.tsx` | No error boundary or null check for `hashtag` prop. If parent passes `null` or `undefined`, runtime crash. | Add: `if (!hashtag) return null;` at component start |

---

## 3. Integration Issues

### HIGH: Frontend-Backend Contract Mismatch

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `hashtags.mjs` line 225 | The `:slug` endpoint returns `posts` array but doesn't include `hashtags` on each post object. Frontend's `PostCard` likely expects hashtags. | Add `include: [{ model: Hashtag, as: 'hashtags', attributes: ['id', 'name', 'slug'] }]` to the SocialPost query. |
| **MEDIUM** | `posts.mjs` line 201 | The feed returns `pagination.total` from `SocialPost.count()` which doesn't respect the hashtag/category filters properly — it counts before applying all WHERE clauses. | Move count query inside the filter logic or use a subquery. |

### MEDIUM: Missing Loading/Error States

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `hashtags.mjs` line 117 | No validation for invalid `category` values — silently ignores invalid category and returns all. | Return 400 for invalid category: `if (category && !['fitness',...].includes(category)) return res.status(400)...` |
| **MEDIUM** | `posts.mjs` line 68 | No validation for non-numeric `limit`/`offset` — passes through to SQL which may error or return unexpected results. | Add explicit validation with defaults. |

---

## 4. Dead Code & Tech Debt

### HIGH: Unused Code & TODO Items

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `hashtags.mjs` line 117 | **TODO not implemented**: The `period` parameter for trending hashtags is accepted but has no implementation. | Either implement weekly count reset via scheduled job, or document as "coming soon" and remove from API. |
| **MEDIUM** | `Hashtag.mjs` lines 22-30 | `CATEGORY_KEYWORDS` is a large static object. If this grows larger, consider moving to database table for admin management. | Low priority — acceptable for MVP |
| **MEDIUM** | `posts.mjs` lines 35-36 | `isLegacySocialTableMissingError` function is a workaround for missing tables. This indicates incomplete migration. | Complete the migration to create legacy tables. |

### LOW: Commented Code

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **LOW** | `posts.mjs` line 261 | Comment: `// With memory storage, no temp file cleanup needed` — this is fine but could be a TODO to add cleanup logic for disk storage fallback. | Acceptable — document in tech spec |

---

## 5. Production Readiness

### CRITICAL: Console.log Statements

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **CRITICAL** | `posts.mjs` lines 91, 104, 116 | Multiple `console.log` statements for point awards (`✅ Awarded ${pointsToAward} points...`) will ship to production and pollute logs. | Replace with proper logger: `logger.info('Points awarded', { userId, action, points })` |
| **CRITICAL** | `hashtags.mjs` lines 87, 89 | `console.warn` for hashtag processing failures. While less severe, these should use the imported `logger`. | Replace with `logger.warn(...)` |

### HIGH: Missing Input Validation

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **HIGH** | `hashtags.mjs` line 193 | `req.params.slug` is used directly without sanitization. While Sequelize escapes values, empty slug would match unintended records. | Add: `if (!slug || slug.length < 2) return res.status(400)...` |
| **HIGH** | `posts.mjs` line 254 | `type` parameter accepts any string but only certain types award points. No validation allows invalid types. | Add validation: `const VALID_TYPES = ['general', 'workout', 'transformation', ...]; if (!VALID_TYPES.includes(type)) ...` |

### MEDIUM: Rate Limiting & Performance

| Severity | File & Line | What's Wrong | Fix |
|----------|-------------|--------------|-----|
| **MEDIUM** | `hashtags.mjs` line 155 | The `suggestions` endpoint could be expensive with many posts. No pagination on the underlying post queries. | Add `limit: 20` to the `SocialPost.findAll` call. |
| **MEDIUM** | `posts.mjs` line 145 | Friend ID extraction loads ALL friendships into memory. For users with 1000+ friends, this is problematic. | Add pagination or use cursor-based friend retrieval. |

---

## Summary Table

| Category | Count |
|----------|-------|
| CRITICAL | 8 |
| HIGH | 10 |
| MEDIUM | 10 |
| LOW | 2 |

## Top 5 Ship Blockers

1. **`processHashtags` dynamic import in loop** — Performance + correctness
2. **No decrement of hashtag counts on post delete** — Data integrity
3. **Console.log statements in production** — Log pollution
4. **Missing transaction in hashtag processing** — Data consistency
5. **Styled-component syntax error in HashtagChip** — Build failure

---

## Recommended Immediate Actions

```javascript
// 1. Fix processHashtags - move import outside loop
export async function processHashtags(postId, tagNames, transaction = null) {
  if (!tagNames || tagNames.length === 0) return [];
  // IMPORT ONCE AT TOP
  const { classifyHashtag } = await import('../../models/social/Hashtag.mjs');
  // ... rest of function
}

// 2. Add transaction wrapping
export async function processHashtags(postId, tagNames, transaction = null) {
  const t = transaction || await sequelize.transaction();
  try {
    // ... all queries with { transaction: t }
    if (!transaction) await t.commit();
  } catch (err) {
    if (!transaction) await t.rollback();
    throw err;
  }
}

// 3. Fix HashtagChip.tsx line 89-91
  &:hover:not(:disabled) {
    background: color-mix(in srgb, ${$color} 30%, var(--bg-elevated, #141419));
    border-color: ${({ $color }) => $color};
  }
```

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
