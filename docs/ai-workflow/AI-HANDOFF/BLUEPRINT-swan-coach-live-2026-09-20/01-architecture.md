---
decision: "Capture, consumption and send are three separately-bound stages; the draft never auto-crosses a trust boundary."
status: open
supersedes: none
---

# 01 — Architecture

## 1. Component tree (M1 scope in **bold**)

```
CoachCommandCenterPage.tsx                      [SUPPLIED] mounted, 3 roles
└── CoachConsoleDock.tsx                        [SUPPLIED] owns the composer
    ├── <textarea> commandText / commandTextRef [SUPPLIED] authoritative composer node
    ├── dock-mic  → onVoice()                   [SUPPLIED] SHORT-COMMAND capture owner
    ├── **CoachFreestyleControl.tsx**           [PROPOSED] LONG-FORM capture owner
    │   ├── **useCoachFreestyleDraft.ts**       [PROPOSED] the S4 consumer
    │   └── CoachFreestyleOverlay.tsx           [SUPPLIED] always mounted, isOpen toggles
    │       ├── useFreestyleSession.ts          [SUPPLIED] buffer + ownership mask + purges
    │       └── useFreestyleSpeech.ts           [SUPPLIED] Web Speech API
    └── VoiceRecordingOverlay.tsx               [SUPPLIED] short-command overlay
```

## 2. The three trust boundaries

```mermaid
flowchart LR
  subgraph DEV["B0 · Device"]
    MIC[Microphone]
    COMP[Composer textarea]
  end
  subgraph RECOG["B1 · Recogniser — MAY BE REMOTE"]
    WSA[Web Speech API]
  end
  subgraph SRV["B2 · SwanStudios server"]
    API["/api/ai-chat · /api/coach/*"]
    DB[(Client records)]
  end
  subgraph PROV["B3 · Model provider"]
    LLM[LLM]
  end
  MIC -->|audio| WSA
  WSA -->|transcript| COMP
  COMP -.->|M1 STOPS HERE| COMP
  COMP -->|MESSAGE_SEND, human-initiated| API
  API -->|allowlisted fields only| LLM
  API -->|only with a valid grant| DB
  classDef danger fill:#3a1020,stroke:#ff6b6b,color:#fff
  class RECOG,PROV danger
```

**B1 is the finding most likely to be missed.** `useFreestyleSpeech` uses the Web Speech API. The
overlay's own header states this is a *transport* choice, not a privacy guarantee: **on Chrome the
recogniser is cloud-backed** `[SUPPLIED]`. Dictated audio — a coach saying real client names aloud —
therefore leaves the device **before any SwanStudios code executes**. No downstream redaction can
undo that. This is an unresolved owner decision, not a solved problem (PART C, D-1).

## 3. M1 dataflow

```mermaid
flowchart TD
  A[Coach taps Just talk] --> B{Capture lock free?}
  B -->|No, mic active| B1[Refuse · toast · no state change]
  B -->|Yes| C[Acquire lock · open overlay]
  C --> D[useFreestyleSession listening]
  D --> E{Terminal event}
  E -->|Done| F[stop → frozen snapshot + snapshotId]
  E -->|Discard ×2| G[purge discard]
  E -->|TTL / logout / account change| G
  E -->|Recogniser error| H[error state · buffer retained · retry offered]
  F --> I{Binding still valid?}
  I -->|principal/tenant/client/conversation + authGen + captureGen all match| J[DRAFT_HANDOFF]
  I -->|any mismatch| K[Reject · purge · receipt stale-binding · NO composer write]
  J --> L[appendToComposer functional update]
  L --> M[BUFFER_DESTROY]
  M --> N[AUDIT_ACK attempt · may fail without blocking M]
  G --> M
  H --> E
```

## 4. Why binding is checked at **consumption**, not only at capture (correction 4)

`useFreestyleSession` protects **its own buffer**. It cannot protect a *consumer it never knew
about*. A ten-minute dictation spans logout, re-auth, client switch and conversation switch. The
snapshot is a plain object that outlives every in-hook purge **by design** — which is exactly why
handing it to a composer that now belongs to a different client is possible.

