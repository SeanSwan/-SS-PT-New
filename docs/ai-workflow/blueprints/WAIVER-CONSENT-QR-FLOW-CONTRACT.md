# Waiver + AI Consent QR Flow Contract (Public Capture + Admin Override)

**Created:** 2026-02-26
**Status:** Draft (Architecture Contract)
**Owner:** SwanStudios (Admin + Trainer workflows)
**Related Systems:** AI Copilot (Phase 5A/5B/5C), AI Privacy, Admin Dashboard, Client onboarding

---

## 1. Objective

Add a public, no-login waiver flow (QR + header link) that captures:

- multi-activity liability waivers (home gym, park, swimming)
- AI-assisted coaching notice + consent
- signature proof and consent evidence

while introducing a **role-aware AI eligibility system**:

- `admin` can proceed with an audited override (no hard blocker)
- `trainer` and `client` remain blocked until a valid consent source exists
- de-identification remains mandatory for all AI calls

This replaces the current binary consent blocker model with a safer operational model that preserves compliance and session flow.

---

## 2. Non-Negotiable Rules

1. **Admin override bypasses the legal blocker only, not the privacy pipeline.**
2. **De-identification must still run before any provider call**, including admin override flows.
3. **AI consent must remain explicit** (separate from liability text, not buried).
4. **Swimming lessons require a separate activity addendum** and guardian flow for minors.
5. **No "name only" matching** for public waivers. Matching requires stronger identity signals.
6. **All AI eligibility decisions are auditable** (source, actor, override flag, timestamp, reason).

---

## 3. Scope

### In Scope

- Public waiver page (`/waiver`) reachable by QR and header link
- Universal waiver + activity addenda
- AI notice + AI consent checkbox (separate section)
- E-signature capture on device screen
- Pending ("ghost") waiver records for non-logged-in users
- Auto-match + manual-match flows to user profiles
- Admin Dashboard `Clients & Team > Waivers`
- Role-aware AI eligibility check service + admin override audit path
- Phase 5C/AI Copilot integration (consent source can be in-app consent or waiver consent)

### Out of Scope (for initial implementation)

- Legal advice / final legal drafting (attorney review required)
- Full document PDF generation pipeline (optional later)
- OCR of paper waivers
- Advanced fraud detection

---

## 4. Waiver Document Model (Multi-Activity)

### 4.1 Core + Addendum Structure

All signers receive:

- `Universal Core Waiver`
- `AI-Assisted Coaching Notice + AI Consent`

Plus one or more activity addenda:

- `HOME_GYM_PT`
- `PARK_TRAINING`
- `SWIMMING_LESSONS`

### 4.2 Activity-Specific Notes

#### Home Gym PT Addendum

- premises/residential hazards
- pets, stairs, flooring, equipment setup/storage
- entry/access expectations
- emergency access considerations

#### Park Training Addendum

- weather exposure (heat/cold/rain)
- uneven ground / public environment hazards
- insects/allergens
- park rule/permit compliance notice

#### Swimming Lessons Addendum (Critical)

- water safety and drowning risk
- medical conditions (asthma, seizures, cardiac concerns) acknowledgement
- lesson supervision scope / emergency response authorization
- facility/pool rules acknowledgement (when applicable)
- **minor guardian typed-signature requirement** (not click-only acceptance)

---

## 5. Public QR Waiver Flow (No Login Required)

### 5.1 Entry Points

- Header link: `Waiver`
- QR codes (print/card/poster) -> `https://sswanstudios.com/waiver`

### 5.2 UX Flow

1. Select service/activity (`Home Gym PT`, `Park Training`, `Swimming Lessons`)
2. Enter identity fields (name, DOB, phone/email)
3. Read `Universal Core Waiver`
4. Read selected activity addendum(s)
5. Read AI-assisted coaching notice
6. Check required consent boxes
7. Sign on screen (signature pad)
8. Submit
9. Confirmation screen (and optional signup prompt)

### 5.3 Required Capture Fields

- `fullName`
- `dateOfBirth` (or guardian + participant DOB for minors)
- `phone` and/or `email` (at least one required)
- `activityTypes[]`
- `signature` (vector/base64 or image reference)
- `signedAt`
- `ipAddress`
- `userAgent`
- `aiConsentAccepted` (boolean)
- `waiverVersionRefs[]`

### 5.4 Logged-In vs Public Behavior

- If logged in: attach waiver to `userId` immediately
- If not logged in: save as **ghost record** (`pending link`) and run matching workflow later

---

## 6. AI Notice + Consent (Client-Facing Copy Draft)

**Legal review required before production.**

### 6.1 Recommended UI Copy (Draft)

**AI-Assisted Coaching Notice**

