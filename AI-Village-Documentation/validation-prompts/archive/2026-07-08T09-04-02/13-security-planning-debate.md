# Security Planning Debate (Phase 2A) — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free ↔ nvidia/nemotron-3-super-120b-a12b:free | **Duration:** 45.5s
> **Files:** docs/ai-workflow/brainstorms/user-dashboard-redesign-PLAN-for-village-2026-07-08.md
> **Generated:** 7/8/2026, 2:04:02 AM

---

CONSENSUS REACHED  

**Merged Findings (agreed upon by Primary and Secondary Security Planners)**  

**Risk Catalog (plan‑grounded)**  

| # | Risk Area | Plan‑derived Element | Rating | Why it matters (plan‑specific) | Concrete Mitigation (plan‑grounded) |
|---|-----------|----------------------|--------|--------------------------------|--------------------------------------|
| 1 | **PII / Sensitive Data Exposure – External LLM** | Guide’s Note creation endpoint (`POST /coach/notes`) – potential future LLM step for transcription/summarisation. | MEDIUM | If an LLM is added, trainer‑generated audio/video could be inadvertently sent outside the trust boundary. | • Auth‑only endpoint – verify JWT `trainer_id` claim.<br>• Sanitise any transcription payload before it leaves the service (strip metadata, strip external URLs).<br>• Never forward note content to an external LLM; if summarisation is needed, use an internal, vetted model that runs inside the VPC. |
| 2 | **XSS / Injection via Rendered User Content** | Quick Post free‑form text field (user‑controlled). | HIGH | Unescaped text could lead to stored XSS, executing on every viewer’s client. | • Server‑side sanitisation with DOMPurify (or equivalent) before persisting.<br>• Render‑side escaping – rely on React JSX automatic escaping; avoid `dangerouslySetInnerHTML`.<br>• CSP header: `default-src 'self'; script-src 'self'; object-src 'none'; style-src` limited to app nonce. |
| 3 | **Hashtag Click‑jacking / Open Redirect** | Clickable hashtags rendered as `<a href="/feed?hashtag=…">`. | MEDIUM | Malicious hashtag values could craft open‑redirect URLs. | • Whitelist allowed hashtags: `#SwanStudios`, `#SwanProgress`.<br>• Encode query param with `encodeURIComponent`.<br>• Server‑side validation: reject any `hashtag` param not in whitelist (400). |
| 4 | **IDOR / Cross‑User Data Leak – Feed / Posts** | Feed endpoint `GET /feed/posts?hashtag=…` (potentially unauthenticated or guessable `post_id`). | HIGH | Unauthenticated enumeration or IDOR could expose private posts/photos. | • Require JWT authentication; scope query to authenticated user’s own posts + explicitly public posts (`visibility='public'`).<br>• Use opaque cursor‑based pagination (`after=…`) instead of offset IDs.<br>• Validate ownership on each post before returning. |
| 5 | **Upload / Media Attack Surface – Guide’s Note Audio/Video** | Trainer‑generated 15‑s video/audio stored as media blobs. | MEDIUM | Malicious files (e.g., JS‑embedded MP4) could be uploaded. | • Accept only MIME types: `audio/mpeg`, `audio/ogg`, `video/mp4`, `video/webm`.<br>• Enforce size limit (≤ 5 MB).<br>• Run virus/malware scan (ClamAV) on ingest pipeline.<br>• Store on CDN with signed URLs; set `Content‑Type` and `X‑Content‑Type‑Options: nosniff`; disable HTML embedding. |
| 6 | **Biometric / Sensitive Data Privacy – Audio/Video from Trainer** | Guide’s Note may contain voice/video (biometric/personal data). | MEDIUM | Voice recordings may fall under GDPR/CCPA voiceprint rules; retention risk. | • Obtain explicit consent from trainer (and client where required) before storage.<br>• Encrypt at rest (AES‑256).<br>• Apply retention policy (e.g., delete after 90 days unless user opts to keep).<br>• Serve media only via authenticated, signed endpoint; do not expose raw URLs. |
| 7 | **Entitlement / Access‑Control Leak – Rings / Progress Data** | Ascension Rings API (`/user/rings`) reads workout aggregates. | MEDIUM | If API accepts a free‑form `userId`, attacker could enumerate another user’s streak/volume. | • Scope all ring‑related calls to authenticated user’s ID only; reject any `userId` param.<br>• Return 401/403 if caller attempts to request another user’s aggregates. |
| 8 | **Reduced‑Motion / Accessibility Mis‑use** | Aurora Bloom CSS radial‑gradient animation. | LOW | Animation could fire for users who have disabled motion, violating WCAG. | • Detect `prefers-reduced-motion: reduce` via CSS `@media (prefers-reduced-motion: reduce) { … }` and disable the animation.<br>• Provide a non‑flashing textual fallback (e.g., “+150 workouts”). |
| 9 | **Bundle‑size / Runtime‑Injection – Third‑party libs** | Added libraries: Victory, Framer Motion, Lucide‑React, possibly react‑window. | LOW | Out‑of‑date/vulnerable dependencies could be exploited via script injection. | • Pin exact versions in `package.json` (e.g., `victory@1.9.0`, `framer-motion@10.16.0`).<br>• Run `npm audit` and Dependabot in CI; merge only after security review.<br>• Serve vendor scripts with Subresource Integrity (SRI) if using CDN, or bundle and set CSP `script-src 'self'`. |
|10| **Server‑Side Rendering / Hydration Mismatch – Theme** | Styled‑components with CSS custom properties swapped at runtime for 18‑theme toggle. | LOW | Mismatch could leak theme tokens to crawlers/analytics. | • Render the same theme on server and client by reading persisted theme preference from cookie/DB and passing as `data-theme` on root element.<br>• Do not expose raw CSS variable values in publicly readable inline `<style>` blocks. |

