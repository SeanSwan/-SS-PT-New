---
decision: "privacy-boundary@1.2.0 - the admission schema P1 actually applies (6.1), the transcript/admission-record split and the record's producer contract (6.1a), and why a detector invocation is not the release predicate (6.2)."
status: open
supersedes: "03c-release-predicate.md sections 6.1/6.1a/6.2 - extracted in round 7 when 03c reached 353 lines against the 300-line cap"
---

# 03e — The admission schema

**Why this file exists.** Round 7 measured **`03c-release-predicate.md` at 353 lines against the 300-line
cap** (`06-bans.md` section 1, by `wc -l`). The breach was created by round 7's own fixes — the **R7-04
producer contract** added to 6.1a — and it went unnoticed for the reason section 8 of `03c` now records:
that section had been rewritten to *refuse* to state a size, and refusing to measure is not staying small.
Sections 6.1, 6.1a and 6.2 are extracted here. **Nothing was deleted and the section numbers did not move.**

**This file carries the same contract id, `privacy-boundary@1.2.0`, and draws no boundary of its own.** The
release predicate itself — what "privacy is established" means, and the provenance classes U/O/P it turns on
- is **`03c-release-predicate.md` section 6**. The gate and its placement are
**`03b-privacy-boundary.md` sections 2-4 and 8-9**; failure propagation is **`03f-absorber-chain.md`**. The context channels are
**`03d-context-channels.md`**. This file is the **schema**: which inputs are admissible, in what
representation, and how a turn comes to be replayable.

---

### 6.1 Admission — the schema P1 actually applies (R4-01, corrected in round 5 by R5-01)

Round-4 **R4-01** found the original §6.1 **contradictory, and therefore not a predicate**: it admitted
free-text fields *and* required a name that passes the detector to be blocked. Both cannot hold.

**Round-5 R5-01 found the correction still contradictory across turns.** The rule admitted `previousContext`
turns "in which each `content` was itself an admitted `message`", while `03b` §8 assertion 4 requires a name
in **any** context channel to be **rejected**. So a name the user typed — admitted in `message` — becomes
forbidden when that same message is replayed as context. **The rule forbade its own input.** Astra's sharper
formulation: **`{role, content}` proves *shape*, not *prior admission*.** A caller can supply a
well-shaped array containing anything.

**Resolution — the caller does not supply `previousContext` at all.**

| Input class | Admissible representation | Otherwise |
|---|---|---|
| `message` | the user's own composed text for **this** submission — the one field whose payload is intentionally free text (**U**) | — |
| `previousContext` | **server-held ADMISSION RECORD, referenced by conversation id** — **not** the human-facing transcript (see §6.1a). A caller-supplied array is **not admissible in any form** | **rejected.** Today it is typed `unknown` and interpolated verbatim (`intentClassifier.mjs:122`), so an arbitrary object is stringified into the prompt — the R2-01 channel |
| `routeContext` | **only** the seven typed fields of `03d` §7.1, each mapped to an approved representation | **rejected as free text.** The token gate is *not* an admission schema — it admits `123-45-6789` and a bare name |
| client / entity reference | a **registry numeric id** | rejected — never a display name |
| date | `YYYY-MM-DD` — **admitted by context, not by detection** (round-6 **R6-06**; see `03d` §7.1) | rejected |
| count / credit | a **finite integer in range** | rejected |
| enumerated field (surface, intent, source, role) | a value from the **approved enumeration** | rejected |
| template (**O**) | **static bytes only**, hashed against the approved versioned registry (§6.0); **every interpolation input is admitted and scanned separately before substitution** | rejected — an unversioned, unapproved or hash-mismatched template is a rejection, not a default |
| histories, retrieved notes, diagnoses, route text as prose | **not admissible** | rejected |

**Why id-reference rather than validation.** Validating a caller array against the server's record is
possible but strictly weaker: it requires the boundary to re-derive "was this turn admitted?" on every
request, and it leaves the array in the request surface. Id-reference makes the question unaskable — the
caller cannot express an unadmitted turn, because the caller cannot express a turn at all. This closes
**C5**'s R2-01 exposure **at the request surface**.

#### 6.1a "Server-held" is NOT "admitted" — round-6 R6-03

**Round 5 claimed id-reference closes replay *"by construction."* That claim was false, and the shipped
storage code refutes it.** `aiChatRoutes.mjs:754-757` states its own behaviour:

