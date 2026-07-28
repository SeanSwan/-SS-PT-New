# Security & Privacy Planning — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-nano-30b-a3b:free | **Duration:** 17.8s
> **Files:** docs/ai-workflow/brainstorms/user-dashboard-redesign-PLAN-for-village-2026-07-08.md
> **Generated:** 7/8/2026, 2:04:02 AM

---

## Security Review of the **SwanStudios User‑Dashboard / Social Redesign** Plan  
*All assessments are limited to the concrete additions, surfaces, and integrations explicitly described in the supplied plan document. No external assumptions are made.*

---  

### 1. PII / Sensitive‑Data Exposure  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **No new storage of client‑identifying PII** – The only user‑specific data displayed is the *Aurora Bloom* milestone, workout rings, and the *Guide’s Note* (text/audio/video from the assigned trainer). None of these contain names, emails, or other direct identifiers. | **LOW** | The platform already enforces a “ZERO PII TO LLMs” rule; the redesign does not introduce any new external LLM calls or data‑export endpoints. | Continue to **sanitize** any trainer‑generated audio/video before storage (see §3). Keep all UI strings derived from authenticated user records only. |
| **Hashtag handling** – Clickable hashtags are now part of the feed but are **static tokens** (`#SwanStudios`, `#SwanProgress`) that are stripped from user‑generated content. No user‑supplied text is rendered as raw HTML. | **LOW** | No PII is embedded in the hashtag surface. | Ensure the back‑end strips any user‑provided strings before persisting or rendering hashtags. |

---  

### 2. Upload / File / Media Risks  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **No new file‑upload endpoint** is introduced in the plan. Existing “Photos” in *My Studio* remain unchanged and are already covered by the existing upload pipeline (which is out of scope for this review). | **NONE** | No new surface for file ingestion → no new SSRF or malicious‑file vectors. | Keep the existing upload validation (MIME type, size, virus scan) unchanged. |
| **External enrichment removal** – The plan deletes the “external enrichment (NASA‑APOD/iNaturalist/Quotable)” interleaving. This eliminates a potential **SSRF** vector that could have been used to fetch remote URLs. | **MEDIUM** (removed) | The previous design could have allowed an attacker to force the server to fetch arbitrary URLs. By removing it, the risk disappears. | N/A – risk eliminated. |

---  

### 3. Audio/Video / Biometric Privacy  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **Guide’s Note** may contain **daily text, audio, or 15‑second video** from the assigned trainer. This is *trainer‑generated* content, not client‑generated biometric data. | **MEDIUM** | If stored, it could contain personally identifying speech or video of the trainer, which is *sensitive* under many privacy regimes. The plan does not specify retention or encryption. | 1. **Encrypt at rest** (AES‑256) all trainer‑generated media. <br>2. **Retention policy**: delete after a configurable period (e.g., 30 days) unless explicitly archived. <br>3. **Access control**: only the owning client and the assigned trainer may read it. <br>4. **Privacy notice**: disclose that audio/video is stored temporarily for coaching context and may be retained for progress tracking. |
| **No biometric data** (e.g., heart‑rate, motion capture) is mentioned. | **NONE** | No new biometric collection. | N/A |

---  

### 4. Data at Rest  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **Progress rings / Victory charts** are now the *single source of truth* for user‑visible metrics. They are persisted in the existing PostgreSQL/Sequelize layer. | **MEDIUM** | If the underlying tables are not encrypted, the metrics (which can infer activity patterns) are exposed to any DB admin. | 1. **Enable Transparent Data Encryption (TDE)** or column‑level encryption for the `workout_logs` and `progress_metrics` tables. <br>2. **Restrict DB read access** to service accounts used only by the backend; no direct public API exposure. |
| **Feed content** (posts, hashtags, quick‑post templates) is stored in a new `feed_items` table (implied by “template‑driven Quick Post”). | **MEDIUM** | User‑generated text could contain PII if not sanitized. | Apply **server‑side sanitization** (HTML escaping, length limits) before persisting. Store only after validation; never trust client‑side sanitization. |
| **Guide’s Note media** (audio/video) – see §3. | **MEDIUM** | Same as above. | Encrypt and apply strict RBAC (see §5). |

---  

