# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/debate-swa200-blueprint-2026-08-23/R2-PACKET.md
**Tokens:** 4947 in / 12409 out (reasoning: 11262) | total 17356
**Wall:** 171.6s

---

## 1. What's now wrong: the precondition gate deadlocks, and following it literally breaks `main`

The mermaid asks **"3.1 one-liner *applied* by Sean?"** → no → "do NOT merge #68." But the one-liner runs `node scripts/pre-migrate-guard.mjs` — a file that only exists on `main` **after** #68 merges. Apply-then-merge means every push to `main` fails the build at "Cannot find module" until #68 lands: migrations stop running entirely, by choice. Merge-then-apply is the "false safety" window the gate was added to forbid — which is why the prose retreated to "*settled*" (§3) while the chart still says "*applied*" (§5). Two readers execute two different orders; the only workable sequence — merge #68 and push the one-liner in one coordinated window — is the one the chart forbids. Fix the S1 node to "decision made + choreography agreed," and FORK to "merged and wired in one window."

(Smaller, same disease: B0 re-opens "does the build image have `pg_dump` at a compatible major version" — the exact fact §2.1 stamps *verified, not suspected*. If it's verified, B0's first question is already answered: the backup moves off the build container. Pick one posture.)

## 2. Delete the backup step? Yes — with three conditions, not as a shrug

The document supplies its own criterion: a rail that can't work where it runs gets cited in a postmortem as a safeguard that existed. The step's only current output is a lying attestation field. Snapshots are strictly better than a decorative dump: their absence is visible in a dashboard instead of a build log, a B1 drill is runnable **today** (fork a snapshot to a throwaway instance) without shipping `pg_dump` anywhere, and point-in-time recovery loses *less* than last-night's dump — which runbook step 4 itself worries about. So this is not "shipping less safety": delete + drill is more safety than a dump that never existed.

Conditions:

1. **Pull the plan's actual snapshot retention window first.** Plan-dependent; a 2–3 day window is not a backup strategy.
2. **Name what you lose before deleting:** snapshots give recovery, not rehearsal. B2's wireframe restores `swan-prod-20260824.dump` into ephemeral pg16 — that artifact vanishes. B2 then needs snapshot-fork-via-API (slow, costlier, rate-limited) or an off-build-container dump job. Decide which *before* deleting, or the "highest-value item in this document" dies quietly.
3. **The attestation stops emitting `backup:"failed","outcome":"proceeding"`** — replace with `artifact:"render-snapshot"`. And 3.2 simplifies: with no backup step, `enforce`'s backup-fatal clause is moot and becomes enable-able once a snapshot drill passes.

## 3. What still fails silently

- **B2's BLOCK arrives after prod already ran the migration.** Deploys fire on push to `main`; the nightly runs at 03:14. A migration merged at 14:00 hits prod at 14:01; the rehearsal happens 13 hours later. A migration that fails against real data failed *loudly* on prod at deploy time — the nightly tells you tomorrow what prod told you yesterday. It's an autopsy machine, not a gate. And if the dump pipeline silently stops producing dumps (the exact §2.1 failure mode: logged, proceeded), the rehearsal keeps going green against a stale artifact — nothing in 7.2 asserts dump age. Fix: `dump_age > 24h → BLOCK`, and wire restore-and-migrate as a PR check if you want prevention.
- **A1 has no surface and inherits fail-open.** The attestation is one physical line emitted *before* the child runs — post-apply results cannot be inside it, so `grep PRE-MIGRATE-ATTESTATION | jq` never sees A1 fail (as written it also chokes on the prefix). Nothing says A1 failure is fatal in warn mode. The item moved to FIRST to close the no-post-condition gap recreates the gap: dead and alive look identical unless a human reads prose log lines.
- **`locked:false` has no failure shape.** The three shapes cover missing line, `lockVerified:false`, backup-blocked — but a concurrent deploy under warn acquires no lock, attests `"locked":false,"outcome":"proceeding"`, and proceeds. Overlapping deploys are the exact race the lock exists for, and shape (4) for it doesn't exist.

## 4. Monday morning

Send Sean one message containing the corrected choreography the mermaid gets backwards — merge #68 and push the `render.yaml` line in a single coordinated window, because apply-before-merge breaks every deploy to `main` — and the snapshot-retention number you pulled from the dashboard that morning, since it decides both 3.1 and §2's deletion question in one stroke.

**Verdict:** handoff-ready once the S1 gate is reworded — a two-line edit — and the three items above are logged in §6 as known gaps. Everything else survived a hostile read; no false disagreement here.
