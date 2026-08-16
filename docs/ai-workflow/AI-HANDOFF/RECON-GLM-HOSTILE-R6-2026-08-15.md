# GLM Consult

**Model:** glm-5.3
**Document:** c:/tmp/recon-review-r6.md
**Tokens:** 15995 in / 22103 out (reasoning: 20806) | total 38098
**Wall:** 349.1s

---

**NOT CLEAN — 2 findings (one is a regression introduced by the round-5 F2 fix itself; both are one-line fixes).**

## F1 / F2 verification

**F1 — verified as described.** The `unresolved.length > 0` block now sits *after* the risky if/else chain, prints on every path, gives per-ref reasons (`file list unavailable` / `content check failed` / `content check truncated`), caps `blind` at 6 with `+ N more`, and prints the `rest` tail for evidence-insufficient refs. Matches the fix note exactly.

**F2 — verified except the marker's advertised action does not exist.** The true total prints (`${risky.length} ref(s) touch sensitive paths:`) and the `+ N more` marker prints after the loop. But the marker says `[--full to list]`, and `--full` does not expand this list. That's finding 1.

## Finding 1 (blocking) — `--full to list` on the sensitive-refs marker is a silent no-op

`report.mjs`, AUDIT DELTA:

```javascript
for (const it of risky.slice(0, 6)) { ... }
if (risky.length > 6) out.push(`   + ${risky.length - 6} more sensitive ref(s)  [--full to list]`);
```

`full` is destructured from state and consumed in exactly one place: `const shown = full ? landed.length : 8;` — the ALREADY LANDED list. The risky list slices to 6 unconditionally.

**Failure scenario:** repo has 77 sensitive refs. Report prints `+ 71 more sensitive ref(s) [--full to list]`. User runs `node scripts/recon-scan.mjs --full`. Output: the identical 6-ref list and the identical `+ 71 more` marker. The instructed action reveals nothing — in a scripted/grepped context the user concludes the remaining 71 refs can't be listed, or worse, that the listing they got was complete.

This is the *verbatim* defect class the round-5 notes fixed for the landed list ("An instruction the tool ignores teaches distrust"), reintroduced by the F2 marker text. Fix: `const shown = full ? risky.length : 6; risky.slice(0, shown)`.

## Finding 2 (blocking by the stated rule; trigger is narrow) — merge-base-failure records that hit ACTIVE_LANE escape both `risky` and `unresolved`

`equivalence.mjs`, early return:

```javascript
if (!mb) {
  rec.error = 'no merge-base with base ref';
  signals.push('merge-base:missing');
  return rec;   // files: [], and filesUnknown is NEVER set
}
```

`rank.mjs`: `if (item.laneLocked || item.inWorktree) return VERDICT.ACTIVE_LANE;` — and the fresh-branch check — both precede any equivalence handling. `report.mjs` unresolved filter: `filesUnknown || verdict === UNKNOWN || contentCheck?.truncated/failed` — an ACTIVE_LANE record from this path satisfies none of these (filesUnknown undefined, verdict ACTIVE_LANE, no contentCheck), and `risky` computes `pathSensitivity([]) === 0`.

**Failure scenario:** a branch checked out in a linked worktree (or committed to within 48h) whose history shares no ancestor with origin/main — an imported/vendored tree, or a transient 60s merge-base timeout (a stall this codebase explicitly anticipates). Classification returns early; the file list was never obtained. Verdict: ACTIVE_LANE. If no other non-landed ref qualifies, AUDIT DELTA prints **"Sensitive paths: NO unpushed changes detected across all N non-landed refs"** — a negative confirmation asserted over a ref that was never inspected. With other findings present, the ref is silently omitted from the ⚠ disclosure instead, undercounting it. The user scopes the audit on that claim.

Note this hole is *not* the diffStat-failure case — those set `filesUnknown` and are caught regardless of verdict. Only the merge-base early return skips it. Fix: add `rec.filesUnknown = true;` in the early return (also surfaces correctly in the JSON), or add `|| it.rec.error` to the unresolved filter.

## Non-blocking notes

- **Duplicate content check.** A record classify downgrades to PARTIAL (patch-id match, content differs) keeps `needsContentConfirm = true`, so it enters `deepConfirm` as a finalist and `contentPresent` runs a second time over identical inputs — same answer, duplicate `content:DIFFERS` signal, wasted git calls. Deterministic; waste only.
- **Timeout codes collapse to 1.** `git()` maps non-numeric error codes (e.g. SIGKILL on timeout) to `code: 1`, so `isAncestor`/`treeIdentical` timeouts return confident `false` instead of `null`. Both then skip a LANDED shortcut — the conservative direction — so no wrong verdict, but the `:indeterminate` signal is lost.
- **`[ARCHIVE]` is overloaded.** The summary describes it as "content is already on ${base}", but COST rows in WHAT TO DO carry the same marker while their content is *not* on base. The `verdict:` line disambiguates, but the marker and the summary sentence contradict each other.
- **WHAT TO DO truncates at 12 with no `+N more` marker** — mitigated because the DECISION SUMMARY prints full counts just above, so the truncation is inferable.
- Porcelain paths are C-quoted for non-ASCII bytes; the working-tree `top dirs` summary can show mangled names. Cosmetic.

Both findings are cheap, local, and neither invalidates the classification engine — the damage is confined to disclosure truthfulness in the AUDIT DELTA section, which is exactly the section F1/F2 were about. Fix both and I'd expect round 7 to be clean.
