# R1 REVIEW — ROUND 7 PACKET — the DNS-rebinding pin, AS COMMITTED

## §0. Read this first

**Mandate:** Mega Blueprint. PART A is the deliverable. This is an adversarial review of
SHIPPED code, not a design consultation.

**The three parts you are being asked for:**
- **PART A** — the adversarial findings against commit `bdc02b7bc`, each with severity, file, the
  claim it falsifies, and the observation that falsified it. **This is the deliverable.**
- **PART B** — what the author already knows is weak (§3). Do not rediscover these; attack past them.
- **PART C** — scope and verdict format (§4). `PASS` / `REVISE` / `FAIL`, with the
  `unproven`-vs-defect distinction respected.

**This is round 7 of a linked chain, not a fresh review.**

| Round | Reviewer | Reviewed | Verdict | Filed at |
|---|---|---|---|---|
| 3 | workbuddy / deepseek-v4.1-flash | the uncommitted SSRF / href delta | DEFECTS-FOUND 0/2/1/2 | `2026-09-20-171602-social-bridge-image-rehost-ssrf-hardening-and.md` |
| 5 | astra | the remediation commit `b4ea7968f` | DEFECTS-FOUND 0/4/4/0 | `2026-09-20-183733-social-bridge-r1-remediation-round-5-astra.md` |
| 6 | astra | the R5-08 suite split | REVISE 0/0/2/1 | `2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md` |
| **7 (this)** | **astra** | **the DNS-rebinding pin, commit `bdc02b7bc`** | **yours to decide** | — |

**Why this round exists at all.** The DNS-rebinding TOCTOU was **found and left open**. Round 3
recorded it and stated it *did not build a rebinding resolver*. Round 5 carried `dns-rebinding` in its
tags as one of its four HIGH findings. Rounds 5 and 6 reviewed other things. Commit `bdc02b7bc` claims
to close it at the connect boundary — a **new control that no round has ever tested**.

**Your job, per Rule 86:** attack the claim, not the code alone. The claim is that the validated
address is now the connected address. A control that *looks* closed but is bypassable is the
highest-value thing you can produce this round. A control you confirm closed should be marked closed
with the specific mechanism named.

**Do not trust the commit message.** It was written before this round, by the author of the change.
Treat it as a claim under test, not as context. §5 lists six things the author already knows are weak
— start there, then go past it.

**Execution, if you have it, is worth more than reading.** The pin is a *behavioural* claim about
sockets. If Node or Bash is denied to you, say so plainly and mark those items BLOCKED — do not
report a read-only session as a clean pass. Rounds 2 and 5 both hit `Access is denied`; round 5 still
produced findings by reasoning over packet-derived JavaScript in its own runtime.

---

## §1. The change under review

- **Revision:** `bdc02b7bc8ff6f92c13903a5d2c9e75a18539b25`
- **Commit subject:** fix(security): close the DNS-rebinding TOCTOU at the connect boundary
- **Branch:** creator-brains-engine-r2-20260915 · **Repo:** SS-PT
- **Round-5 target:** `b4ea7968f` — ancestor of this revision: **YES**
- **Authored by:** the session that wrote it (workbuddy / deepseek-v4.1-flash), not a separate seat.
  Weigh that: the fix and its tests share an author, which is exactly the condition under which a
  suite proves the author's intent rather than the code's behaviour. Round 6 caught this author once
  already (R6-01: a suite that stayed green when the feature was deleted).
- **Runtime for all claims:** node v22.22.2, `undici` 7.27.1

### §1.1 Commit stat

```
 bdc02b7bc8ff6f92c13903a5d2c9e75a18539b25
 backend/services/spotlightImageFetch.mjs           |  30 ++-
 backend/services/spotlightImageUrlPolicy.mjs       | 109 +++++++-
 backend/tests/unit/spotlightImageDnsPin.test.mjs   | 289 +++++++++++++++++++++
 docs/.../04-build-order.md                         |  24 +-
 docs/.../CORRECTIONS-APPLIED.md                    |   8 +
 docs/.../VERIFICATION-NOTES.md                     |   9 +-
 6 files changed, 453 insertions(+), 16 deletions(-)
```

