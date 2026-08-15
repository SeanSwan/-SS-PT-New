# Hostile Review Packet — Constitution Repair (2026-08-14)

**Scope of this packet:** process/tooling mechanics ONLY. Every category of sensitive
content carried by the real documents — commercial, personal, health-related, client
data architecture, infrastructure identifiers, and credentials — is deliberately
excluded, and this packet is grep-verified to contain zero instances of each.
Reviewers: attack the REPAIR LOGIC and the GUARD, not the product.

---

## 1. The defect being repaired

A repo carries two agent constitutions:

- `CLAUDE.md` — read by Claude sessions.
- `AGENTS.md` — read by a second agent (Codex). Structure: a hand-owned adapter
  header, then a marker line, then a byte-exact mirror of `CLAUDE.md`.

A generator (`sync-agents-mirror.mjs`) regenerates the mirror body from `CLAUDE.md`.
Direction is one-way: CLAUDE.md → AGENTS.md.

On 2026-08-14 commit `10a3e7fa1`, titled *"feat(skills): design-dialogue — and a cost
figure in rule 16"*, changed `CLAUDE.md` by +61/−194 lines. Its two advertised edits
were correct and are still wanted. It ALSO, with no mention anywhere in the message:

- deleted 9 numbered MANDATORY rules (46, 73, 75, 76, 77, 78, 79, 80, 81),
- reverted rule 46 from a newer review-gate policy to a superseded one,
- renumbered rule 74 → 73, colliding with the other constitution's numbering.

`AGENTS.md` was not touched by that commit, so it retained all 81 rules. Result: for
~15 hours the two agents operated under different law, and the file with FEWER rules
was the one the generator treats as the source of truth.

**Failure class:** *stale-copy clobber.* An agent regenerates a whole file from a
snapshot held in its context, preserves its own intended edits, and silently reverts
everything that landed in between. Nothing errors. The commit is green. No test, lint,
type-check, or secret scan can see it, because overwriting a file is not a fault.

**Aggravating factor:** a session-start drift hook detected the divergence and
prescribed `node scripts/sync-agents-mirror.mjs`. Because the generator's direction is
CLAUDE→AGENTS, following that advice would have overwritten the only complete copy
with the damaged one — converting a recoverable divergence into permanent loss.

---

## 2. What the repair found (all counts machine-verified, not estimated)

A name-keyed comparison was used rather than number-keyed, because the numbers had
collided and number-keyed matching reports nonsense.

| Finding | Count |
|---|---|
| Rules only in AGENTS.md (lost from CLAUDE.md) | 9 |
| Rules only in CLAUDE.md (the superseded rule 46) | 1 |
| Same rule name, different number | 1 (Proof-Before-Done: 73 vs 74) |
| Same number, materially different body | 9 |

**The key finding: divergence was BIDIRECTIONAL.** Neither file was a superset. A
naive copy in either direction destroys real content. Of the 17 differing hunks,
AGENTS.md held newer text in 13 and CLAUDE.md in 4.

A length heuristic was explicitly rejected as the tie-breaker. Each of the 9 body
differences was read. Four resolved to CLAUDE.md (a corrected cost figure, an added
enforcement paragraph, an added doctrine section, an amended provenance list). Three
resolved to AGENTS.md because they cite a rule that only AGENTS.md still had — they
are downstream of the deletion and only coherent once it is reversed.

A mojibake hypothesis for the small deltas was tested and **disproved** (0 hits for
`â€"`, `â€™`, `Ã©`, etc. in both files) before treating the deltas as real content.

---

## 3. Second-order damage found by reading, not by diffing

Because the two files were *identical* in these places, no diff could surface them:

1. **A stale decision-authority chain.** One line named a review chain retired ~3 weeks
   earlier, directly contradicting the restored rule 46. Present verbatim in BOTH
   files, so mirror-parity checking would call it healthy forever.
2. **A destructive production instruction.** The damaged file still told a future agent
   to run a force-reseed against production data. The other file had a written
   retraction of exactly that instruction. The retraction is now in both.