**Consolidated Mitigation Checklist (to be implemented before code lands)**  

| ✅ | Action | Where it belongs (plan element) |
|----|--------|---------------------------------|
| 1 | **Auth‑only POST `/coach/notes`** – verify `trainer_id` claim; reject any other caller. | Guide’s Note creation |
| 2 | **Sanitise & escape all user‑generated text** before persisting and before rendering. | Quick Post text field |
| 3 | **Whitelist hashtag values** (`#SwanStudios`, `#SwanProgress`) and encode before URL construction. | Feed Filter Bar & clickable hashtags |
| 4 | **Require JWT + ownership check** on every feed‑read endpoint (`/feed/posts`). | Single‑column Feed |
| 5 | **Validate media MIME type, size, run virus scan** on upload of Guide’s Note audio/video. | Guide’s Note media upload |
| 6 | **Encrypt media at rest** and enforce a **retention policy** (e.g., 90 days). | Guide’s Note storage |
| 7 | **Scope ring‑related API calls** to the authenticated user only; reject any `userId` param. | Ascension Rings data fetch |
| 8 | **Implement CSP, X‑Content‑Type‑Options, and X‑Frame‑Options** headers globally. | All endpoints |
| 9 | **Pin third‑party library versions** and run automated dependency‑scanning on CI. | Victory, Framer Motion, Lucide‑React, react‑window |
|10| **Respect `prefers-reduced-motion`** and provide a non‑flashing fallback for Aurora Bloom. | Aurora Bloom animation |
|11| **Pass the selected theme** from server to client (cookie/DB) and render the same CSS custom‑property set on the server. | Theme toggle (18 themes) |
|12| **Log all failed authZ attempts** and set appropriate alerting thresholds. | Global authZ layer |

**Conclusion**  
All risks identified by the Primary Security Planner are valid, mitigations are appropriate and actionable, and no additional issues are raised. The Secondary Security Planner concurs with the full analysis and mitigation set. No further disputes remain.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