### §1.2 The defect, stated precisely

`spotlightImageUrlPolicy.mjs` resolved a curator-supplied image host, rejected private addresses, and
then executed `return incoming;` — **it discarded the addresses it had just validated.**
`spotlightImageFetch.mjs` then called `fetch()` **with no dispatcher**, so the transport resolved the
same name a second, independent time. A name answering publicly on lookup #1 and privately on lookup
#2 reached an internal address despite having been "checked". The code commented the gap honestly;
the comment was not a control.

---

## §2. PART A — the deliverable

Adversarial findings against commit `bdc02b7bc`. For each: severity, the file and blob, the claim it
falsifies, and the observation that falsified it. If you could not execute, mark it `unproven` and
say what measurement would settle it.

### Claims to falsify

**C1 — "The validated address is now the connected address."**
`resolveAndValidate` returns `{ url, addrs }`; `createPinnedDispatcher(addrs)` builds an
`undici.Agent` whose `connect.lookup` answers from `addrs`; `fetchSpotlightImage` passes it as
`dispatcher`.
- Is there ANY path from `fetchSpotlightImage` to a socket where the dispatcher is absent, ignored, or
  shadowed? Consider the injectable `fetchImpl`, redirects, HTTP/2, proxy env vars
  (`HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY`), and any DNS layer below `undici`.
- Does passing `dispatcher` to `globalThis.fetch` have any documented caveat when the agent comes from
  a *different* undici copy than the one Node bundles? The author measured it working on this exact
  runtime; that measurement is a claim to test, not a fact.

**C2 — "The IP-literal case is closed by admission, not by the pin."**
Deliberately narrower than "the pin covers everything". A literal host short-circuits `net`'s
resolution, so `connect.lookup` is never called; the literal is validated directly in
`resolveAndValidate` through a `net.isIP` branch, against the imported `isPrivateOrLocalAddress` table.
- Enumerate literal spellings that `net.isIP` does NOT recognise but a resolver or a connect DOES
  respect: dotted-octal (`0177.0.0.1`), bare decimal (`2130706433`), hex (`0x7f000001`),
  IPv4-mapped IPv6 (`[::ffff:127.0.0.1]`), trailing-dot, leading/trailing whitespace, percent-encoding.
  Round 3 threw 16 encodings at the *guard*; the question here is whether any reaches the connect path
  **without** passing the `net.isIP` branch AND without being resolved as a NAME through the pin.
- If one does, the correct finding is that C2 is false, not that the pin is weak.

**C3 — "Closing the dispatcher cannot leak or hang the process."**
The agent is closed in a `finally`.
- Can `close()` be reached with a request still in flight, and does `close()` — as distinct from
  `destroy()` — actually release a socket that is mid-connect? An `Agent` holds the event loop open;
  a leaked one is a process that never exits.
- Is there a path where `dispatcher` is constructed and then an exception escapes **before** the
  `try` that owns the `finally`? Read the actual control flow, not the intent.

**C4 — "The suite would notice if the pin stopped being wired."**
This claim has the most evidence and the most reason to distrust it: **mutation 1 originally PASSED
all 15 then-existing tests.** The wiring assertion was added afterwards.
- Is "`init.dispatcher` is defined and has a `close` method" sufficient? Could a *real but unpinned*
  dispatcher — `new Agent()` with default options — satisfy it and leave the suite green?
- The second assertion reaches `connect.lookup` through `Symbol(options)`. Is that testing the
  shipped wiring, or testing undici internals in a way that will drift silently on an upgrade?
- Reproduce mutations 2–4 from the mutation record and say whether each still goes RED.

**C5 — "No assertion and no shipped control was deleted."**
`bdc02b7bc` is +453/−16: 10 deletions in the policy file, 3 in the fetch file. The claim is that these
are superseded comments and the replaced function body only. Verify byte-level.

