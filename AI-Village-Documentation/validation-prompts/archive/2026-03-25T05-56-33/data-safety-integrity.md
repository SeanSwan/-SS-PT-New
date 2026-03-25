# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 65.5s
> **Files:** backend/models/social/Hashtag.mjs, backend/models/social/PostHashtag.mjs, backend/models/social/UserHashtagFollow.mjs, backend/routes/social/hashtags.mjs, backend/routes/social/posts.mjs, backend/models/social/index.mjs, frontend/src/components/Social/Hashtags/HashtagChip.tsx
> **Generated:** 3/24/2026, 10:56:33 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: MEDIUM-HIGH**

I've identified **7 CRITICAL/HIGH findings** that could result in data loss, orphaned records, or corrupted state. The most severe issues involve:
- Missing transaction wrappers for multi-table operations
- Potential for orphaned hashtag data during post deletion
- Race conditions in point awarding
- Unsafe DELETE operations without WHERE clause validation

---

## 🔴 CRITICAL FINDINGS

### CRITICAL-1: Post Deletion Orphans Hashtag Usage Counts
**Severity:** CRITICAL  
**Data at Risk:** Hashtag usage statistics (usageCount, weeklyCount)  
**Blast Radius:** All hashtags used in deleted posts — corrupted trending data affects all users  
**File & Line:** `backend/routes/social/posts.mjs:688-729` (DELETE /:postId route)

**What's Wrong:**
When a post is deleted, the CASCADE delete removes `PostHashtag` join records, but **does NOT decrement** the `Hashtag.usageCount` and `Hashtag.weeklyCount` fields. This means:
1. User creates post with #fitness → usageCount increments to 1000
2. User deletes post → PostHashtag record deleted via CASCADE
3. **Hashtag.usageCount still shows 1000** (should be 999)
4. Over time, trending hashtags show inflated counts that never decrease

**Fix:**
```javascript
// In DELETE /:postId route, BEFORE post.destroy():

// Fetch hashtags linked to this post
const linkedHashtags = await PostHashtag.findAll({
  where: { postId },
  attributes: ['hashtagId']
});

// Decrement usage counts for each hashtag
if (linkedHashtags.length > 0) {
  const hashtagIds = linkedHashtags.map(ph => ph.hashtagId);
  await Hashtag.decrement(
    ['usageCount', 'weeklyCount'],
    { where: { id: { [Op.in]: hashtagIds } } }
  );
}

// NOW safe to delete the post (CASCADE will remove PostHashtag records)
await post.destroy();
```

---

### CRITICAL-2: Hashtag Processing Lacks Transaction Wrapper
**Severity:** CRITICAL  
**Data at Risk:** Post-hashtag associations, hashtag counts  
**Blast Radius:** Single post creation failure could leave partial data (post exists but hashtags not linked, or counts incremented but join records missing)  
**File & Line:** `backend/routes/social/hashtags.mjs:47-91` (processHashtags function)

**What's Wrong:**
The `processHashtags` function performs **3 separate database operations per hashtag**:
1. `Hashtag.findOrCreate()` — creates/finds hashtag
2. `PostHashtag.findOrCreate()` — creates join record
3. `hashtag.increment()` — updates usage counts

If the server crashes or database connection drops between steps 2 and 3, you get:
- Post linked to hashtag ✅
- Usage count NOT incremented ❌
- Trending algorithm shows wrong data forever

**Fix:**
```javascript
// In POST / route (posts.mjs:~line 560), wrap the entire post creation + hashtag processing in a transaction:

const transaction = await sequelize.transaction();
try {
  // Create the post
  const post = await SocialPost.create(postData, { transaction });

  // Process hashtags INSIDE the transaction
  let linkedHashtags = [];
  try {
    const { extractHashtags, processHashtags } = await import('./hashtags.mjs');
    const tagNames = extractHashtags(content);
    if (tagNames.length > 0) {
      linkedHashtags = await processHashtags(post.id, tagNames, transaction); // ← Pass transaction
    }
  } catch (hashtagErr) {
    // If hashtag processing fails, rollback the entire post creation
    throw hashtagErr;
  }

  await transaction.commit();
  
  // Award points AFTER commit (non-critical, can fail independently)
  const pointResult = await awardSocialPoints(...);
  
  // ... rest of response
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

**Also update processHashtags signature:**
```javascript
// In hashtags.mjs, ensure ALL operations use the transaction:
export async function processHashtags(postId, tagNames, transaction = null) {
  // ... existing code, but ensure EVERY query passes { transaction }
  const [hashtag] = await Hashtag.findOrCreate({
    where: { name },
    defaults: { ... },
    transaction // ← Must be passed to ALL operations
  });
  
  await PostHashtag.findOrCreate({
    where: { postId, hashtagId: hashtag.id },
    defaults: { postId, hashtagId: hashtag.id },
    transaction // ← Here too
  });
  
  await hashtag.increment(['usageCount', 'weeklyCount'], { transaction }); // ← And here
}
```

---

### HIGH-1: Point Awarding Race Condition
**Severity:** HIGH  
**Data at Risk:** User point balances, PointTransaction records  
**Blast Radius:** Individual users could have incorrect point totals if two actions happen simultaneously  
**File & Line:** `backend/routes/social/posts.mjs:72-110` (awardSocialPoints function)

**What's Wrong:**
The point awarding logic has a **read-modify-write race condition**:
```javascript
// Thread A reads balance: 100
const lastTransaction = await PointTransaction.findOne({ where: { userId }, order: [['createdAt', 'DESC']] });
const currentBalance = lastTransaction ? lastTransaction.balance : 0; // 100

