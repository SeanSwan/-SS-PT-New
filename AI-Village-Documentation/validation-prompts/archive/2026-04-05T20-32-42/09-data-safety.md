# Data Safety & Integrity — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.6-sonnet-20260217 | **Duration:** 70.4s
> **Files:** docs/ai-workflow/blueprints/SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
> **Generated:** 4/5/2026, 1:32:42 PM

---

# DATA SAFETY AUDIT REPORT
## SwanStudios — SWAN-COACH-MARKETING-CONTENT-STUDIO-PLAN.md
### Auditor: Production Data Safety Review | Classification: CRITICAL INFRASTRUCTURE PLANNING DOCUMENT

---

> **AUDIT SCOPE DECLARATION**
>
> The submitted file is a **Markdown planning/blueprint document** — not executable code. It contains no SQL, no Sequelize models, no migration files, no API route handlers, no seed scripts, and no JavaScript/TypeScript. There are zero lines of code that can directly execute a `DELETE`, `DROP`, `sync({ force: true })`, or any other destructive database operation.
>
> **However:** This document is a *deployment blueprint* for a production SaaS platform with real paying customers. As a data safety auditor, my obligation is to treat every architectural decision described here as if it were already in production — because it will be. The findings below address **design-level risks** that, if implemented naively, WILL destroy user data.
>
> Every finding below maps to a specific section of the plan and describes the exact production failure mode it would create.

---

## EXECUTIVE RISK SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 4 | Must be resolved before any implementation begins |
| 🟠 HIGH | 7 | Must be resolved before production deployment |
| 🟡 MEDIUM | 6 | Must be resolved before public launch |
| 🔵 LOW | 4 | Address in hardening pass |

**Overall Risk Rating: HIGH** — The plan describes several architectural patterns that, if implemented without explicit safeguards, will result in data loss, credential exposure, or permanent user lockout on a platform with real paying customers.

---

## 🔴 CRITICAL FINDINGS

---

### CRITICAL-01: SecurityAlert Migration Has No Defined Schema — Risk of Accidental Table Collision

**Severity:** CRITICAL
**Data at Risk:** All existing tables if migration filename collides or runs `sync({ force: true })` during setup
**Blast Radius:** ALL users — entire database
**File & Line:** Section 8, "New Files Needed" table — `backend/migrations/2026XXXX-create-security-alerts.cjs`

**What's Wrong:**

The migration filename uses `2026XXXX` as a placeholder timestamp. Sequelize migrations execute in **lexicographic timestamp order**. If this placeholder is committed to the repository and a developer runs `npx sequelize-cli db:migrate` in production before filling in the real timestamp, one of two failure modes occurs:

1. **Collision with existing migration:** If `2026XXXX` sorts before a real migration that already ran, Sequelize may attempt to re-run previously applied migrations depending on the `SequelizeMeta` table state, potentially re-creating tables that already exist with `CREATE TABLE IF NOT EXISTS` — or worse, if the migration uses `queryInterface.dropTable()` before `createTable()` (a common pattern developers copy from examples), it **drops the existing table first**.

2. **Developer "fixes" it with `sync({ force: true })`:** The plan mentions no explicit migration strategy. When a developer sees the placeholder migration fail, the fastest "fix" is `sequelize.sync({ force: true })` — which drops and recreates ALL tables. This would wipe Users, Orders, Sessions, WorkoutHistory, and every other table in the database.

The plan provides no guard against this. There is no mention of:
- A staging environment migration dry-run requirement
- A `db:migrate:status` check before deployment
- A prohibition on `sync({ force: true })` in production

**Fix:**

```javascript
// backend/migrations/20260405120000-create-security-alerts.cjs
// RULE: Timestamp must be set to ACTUAL creation datetime before commit
// RULE: NEVER use sync({ force: true }) or sync({ alter: true }) in production
// RULE: Always run db:migrate:status on staging before production

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists before creating
    // Prevents failure if migration is accidentally re-run
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('SecurityAlerts'));
    
    if (tableExists) {
      console.log('SecurityAlerts table already exists — skipping creation');
      return;
    }

    await queryInterface.createTable('SecurityAlerts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      cveId: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true, // Prevents duplicate CVE entries
      },
      severity: {
        type: Sequelize.ENUM('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'),
        allowNull: false,
      },
      affectedPackage: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      installedVersion: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      fixedVersion: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      cvssScore: {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      isResolved: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      resolvedBy: {
        type: Sequelize.UUID,
        allowNull: true,
        // FK to Users.id — but NO CASCADE DELETE
        // If admin user is deleted, alert history must be preserved
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'SET NULL', // NEVER CASCADE — preserve audit history
        onUpdate: 'CASCADE',
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      source: {
        type: Sequelize.STRING(100),
        allowNull: true, // 'github-advisory', 'npm-audit', 'nvd', 'cisa-kev', 'cvefeed'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes after table creation
    await queryInterface.addIndex('SecurityAlerts', ['cveId'], {
      unique: true,
      name: 'security_alerts_cve_id_unique',
    });
    await queryInterface.addIndex('SecurityAlerts', ['severity'], {
      name: 'security_alerts_severity_idx',
    });
    await queryInterface.addIndex('SecurityAlerts', ['isResolved'], {
      name: 'security_alerts_resolved_idx',
    });
  },

  async down(queryInterface, Sequelize) {
    // SAFETY: This down() will only run if explicitly called via db:migrate:undo
    // It will NOT run automatically
    // PRODUCTION RULE: Never run db:migrate:undo in production without a backup
    await queryInterface.dropTable('SecurityAlerts');
  },
};
```

