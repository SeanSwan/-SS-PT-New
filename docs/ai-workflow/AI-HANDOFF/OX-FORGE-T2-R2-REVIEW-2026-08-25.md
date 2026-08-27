# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-r2-packet.md
**Seed:** (none)
**Tokens:** 8542 in / 8123 out · **Cost:** ~$0.0000 · **Wall:** 222.8s · **finish:** stop

---

# Ox Alpha — Swan Forge T2, ROUND 2 review

## 1. B1 ruling: ACCEPTED AS DISPROVEN

I accept it. Three independent legs, and the strongest one is not the one the packet leads with:

- **The context diff is primary evidence.** With -U6 the hunk reads unambiguously: `LateCancelActionButton` opens, declares `flex: 1;`, closes; the gradient sits under `LateCancelContinueButton`, a plain `styled.button`. There is no reading of that hunk in which the migrated wrapper owns the gradient. My round-1 conclusion was an artifact of the stripped-context rendering, and both reviewers landing on the same misread is indeed the tell.
- **The per-export count is consistent** (26 exports, exactly one `styled(ForgeButton)`, body `flex: 1;`).
- **R6 = 0 findings is corroborating only, not primary** — and I want that on the record, because R6 is author-written in the same commit as the claim it "mechanically" proves, and it has holes (§3.2). Had the diff been ambiguous I would not accept R6's zero as disproof. Here the diff stands on its own, so B1 is dead.

One correction to the packet's framing for the record: calling R6's zero a "mechanical disproof" overstates it. A clean scan from a tool written hours ago by the party under review is evidence, not mechanism. The mechanism is the diff.

## 2. B2–B5 scoring

| Item | Verdict | Evidence |
|---|---|---|
| **B1** layout-only claim | **DISPROVEN — accepted** | Context diff + per-export map (above) |
| **B2** nested-template parse hole | **FIXED (codemod layer)** | The allow-list makes `${` an unconditional block regardless of where truncation lands; a truncated skin-owning body cannot shed its interpolation opener. Probed three shapes. Sound. **But the same hole survives in the tagger lexer — new blocker N1 below.** |
| **B3** standing enforcement | **FIXED in shape, leaky in reach** | Shared boundary function between codemod and R6 is the right architecture — the two cannot drift. But R6 matches only the literal string `styled(ForgeButton)`; see N2. |
| **B4** post-fix instrument re-run | **FIXED** | Re-run after the rewrites: 0 legacy imports, 11 ForgeButton sites, positive control reachable with chain, dormancy verdicts stable, backlog `--check` idempotent at 42 rows. The self-referentiality concern (rewritten instruments validating their own verdicts) is adequately mitigated by the reachable positive control and the grep-based HeroSection corroboration that bypasses the rewritten tool entirely. |
| **B5** rollback + detection + owner | **FIXED, with one structural caveat** | Drill executed (revert of both commits → 98 files/367 tests green → restored), R6 is live detection, SWA-213 assigned and dated. Caveat: the drill proves the *code* reverts cleanly; it says nothing about whether legacy `GlowButton` remains a maintained, importable target at revert time. See N4. |

## 3. Attack on what is new

### 3.1 The fail-closed allow-list as a governance boundary

The inversion from deny-list to allow-list is correct and the probe story (outline/filter/text-shadow/etc. sailing through the deny-list) justifies it. Two problems remain:

**(a) `--sw-*` is broader than the sanctioned surface.** Rule 84, as quoted in your own R2/R6 text, sanctions "the published `--sw-btn-*` custom properties." The packet describes the allow-list as admitting "`--sw-*` overrides." Those are different sets. `--sw-accent: red` or any future `--sw-<not-button>` token passes a prefix check but is outside the published button surface. The boundary must pin to the published token set — exact names or the `--sw-btn-*` namespace — not the `--sw-` family.

**(b) The allow-list itself has no tamper-evidence.** The entire governance boundary now reduces to one Set literal in `codemod-glowbutton.mjs`. Adding a property to it is a one-line edit with no fixture that fails. There should be a golden snapshot test enumerating the exact allowed property set, so any widening is a visible, reviewed diff rather than a silent one. Fail-closed protects against today's unknowns; only a pinned manifest protects against tomorrow's quiet edit.

### 3.2 Drift-lint R6 as standing law — what bypasses it

R6 is the right half of enforcement, and importing the shared boundary function is genuinely good. It is bypassed today by:

1. **Import aliasing.** `import { ForgeButton as FB } … styled(FB)` produces a wrapper R6 never sees. The codemod refuses to *create* wrappers, but nothing stops a human from hand-writing an aliased one, and the entire premise of R6 is that humans hand-write things after the codemod leaves. This is the exact threat model R6 exists for, and it walks through the front door.
2. **Raw-text scanning.** R6 runs `text.matchAll(...)` on the raw file while the rest of `lintText` operates on `stripComments(text)`. A commented-out `styled(ForgeButton)` block generates a phantom finding (safe-direction noise), but more importantly the inconsistency shows the scan surface wasn't deliberately chosen.
3. **Registration, not code.** R6 only sees directories passed via `--consumer`. Today that's `frontend/src`. A new consumer package that nobody adds to the CI invocation is invisible to the standing law with zero code change. The consumer directory list needs to be an asserted artifact, not a CLI convention.

### 3.3 Does drilled revert + dated owned ticket discharge the missing authenticated receipt?