To provide you with the most personalized and efficient coaching possible, SwanStudios uses highly secure, privacy-first AI tools to assist our trainers in drafting programs and organizing training information.

We use strict data-scrubbing and privacy safeguards to anonymize your information before it interacts with AI systems whenever possible. While we take extraordinary measures to protect your privacy and security, no digital system is entirely without risk.

By checking the box below, you consent to SwanStudios using these privacy-protected AI tools to support your training experience.

### 6.2 Required Consent Checkbox (Draft)

- `I understand and agree that SwanStudios may use AI-assisted coaching tools to support my training program, with privacy safeguards and de-identification practices applied whenever possible.`

### 6.3 Messaging Rules

- AI consent must be separate from liability release text
- Avoid fear-heavy wording
- Avoid absolute guarantees ("zero risk", "impossible")
- Emphasize privacy-first design + coach review + de-identification

---

## 7. Role-Aware AI Eligibility (Replaces Binary Consent Gate)

### 7.1 Eligibility Contract

Implement a shared backend decision function:

`evaluateAiEligibility({ targetUserId, actorUserId, actorRole, featureType })`

Returns:

- `decision`: `allow` | `allow_with_override_warning` | `deny`
- `reasonCode`
- `consentSource`: `ai_privacy_profile` | `waiver_signature` | `none`
- `requiresAuditOverride`: boolean
- `warnings[]`

### 7.2 Decision Matrix

| Actor Role | Consent Source Present | Decision |
|-----------|-------------------------|----------|
| `admin` | yes | `allow` |
| `admin` | no | `allow_with_override_warning` |
| `trainer` | yes | `allow` |
| `trainer` | no | `deny` |
| `client` | yes | `allow` (own features only) |
| `client` | no | `deny` |

### 7.3 Admin Override Requirements

If `admin` proceeds without consent on file:

- show warning in UI (not silent)
- require explicit confirm action
- capture override reason (required)
- set `consentOverrideUsed = true` in AI audit record
- persist `overrideActorUserId`, `overrideReason`, `overrideAt`
- **de-identification still runs**

---

## 8. Ghost Record Matching System (Public Waivers -> User Profiles)

### 8.1 Problem

Public QR waivers create signed records without `userId`.

### 8.2 Matching Strategy

Use two layers:

1. **Immediate link** when signed in
2. **Ghost record matching** when not signed in

### 8.3 Auto-Match Cron (Enhancement)

When a new account is created (or on scheduled job), scan pending waiver records.

Confidence examples:

- `HIGH CONFIDENCE` (auto-link + admin notification):
  - `email + DOB` exact match
  - `phone + DOB` exact match
- `MEDIUM CONFIDENCE` (queue for admin approval):
  - `fullName + DOB` exact, missing phone/email
  - `fullName + phone` exact, DOB missing/invalid

### 8.4 Matching Rules

- Do not auto-link on `name` only
- Record match method and confidence score
- Preserve original waiver evidence after linking
- Admin can approve/reject suggested links

---

## 9. Data Model Contract (Schema Draft)

### 9.1 `WaiverVersion`

Stores the exact document text/version that was signed.

- `id`
- `waiverType` (`core`, `activity_addendum`, `ai_notice`)
- `activityType` nullable (`HOME_GYM_PT`, `PARK_TRAINING`, `SWIMMING_LESSONS`)
- `version`
- `title`
- `htmlText` / `markdownText`
- `textHash`
- `effectiveAt`
- `retiredAt` nullable
- `requiresReconsent` boolean

### 9.2 `WaiverRecord`

Signed submission (linked or unlinked).

- `id`
- `userId` nullable
- `status` (`pending_match`, `linked`, `superseded`, `revoked`)
- `fullName`
- `dateOfBirth`
- `email` nullable
- `phone` nullable
- `activityTypes` (ARRAY/JSONB)
- `signatureImageUrl` or `signatureData`
- `signedAt`
- `ipAddress`
- `userAgent`
- `source` (`qr`, `header_waiver`, `admin_tablet`, `in_app`)
- `submittedByGuardian` boolean
- `guardianName` nullable
- `guardianTypedSignature` nullable
- `metadata` JSONB

### 9.3 `WaiverRecordVersion` (Join / Evidence)

Links one signed record to exact versions shown/accepted.

- `id`
- `waiverRecordId`
- `waiverVersionId`
- `accepted` boolean
- `acceptedAt`

### 9.4 `WaiverConsentFlags`

Explicit consent states captured at signing time.

- `waiverRecordId` (PK/FK)
- `liabilityAccepted`
- `aiConsentAccepted`
- `mediaConsentAccepted` nullable
- `guardianAcknowledged` nullable

### 9.5 `PendingWaiverMatch` (Ghost Matching Queue)