**Additionally, add this to CLAUDE.md and deployment runbook:**

```markdown
## MIGRATION SAFETY RULES (NON-NEGOTIABLE)

1. NEVER use `sequelize.sync({ force: true })` in any environment connected to production data
2. NEVER use `sequelize.sync({ alter: true })` in production — use migrations only
3. ALL migration filenames must use real timestamps: `YYYYMMDDHHmmss-description.cjs`
4. Before ANY migration runs in production:
   a. Run `npx sequelize-cli db:migrate:status` on staging first
   b. Verify the migration list matches expectations
   c. Take a database backup (pg_dump) before running
5. NEVER run `db:migrate:undo` in production without a verified backup
6. All migrations MUST have a working `down()` function
```

---

### CRITICAL-02: OAuth Token Storage — Plan Describes Encryption But Provides No Implementation Guard Against Plaintext Fallback

**Severity:** CRITICAL
**Data at Risk:** Social platform OAuth tokens (Facebook, Instagram, TikTok, BlueSky) — if leaked, attacker can post as SwanStudios on all platforms
**Blast Radius:** Platform reputation, all social accounts, potential regulatory exposure
**File & Line:** Section 9, "Credential Storage (CRITICAL — Village Finding)" — `PlatformCredential` model

**What's Wrong:**

The plan correctly identifies that OAuth tokens must be stored encrypted (AES-256-GCM) and not in `.env` files. However, the plan describes a `PlatformCredential` model with no implementation specification. This creates a **critical implementation gap**: developers building this model will reach for the simplest Sequelize pattern, which stores values as plaintext `STRING` columns. The plan says "AES-256-GCM encryption, key from Render secrets" but provides no hook, no getter/setter pattern, and no enforcement mechanism.

The specific failure mode: a developer creates the model, stores tokens as `Sequelize.TEXT`, the feature works in testing, ships to production, and 50,000 OAuth tokens sit in plaintext in the PostgreSQL database. A single SQL injection vulnerability (which the plan acknowledges as a risk in blog/social content endpoints) would expose every social platform credential.

Additionally, the plan states "Frontend NEVER receives actual tokens — only boolean `isConfigured`" — but provides no enforcement pattern. Without an explicit Sequelize `defaultScope` that excludes token fields, any `PlatformCredential.findAll()` call in a route handler will return the raw token data, and a developer who doesn't know about this rule will accidentally serialize it into an API response.

**Fix:**

```javascript
// backend/models/PlatformCredential.mjs
// SECURITY-CRITICAL: This model handles OAuth tokens for social platforms
// READ ALL COMMENTS BEFORE MODIFYING

import { Model, DataTypes } from 'sequelize';
import crypto from 'crypto';

// Encryption configuration
// KEY must be 32 bytes (256 bits) for AES-256-GCM
// NEVER derive this from a password — use a cryptographically random key
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY; // Must be 64-char hex string
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  // Fail hard at startup — do not allow the app to run without encryption key
  throw new Error(
    'CREDENTIAL_ENCRYPTION_KEY must be set and must be a 64-character hex string. ' +
    'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

function encrypt(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Store as: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return null;
  try {
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error('Invalid ciphertext format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  } catch (err) {
    // Log the error ID but NEVER log the ciphertext or key
    console.error('Decryption failed for credential — possible key rotation or data corruption');
    return null;
  }
}

class PlatformCredential extends Model {
  // SAFETY: This method is the ONLY way to get token data
  // It requires explicit opt-in — prevents accidental exposure
  getDecryptedToken(fieldName) {
    const encrypted = this.getDataValue(fieldName);
    return decrypt(encrypted);
  }

  // SAFETY: Returns ONLY safe fields for API responses
  // Use this in ALL route handlers — never serialize the raw model
  toSafeJSON() {
    return {
      id: this.id,
      platform: this.platform,
      isConfigured: this.isConfigured,
      // NEVER include: accessToken, refreshToken, clientSecret
      tokenExpiresAt: this.tokenExpiresAt,
      lastRefreshedAt: this.lastRefreshedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

PlatformCredential.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    platform: {
      type: DataTypes.ENUM(
        'facebook', 'instagram', 'tiktok', 'bluesky',
        'nextdoor', 'youtube', 'linkedin', 'late_dev', 'blotato'
      ),
      allowNull: false,
      unique: true, // One credential set per platform
    },
    // ENCRYPTED FIELDS — stored as encrypted strings, NEVER plaintext
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) {
        this.setDataValue('accessToken', encrypt(value));
      },
      // NO get() — forces use of getDecryptedToken() for explicit opt-in
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) {
        this.setDataValue('refreshToken', encrypt(value));
      },
    },
    clientSecret: {
      type: DataTypes.TEXT,
      allowNull: true,
      set(value) {
        this.setDataValue('clientSecret', encrypt(value));
      },
    },
    // NON-SENSITIVE FIELDS
    isConfigured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    tokenExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRefreshedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onDelete: 'SET NULL', // NEVER CASCADE — preserve credential records
    },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    sequelize,
    modelName: 'PlatformCredential',
    tableName: 'PlatformCredentials',
    // DEFAULT SCOPE: Never return token fields in standard queries
    // Developers must explicitly use .scope('withTokens') to access encrypted data
    defaultScope: {
      attributes: {
        exclude: ['accessToken', 'refreshToken', 'clientSecret'],
      },
    },
    scopes: {
      // ONLY use this scope in the token refresh service — never in route handlers
      withTokens: {
        attributes: { include: ['accessToken', 'refreshToken', 'clientSecret'] },
      },
    },
  }
);

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