**No — not on a payment-adjacent surface, and not as stated.** The two mechanisms cover disjoint halves of the risk:

- The revert drill bounds *blast radius*: if something is visibly broken, you can get back. 
- SWA-213 (due 2026-09-08) is a *promise* of evidence, not evidence.

Neither detects the failure classes you yourself enumerate as unproven: real-browser cascade resolution between wrapper class and pack compound selectors, auth-gated render branches, long-text overflow at real data widths, and **focus order on payment modals**. Focus-order regressions on a payment modal do not page anyone. Nothing in the rollback path observes them; nothing in CI can. A user hitting a tab trap in a payment flow is not rolled back by `git revert` — it is discovered by support tickets. Discharge requires one of: (i) the computed-style + keyboard-walk receipt captured *before* the 11 UMS sites are enabled, or (ii) an explicit, enforced gate tying enablement to SWA-213 closure. Right now neither exists in the packet — SWA-213 has a due date but no enforcement hook.

### 3.4 Three instruments rewritten mid-slice

Adequately re-validated for the pipeline itself (B4, above). Not adequate for one thing: **every existing `swan-guard-allow-hex` tag in the tree was placed by the *old* backtick-parity tagger** — the guessing tool this commit replaces. The rewrite fixes future tagging; it does not re-audit past tagging. If the old tool's parity was ever flipped by a nested template in a real file, a `//` comment is sitting inside a CSS template right now, being eaten by error-recovery along with the next declaration, silently. The visible tag on `LateCancelContinueButton` happens to use the correct `/* */` form; that proves nothing about the others.

## 4. What could be broken right now and invisible

- **Nested templates break `lexStateAt`.** The lexer tracks template state as a flat toggle: enter on backtick, exit on backtick. It does not track `${ … }` regions. For `` `a ${b ? `c` : `d`} e` `` it exits the template at the backtick before `c`, lexes `d` as code, and re-enters — parity is scrambled from that point on, and every downstream classification is confidently wrong. Styled-components files are *made* of nested templates (`${css`…`}`). The corruption fixture you fixed (backtick in a quoted string) is the flat case; the nested case is unfixed and common.
- **Regex literals are unhandled.** A `/…/` literal containing a quote or backtick flips `quote`/`template` state the same way the old backtick counter did.
- Consequence chain: mis-lexed state → `commentFormFor` returns a *confident* form instead of refusing → `//` emitted into a CSS template (error-recovery eats the following rule) or `/* */` emitted into JSX children (renders as visible text). Both silent-at-build, per your own header comment.
- **Aliased `styled(FB)` wrappers** in UMS, invisible to R6 (§3.2.1).
- **Non-`--sw-btn-*` `--sw-` overrides**, if any exist, already sit outside rule 84 with no finding (§3.1a).

## 5. Dissent (mandatory)

I dissent from the packet's central rhetorical move: bundling the B1 disproof with the R6 zero-finding scan as joint "mechanical" proof. The diff proves B1; R6 proves only that R6's regex finds nothing, and §3.2 shows three ways it wouldn't. I also dissent from treating SWA-213's assignment-and-date as progress toward discharge on a payment-adjacent surface — a ticket with a due date and no enforcement hook is indistinguishable, at merge time, from no ticket. And I dissent from the forwardRef deferral rationale as written: "no ref behaviour to regress" is true today and is precisely the kind of invariant that decays silently, which is the entire lesson of this round. Record it as a tripwire (fail if a ref ever appears on a migrated site), not as prose in a commit message.

## 6. Verdict

**REVISE**

Blocking items:

1. **N1 — Tagger lexer: nested-template and regex-literal state holes.** `packages/swan-forge/scripts/tag-legacy-hex.mjs`, `lexStateAt` (~lines 36–53) and `commentFormFor` (~lines 58–71). Track `${`/`}` depth inside template state; handle regex literals; add a fixture with a nested template *before* the flagged line. Then **re-audit every existing `swan-guard-allow-hex` tag** placed by the pre-rewrite tool — the tag on `LateCancelContinueButton` included — confirming comment form against the fixed lexer.
2. **N2 — R6 aliasing bypass.** `packages/swan-forge/scripts/drift-lint.mjs`, R6 block (~lines 97–104). Resolve local aliases of `ForgeButton` before matching; scan `stripComments(text)` not raw `text`; add a fixture proving `styled(FB)` is caught. Also assert the consumer-directory list in CI rather than passing it ad hoc.
3. **N3 — Allow-list token scope + tamper-evidence.** `packages/swan-forge/scripts/codemod-glowbutton.mjs`, boundary function (~lines 42–75). Narrow the sanctioned override surface from `--sw-*` to the published `--sw-btn-*` set; add a golden snapshot test of the exact allowed-property list so any widening is a reviewed diff.
4. **N4 — Receipt gate on payment-adjacent surface.** Packet §"Still true, still disclosed"; SWA-213. Add an enforced gate: the 11 UMS sites — specifically payment-modal CTAs — do not enable/expand beyond current exposure until the SWA-213 computed-style + keyboard-walk receipt is captured, or capture the receipt in this slice. Additionally: explicit retention guarantee that legacy `GlowButton` stays importable and lint-protected from deletion until SWA-213 closes, so the drilled revert remains executable at revert time, not just at drill time.

Everything else in this round is real work, well done, and honestly reported — including the round-1 packet self-indictment, which is the correct posture. Clear the four and this approves.