**C6 — "The disclosure sites no longer overclaim."**
Four sites changed from "open, accepted residual" to closed. Is any REMAINING site — in code comments,
blueprint docs, or elsewhere in the repo — still asserting the old state, or newly asserting something
*stronger* than C1/C2 support? The historical `R1-*-PACKET.md` files were deliberately **not** edited;
say whether leaving them is correct or is itself a stale-claim defect.

---

## §3. PART B — what the author already knows is weak

Do not spend the round rediscovering these; attack past them.

1. **Mutation 1 passed the whole suite.** The first suite proved the pin's *factories* worked and
   proved nothing about the *wiring*. Fixed — but it is evidence the suite's shape was wrong once.
2. **No real rebinding attack was executed.** No hostile DNS server that flips an answer between two
   lookups was stood up end to end. The pin is proved at the `connect.lookup` boundary and against
   real loopback sockets. **If you can construct a genuine rebinding resolver attack, that is the
   single highest-value thing in this round.**
3. **No IPv6 connect was exercised end to end** — the IPv6 case is asserted at the hook's return value
   only.
4. **`Symbol(options)` is reached into** in one assertion (undici internals; may drift).
5. **The `dnsTimeoutMs` bound was not re-verified in this round.** It predates the commit; confirm that
   claim rather than accepting it.
6. **The frontend/console workstream was not examined.**

---

## §4. PART C — scope and verdict

**In scope:** commit `bdc02b7bc` — its six blobs, and the tests and mutation record it ships.

**Out of scope:** live PostgreSQL and any concurrency guarantee (R5-03/R5-04 remain `[UNKNOWN]`); the
deployed runtime; migrations; the SwanGuard-Newsroom repo; the frontend console.

**Verdict format:** `PASS` / `REVISE` / `FAIL`, defects counted by severity (critical/high/medium/low),
each finding naming a file, a line or blob, and a falsifying observation. If a claim is **unproven**
rather than false, say `unproven` and say what measurement would settle it. **Do not upgrade an
unproven claim to a defect, and do not downgrade a defect to unproven** — that distinction is the one
round 5 was explicitly graded on.

---

## §5. Supplied evidence — verify it, do not trust it

- **Mutation record** (four mutations, each with its restore SHA-256):
  `docs/ai-workflow/AI-HANDOFF/BLUEPRINT-social-bridge-completion-2026-09-19/DNS-PIN-MUTATION-RECORD-2026-09-21.md`
- **Test counts:** `spotlightImageDnsPin` 18, `spotlightImageFetch` 22, `bridgeSpotlightImage.security`
  8, `spotlightImageDecode` 13 = **61/61**.
- **Full blob captures**, taken from the commit (not the worktree), in this directory:
  `.round7-capture-spotlightImageUrlPolicy.mjs`,
  `.round7-capture-spotlightImageFetch.mjs`,
  `.round7-capture-spotlightImageDnsPin.test.mjs`.
- **The measured asymmetry** — reproduce it: a NAME gives `lookupCalled = 1`; an IP-literal gives
  `lookupCalled = 0` and the request reaches a loopback server *despite a pin*.

### Blob hashes (pin these)

| blob | file |
|---|---|
| `0976f838deed2c081509a214945302683aee66f5` | `backend/services/spotlightImageUrlPolicy.mjs` |
| `286a4ecc9f37ae1e9579fa678bb7274019fc4ef5` | `backend/services/spotlightImageFetch.mjs` |
| `be8b299ab4e6a154859c748ebde09cc9c5bedc50` | `backend/tests/unit/spotlightImageDnsPin.test.mjs` |

---

## §6. Dispatch log — ATTEMPTED, BLOCKED on credential

The packet passes all three dispatch gates. The transport was attempted twice and **failed on
authentication, not on the packet**:

| attempt | result | reason |
|---|---|---|
| 1 | `rc=3` | **gate refusal** — `CONTRACT INCOMPLETE: remit is missing 'PART B'`. Correct behaviour: the guard checks the *remit* region (§0–§1), and PART B/PART C were only named in the section headings later in the document. Fixed by naming all three parts in §0. This was my packet defect, not a guard defect. |
| 2 | `rc=1` in 8s | **transport 401** — `token_revoked` / `refresh_token_invalidated` |

