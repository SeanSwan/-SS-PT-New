# 05 — Slices & Executable Acceptance Criteria

Rule for every slice: build ONLY the listed files, paste the evidence, STOP for
checkpoint. "Do not proceed to the next slice until the checkpoint verdict is PASS."

---
## S1 — Templates + unsubscribe tokens (pure modules, zero integration)
**Files:** emailTemplates.mjs, leadUnsubscribeToken.mjs, emailTemplates.test.mjs
**Acceptance (paste all outputs):**
1. `cd backend && npx vitest run __tests__/emailTemplates.test.mjs` → **≥8 tests, 0 fail**, covering:
   - each of the 3 templates renders subject/text/html with `firstName:'Marcus'`
   - firstName missing → "Hey there," appears in text AND html
   - every html contains the unsubscribe link AND the literal footer line
   - unknown template name throws `Unknown email template: nope`
   - `makeUnsubscribeToken(7)` is deterministic; `verifyUnsubscribeToken(7, tok)` true; tampered token false
   - both secrets unset → `buildUnsubscribeUrl` returns null AND render still succeeds with footer minus link
2. Subjects match 02-wireframes byte-for-byte (paste the three rendered subjects).
**STOP.**

---
## S2 — Public unsubscribe endpoint
**Files:** leadRoutes.mjs (MOD), leadUnsubscribe.test.mjs
**Acceptance:**
1. `npx vitest run tests/api/leadUnsubscribe.test.mjs` → **≥6 tests, 0 fail**:
   - valid lid+tok → 200 HTML containing `You're unsubscribed.`; lead.tags gains `email-unsubscribed` exactly once; LeadActivity created
   - repeat call → 200 same page, tags unchanged (idempotent), no duplicate activity
   - bad token / non-numeric lid / missing params → 200 HTML `Link expired or invalid.` — and DB untouched
   - route reachable with NO auth header (this proves placement above `router.use(protect)`)
2. Paste the diff hunk showing the handler physically ABOVE the `router.use(protect)` line.
**STOP.**

---
## S3 — Email channel in the processor
**Files:** emailAutomationSender.mjs, automationService.mjs (MOD — email branch ONLY), automationService.emailChannel.test.mjs
**Acceptance:**
1. `npx vitest run __tests__/automationService.emailChannel.test.mjs` → **≥7 tests, 0 fail**:
   - due email log + configured sendgrid mock → status `sent`, sentAt set, sendGridEmail called once with rendered subject/html
   - sendGridEmail `{success:false}` → status `failed`, error starts `sendgrid_error:`
   - lead tagged `email-unsubscribed` → `failed` with error `lead_email_unsubscribed`, sendGridEmail NOT called
   - unknown template → `failed`, `unknown_template:` prefix
   - missing recipient → `failed`, `missing_recipient`
   - arm gate off → nothing processed (prove the gate still guards email)
   - SMS branch untouched: existing `automationService.triggerLead.test.mjs` + `automationService.preview.test.mjs` still pass — run them, paste counts
2. `grep -n "channel_not_implemented" backend/services/automationService.mjs` → **no matches**.
**STOP.**

---
## S4 — speed_to_lead sequence + fast-lane kick
**Files:** automationService.mjs (MOD), automationService.speedToLead.test.mjs
**Acceptance:**
1. `npx vitest run __tests__/automationService.speedToLead.test.mjs` → **≥5 tests, 0 fail**:
   - `ensureDefaultSequences` creates `speed_to_lead` with `isActive:false` and the exact 3 steps (0/2/5, email, stl_* names)
   - triggering `lead_captured` on the ACTIVE sequence inserts 3 automation_logs; step0 `scheduledFor` ≤ now+60s; **every row's `recipient` = the lead's email**
   - lead with NO email → rows land `failed` with `missing_recipient` (not silently skipped, not crashed)
   - the setImmediate kick invokes processScheduledMessages (spy) after enrollment
   - kick with arm gate OFF sends nothing (gates hold)
   - existing `lead_nurture` sequence untouched (still present, still inactive, still sms)
2. Paste the DEFAULT_SEQUENCES diff hunk — it must show ONLY the new entry added.
**STOP.**

---
## S5 — Admin visibility
**Files:** automationSafetyRoutes.mjs (MOD), SpeedToLeadStatusCard.tsx, MarketingWorkspace.tsx (MOD), SpeedToLeadStatusCard.test.tsx
**Acceptance:**
1. `cd frontend && npx vitest run src/components/DashBoard/workspaces/marketing/SpeedToLeadStatusCard.test.tsx` → **≥6 tests, 0 fail**: armed badge on/off, pending count renders, recipient masking (`j***@gmail.com` — assert full address NOT in DOM), empty state copy, error state copy, button ≥44px (style assertion)
2. `npx tsc --noEmit` → 0 errors (paste count line)
3. Backend: templates/preview test or curl-shape evidence showing `emailTemplates` array in response
4. Paste the MarketingWorkspace diff hunk: lazy import + mount above LeadPipelinePanel, nothing else changed.
**STOP.**

---
## S6 — Runbook + live verification (NO code)
**Files:** speed-to-lead-runbook-2026-07.md
**Content (all sections mandatory):** pre-flight checklist (env names present, sequence exists+inactive) · owner-only live test procedure: temporarily activate on staging/prod with Sean's own email as a manual lead → verify inbox delivery + unsubscribe link works end-to-end → deactivate · activation steps (set sequence isActive:true via admin/SQL + confirm `SWAN_AUTOMATION_CRON_ENABLED`) · kill switch (3 ways: sequence off / cron env off / SendGrid key revoke) · monitoring (what the admin card + `/api/automation/preview` show) · rollback plan.
**Acceptance:** the runbook is executable by Sean without reading any code. Checkpoint = architect reads it hostile.
**HARD GATE: the builder NEVER activates the sequence, never sets env vars, never sends real email. Activation is Sean-executed via the runbook (T3 external-visible action).**

---
## Slice → deploy protocol
Commit per slice (`feat(marketing): ...` style), push ONCE at epic end to a branch
named `claude/speed-to-lead-email` cut from **origin/main** (verify freshness first:
`git rev-list --left-right --count origin/main...HEAD`). NEVER commit from a stale
tree. Main merge is Sean-gated.
