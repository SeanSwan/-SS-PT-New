# 04 — Build Order (file by file)

Every slice leaves the app bootable. Line budget ≤300/file (hard rule).

| # | Slice | File | New/Mod | Purpose | Mimic |
|---|---|---|---|---|---|
| 1 | S1 | `backend/services/emailTemplates.mjs` | NEW | 3 templates + render + list | pure-module style of `smsService` template registry |
| 2 | S1 | `backend/services/leadUnsubscribeToken.mjs` | NEW | HMAC make/verify/buildUrl | node `crypto` only, no deps |
| 3 | S1 | `backend/__tests__/emailTemplates.test.mjs` | NEW | render contract locks | shape of `backend/__tests__/leadCaptureService.test.mjs` |
| 4 | S2 | `backend/routes/leadRoutes.mjs` | MOD | public unsubscribe GET **above** `router.use(protect)` (:16) | existing handler style in same file (dynamic model imports) |
| 5 | S2 | `backend/tests/api/leadUnsubscribe.test.mjs` | NEW | supertest: valid/invalid/idempotent/200-always | `backend/tests/api/availabilityRoutes.test.mjs` (vi.mock auth + fresh express app + supertest) |
| 6 | S3 | `backend/services/emailAutomationSender.mjs` | NEW | the one SendGrid bridge (5 refusal literals) | error-shape of `sendgridService.mjs` (never throws) |
| 7 | S3 | `backend/services/automationService.mjs` | MOD | email branch: `channel_not_implemented` → `sendAutomationEmail`; load lead by `log.leadId` | the adjacent SMS branch — byte-parallel structure |
| 8 | S3 | `backend/__tests__/automationService.emailChannel.test.mjs` | NEW | processor sends email; failures land as failed+reason; gates still refuse | `backend/__tests__/automationService.triggerLead.test.mjs` |
| 9 | S4 | `backend/services/automationService.mjs` | MOD | `speed_to_lead` in DEFAULT_SEQUENCES (isActive:false) + fast-lane `setImmediate` kick at end of lead enrollment | existing `lead_nurture` entry (:16-55) |
| 10 | S4 | `backend/__tests__/automationService.speedToLead.test.mjs` | NEW | seed shape; kick fires; kick is fully gated (unarmed = no send) | file #8 |
| 11 | S5 | `backend/routes/automationSafetyRoutes.mjs` | MOD | `/templates/preview` += `emailTemplates` | the SMS half of the same handler |
| 12 | S5 | `frontend/src/components/DashBoard/workspaces/marketing/SpeedToLeadStatusCard.tsx` | NEW | admin card per 02-W2 | `LeadPipelinePanel.tsx` (same folder: fetch pattern, styled-components, tokens) |
| 13 | S5 | `frontend/src/components/DashBoard/workspaces/marketing/MarketingWorkspace.tsx` | MOD | lazy import + mount card above LeadPipelinePanel (:31, :170) | the LeadPipelinePanel lazy pattern in the same file |
| 14 | S5 | `frontend/src/components/DashBoard/workspaces/marketing/SpeedToLeadStatusCard.test.tsx` | NEW | armed/off, masked emails, empty/error states | `LeadPipelinePanel.test.tsx` (same folder) |
| 15 | S6 | `docs/ai-workflow/marketing/speed-to-lead-runbook-2026-07.md` | NEW | activation steps + kill switch + verify | — |

## Key excerpts the builder needs verbatim

**Route mount pattern** (`backend/core/routes.mjs` — leadRoutes is ALREADY mounted;
S2 adds a handler inside the existing file, so NO routes.mjs change at all):
```js
app.use('/api/leads', leadRoutes);        // routes.mjs — already present (:672)
```

**leadRoutes.mjs auth structure (why the unsubscribe handler goes ABOVE these lines):**
```js
const router = express.Router();
// >>> S2 inserts: router.get('/unsubscribe', ...)  HERE <<<
router.use(protect);               // :16
router.use(trainerOrAdminOnly);    // :17
```

**Processor email branch — the ONLY automationService edit in S3** (schematic):
```js
// BEFORE (today): if (log.channel === 'email') -> markFailed(log, 'channel_not_implemented')
// AFTER:
if (log.channel === 'email') {
  const lead = log.leadId ? await Lead.findByPk(log.leadId) : null;
  const result = await sendAutomationEmail({ log, lead });
  if (result.success) { /* same code path the SMS branch uses to mark sent */ }
  else { /* same failed path, error = result.error */ }
}
```

**Test boot pattern** (from `availabilityRoutes.test.mjs` — copy this shape):
```js
vi.mock('../../middleware/authMiddleware.mjs', () => ({ protect: (req,res,next)=>{...}, trainerOrAdminOnly: (_r,_s,n)=>n() }));
function createApp() { const app = express(); app.use(express.json()); app.use('/api/leads', leadRoutes); return app; }
```

**Frontend token discipline** (every styled block):
```ts
background: var(--card-dark, #141419);
color: var(--text-primary, #E0ECF4);
/* 44px min-height on the button; armed dot #10b981 / off dot #6b7280 (status colors) */
```

## Commands
- Backend tests: `cd backend && npx vitest run __tests__/emailTemplates.test.mjs` (etc. per slice)
- Frontend tests: `cd frontend && npx vitest run src/components/DashBoard/workspaces/marketing/SpeedToLeadStatusCard.test.tsx`
- Types: `cd frontend && npx tsc --noEmit` (must stay 0 errors — baseline is clean as of 2026-07-16)
- Never run the full backend suite as a gate (259 files, some env-dependent); run the named files.
