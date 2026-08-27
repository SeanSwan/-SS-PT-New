# Ox Alpha — Hostile Gate Review

**Reviewer:** OpenRouter `stealth/ox-alpha` (effort: high)
**Served:** `stealth/ox-alpha`
**Document:** <HOME>/AppData/Local/Temp/claude/<SCRATCH-KEY>/79074e1c-43bb-41f9-b3a2-990172463a35/scratchpad/forge-t2-packet.md
**Seed:** (none)
**Tokens:** 11172 in / 6180 out · **Cost:** ~$0.0000 · **Wall:** 158.9s · **finish:** stop

---

# OX-ALPHA — T2 STRANGLER REVIEW (UniversalMasterSchedule, e73da8982)

**Verdict up front: REVISE.** The engineering instinct here is good and the disclosures are honest, but this packet asks me to approve a migration whose central factual claim contradicts its own diff, whose scope numbers were produced by instruments that were rewritten *inside the slice*, and whose failure-detection story on an authenticated surface is "whoever next has a session." Dissent below, per question.

---

## (1) The value-position rule — wrong enforcement locus, and the deny-list leaks

**Is the line right?** Roughly yes — layout-vs-skin is the correct ontology, and defaulting to SKIP (leave on legacy) for ambiguous cases is the right fail direction. But three problems:

