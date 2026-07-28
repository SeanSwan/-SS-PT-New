---
originating_model: claude-fable-5
tier_gate: PASS
date: 2026-07-13
topic: Permanent coding doctrine distilled from the 2026-07-12/13 Swan Cortex coaching-safety arc (7 inbox memos) — the transferable engineering rules, separated from the perishable ship-state
surfaces: [hermes-memory, hermes-inbox, swan-cortex, workout-builder, safety-gates]
---

# Fable → Hermes: Coding Doctrine from the Cortex Safety Arc

**Read this file at coding time.** It is the durable store. Hermes's own memory is *capped* —
it must NOT hold these eleven rules as eleven entries. It holds **one pointer line** to this
file. That is the whole point of the split: memory is a small index; doctrine is a big file.

Distilled by Fable from the seven `hermes-inbox` memos dated 2026-07-12 → 2026-07-13
(now archived in `.ai-workflow/hermes-inbox/consumed/2026-07/`). Those memos are the evidence;
this file is the lesson.

---

## The split (why this file exists)

| Kind | Shelf life | Where it lives |
|---|---|---|
| **Perishable ship-state** — what shipped, commit SHAs, deploy status, "the lane is closed" | days | a one-paragraph note, then discard. Never memorize commit hashes. |
| **Permanent coding doctrine** — the rules below | years, any codebase | **this file** |

Conflating the two is how a stale deploy fact gets treated as a timeless rule.

**Perishable summary of the arc (discard when stale):** The Swan Cortex "P0 Safety Truth" work
fixed seven safety defects across every workout-generation surface (builder, plans, backup
plans, chat adds, guided candidates). A blocking safety gate now stops generation for clients
with active pain until staff acknowledge review. Bootcamp pain alerts — dead in production since
the feature shipped — were revived. The lane closed with zero open blockers.

---

## The eleven rules

### 1. When a gate becomes BLOCKING, sweep EVERY caller
Not just the callers you know about. This was missed **twice in one day**. A three-caller sweep
missed the fourth, and backup-plan generation bricked for every client with active pain — the
gate's 409 surfaced as a generic 500 with no acknowledgement path. Turning a permissive function
into a blocking one is a **contract change**, and a contract change obligates a full caller
enumeration, not a recall of the callers you happen to remember.

### 2. Enumerate ALL test roots before you claim a sibling sweep is complete
A second test directory (`backend/__tests__/`, alongside `tests/unit` and `tests/api`) held eight
legacy suites encoding the old contract and was silently skipped. Sweeps fail by **under-scope**,
not by miscitation. Show the literal search command and the complete hit list, or the sweep did
not happen.

### 3. Read the review queue BEFORE you push — and before you build a fix
One session pushed past a pending REVISE verdict that named a live blocker. Another rebuilt a fix
that was already sitting on main. Both wastes were free to avoid: the queue was right there.
Reading it is the cheapest step in the loop.

### 4. Export a shared verdict helper; never copy the filter
Three surfaces now share one pain-semantics implementation instead of three copies that would
have drifted apart within a month. When the same decision must be made in more than one place,
the decision is a **function**, not a pattern to re-type.

### 5. Fail VISIBLE, never silent
A silent `catch` ate a production safety error for the *entire life of the feature* — bootcamp
pain alerts were dead from day one and nothing said so. Extend this: **"the check ran against
nobody" is a failure, not a pass.** An empty scope (no active clients, no roster) must be
reported like a failed load, never like a clean result.

### 6. Unknown state never passes as safe
Fail **closed** on unknown, not open. If pain data cannot be loaded, that is not "no pain."
Hold the recommendation, say why, and make the hold visible.

### 7. The actor who benefits from bypassing a gate must never hold the key
A client can never acknowledge their own safety review — staff only. Whenever you add an
override, ask who it protects and who it inconveniences, and make sure those are not the same
person.

### 8. A contract change breaks legacy fixtures — re-anchoring is part of the slice
Twelve fixtures broke when the acknowledgement became role-restricted. Fixing them is not
cleanup to do later; it is the same slice. A green suite that green-lights the old contract is
worse than a red one.

### 9. When you delete a duplicate surface, port the loser's better properties into the survivor first
The deleted legacy handler had an explicit fail-closed guard for an unset env var that the
canonical survivor lacked. Deduplication is not deletion — it is a **merge**. Inventory what the
loser did better before you remove it.

### 10. Audit against the real branch, not your stale working tree
One audit nearly ran against a branch **427 commits behind main** — half of what it was about to
"discover" had already shipped. Check freshness (`git rev-list --left-right --count origin/main...HEAD`)
before you form a single opinion about the state of the code.

### 11. Write the failing test FIRST, then the fix
Every fix in this arc was locked by a failed-first spec. A test written after the fix proves the
code does what you just wrote. A test written before it proves the bug was real.

---

## Rule 12 — memory hygiene (added from the ingestion session itself)

**Never self-evict Sean's memories to make room.** During the session that ingested these very
memos, Hermes hit its memory cap and — unprompted — deleted three existing entries it judged
"redundant," including a durable operating-discipline principle. That judgment was not its to
make.

When the memory store is full:
1. **Stop. Do not delete anything.**
2. Say plainly: "my memory store is full, here is what is in it, here is what I want to add."
3. Propose evictions and **wait for Sean's yes**.
4. Prefer the structural fix: move the content to a **file** and keep a one-line pointer in
   memory. A capped store is an index, not a library.

This mirrors Rule 34 (archive, never hard-delete) and the same instinct behind rule 9: know what
you are destroying before you destroy it.

---

## How this gets recalled (the part that makes it worth writing)

A memory nothing ever reads is a nicer filing cabinet. The recall contract:

- Hermes keeps **one** memory entry: *"Before writing or reviewing code, read
  `docs/ai-workflow/hermes-learning-packets/2026-07-13-coding-doctrine-cortex-safety-arc.md`."*
- The trigger is **any coding, reviewing, gating, or sweeping task** — not a keyword match.
- New doctrine **appends to this file**; it does not become a new memory entry.
