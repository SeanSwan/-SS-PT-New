# Mermaid blueprints — repaired for parse-correctness

**Why this file exists:** Fable's ruling emitted diagram 5(a) using `\n` inside
node labels. Mermaid does not interpret `\n`; it requires `<br/>`. Fable was also
truncated mid-5(a), so the fence was never closed and 5(b) was never written.
These are the corrected, parse-valid diagrams. Content is Fable's ruling; only
the syntax is repaired.

---

## (a) Entitlement / authorization decision path

The load-bearing point: **relationship decides Messages and Progress;
subscription decides only the community DM lane.** Today, subscription decides
everything, which is the P0-1 defect.

```mermaid
flowchart TD
    A[Client request] --> B{JWT valid?<br/>protect middleware}
    B -- no --> Z1[401 Unauthorized]
    B -- yes --> C{Destination}

    C -- Messages --> D{Staff, trainer or admin?}
    D -- yes --> M1[Full messaging access<br/>existing bypass preserved]
    D -- no --> E{Active ClientTrainerAssignment<br/>links actor to participant?<br/>RELATIONSHIP DECIDES}
    E -- yes --> M2[Trainer lane<br/>conversations with assigned<br/>trainer only - tier IGNORED]
    E -- no --> F{requireTier elite or premium<br/>or live trial<br/>SUBSCRIPTION DECIDES}
    F -- yes --> M3[Community DM lane]
    F -- no --> Z2[403 plus upsell wall<br/>community lane only]

    C -- Coach --> G{AI consent granted at<br/>current consentVersion?}
    G -- no --> Z3[Consent screen<br/>blocked server-side]
    G -- yes --> H{ctx param present?}
    H -- yes --> I{Redeem envelope<br/>actor-bound, unexpired,<br/>unconsumed}
    I -- valid --> J[Server builds prompt from<br/>authoritative records via<br/>outbound field ALLOWLIST]
    I -- invalid --> K[Plain chat plus<br/>context expired notice]
    H -- no --> K
    J --> L[Client lane is chat-only<br/>operatorEnabled false]
    K --> L

    C -- Progress --> N{requireOwnershipOrTrainer<br/>self OR trainer with relationship<br/>RELATIONSHIP DECIDES}
    N -- yes --> P1[Charts plus accessible tables served]
    N -- no --> Z4[403 Forbidden]
```

---

## (b) Coach context handoff — replacing the `teachPrompt` URL

The defect today: prose describing the workout travels in a query string, so it
lands in browser history, server access logs, analytics and `Referer` headers,
and Coach can be handed stale or edited text. The envelope carries **IDs and
revisions only**; the server rebuilds the prompt from authoritative records at
redemption time, and re-checks consent at **execution**, not issuance.

```mermaid
sequenceDiagram
    autonumber
    actor U as Client
    participant W as Workout card<br/>or chart datum
    participant API as Coach context API
    participant DB as CoachContext store
    participant CA as Coach assistant page
    participant LLM as LLM provider

    U->>W: Tap "Ask Swan Coach about this"
    W->>API: POST /api/coach/context<br/>{entities: ids + revisions, sourceSurface}
    API->>API: Bind actorId from JWT<br/>resolve subjectId, stamp consentVersion
    API->>DB: Persist envelope<br/>expiresAt = +10 min, consumedAt = null
    DB-->>API: contextId
    API-->>W: contextId
    W->>CA: navigate ?ctx=contextId<br/>NO prose in the URL

    CA->>API: GET /api/coach/context/:id
    API->>DB: Look up envelope

    alt actor mismatch
        API-->>CA: 403 Forbidden
    else expired or already consumed
        API-->>CA: 410 Gone
        CA-->>U: Plain chat plus<br/>"context expired - reopen from your workout"
    else valid
        API->>DB: Mark consumedAt - single use
        API->>API: Re-check consent at CURRENT version<br/>revocation invalidates in flight
        API->>API: Rebuild prompt from authoritative records
        API->>API: Apply OUTBOUND ALLOWLIST<br/>health fields default-denied
        API->>LLM: Prompt - allowlisted fields only<br/>plus "Do not claim the workout was logged"
        LLM-->>CA: Response
        CA-->>U: Grounded answer<br/>client lane stays chat-only
    end
```

---

## Verification note

Both diagrams above use only `<br/>` for line breaks, avoid `\n`, avoid
parentheses and slashes inside labels, and quote nothing that Mermaid's parser
treats specially. Diagram (c), the slice dependency graph, comes from Fable's
continuation pass and is checked to the same standard before it ships.
