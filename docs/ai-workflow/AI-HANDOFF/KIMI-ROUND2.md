# SWAN BRAIN — round 2: attack the fixes that round 1 produced — reviewed by Kimi K3

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: medium)
**Document:** docs\ai-workflow\AI-HANDOFF\SWAN-BRAIN-ROUND2-PACKET.md
**Seed:** (none)
**Tokens:** 5797 in / 2839 out · **Cost:** ~$0.0600 · **Wall:** 51.3s · **finish_reason:** stop

---

| ID | severity | claim | evidence | proposed fix |
|---|---|---|---|---|
| R2-1 | LOW | Deleting `design-mirror-check.mjs` lost one assertion that still has a live subject: the palette-extraction sanity check `assert.ok(out.canonical >= 20)` verified design.md itself yields ≥20 canonical hex tokens. The mirror-sync half died with its subject; the extraction-sanity half did not, and nothing in the shown diff re-asserts it. | `receipt-prune.test.mjs` deleted hunk (line `assert.ok(out.canonical >= 20, 'canonical token extraction found the palette')`); `verify-world-engine.mjs` diff shows no replacement token-count assertion on `designMd` | Add one `requirePattern`-style check or hex-count assertion on `bundle.designMd` in `verify-world-engine.mjs` (e.g. ≥20 unique `#[0-9A-Fa-f]{6}` tokens). Two lines. |
| R2-2 | LOW (HYPOTHESIS on future titles) | The A7 regex `/\s+(?:Design\s+)?Review$/i` will mangle any future provider whose `title:` legitimately ends in "Review" as part of its name (e.g. "SwanStudios Weekly Review" → "Weekly"; "GLM-4 Code Review" → "GLM-4 Code"). Current titles are safe — I checked the mangling behavior against the shapes in evidence ("Kimi K3 Design Review" → "Kimi K3", intended; bare "Review" or hyphenated "Pre-Review" do not match, safe). No current provider is harmed; this is a latent trap, not a live bug. | `consult.mjs` hunk: `.replace(/\s+(?:Design\s+)?Review$/i, '')` | Accept as-is, or constrain to the known suffix set (`/\s+Design Review$/i` plus explicit known titles) when the A4 dedup into a shared module happens. Do not spin a fix commit for this alone. |
| R2-3 | MEDIUM | Known, accepted, not new — restated only because it is the merge-sequencing constraint: after Branch A merges, 4 constitution references to `design.html` as a live mirror (Rule 40, both constitutions) become false on main. Confirmed by trial merge in the packet. | Section 1 "KIMI F6 / GLM B1"; Section 2 trial-merge result | Not a reason to hold the merge; it is a reason the follow-up commit cut from post-A main must be same-day, not "eventually." Put it on the pre-merge checklist as a committed action, not an aspiration. |

| branch | safe to merge? | blocking | pre-merge checklist |
|---|---|---|---|
| `claude/design-brain-repave-20260816` (A) @ `9420cb5b6` | Yes | Nothing blocking. R2-1 is a two-line coverage nicety; R2-3 is a scheduled follow-up, not a gate. | 1. Merge B first (or confirm order — trial merge showed 0 conflicts either way). 2. Immediately after A lands, cut the F6/B1 follow-up removing the 4 surviving `design.html` references from both constitutions. 3. Optionally fold the ≥20-token sanity assertion (R2-1) into that same follow-up commit. 4. When A and B meet on main, schedule the A4 header-derivation dedup (three hand-maintained copies) before a fourth copy appears. |
| `claude/constitution-s18-20260816` (B) @ `bd8d0a96c` | Yes | None. Trial merge: 0 conflicts, mirror in sync, §18 absent from both constitutions. | Merge first for cleaner ordering; no code changes needed. |

**Answers to the three remit questions:**

**(1) Are the round-1 fixes correct, complete, and free of new defects?** Yes, with one small coverage footnote (R2-1). I attacked each of the six section-3 targets:

1. **design-mirror-check deletion** — the mirror-sync assertion correctly died with its subject (design.html is retired; keeping it would ENOENT). The only collateral loss is the `canonical >= 20` extraction-sanity assertion, which tested design.md, not the mirror, and is now unasserted anywhere in the shown diff. That is R2-1 — real but LOW.
2. **design.md carrying the Full/Lean/Still + Reduced-Motion contract** — the claim holds structurally: the assertion `requirePattern(errors, bundle.designMd, /Full\/Lean\/Still[\s\S]*Reduced Motion is a separate accessibility override/i, ...)` remains in `verify-world-engine.mjs`, and the reported 9/2 result (identical to baseline, crash gone) means that assertion passes against the live design.md. The two deleted assertions targeted `bundle.designHtml`, a file that no longer exists in scope. Coverage was not deleted; the design.md half was already there and the design.html half had no subject. Verified as claimed.
3. **A7 regex** — no current provider is mangled; the fallback path deliberately keeps the full title, which is correct since it stands alone. Latent future-title trap only (R2-2, HYPOTHESIS on future titles).
4. **receipt-prune.test.mjs 4/0** — the removed test was a design-mirror test lodged in a receipt-prune file; it never matched the file's remit. Removing it narrows the file *toward* its name, not away from it. The four surviving tests (including the archive-transparency and corrupt-.gz cases) are all receipt-lifecycle tests. No quiet remit narrowing.
5. **ACTIVE-INDEX.md rewording** — the new sentence ("sole canonical **copy** … still ADAPTS SWAN-CINEMATIC-DESIGN-SYSTEM.md and does not outrank it") is consistent with the Fable overclaim fix applied to the other five files and with the `sourceSystem` entry in `REQUIRED_FILES` naming SWAN-CINEMATIC-DESIGN-SYSTEM.md as the source. No internal contradiction visible in the hunk's context lines.
6. **Round-1 completeness** — every round-1 item is accounted for: 3 fixed (F4, A1, A7), 4 disproven with execution evidence I have no new evidence against (A2, F1/F2, A3/F7, F9), and 6 explicitly accepted-and-deferred (A4, A6, A5/B2, F6/B1, F8, H1). Nothing silently dropped.

**(2) What remains unfixed or newly broken?** Nothing newly broken that I can substantiate. Unfixed-but-known: F6/B1 (4 stale constitution references post-merge — R2-3, the only one with merge-sequencing weight), A4 (triplicated header derivation — correctly deferred until the branches meet on main), A6, A5/B2, F8, H1. Newly introduced by the fix: only R2-1 (minor coverage loss) and R2-2 (latent, hypothetical).

**(3) Safe to merge?** Yes. Both branches, B first, with the F6/B1 follow-up committed as a same-day action. The fix diff is honest — the comments document the partial-sweep miss in the fix itself, the trial-merge evidence covers the interaction of the two branches, and the test results are equal-or-better against main's baseline. This is close to a clean round; R2-1 is the only finding I'd act on, and it fits in the already-planned follow-up commit.
