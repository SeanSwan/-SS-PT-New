# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** stepfun/step-3.5-flash:free | **Duration:** 57.8s
> **Files:** docs/ai-workflow/blueprints/SOCIAL-RPG-COMMUNITY-UPGRADE-PLAN.md
> **Generated:** 3/31/2026, 9:10:35 PM

---

# Security Review: SwanStudios Social-RPG Community Upgrade Plan

**Review Date:** 2026-03-31  
**Reviewer:** Security Engineer  
**Policy Context:** ZERO PII TO LLMs — No client names, emails, or personal data may reach external AI providers  
**Platform:** SwanStudios (React/TS/styled-components frontend, Node.js/Express/Sequelize/PostgreSQL backend)  
**Data Sensitivity:** Personal health data (workouts, measurements, achievements, location)

---

## Executive Summary

The upgrade plan introduces **significant new attack surfaces** while handling sensitive health data. **CRITICAL violations** of the zero-PII-to-LLMs policy exist in the voice transcription feature. Multiple HIGH-risk items require immediate architectural changes before implementation. The plan lacks security-by-design principles and assumes existing controls will extend to new features without verification.

**Overall Risk Rating: HIGH** — Requires security sign-off before any development begins.

---

## Detailed Findings & Mitigations

### 1. PII Exposure in Auto-Generated Posts & Conversation History

**Finding:** The plan includes "Post-Workout Celebration Card (Auto-Post)" and "milestone auto-posts" that could contain:
- User's full name (from profile)
- Specific workout details (health data)
- Location references (city/zip from profile)
- Companion pet names (potentially unique identifiers)
- Ghost Mode comparisons (reveals personal performance history)

**Rating:** **HIGH** — Health data + indirect identifiers = re-identifiable PII

**Plan Gap:** No mention of sanitization, redaction, or user consent for auto-posting. The "user can edit/customize before posting" assumes manual review, but auto-generation happens server-side.

**Required Mitigations:**
```javascript
// BEFORE posting, sanitize ALL auto-generated content:
1. Strip user.fullName → use user.username or "A SwanStudios member"
2. Never include exact workout timestamps → "today" or "this week"
3. Location: only include city if user.publicLocation = true
4. Ghost Mode: "Beat personal record" (no specific exercise/weight)
5. Pet names: use species only ("Happy Wolf companion") unless user.petPublic = true
6. Implement server-side sanitization middleware that runs BEFORE database insert
7. Add user preference: "Allow auto-posts?" (default: false) with granular toggles per type
```

---

### 2. File Attachment Risks (R2 Image Uploads for AI Analysis)

**Finding:** "Image uploads to R2 for AI analysis" introduces:
- Malicious file upload (web shells, SVG XSS)
- SSRF via image URLs if AI service fetches from R2
- Unvalidated content-type (attackers upload .php, .html disguised as images)
- R2 bucket misconfiguration → public access to private health photos

**Rating:** **CRITICAL** — Direct file upload + external AI processing = high exploit potential

**Plan Gap:** No mention of:
- File type validation (magic bytes, not just extension)
- Virus/malware scanning
- R2 bucket policies (private vs presigned URLs)
- AI service authentication (how does R2 → Gemini? Service account?)
- Rate limiting per user

**Required Mitigations:**
```javascript
// Upload pipeline MUST include:
1. Client-side: Accept only image/* MIME, max 10MB
2. Server-side (before R2):
   - Validate magic bytes (sharp/ImageMagick)
   - Re-scan with ClamAV or similar
   - Strip EXIF data (location GPS, device info)
   - Convert to safe format (WebP/PNG) → destroys embedded scripts
3. R2 bucket:
   - Private bucket, NO public access
   - Presigned URLs expire in 1 hour for AI processing
   - Bucket policy: only app service account can read
4. AI integration:
   - Send presigned URL to Gemini, NOT the file directly
   - Gemini must be configured to NOT fetch external URLs (use base64)
   - Log all AI requests for audit
5. Rate limiting: 10 uploads/user/day, 100/day/IP
6. Content moderation: Run uploaded images through existing auto-mod (NSFW detection)
```

---

### 3. Voice Data Privacy (Gemini Transcription)

**Finding:** "Audio recordings sent to Gemini for transcription" violates **ZERO PII TO LLMs POLICY** if recordings contain:
- User's voice (biometric identifier)
- Background conversations (names, addresses)
- Health discussions (conditions, medications)

**Rating:** **CRITICAL** — Direct violation of stated policy