Reachable from attempt 2's output (`C:/tmp/astra-r7.jsonl`):

```
ERROR codex_models_manager::manager: failed to refresh available models:
  unexpected status 401 Unauthorized: Encountered invalidated oauth token for user
  ... auth error code: token_revoked
ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket:
  HTTP error: 401 Unauthorized, url: wss://chatgpt.com/backend-api/codex/responses
codex_login::auth::manager: Failed to refresh token:
  "Your session has ended. Please log in again."
{"type":"error","message":"Your access token could not be refreshed because your refresh
  token was revoked. Please log out and sign in again."}
```

**Independently confirmed machine-wide, not packet-specific:** a trivial prompt
(`reply with exactly: OK`) through the same transport returns the identical
`refresh token was revoked` failure. Nothing on this machine can reach Astra until the
operator re-authenticates:

```
codex logout  &&  codex login      # interactive; the operator must do this
```

**Status of round 7: NOT RUN. `unproven`, not `clean`.** The packet is ready and gate-verified;
the dispatch script is `C:/tmp/dispatch-astra-round-7.sh`; the run will take ~10–13 min and ~$0 on the
subscription once authenticated. Re-run it verbatim after login — no packet changes are needed.
Until then, the DNS-rebinding pin carries **no independent review**, and this file says so rather than
implying a review happened.

### §6.1 Every alternative transport was surveyed, so this is not re-derived

Round 7 does not run because **no reviewer transport on this machine is currently reachable.** All
four were probed on 2026-09-21 15:44–15:46, each with a trivial prompt, not assumed:

| transport | probe result | disposition |
|---|---|---|
| `codex` (Astra, gpt-6-astra) | `401 token_revoked` / `refresh_token_invalidated` | **operator action**: `codex logout && codex login` |
| `claude` (2.1.259) | sandbox **program blacklist** — `reg.exe` blocked; *"This block cannot be approved or bypassed"*. Also: *"this workspace has not been trusted"* | **obstacle, not a bug.** Do NOT route around it — the block message explicitly forbids retrying via another shell or script. Needs the operator to change Security Center → Command Security, and to accept the trust dialog interactively. |
| `gemini` (0.54.4) | `UNSUPPORTED_CLIENT` — *"This client is no longer supported for Gemini Code Assist for individuals… migrate to the Antigravity suite"* | **account migration required.** Not fixable from a session. Also blocked by the untrusted-directory guard. |
| `gh` | *"You are not logged into any GitHub hosts"* | no credential |
| `ollama` (0.34.2) | *"Failed to start: Unable to set icon: Access is denied"* → `Error: timed out waiting for server to start` | **cannot start** in this sandbox |

**What this means for the record.** The pin is fixed, committed, and mutation-tested by its author —
and it has **no independent review**. That is a weaker evidentiary state than "reviewed clean", and the
distinction is deliberate: `unproven` is not `clean`. A future agent must **not** read this slice as
verified. The cheapest path to closing it is `codex login`; nothing else here needs to change.

**A substitute review was deliberately NOT manufactured.** A self-review by the same seat that wrote
the fix, filed under Rule 86, would produce a document that *looks* like an independent review while
sharing its author's blind spots — the exact failure this archive exists to prevent, and the same
class as R6-01 (a suite that passed when the feature was deleted). Better an honest `unproven` than a
verdict that borrows authority it does not have.

### §6.2 The PostgreSQL path was also attempted, and is also blocked

The highest-value unblocked work while round 7 waits is the **R5-03 / R5-04 `[UNKNOWN]`** — the
module's own docblock at `bridgeSpotlightRevisionApply.mjs:35-38` states the limit exactly:

> *"NOT established here, and not claimed: that two concurrent applies on a live PostgreSQL
> serialize correctly. That needs a real database; the contract suite mocks the model, so it proves
> the predicate is constructed and the branch is taken, never that Postgres honours it."*

