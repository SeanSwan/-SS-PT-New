# Session handoff — Hermes durable learning corpus: enforcement, migration, read side

**From:** vs-claude (`claude-opus-5`), session `b906566c` · **To:** the next agent
**Date:** 2026-08-16 → 2026-08-18 UTC · **Branch:** `wip/comms-notifications-2026-07-05` (pushed)
**Board:** **SWA-176** · **Reviewer:** GLM-5.3, one hostile round, **6 findings, 6 real, 0 disproven**
**Predecessor:** `SESSION-HANDOFF-COMMS-LANE-AND-HERMES-CORPUS-2026-08-14.md` — read its §7 before you assert anything

---

## 0. Read this first (60 seconds)

This session executed the predecessor handoff's next-action list, **reordered on evidence**, and
that reorder is the most useful thing in this document.

The predecessor ranked "build the read side" first and "migrate 14 failing packets" second. Both
were right about the symptoms and wrong about the order, because of one fact nobody had measured:
**the corpus was not a static mess, it was actively getting worse.** Packets written *after* the
schema shipped were still failing it.

The cause was mundane and total: **the template every agent copies contradicted the schema it was
meant to satisfy.** No `title:` key at all, a `topic:` key that is not in the schema, and
`status: open` which is not a legal value. Agents follow the template, so **the template was the
real contract** and the schema was aspirational. Migrating while that template stood would have
meant migrating again a week later.

Second cause, equally mundane: `hermes-learning-validate.mjs` had been "the contract" since
2026-08-13 and **nothing ever called it.** A `--check` flag that exits 2 is an *opportunity* for
enforcement, not enforcement.

**Everything is pushed and green.** One slice remains open (§6) and it is small.

---

## 1. What shipped

| commit | what |
|---|---|
| `72bca135c` | Template corrected + validator wired into the Stop gate + 7 tests |
| `1cd177755` | Gate enforced nothing outside the repo root (my bug, my catch) + test 19 |
| `1e8992679` | GLM-5.3's 6 findings fixed + corrective pass over 12 packets |
| `19cdf6df5` | My corrective pass broke YAML in all 12 files it touched — repaired |
| `21522fe3d` | Strict-YAML conformance warning (schema 1.0.0 → 1.1.0) |

**New tooling**

