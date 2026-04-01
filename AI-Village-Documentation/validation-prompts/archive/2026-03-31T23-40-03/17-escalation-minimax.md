# Smart Escalation (MiniMax M2.7) — Validation Report

> **Status:** PASS | **Model:** minimax/minimax-m2.7 | **Duration:** 104.1s
> **Files:** docs/ai-workflow/blueprints/MULTI-WORKSTREAM-QA-ENHANCEMENT-PLAN.md
> **Generated:** 3/31/2026, 4:40:03 PM

---

# Deep-Dive Analysis: CRITICAL Findings Classification

## Executive Summary

| Finding | Verdict | Blocking? | Priority | Approach |
|---------|---------|-----------|----------|----------|
| Unenforced PII-to-LLMs | ✅ **Genuinely CRITICAL** | **Yes** for AI features | P0 | Must resolve before any AI workstream |
| Unsecured file attachments | ⚠️ **Context-dependent** | Conditional | P0–P1 | Depends on current implementation state |
| Missing RBAC enforcement | ✅ **Genuinely CRITICAL** | **Yes** for multi-trainer flows | P0 | Must resolve before Workstream #4 |

---

## Finding 1: Unenforced PII-to-LLMs Policy

### 1a. Is This Truly CRITICAL?

**✅ LEGITIMATELY CRITICAL — Not over-classified.**

**Severity factors:**
- **Legal exposure:** Health-adjacent data (fitness metrics, body measurements, injury history) could trigger HIPAA considerations or GDPR if EU users exist
- **Payment-adjacent data:** Session purchases, subscription data tied to identities
- **High-net-worth clients:** SwanStudios appears to serve premium clientele — this increases targeted data breach liability
- **Third-party LLM transmission:** Data leaving your infrastructure to Gemini/OpenAI/Anthropic/Venice without scrubbing = potential violation of privacy policies and data processing agreements

**Risk scenario:**
```
User asks: "Show me progress for John Smith who has the knee injury"
     ↓
AI prompt includes: "Client: John Smith, Conditions: knee injury, Recent sessions: 12"
     ↓
This may be PII + health data transmitted to Google's/GAI's servers
     ↓
Without explicit DPA (Data Processing Agreement), this is problematic
```

### 1b. Specific Mitigation Strategy

```typescript
// NEW: middleware/piiScrubber.mjs
import { PresidioAnalyzer, PresidioAnonymizer } from '@microsoft/presidio';

const analyzer = new PresidioAnalyzer();
const anonymizer = new PresidioAnonymizer();

export async function scrubPII(text: string): Promise<ScrubbedPayload> {
  // Step 1: Analyze for PII entities
  const analysis = await analyzer.analyze(text, {
    languages: ['en'],
    entities: ['PERSON', 'PHONE_NUMBER', 'EMAIL', 'MEDICAL_CONDITION', 'DATE']
  });
  
  // Step 2: Anonymize detected PII
  const anonymized = await anonymizer.anonymize(text, analysis);
  
  // Step 3: Extract context-preserving placeholders
  const contextMap = extractContext(analysis, text); // "John Smith" → "[CLIENT_1]"
  
  return {
    safeText: anonymized.text,
    contextMap,
    piiDetected: analysis.length > 0
  };
}

// NEW: services/secureAIChatService.mjs
export async function sendToLLM(userPrompt: string, context: AIContext) {
  // Step 1: Fetch enriched data from DB (17 sources)
  const enrichedData = await aiChatService.fetchContext(context);
  
  // Step 2: Build prompt with real data
  const rawPrompt = buildPrompt(userPrompt, enrichedData);
  
  // Step 3: CRITICAL — Scrub before transmission
  const { safeText, contextMap } = await scrubPII(rawPrompt);
  
  // Step 4: Log for audit trail (never include PII in logs)
  auditLog.aiPrompt({
    contextType: context.type,
    contextMap, // Allows reconstruction for debugging without exposing PII
    piiDetected: !!contextMap.length
  });
  
  // Step 5: Transmit scrubbed prompt
  return llmProvider.route(safeText, { context: context.type });
}
```

**Additional controls:**
- Add PII detection to CI/CD pipeline (fail build if new AI endpoint lacks scrubbing)
- Create allowlist of approved fields for AI prompts
- Implement data retention policies for AI conversation logs

### 1c. Should This Block Implementation?

**✅ YES — For any workstream involving AI/LLM calls.**

