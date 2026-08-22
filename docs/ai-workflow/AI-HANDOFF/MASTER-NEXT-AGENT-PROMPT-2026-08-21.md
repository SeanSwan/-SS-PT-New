# Master next-agent prompt (paste this)

---

You are picking up multi-repo work from a session that ended 2026-08-21.

**Read `docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md` in full first.** It is the
index for three repos and supersedes the per-repo handoffs written earlier the same day.

**Then verify the world before trusting it.** A stale handoff nearly caused a duplicate rebuild this
week; the check costs thirty seconds and is in §12 of that document. Expected: taste brain HEAD
`b36697e` with 40 checks passing, SwanGuard HEAD `ea76189` on `merge/newsroom-mainline-v3`. The
SwanGuard counts in §2.2 were re-read live on 2026-08-21 (later session) and matched; Docker must be
running for `docker exec` to answer. If anything differs, another agent has moved things: re-orient
before building.

## Pick your lane

The three repos are separate products. **Do not couple them.**

**Lane A — swan-taste-brain (Midjourney prompt generator).** Most active. Next work is Prompt
Studio, fully specified in `docs/PROMPT-STUDIO-SPEC.md`. Start at slice S1 (brain browser); it needs
no model and no network, and it now has real data behind it — 9,521 catalog entries, 4,340 artists,
5,483 descriptions, 51 filter categories.

**Lane B — SwanGuard-Newsroom (news / source trust).** Slice A (the `connectorKey` sweep) is
**done** at `ea76189`; a tripwire test now fails on any new literal-only comparison. Next is
**slice B: merge the 107 verified feeds** from `config/verified-feed-candidates.json` — but first
add a per-outlet listing: `listStatuses()` only enumerates the four literal definitions, so
per-outlet connectors can be synced by direct URL but never *seen*. Batch-enabling 100+ outlets
with no listing is not operable. The probe output has no `termsUrl`/`ownership`; supply both per
outlet, and every entry needs a real terms URL.

## Already done — do not repeat

The agent-written taste data (2 ratings, 3 kept prompts marked `TEST DATA`) was deleted at
`b36697e`. `taste/kept.md` now reads `(nothing kept yet …)`; `--keep` strips that line on the first
real keep. If you see ratings or kept prompts, they are Sean's — leave them alone.

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