A real PostgreSQL **is** present on this machine (four containers were running: `swan-dev-pg:5433`,
`swanguard-newsroom-postgres-1:5434`, `swan-coach-verify-55512`, `swan-coach-owned-20260921`). It was
**not used**, for two reasons, both recorded so they are not re-litigated:

1. **The existing containers belong to active peer sessions.** `swan-coach-verify-55512` was 25
   minutes old and `swan-dev-pg` appeared mid-session; my own notes carry the rule *"a frozen
   predecessor does not make a lane free."* Inspecting another seat's container environment was
   attempted and **not approved** — correctly, since that is the "do not step on other agents' toes"
   boundary from the standing constraints.
2. **Standing up my own container was started and then removed.** `r7-dns-pin-pg` on port 55520 (a
   verified-free port, distinct from all four peers) **did start** (`Up 6 seconds`). The follow-up
   `psql` connection to it was **not approved**, and the attempts to inspect were also not approved —
   three consecutive `SENSITIVE_APPROVAL=TIMED_OUT` results across `docker inspect`, `docker run`, and
   the connect. **I stopped pushing against a blocked approval path** rather than retrying, and removed
   the container (`docker rm -f`, confirmed gone) so no stray state was left behind.

**So R5-03/R5-04 remain `[UNKNOWN]`, now for a named reason:** not "nobody tried", but "the live-DB
connection could not be authorised in this session." The work needed is unchanged and small — a
two-connection interleaving harness against a real PG, asserting that the `WHERE revision < ?`
predicate serializes. If approvals are available, that is the next slice; it is worth more than the
round-7 packet because it closes a stated gap in the product rather than a gap in the review record.

> ### ⚠️ CORRECTION, same day — read this before quoting the paragraph above
>
> The sentence *"R5-03/R5-04 remain `[UNKNOWN]`"* was written from the blocker outward and is **too
> broad.** The Rule 86 archive was read afterwards, and it holds a prior verdict this packet should
> have started from:
>
> **`WHERE revision < ?` was already proven against a real PostgreSQL 17 on 2026-09-20**, with a
> load-bearing A/B control (`rowCount=0` for the stale write; drop the `WHERE` and the row regresses
> to `3`). Source: `Z:\HostileReviews\2026-09-20-181511-social-bridge-d7-d8-d9-closed-the-ban-50-split.md`;
> harness still on disk at `C:/tmp/sspt-race-proof.mjs`.
>
> What is genuinely **not** proven is narrower, and reading the harness produced it: **Claim 1 in that
> harness is single-connection** — it opens one client and issues sequential queries, so its
> "interleaving" is a sequence, not a race. Claim 2 does use two connections; Claim 1 does not. So:
>
> | proposition | status |
> |---|---|
> | Postgres refuses a stale revision via `WHERE revision < ?`, as a single-statement fact | ✅ proven live, with control |
> | the `WHERE` is load-bearing | ✅ proven live |
> | two **concurrent connections** racing that predicate serialize | ⚠️ **not proven** — no second connection was ever opened on this statement |
> | R5-03's sentinel / R5-04's attachment under real contention | ⚠️ not exercised live (the sentinel logic itself is confirmed at mock level — see below) |
>
> **A separate confirmation worth recording:** Astra round 6
> (`Z:\HostileReviews\2026-09-21-142804-social-bridge-r1-round-6-r5-08-split-and-r5-03.md`) states
> *"R5-03 meaningfully asserts column omission, explicit clearing, and insert initialization"* — an
> **independent** corroboration of the sentinel logic by a seat that did not write it. The same
> finding adds *"its purported newer-image case adds no interleaving: `B` is never injected"* — which
> remains true: the tests added on 2026-09-21 assert payload shape on a happy path and do **not** inject
> the second writer either.
>
> Full correction, with the reasoning for why the paragraph above was wrong:
> `R5-03-R5-04-STATUS-CORRECTION-2026-09-21.md` in this directory.

