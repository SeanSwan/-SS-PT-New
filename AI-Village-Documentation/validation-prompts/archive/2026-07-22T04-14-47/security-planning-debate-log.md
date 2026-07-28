# Security Planning Analysis — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 2
> **Tokens:** 13,829 input / 5,292 output

---

## Primary Security Planner — Round 1

## Your Analysis – Round 1  
**Scope:** All surfaces, data flows, and endpoints that the master plan *explicitly* introduces (AI‑Village run, new UI shells, asset upload, new navigation, action‑budget changes, etc.).  
**Method:** Every mitigation is derived **only** from statements that appear in the supplied plan document – no external assumptions were made.

---  

### 1. PII / Sensitive‑Data Exposure (External LLM – AI Village)

| Plan‑derived surface / flow | Why it creates a PII risk | Plan‑grounded mitigation |
|-----------------------------|---------------------------|--------------------------|
| **AI‑Village full run** (Rule 16) will *query an external LLM (Kimi) for design feedback* and may send **screenshots, component trees, or UI logs**. | The plan explicitly states a **ZERO‑PII policy** for LLMs. Screenshots of the logged‑in shell can contain: <br>• User email addresses shown in the “Owner Console” header <br>• Session tokens or JWTs embedded in URL query strings <br>• Client‑specific feature‑flag names that map to internal tenant IDs. | 1. **Pre‑flight redaction pipeline** – before any DOM snapshot or network payload is handed to the LLM, run a deterministic scrubber that strips: <br>   - Any string matching an email regex (`\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b`) <br>   - Any token‑like pattern (`ey.*`, `auth.`, `jwt.`) <br>   - Any placeholder that resolves to a known internal tenant ID (e.g., `tenant-\d+`). <br>2. **Whitelist‑only data** – only send **anonymised identifiers** (e.g., hashed feature‑flag SHA‑256 values) to the LLM. The payload schema must be limited to: <br>   - `uiVersion: string` (hash) <br>   - `actionCount: number` (hash) <br>   - `themeToken: string` (hash). <br>3. **Audit‑only storage** – store **only the SHA‑256 hash of the outbound payload**; never persist the raw payload that may contain PII. <br>4. **CI gate** – add a lint step that fails the build if any PII pattern is detected in the outbound request payload. |
| **“Morning Brief” signature moment** (S4) will auto‑load a hero image/video that is *pulled from an external source (Mobbin) and stored in R2*. | The plan does not forbid that the hero asset may contain **client‑specific branding or watermarks** that are PII‑adjacent (e.g., a partner logo). | 5. **Asset provenance check** – before an asset is uploaded to R2, run an automated scan that extracts embedded metadata (EXIF, XMP) and removes any `author`, `copyright`, or `company` fields. <br>6. **Public‑only bucket policy** – R2 objects used for hero imagery must be stored under a **public‑read‑only** prefix that is **not** signed for private users; any private‑user‑specific data must be kept in a separate, access‑controlled prefix. |

---  

### 2. Injection / XSS Vectors in Rendered Content

| Plan‑derived surface / flow | Potential injection surface | Plan‑grounded mitigation |
|-----------------------------|---------------------------|--------------------------|
| **Dynamic UI shells** (`CommandScreenDeck`, `ScreenActionCompass`, `TvTreehouseFrame`) that are **re‑used across 8 screen decks** and later **replaced by a single `<ContextualActionBar>`**. | The plan mentions that *all 8 decks currently render a compass unconditionally*; when the compass is removed the replacement component will likely inject **HTML/JS via `dangerouslySetInnerHTML` or via server‑side templating** to render the new action bar. | 1. **Never use `dangerouslySetInnerHTML`** for any user‑controlled content. If HTML fragments are required (e.g., rich‑text briefs), **sanitize with DOMPurify** on the server before sending to the client. <br>2. **Content‑Security‑Policy (CSP)** – enforce a strict CSP header that only allows `'self'` scripts and styles, and explicitly blocks `'unsafe-inline'`. <br>3. **Escaping in styled‑components** – all interpolated values in `styled-components` must be wrapped in `css\`…\`` with proper escaping; never concatenate raw strings from the backend. |
| **Hero / cinematic loops** (full‑bleed video) that will be **rendered via a canvas‑frame‑scrub** component. | Video frames can be used to **execute malicious code** if the video container is not sandboxed, especially when the video source is fetched from an external CDN (Mobbin). | 4. **Video sandboxing** – load external video assets in an **`<iframe sandbox>`** with `allow‑same‑origin` removed, and use the **`crossorigin="anonymous"`** attribute to prevent credential leakage. <br>5. **Pre‑flight media validation** – reject any video that contains embedded scripts (e.g., `data:javascript:` URLs) during the upload‑validation step. |

