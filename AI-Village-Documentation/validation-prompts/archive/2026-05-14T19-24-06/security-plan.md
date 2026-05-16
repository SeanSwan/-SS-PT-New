# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

**CONSENSUS REACHED**

Below are the concrete, file‑level changes we have agreed upon for this round.  Each item includes the file path, the approximate line range (based on the Primary’s implementation slice), and the exact code/snippet to be added or modified.

---

### 1. Title Storage – hash for UI + encrypted payload in a separate table
**File:** `backend/models/AiConversation.ts`
**Lines:** 22‑30 (after existing columns)
```ts
// Keep only the hash for UI/lookup
@Column({ type: 'char', length: 64 })
title_hash: string;

// FK to the encrypted payload table
@Column({ type: 'uuid' })
title_enc_id: string;   // references ClientTitleEncryption.id
```

**File:** `backend/models/ClientTitleEncryption.ts` (new)
**Lines:** 1‑15
```ts
@Entity()
export class ClientTitleEncryption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bytea' })
  title_encrypted: Buffer;   // AES‑256‑GCM ciphertext + nonce

  @ManyToOne(() => AiConversation, conv => conv.title_enc)
  conversation: AiConversation;
}
```

**File:** `backend/controllers/ai/coachActionProposalApprovalService.mjs`
**Lines:** 80‑95 (after title hash is generated)
```ts
// 1️⃣ Generate hash (already done)
const titleHash = crypto.createHash('sha256').update(plainTitle).digest('hex');

// 2️⃣ Encrypt the plain title with KMS‑wrapped DEK
const { iv, encrypted } = encryptWithKMS(plainTitle); // util from kmsEncryption.ts
const encRecord = await ClientTitleEncryption.save({
  title_encrypted: Buffer.concat([iv, encrypted]),
});

// 3️⃣ Store hash and FK on the conversation
aiConversation.title_hash = titleHash;
aiConversation.title_enc_id = encRecord.id;
await aiConversation.save();
```

**File:** `backend/routes/aiChatRoutes.mjs` (new admin endpoint)
**Lines:** 200‑215
```ts
app.get('/api/admin/decrypt-title/:encId', async (req, res) => {
  // Admin‑only guard (reuse existing RBAC middleware)
  if (!req.user?.roles.includes('admin')) {
    return res.status(403).send('Forbidden');
  }
  const enc = await ClientTitleEncryption.findOne({ where: { id: req.params.encId } });
  if (!enc) return res.status(404).send('Not found');

  const plaintext = decryptWithKMS(enc.title_encrypted); // util from kmsEncryption.ts
  res.json({ title: plaintext });
});
```

**Utility:** `backend/utils/kmsEncryption.ts` – unchanged (≈45 lines, provides `encryptWithKMS`/`decryptWithKMS`).

---

### 2. Attachment Bucket Policy – runtime guard + IaC‑managed policy
**File:** `backend/config/bucketGuard.ts` (new)
**Lines:** 1‑25
```ts
import { S3Client, GetBucketPolicyCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function validateBucketPolicy(): Promise<void> {
  try {
    const { Policy } = await s3.send(new GetBucketPolicyCommand({
      Bucket: process.env.R2_BUCKET,
    }));
    const policy = JSON.parse(Policy);
    // Reject any statement that allows public read (*) without a condition
    const hasPublicAllow = policy.Statement.some(
      stmt => stmt.Effect === 'Allow' &&
              stmt.Principal === '*' &&
              stmt.Action === 's3:GetObject' &&
              (!stmt.Condition || !Object.keys(stmt.Condition).length)
    );
    if (hasPublicAllow) {
      throw new Error('Bucket policy permits public read – aborting startup');
    }
  } catch (err) {
    // If no policy exists, treat as mis‑configuration
    throw new Error(`Unable to verify bucket policy: ${err.message}`);
  }
}
```

**File:** `backend/server.mjs`
**Line:** ~12 (before `app.listen()`)
```ts
import { validateBucketPolicy } from './config/bucketGuard';
// …
await validateBucketPolicy();   // throws if bucket is publicly readable
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
```

