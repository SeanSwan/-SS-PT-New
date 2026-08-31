# Hostile Review Playbook

**For: any agent asked to hostile-review Swan work (Claude, Codex, Fable, Qwen, a subagent).**
**Status:** living. Every technique here is recorded because it caught a REAL defect in this repo,
and the defect is named so you can judge whether the technique is worth your time.

This is not a checklist of virtues. It is a list of *moves*, each with the bug it found. A review
that produces no findings is either a clean slice or a lazy review, and the difference is whether
you actually ran these — so record which moves you ran, not just the verdict.

---

## 0. The one rule that makes the rest work

**A pass proves nothing until you have proven the test can fail.**

Every technique below is an instance of it. Before believing any green result, ask: *what would this
check look like if the thing it tests were broken?* If the answer is "the same", you have a
decoration, not a check.

---

## 1. Validate the instrument before believing a negative

**The move:** when something reports "none", "empty", "missing", or "not found", prove the
instrument can see a positive case at all.

**Caught (2026-08-31):** a test asserted a partner memory could not read the licensed corpus. It
passed. The setup had called `createProject('partner', slug, {...})` positionally when the function
takes a single options object — so **no project was created**, `tasteFor` returned `null`, and every
corpus check "passed" against an empty object. The law was never tested.

**How to run it:** add an explicit *setup control* that fails loudly when the fixture did not get
built (`check('setup control: the memory really exists', made.ok !== false && taste !== null)`), and
a *positive control* proving the condition under test exists (`check('positive control: this memory
really does hold judged photographs to refuse', skipped.notGenerated > 0)`).

---

## 2. Negative controls, or the verifier is a decoration

**The move:** deliberately damage the thing, and require the checker to reject it.

**Caught (2026-08-31):** a backup verifier. Verifying a good backup proves nothing — the function
could `return {ok:true}` unconditionally and pass. The suite now builds five broken backups (missing
file, truncated file, missing bundle, zero-byte bundle, missing tree) plus an empty directory, and
requires a rejection for each.

**How to run it:** for any validator, gate, or verifier, ask "what is the *cheapest* wrong input?"
and assert it is refused. If the code path that produces a failure verdict is never executed by the
suite, the verdict is unproven.

---

## 3. Never assert a magic number — derive it

**The move:** capture the value before the operation, compare after. Never write a count into a test.

**Caught TWICE in one day (2026-08-31):**
1. `check('the rail has three buttons', ... === 3)` broke when a deliberate fourth tab landed.
   Worse, a second guard `'no fourth tab appeared in the rail'` was *actually* protecting "favourites
   is a drawer, not a tab" — bumping 3→4 would have preserved the number and destroyed the meaning.
2. Hours later, in code written *after* fixing that: `check('the ledger came back', ... === 3)` broke
   the moment new checks added rounds.

**How to run it:** replace the number with the relationship it stands for. Instead of "3 buttons",
assert *every rail button has a section and every section has a rail button*. Instead of "3 rounds",
capture `roundsBefore` and compare. When a guard fails after a deliberate change, ask **what does
this guard MEAN** before you edit it — then assert the meaning, so it survives the next change and
still fails for the thing it protects.

---

## 4. "Exists" is not "renders", and "returns 200" is not "works"

**The move:** drive the real surface. Press controls; never infer them.

**Caught (2026-08-31):** an endpoint returned a correct JSON payload with the orphan-render count,
and the page still showed nothing useful — `note()` is a `textContent` channel, so the markup
rendered as literal `<b>` tags and the `<code>` element never existed. The API test was green
throughout.

**How to run it:** attach a `pageerror` listener **before** navigating; read visibility from
**computed style**, never the `.hidden` property; click the actual button; assert on the resulting
DOM, and end each group by asserting nothing threw. An assertion that passes inside a page that is
throwing is not a pass.

---

## 5. Establish a baseline before blaming yourself — or absolving yourself

**The move:** when a suite fails after your change, find out whether it failed *before* your change.

**Caught (2026-08-31):** three browser failures appeared. Two were mine (a new tab tripping tab-count
guards). The third — a control reporting as inert — was **pre-existing**, proven by checking out the
prior commit in a separate worktree and running the same suite. Without that, I would have either
claimed a regression I did not cause or "fixed" something I did not understand.

**How to run it:** `git worktree add <tmp> <prior-sha>`, run the suite there, compare.
**⚠ Do not link gitignored directories into that worktree.** `git worktree remove --force` follows
directory junctions and deletes the *target*. This destroyed 29 MB of gitignored licensed corpus on
2026-08-31; it survived only because another agent's worktree happened to hold a copy. Copy, or
delete the link before the parent.

---

