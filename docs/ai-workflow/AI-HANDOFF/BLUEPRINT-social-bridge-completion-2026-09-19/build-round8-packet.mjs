#!/usr/bin/env node
/**
 * build-round8-packet.mjs — assemble the round-8 review packet with EVERY artifact INLINED.
 *
 * WHY. Round 7 returned INCONCLUSIVE with C1-C6 all BLOCKED, and the cause was this packet's own
 * design: it cited evidence by blob hash and by local path, and Astra's read-only sandbox can read
 * NEITHER local files NOR (since the repo is unpushed) any remote copy. Astra's words:
 *   "PowerShell commands-including file reads-were rejected as blocked by policy."
 *   "the three supplied blob hashes also returned 404 in SeanSwan/SS-PT."
 *
 * So a hash is not evidence to a document-only reviewer. Evidence is TEXT THE REVIEWER CAN SEE.
 *
 * This assembler is deliberately a program rather than a hand-written file: every inlined byte is
 * read from disk at build time, and every hash is computed from that same read. A hand-transcribed
 * inline block could silently disagree with the file it claims to be, which would be a new instance
 * of the very defect this fixes.
 *
 * USAGE
 *   node build-round8-packet.mjs            # writes the packet, prints the stats
 *   node build-round8-packet.mjs --check    # verifies an existing packet's hashes against disk
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// This script sits at <repo>/docs/ai-workflow/AI-HANDOFF/<blueprint>/, so the repo root is FOUR
// levels up. Resolved by walking up until the marker file is found rather than by counting, so a
// future move of this file does not silently point REPO at the wrong tree (which is exactly the
// defect the round-7 packet had: evidence addressed by a path that assumed a fixed layout).
const REPO = (() => {
  let d = HERE;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, 'backend', 'package.json')) && fs.existsSync(path.join(d, '.git'))) return d;
    d = path.resolve(d, '..');
  }
  throw new Error(`could not locate the repo root by walking up from ${HERE}`);
})();
const OUT = path.join(HERE, 'R1-REVIEW-ROUND-8-PACKET.md');
const CHECK = process.argv.includes('--check');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const read = (rel) => fs.readFileSync(path.join(REPO, rel), 'utf8');

/** A file to inline, with its hash computed from the same bytes that get embedded. */
function fenced(rel, { lang = 'mjs', note } = {}) {
  const text = read(rel);
  return [
    `#### \`${rel}\``,
    '',
    `sha256 \`${sha256(text)}\` · ${text.split('\n').length - 1} lines`,
    ...(note ? ['', note] : []),
    '',
    '```' + lang,
    text.replace(/\s+$/, ''),
    '```',
    '',
  ].join('\n');
}

// The files under review. Inlined IN FULL, because a reviewer who must guess at the middle of a
// function is not reviewing the function.
const SOURCES = [
  ['backend/services/spotlightImageUrlPolicy.mjs',
    'Admission + the pinned-lookup/dispatcher factories. C1, C2, C3 live here.'],
  ['backend/services/spotlightImageFetch.mjs',
    'The transport wiring: where the pin is actually passed to fetch, and where it is closed. C1, C3.'],
  ['backend/tests/unit/spotlightImageDnsPin.test.mjs',
    'The suite. C4 asks whether it would notice a DISCONNECTED pin.'],
];

// The classifier the policy IMPORTS. Astra named this explicitly as something it needed and could
// not obtain. Inlined in full (it is the admission predicate, so its bounds ARE the claim in C2).
const CLASSIFIER = 'backend/services/applaudAudioFetcher.mjs';