*(The actual bucket policy JSON lives in the IaC repo, e.g., `infra/terraform/attachment_policy.json`.)*

---

### 3. Voice‑Data Handling – TLS + server‑side envelope encryption (no on‑device ECIES)
**File:** `frontend/src/hooks/useGeminiTranscription.ts`
**Lines:** 30‑45 (after audio capture)
```ts
async function handleVoiceMemo(blob: Blob) {
  // Existing on‑device PII redaction
  const redacted = await redactPIIFromAudio(blob);

  // Upload the redacted blob directly via a signed URL (TLS‑protected)
  const uploadUrl = await getSignedUploadUrl(redacted.size, 'audio/webm');
  await fetch(uploadUrl, {
    method: 'PUT',
    body: redacted,
    headers: { 'Content-Type': 'audio/webm' },
  });

  // Notify backend to decrypt (if needed) and transcribe
  await transcribeAudio(uploadUrl);   // backend uses its envelope‑encryption key
}
```

**File:** `backend/routes/aiChatRoutes.mjs`
**Lines:** 110‑130 (existing transcription route)
```ts
app.post('/api/voice/transcribe', async (req, res) => {
  // The audio file was already stored encrypted with the service‑wide DEK
  const encryptedBlob = await getEncryptedAudioFromR2(req.body.fileId);
  const plaintextBlob = decryptWithDEK(encryptedBlob); // envelope‑decryption util

  // Stream plaintextBlob to Gemini …
  const transcription = await gemini.transcribe(plaintextBlob);
  // Immediately shred plaintextBlob after use
  crypto.randomFillSync(plaintextBlob);
  res.json({ transcription });
});
```

*(No `keyId` or client‑side ECIES logic is required for Phase 1.)*

---

### 4. RBAC Policy Engine – static JSON policy + Redis‑backed idempotency
**File:** `backend/policy/staticPolicy.json` (new)
**Lines:** 1‑12
```json
{
  "client_onboarding": "admin",
  "client_profile_update": "admin",
  "workout_plan_create": "coach",
  "workout_log_create": "coach",
  "client_note_add": "coach",
  "client_goal_set": "coach",
  "client_payment_add": "admin",
  "client_archive": "admin"
}
```

**File:** `backend/controllers/ai/coachActionProposalApprovalService.mjs`
**Lines:** 20‑35 (replace Casbin import)
```ts
import { readFileSync } from 'fs';
import { join } from 'path';

const POLICY = JSON.parse(
  readFileSync(join(__dirname, '../policy/staticPolicy.json'), 'utf8')
);

export function canApprove(userRole: string, proposalType: string): boolean {
  const required = POLICY[proposalType];
  return required && required === userRole;
}
```

**File:** `backend/utils/idempotency.ts` (new)
**Lines:** 1‑20
```ts
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function checkIdempotency(key: string): Promise<boolean> {
  const seen = await redis.get(`idemp:${key}`);
  if (seen) return true; // duplicate
  await redis.set(`idemp:${key}`, '1', 'EX', 60 * 60 * 24); // 24 h TTL
  return false;
}
```

**File:** `backend/routes/aiChatRoutes.mjs` (usage example)
**Lines:** ~180‑195
```ts
import { checkIdempotency } from '../utils/idempotency';

app.post('/api/coach/approve', async (req, res) => {
  const idKey = req.headers['idempotency-key'] as string;
  if (!idKey) return res.status(400).send('Missing idempotency key');
  if (await checkIdempotency(idKey))
    return res.status(409).send('Duplicate request');

  const { userId, proposalType } = req.body;
  if (!canApprove(req.user.role, proposalType))
    return res.status(403).send('Insufficient role');

  // … existing approval logic …
});
```

---

### 5. Security‑Header Middleware (already agreed)
**File:** `backend/middleware/securityHeaders.mjs`
**Lines:** ~1‑25 (unchanged)
```ts
export function securityHeaders(req, res, next) {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('