**Binding record**, captured at `start()` and re-checked at consumption:

```ts
interface CaptureBinding {
  principalId: string;      // acting user
  tenantId: string;         // org
  clientId: string | null;  // subject of coaching, null = self
  conversationId: string;
  authGeneration: number;   // bumped on login/logout/refresh
  captureGeneration: number;// bumped on every new capture session
}
```

Consumption proceeds **only if every field is equal**. Any mismatch → reject, purge, emit a
`stale-binding` receipt, **write nothing to the composer**. Missing target (composer unmounted,
`conversationId` null) → treated as mismatch: purge and receipt, never a silent hold.

`snapshotId` is a per-capture UUID. A consumed-set makes consumption **at most once**, so a duplicate
`onStopped` — a real possibility across a responsive remount — is a no-op, not a double append.

## 5. State machine

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> listening: start (lock acquired, binding captured)
  listening --> paused: pause
  paused --> listening: resume
  listening --> stopped: stop
  paused --> stopped: stop
  listening --> error: recogniser error
  error --> listening: retry
  error --> discarded: discard
  stopped --> handedOff: binding valid → DRAFT_HANDOFF
  stopped --> rejected: binding invalid
  listening --> discarded: discard (two-step)
  paused --> discarded: discard (two-step)
  handedOff --> [*]: BUFFER_DESTROY
  rejected --> [*]: BUFFER_DESTROY
  discarded --> [*]: BUFFER_DESTROY
  note right of handedOff
    M2 would insert consolidating/summary here.
    NOT built. Do not add these states in M1.
  end note
```

`consolidating` and `summary` are declared in the existing `FreestyleState` union `[SUPPLIED]` and
remain **unreachable** in M1. A builder must not wire them.

## 6. Capture ownership (correction 8)

**Exactly one active capture owner at a time**, enforced by a module-level lock in the dock, not by
hope:

```ts
type CaptureOwner = 'none' | 'short-command' | 'freestyle';
```

- Acquire is a compare-and-set against `'none'`. Failure is **explicit refusal with a visible
  reason**, never a silent no-op and never a pre-emption of a live capture.
- Release happens on every terminal path including error and unmount.
- Switching modes requires release-then-acquire. There is no implicit hand-off.
- Both owners are **discrete controls with visible labels**. There is **no press-and-hold**, no
  long-press, and no hidden gesture: they are undiscoverable, inaccessible to keyboard users, and
  unreliable with gloves or wet hands on a gym floor.

## 7. Composer update authority (correction 5)

The authoritative owner of composer text is **`CoachConsoleDock`**, which holds the `<textarea>` and
`onCommandTextChange`. A ref mirrored on render fixes a *stale closure*; it does **not** make a
read-modify-write *atomic*. Two writers (a typing coach and a returning snapshot) can still
interleave between render and commit.

M1 therefore requires a **functional update** at the authoritative owner:

```ts
appendDictation(snapshotId: string, text: string): AppendResult
```

It computes the next value from the **current** value inside the state updater, and it is
idempotent on `snapshotId`. Contract in `03-contracts.md` §2.

> **`[UNVERIFIED]`** — that the current ref-mirror implementation actually loses a concurrent edit
> has *not* been demonstrated. It is an unproven interleaving, labelled as such, and `09-tests.md`
> T-05.3 is written to decide it. Do not report it as a live defect.

## 8. What M3 would add (designed, not built)

```mermaid
sequenceDiagram
  participant U as Coach
  participant FE as Frontend
  participant API as /api/ai-chat
  participant P as Provider
  U->>FE: MESSAGE_SEND
  FE->>API: POST /messages {idempotencyKey}
  API-->>FE: 202 {messageId, streamToken}
  FE->>API: GET /stream?token (SSE)
  API->>P: allowlisted request
  P-->>API: deltas
  API-->>FE: event: delta {seq}
  API-->>FE: event: done {messageId, finalHash}
  FE->>API: GET /messages/{id} (reconcile)
  Note over FE,API: deltas are DISPLAY ONLY — they never execute an action
```

Full transport decision, schemas and failure matrix in `03-contracts.md` §5.
