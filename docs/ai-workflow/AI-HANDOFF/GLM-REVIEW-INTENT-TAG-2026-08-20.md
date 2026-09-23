# GLM Consult

**Model:** glm-5.3
**Document:** .review-packet.md
**Tokens:** 7891 in / 12369 out (reasoning: 10906) | total 20260
**Wall:** 195.9s

---

# Verdicts on C1–C7

| Claim | Verdict |
|---|---|
| C1 | **TRUE** — `intentTag` (leadCaptureShared.mjs:79) is `typeof string && includes` on a frozen array; `.filter(Boolean)` strips nulls. No coercion path. |
| C2 | **TRUE in-diff** — `intent` flows only into `contactTags`. But "nothing authorizes on it" is a whole-repo assertion the packet cannot prove; it rests entirely on `trainerRecruitmentLinks.contract.test.ts` staying alive. |
| C3 | **TRUE** — optional param defaults null; response shape unchanged; `mergeLeadTags` Set-dedupes. |
| C4 | **TRUE** — see below; no reintroduction vector found. |
| C5 | **TRUE narrowly, incomplete** — no extra query, yes. But it inherits an unordered, unflagged 5000-row sample (F2). |
| C6 | **TRUE as a judgment call** — defensible. Caveats: F1, F5. |
| C7 | **FALSE** — see F3. The diff contradicts the claim. |

# Findings, ranked

**F1 — MED-HIGH (business): No backfill of historical trainer leads.** Every pre-deploy trainer lead exists only as prose in `notes`. `byIntent` launches at zero for all history, so "how many trainers knocked" — the feature's entire purpose — silently excludes every lead to date. Same failure class you set out to kill. Fix: one migration, `UPDATE leads SET tags = tags || '"prism:intent:trainer"' WHERE notes LIKE '%Subject: Trainer inquiry%' AND NOT tags ? 'prism:intent:trainer'`.

**F2 — MED: Stats sample is unordered and unflagged.** leadRoutes.mjs:~133 `findAll({ where, attributes, limit: 5000 })` — **no `order`**. Past 5000 rows the subset is planner-arbitrary, so `byIntent` (and pre-existing `byChannel`) are *nondeterministic* undercounts. You already compute `total`; expose `sampled: total > channelRows.length` and add `order: [['createdAt','DESC']]`. Direct answer to your question: yes, a silently-wrong count is worse than no count here — it is the original sin (a count that silently drops) recurring at scale.

**F3 — MED: C7 is FALSE.** ContactV3.tsx:755 changes `color: #fff` → `var(--text-on-accent, #ffffff)` in the live AlertBox. If that custom property is defined anywhere in the theme, alert text color changes on screen. Unrelated to the feature, unexplained in the packet, and directly contradicts "no live user-visible behaviour changed." Revert it or prove the var is undefined globally and split it into its own commit.

**F4 — MED: Verification claims overstate frontend coverage.** `node --check` cannot parse `.tsx`. The two frontend files were therefore never syntax- or type-checked by your stated method, and no `tsc` run is claimed. If the contact POST helper has a typed payload interface without `intent`, the frontend build breaks. Also: no integration test exercises route→service→tag; a typo in the contactRoutes passthrough (contactRoutes.mjs:~213) ships green against your unit suite. You acknowledged no HTTP test — this is the concrete shape of that gap.

**F5 — LOW: Multi-intent rows counted under an arbitrary first tag.** Repeat submitter (book, then trainer) gets unioned tags via `mergeLeadTags`; the aggregator's `tags.find` (leadCaptureShared.mjs:~98) counts the row once, under whichever tag happens to be first in array order. Either strip stale `prism:intent:*` on merge or iterate all intent tags.

**F6 — LOW: Snapshot-timing inconsistency in ContactV3.** Intent is frozen into `seedRef` at mount; `readAcquisitionParams()` is read at submit (ContactV3.tsx:~929–932). A client-side param change without remount (`/contact` → `/contact?intent=trainer`) is missed; the reverse direction tags a stale trainer. Rare (manual URL edits hard-navigate), but reading intent at submit like attribution makes them consistent.

**F7 — LOW: Unbounded key length in aggregator output.** Tags are admin-writable JSONB; first intent tag per row can be ~1MB → worst-case `byIntent` JSON of ~5GB across 5000 rows. Admin-gated, so low — cap `intent.slice` length (~64) or bucket only `CAPTURE_INTENTS`.

**F8 — INFO: Unverifiable from the packet.** (a) leadCaptureRoutes' actual membership check and tag emission are not in the diff — only the `Set` construction; C1's extension to that funnel is asserted, not shown. (b) `/stats` auth: `protect`/`trainerOrAdminOnly` are imported but the hunk doesn't show them applied. (c) The `findOrCreate` race is benign for intent *only if* `Lead.email` has a unique index — without it, concurrent submits duplicate rows and double-count. Verify the constraint.

# Attack-list answers

- **Trainer tag without a click:** yes, trivially — `curl POST /api/contact {intent:'trainer'}` or the public `/api/leads/capture`. Doesn't matter *given C2 holds*; the only rule is no consumer ever authorizes on it. `byIntent` is exposed to `trainerOrAdminOnly` (if applied), so trainers can see recruiter funnel volume — pre-existing scope, note it.
- **`Object.create(null)` sufficient?** Yes. `Object.values` and `JSON.stringify` are safe because the null-proto object never escapes — emitted buckets are `{}` literals with normal prototypes. Sequelize rows are read-only inputs. Distinct keys are bounded: first intent tag per row × ≤5000 rows. Your pre-fix mechanism description (`acc['__proto__']` truthy → `+=` lands on `Object.prototype.count`) is correct.
- **Import cycle:** none. `leadCaptureShared` gained no imports; it's a leaf. `new Set(CAPTURE_INTENTS)` runs after dependency evaluation — no load-order hazard.
- **Missed entirely:** F1 (backfill) is the one a production decision would be made on wrong data with; F4 (no wiring test) is the one a refactor would silently break.

# Could not break

`intentTag` allowlist (no coercion, case, array, or toString path), the pollution fix in both aggregators, malformed-row robustness, backward compat of the service signature, the import graph. No padding needed — those hold.