- `scripts/hermes-learning-migrate.mjs` — back-fills schema-required frontmatter. Refuses to touch
  **untracked** packets (other agents' in-flight work, no `git checkout --` rollback path). If it
  cannot determine tracked state at all it treats everything as untracked and refuses to write.
- `scripts/hermes-learning-surface.mjs` — the read side, wired to `SessionStart`. Pointer, not
  payload (Rule 72): a short line plus `--grep`, because dumping 60+ packets per session is how a
  knowledge base becomes a tax people route around.
- `scripts/hermes-learning-correct-2026-08-16.mjs` — one-shot corrective pass, scoped by the
  `migrated:` stamp.
- `scripts/hermes-learning-validate.test.mjs` — 7 tests for the strict-YAML warning.

---

## 2. The read side, and why it is worth keeping

Rule 68 is entirely a **write** trigger. It says when a lesson must be recorded and never says when
anything is obliged to **consult** one. Measured before this session: the ephemeral inbox tier (which
*has* an automated read hook) had 641 consumptions; the durable tier that "compounds forever" had
**one hand-written pointer**.

It justified itself within the hour. Stuck on a git `index.lock`, I ran:

```bash
node scripts/hermes-learning-surface.mjs --grep "index.lock"
```

and it returned *"A failed command can hold the lock forever"* — a packet a previous session had
written about that exact trap, including the decisive internal (git renames the lock over the index,
so a 0-byte lock means the index was never at risk) and the licensed procedure (OS-handle probe,
then move aside, never delete). That is the whole point of the tier.

---

## 3. GLM-5.3 review — what it caught

Two findings were violations of the migrator's own stated rule, "derive, never invent", which its
own receipt claimed it was obeying:

- **H2** — `decision:` was copied from `topic:`. A topic is a **subject**; a decision is **the rule
  the packet establishes**. The receipt said "re-keyed, not re-authored" — true of the string, false
  of the meaning. And the new read path printed it as a top-tier `rule:`, so the migration was
  *manufacturing authority* for phrases nobody asserted. Now `unknown`; `topic:` left in place.
- **H3** — `privacy:` asserted "no PII" on the strength of 8 **key-shape** regexes that cannot
  detect an email, name, phone, IP, or hostname. Now states only what was checked.
- **C1** `yamlScalar` missed `#`, leading `-`/`?`, bare true/false/null/dates.
- **C2** `applyPlan`'s substring slicing is a second frontmatter parser that breaks on block
  scalars; such packets are now refused rather than sliced.
- **C3** wrote to disk *then* validated, making every escaping bug a committed mutation the run
  merely reported. Now validates the produced string **before** the write.
- **H4b** dry-run printed "untracked" when the git query had *failed*.

**Calibration:** worth paying for on contracts, receipts, and data-mutation ordering. It labelled
reachability honestly, including refusing to certify the Stop hook because I had sent it an 80-line
**fragment** instead of the file — my error, and exactly the "review packets need source not
inventory" lesson already in this corpus.

**Harness warning:** its first run died with `UND_ERR_CONNECT_TIMEOUT` while the background-task
wrapper reported **"completed (exit code 0)"**. A runner that reports transport failure as success
is dangerous: "no findings" and "no review" are indistinguishable downstream, and the first reads as
approval.

---

## 4. Current state — PERISHABLE, re-measure before trusting

> Every number here was true when written and is the first thing that will rot. `main` moves hourly
> and **several agents commit to this same branch**. Treat all of it as a starting hypothesis.
>
> **Including the SHA below.** `21522fe3d` was HEAD when this paragraph was written and stopped
> being HEAD the moment this handoff was itself committed — the predecessor handoff shipped exactly
> this defect and confessed to it, so it is stated here rather than repeated. Read the SHA as "the
> last commit of the corpus work", not as "the current tip".

```
branch      wip/comms-notifications-2026-07-05    pushed, in sync (0/0) at 21522fe3d
corpus      64 packets                            (was 38 when this session started — it grew during it)
validator   6 clean · 43 warnings-only · 15 FAILING
of failing  ~13 are UNTRACKED (other agents' live work, deliberately held back)
            1 tracked: 20260814-a-green-build-is-not-a-bootable-artifact.md (missing "## Mistakes I made")
strict-YAML 8 packets pass our validator and fail js-yaml
tests       gate 19/19 · validator 7/7
```

Re-measure with §8.

---

## 5. Traps that cost me time

- **`index.lock`.** Age rising monotonically for 331s read as "stale" by the documented
  discriminator — and it cleared on its own, proving it was **live**. Age is not the instrument; the
  OS-handle probe is (`fs.openSync(lock,'r+')` → EBUSY means a live process holds it). Never delete
  another agent's lock; wait, or probe first.
- **Another agent's commit swept my work.** `844d2c248` ("classroom-copilot") absorbed my scripts,
  16 migrated packets and the settings hook. Content intact, attribution wrong, history not
  rewritten (Rule 45). Stage explicit paths and **verify `git diff --cached --name-only` before
  every commit** — and expect the index to be cleared under you mid-turn.
- **`git add` failing silently.** I piped it through `2>/dev/null`, saw "staged: 0", and read it as
  a result rather than a hidden error. Never suppress stderr on a command whose failure changes your
  conclusion.
- **A guard that passes vacuously.** My "no foreign files in the index" check passed at the exact
  moment nothing was staged. A guard over a set must assert the set is **non-empty** first.
- **Inline `node -e` patch scripts get mangled by bash.** The predecessor handoff says this; I
  ignored it twice before obeying it. Write patch scripts to a file, re-read from disk, and assert.
- **My own `cp` backup/restore reverted a verified fix.** "Verified from both directories" was true
  when I said it and silently stopped being true. If you back up before instrumenting, `grep` for
  the fix again after restoring.
- **`spawnSync`'s `input:` option breaks hook tests on Windows** — `readFileSync(0)` throws, the
  hook takes its "bad stdin → allow" path, and your test fails for a reason unrelated to what it
  tests. Feed stdin from a real file descriptor.
- **Git Bash `/c/tmp` is `C:\c\tmp` to Node.** Use `c:/tmp`. And `MSYS_NO_PATHCONV=1` for
  `<rev>:<path>`.

---

## 6. Next actions, ranked

1. **The 8 strict-YAML failures are now *visible* but not *fixed*.** `node
   scripts/hermes-learning-validate.mjs` warns on each. Most are inconsistent indentation inside
   nested `models_used:` blocks. **4 belong to other agents' untracked work — do not rewrite those**
   (Rule 67); their authors fix them at their own closeout now that the warning exists.
2. **One tracked packet needs a `## Mistakes I made` section** —
   `20260814-a-green-build-is-not-a-bootable-artifact.md`. Its `reviewed_by` says
   *"R1/R2/R4/R5 each found a real defect"*, so mistakes certainly existed. **Do not fabricate
   them**; it needs its author or a deliberate honest-empty decision.
3. **Migrate the ~13 held-back untracked packets** once their owning sessions commit them. Re-run
   `node scripts/hermes-learning-migrate.mjs --dry-run` — it is idempotent and will show what is
   newly eligible.
4. **Consider declaring `js-yaml` a real dependency.** It is transitive today; the strict check
   degrades loudly if it vanishes, but a declared dep would make the check dependable.
5. **Still deferred on Kimi's advice (unchanged):** the routing table (needs ≥20 packets with
   *externally verified* outcomes — a self-graded table manufactures authority) and `INDEX.md`
   (crossover ~75–150 packets; at 64 and climbing fast, this is closer than it was).
