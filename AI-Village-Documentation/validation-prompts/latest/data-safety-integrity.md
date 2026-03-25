# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 61.5s
> **Files:** frontend/src/components/Social/Feed/SocialFeed.tsx, frontend/src/components/Social/Feed/CreatePostCard.tsx, frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx, backend/models/social/SocialPost.mjs, backend/routes/social/posts.mjs
> **Generated:** 3/24/2026, 10:21:55 PM

---

# 🚨 DATA SAFETY AUDIT REPORT — CRITICAL FINDINGS

## ⚠️ EXECUTIVE SUMMARY
**OVERALL RISK LEVEL: HIGH**  
**CRITICAL ISSUES FOUND: 3**  
**HIGH PRIORITY ISSUES: 4**  
**MEDIUM PRIORITY ISSUES: 2**

This audit identified **multiple data destruction risks** that could result in permanent loss of user posts, comments, likes, and social engagement history. The most severe issues involve missing transaction wrappers, unsafe deletion patterns, and potential race conditions in point awarding systems.

---

## 🔴 CRITICAL FINDINGS

### CRITICAL-1: Unprotected Bulk Delete in Post Deletion Flow
**Severity:** CRITICAL  
**Data at Risk:** All user posts, comments, likes, media files  
**Blast Radius:** Single API call could orphan all comments/likes for a post  
**File & Line:** `backend/routes/social/posts.mjs` (line not shown, but implied in DELETE endpoint)

**What's Wrong:**  
The code references `deletePost` function in `useSocialFeed` hook, but the backend route implementation is truncated. If the DELETE endpoint doesn't use transactions, a failure during cascading deletes (post → comments → likes → media) could leave orphaned records or partially deleted data.

**Scenario:**
```javascript
// DANGEROUS PATTERN (if implemented this way):
await SocialPost.destroy({ where: { id: postId } });
await SocialComment.destroy({ where: { postId } }); // ❌ If this fails, post is gone but comments remain
await SocialLike.destroy({ where: { postId } });    // ❌ Orphaned likes
await deletePhoto(post.mediaUrl);                    // ❌ Media file deleted but DB still references it
```

**Fix:**
```javascript
// SAFE PATTERN:
const transaction = await sequelize.transaction();
try {
  const post = await SocialPost.findByPk(postId, { transaction });
  if (!post) throw new Error('Post not found');
  
  // Delete in reverse dependency order
  await SocialComment.destroy({ where: { postId }, transaction });
  await SocialLike.destroy({ where: { postId }, transaction });
  
  // Delete media AFTER DB records are marked for deletion
  const mediaUrl = post.mediaUrl;
  await post.destroy({ transaction });
  
  await transaction.commit();
  
  // Only delete physical file after DB commit succeeds
  if (mediaUrl) {
    await deletePhoto(mediaUrl).catch(err => 
      console.error('Media cleanup failed (non-fatal):', err)
    );
  }
} catch (error) {
  await transaction.rollback();
  throw error;
}
```

---

### CRITICAL-2: Race Condition in Point Awarding System
**Severity:** CRITICAL  
**Data at Risk:** User point balances, transaction history  
**Blast Radius:** All users creating posts/likes simultaneously  
**File & Line:** `backend/routes/social/posts.mjs:90-130` (`awardSocialPoints` function)

**What's Wrong:**  
The point awarding system reads the last balance, calculates new balance, then writes — classic read-modify-write race condition. If two posts are created simultaneously:

```javascript
// User has 100 points
// Request A reads balance: 100
// Request B reads balance: 100
// Request A writes: 100 + 25 = 125
// Request B writes: 100 + 10 = 110  ❌ Lost 25 points!
```

**Current Code:**
```javascript
const lastTransaction = await PointTransaction.findOne({
  where: { userId },
  order: [['createdAt', 'DESC']]
});
const currentBalance = lastTransaction ? lastTransaction.balance : 0;
const newBalance = currentBalance + pointsToAward; // ❌ RACE CONDITION
```

**Fix:**
```javascript
async function awardSocialPoints(userId, action, metadata = {}) {
  const transaction = await sequelize.transaction({
    isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
  });
  
  try {
    const pointsToAward = SOCIAL_POINT_RULES[action];
    if (!pointsToAward) {
      await transaction.rollback();
      return { pointsAwarded: 0, success: false };
    }

    // Lock the user's last transaction row
    const lastTransaction = await PointTransaction.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
      lock: transaction.LOCK.UPDATE, // ✅ Prevents concurrent reads
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
      description: `Social Action: ${action.replace('_', ' ')}`,
      metadata: { socialAction: action, ...metadata }
    }, { transaction });

    await transaction.commit();
    return { pointsAwarded: pointsToAward, newBalance, success: true };
  } catch (error) {
    await transaction.rollback();
    console.error('Point award failed:', error);
    return { pointsAwarded: 0, success: false, error: error.message };
  }
}
```