```js
// Store the ORIGINAL user message in conversation history (trainer sees what they typed)
// but the AI only ever saw the sanitized version
const userMsg = { role: 'user', content: message.trim(), timestamp: now };
const assistantMsg = { role: 'assistant', content: aiContent, timestamp: ... };
```

**The stored transcript is the ORIGINAL, un-sanitized text — deliberately, so the trainer sees what they
typed — while the provider saw a sanitized version.** So the server's transcript is **not** the admitted
content, and replaying it would re-send precisely the text the sanitizer removed. **Storage is not admission
evidence.** The same block also stores **assistant-generated** text, which had no class in the U/O/P model
at all.

**Two stores, never one:**

| Store | Holds | Replayable to a provider? |
|---|---|---|
| **Transcript** (human-facing) | the ORIGINAL user text and assistant output, for the trainer's UI | **NEVER** |
| **Admission record** | per turn: the **admitted representation**, the admission-policy version, the actor + conversation binding, and the template/version identifiers used | **the only replayable source** |

**Assistant turns are P, not U.** They are model-generated, so they are admissible for replay **only** after
being re-scanned as pipeline content on **every** send — never inherited as previously admitted. A turn whose
provenance cannot be resolved from the admission record is **rejected**, not replayed.

**Required tests, replacing the single "replay works" case:** admitted replay; **unproven stored history must
be REFUSED**; legacy records written before the admission record existed must be refused or migrated **by
name**; a foreign conversation id must be refused; and a policy-version change must invalidate the record.
**Moving storage server-side proves none of these properties** — it only removes the caller from the
question.

**Round-7 R7-04: the record has no PRODUCER contract, and a store specified only on read is not specified.**
Everything above states what the record **holds** and how it is **read**. Nothing states how it comes to
exist. A replay mechanism whose write path is unspecified has no defined behaviour, and every failure mode
here is on the **write** side:

| Obligation | Must specify |
|---|---|
| **Creation** | the exact moment a turn becomes replayable — at admission, at provider success, or at transcript commit. These are three different records, and the choice decides whether a refused turn can be replayed |
| **Immutability** | the admitted bytes are frozen at creation; a later edit to the transcript must not alter the record |
| **Turn identity** | how a turn is named, so a replay references a specific admitted turn rather than a position in a list |
| **Assistant insertion** | when a model-generated turn is admitted (it is **P** and re-scanned per send) and what is stored for it |
| **Publication ordering** | the record must be visible to a replay that immediately follows the turn it records. A write that lands after the next request is a replay of an unadmitted turn |
| **Persistence failure** | if the write fails the turn is **not** replayable. **Fail closed** — never fall back to the transcript, which is the un-sanitized original (§6.1a) |
| **Duplicate / interrupted submission** | a client retry, or a request that dies mid-write, must not yield two records for one turn or a record with no turn |

**Required tests, adding to the list above:** a write failure ⇒ the turn is **not** replayable; a duplicate
submission ⇒ **one** record; an interrupted write ⇒ **no partial** record; and a record whose admitted bytes
differ from the transcript ⇒ the **transcript is not used**.

- **A name in `message` is the user's own authored content and is outside this boundary's purpose.** A name
  arriving through any **context** channel is a **rejection**, because those channels are projected or
  server-reconstructed — not scanned-and-hoped. **This is now consistent with `03b` §8 assertion 4:** a
  replayed turn is not a name "injected into a context channel", it is a turn the server itself recorded and
  re-emits as **U**, under its original admission. The two rules no longer collide, because replay is no
  longer a caller-supplied channel.
- **An unmapped channel is out of domain, not assumed clean.** C7 and C1 are currently unmapped
  (`03-contracts.md` §4.2), so input from them is **rejected** pending mapping.
- **No admissible representation means local clarification or explicit unavailability** — never an automatic
  provider fallback, and never "send it and let the scanner decide."

### 6.2 A successful detector invocation is NOT the release predicate

It is **P3 alone**, over a detector with a known blind spot, and it says nothing about P1, P2, P2b or P4.
Concretely: today `scanForPHI('log a workout for Jordan T., knee felt bad')` returns `hasPHI: false`, so P3
alone would license sending a body containing a full name. **The predicate is the conjunction, and P1 carries
the weight the detector cannot.**

**And symmetrically — round 5:** a *failed* detector invocation is also not the predicate. A fuzzy hit inside
an operator-authored segment is a P3 failure **only** under the uncalibrated whole-body reading (§6.0). The
predicate is the conjunction, in both directions.

`[PROPOSED]` — this predicate is a **design decision, not a measurement.** It is written to be falsifiable
by `03b` §8; it has not been implemented or exercised.