6. **Sean-owned, carried forward from the predecessor:** Render `autoDeploy: false` (raised seven
   times now), the comms re-integration hours call, a one-time repo-history secret scan, GitHub Pro,
   and the `AGENTS.md` mirror drift.

---

## 7. The meta-lesson

The predecessor handoff's §7 confessed to nine instances of *"ran a narrow check, got a null result,
reported it as a general finding."* **I produced four more, in the session that opened by reading it**,
and then a fifth of a related kind:

- an `awk` anchored `^---$` matched nothing against CRLF, and I published a table from it;
- a `mktemp` path Node on Windows cannot resolve made the hook look like it did not block;
- `2>/dev/null` hid a `git add` failure and "staged: 0" read as a result;
- my own restore reverted a fix, so a verified claim silently became false;
- **and my corrective pass reintroduced the exact `#`/colon-space defect I had fixed ninety minutes
  earlier**, in the script whose job was fixing honesty defects.

Reading the warning did not prevent any of them. What actually worked, every time, was a
**procedure**:

| instead of | do |
|---|---|
| trusting a null result | run a **positive control** — break it deliberately, confirm red, restore, confirm green |
| "my fix works" / "my test is wrong" | run a **two-vantage control** — vary one variable, hold the harness fixed |
| trusting the working tree | verify against **committed blobs** (`git show HEAD:<path>`) |
| trusting our own validator | cross-check with an **independent implementation** (a real YAML parser) |

**A documented lesson is not a fix. Only a procedural correction survives.** That is now a packet in
the corpus, with the repeat count attached, because a lesson written down and then repeated is
evidence the write-up was not the fix.

---

## 8. Verify this handoff yourself

Do not trust it. All cheap:

```bash
export MSYS_NO_PATHCONV=1
git rev-list --left-right --count origin/main...HEAD        # drift; expect it to have moved
node scripts/hermes-learning-validate.mjs                    # header states strict-YAML ON/OFF
node scripts/hermes-learning-validate.mjs --migration-spec   # what still fails, by frequency
node scripts/hermes-learning-validate.test.mjs               # expect 7/7
node scripts/hooks/hermes-closeout-gate.test.mjs             # expect 19/19
node scripts/hermes-learning-migrate.mjs --dry-run           # expect 0 to migrate (idempotent)
node scripts/hermes-learning-surface.mjs --session-start      # the read side
node scripts/hermes-learning-surface.mjs --grep "<topic>"     # before asserting anything is novel
node scripts/lane.mjs digest                                  # who else is live in this tree
```

**Prove the gate actually bites** (it silently enforced nothing for part of this session):

```bash
# write a deliberately malformed packet, then run the gate from a NON-repo-root cwd.
# It must block. If it exits silently, the cwd resolution has regressed — that was bug 1cd177755.
```

**Artifacts:** review packet `AI-HANDOFF/PACKET-GLM53-hermes-corpus-2026-08-16.md` · findings
`AI-HANDOFF/GLM-HOSTILE-hermes-corpus-2026-08-16.md` · learning packet
`hermes-learning-packets/2026-08-17-a-contract-nothing-calls-is-a-document.md` · inbox memo
`.ai-workflow/hermes-inbox/pending/20260818T010000Z-*`