| Workstream | Blocks on PII scrubber? |
|------------|------------------------|
| #1 Coach Assistant Fixes | **YES** — AI feature |
| #2 AI Command Testing | **YES** — Cannot test safely without scrubbing |
| #3 Session Routes QA | **NO** — No LLM involvement |
| #4 Master Schedule | **NO** — No LLM involvement |
| #5 Workout Planner QA | **LIKELY** — AI suggestions likely enabled |
| #6 Workout Log QA | **NO** — No LLM involvement |
| #7 Auto Research | **YES** — Framework involves LLM calls |
| #8 Skills Audit | **NO** — Repository-level |
| #9 CLAUDE.md | **NO** — Documentation |

### 1d. Priority Order

```
PRIORITY 0: Implement PII scrubber (Presidio or equivalent)
    ↓ After: Presidio integrated and tested with sample data
PRIORITY 1: Audit all existing AI endpoints (Workstream #1, #2)
    ↓ After: All endpoints verified clean
PRIORITY 2: Add automated PII detection to test suite
    ↓ Ongoing: Maintain as features evolve
```

---

## Finding 2: Unsecured File Attachment Handling

### 2a. Is This Truly CRITICAL?

**⚠️ CONTEXT-DEPENDENT — Potentially over-classified if files aren't implemented yet.**

**Scenario A: File uploads ARE currently implemented**
- **CRITICAL** — Unsecured uploads are a top OWASP vulnerability
- Arbitrary file upload → remote code execution risk
- Malicious PDFs/images → XSS or malware distribution
- Storage exhaustion → denial of service

**Scenario B: File uploads are NOT yet implemented**
- This is a **design requirement** for future features (e.g., progress photo uploads, exercise video attachments)
- Still important, but "blocks implementation" is premature
- Should be addressed when file features are planned

**Recommendation:** Determine current state before treating as P0 blocker.

**Quick audit to run:**
```bash
# Search for file upload patterns
grep -r "upload" --include="*.ts" --include="*.tsx" backend/ frontend/
grep -r "multer" --include="*.mjs" backend/
grep -r "formidable" --include="*.mjs" backend/
```

### 2b. Specific Mitigation Strategy (If Files Exist)

```typescript
// NEW: services/secureFileUploadService.mjs
import { createHash } from 'crypto';
import { lookup } from 'mime-types';

interface SecureUploadConfig {
  maxSizeMB: number;           // e.g., 10
  allowedMimeTypes: string[]; // ['image/jpeg', 'image/png', 'video/mp4']
  storageType: 's3' | 'local' | 'signed-url';
}

const config: SecureUploadConfig = {
  maxSizeMB: 10,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'],
  storageType: 'signed-url' // Files never accessible directly
};

export async function secureUpload(file: File): Promise<UploadResult> {
  // 1. Verify file extension matches MIME type (prevent double extensions)
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = lookup(file.name) || file.type;
  
  if (!config.allowedMimeTypes.includes(mimeType)) {
    throw new SecurityError(`File type ${mimeType} not allowed`);
  }
  
  // 2. Validate file size
  if (file.size > config.maxSizeMB * 1024 * 1024) {
    throw new SecurityError(`File exceeds ${config.maxSizeMB}MB limit`);
  }
  
  // 3. Generate safe filename (strip user-provided name entirely)
  const safeFilename = `${crypto.randomUUID()}.${extension}`;
  
  // 4. Store with virus scan before marking complete
  const scanResult = await virusScan(file.buffer);
  if (!scanResult.clean) {
    auditLog.securityEvent('MALICIOUS_FILE_UPLOAD', { filename: safeFilename });
    throw new SecurityError('File rejected: potential malware detected');
  }
  
  // 5. Upload to isolated storage, return signed URL with expiry
  const signedUrl = await uploadToStorage(file.buffer, safeFilename, {
    expiresIn: '15m',
    allowedActions: ['read'] // Never allow execute
  });
  
  return { url: signedUrl, safeFilename, scanResult };
}
```

### 2c. Should This Block Implementation?

**Conditional:**
- **If files are live in production:** ✅ YES — Immediate patch required
- **If files are planned but not built:** ⚠️ NO — Add to design requirements, address during that feature's implementation
- **If files are used in testing but not production:** 🔶 MEDIUM — Implement securely before production release

### 2d. Priority Order

```
IF FILES ARE LIVE:
    PRIORITY 0: Emergency patch — block all uploads until SecureFileUploadService deployed
    ↓ After: All existing uploads scanned and purged if malicious
    
IF FILES ARE PLANNED:
    PRIORITY 1: Design SecureFileUploadService as prerequisite
    ↓ Required before: Any file upload feature can proceed
```

---

## Finding 3: Missing RBAC Enforcement in Multi-Trainer/Session Flows

### 3a. Is This Truly CRITICAL?

**✅ LEGITIMATELY CRITICAL — Not over-classified.**

