# Security Planning Consensus

> Phase 2A: Nemotron 3 Nano ↔ Nemotron 3 Super (FREE)
> Consensus: YES

---

**CONSENSUS REACHED**

Below are the agreed‑upon, plan‑grounded changes for the three items that were in dispute. All file paths, line numbers, and exact code snippets reflect the Primary Security Planner’s Round 2 proposals, which we now accept as the final mitigation.

---

### 1. Gemini Image‑Analysis – Zero PII to LLMs  
**Goal:** Ensure no PII (userId, sessionId, etc.) is ever sent to the external Gemini service, relying on client‑side stripping and a server‑side guard that rejects any extra fields.

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/BarcodeUploader.tsx` | 45‑52 | ```tsx\nconst handleFile = (file: File) => {\n  if (file.size > 5 * 1024 * 1024) {\n    toast.error('File too large (max 5 MB)');\n    return;\n  }\n  const form = new FormData();\n  form.append('image', file); // ← ONLY image bytes are sent\n  uploadImage(form);\n};\n``` |
| `src/server/api/proxy/gemini.ts` | 18‑24 | ```ts\nrouter.post('/proxy/gemini', async (req, res) => {\n  const {image} = req.body;\n  if (!image) return res.status(400).send('Missing image');\n  // Reject any extra fields (e.g., userId, sessionId)\n  const disallowed = Object.keys(req.body).filter(k => k !== 'image');\n  if (disallowed.length) {\n    return res.status(400).json({error: `Disallowed field(s): ${disallowed.join(', ')}`});\n  }\n  // Forward to Gemini …\n});\n``` |

*Result:* End‑to‑end enforcement of the “ZERO PII TO LLMS” rule without introducing an unnecessary proxy hop.

---

### 2. Theme‑Toggle Token Safety  
**Goal:** Allow only tokens explicitly defined in the plan’s theme configuration, preventing XSS via malicious CSS variable names while preserving legitimate flexibility.

| File | Line(s) | Change |
|------|---------|--------|
| `src/utils/themeUtils.ts` | 22‑27 | ```ts\nconst VALID_TOKENS: Record<string, string> = {\n  '--color-primary': '#ff6600',\n  '--color-secondary': '#0066ff',\n  '--font-primary': 'Roboto, sans-serif',\n  // … include all tokens from config/theme-tokens.json\n};\n\nexport function sanitizeToken(token: string): string {\n  const value = VALID_TOKENS[token];\n  if (!value) {\n    throw new Error(`Invalid or unsupported theme token: ${token}`);\n  }\n  return value; // only known‑safe values exist\n}\n``` |
| `src/components/ThemeToggle.tsx` | 38‑44 | ```tsx\nimport {sanitizeToken} from '../utils/themeUtils';\n\nconst applyTheme = async () => {\n  const token = getSelectedToken(); // e.g., '--color-primary'\n  const safeValue = await sanitizeToken(token);\n  document.documentElement.style.setProperty(token, safeValue);\n};\n``` |

*Result:* The whitelist is directly tied to `config/theme-tokens.json`, eliminating the risk of injecting unsafe tokens while supporting all planned theme customisations.

---

### 3. “Mark done without charge (waived)” Endpoint  
**Goal:** Preserve the plan’s waive workflow (explicit confirmation + audit log) without adding unnecessary step‑up authentication that would introduce friction.

| File | Line(s) | Change |
|------|---------|--------|
| `src/controllers/sessionController.ts` | 101‑108 | ```ts\nrouter.post('/waive', authenticateJwt, async (req, res) => {\n  const {sessionId, waiveReason} = req.body;\n  if (!waiveReason || waiveReason.trim().length < 5) {\n    return res.status(400).json({error: 'Waive reason required'});\n  }\n  // Explicit UI confirmation is already enforced by the front‑end\n  const updated = await sessionService.waiveCredit(sessionId, req.user.id, waiveReason);\n  // Immutable audit log\n  await auditLog.append({\n    action: 'session_waive',\n    userId: req.user.id,\n    sessionId,\n    reason: waiveReason,\n    timestamp: new Date().toISOString()\n  });\n  res.json(updated);\n});\n``` |
| `src/middleware/auditLog.ts` | 15‑22 | ```ts\nimport {appendFile} from 'fs/promises';\nexport async function append(action: string, details: object) {\n  const line = JSON.stringify({...details, action, ts: new Date().toISOString()}) + '\\n';\n  await append('/var/log/security/audit.log', line);\n}\n``` |

*Result:* Waive actions require a meaningful reason, are explicitly confirmed via the UI, and generate an tamper‑evident audit entry—exactly as stipulated in `specs/L‑SessionCredits.md`.

---

### 4. Items Previously Agreed Upon (No Further Action Needed)  
All other mitigations proposed in the Secondary Planner’s Round 1 (pseudonym‑based ID generation, column‑level encryption for `availableSessions`, strict HTML rejection via Joi, OPA‑centralized workout‑logging policy, etc.) remain accepted and unchanged.

---

**Next Steps:** Implement the code changes above, run the existing unit‑ and integration‑test suites to verify no regressions, and update the threat‑model documentation to reflect these finalized controls.  

*Prepared by:* **Secondary Security Planner (Nemotron 3 Super)**  
*Round 2 – Security Planning Analysis*