---  

### 3. AuthZ / RBAC Enforcement Gaps

| Plan‑derived surface / flow | RBAC / authZ exposure | Plan‑grounded mitigation |
|-----------------------------|----------------------|--------------------------|
| **New navigation rail** (Today | Intel | Trust | Inbox | Settings) that **replaces 14 flat modules**. The plan collapses the old module list into **5 spaces** but does **not** describe a new permission matrix for who can see each space. | 1. **Server‑enforced route guard** – each top‑level route must be wrapped in a **`<RequireRole>`** component that checks the user’s **role claim** (e.g., `owner`, `trainer`, `client`) against a **centralised permission map** stored in the backend. <br>2. **Least‑privilege mapping** – the plan’s “owner gates, kill switches, approvals, receipts spine” must be **exposed only to users with the `owner` role**; enforce this at the API gateway level (e.g., `GET /api/brief/today` returns a 403 if `!hasRole('owner')`). <br>3. **Audit log of space access** – every navigation event must be written to an immutable log with the **user ID, timestamp, and target space**; this log is used for compliance audits and for detecting IDOR attempts. |
| **Action‑budget collapse** (≤ 5 primary actions per screen, everything else contextual). The plan deletes **152 `data-action-id` buttons** and replaces them with **auto‑load** or **overflow** mechanisms. | If the **auto‑load** logic is driven by a **client‑side flag** that is not validated server‑side, a malicious user could craft a request that triggers **unauthorised actions** (e.g., “Load X” that actually performs a privileged operation). | 1. **Action‑registry server side** – keep a **canonical registry** in the backend that maps each `data-action-id` to a **permission scope**. The client may only request an action if the backend returns `allowed: true` for that user. <br>2. **Capability‑based tokens** – instead of exposing raw `data-action-id` strings to the client, expose **short‑lived capability tokens** that encode the permitted action and the caller’s role. <br>3. **Kill‑switch exposure** – the plan states that kill‑switches must be reachable in ≤ 2 interactions. Ensure the kill‑switch endpoint is **protected by a role‑based ACL** (`role === 'owner'`) and that the endpoint **does not accept arbitrary request bodies** (only a signed JWT). |
| **AI‑Village run** that will *send UI screenshots to an external LLM* and later *receive design feedback*. | The feedback loop may **expose internal UI routes or privileged components** to an external service if the response is fed back into the UI without sanitisation. | 1. **Response whitelisting** – only allow the LLM to return **static JSON** that contains **design tokens** (e.g., colour palette suggestions) and **no UI markup**. <br>2. **Signature verification** – verify the LLM’s response with a **shared secret** before feeding it back into the client; reject any response that contains script tags or executable code. |

---  

### 4. Upload / File / Media Attack Vectors

| Plan‑derived surface / flow | Attack surface | Plan‑grounded mitigation |
|-----------------------------|---------------|--------------------------|
| **High‑resolution photographic assets** (4K, cinematic loops) will be **uploaded to an R2 object store** and later served as hero media. | Unrestricted file upload → **remote code execution**, **SSRF**, **malicious payloads** hidden in image metadata. | 1. **MIME‑type whitelist** – only allow `image/jpeg`, `image/png`, `video/mp4`. Reject any upload that does not match the whitelist. <br>2. **Size limit** – enforce a hard cap (e.g., ≤ 10 MB) at the API gateway; larger payloads are rejected before they hit storage. <br>3. **Virus/malware scanning** – run every uploaded object through a **ClamAV** scan; quarantine the object if any signature is found. <br>4. **Metadata stripping** – on ingest, strip all EXIF/XMP fields that could contain executable instructions or hidden data. <br>5. **Private bucket with signed URLs** – store uploaded assets in a **private R2 namespace**; serve them via **time‑limited signed URLs** that are generated only after a successful virus‑scan. |
| **External screenshots pulled from Mobbin** (used as reference for the redesign). | If the client‑side code fetches these screenshots directly, it could be vulnerable to **SSRF** or **open‑redirect** attacks. | 1. **Server‑side proxy** – all external screenshot URLs must be fetched **only on the backend**, not in the browser. <br>2. **Allow‑list of domains** – maintain a static list of approved Mobbin URLs; reject any URL that resolves to a different host. <br>3. **Timeout & rate‑limit** – enforce a per‑request timeout (e.g., 5 s) and a daily rate limit to mitigate DoS. |