- `id`
- `waiverRecordId`
- `candidateUserId`
- `matchMethod`
- `confidenceScore`
- `status` (`pending_review`, `auto_linked`, `approved`, `rejected`)
- `reviewedByUserId` nullable
- `reviewedAt` nullable

### 9.6 `AiConsentLog` (Optional or extend existing audit)

Tracks consent lifecycle and override usage if not embedded in `AiInteractionLog`.

- `id`
- `userId`
- `sourceType` (`ai_privacy_profile`, `waiver_record`, `admin_override`)
- `sourceId` nullable
- `action` (`granted`, `withdrawn`, `override_used`)
- `actorUserId` nullable
- `reason` nullable
- `createdAt`

---

## 10. API / Backend Contract (Draft)

### 10.1 Public Waiver Capture

- `POST /api/public/waivers/submit`
  - no login required
  - validates required fields + signature + selected activity addendum(s)
  - stores `WaiverRecord` + version join rows + consent flags
  - returns confirmation ID (not sensitive internals)

### 10.2 Waiver Lookup / Linking (Authenticated)

- `GET /api/admin/waivers`
- `GET /api/admin/waivers/:id`
- `POST /api/admin/waivers/:id/attach-user`
- `POST /api/admin/waivers/matches/:matchId/approve`
- `POST /api/admin/waivers/matches/:matchId/reject`

### 10.3 AI Eligibility Integration

AI generation/approval endpoints should call shared eligibility service before AI work:

Order:

`auth -> role -> input -> target user exists -> assignment -> AI eligibility -> de-id -> AI call -> validate -> persist/audit`

For admin override path:

- return warning metadata to UI
- log override in audit trail

---

## 11. Admin Dashboard Requirements (Clients & Team > Waivers)

### 11.1 Views

- All waivers
- Pending / ghost waivers
- Auto-match review queue
- Client waiver history
- Version status (current/outdated)

### 11.2 Status Badges

- `Waiver Signed`
- `AI Consent Signed`
- `Consent Missing`
- `Guardian Required`
- `Version Outdated`
- `Pending Match`

### 11.3 Admin Actions

- manual attach to client
- approve/reject auto-match
- resend/share QR link
- view signed artifact / evidence metadata
- mark re-consent required (if policy change)

---

## 12. Security & Privacy Requirements

1. De-identification remains mandatory before any provider call
2. Parameterized DB access only
3. Signature data stored securely (access-controlled)
4. Audit every admin override
5. Fail closed on eligibility-service errors for trainer/client paths
6. Public waiver endpoint rate limiting + abuse protection
7. Validate signature presence and required checkbox states server-side
8. Preserve signed-text version/hash for disputeability and re-consent logic

---

## 13. Phase Mapping (New Track: 5W)

### 5W-A — Waiver + AI Consent Policy Contract

- finalize waiver matrix and AI eligibility policy
- define admin override rules and audit requirements
- legal review handoff draft prepared

### 5W-B — Schema + Migration

- add waiver version/record/match/consent tables
- indexes + retention metadata
- model registration and tests

### 5W-C — Public QR Waiver Capture (No Login)

- public page + signature capture + submit API
- ghost record storage
- validation and abuse protections

### 5W-D — Admin Dashboard Waivers Tab

- pending/linked views
- attach tool
- auto-match review queue
- status badges

### 5W-E — AI Eligibility Service + Admin Override Integration

- shared `evaluateAiEligibility`
- wire to AI workout + long-horizon endpoints
- admin override UI warnings + audit logging

### 5W-F — Re-Consent + Version Migration

- outdated version detection
- re-consent prompts
- migration policy for existing clients

---

## 14. Integration Notes for Phase 5C

Phase 5C (`long-horizon planning`) should use **AI eligibility** instead of a binary consent gate.

Accepted AI consent sources:

- `AiPrivacyProfile` active consent
- signed waiver with `aiConsentAccepted = true` on current version

Admin behavior:

- may proceed with override (audited)
- override does not disable de-identification

Trainer/client behavior:

- blocked until valid consent source exists

---

## 15. Documentation Update Requirements

Update alongside implementation:

- `docs/ai-workflow/AI-HANDOFF/CURRENT-TASK.md`
- `docs/ai-workflow/blueprints/PHASE-5C-LONG-HORIZON-PLANNING-CONTRACT.md`
- `AI-Village-Documentation/SMART-WORKOUT-LOGGER-UNIFIED-V5-PLAN.md`
- this file (status block + acceptance criteria)

---

## 16. Legal Review Required (Non-Code Gate)

Before production launch of QR waivers:

- attorney review of waiver copy and swim addendum
- review of minor/guardian signature flow language
- review of state/local enforceability assumptions for e-signed waivers
- review of AI notice/consent wording and privacy policy references

---

**END OF WAIVER + AI CONSENT QR FLOW CONTRACT**
