# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/qwen-finetune-reviews-2026-08-16/16-PACKET-SLICES-H5.md
**Seed:** (none)
**Tokens:** 11603 in / 3766 out | **Cost:** ~$0.0913 | **Wall:** 34.1s | **finish_reason:** stop

---

# HOSTILE REVIEW — round H5

Not DRY. The H4 fixes hold up well under re-attack (the hex regex, lazy contract coupling, write-order, and NaN routing all survive scrutiny), but the H4-3 force-supersede fix has a genuine self-inflicted deadlock, and two smaller doctrine violations ride along.

---

## H5-1 (real, functional): H4-3's `--force` guard deadlocks recovery from the most common crash window

The refuse-check is:

```js
if (!existsSync(join(runDir, 'run-card.md')) && !existsSync(join(sealedDir, 'mapping.json')) && readdirSync(runDir).length > 0) throw …
```

But `run-card.md` and `sealed/mapping.json` are the **last two artifacts written** — generation (the long, crash-prone phase, minutes of Ollama calls) happens *before* either exists. A run that crashes, gets OOM-killed, or is Ctrl-C'd mid-generation leaves a dir containing exactly `sealed/outputs.jsonl` (incrementally appended, per H2-4) and nothing else. That dir:

- has no `run-card.md` ✓
- has no `sealed/mapping.json` ✓
- is non-empty ✓

→ `--force` is **refused** with "wrong --out-dir?" on a dir that is unambiguously a run dir (it contains `sealed/outputs.jsonl`, the run's own signature artifact). The user who paid for 40 minutes of generation and wants to regenerate into the same `--out-dir` is permanently locked out of it; their only recourse is manual deletion — precisely the destructive act H4-3 was written to prevent. The guard bricks the recovery path for the crash window the incremental-write design (H2-4) explicitly anticipates.

**Fix:** treat `sealed/outputs.jsonl` (or the `sealed/` dir itself) as run-dir evidence in the guard's disjunction.

**Rider (same site):** `mkdirSync(sealedDir, { recursive: true })` runs *before* the guard, so a genuinely wrong `--out-dir` (e.g. a source folder) gets an empty `sealed/` directory created inside it before the refusal fires. The guard protects bytes but not the filesystem shape. Move the guard ahead of the mkdir.

## H5-2 (real, minor): the Result-line rewrite is a silent no-op when the card lacks a Result line

```js
writeFileSync(runCardPath2, runCardText.replace(/^Result: .*$/m, resultLine), 'utf8');
```

H3-F7-a correctly made a missing Judge line and a missing commitment **fail closed** — but the same hand-edit that deletes the `Result:` line from the card passes all gates, `String.replace` matches nothing, scoring exits 0, prints the scorecard, and the run card is rewritten *byte-identical with no Result recorded*. The one line the doctrine says readers trust (H4-7's own rationale) can be absent without anyone noticing. This is the identical defect class as H3-F7-a, one field over.

**Fix:** `if (!/^Result: /m.test(runCardText)) throw …` alongside the existing Judge-line check.

## H5-3 (minor, doctrine): `--force` supersedes four artifacts but silently destroys the audit chain

The supersede list covers outputs/verdicts/scorecard/judging-sheet, but `run-card.md`, `sealed/mapping.json`, and `sealed/checks.json` are overwritten in place. The mapping is the prior run's blinding evidence and the run card carries its commitment — after a forced re-run, `outputs.jsonl.superseded-<stamp>` survives with **no mapping and no card that can ever speak for it**, while the ledger's own doctrine says "SUPERSEDE, never destroy." Either supersede the card/mapping/checks too (preserving a verifiable prior-run chain), or delete the superseded outputs whose provenance was just destroyed — the current half-state is the worst of both.

---

## Attacked and cleared

- **Hex regex:** `(`-restore, quoted/spaced url/href lookbehinds, uncapped var() token, and case-insensitivity propagation into lookbehinds all check out; the 8-space url cap vs. uncapped var() is an inconsistency but a deliberate, documented one.
- **H4-5 lazy `entityRegexes()`:** fresh regexes per call (no lastIndex bleed), `(?:…)` wrapping survives future alternations, import-time decoupling is real.
- **H4-4 write order:** validation genuinely precedes all writes to `--out`; `.rejected` evidence path is sound.
- **H4-7 probe marker:** correctly sourced from the card, gated consistently with the throw path.
- **H4-8:** `Number(undefined)` → NaN → throw covers the trailing-flag case in both parsers.

## Mandatory DISSENT

I dissent from declaring DRY on the strength of H5-1 alone: a guard written to prevent data destruction that forces manual deletion as the only recovery from a mid-generation crash is a defect in the fix, not a nit. I also note H5-2 and H5-3 are individually small enough that a reviewer could honestly call them polish — but H5-1 is a functional regression introduced by H4-3 itself and must be fixed before this packet converges.