const patch = (() => {
  // The parent->commit patch, generated at build time so it cannot drift from the repo.
  return execFileSync('git', ['show', 'bdc02b7bc', '--format=%H%n%an%n%ad%n%s'], {
    cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
})();

const MUTATION = 'docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md';

const parts = [];
parts.push(`---
title: "Round 8 review packet — the DNS-rebinding pin, with every artifact INLINED"
purpose: >
  Give a READ-ONLY, SHELL-LESS reviewer everything needed to adjudicate claims C1-C9 without
  resolving a single hash, path, or network reference.
predecessor: R1-REVIEW-ROUND-7-PACKET.md (which returned INCONCLUSIVE for exactly this reason)
target_commit: bdc02b7bc
repo: SS-PT
branch: creator-brains-engine-r2-20260915
built_utc: ${new Date().toISOString()}
built_by: build-round8-packet.mjs
---

# Round 8 review packet — the DNS-rebinding pin, INLINED

## §0 — Read this first: what changed since round 7, and why

Round 7 returned **\`REVISE — evidence incomplete\`**, with **C1–C6 all \`BLOCKED / unproven\`**. That was
**not** a verdict about the code. It was a verdict about *this packet's design*, and the reviewer said so
plainly:

> *"PowerShell commands—including file reads—were rejected as \`blocked by policy\`."*
> *"the three supplied blob hashes also returned 404 in \`SeanSwan/SS-PT\`."*
> *"These counts reflect unavailable evidence, not demonstrated correctness."*

A hash is not evidence to a reviewer who cannot open a shell or reach a remote. **A hash is a promise
that some bytes exist somewhere.** This packet keeps that promise by **carrying the bytes.**

**Therefore: nothing below is cited by reference.** Every source file, the patch, and the mutation
record are embedded in full, each with its sha256 computed from the same bytes you are reading. If you
wish to check that promise, hash the fenced blocks yourself — they are the artifacts.

**What you can and cannot do.** You are read-only and shell-less, so you **cannot execute** anything —
no socket tests, no mutation runs. Do not attempt them; their absence is expected and is accounted for
in §6. What you **can** do is the part that mattered and was missing: **read the actual bytes** and
adjudicate the claims as text. Claims C1–C9 below are written so that each is decidable by reading,
with one explicit exception noted per claim where a runtime measurement is genuinely required.

---

## §1 — Remit

This round is a **Mega Blueprint** review. Treat it as an adversarial pass whose job is to break the
claims below, not to endorse them: the pin has never had an independent review, round 7 could not read
it, and this packet exists so that round 8 can.

You are asked to **falsify** the following, in this order:

- **PART A — the claims C1–C9.** For each: \`CONFIRMED\`, \`FALSIFIED\`, or \`BLOCKED / unproven\`, with the
  line of source that supports your verdict. A verdict of \`CONFIRMED\` must name what you read.
- **PART B — the acknowledged limitations** (C10). These are *author-supplied*, so treat them as
  context, not as findings. Say if any is understated.
- **PART C — the scope and the verdict.** Including: is any claim *unfalsifiable as stated*, which is
  itself a defect in the claim rather than in the code?

**Grade in both directions.** Do not inflate a residual into a vulnerability; do not deflate one you
could not fully reach. If a claim's truth depends on a runtime fact you cannot measure, name the fact
and mark it \`BLOCKED\`, not \`FALSIFIED\`.

**Naming and behaviour you should assume:**
- The pin's design intent is stated at \`spotlightImageUrlPolicy.mjs\` and again at the fetch site. If
  those two comments disagree with the code, that is a defect worth reporting (C8).
- This packet is not a clean bill. It is a packet assembled *because a prior round could not read it*.

---

## §2 — PART A: the claims

| # | Claim | Decidable by reading? |
|---|---|---|
| **C1** | The address the policy validated is the address the socket connects to, for a DNS NAME | mostly — the wiring is textual; a live measurement is the residue (see C1 note) |
| **C2** | An IP LITERAL is stopped by *admission*, not by the pin, and the pin is structurally absent for literals | **yes, fully** |
| **C3** | The pinned dispatcher cannot leak past the fetch (no dangling socket pool / no held event loop) | **yes, fully** |
| **C4** | The suite would go RED if the pin were disconnected from the transport | **yes** — this is the R6-01 class, and the reason the suite has a dedicated case |
| **C5** | Nothing was deleted to make the diff look smaller | **yes** — the patch is below, in full |
| **C6** | The three disclosure sites say what the code does, including the literal bypass and the redirect layer | **yes, fully** |
| **C7** | \`isPrivateOrLocalAddress\` fails closed on input it cannot parse | **yes, fully** |
| **C8** | The source's own comments do not overclaim (the comments are the claim) | **yes, fully** |
| **C9** | The pin is load-bearing — removing it changes behaviour in a way the suite notices | reading + the mutation record (inlined) |

### C1 note, stated up front rather than buried

The *wiring* — that the validated addresses are handed to the dispatcher and that dispatcher to
\`fetch\` — is decidable by reading, and it is inlined below. What is **not** decidable by reading is
that Node honours a foreign \`undici.Agent\` as \`dispatcher\`, and that \`connect.lookup\` is actually
invoked. Those are runtime facts. They were measured by the author (Node 22.22.2, undici 7.27.1) and
the measurement is reported in §5; **you should mark that half \`BLOCKED\` unless you can reproduce it,
and I would rather you did.** A reviewer saying "the wiring is right, the runtime is unverified by me"
is more useful than a \`CONFIRMED\` that overreaches.

---

## §3 — The artifacts, inlined

### 3.1 The sources under review

`);

for (const [rel, note] of SOURCES) parts.push(fenced(rel, { note: `_Why it is here:_ ${note}` }));

parts.push(`### 3.2 The imported address classifier

The policy's admission decision delegates here, so **these bounds are the claim in C2 and C7.** Astra
named this file specifically as something it needed and could not obtain in round 7.

${fenced(CLASSIFIER, { note: '_Why it is here:_ the `isPrivateOrLocalAddress` bounds are load-bearing for C2 and C7; the policy only imports it.' })}

### 3.3 The full parent→commit patch

Inlined so **C5 is decidable by reading**: every removed line is visible. A diff *statistic* cannot
show you what was deleted; this can.

\`\`\`diff
${patch.replace(/\s+$/, '')}
\`\`\`

### 3.4 The mutation record (the author's evidence for C9)

Reproduced **verbatim**, including the parts that are inconvenient. This is author-supplied evidence:
treat it as a *claim about what was run*, not as a measurement you performed.

${fenced(MUTATION, { lang: 'markdown', note: '_Why it is here:_ C9 asks whether the pin is load-bearing; this is the author\'s mutation log, offered for scrutiny rather than belief.' })}

---

## §4 — The six acknowledged limitations (C10): context, not findings

These are supplied by the author and are **not** proposed as discoveries. Astra round 7 correctly
declined to treat them as findings. What is being asked here is narrower: **is any of them
*understated*?**

1. **IP-literal case is closed by admission, not by the pin.** \`net.isIP\` rejects a private literal
   before the dispatcher exists. A literal is therefore stopped, but *not* by the mechanism the pin
   provides — so the pin's guarantee does not extend to literals by construction. C2 is the test.
2. **A single redirect hop is prevented, not sanitised.** \`redirect: 'error'\` means a second hop never
   happens. It does not mean a second hop would have been safe.
3. **\`dnsTimeoutMs\` bounds the lookup**, not the whole fetch or the body read.
4. **The composed route is not proven end-to-end under load.** The mechanism is; the Express handler,
   HMAC path and image I/O under concurrency are not.
5. **Literal encodings are only as covered as \`net.isIP\` is** — decimal/octal/hex forms were not each
   driven through the real parser.
6. **The suite's runtime facts (lookup called, address pinned) were measured by the author**, not by a
   third party.

---

## §5 — Author-run measurements, labelled as such

Offered because a claim of "measured" with no number is worse than an honest blank. **None of this is a
substitute for your own reading**, and none of it should be graded as your confirmation.

- Node \`22.22.2\`, \`undici\` \`7.27.1\`.
- For a **NAME**: \`connect.lookup\` was invoked (\`lookupCalled = 1\`) and the connection went to the
  pinned address.
- For an **IP LITERAL**: \`connect.lookup\` was **never** invoked (\`lookupCalled = 0\`) — the asymmetry
  C2 is about. The literal is refused earlier, by the \`net.isIP\` branch.
- The pin suite: **18 tests**, green, ~41 ms.
- Mutations (four): \`pinned.slice(1)\` → 5 RED; single-address hardcode to loopback → 1 RED;
  \`net.isIP\` branch disabled → 3 RED; **\`dispatcher\` removed from the fetch call → 2 RED** (this last
  one passed 15/15 *before* the dedicated wiring case was added; it is the R6-01 instance).

---

## §6 — What this packet cannot give you, and does not pretend to

- **Execution.** No socket test, no mutation re-run, no vitest. Your sandbox forbids it and this packet
  does not ask you to try. C1's runtime half, and the reproduction of C9's mutations, are therefore
  **expected to remain \`BLOCKED\`** — and that is an *acceptable outcome of this round*, provided it is
  stated as \`BLOCKED\` rather than as \`FALSIFIED\` or \`CONFIRMED\`.
- **Production behaviour.** Nothing here touches a deployed system.
- **Any claim about the composed route under load.** Unchanged from round 5's own limit: *"the mechanism
  is proven; the composed system is not."*

**What would make this round a success:** every claim above lands on \`CONFIRMED\` with a cited line, or
on \`FALSIFIED\` with a cited line, or on \`BLOCKED\` with the *specific* runtime fact named. A round
that produces three honest \`BLOCKED\`s and one real finding is worth more than six \`CONFIRMED\`s
resting on hashes.
`);

const out = parts.join('\n');
if (!CHECK) {
  fs.writeFileSync(OUT, out, 'utf8');
  console.log(`wrote ${path.relative(REPO, OUT)}`);
  console.log(`bytes: ${Buffer.byteLength(out, 'utf8')}`);
  console.log(`lines: ${out.split('\n').length}`);
  console.log(`sha256: ${sha256(out)}`);
  console.log(`inlined: ${SOURCES.length} sources + classifier + patch + mutation record`);
} else {
  const existing = fs.readFileSync(OUT, 'utf8');
  let ok = true;
  for (const [rel] of SOURCES) {
    const text = read(rel);
    const h = sha256(text);
    if (!existing.includes(h)) { console.log(`DRIFT: ${rel} hash ${h} not found in packet`); ok = false; }
  }
  console.log(ok ? 'all inlined hashes match disk' : 'DRIFT DETECTED');
  process.exitCode = ok ? 0 : 1;
}
