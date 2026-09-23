# Package Manifest — AI Village & Privacy — R2 (tighten / gaps / upgrades)

**Generated:** 2026-09-22 (host-side, after the splitter and a manual extraction pass)
**Round:** 2 — assignment: tighten existing findings · name missing gaps · propose additive upgrades
**Source reply:** `tmp/astra-village-r2/ASTRA-REPLY-R2.md` (70,171 B / 890 lines)
**Packet:** `tmp/astra-village-r2/CONSULT-PACKET-R2.md` (18,041 chars after redaction)
**Transport:** `gpt-6-astra` (`--effort xhigh`) via Codex CLI on the ChatGPT subscription · `--mega-blueprint` · `--bounded` · `--timeout-ms 1700000`
**Measured:** exit 0 · **657.8 s** · `in=42358 out=21566 reasoning=7032` · $0 marginal · `servedModel` **not observable** (recorded null, never invented)
**Round-1 package (still canonical until reconciled):** `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-ai-village-and-privacy-2026-09-21/`

## Documents

| File | Lines | Fenced blocks |
|---|---|---|
| `00-README.md` | 76 | 0 |
| `01-architecture.md` | 139 | 5 |
| `02-wireframes.md` | 7 | 0 |
| `03-contracts.md` | 177 | 0 |
| `03a-tightening.md` | 43 | 0 |
| `04-build-order.md` | 18 | 0 |
| `05-slices.md` | 16 | 0 |
| `06-bans.md` | 24 | 0 |
| `07-checkpoints.md` | 56 | 0 |
| `08-decision-density-self-test.md` | 59 | 0 |
| `09-tests.md` | 62 | 1 |
| `09a-adapter-tests.md` | 49 | 1 |
| `10-gaps.md` | 41 | 0 |
| `11-upgrades.md` | 27 | 0 |
| `HOSTILE-REVIEW.md` | 59 | 0 |

**Rule 4 (300-line cap): ALL FILES COMPLIANT.** Maximum is `03-contracts.md` at 215 lines.

## Reconciliation note — read before adopting anything here

This package is a **bounded replacement candidate set for round 1's documents, not an overwrite.**
Astra could not see the full round-1 documents (only names, line counts and selected excerpts), so its
`R2-A1-01 [HIGH]` finding applies to this package as much as to round 1: **whether undisclosed
requirements would be lost by replacing those files is `[UNKNOWN]`.**

**Therefore: do not delete or overwrite the round-1 package.** S0 must recover the originals, map
every finding, ban and decision one-to-one, and reconcile before any canonical document is replaced.

## Host-side splitting disclosure

The splitter (`scripts/split-astra-blueprint.mjs`) recognises only the nine canonical Mega Blueprint
filenames. The reply carried **additional** fenced blocks (`10-gaps.md`, `11-upgrades.md`, and a
`09a-adapter-tests.md` fence) which it flushed into `09-tests.md` because no canonical name matched. I
extracted them by their own `<!-- BEGIN FILE: … -->` / `<!-- END FILE: … -->` fences and verified the
result. **No content was dropped** — each block was the contiguous region the reply itself fenced.

`09a-adapter-tests.md` was an exact duplicate of `09-tests.md` after extraction (verified equal after
CRLF normalisation) and was removed rather than shipped as two files with one meaning.

**`03-contracts.md` 420 → 215 lines is Astra's own restructuring, not truncation.** Round 1's version
was over cap; this one is not. The original 420-line file is untouched at
`../BLUEPRINT-ai-village-and-privacy-2026-09-21/03-contracts.md`.

## Build order

Per `04-build-order.md` and `05-slices.md`. Build ONE slice at a time; after each slice, produce the
diff + the acceptance-criteria evidence and WAIT for the checkpoint verdict before continuing.

**S0 is evidence collection, not code — and it has still not been executed.**
