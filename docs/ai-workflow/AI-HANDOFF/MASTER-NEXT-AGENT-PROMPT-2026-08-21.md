# Master next-agent prompt (paste this)

---

You are picking up multi-repo work from a session that ended 2026-08-21.

**Read `docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md` in full first.** It is the
index for three repos and supersedes the per-repo handoffs written earlier the same day.

**Then verify the world before trusting it.** A stale handoff nearly caused a duplicate rebuild this
week; the check costs thirty seconds and is in §12 of that document. Expected: taste brain HEAD
`2640e94` with 52 checks passing, SwanGuard HEAD `c212d41` on `merge/newsroom-mainline-v3`. The
SwanGuard counts in §2.2 were re-read live on 2026-08-22 (every row, one query); Docker must be
running for `docker exec` to answer. If anything differs, another agent has moved things: re-orient
before building.

## Pick your lane

The three repos are separate products. **Do not couple them.**

**Lane A — swan-taste-brain (Midjourney prompt generator).** Most active. Next work is Prompt
Studio, fully specified in `docs/PROMPT-STUDIO-SPEC.md`. Start at slice S1 (brain browser); it needs
no model and no network, and it now has real data behind it — 9,521 catalog entries, 4,340 artists,
5,483 descriptions, 51 filter categories.

**Lane B — SwanGuard-Newsroom (news / source trust).** Slice A (the `connectorKey` sweep) is
**done** at `c212d41`; a lexical tripwire scanning api/web/domain/database fails on any new literal
comparison. A hostile panel (2026-08-22) found slice B mis-sized; it is now **B0 → B1 → B2 → B3**
in handoff §7. Start at **B0: per-outlet listing** — `listStatuses()` only enumerates the four
literal definitions, so per-outlet connectors can be synced by direct URL but never *seen*. Do NOT
merge the 107 feeds (B3) before B0–B2; B2 includes re-probing liveness, defining the overlap
criterion, and supplying `termsUrl`/`ownership` per outlet. Retention/volume budget is owed before
B3, not before W3.

## Already done — do not repeat

- Agent-written taste data (2 ratings, 3 kept prompts marked `TEST DATA`) deleted at `b36697e` AND
  retracted from the Hermes vault (re-export + index rebuild, 2026-08-22). `taste/kept.md` reads
  `(nothing kept yet …)`; `--keep` strips that line on the first real keep. If you see ratings or
  kept prompts, they are Sean's — leave them alone.
- The local prompter server's write routes are Origin/Host-gated (`prompter/lib/origin.mjs`). Do
  not loosen that to "make ComfyUI work" — non-browser callers send no Origin and already pass.
- The panel has run. Replies in `docs/ai-workflow/AI-HANDOFF/panel-master-handoff-2026-08-22/`;
  verdicts in handoff §11. Drop Grok from future panels; cap Sol's output.

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