**Plan Gap:** 
- **No mention of data retention policy** — How long are recordings stored?
- **No anonymization** — Sending raw audio to external AI
- **No user consent flow** — GDPR/CCPA requires explicit consent for voice processing
- **No privacy policy update** — Must disclose Gemini processing
- **No data processing agreement (DPA)** with Google

**Required Mitigations (STOP IMMEDIATELY):**
```javascript
// Option A (Preferred): On-device processing
- Use Web Speech API (browser-native) → no external transmission
- Fallback: Whisper.cpp in WebAssembly → client-side only
- NO audio leaves user's device

// Option B (If external AI unavoidable):
1. STRICT data retention: Delete raw audio after transcription (max 24h)
2. Anonymize: Apply voice distortion (pitch shift ±20%) before sending
3. Separate consent: "Allow voice transcription via Google Gemini?" (opt-in)
4. DPA with Google: Ensure Gemini API data NOT used for training
5. Log ALL voice processing requests (user_id, timestamp, file_hash)
6. Privacy policy section: "Voice data processed by Google Gemini, retained 24h, not used for training"

// CRITICAL: Current plan sends PII (voice) to external LLM → POLICY VIOLATION
```

---

### 4. Conversation Data at Rest (JSONB Messages)

**Finding:** "JSONB messages in PostgreSQL" likely contains:
- Direct messages (DMs) with PII
- Party chat messages
- Event discussion threads
- Comment threads with @mentions (names)

**Rating:** **HIGH** — Unencrypted health-related communications at rest

**Plan Gap:**
- No mention of **encryption at rest** (PostgreSQL TDE?)
- No mention of **column-level encryption** for message content
- No mention of **access logs** for message reads
- Sequelize models may not implement row-level security

**Required Mitigations:**
```sql
-- Database level:
1. Enable PostgreSQL TDE (if available) or use filesystem encryption (LUKS)
2. For highest sensitivity (DMs), use pgcrypto:
   INSERT INTO messages (content) VALUES (pgp_sym_encrypt('text', 'key'));
3. Implement Row Level Security (RLS):
   CREATE POLICY message_access ON messages
   USING (sender_id = auth.uid() OR recipient_id = auth.uid());
4. Audit table: log all SELECTs on messages table

-- Application level:
1. Never log message content in application logs
2. Implement "message deleted" soft delete with 30-day retention
3. Admin view: require MFA + justification field (audit trail)
```

---

### 5. RBAC Enforcement Gaps

**Finding:** Plan describes roles conceptually but **no technical enforcement**:
- "Admin sees all conversations" → How? Raw SQL queries bypassing middleware?
- "Trainer sees only assigned clients" → What defines "assigned"? Relationship table?
- "Client sees only own" → Must be enforced in EVERY route

**Rating:** **HIGH** — Broken access control = data breach

**Plan Gap:** New routes (`/api/social/events`, `/api/social/parties`, etc.) lack RBAC specification. Existing middleware may not cover these.

**Required Mitigations:**
```javascript
// Centralized RBAC middleware (MUST apply to ALL new routes):
const enforceRBAC = (resource, action) => {
  return async (req, res, next) => {
    const user = req.user; // from JWT
    const { id } = req.params; // target resource ID
    
    // 1. Fetch resource ownership/access
    const resourceOwner = await getResourceOwner(resource, id);
    
    // 2. Check role-based permissions
    if (user.role === 'admin') return next(); // admins bypass (but log!)
    
    if (user.role === 'trainer') {
      const isAssignedClient = await checkTrainerClientAssignment(user.id, resourceOwner.id);
      if (!isAssignedClient) return res.status(403).json({ error: 'Forbidden' });
    }
    
    if (user.role === 'client') {
      if (user.id !== resourceOwner.id) return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};

// Apply to ALL new routes:
router.get('/api/social/events/:id', enforceRBAC('event', 'read'), getEvent);
router.post('/api/social/parties', enforceRBAC('party', 'create'), createParty);
// ... EVERY route

// Additional: Admin actions require MFA + audit log entry
```

---

### 6. MediaRecorder API Risks (Browser Microphone)

**Finding:** Voice recording in browser creates:
- Permission abuse (malicious site accessing mic)
- Stream cleanup failure → mic stays on
- Data leakage via WebRTC/local storage
- No user indication recording is active

**Rating:** **MEDIUM** — Client-side risk, but user-initiated