**(a) The deny-list is a codemod-only gate with no standing enforcement.** The rule lives in `SKIN_OWNED` inside `codemod-glowbutton.mjs` and nowhere else. The moment this slice merges, nothing stops a human from hand-writing `styled(ForgeButton)\`background: red\`` tomorrow. Rule 84 / drift-lint R2 is cited as the *justification* but was **not extended to enforce it** — there is no drift-lint change in this diff. A governance boundary that exists only inside a one-shot migration script is not a boundary; it's a comment. The codemod check is necessary (don't migrate fights) but insufficient (don't permit new fights). **Blocking.**

**(b) The parser behind the deny-list can be defeated by nested template literals.** See blocking item B2 — ``styled(GlowButton)`color: ${cond ? `red` : `blue`}` `` terminates the non-greedy match at the *inner* backtick, so the codemod evaluates a truncated body and can classify a skin-owning wrapper as layout-only. The deny-list is only as good as the body extraction feeding it.

**(c) The deny-list itself leaks:** vendor-prefixed properties (`-webkit-background-clip`, `-moz-osx-font-smoothing`) don't match any alternative; `width`/`aspect-ratio`/`outline`/`filter`/`backdrop-filter`/`text-shadow` are absent. Some of those omissions are defensible judgment calls — but they're undocumented judgment calls, and the commit message's list (background/color/border/radius/height/font/letter-spacing/padding/shadow/transition/animation) **does not match the code**, which additionally denies `opacity`, `transform`, `text-transform`. When the prose and the regex disagree, the regex wins silently. Document the actual list or generate the message from the Set.

**Where does it belong?** Both places, with different jobs: the codemod copy is a *migration gate* (this PR), the drift-lint R2 extension is the *standing law* (missing, must be added). Rule 84 alone is too coarse today to catch it — prove that by extending it, not by asserting it.

## (2) The evidence standard — the substitution is *conditionally* acceptable; the conditions are unmet

I will defend the proposition that a mutation-proven jsdom render test plus 344 untouched tests can substitute for a live computed-style receipt **only when** the thing jsdom cannot model is demonstrably not in play. Here it demonstrably might be:

- **CSS injection order and specificity.** styled-components injects at runtime into `<head>`; jsdom's cascade in your test harness does not reproduce Vite's production chunk ordering against the catalog `sw-*` stylesheet. `margin-top: 1rem` losing a specificity/order fight to a catalog rule is invisible in jsdom and invisible without eyes on the page. Your mutation proof kills the *className-forwarding* failure mode — it says nothing about cascade order.
- **Auth-gated render branches.** UMS is authenticated precisely because its content is session-dependent. `LateCancelActionButton` plausibly renders only for cancellable sessions; role-dependent `variant` props, empty-state layouts, and long-text overflow at real data widths are all live-only. The 344 tests exercise the mocks you already had — they cannot discover a branch that only exists under a real session.
- **DOM-shape divergence** between GlowButton and ForgeButton (icon slots, wrapping spans) affecting parent flex layout — `flexGrow: 1` on the button proves less than it appears if the legacy button carried a different box.

So: **not the moment to stop the line entirely** — the caller-path evidence is real and the fail direction of the codemod is safe — but "live verification belongs to whoever next has an authenticated session" is anonymous, deadline-free ownership, which in practice means never. And there is no detection mechanism at all: if this breaks on Monday, who notices, via what signal, in what timeframe? On a payment-adjacent surface (ApplyPaymentModal is in the diff), unbounded detection latency is not an accepted limitation, it's an unaccepted risk. **Blocking:** named owner + dated deadline for the authenticated receipt, and a detection story (authenticated smoke check, error monitoring, or canary) attached to this merge.

**And one factual reconciliation I will not approve past** (see B1): the packet asserts "Both real instances are LAYOUT-only," yet the presented diff shows the migrated wrapper files containing `background: linear-gradient(...)` and `color: #ef4444` blocks. If those belong to sibling exports in the same files, say so explicitly with a per-component map — as written, the packet's headline claim and its own diff are in apparent contradiction, and this is precisely the class of wrapper the deny-list was built to catch.

## (3) Rewriting your own instruments mid-slice — justified, but it invalidates the slice's own numbers until re-run

Not scope creep in the pejorative sense: a lying reachability tool drives Rule 77 *quarantine proposals*, and a silently-emptying backlog regen would have proposed the entire consumer tree for archive. Fixing fail-open epistemic infrastructure inside the slice it serves is defensible — splitting it out would have left known-lying tools gating the very claims in this PR.

But follow the consequence through: **the scope of this slice (11 sites, not 9), the residuals (0), and the dormancy verdicts were all produced by instruments that were subsequently proven to lie and rewritten.** You cannot certify a measurement taken with a ruler you later recalled. The fail-closed refusals are the right design, but the packet never states that the *scope discovery itself* was re-run post-fix. If the dry-run that produced "11 sites" predates the reachability fix, the number is unvalidated. Same for the retraction (see §4). **Required: post-fix re-run of scope discovery, reachability, and backlog regen, with the results asserted in the packet.** Cheap, and it converts "the tools are fixed now" into "the conclusions survive the fixed tools."

## (4) The retraction — right call, unsound foundation as evidenced

Declining to migrate T0-dormant dead code is correct; migrating it would have been pure risk with zero reachable payoff, and correcting the prose-vs-table contradiction is exactly what a reviewer should demand. Not a unilateral scope cut in any troubling sense — the table already said dormant, I flagged it in PR #2 R2, and the prose was the error.

However: the dormancy claim rests on `HeroSection.tsx` being UNREACHABLE — a verdict emitted by the reachability tool **in the same commit that documents the tool rendering unresolvable paths as UNREACHABLE**. Which version produced the HeroSection verdict? If it was the broken one, the retraction's factual basis is a tool output you've since classified as unreliable. Re-run post-fix (folds into the §3 requirement) and record the verdict. Until then the retraction is probably right and procedurally unproven.

## (5) Rollback — currently nonexistent, and that's the real exposure

The packet discloses the missing receipt but never states the rollback plan. For an authenticated surface with no live verification, the rollback *is* the safety net, so it must be specified, not implied:

- `git revert e73da8982` restores the GlowButton imports mechanically (zero test edits helps enormously — say so explicitly as a rollback asset).
- Verify the reverted tree green *now*, before merge, not during an incident.
- Pin the pre-merge SHA and confirm no subsequent commit entangles with the migrated identifiers (revert-decay is the classic strangler failure).
- Detection: see §2 — rollback without detection is a fire extinguisher in a building with no smoke alarm.

---

## BLOCKING ITEMS

- **B1 — Reconcile "both instances layout-only" against the diff.** `SessionDetailFooterActions.tsx` / `ApplyPaymentModal.footer.tsx` hunks show migrated `styled(GlowButton)` → `styled(ForgeButton)` in files whose styled blocks set `background: linear-gradient(...)` and `color: #ef4444` — both in `SKIN_OWNED`. Either produce a per-export map proving the skin-owned properties belong to non-migrated siblings, or the deny-list failed on its inaugural case. (codemod-glowblock.mjs `SKIN_OWNED`, ~L41–49; wrapper diffs as shown.)
- **B2 — Nested-template-literal parse hole.** `out.replace(/styled\(\s*GlowButton\s*\)\s*`([\s\S]*?)`/g, …)` (~L231–241) terminates at the first inner backtick of `${…`…`…}` interpolations, truncating the body audited by `SKIN_OWNED`. Add a fixture with a nested template and fix the extraction (balanced-backtick scan or AST).
- **B3 — Standing enforcement missing.** Extend drift-lint R2 to flag any `styled(ForgeButton)` setting a skin-owned property. Codemod-only enforcement decays on contact with humans.
- **B4 — Post-fix instrument re-run.** Assert in the packet: scope discovery (11 sites), HeroSection/swan-theme-utils reachability, and backlog regen all re-executed with the *fixed* instruments, results unchanged.
- **B5 — Rollback + detection runbook.** Named owner and dated deadline for the authenticated computed-style receipt; verified-revert confirmation; detection mechanism for silent breakage on UMS. "Whoever next has a session" is not an owner.

## NITS

- Commit message deny-list ≠ code deny-list (code adds `opacity`, `transform`, `text-transform`). Generate the log line from the pattern.
- Alternation order: `border|border-[a-z-]+` and `font|font-[a-z-]+` match the short form first, so skip messages report `'border'`/`'font'` where `border-radius`/`font-size` fired. Reorder longest-first.
- Vendor-prefixed skin properties (`-webkit-*`) bypass `SKIN_OWNED` entirely.
- `regen-backlog.mjs` `HERE` via `new URL(...).pathname` retains percent-encoding — a repo path with a space breaks on Windows, the exact platform this script was written to save.
- `reachability.mjs` resolves cwd-first, then root: a same-named stray file under cwd silently shadows the intended root-relative candidate. Prefer root-first, or refuse on ambiguity.
- `tag-legacy-hex.mjs` JSX detection only recognizes lines *ending* in a close/self-close tag; a hex on a line ending in an opening tag misclassifies as plain JS. Low stakes (comment form only), but the tool's selling point is context correctness.
- Evidence section says "vite build 61s"; commit message says "20.9s." Pick one; unexplained discrepancies in a packet about lying instruments are bad optics.

---

**REVISE.** The instincts are sound, the fail-closed refusals are genuinely good work, and the retraction is correct. But B1 means I cannot currently verify the packet's central claim about its own diff, B2 means the new governance rule is bypassable, B3 means it won't survive the merge, and B4/B5 mean the slice's numbers and its safety net are both asserted rather than demonstrated. Fix those five and this is an APPROVE with the authenticated receipt tracked as a dated follow-up — not before.