// Thread B reads balance: 100 (same time)
// Thread A writes new balance: 110 (100 + 10)
// Thread B writes new balance: 125 (100 + 25) ← OVERWRITES Thread A's update
```

If a user likes a post and comments on it at the exact same moment, one of the point awards will be lost.

**Fix:**
```javascript
async function awardSocialPoints(userId, action, metadata = {}) {
  const pointsToAward = SOCIAL_POINT_RULES[action];
  if (!pointsToAward) return { pointsAwarded: 0, success: false };

  // Use a transaction with row-level locking
  const transaction = await sequelize.transaction();
  try {
    // Lock the user's latest transaction row to prevent concurrent updates
    const lastTransaction = await PointTransaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
      lock: transaction.LOCK.UPDATE, // ← Prevents race condition
      transaction
    });
    
    const currentBalance = lastTransaction ? lastTransaction.balance : 0;
    const newBalance = currentBalance + pointsToAward;

    await PointTransaction.create({
      userId,
      points: pointsToAward,
      balance: newBalance,
      transactionType: 'earn',
      source: 'social_engagement',
      description: `Social Action: ${action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
      metadata: { socialAction: action, ...metadata }
    }, { transaction });

    await transaction.commit();
    return { pointsAwarded: pointsToAward, newBalance, success: true, action };
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ Error awarding social points for ${action}:`, error);
    return { pointsAwarded: 0, success: false, error: error.message };
  }
}
```

---

### HIGH-2: Unfollow Hashtag Missing WHERE Clause Validation
**Severity:** HIGH  
**Data at Risk:** UserHashtagFollow records  
**Blast Radius:** If hashtagId is null/undefined, could delete ALL of a user's follows  
**File & Line:** `backend/routes/social/hashtags.mjs:341-354` (DELETE /unfollow/:hashtagId)

**What's Wrong:**
```javascript
router.delete('/unfollow/:hashtagId', async (req, res) => {
  const hashtagId = parseInt(req.params.hashtagId);
  await UserHashtagFollow.destroy({
    where: { userId: req.user.id, hashtagId } // ← If hashtagId is NaN, this becomes { userId: 123, hashtagId: NaN }
  });
```

If `req.params.hashtagId` is malformed (e.g., `/unfollow/abc`), `parseInt()` returns `NaN`. Sequelize might interpret this as:
```sql
DELETE FROM "UserHashtagFollows" WHERE "userId" = 123 AND "hashtagId" IS NULL;
```
This could delete **all follows where hashtagId is NULL** (if any exist due to data corruption).

**Fix:**
```javascript
router.delete('/unfollow/:hashtagId', async (req, res) => {
  try {
    const hashtagId = parseInt(req.params.hashtagId);
    
    // Validate hashtagId is a positive integer
    if (!Number.isFinite(hashtagId) || hashtagId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid hashtag ID' 
      });
    }
    
    const deleted = await UserHashtagFollow.destroy({
      where: { userId: req.user.id, hashtagId }
    });
    
    if (deleted === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'You are not following this hashtag' 
      });
    }

    return res.json({ success: true, message: 'Unfollowed hashtag' });
  } catch (error) {
    console.error('Error unfollowing hashtag:', error);
    return res.status(500).json({ success: false, message: 'Failed to unfollow hashtag' });
  }
});
```

---

## 🟠 MEDIUM FINDINGS

### MEDIUM-1: Comment Deletion Doesn't Decrement Post Count in Transaction
**Severity:** MEDIUM  
**Data at Risk:** Post.commentsCount field  
**Blast Radius:** Single post's comment count could be off by 1 if deletion fails partway  
**File & Line:** `backend/routes/social/posts.mjs:1011-1050` (DELETE /:postId/comments/:commentId)

**What's Wrong:**
```javascript
await comment.destroy(); // ← Deletes comment
if (post.commentsCount > 0) {
  post.commentsCount -= 1;
  await post.save(); // ← If this fails, comment is deleted but count not updated
}
```

**Fix:**
```javascript
const transaction = await sequelize.transaction();
try {
  await comment.destroy({ transaction });
  
  if (post.commentsCount > 0) {
    post.commentsCount -= 1;
    await post.save({ transaction });
  }
  
  await transaction.commit();
  return res.status(200).json({ success: true, message: 'Comment deleted successfully' });
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

### MEDIUM-2: Post Report Duplicate Check Race Condition
**Severity:** MEDIUM  
**Data at Risk:** PostReports table (duplicate reports)  
**Blast Radius:** Single user could submit duplicate reports if they click twice quickly  
**File & Line:** `backend/routes/social/posts.mjs:803-852` (POST /:postId/report)

**What's Wrong:**
The duplicate check is not atomic:
```javascript
const [existing] = await sequelize.query(`SELECT id FROM "PostReports" WHERE ...`);
if (existing && existing.length > 0) {
  return res.status(409).json({ success: false, message: 'You have already reported this post' });
}
// ← Another request could insert here before the next line executes
await sequelize.query(`INSERT INTO "PostReports" ...`);
```

**Fix:**
Add a unique constraint to the database schema:
```sql
-- Migration file
ALTER TABLE "PostReports" 
ADD CONSTRAINT unique_user_content_report 
UNIQUE ("reporterId", "contentType", "contentId");
```

Then handle the constraint violation in code:
```javascript
try {
  await sequelize.query(`INSERT INTO "PostReports" ...`);
} catch (error) {
  if (error.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({ success: false, message: 'You have already reported this post' });
  }
  throw error;
}
```

---

### MEDIUM-3: Hashtag Extraction Doesn't Validate Against Banned Tags
**Severity:** MEDIUM  
**Data at Risk:** Hashtag.isBanned enforcement  
**Blast Radius:** Users could create posts with banned hashtags if they type them manually  
**File & Line:** `backend/routes/social/hashtags.mjs:47-91` (processHashtags function)

**What's Wrong:**
The `processHashtags` function skips banned hashtags AFTER creating the join record:
```javascript
const [hashtag] = await Hashtag.findOrCreate({ where: { name }, defaults: { ... } });
if (hashtag.isBanned) continue; // ← PostHashtag record already created above
```

This means:
1. User types `#bannedword` in post
2. `PostHashtag` record created linking post to banned hashtag
3. Code skips incrementing usage count
4. **But the link still exists in the database**

**Fix:**
```javascript
// Check if hashtag is banned BEFORE creating the join record
const [hashtag, created] = await Hashtag.findOrCreate({
  where: { name },
  defaults: { name, slug: name, category: classifyHashtag(name), isOfficial: false, isBanned: false },
  ...(transaction ? { transaction } : {})
});

// Skip banned hashtags entirely
if (hashtag.isBanned) {
  console.warn(`Skipping banned hashtag: ${name}`);
  continue;
}

// NOW create the join record (only for non-banned tags)
await PostHashtag.findOrCreate({ ... });
```

---

## ✅ POSITIVE FINDINGS (Good Practices Observed)

1. **CASCADE Deletes Configured:** `PostHashtag` and `UserHashtagFollow` use `onDelete: 'CASCADE'`, preventing orphaned join records when posts/hashtags are deleted.
2. **Non-Fatal Hashtag Processing:** Hashtag extraction failures don't block post creation (line 575-578 in posts.mjs).
3. **Input Validation:** Hashtag names validated with regex `/^[a-z0-9_]{2,30}$/i` (Hashtag.mjs:60).
4. **Banned Hashtag Check:** `isBanned` flag prevents banned tags from appearing in trending/search results.

---

## 🔧 RECOMMENDED IMMEDIATE ACTIONS

### Priority 1 (Deploy This Week):
1. **Fix CRITICAL-1:** Add hashtag count decrement to post deletion route
2. **Fix CRITICAL-2:** Wrap post creation + hashtag processing in transaction
3. **Fix HIGH-1:** Add row-level locking to point awarding

### Priority 2 (Next Sprint):
4. **Fix HIGH-2:** Add input validation to unfollow route
5. **Fix MEDIUM-1:** Wrap comment deletion in transaction
6. **Add Database Constraint:** Unique index on `(reporterId, contentType, contentId)` in PostReports

### Priority 3 (Technical Debt):
7. **Add Integration Tests:** Test post deletion → verify hashtag counts decrement
8. **Add Monitoring:** Alert if `Hashtag.usageCount` diverges from actual `PostHashtag` count by >5%
9. **Weekly Cleanup Job:** Recalculate hashtag usage counts from PostHashtag table to fix drift

---

## 📊 RISK SUMMARY

| Severity | Count | Data Loss Risk | User Impact |
|----------|-------|----------------|-------------|
| CRITICAL | 2 | High (trending data corruption, partial writes) | All users (wrong trending tags

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
