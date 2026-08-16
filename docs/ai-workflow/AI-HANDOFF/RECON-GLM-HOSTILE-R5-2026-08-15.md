# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-r5.md
**Tokens:** 15555 in / 18622 out (reasoning: 17208) | total 34177
**Wall:** 289.4s

---

## Fix verification

**A — confirmed.** `report.mjs` now reads `const nonLanded = items.filter((it) => it.verdict !== VERDICT.LANDED);`. Traced the routing end-to-end: `classify()` leaves `equivalence === 'already-landed'` with `needsContentConfirm`/`filesUnknown`/`contentCheck.failed`/`truncated`; `assignVerdict()` sends every one of those to CONFLICTING or UNKNOWN (LANDED requires `HIGH && !needsContentConfirm`); the filter admits them. The risky half of the fix works — sensitive-file CONFLICTING branches now reach the `risky` loop, which matches your live "names 6" result. **The unresolved half does not survive rendering — that is Finding 1.**

**B — confirmed.** `recon-scan.mjs` sets `full: has('--full')`; `renderReport` destructures it and uses `const shown = full ? landed.length : 8;` with the `+ N more [--full to list]` marker. Mechanism is real and threaded through. (Non-blocking note below on your quoted live numbers.)

## Verdict

**Not clean — one live finding, one minor latent finding.** Both live in the same ~12-line render block in AUDIT DELTA. Classification, ranking, git primitives, freshness gate, degraded-census wiring: re-verified, nothing new.

## FINDING 1 (live in this snapshot): AUDIT DELTA drops the "could NOT be inspected" caveat whenever any risky branch exists

```javascript
if (risky.length === 0 && unresolved.length === 0) { ... }
else if (risky.length === 0) {
  // "...${unresolved.length} refs could NOT be inspected — coverage NOT established."
}
else {
  for (const it of risky.slice(0, 6)) { ... }   // unresolved: computed, never rendered
}
```

`unresolved` is only rendered on the `risky.length === 0` path. When `risky.length > 0`, the else branch prints risky refs and **nothing about uninspectable ones — no count, no caveat, no names.**

**This is live right now, from your own numbers.** You verified 6 named sensitive branches ⇒ `risky.length > 0` ⇒ else branch ⇒ your 32 UNKNOWN-verdict refs (all in `unresolved` by the literal `it.verdict === VERDICT.UNKNOWN` term), plus any `filesUnknown`/`truncated`/`failed` refs, render nowhere in this section. The sentence "coverage of sensitive surfaces is therefore NOT established" is unreachable in exactly the configuration you're shipping.

**Concrete scenario:** branch X's diffStat fails (`filesUnknown` — your own example is index-lock contention). X's `files` is empty ⇒ `pathSensitivity() === 0` ⇒ X ∉ `risky`; X ∈ `unresolved` only. Branch Y touches `v2PaymentRoutes` ⇒ `risky`. Output: AUDIT DELTA names Y, and X — possibly the storefront-special-leak case, the exact population the round-4 fix exists to surface — appears nowhere in the section whose header is "what an audit of base will NOT see". Owner scopes the audit to Y and assumes the remaining non-landed refs were inspectable.

**Why this defeats half of fix A:** your comment says the old equivalence filter "dropped them from BOTH `risky` and `unresolved`". Fix A restored *array membership*; the renderer then drops `unresolved` from the *page* whenever risky is non-empty. The named-6 effect you verified is the risky half working. The unresolved half is stillborn on this render path — the same "wrote it, never wired it" class as the round-2 unreachable content-confirm.

**Preempting "the summary covers it":** `[?] 32 unresolved` is a count with no names and no audit-coverage linkage, and your own code comment assigns this disclosure job to AUDIT DELTA ("the very section whose job is to say what an audit will miss"). CONFLICTING items get partial visibility via the top-12 decisions list; UNKNOWN-verdict items get none anywhere in the human report.

**Fix shape:** in the else branch, after the risky loop, emit the caveat when `unresolved.length > 0` (count at minimum; names for the `filesUnknown`/`truncated`/`failed` subset ideally — it's small).

## FINDING 2 (minor, latent — boundary-exact today): risky list capped at 6 with no overflow marker and no total

`risky.slice(0, 6)` and `risky.length` is never printed. With 9 sensitive branches, 3 vanish with no `+N more` — unlike the landed list, which gained exactly that marker this round, and unlike the per-branch file lists, which print `+N`. Your current run sits at exactly 6, so today's artifact cannot distinguish "6 risky" from "60 risky" — and your live verification ("names 6") is equally consistent with 6-or-more. Latent, but it is the unmarked-truncation class this codebase treats as a defect everywhere else.

## Non-blocking notes (do NOT block dry status)

- Your prose "2 landed lines default, 9 with --full" and the snapshot summary "already-landed 253" cannot be the same run (253 landed renders as 8 + `+245 more` default, 253 with `--full`). Presumably different fixtures; the code mechanism is confirmed regardless.
- `deepConfirm`'s `wantsPresenceCheck` branch is unreachable for finalists (`needsContentConfirm` is only set on LANDED records; the finalist filter admits ABSENT/PARTIAL) — harmless defensive duplication. `blobAt` is now unused. No output impact.

## Clean sweep (for the record)

Re-checked with nothing new: `-z`/`--literal-pathspecs`/two-vs-three-dot discipline in git.mjs; batching by bytes; the four downgrade paths out of cherry-LANDED; net-diff-empty clearing `needsContentConfirm`; floor-before-retire ordering in `assignVerdict`; freshness gate fail-closed on unreadable base time; degraded census reaching print and JSON; tag/branch qualification at both call sites; verdict arithmetic (409 = 98+253+32+21+5).

Fix F1 — it's one render branch. Decide F2 while you're in there. After that I expect the next round to be the clean confirmation.
