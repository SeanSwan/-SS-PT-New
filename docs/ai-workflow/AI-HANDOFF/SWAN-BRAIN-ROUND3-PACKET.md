# SWAN BRAIN — round 3: the round-2 fixes, and three decisions

- **Branch A** `claude/design-brain-repave-20260816` @ `78dfd53c6` · **Branch B** `claude/constitution-s18-20260816` @ `bd8d0a96c`
- Neither merged. **Nothing deploy-linked** (Render deploys from `main`).
- You reviewed rounds 1 and 2. **This is the diff your round-2 findings produced.**

---

## 0. REMIT

1. **Are the round-2 fixes correct and complete?** (They are two added assertions — small surface, but this workstream's fixes have repeatedly carried defects.)
2. **Do the three deliberate NON-fixes below hold up?**
3. **Safe to merge now?**

**A clean round is the goal, not a quota. If you find nothing real, say "no new findings" and list what you checked.** At this stage a manufactured finding costs more than a missed one.

Tables first: `ID | severity | claim | evidence | proposed fix`, then `branch | safe to merge? | blocking | checklist`, prose last. Label unverifiable claims **HYPOTHESIS**.

---

## 1. ROUND-2 FINDINGS AND DISPOSITION

| finding | source | disposition |
|---|---|---|
| Palette-existence assertion died with the deleted mirror check | Kimi R2-1 / GLM R2-4 (**converged independently**) | **FIXED** — re-asserted on `design.md`; proven both ways (real file yields 23 unique hex tokens, ≥20 floor; palette-less input yields 0 and pushes the error) |
| Negative sentinel dropped without successor (`Tier 3 — Reduced motion`) | GLM R2-5 | **FIXED** — re-homed against `design.md`. I had argued the positive assertion subsumed it; it does not. A positive check says what canon must SAY and cannot catch a contradiction beside it. Proven both ways (real file false, poisoned string true) |
| Sibling consult scripts still emit "reviewed by HY3 **Design Review**" | GLM R2-2 (HYPOTHESIS) | **FALSE POSITIVE** — both hardcode short names (`reviewed by HY3 (${model})`, `reviewed by GLM (${model})`) and never read `provider.title`. Verified by grep, which is what the finding asked for |
| External-reference contract red and unowned | GLM R2-6 | **ROUTED** — filed as its own tracked issue with baseline evidence, deliberately out of scope for this workstream |
| 4 constitution refs to `design.html` go false when A merges | GLM R2-1 (HIGH) / Kimi R2-3 | **ACCEPTED as sequencing** — see §2 |
| No cross-check between `design.md` and its declared source system | GLM R2-3 (HYPOTHESIS) | **CONFIRMED gap, deliberately NOT fixed** — see §2 |
| Trailing-`Review` regex is a latent trap for future provider names | Kimi R2-2 | **ACCEPTED** — current titles safe (verified); Kimi's own advice was not to spin a commit for it alone |

---

## 2. THE THREE DELIBERATE NON-FIXES — ATTACK THESE

**(a) The 4 constitution references.** After A merges, Rule 40 in both constitutions still calls `design.html` a live mirror, contradicting `ACTIVE-INDEX.md` which every session reads at startup. The brain gate stays CLEAN through this because it only walks `docs/ai-workflow/design-brain/`. I am treating this as a **sequencing** obligation (a follow-up commit cut from post-A main, same session) rather than rework on a 70-behind branch. **Is that the right call, or should A be held until the fix can land atomically?**

**(b) No `design.md` ↔ source-system cross-check.** Confirmed: `verify-world-engine.mjs` loads `sourceSystem` and asserts it *single-file* only; nothing combines it with `designMd`. The retired mirror check guarded `design.md`↔`design.html`; nothing guards `design.md`↔`SWAN-CINEMATIC-DESIGN-SYSTEM.md`. I did **not** invent one, because deciding what "ADAPTS" means mechanically is a doctrine decision, not a restoration of lost coverage. **Is recording the gap sufficient, or is shipping without it negligent?**

**(c) Three hand-maintained copies of the header-derivation logic.** Cannot share a module until the branches meet on main. **Does this block a merge, or is it correctly post-merge work?**

---

## 3. WHAT TO ATTACK IN THE DIFF

1. The palette assertion counts `#[0-9A-Fa-f]{6}` — it will also count hex inside code fences, prose examples, or a struck-through retired palette. Is ≥20 meaningful, or does it pass for the wrong reason?
2. The negative sentinel matches a literal em-dash string `Tier 3 — Reduced motion`. Trivially evaded by rewording ("Tier 3: reduced motion"). Is a sentinel that specific worth having, or is it false comfort?
3. Both new checks push to `errors` — confirm they are inside the function that actually reports, and that adding them cannot change existing pass/fail counts. (Measured: `verify-world-engine` stays 9 pass / 2 fail = main's baseline; `receipt-prune` 4 pass / 0 fail.)
4. Did round 2 leave anything unfixed and unrecorded?

---

## 4. ROUND-2 FIX DIFF (`9420cb5b6..78dfd53c6`)
```diff
diff --git a/scripts/ai-workflow/verify-world-engine.mjs b/scripts/ai-workflow/verify-world-engine.mjs
index 2a964d69d..923f427b4 100644
--- a/scripts/ai-workflow/verify-world-engine.mjs
+++ b/scripts/ai-workflow/verify-world-engine.mjs
@@ -195,6 +195,23 @@ export function auditWorldEngineBundle(bundle) {
   // them turned a real pre-existing failure ("external-reference receipt/fallback contract is
   // incomplete") into an ENOENT crash that MASKED it — same failure count, worse information.
   // design.md carries the Full/Lean/Still + Reduced-Motion contract on its own, asserted above.
+  //
+  // The retired design-mirror-check.mjs asserted TWO things, and only one died with its subject:
+  // (a) every canonical token in design.md also appears in design.html — dead, no mirror exists;
+  // (b) design.md yields >= 20 canonical tokens at all — a PALETTE-EXTRACTION SANITY check whose
+  // subject is still very much alive. Deleting the script silently dropped (b) (Kimi round 2,
+  // R2-1). Re-asserted here so a design.md that stops yielding a palette still fails loudly.
+  const canonicalTokens = new Set((bundle.designMd ?? '').match(/#[0-9A-Fa-f]{6}\b/g) ?? []);
+  if (canonicalTokens.size < 20) {
+    errors.push(`design.md canonical palette extraction found only ${canonicalTokens.size} unique hex tokens (expected >= 20)`);
+  }
+  // NEGATIVE sentinel, re-homed from the deleted design.html check (GLM round 2, R2-5). It guards
+  // the RETIRED "Reduced-Motion-as-a-fourth-tier" contract from creeping back. The surviving
+  // positive assertion above states what canon must say; this states what it must NOT say, and a
+  // positive check cannot catch a contradiction sitting beside it.
+  if (/Tier 3 — Reduced motion/i.test(bundle.designMd ?? '')) {
+    errors.push('design.md retains the retired Reduced-Motion-as-tier contract');
+  }
   requirePattern(errors, bundle.motion ?? '', /Licensed M4 pointer[\s\S]*Full\/Lean\/Still/i, 'motion doctrine lacks M4 and runtime-mode stitching');
   requirePattern(errors, bundle.cinematic ?? '', /M4 loss-matrix pointer[\s\S]*B3 failure[\s\S]*B1\/B0/i, 'cinematic doctrine lacks M4 backend-loss stitching');
   requirePattern(errors, bundle.reviewers ?? '', /M4 license and failure safety[\s\S]*automatic REVISE/i, 'reviewer adapter lacks M4 automatic-REVISE gate');
```
