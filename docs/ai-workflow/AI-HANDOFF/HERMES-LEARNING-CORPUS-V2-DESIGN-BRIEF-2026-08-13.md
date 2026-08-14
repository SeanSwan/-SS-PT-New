# Hermes learning corpus v2 — enterprise design brief, for hostile review

Sean asked to "take the learning packet to the next level, make it enterprise level." Before
designing, I measured. **The measurement reframes the request**, and that reframing is the first
thing I want attacked.

---

## 1. Measured state (this session, commands shown)

```
packets            : 18
total size         : 156 KB   (largest 16.5 KB)
span               : 2026-07-13 → 2026-08-13  (~5 weeks)
distinct frontmatter shapes across those 18 : 8
```

Field presence across the 18:

| field | present | | field | present |
|---|---|---|---|---|
| `originating_model` | **18/18** | | `status` | 6/18 |
| `date` | 15/18 | | `decision` | 5/18 |
| `topic` | 10/18 | | `supersedes` | 5/18 |
| `privacy` | 6/18 | | `tier_gate` / `tier_basis` | 4/18 |
| `surfaces` | 4/18 | | `reviewed_by` | 3/18 |
| `models_used` / `skills_touched` | **1/18** | | | |

Only the source-tier tag is universal. **Eight shapes for eighteen documents.**

### The finding that reframes the request

`rg 'hermes-learning-packets?'` → 24 files. Every executable hit is one of four `Stop` hooks
(`hermes-closeout-gate`, `dry-loop-gate`, `dual-tier-gate`, `linear-sync-gate`), and all four use it
the same way:

```js
const EMISSION_PATH_RE = /\.ai-workflow[\\/]hermes-inbox[\\/]pending[\\/]|hermes-learning-packets[\\/]/;
```

They detect **that a file was written to the path**. `hermes-closeout-gate` additionally reads the
file to validate one heading. That is **validation, not ingestion**.

**Nothing consumes the corpus as knowledge.** No script reads it, no index exists, the Pi daemon
read-list extension described in Rule 68 was never made, and `scripts/hermes-learning-append.mjs` —
proposed by the skill itself — **does not exist**, which is precisely why 18 packets have 8 shapes:
every one is hand-written from memory.

So the honest state is: **a write-only pile of 156 KB that Hermes has never read.** Adding richer
fields to it makes the pile better-formed, not more useful. I believe the enterprise gap is
**consumption, generation, and conformance — not schema richness** — and I want that thesis attacked
before I build on it.

### §1 SELF-CORRECTION — the above is overstated, and the true finding is sharper

Written before the review returned. **"Nothing consumes the corpus" is wrong**, and it is the ninth
instance this session of my narrow-check-as-general-finding class. I grepped `scripts/` and code
extensions, concluded absence, and generalised — the same error the whole prior packet documents.
**This one I caught myself**, which is the first time today.

What the wider search actually shows:

1. **`.ai-workflow/hermes-inbox/standing-context.md:88` points into the corpus** —
   `Full text: docs/ai-workflow/hermes-learning-packets/2026-07-13-coding-doctrine-cortex-safety-arc.md`.
   Hermes reads standing-context, so that packet IS reachable. A consumer exists; it is a
   hand-curated pointer. **It reaches 1 of 18 packets.**
2. **The inbox has a real automated consumer that the corpus does not.** Per
   `.ai-workflow/hermes-inbox/README.md`, desktop Hermes2 runs a `pre_llm_call` shell hook
   (`inbox-drain.py`, installed at `~/hermes2/.hermes/hooks/`) that **injects every `pending/*.md`
   into Hermes' next LLM call and auto-archives to `consumed/`** (8k chars/memo, 24k/injection).
   That is why `consumed/` holds 641 files. Delivery does not even require a commit — desktop Hermes
   reads the working tree over `/mnt/c/...`.

**The asymmetry is the actual enterprise finding, and it is backwards:**

| tier | intended lifespan | ingestion | reach |
|---|---|---|---|
| Inbox memo (Rule 69) | ephemeral, drained daily | **fully automated** (`pre_llm_call` hook) | **641 consumed** |
| Learning packet (Rule 68) | **durable, compounds forever** | **none** | **1 of 18** |

The throwaway tier is automatically delivered. The tier explicitly designed to accumulate permanent
lessons reaches Hermes only when a human hand-writes a pointer — so **17 of 18 permanent lessons are
written but unreachable.** Everything I shipped this session improved the *shape* of the tier that
does not get read.

**Scope limit, stated rather than hidden:** the Hermes2 daemon lives outside this repo
(WSL `~/hermes2/`), so I can prove what this repo contains and what its own protocol docs claim —
not what the daemon does at runtime. Verifying the hook's live behaviour requires the desktop, which
I have not touched.