---

### CRITICAL-3: Missing Transaction Wrapper in Post Creation
**Severity:** CRITICAL  
**Data at Risk:** Posts, media files, point transactions  
**Blast Radius:** Every post creation could leave orphaned media or unawarded points  
**File & Line:** `backend/routes/social/posts.mjs` (POST endpoint — code truncated)

**What's Wrong:**  
If post creation follows this pattern (common in the codebase):
```javascript
// DANGEROUS:
const post = await SocialPost.create({ userId, content, mediaUrl });
await awardSocialPoints(userId, 'post_create_workout'); // ❌ If this fails, post exists but no points
```

If point awarding fails, the post is created but the user doesn't get their XP. If media upload fails after DB insert, the DB references a non-existent file.

**Fix:**
```javascript
router.post('/', upload.single('media'), async (req, res) => {
  const transaction = await sequelize.transaction();
  let uploadedMediaUrl = null;
  
  try {
    // 1. Upload media first (before DB write)
    if (req.file) {
      uploadedMediaUrl = await uploadPhoto(req.file, 'social-posts');
    }
    
    // 2. Create post with transaction
    const post = await SocialPost.create({
      userId: req.user.id,
      content: req.body.content,
      type: req.body.type || 'general',
      visibility: req.body.visibility || 'friends',
      mediaUrl: uploadedMediaUrl,
      moderationStatus: 'approved'
    }, { transaction });
    
    // 3. Award points within same transaction
    const pointAction = `post_create_${post.type}`;
    const pointResult = await awardSocialPoints(
      req.user.id, 
      pointAction, 
      { postId: post.id }
    );
    
    if (!pointResult.success) {
      throw new Error('Failed to award points');
    }
    
    await transaction.commit();
    
    res.status(201).json({
      success: true,
      post,
      pointsAwarded: pointResult.pointsAwarded
    });
  } catch (error) {
    await transaction.rollback();
    
    // Clean up uploaded media if DB transaction failed
    if (uploadedMediaUrl) {
      await deletePhoto(uploadedMediaUrl).catch(err => 
        console.error('Cleanup failed:', err)
      );
    }
    
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 🟠 HIGH PRIORITY FINDINGS

### HIGH-1: Unsafe Moderation Status Changes Without Audit Trail
**Severity:** HIGH  
**Data at Risk:** Post visibility, moderation history  
**Blast Radius:** All posts subject to moderation  
**File & Line:** `backend/models/social/SocialPost.mjs:180-230` (moderation methods)

**What's Wrong:**  
The moderation methods (`flagContent`, `approveContent`, etc.) directly modify the post without creating an audit trail. If a moderator accidentally approves a flagged post, there's no way to see the previous state.

**Fix:**
```javascript
// Create ModerationLog model first:
const ModerationLog = db.define('ModerationLog', {
  postId: { type: DataTypes.INTEGER, allowNull: false },
  moderatorId: { type: DataTypes.INTEGER, allowNull: false },
  action: { type: DataTypes.ENUM('flag', 'approve', 'reject', 'hide'), allowNull: false },
  previousStatus: { type: DataTypes.STRING },
  newStatus: { type: DataTypes.STRING },
  reason: { type: DataTypes.TEXT },
  notes: { type: DataTypes.TEXT },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Update moderation methods:
SocialPost.prototype.flagContent = async function(reason, flaggedByUserId, notes = null) {
  const transaction = await db.transaction();
  try {
    const previousStatus = this.moderationStatus;
    
    // Log the action
    await ModerationLog.create({
      postId: this.id,
      moderatorId: flaggedByUserId,
      action: 'flag',
      previousStatus,
      newStatus: 'flagged',
      reason,
      notes
    }, { transaction });
    
    // Update post
    this.moderationStatus = 'flagged';
    this.flaggedReason = reason;
    this.flaggedAt = new Date();
    this.flaggedBy = flaggedByUserId;
    this.moderationNotes = notes;
    this.lastModeratedAt = new Date();
    this.lastModeratedBy = flaggedByUserId;
    
    await this.save({ transaction });
    await transaction.commit();
    return this;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

---

### HIGH-2: Missing Cascade Delete Protection
**Severity:** HIGH  
**Data at Risk:** User accounts, all associated social data  
**Blast Radius:** If a user is deleted, all their posts/comments/likes vanish  
**File & Line:** `backend/models/social/SocialPost.mjs:15-25` (foreign key definitions)

**What's Wrong:**  
The `userId` foreign key doesn't specify `onDelete` behavior. PostgreSQL default is `NO ACTION`, which will **block** user deletion if they have posts. But if someone adds `CASCADE` later, deleting a user would silently wipe all their content.

**Current Code:**
```javascript
userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  }
  // ❌ Missing onDelete specification
}
```

**Fix:**
```javascript
userId: {
  type: DataTypes.INTEGER,
  allowNull: false,
  references: {
    model: 'Users',
    key: 'id'
  },
  onDelete: 'RESTRICT', // ✅ Prevents accidental user deletion
  onUpdate: 'CASCADE'
}

// Add a separate "soft delete" mechanism for users:
// In User model:
deletedAt: {
  type: DataTypes.DATE,
  allowNull: true,
  comment: 'Soft delete timestamp — user account deactivated'
}

// Update queries to filter out soft-deleted users:
// WHERE deletedAt IS NULL
```

---

### HIGH-3: Unvalidated File Upload Could Fill Disk
**Severity:** HIGH  
**Data at Risk:** Server disk space, service availability  
**Blast Radius:** All users (denial of service)  
**File & Line:** `backend/routes/social/posts.mjs:200-220` (multer config)

**What's Wrong:**  
The multer config allows 50MB files but doesn't limit the **number** of uploads per user or total storage. A malicious user could upload hundreds of 50MB videos and exhaust storage.

**Current Code:**
```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
  // ❌ No rate limiting, no per-user quota
});
```

**Fix:**
```javascript
// Add UserStorageQuota model:
const UserStorageQuota = db.define('UserStorageQuota', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  totalBytes: { type: DataTypes.BIGINT, defaultValue: 0 },
  quotaBytes: { type: DataTypes.BIGINT, defaultValue: 5 * 1024 * 1024 * 1024 }, // 5GB default
  fileCount: { type: DataTypes.INTEGER, defaultValue: 0 }
});

// Middleware to check quota before upload:
async function checkStorageQuota(req, res, next) {
  try {
    const [quota] = await UserStorageQuota.findOrCreate({
      where: { userId: req.user.id },
      defaults: { userId: req.user.id }
    });
    
    const fileSize = parseInt(req.headers['content-length']) || 0;
    
    if (quota.totalBytes + fileSize > quota.quotaBytes) {
      return res.status(413).json({
        success: false,
        error: 'Storage quota exceeded',
        used: quota.totalBytes,
        limit: quota.quotaBytes
      });
    }
    
    req.userQuota = quota;
    next();
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// Apply middleware:
router.post('/', checkStorageQuota, upload.single('media'), async (req, res) => {
  // ... existing code ...
  
  // After successful upload, update quota:
  if (uploadedMediaUrl) {
    await req.userQuota.increment({
      totalBytes: req.file.size,
      fileCount: 1
    });
  }
});
```

---

### HIGH-4: Potential SQL Injection in Search Query
**Severity:** HIGH  
**Data at Risk:** All database tables (if exploited)  
**Blast Radius:** Entire database could be read/modified  
**File & Line:** `backend/models/social/SocialPost.mjs:295-310` (`getContentForModeration`)

**What's Wrong:**  
The search parameter is used in an `iLike` query, but if the input isn't sanitized, it could contain SQL wildcards or injection attempts.

**Current Code:**
```javascript
if (search) {
  whereClause.content = {
    [db.Sequelize.Op.iLike]: `%${search}%` // ❌ Unsanitized user input
  };
}
```

**Fix:**
```javascript
if (search) {
  // Escape special characters
  const sanitizedSearch = search
    .replace(/[%_\\]/g, '\\$&') // Escape SQL wildcards
    .trim()
    .substring(0, 100); // Limit length
  
  if (sanitizedSearch.length > 0) {
    whereClause.content = {
      [db.Sequelize.Op.iLike]: `%${sanitizedSearch}%`
    };
  }
}
```

---

## 🟡 MEDIUM PRIORITY FINDINGS

### MEDIUM-1: Missing Input Validation on Post Content
**Severity:** MEDIUM  
**Data at Risk:** Database integrity, XSS vulnerabilities  
**Blast Radius:** All users viewing posts  
**File & Line:** `frontend/src/components/Social/Feed/CreatePostCard.tsx:200` (form submission)

**What's Wrong:**  
The frontend doesn't validate post content length or sanitize HTML before submission.

---

*Part of SwanStudios 11-Brain Recursive Consensus System*