### 5. AuthZ / RBAC Enforcement  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **New navigation surfaces**: `Community (/community)`, `Challenges (/challenges)`, `Coach (/coach)`, `Progress (/progress)`, `Profile (/profile)`. Each is a distinct URL slug that must be gated by role. | **HIGH** | Improper scoping could allow a trainer to access another trainer’s coach page, or a client to view admin‑only challenge boards. | 1. **Implement route‑level guards** in Express that check `req.user.role` against a whitelist: <br>   - `Coach` → `role === 'trainer'` <br>   - `Community` → `role === 'client' || role === 'trainer'` (read‑only) <br>   - `Challenges` → `role === 'admin' || role === 'trainer'` (depends on business rule). <br>2. **Use resource‑level checks** for any sub‑tabs (e.g., `Reels`, `Friends/SwanFam`) to ensure a client cannot modify trainer‑only content. <br>3. **Audit** all new API endpoints for IDOR: include `userId` in the path and verify ownership before returning data. |
| **Sub‑tabs** (`Nutrition`, `Reels`, `Friends/SwanFam`) are mentioned but not detailed. | **MEDIUM** | If these are later implemented without proper permission checks, they could become privilege‑escalation vectors. | Design them with the same granular RBAC model; keep them **read‑only** for non‑trainers unless explicit opt‑in is granted. |
| **Notification model** – Alerts move from tab bar to a header bell with counts and deep links. | **LOW** | Deep links must not expose private IDs to unauthenticated users. | Encode deep links with **opaque tokens** (e.g., signed JWT) that map to internal IDs only after server‑side verification. |

---  

### 6. Browser‑API / Permission Risks  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **No new browser permissions** (e.g., `getUserMedia`, `Notification`) are introduced in the plan. The *Guide’s Note* may include **audio/video**, but the plan does not specify client‑side capture; it is **trainer‑generated** and streamed to the user. | **NONE** | No new permission prompts for the user. | If client‑side capture ever becomes part of the flow, enforce: <br>1. Explicit user gesture before requesting media. <br>2. Clean up `MediaStream` objects on component unmount. <br>3. Do not store raw streams; only store processed, encrypted blobs. |
| **Reduced‑motion preference** is respected (no three.js, only CSS/Canvas). | **LOW** | No additional API surface. | Continue to honor `prefers-reduced-motion` media query for any future animation. |

---  

### 7. Injection / XSS  

| Finding | Rating | Why it matters | Mitigation |
|---------|--------|----------------|------------|
| **Clickable hashtags** are now rendered in the feed. The plan states they are “clickable in PostContent” and that “FeedFilterBar on Home” passes `?hashtag/?category` to `useSocialFeed`. | **MEDIUM** | If hashtag strings are taken directly from user input without sanitization, an attacker could inject `<script>` or other markup. | 1. **Server‑side sanitization**: escape all user‑generated strings before inserting into HTML. <br>2. **Whitelist allowed characters** for hashtags (e.g., only alphanumerics and underscores). <br>3. **Render as plain text with CSS cursor pointer** rather than raw HTML. |
| **Template‑driven Quick Post** includes user‑generated content types: *Win / Proof / Progress photo / Ask SwanFam / Challenge / Poll*. | **HIGH** | These are direct sinks for untrusted data. | 1. **Content Security Policy (CSP)** that disallows inline scripts and only allows `img-src` from trusted domains. <br>2. **Sanitize HTML** with a library such as DOMPurify before storage. <br>3. **Store only metadata** (e.g., poll options) in structured fields; avoid raw HTML storage. |
| **Dynamic CSS custom properties** (`var(--token, #fallback)`) are used for theming; no user‑controlled CSS is injected. | **LOW** | No injection vector. | N/A |

---  

## Summary of Ratings  

| Category | Highest Rating |
|----------|----------------|
| PII / Sensitive‑Data Exposure | **LOW** |
| Upload / File / Media Risks | **NONE** (risk removed) |
| Audio/Video / Biometric Privacy | **MEDIUM** |
| Data at Rest | **MEDIUM** |
| AuthZ / RBAC Enforcement | **HIGH** |
| Browser‑API / Permission Risks | **NONE** |
| Injection / XSS | **HIGH** |

---  

## Consolidated Recommendations  

1. **Enforce strict RBAC** on every new route (`/coach`, `/community`, `/challenges`, sub‑tabs). Use role‑based guards and resource‑level checks to prevent IDOR.  
2. **Encrypt all persisted media** (Guide’s Note audio/video) and apply a short retention policy; restrict access to the owning client and trainer.  
3. **Apply server‑side sanitization and CSP** for any user‑generated content (posts, hashtags, polls). Never trust client‑side escaping.  
4. **Enable at‑rest encryption** for the `feed_items`, `progress_metrics`, and any new tables; limit DB read privileges to service accounts.  
5. **Audit deep‑link generation** for the notification bell to ensure opaque tokens are used, preventing enumeration of private user IDs.  
6. **Maintain the “ZERO PII TO LLMs” policy** – no external LLM calls are introduced; any future integration must strip or mask identifiers before transmission.  
7. **Document and enforce a media‑stream cleanup** policy if client‑side capture ever expands beyond the current trainer‑generated streams.  

By addressing the above findings, the redesign can proceed without introducing new security surface areas that would violate the platform’s zero‑PII, production‑SaaS guarantees.

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