This correction *strengthens* the thesis in §3: the gap is consumption, and the cheapest fix may be
far smaller than my proposal — the inbox already solved this problem with one hook.

---

## 2. What Sean asked for (already shipped this session)

Rule 68 amended (automatic trigger) and the skill's output contract rewritten to require
`models_used`, `skills_touched`, `## Who did what`, `## Skills created or changed`,
`## Error → fix → repeat ledger`, `## Mistakes I made`, `## External-model calibration`.
One exemplar packet backfilled. All pushed.

That is v1.5. It defines a good shape. It does not make the corpus readable, generated, or
conformant.

---

## 3. Proposed v2 (attack this)

**A. `scripts/hermes-learning-append.mjs` — the emitter.** Packets are *generated* from validated
input, never hand-typed. Kills shape drift at the source. Reuses `continuity-append.mjs` plumbing
(surface gate, two-layer sanitizer, atomic write) per the existing skill. Refuses to emit on
tier-gate failure or sanitizer hit.

**B. `scripts/hermes-learning-validate.mjs` — deterministic conformance.** Required frontmatter keys,
required literal headings (`## Mistakes I made` unnumbered — the gate matches literally and I broke
this today), tier allowlist, privacy scan, `supersedes` target exists. `--check` exits non-zero.
Wire into the existing `Stop` hook family so a malformed packet blocks the turn the way a missing one
already does.

**C. `docs/ai-workflow/hermes-learning-packets/INDEX.md` — generated, never hand-edited.** One row per
packet: date · decision · originating_model · models_used · skills_touched · status · source-SHA12.
Mirrors the Rule 72 Catalog contract exactly, including STALE detection when a source SHA drifts.
**This is what makes the corpus greppable instead of a pile**, and Rule 72 already forbids vector/RAG
for this job.

**D. Migration of the 18.** Backfill to one shape; mark unrecoverable fields `unknown` rather than
guessing. Never fabricate provenance — a wrong `originating_model` poisons the tier gate.

**E. Actual ingestion.** Extend the proven Pi daemon read-list to the INDEX (not the 156 KB of
bodies), so Hermes reads a bounded summary and pulls a body on demand. Rule 68 says extend that path,
never invent transport — but the Pi is **SSD-power BLOCKED**, so this step may be undeliverable today
and the design must degrade gracefully.

**F. Derived value the shape now permits** — a **model routing table** computed from `models_used`
(which model, which role, which task class, findings real vs disproven, cost) and a **recurrence
report** computed from the repeat ledgers (which error classes recur across sessions, not just
within one). Both generated, never asserted.

---

## 4. Attack these specifically

1. **Is "no consumer" the real gap, or am I inventing infrastructure?** Counter-case: 18 packets over
   5 weeks is small enough that a human or agent can `rg` the directory directly, and an INDEX plus
   two scripts is ceremony for a folder you can read end-to-end in twenty minutes. **Where is the
   crossover point** at which generation and indexing earn their cost?
2. **Does an emitter actually kill drift, or relocate it?** Hand-written packets drifted into 8
   shapes. A generator has its own version history — is that better, or a new drift surface with a
   worse failure mode (silently wrong shape rather than visibly odd)?
3. **Enterprise usually means retention, access control, audit, and versioning.** This corpus is
   committed to a git repo that was public until April and holds a credential-remediation history.
   **Is a committed markdown corpus the wrong substrate for something meant to accumulate for
   years** — and if so, what should replace it, given Rule 72 forbids vector/RAG and Rule 68 forbids
   new transports?
4. **The derived routing table (F) is the highest-value item and the most fragile.** It is computed
   from self-reported fields written by the same model whose performance it measures. **What stops it
   becoming a model grading itself?** Is there a version of this worth building at all?
5. **What am I not proposing that an enterprise design would demand?** Absence-first: name what is
   missing, ranked by value left on the table.
6. **Ordering.** If Sean builds only ONE of A–F this month, which one, and why that one first?

## 5. Standing context the reviewer needs

- Author is `claude-opus-5`, Fable-tier by Sean's designation 2026-08-10 — authorised to write the
  corpus.
- This same author has been caught **eight times this session** citing a narrow check as a general
  finding. Assume that rate here; the measurement in §1 is the most likely place for it.
- Rule 72 forbids vector/embedding/RAG for lookup and mandates generated-markdown catalogs.
- Rule 68 forbids inventing a new Hermes transport.
- The Pi is SSD-power BLOCKED; anything requiring it cannot ship now.
- Privacy: corpus is committed — IDs/roles only, no PII, no secrets, no absolute paths.
