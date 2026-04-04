# Privacy Proxy Architecture
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: AI/PII features, privacy proxy, data protection

---

## Privacy Proxy Architecture (MANDATORY — Zero PII to LLMs)
**No client personally identifiable information (PII) may ever be sent to any external LLM.** This applies to ALL AI systems: Coach Assistant, App Hive Mind, AI Village code review, and OpenClaw.

### PII Filter Rules
Before ANY text is sent to an LLM (via `aiChatService.mjs` or OpenClaw proxy):
- Client names → replaced with `User #[userId]` or `Client #[userId]`
- Trainer names → replaced with `Trainer #[trainerId]`
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- Street addresses → `[ADDRESS_REDACTED]`
- SSN patterns → `[SSN_REDACTED]`
- Credit card patterns → `[CC_REDACTED]`

### Display Mapping
- **Frontend** shows real names (fetched from user profile API, joined client-side)
- **Backend** sends only IDs to LLMs; maps IDs back to names in responses for display
- Example: LLM receives "Generate leg day for User #47" → responds with "User #47 should..." → frontend displays "Marcus should..."

### OpenClaw Privacy Proxy Endpoints
New API namespace: `/api/openclaw/*` — authenticated via dedicated API key
- `POST /api/openclaw/log-workout` — accepts userId + exercises, never client name
- `POST /api/openclaw/onboard-client` — accepts anonymous intake data, returns claim code
- `GET /api/openclaw/health` — site status check (no PII involved)
- `GET /api/openclaw/stats` — aggregate metrics only (no individual client data)

### Audit Trail
Every AI request logged: `{ timestamp, userId, action, piiStripped: true, provider, model }`