3. **Routing rot.** The damaged file advertised 23 available capabilities; 42 exist on
   disk. 18 were unadvertised — including the very capabilities that prevent this class
   of defect. It also routed to 2 capabilities that no longer exist under those names.
   A capability absent from the table is invisible to the agent: the table IS the router.
   This is the mechanism behind the owner's complaint that "skills don't fire."

---

## 4. The repair

1. Base = AGENTS.md mirror body (won 13 of 17 hunks).
2. Splice in CLAUDE.md's 4 genuinely newer rule blocks, via a script that **refuses to
   write** if any anchor is missing or if a splice would be a no-op.
3. Add the 4 capabilities neither file advertised; remove 2 phantom references.
4. Fix the stale authority chain in prose (found by reading for contradiction).
5. Regenerate AGENTS.md from the repaired CLAUDE.md.

**Post-condition:** 81 rules in both; 0 missing either way; 0 number mismatches; 0 body
differences; mirror `--check` OK; 0 unadvertised capabilities (was 18); citation sweep
shows 0 broken references; valid UTF-8, no mojibake, no CRLF.

---

## 5. The guard (the actual deliverable — attack this hardest)

`scripts/hooks/constitution-guard.mjs`, wired into pre-commit. Blocks:

1. **Rule removal** — a rule name in HEAD absent from the staged file.
2. **Rule renumber** — a rule name whose number moved (silently breaks every citation).
3. **Mirror drift** — AGENTS.md body ≠ CLAUDE.md.

Design choices to attack:

- Matches on **name**, not number, because the incident renumbered.
- Compares `git show HEAD:file` vs `git show :file` (index), so it judges what is
  actually being committed, not the working tree.
- **Prints its verdict on every path**, including skips — a guard whose failure mode is
  silence is not a guard.
- Escape hatch `SWAN_ALLOW_RULE_REMOVAL="46,73"`, keyed by the rule's number in HEAD,
  authorizing both removal and renumber. Rationale: an unblockable check gets bypassed
  wholesale with `--no-verify`. This was added after the guard blocked the repair's own
  legitimate renumber and revealed there was no sanctioned way through.
- Fails **open** on git errors / no HEAD (cannot block unrelated work); fails **closed**
  on an unparseable rules section.

**Proof it can fail:** 7 end-to-end tests build a real throwaway git repo and replay the
actual incident. 3 assert exit 1 (clobber / renumber / mirror drift). 4 assert exit 0
(honest edit, named removal, named renumber, non-applicable commit) so a block is known
to be caused by the defect and not by an always-red harness. 7/7 pass. Live-fired
against the real repair: it blocked, named both intentional changes, and passed only
once they were declared.

---

## 6. Attack these specifically

1. **What does the guard still not catch?** Name a mutation of a MANDATORY rule that
   passes all three checks and still changes the law. Body rewrites keeping the same
   name are the obvious hole — is that acceptable, or does it need a body-hash ledger?
2. **Is name-keyed matching the right primitive?** A rule renamed AND renumbered in one
   commit reads as removal+addition. Does that produce a false block that trains
   bypassing, or a true block?
3. **The `--no-verify` hole.** Pre-commit is client-side and bypassable. Does this
   belong in CI instead, or in addition? What is the cheapest CI form that closes it?
4. **Was the merge direction right?** Base=AGENTS + splice 4 from CLAUDE. Argue for the
   inverse, or for a per-rule provenance ledger instead of a one-shot merge.
5. **The generator is still one-way.** With the guard, is that now safe, or is one-way
   generation the root defect that should be replaced by a single source with two
   rendered views?
6. **Reading for contradiction found what diffing could not** (§3.1, §3.2). That does
   not scale. Propose a mechanical check for "two documents agree with each other but
   both contradict a third thing they each assert."
7. **The 18 unadvertised capabilities.** The table is hand-maintained and drifted 43%.
   A runtime validator exists and passes, but validates existence, not advertisement.
   Propose the check that fails when an installed capability is undocumented.

## 7. Known limits of this packet

- Sanitized: the real documents contain business and personal content excluded here.
- The rule *contents* are not included, only their identity and count — so semantic
  review of any individual rule is out of scope.
- Reviewer output is advisory. Repository truth and owner approval remain authoritative.
