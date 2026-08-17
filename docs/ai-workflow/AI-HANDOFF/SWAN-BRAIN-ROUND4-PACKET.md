# SWAN BRAIN — round 4: the confirming round before merge

- **Branch A** `claude/design-brain-repave-20260816` @ `6ea727fad` (pushed) · **Branch B** `claude/constitution-s18-20260816` @ `bd8d0a96c` (pushed)
- Neither merged yet. **Merging deploys to production** — Render auto-deploys from `main`.
- Rounds 1–3 complete. **You returned "no new findings" in round 3.** Kimi returned 3, all now dispositioned. This is the confirming round; if it is clean, this merges.

---

## 0. REMIT — THIS IS THE LAST GATE BEFORE PRODUCTION

The loop ends when a round finds nothing and one further round confirms it. You have already gone clean once. **Kimi's round-3 fixes have not been reviewed by anyone** — they are the main thing that is new here.

1. Are the round-3 fixes correct?
2. Is anything left unfixed and unrecorded?
3. **Safe to merge to `main`, knowing that merging ships to production?**

**If you find nothing, say "no new findings" and list what you checked — that is the expected outcome and it is what unblocks the merge.** Do not manufacture a finding to look thorough. But a false clean is far worse than another round: if something is genuinely wrong, say so plainly and I will not ship.

Tables first (`ID | severity | claim | evidence | fix`, then `branch | safe? | blocking | checklist`), prose last. Label unverifiable claims **HYPOTHESIS**.

---

## 1. WHAT CHANGED SINCE YOUR CLEAN ROUND

Two fixes, both to the palette/sentinel checks you reviewed.

**Kimi R3-1 — the count had the OPPOSITE failure mode to the one I had already fixed.**
I had found that the `>= 20` unique-hex floor could *pass for the wrong reason*: of design.md's 23 tokens, 3 sit in code fences and 3 are the RETIRED Galaxy-Swan palette quoted as do-NOT-use examples, so deleting the live palette entirely still cleared the floor. I fixed that by anchoring on the 5 active Crystalline values.

Kimi found the mirror image: **23 observed against a floor of 20 is 3 tokens of headroom, so a legitimate 4-token palette revision would FAIL a healthy canon.** That is the more corrosive failure — a gate whose false-positive path is "someone edited the palette" is a gate that gets switched off, and then it protects nothing.

**Resolution: dropped the count entirely rather than tuning the magic number.** The anchor check already carries the real signal and has neither failure mode.

**Kimi R3-2 — the sentinel is a verbatim tripwire, not a semantic guard.** Added the colon variant (the one editorial normalisation likely to happen by accident) and stated the scope limit in the source: it catches history-resurrection by copy-paste, which preserves the literal string; paraphrase-evasion is accepted and owned by doctrine review, not by this regex.

**Kimi R3-1 sub-claim DISPROVEN:** it flagged (as HYPOTHESIS) that the `\b` might silently drop 8-digit `#RRGGBBAA` tokens. design.md carries **zero** 8-digit tokens.

**Kimi R3-3 — inconsistent deferral hygiene.** I had filed one deferred item as a tracked issue while leaving two as prose promises. All three are now tracked issues.

### Proven four ways, not two

| input | result |
|---|---|
| real `design.md` | 0 missing anchors — passes correctly |
| palette stripped, 28 filler hexes | 5 missing anchors — **catches** (the old floor would have passed) |
| palette *revised* to 7 tokens | 0 missing anchors — **no false alarm** (the case the old floor got wrong) |
| sentinel | real `false`; em-dash `true`; colon `true` |

---

## 2. MERGE EVIDENCE — RE-RUN AGAINST CURRENT MAIN

My earlier trial merge was stale: `main` gained 7 commits during the work. Re-run against current `origin/main` (`2f3a648d8`):

| surface | main today | merged tree |
|---|---|---|
| brain gate | **does not exist on main** (`check-brain-links.mjs` absent — it arrives with this branch) | **CLEAN** — 28 files · 75 refs · 0 defects |
| design-brain suite | — | **73 pass / 0 fail** |
| `verify-world-engine` | 9 pass / 2 fail | 9 pass / 2 fail — **identical** |
| `receipt-prune` | 4 pass / **1 fail** | 4 pass / **0 fail** — **better** |
| merge conflicts | — | **0**, both branches |
| constitution parity post-merge | — | IN SYNC; `§18` absent from both |

The 2 remaining `verify-world-engine` failures are a **pre-existing** external-reference contract defect on main, now filed as its own tracked issue. They are not caused or worsened by this work — confirmed by running main unmodified.

---

## 3. KNOWN DEBT AT MERGE TIME — ALL TRACKED, NONE PROMISED

- **4 constitution references to `design.html`** become false the moment branch A lands (2 in each constitution, confirmed on the merged tree). Tracked as a HIGH issue with the exact edit written out; **the plan is to land it in the same session as the merge**, immediately after A.
- **Three hand-maintained copies of the header-derivation logic** — cannot share a module until both branches meet on `main`. Tracked, with the known fence/surrogate edge cases you identified recorded in the ticket.
- **The pre-existing external-reference failure** — tracked.