**Severity factors:**
- **Data isolation failure:** One trainer could view/edit another trainer's client sessions
- **Privilege escalation:** Clients could access admin or trainer-level features
- **Business liability:** If a trainer's client data leaks to a competitor trainer, this is serious
- **Regulatory exposure:** If client health/fitness data is involved, unauthorized access compounds PII issues

**Risk scenario:**
```
Trainer A (treating Client X) books session
    ↓
Trainer B (treating Client Y) queries "all upcoming sessions"
    ↓
No RBAC filter — returns sessions for ALL trainers
    ↓
Trainer B sees Client X's private information
    ↓
GDPR/HIPAA breach, client trust violation
```

### 3b. Specific Mitigation Strategy

```typescript
// NEW: middleware/rbacMiddleware.mjs
import { UserRole } from '../types/auth.mjs';

interface RBACRule {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete';
  allowedRoles: UserRole[];
  ownershipCheck?: (user: User, resource: any) => boolean;
}

const rbacRules: RBACRule[] = [
  // Trainers can only see their own clients
  { 
    resource: 'client', 
    action: 'read', 
    allowedRoles: ['admin', 'trainer'],
    ownershipCheck: (user, client) => client.trainerId === user.id || user.role === 'admin'
  },
  // Trainers can only modify their own sessions
  { 
    resource: 'session', 
    action: 'update', 
    allowedRoles: ['admin', 'trainer'],
    ownershipCheck: (user, session) => session.trainerId === user.id || user.role === 'admin'
  },
  // Clients can only see their own data
  { 
    resource: 'workout_log', 
    action: 'read', 
    allowedRoles: ['admin', 'trainer', 'client'],
    ownershipCheck: (user, log) => log.clientId === user.id || 
                                    (user.role === 'trainer' && user.clientIds.includes(log.clientId)) ||
                                    user.role === 'admin'
  }
];

export function rbacEnforce(rule: RBACRule) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    // 1. Check role permission
    if (!rule.allowedRoles.includes(user.role)) {
      auditLog.accessDenied({ userId: user.id, resource: rule.resource, action: rule.action });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // 2. If resource exists, check ownership
    if (rule.resource === 'session' && req.params.id) {
      const session = await Session.findById(req.params.id);
      if (session && rule.ownershipCheck && !rule.ownershipCheck(user, session)) {
        auditLog.accessDenied({ 
          userId: user.id, 
          resource: rule.resource, 
          resourceId: req.params.id,
          attemptedOwnership: user.id 
        });
        return res.status(403).json({ error: 'Access to this resource denied' });
      }
    }
    
    next();
  };
}

// Usage in routes:
router.patch('/sessions/:id',
  authenticateJWT,
  rbacEnforce({ resource: 'session', action: 'update', allowedRoles: ['admin', 'trainer'] }),
  sessionController.update
);
```

### 3c. Should This Block Implementation?

**✅ YES — For Workstream #4 (Universal Master Schedule) and any multi-trainer features.**

The plan explicitly mentions:
- Multiple trainers in the system
- "All Trainers" button in Master Schedule
- Session booking flows that span trainer boundaries

Without RBAC, this workstream would be **shipping a security vulnerability**.

### 3d. Priority Order

```
PRIORITY 0: Implement RBAC middleware (1-2 days)
    ↓ After: All existing routes audited for missing RBAC decorators
    
PRIORITY 0: Fix Master Schedule "All Trainers" view with RBAC
    - Admin sees all trainers
    - Trainers see only their own schedule
    - Clients see only available slots (no trainer details unless booked)
    
PRIORITY 1: Add ownership checks to session decrement flow
    ↓ After: Session purchases cannot be manipulated by other trainers
PRIORITY 2: Write integration tests for RBAC rules
```

---

## Consolidated Implementation Roadmap

```
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: SECURITY FOUNDATION (Week 1) — ALL P0                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. PII Scrubber (Presidio)           │ 2. RBAC Middleware       │
│    - Middleware/PIIScrubber.mjs      │    - Middleware/RBAC.mjs │
│    - Integration with AI services    │    - Route decorators    │
│    - Audit logging                   │    - Ownership checks    │
│                                      │    - Session routes      │
├───────────────────────────────────────────────────────────────┤
│ 2a. File Upload Audit                                            │
│     - If LIVE: Emergency SecureFileUploadService               │
│     - If PLANNED: Design for Phase 2                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: PARALLEL WORKSTREAMS (Weeks 2-3)                      │
├─────────────────────────────────────────────────────────────────┤
│ P1 Features (Security validated)   │ P2 Features (Can start)  │
│ ────────────────────────────────    │ ─────────────────────────│
│ Workstream #1: Coach QA             │ Workstream #3: Sessions  │
│ Workstream #2

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