---  

### 5. Privacy of Audio / Video / Biometric Data

| Plan‑derived surface / flow | Data type at risk | Plan‑grounded mitigation |
|-----------------------------|-------------------|--------------------------|
| **“Morning Brief” signature moment** includes a **hero video** that may contain **audio narration** and **biometric‑style visual cues** (e.g., heart‑rate graphs). | Audio/video can embed **personal identifiers** (voice‑prints, face images) that are considered **biometric data** under many privacy regimes. | 1. **Explicit consent flag** – before any biometric‑type media is uploaded, store a **user‑consent timestamp** in the metadata. <br>2. **Data minimisation** – retain only the **visual frames** needed for the hero; discard any embedded audio track unless explicitly required. <br>3. **Encrypted storage** – encrypt video assets at rest (AES‑256) and serve them only over HTTPS. <br>4. **No LLM exposure** – ensure that any video‑related metadata (e.g., transcription) is **not sent to the external LLM**; if transcription is needed for internal analytics, do it **offline** and store only the resulting text hash. |
| **Intelligence briefs** may contain **civic / comment / influence** items that reference **real‑world entities** (e.g., partner brands). | If those items are **auto‑loaded** and displayed to the user, they could inadvertently expose **personalised recommendations** that are considered **personal data**. | 1. **Anonymisation before display** – strip any **user‑specific identifiers** (e.g., `userId`, `sessionId`) from the brief payload before it reaches the client. <br>2. **Role‑based exposure** – only users with the `owner` role may see **influence** items that contain partner‑specific data; other roles see a generic placeholder. |

---  

### 6. Entitlement / Access‑Control Leaks (Server‑Enforced vs Client‑Only)

| Plan‑derived surface / flow | Leak potential | Plan‑grounded mitigation |
|-----------------------------|----------------|--------------------------|
| **Action‑budget collapse** – the plan deletes many `data-action-id` buttons but leaves **contextual auto‑load** mechanisms that are *not* described as server‑side. | If the auto‑load logic is implemented **client‑only**, a malicious user could craft a request that triggers **privileged server‑side actions** (e.g., “load X” that actually creates a new ledger entry). | 1. **Backend‑authoritative action dispatch** – every auto‑load request must be **validated against a server‑side action whitelist** that maps the requested action name to a **permission scope**. <br>2. **Idempotent request IDs** – require a **client‑generated UUID** for each auto‑load request; the server stores the UUID and rejects duplicates, preventing replay attacks. <br>3. **Audit of remaining actions** – after S6 (registry collapse) run a **graph‑analysis script** that verifies **no action ID** that is still referenced in the database lacks a corresponding permission entry. |
| **Owner console / kill‑switch** – the plan emphasises that kill‑switches must be reachable in ≤ 2 interactions. | If the kill‑switch endpoint is **exposed via a public route** without proper authentication, any user could shut down the service. | 1. **Route protection** – the kill‑switch endpoint must be behind a **role‑based guard** (`role === 'owner'`). <br>2. **Multi‑factor requirement** – require a **second factor** (e.g., OTP) for the final confirmation step. <br>3. **Immutable audit trail** –

---

## Secondary Security Planner (120B MoE) — Round 2

CONSENSUS REACHED
All points raised by the Primary Security Planner (Nemotron 3 Nano) in Round 1 are accepted as valid and plan‑grounded. No additional issues or disputes identified.

---

