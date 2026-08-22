# Master next-agent prompt (paste this)

---

You are picking up multi-repo work from a session that ended 2026-08-21.

**Read `docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md` in full first.** It is the
index for three repos and supersedes the per-repo handoffs written earlier the same day.

**Then verify the world before trusting it.** A stale handoff nearly caused a duplicate rebuild this
week; the check costs thirty seconds and is in §12 of that document. Expected: taste brain HEAD
`4f4999d` with 38 checks passing, SwanGuard HEAD `670dccd`. **Docker was down at handoff**, so the
SwanGuard database counts in §2.2 are last-known rather than current — start Docker and re-read them.
If anything differs, another agent has moved things: re-orient before building.

## Pick your lane

The three repos are separate products. **Do not couple them.**

**Lane A — swan-taste-brain (Midjourney prompt generator).** Most active. Next work is Prompt
Studio, fully specified in `docs/PROMPT-STUDIO-SPEC.md`. Start at slice S1 (brain browser); it needs
no model and no network, and it now has real data behind it — 9,521 catalog entries, 4,340 artists,
5,483 descriptions, 51 filter categories.

**Lane B — SwanGuard-Newsroom (news / source trust).** Next slice is **A: sweep every comparison
against `connectorKey`** for per-outlet blindness. Three such bugs surfaced this week, all by
accident and none by deliberate sweep; one silently discarded every fetched item while reporting
success. Do that **before** merging the 107 verified feeds, because enabling a hundred outlets on
top of an unswept union-key bug multiplies silent data loss by a hundred.

## Before you build anything

**Delete the agent-written taste data.** `taste/loved-srefs.md` holds 2 ratings and `taste/kept.md`
holds 3 kept prompts that an agent wrote, all marked `TEST DATA`. The kept ones steer roughly a
quarter of every batch, so until they are gone the output is partly an agent's guess at Sean's taste
rather than his.

## Non-negotiables

1. **An absent value is not an instruction to erase.** Upserts use `coalesce(excluded.x, table.x)`;
   jsonb merges use `jsonb_strip_nulls`. Two reproduced data-loss bugs came from the bare form.
2. **Born disabled / born dormant.** Never write `enabled` or `lifecycle` in a `DO UPDATE SET`.
3. **A fake-client suite proves the question; only a live run proves the answer.** Two bugs passed
   the fake suite and died on real Postgres.
4. **A regression test never run against the broken code is a decoration.** Revert your fix, watch
   the test fail, restore it, watch it pass.
5. **Parse structured fields; do not grep them.** Searching a whole `seo_description` for "painter"
   filed a composition technique as a painter.
6. **Ask what a number is a count OF** before treating it as coverage.
7. **Do not sign attestation-shaped gates** (anything named like `legalApprovalRecorded`) without
   Sean's explicit word.
8. **Do not spoof a publisher's block.** Several feeds 403 non-browser agents and were dropped on
   purpose. Being able to obtain something is not the question.
9. **Write scripts to files.** Shell variables die crossing into WSL, heredocs mangle
   `$POSTGRES_USER` inside `docker exec`, and `npx tsc` resolves to a decoy that exits 1 with a
   message that reads like a type error. Nine inline-edit attempts failed this session, two
   reporting success while writing broken strings.
10. **The Karpathy Wiki holds copyrighted personal-library material.** Cite from it; never paste it
    into a repo. Query with `node scripts/swan-brain.mjs`, and scope visual queries to a collection.

## Owed to Sean, carried forward

- **A hostile panel over all work so far** (GLM-5.3 + Kimi K3 + Grok 4.6). Deferred five times.
  Command and budget in handoff §11. Always `--dry-run` first and disclose the figure.
- Six open decisions listed in handoff §10, most importantly how to acquire the 4,016 missing SREF
  codes (recommendation: email Midlibrary first) and whether Studio rounds need a model at all
  (recommendation: rules-first).

## Closeout expectations

Report what changed, live evidence rather than fake-suite-only, the test delta, and what you did
**not** do. If you claim something works, show the command and its output in the same message. When
you re-order a multi-part request, say so at the moment you decide — not in the summary afterwards.

Boards: **SWA-186** (taste brain), **SWA-70** (SwanGuard). Post a comment when a slice lands.