---

## 4. WHAT TO ATTACK

1. Dropping the count removed breadth coverage. Are 5 anchors sufficient, or did I trade a weak-but-broad check for a strong-but-narrow one and lose something real?
2. The anchors are hardcoded hex values inside a verifier. If canon legitimately changes a brand colour, this fails until someone edits the script. Correct strictness, or a maintenance trap?
3. `#0a0a0f` (Obsidian Black, **active**) and `#0a0a1a` (Galaxy-Swan, **RETIRED**) differ by one character, and both appear in design.md. Is anchoring on the former safe?
4. Is there anything about merging this to a **production-deploying branch** that the test evidence above does not cover?

---

## 5. THE ROUND-3 FIX DIFF (`78dfd53c6..6ea727fad`)
```diff
diff --git a/scripts/ai-workflow/verify-world-engine.mjs b/scripts/ai-workflow/verify-world-engine.mjs
index 923f427b4..319cb18b4 100644
--- a/scripts/ai-workflow/verify-world-engine.mjs
+++ b/scripts/ai-workflow/verify-world-engine.mjs
@@ -201,15 +201,34 @@ export function auditWorldEngineBundle(bundle) {
   // (b) design.md yields >= 20 canonical tokens at all — a PALETTE-EXTRACTION SANITY check whose
   // subject is still very much alive. Deleting the script silently dropped (b) (Kimi round 2,
   // R2-1). Re-asserted here so a design.md that stops yielding a palette still fails loudly.
-  const canonicalTokens = new Set((bundle.designMd ?? '').match(/#[0-9A-Fa-f]{6}\b/g) ?? []);
-  if (canonicalTokens.size < 20) {
-    errors.push(`design.md canonical palette extraction found only ${canonicalTokens.size} unique hex tokens (expected >= 20)`);
+  // Palette-existence successor to the retired design-mirror-check.mjs. Deliberately an ANCHOR
+  // check and NOT a token count, after two rounds of getting this wrong:
+  //   v1 (a >= 20 unique-hex floor) PASSED FOR THE WRONG REASON — of design.md's 23 unique tokens,
+  //      3 sit inside code fences and 3 are the RETIRED Galaxy-Swan palette quoted as do-NOT-use
+  //      examples, so deleting the entire live palette still cleared the floor on leftovers.
+  //   v1 also FAILED FOR THE WRONG REASON — 23 observed against a floor of 20 is 3 tokens of
+  //      headroom, so a legitimate 4-token palette revision would have failed a healthy canon
+  //      (Kimi round 3, R3-1). A gate whose false-positive path is "someone edited the palette"
+  //      gets switched off, and then it protects nothing.
+  // Anchoring on the values that MUST be present has neither failure mode: it cannot pass when the
+  // palette is gone, and it cannot fail when the palette is merely revised around these anchors.
+  // Checked: design.md carries no 8-digit #RRGGBBAA tokens, so the 6-digit match drops nothing.
+  const canonicalTokens = new Set(((bundle.designMd ?? '').match(/#[0-9A-Fa-f]{6}\b/g) ?? []).map((h) => h.toLowerCase()));
+  const ACTIVE_PALETTE_ANCHORS = ['#002060', '#60c0f0', '#c6a84b', '#8b5cf6', '#0a0a0f'];
+  const missingAnchors = ACTIVE_PALETTE_ANCHORS.filter((h) => !canonicalTokens.has(h));
+  if (missingAnchors.length) {
+    errors.push(`design.md is missing active Crystalline palette anchor(s): ${missingAnchors.join(', ')}`);
   }
   // NEGATIVE sentinel, re-homed from the deleted design.html check (GLM round 2, R2-5). It guards
   // the RETIRED "Reduced-Motion-as-a-fourth-tier" contract from creeping back. The surviving
   // positive assertion above states what canon must say; this states what it must NOT say, and a
   // positive check cannot catch a contradiction sitting beside it.
-  if (/Tier 3 — Reduced motion/i.test(bundle.designMd ?? '')) {
+  // SCOPE, stated so no future reader credits this with more than it has (Kimi round 3, R3-2):
+  // this is a VERBATIM tripwire for history-resurrection — the realistic threat is a copy-paste
+  // from git history or an old doc, which preserves the literal string. A *paraphrased*
+  // reintroduction evades it by design; doctrine review owns that case, not this regex. The colon
+  // form is included because it is the one editorial normalisation likely to happen by accident.
+  if (/Tier 3\s*[—:-]\s*Reduced motion/i.test(bundle.designMd ?? '')) {
     errors.push('design.md retains the retired Reduced-Motion-as-tier contract');
   }
   requirePattern(errors, bundle.motion ?? '', /Licensed M4 pointer[\s\S]*Full\/Lean\/Still/i, 'motion doctrine lacks M4 and runtime-mode stitching');
```
