# Swan Taste Brain — round 6: is it dry? — reviewed by HY3 (tencent/hy3)

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND6-PANEL-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 55908 in / 15622 out | **Cost:** ~$0.0155 | **Wall:** 97.2s | **finish_reason:** stop

---

## VERDICT
REJECT — a crafted grid-selection event leaks Midlibrary style codes into non-owner memories via the local-comfy exemption, and the frontend violates the non-negotiable styled-components house rule.

## BLOCKERS
1. **P0**: Style-code leak to non-owner memory. Input: `POST /api/event` with body `{profileId:'partner', projectId:'school', eventType:'grid-selection', candidates:[{id:'x', provenance:'local-comfy', sref:'123456789', url:'https://...'}], items:[{id:'x', verdict:'closest', reasonCode:'light', outcomeClass:'style'}]}` → passes `events.mjs:116-118` (allows `sref` when `provenance==='local-comfy'`) → `appendEvent` stores it → `profile.mjs:72-75` includes `sref` in `t.picks` → `profile.mjs:181` keeps it because `p.generated` is true → `/api/profile` returns the code and the brief prints `--sref 123456789`, violating the licence law that non-owner memories must never carry style codes. Fix: in `profile.mjs:72` force `sref: null` when `profileOf(e) !== DEFAULT_PROFILE`.

2. **P1**: Binding house-rule violation — styled-components not used. The frontend builds DOM via `innerHTML` and loads external CSS files (`app-make.js:20`, `app-shell.js:15`, `app-directions.js:10`, `app-judge.js:20`); no React or `styled-components` import exists anywhere in the provided source. This is non-negotiable and must be remediated before ship.

## ATTACKS
- **Correctness**: The local-comfy+sref bypass (above) is a happy-path-only guard that assumed render intents never carry codes, but events are written directly to disk. `ownSubjects` (`taste-namespace.mjs:114`) silently drops any subject with a repeated long word (e.g., "forest forest light") — minor but untested. `readEvents` (`events.mjs:180`) pushes `{_corrupt:true}` on parse failure; downstream `activeEvents` filters it out, so no crash, but corrupt lines are silently lost. No race conditions (sync fs), off-by-one, or stale-state bugs found in reviewed paths.
- **Security**: Host gate (`origin.mjs:37-40`) is sound against DNS rebinding. No IDOR beyond the sref scope leak. `checkWriteRequest` (`origin.mjs:46`) treats empty `origin` as trusted, which is correct for curl/CLI but means a browser `Origin: ""` (rare) would pass — low risk. Replay/idempotency: `eventIdFor` includes `presentedAt`, so same grid with new timestamp is not deduplicated; acceptable. Multi-tenant scope leak is the sref issue above.
- **Data-truth / schema drift**: Candidate `provenance:'local-comfy'` with non-null `sref` creates drift between the enforced law ("no codes in non-owner") and stored data. Frontend response shape (`sref` field) matches across `serve.mjs` and `app-make.js`; no PascalCase/snake_case or FK drift observed in provided code.

## HIGHEST RISK
The style-code leak (Blocker 1). Cheapest de-risk: in `profile.mjs` `tally` at the `t.picks.push` call (line 72), set `sref: profileOf(e) === DEFAULT_PROFILE ? (c.sref || rec.sref) : null`. This guarantees the brief and `/api/profile` never emit a code for partner/client without touching event validation or the render loop.

## CONFIDENCE
Could NOT verify from the document alone: the unreviewed files `lib/routes-renders.mjs`, `lib/routes-make.mjs`, `lib/projects.mjs`, `lib/corpus.mjs`, `lib/images.mjs`, `lib/probe.mjs`, `capture-workflow.mjs`, `app.css`, `probe.css`. Specifically: whether `routes-renders.mjs` serves render bytes with proper `range.mjs` support and no sref leakage; whether `projects.mjs` `SHAREABLE_PROVENANCE` exactly matches `NON_OWNER_PROVENANCES`; whether `poolFor` excludes Midlibrary for non-default; and whether the CSS meets Crystalline Swan palette, 44px targets, dark-first, WCAG 4.5:1. Evidence to settle: read those files and run the 479-test suite with a non-owner `grid-selection` event carrying `provenance:'local-comfy', sref:'123456789'` to confirm no assertion fails and the brief stays code-free. I am uncertain whether the styled-components rule applies to this local prompt tool or only the production SaaS UI; the binding instruction says flag any violation, so I flagged it, but if scope excludes this tool the P1 may be downgraded.