## 6. Read the order of operations, not just the operations

**The move:** for any rule table, dispatch chain, or middleware stack, ask what happens when an input
matches two rules.

**Caught (2026-08-31):** a deterministic prompt-editing engine. The instruction **"remove the snow"
ADDED snow** — the vocabulary table matched the word "snow" before the removal rule ever ran, and
reported success. The exact opposite of what was asked, with a green result.

**How to run it:** feed inputs that match multiple rules and assert on the *intent*, not the
mechanism. Negation, removal, and "less X" are the classic collisions.

---

## 7. Follow the value across the boundary (the sibling sweep that actually bites)

**The move:** when you change a value that another system reads, enumerate the readers — **including
readers in other repositories**.

**Caught (2026-08-31):** upgrading ComfyUI moved the port (8188→8189) and the output directory. Both
were read by a *different repo's* config file, which silently kept pointing at the retired install.
The render loop was disconnected and nothing errored.

**How to run it:** grep the *value* (the port, the path, the env var name), not the file. If the
value is an interface, the sweep does not stop at the repo boundary.

---

## 8. Distrust a doc that states status

**The move:** treat every "BLOCKED", "not yet built", "TODO", "never done" as a claim to verify.

**Caught (2026-08-31):** a spec said the Midlibrary styles library "was never scraped" and the slice
was "BLOCKED on Sean". The catalog — 9,521 entries — had been on disk for ten days. Separately, a
handoff written that same morning was stale by that evening.

**How to run it:** check the filesystem/git before repeating a doc's status claim. Then fix the doc.
Prefer surfaces that *read counts from disk* over surfaces that restate a number, so the claim
cannot rot.

---

## 9. An unexecuted code path is not a working one

**The move:** find the branches the happy path never enters, and force them.

**Caught (2026-08-31):** a dataset exporter shipped with its `--write` path never executed, because
the real data set was empty and every test exercised the empty case. It also depended on an assumed
return shape from another function.

**How to run it:** build a fixture that makes the branch run, and assert on **real bytes** (PNG magic
number, file size, round-tripped content), not on the absence of an exception.

---

## 10. Test-delta disclosure

**The move:** when reporting a pass count, say what you changed about the tests.

A suite that goes from 18 to 20 files and 0 to 0 failures tells the reader nothing if you also
rewrote three assertions. State it: *"19 suites green; two guards rewritten from hardcoded counts to
derived relationships; one new suite."* A pass count that includes assertions you just relaxed is
not evidence.

---

## 11. Own the destructive mistake immediately and in the record

If a review or a fix damages something, say so in the turn it happened, name what was lost, prove the
recovery (**recompute the numbers — do not accept "the files are back"**), and write the procedural
fix. The 2026-08-31 corpus deletion is documented in
`docs/ai-workflow/hermes-learning-packets/20260831-a-junction-inside-a-worktree-deletes-the-real-thing.md`.
"Be careful" is not a fix. "Copy instead of linking into anything you will force-remove" is.

---

## How to run a review with this playbook

1. **Scope it.** Name the slice and what "done" was claimed to mean.
2. **Baseline it** (§5) before attributing any failure.
3. **Run the moves** that fit the change — §1/§2 for anything that validates or gates, §3 for any
   assertion with a number in it, §4 for anything with a UI, §6 for rule tables, §7 for changed
   values, §8 for docs, §9 for new code paths.
4. **Loop.** Fix what you find, re-verify, and review again — until a full pass finds nothing new.
   One clean pass after a pass that found things is not dry; the confirming pass must itself be clean.
5. **Report** what you looked for, what you found, what you fixed, and the proof — with §10
   disclosure. "Found nothing this round" is a legitimate and useful line.

## Recording a review

Append a row to the log below so the next agent can see what has already been attacked and does not
re-run a dry lane blindly.

| Date | Target | Moves run | Findings | Verdict |
|---|---|---|---|---|
| 2026-08-31 | Prompt Studio S1–S4 (swan-taste-brain) | §1 §3 §4 §6 §9 | "remove the snow" added snow; corpus-law banner erased by next paint; 210 duplicate catalog names needed stable ids; setup control missing | fixed, re-verified |
| 2026-08-31 | Aftertaste H3 hardening handoff (SS-PT) | §5 §7 §8 | 19-file patch uncommitted in a temp worktree; render loop disconnected by the port/output change; benchmark profile already outdated | APPROVE with findings |
| 2026-08-31 | LoRA export + backup tooling | §2 §9 | write path never executed; backup module not import-safe (ran its CLI on import) | fixed, re-verified |
| 2026-08-31 | Judge empty state | §4 | markup rendered as literal text; memory-scoped read across an await with no world guard | fixed, re-verified |
