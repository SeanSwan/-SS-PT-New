# Swan Forge — Compiler API Contract v0.1.0

- **Date:** 2026-08-11 · **Author:** Opus 5 · **Status:** PROPOSED — creator Claude codes against this; I implement behind it
- **Purpose:** the seam between the **prompt brain** (my lane) and the **pipeline + surface** (creator Claude's lane). Ships *before* either side is built so both proceed in parallel without drift.
- **Governs:** `swan-forge-core`. Consumed by the backend service, the CLI, and (later) an MCP server. **One brain, three consumers** — the brain is the only place prompt intelligence lives.

---

## 0. Non-negotiables (from two review rounds)

| # | Rule | Why |
|---|---|---|
| 0.1 | **Replayable, not deterministic** | `forgeVariants` *requires* controlled non-determinism; provider seed honouring is unverified. Persist enough to re-derive, don't promise identical bytes. |
| 0.2 | **Capabilities may LIE** | A provider reporting `honorsNegativePrompt: true` falsely would silently disable the LAW filter. Declarations must be **probe-verified**, not trusted. |
| 0.3 | **Image-first enforced in CORE** | Not in the UI. A text→video call must be refused by the compiler, or any other caller bypasses the most valuable cost control we have. |
| 0.4 | **Cost ladder lives in the session service** | Not in the adapter. It is workflow state (an approval record), not a transport concern. Adapters *estimate*; the session *gates*. |
| 0.5 | **`brainVersion` pinned by every consumer** | CLI on v1 + backend on v2 = the drift this whole design exists to kill. |
| 0.6 | **~60 facets, not 765** | Ship what the LAWs actually reference; grow only when a direction can't be expressed. The taxonomy is a garden, not a foundation. |

---

## 1. Input — `ForgeBrief`

```ts
interface ForgeBrief {
  briefId: string;              // uuid, caller-generated
  text: string;                 // Sean's own words, verbatim, never rewritten in place
  surfaceClass: 'public' | 'in-app';   // drives motion + enchantment budget (LAW 6)
  intent: 'hero' | 'substrate' | 'texture' | 'icon' | 'editorial' | 'demo';
  aspect: '16:9' | '9:16' | '1:1' | '4:5' | '21:9';
  slotOverrides?: Partial<SlotMap>;    // from refine chips; see §2
  seed?: number;                       // omitted = compiler assigns and records
  brainVersion?: string;               // omit to accept current; pin to reproduce
}
```

`text` is **never mutated**. Refinements arrive as `slotOverrides`, so the original brief stays auditable forever.

---

## 2. The slot map — what the compiler actually composes

```ts
interface SlotMap {
  intent: string;          // 1  what job this image does on the page
  subject: string;         // 2  literal content — often deliberately empty (pure phenomenon)
  medium: string;          // 3  photograph | render | painting | macro | scan | generative
  styleAnchor: string;     // 4  artist/movement — ALWAYS via the personification formula (§2.1)
  composition: string;     // 5  symmetrical | layered | radial | bird's-eye | low-vantage | macro | split
  optics: string;          // 6  lens · aperture · shutter · focal length · film stock
  light: string;           // 7  direction + quality + colour temperature
  palette: string;         // 8  Swan token hexes named explicitly, in dominance order
  material: string;        // 9  texture, surface, substance behaviour
  abstraction: string;     // 10 variety/stylisation level — expressed per-provider, NOT as MJ flags
  negative: string;        // 11 what must not appear (kill-list, LAW 3)
  output: string;          // 12 aspect, tileability, transparency, resolution
}
```

### 2.1 The personification formula — slot 4's only legal form
`[Artist]'s [their actual medium] depicting [subject]`
→ *"Anton Corbijn's classical photograph of…"*, *"Erwin Wurm's installation depicting…"*

**Never** `[subject] by [Artist]` — the weak form, and the #1 style failure. Mismatching a subject to an artist's real medium is what produces generic output.

---

## 3. Output — `CompiledPrompt`

```ts
interface CompiledPrompt {
  briefId: string;
  brainVersion: string;        // semver of the compiler that produced this
  provider: string;            // resolved target, e.g. 'gemini' | 'minimax-h3-hosted'
  modelVersion: string;        // exact model slug as sent
  promptText: string;          // the FINAL string sent to the model
  negativeText?: string;       // only if capabilities.honorsNegativePrompt is PROBE-VERIFIED
  seed: number;                // always populated, even if auto-assigned
  params: Record<string, string | number>;  // provider-native, capability-filtered
  slots: SlotMap;              // resolved values, for forgeExplain
  facetsApplied: string[];     // e.g. ['Temperature>Arctic', 'Mark>FineLines']
  lawChecks: LawCheck[];       // see §5 — every check, pass or fail
}

interface LawCheck { law: string; passed: boolean; detail?: string }
```

`promptText` is what gets persisted to the job row's `compiled_prompt`. **The user's brief is not sufficient** — the compiled string is the only thing that explains an output.

---

## 4. Capabilities — declared, then PROBED

```ts
interface ProviderCapabilities {
  provider: string;
  supportsImageInit: boolean;
  supportsInpainting: boolean;      // gates seamless-tile / parallax-plate work entirely
  supportsSeed: boolean;
  seedIsDeterministic: 'verified' | 'claimed' | 'false';   // ← never just a boolean
  honorsNegativePrompt: 'verified' | 'claimed' | 'false';  // ← LAW filter depends on this
  maxResolution: { w: number; h: number };
  supportedAspectRatios: string[];
  maxDurationSec?: number;          // video providers only
  attribution?: string;             // e.g. "MiniMax H3" — licence-required UI display
}
```

**`'claimed'` is treated as `false` by the compiler.** Promotion to `'verified'` requires a recorded probe result — a real generation whose output demonstrated the behaviour. This is HY3's catch: a lying capability silently disables the LAW filter, and nothing would surface it.

`attribution` exists because the MiniMax H3 licence requires "MiniMax H3" displayed prominently in commercial product UI. Cheap now; retrofitting touches every surface.

---

## 5. The LAW filter — runs on every compile, never skippable

Checks, in order: **kill-list** (iridescent unicorn gradients, lens flare, causeless particle fields, glass-on-glass, AI-fantasy-wallpaper) · **gold allowlist** (LAW 2 — gold only as PR numeral, ≤1px filigree, focus ring, one badge) · **LAW 4 optics-not-creatures** (no literal animal form; permitted only as a dark occluder in a light field) · **banned facets** (Psychedelic, Cute, Funny, Madness) · **content law** (never "yoga"/"meditation"; never the joined NASM-certified form) · **Galaxy-Swan** retired values (`#0a0a1a`, `#00FFFF`, `#7851A9`) including inside `var()` fallbacks.

A failed check **blocks the compile** and returns `E_LAW_VIOLATION` with the offending slot. It never silently strips — silent stripping teaches the operator nothing and hides taste failures.

---

## 6. Functions

```ts
compileImage(brief: ForgeBrief, caps: ProviderCapabilities): CompiledPrompt
compileVideo(brief: ForgeBrief, caps: ProviderCapabilities, initImageAssetId: string): CompiledPrompt
directions(brief: ForgeBrief, n: 2 | 3): Direction[]   // Gate 0, zero generation cost
explain(record: GenerationRecord): ExplainView         // human-readable, powers "Why this?"
estimate(caps, params): { cents: number; basis: string }  // adapters estimate; session gates
```

**`compileVideo` throws `E_IMAGE_FIRST_REQUIRED` when `initImageAssetId` is absent.** Enforced here, in core — rule 0.3.

```ts
interface Direction {
  name: string;              // evocative — "Glacier Cathedral"
  sentence: string;          // mood, hierarchy, the ONE impossible phenomenon
  phenomenon: string;        // the single impossible thing — load-bearing, never confetti
  facets: string[];          // drives a deterministic colour swatch strip in UI, no gen cost
  paletteLaw: 'A-swan-native' | 'B-world-native';
}
```

`directions()` costs **nothing** — it is text plus facet swatches. Generating preview images for three directions triples spend before a choice is made; that stays an explicit opt-in action in the UI.

---

## 7. `GenerationRecord` — the persistence contract

Shares lineage with creator Claude's job table. **These are the fields I asked for on the Slice 3 migration:**

```ts
interface GenerationRecord {
  id: string;
  jobId: string;                 // FK to their job table — one lineage, not two
  parentId: string | null;       // 480p preview → 1080p promotion; still → video
  briefId: string;
  compiledPrompt: string;        // → compiled_prompt
  seed: number;                  // → seed
  brainVersion: string;          // → brain_version
  provider: string;
  modelVersion: string;
  licenceSnapshot: string;       // which licence governed this asset, at generation time
  estimatedCents: number;        // → estimated_cents
  actualCents: number | null;    // → actual_cents  (log both; drift kills cost-UI credibility)
  outcome: 'pending' | 'accepted' | 'refined' | 'rejected_all';
  facetsApplied: string[];
  lawChecks: LawCheck[];
}
```

**`outcome: 'rejected_all'` is the highest-value tuning signal the system will ever produce** and nothing else records it. One field, cheap now.

**`licenceSnapshot`** is not bureaucracy: with active litigation against AI video generators, per-asset provenance is the difference between a config change and a rebuild if platforms or regulators demand it later.

---

## 8. Errors

`E_LAW_VIOLATION` (slot named) · `E_IMAGE_FIRST_REQUIRED` · `E_CAPABILITY_UNVERIFIED` (a required capability is `'claimed'`) · `E_BRAIN_VERSION_MISMATCH` · `E_PROVIDER_UNCONFIGURED` (**fail-closed — never fabricate media**).

Fail-closed is inherited verbatim from the deleted service's one genuinely good property: *"the app never fabricates generated media."*

---

## 9. Versioning

`brainVersion` is semver. **Minor** = new facets, better wording — same slots. **Major** = slot shape changes or LAW filter behaviour changes. Every consumer pins a range and records the resolved version on each generation. A stored record can always be re-compiled under its original version.

---

## 10. What this contract does NOT own

Job queue, leasing, heartbeats, R2 keys, the home agent, the Create surface UI, and spend *enforcement* — all creator Claude's. This contract only says what the brain emits and what must be persisted so an output can be explained and replayed.

**Open, needs their answer:** do the Slice 3 columns land as named in §7, or should the record live in a sidecar table keyed by `jobId`? Either works; I need to know which before implementing.
