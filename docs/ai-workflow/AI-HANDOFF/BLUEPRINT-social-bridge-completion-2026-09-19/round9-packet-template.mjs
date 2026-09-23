/**
 * round9-packet-template.mjs — the round-9 packet's prose and section layout.
 *
 * EXTRACTED FROM build-round9-packet.mjs to respect ban #50 (no source file reaches 300 lines).
 * The split is by ROLE, not by line count: this module owns the WORDS and the section order; the
 * builder owns READING FILES and HASHING them. A future round can reuse the prose with a different
 * artifact set, and a change to the prose cannot accidentally change what gets hashed.
 *
 * Every artifact is interpolated as already-rendered markdown. This module performs NO file reads
 * and computes NO hashes — if it did, an inlined block could disagree with its own stated sha256,
 * which is the exact defect the builder exists to prevent.
 */

export function renderRound9Packet({ sources, tests, commits, round8Review, mutationRecord, builtUtc }) {
  return `---
---
title: "Round 9 review packet — the D1-D4 fixes, with every artifact INLINED"
purpose: >
  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate whether the four round-8
  defects are actually closed, without resolving a single hash, path, or network reference.
predecessor: Z:/HostileReviews/2026-09-21-163103-social-bridge-round-8-astra-s-dns-pin-review.md
target_commit: 6cca20594
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: ${builtUtc}
built_by: build-round9-packet.mjs
---

# Round 9 review packet — the D1-D4 fixes, INLINED

## §0 — Read this first: what round 8 found, what changed, and what you are being asked

Round 8 returned **\`DEFECTS-FOUND\`** — 0 critical / 1 high / 2 medium / 1 low, 4 unproven. Four
defects, and its own words for the most important one are worth restating because they set the bar
for this round:

> *"A function whose header promises fail-closed while its IPv6 branch defaults to fail-open is worse
> than one with no promise, because downstream authors trust the promise."*

**All four are now claimed fixed. This packet exists so you can try to falsify that claim.**

| # | Round-8 defect | Severity | The claimed fix |
|---|---|---|---|
| **D1** | response body cancelled *after* the dispatcher was awaited closed | HIGH | \`closeDispatcher\` moved into a \`finally\` wrapping the WHOLE fetch-and-body operation; a new \`readImageBody\` settles the body on every path first |
| **D2** | \`isPrivateOrLocalAddress\` had a false fail-closed contract (denylist, \`return false // public IPv6\`) | MEDIUM | the IPv6 branch INVERTED to an allowlist: \`2000::/3\` must be *positively recognised* |
| **D3** | the decisive named-host transport test did not exist | MEDIUM | a new file drives **real sockets** against two real servers and asserts **which address answered** |
| **D4** | \`resolveAndValidate\` **admitted** \`https://[::ffff:0:127.0.0.1]/\` | HIGH | brackets stripped before \`net.isIP\` so a bracketed literal takes the literal branch |

**Nothing below is cited by reference.** Every source, every test, the classifer, and the mutation
records are embedded in full, each with its sha256 computed from the same bytes you are reading.
Hash the fenced blocks yourself if you want to check that promise — they are the artifacts.

**What you can and cannot do.** You are read-only and shell-less: you **cannot execute** anything.
Do not attempt socket tests or mutation runs; their absence is expected and is accounted for in §5.
What you *can* do is the part that mattered in round 8 — **read the bytes and adjudicate as text.**

---

## §1 — Remit

Adversarial pass. Your job is to **falsify** the claims below, not to endorse them. For each claim
return \`CONFIRMED\`, \`FALSIFIED\`, or \`BLOCKED / unproven\`, naming the line of source that supports
your verdict. A \`CONFIRMED\` must name what you read.

- **PART A — C1–C9: is each round-8 defect actually closed?** A fix is closed only if the *mechanism*
  is gone, not if the symptom is quiet.
- **PART B — the honesty audit.** Round 8 caught comments that overclaimed (C7/C8 falsified: a header
  saying "no symbol-poking" while the code poked symbols). Re-check every comment that asserts what
  the code does. **Comments are claims.**
- **PART C — the new material.** Round 9 adds a transport test and two mutation records. Auditing
  new tests is the higher-value half: a green suite whose green does not entail the property is the
  R6-01 defect class, and it is the one this loop keeps finding.
- **PART D — scope and verdict**, including whether any claim is *unfalsifiable as stated*.

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact and
mark it \`BLOCKED\`, not \`FALSIFIED\`.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The socket connects to the address admission approved, for a DNS NAME, and this is now observed from the NETWORK side rather than by calling our own hook | mostly — the new test's assertions are textual; a live run is the residue |
| **C2** | An IP LITERAL, **including a BRACKETED IPv6 one**, is stopped by admission and not merely by the resolver | **yes, fully** |
| **C3** | The D1 ordering is now correct on EVERY path: the body is settled before the pool is closed | **yes, fully** |
| **C4** | The D1 tests would go RED if the ordering regressed — i.e. they assert ORDER, not presence | reading + the mutation record |
| **C5** | No existing security guard or test was removed to make these fixes land | **yes** — both patches are below, in full |
| **C6** | The new transport test asserts on TRANSPORT, and would go RED if the pin were disconnected | reading + the mutation record |
| **C7** | \`isPrivateOrLocalAddress\` now genuinely fails closed: unrecognised colon-bearing input is PRIVATE | **yes, fully** |
| **C8** | The source's own comments do not overclaim (re-audit after round 8 falsified two) | **yes, fully** |
| **C9** | The classifier's extraction into its own file changed no behaviour for the audio consumer | **yes** — both bodies are below |

### C4 and C6 note, stated up front

Both ask whether a suite would *notice* a change. That is the R6-01 class, and the honest answer has
a runtime residue: a mutation record can be *fabricated* as easily as it can be written. You cannot
re-run the mutations. What you *can* do is check that the recorded mutations are the ones that would
matter, and that the assertions are written to catch them. **One of these mutations SURVIVED its
first attempt — see §3.5 — and that is reported as a defect against the test, not hidden.** If the
records had been tidied, you would have no way to tell.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review

${sources}

### 3.2 The tests

${tests}

### 3.3 The commits under review, in full

${commits}

### 3.4 The round-8 review being remediated

${round8Review}

### 3.5 The mutation records — the author's evidence for C4, C6 and C9

The D1/D2/D4 mutation evidence lives in the repo's mutation record; the D3 evidence was produced in
this session and is reproduced verbatim below. **Read the second one closely: it records a mutation
that SURVIVED.** A record that only contained successes would be the thing to distrust.

${mutationRecord}

#### The D3 mutation record, reproduced verbatim from this session

\`\`\`markdown
D3 MUTATION RECORD — spotlightImageTransportPin.test.mjs
========================================================
Subject: the new transport test committed as 6cca20594.
Method: mutate backend/services/spotlightImageUrlPolicy.mjs, run the suite, restore the source
        and verify byte-identity (sha256 6ec126d3c5529032…, git diff HEAD = 0 lines).
Every mutation below was REVERTED before the next one; each restoration was hash-checked.

--- Mutation 1 — the pin is removed entirely -----------------------------------------------
EDIT:  return new Agent({ connect: { lookup: createPinnedLookup(addrs) } });
   ->  return new Agent();   // pin removed — does any test notice?

RESULT: 2 of 4 RED in spotlightImageTransportPin.test.mjs
        Caused by: Error: getaddrinfo ENOTFOUND pin-probe.invalid
        plus 1 additional RED in spotlightImageDnsPin.test.mjs
        test files 2 failed (2) | tests 3 failed | 15 passed (18)

The first and third cases go RED because the NAME cannot resolve without the pin — which is the
property under test. The SECOND case ("a default Agent is DISTINGUISHABLE") correctly STAYS GREEN:
its job is to prove the two dispatchers differ, not to detect this mutation. A test that went RED
there would be asserting the wrong thing.

--- Mutation 2 — the pin set is order-rotated -------------------------------------------------
EDIT:  createPinnedLookup(addrs)
   ->  createPinnedLookup(addrs.slice(1).concat(addrs[0]))

FIRST RUN: ALL THREE TESTS GREEN. THE MUTATION SURVIVED.

That is a defect against the TEST, not against the source, and it is recorded rather than tidied
away. Root cause: every case in the file pinned a SINGLE address, and with one element there is
nothing to rotate — so the mutation was unreachable by construction, not by accident. The suite
looked mutation-proof while being structurally blind to an entire defect class.

FIX: a fourth case was added that pins TWO addresses (['127.0.0.2','127.0.0.1']) against two live
servers on one port, asserting the FIRST pinned address is the one connected to.

RE-RUN: 1 RED —
        AssertionError: expected 'served-by:127.0.0.1' to be 'served-by:127.0.0.2'
        test files 1 failed (1) | tests 1 failed | 3 passed (4)

The hole is closed. Baseline with the four cases and no mutation: 4 passed (4).

--- What this record does NOT claim -----------------------------------------------------------
- It does not claim the new test is now mutation-proof. It claims one demonstrated hole was closed.
- It does not claim mutation coverage of the SIBLING suites; only the two mutations above, and only
  against spotlightImageTransportPin.test.mjs (plus the collateral RED in dnsPin for mutation 1).
- The mutation surface is \`createPinnedDispatcher\` only. \`createPinnedLookup\` was not mutated
  directly in this session; it is the callee the two mutations above reach through.
\`\`\`

---

## §4 — Author-run measurements, labelled as such

Everything in this section was run by the AUTHOR on this machine, and you should treat it as an
unverified claim unless you can reproduce it — which, being shell-less, you cannot. It is reported
so you can judge whether it *would* have been sufficient, and to make it obvious which claims rest
on it.

| Measurement | Result |
|---|---|
| \`vitest run\` transportPin + dnsPin + lifecycle + admission | **4 files, 52 tests passed** |
| D3 mutation 1 — \`createPinnedDispatcher\` returns \`new Agent()\` (pin removed) | **2 of 4 RED** (\`getaddrinfo ENOTFOUND pin-probe.invalid\`) + 1 more RED in dnsPin |
| D3 mutation 2 — pin set rotated \`addrs.slice(1).concat(addrs[0])\` | **FIRST RUN: ALL GREEN — THE MUTATION SURVIVED** (see §3.5); after adding a two-address case: **1 RED** |
| D1 mutation — original ordering restored | **4 of 6 RED** |
| Classifier, post-fix, four round-8 inputs | \`":"\`→true, \`"8.8.8.999"\`→true, \`"0:0:0:0:0:0:0:1"\`→true, \`"::ffff:7f00:1"\`→true |
| \`bracketed\` literal \`https://[::ffff:0:127.0.0.1]/\` | now **REFUSED** (\`IMAGE_URL_NOT_ALLOWED\`) |
| ban #50 (no source file ≥ 300 lines) | 201 / 280 / 227 / 293 / 164 / 286 / 111 / 147 / 182 — all under |
| Source restored byte-identical after each mutation | \`6ec126d3c5529032…\`, \`git diff HEAD\` = 0 lines |

---

## §5 — What this packet cannot give you, and does not pretend to

- **You cannot re-run the mutations**, so C4/C6/C9 rest partly on an author-supplied record. The
  record is honest (it contains a failure) but it is still the author's.
- **You cannot measure the socket layer.** Round 8 correctly refused to inflate D4 from an
  admission-layer bypass to a socket-layer exploit. The same restraint applies to the fix: the new
  test shows the *pin* routes a socket, not that any particular address is unreachable.
- **The repo's object store is damaged.** 88 objects are missing, 18 links are broken, and 21
  cache-tree pointers are invalid. Two commits below may fail to render in full for that reason;
  where they do, it is stated rather than silently omitted.
- **C1's runtime half retains a residue.** The new transport test observes a real socket, which is
  stronger than round 8's position — but it observes it on THIS machine, with THIS Node and undici.
`;
}