**Plan Gap:** No mention of:
- Permission request UI/UX (must be user gesture)
- Visual indicator (red dot) while recording
- Stream stop on page unload/component unmount
- Local storage of recordings (should be in memory only)

**Required Mitigations:**
```typescript
// React component pattern:
const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const startRecording = async () => {
    // 1. Must be user gesture (button click)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    
    // 2. Visual indicator (required by browsers)
    document.body.classList.add('recording-active'); // CSS: red border
    
    // 3. Recorder setup
    const recorder = new MediaRecorder(stream);
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop()); // CRITICAL
    }
    document.body.classList.remove('recording-active');
    setIsRecording(false);
  };
  
  // 4. Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) stopRecording();
    };
  }, []);
  
  return (
    <button onClick={isRecording ? stopRecording : startRecording}>
      {isRecording ? 'Stop' : 'Record'}
    </button>
  );
};
```

---

### 7. Markdown Rendering XSS (react-markdown)

**Finding:** `react-markdown` with user-generated content is **inherently unsafe** without:
- HTML filtering (markdown can embed raw HTML)
- Link protocol validation (`javascript:` URLs)
- SVG XSS (SVG can contain scripts)

**Rating:** **MEDIUM** — Well-known vulnerability, easily mitigated

**Plan Gap:** No mention of sanitization library (DOMPurify) or rehype plugins.

**Required Mitigations:**
```javascript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeRaw from 'rehype-raw'; // ONLY if you trust source, otherwise omit

const SafeMarkdown = ({ content }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[
      // NEVER use rehypeRaw with user content
      [rehypeSanitize, {
        protocols: {
          href: ['http', 'https', 'mailto'],
          src: ['http', 'https', 'data'] // data: for images only if needed
        },
        tagNames: [
          'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote',
          'a', 'strong', 'em', 'code', 'pre',
          'img', 'figure', 'figcaption',
          'table', 'thead', 'tbody', 'tr', 'th', 'td'
        ],
        attributes: {
          a: ['href', 'title', 'target'],
          img: ['src', 'alt', 'title', 'width', 'height'],
          // ... explicit allowlist
        }
      }]
    ]}
  >
    {content}
  </ReactMarkdown>
);

// ALWAYS validate links server-side too:
const validateMarkdownLinks = (content) => {
  const linkRegex = /\[.*?\]\((.*?)\)/g;
  let match;
  while ((match = linkRegex.exec(content))) {
    const url = match[1];
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      throw new Error('Invalid link protocol');
    }
  }
};
```

---

## Additional Critical Concerns Not in Original Questions

### A. Location Privacy Implementation

**Finding:** "Location-based discovery" with "city/zip level only" but:
- IP address geolocation can reveal precise location
- GPS coordinates from mobile devices
- Event location fields may contain exact addresses

**Rating:** **HIGH**

**Mitigations:**
1. Never store GPS coordinates. Store only:
   ```sql
   user_location: {
     city: string,
     state: string,
     country: string,
     zip_code: string, // optional
     timezone: string
   }
   ```
2. Geocode event locations to city-level only (Google Maps Geocoding API with `result_type="locality"`)
3. Never expose event addresses in API responses to non-attendees
4. Implement "nearby" using haversine formula on city centroids (not user coordinates)

### B. Socket.IO Data Leakage

**Finding:** Real-time events (`'social:activity'`, `'party:hp_update'`) may broadcast sensitive data to all connected clients.

**Rating:** **HIGH**

**Mitigations:**
```javascript
// Room-based broadcasting ONLY:
io.to(`user:${userId}`).emit('party:update', data); // NOT io.emit()

// Filter sensitive fields:
const sanitizeActivity = (activity) => {
  const { userId, userName, ...publicData } = activity;
  return {
    ...publicData,
    userName: userName ? userName.split(' ')[0] : 'Someone' // First name only
  };
};

// Never broadcast:
// - Private message content
// - Exact workout metrics (use "completed workout" not "squatted 315x5")
// - Party HP exact numbers (use "full", "75%", "critical")
```

### C. AI Recommendation Data Safety

**Finding:** `AIRecommendations.mjs` model exists but plan says "Routes + engine" not built. When built:
- Must NOT send PII to recommendation engine
- Training data must be aggregated/anonymized

**Rating:** **HIGH** (preemptive)

**Mitigations:**
1. Recommendation engine runs **on-premise only** (no external AI)
2. Input data structure:
   ```json
   {
     "user_traits": ["strength_focus", "morning_workout", "social_but

---

*Part of SwanStudios 14-Brain Recursive Consensus System*
