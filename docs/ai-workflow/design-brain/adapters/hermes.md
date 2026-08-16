# Hermes Adapter — Operator Surfaces & the Agentic OS

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL for Hermes and every Agentic OS operator surface
- **Governing boundary:** `docs/ai-workflow/references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §10 — this adapter only translates it; the bridge wins on any conflict.

---

## 1. Crystalline Cyberforest mode — scope

- **What it is:** the operator-mode sibling of the Crystalline Swan system — same tokens, same typography, same dark-first discipline, tuned for dense Sean-only tooling (command center, approval queue, kill-switch panel, receipt viewers, run logs).
- **Who sees it:** **Sean only** (and, when the 2026-06-18 role-scoped trainer-operator layer ships, signed-in trainers inside their own product-auth scope — through product surfaces, never through raw Hermes).
- **Hard rule:** Cyberforest chrome **NEVER appears on client-facing UI.** No tier badges, receipt panes, kill switches, approval queues, or run logs on Swan Coach or any client dashboard. Leakage of operator chrome into product UI is a REJECT-class review finding, not a style note.
- Product floors still apply to operator UI (bridge §10): 44px targets, dark-first, `prefers-reduced-motion`, WCAG 4.5:1. "Internal tool" is not a quality waiver.

## 2. Tier-badge color mapping (T0–T4 per bridge §4)

Every command, button, and automation rendered in an operator surface shows its tier badge. Mapping is fixed here so four brains draw the same ladder:

| Tier | Badge color | Token pattern | Rationale |
|---|---|---|---|
| **T0** read-only | Ice Wing `#60C0F0` | `var(--ice-wing, #60C0F0)` | Cool, safe, ambient — the "just looking" color |
| **T1** draft/propose | Swan Lavender `#4070C0` | `var(--swan-lavender, #4070C0)` | Tertiary calm; DRAFT label always accompanies it |
| **T2** bounded write | Gilded Fern `#C6A84B` | `var(--gilded-fern, #C6A84B)` | Gold = valuable but allowlisted; audit-logged |
| **T3** external-visible | Wing Purple `#8B5CF6` | `var(--wing-purple, #8B5CF6)` | Glow-accent weight; approval + receipt required |
| **T4** destructive/irreversible | Danger red `#E5484D` | `var(--danger, #E5484D)` | design.md §4's ONE off-palette semantic. No pulse/glow — gravity without alarm theatrics. Two-step confirm chrome mandatory |

Notes: this table is `../design.md` §11 verbatim — it reuses EXISTING tokens and coins none (no `--tier-*` tokens exist; an adapter may never introduce tokens, per `./index.md`). Tier badges appear wherever §15 applies — including the Coach Command Center product surface — not only in Cyberforest mode. Badges are text+color, never color alone (a11y); tier text ("T3") renders in Fira Code. Small badge text on dark uses the lightened text tints noted in design.md §15.

## 3. Operational-calm rules

- **No ambient motion on data-dense panels.** Queues, logs, receipts, registries: zero looping animation, zero parallax, zero hover-tilt. Motion in operator UI is reserved for state *transitions* (item approved → moves lane) and completes in ≤200ms (design.md §5 (ops world) / motion.md §4 — adapters translate canon, never relax it). An operator scanning for anomalies must never compete with decoration.
- **Receipts render in Fira Code.** Audit receipts (`who · what+tier · target · when · approved-by · outcome · evidence`, per bridge §8 / `../../hermes-agentic-os/audit-receipts.md`) are monospaced, line-oriented, copyable. Never restyled into marketing cards.
- **Hierarchy is status → attention → action, in that order.** Top: system truth (health, kill-switch states, running automations). Middle: what needs Sean (approval queue, flagged anomalies). Bottom/edge: action affordances with tier badges. A command center that leads with buttons instead of truth is upside down.
- **Kill switches are a first-class panel** (bridge §9), never buried in settings. The master switch is always visible, always ≥44px.
- **Data truth only.** Operator panels show real states from real receipts and real health checks — a mocked status light on an operator surface is worse than none.
- Density is allowed — Cyberforest may run tighter spacing than product surfaces — but the C12 obsidian panel recipe, token discipline, and contrast floors still hold.

## 4. How Hermes REQUESTS design work (it never styles product surfaces itself)

Hermes has no design authority and no build lane. When Hermes (or an Agentic OS automation) identifies design-adjacent work — a new command-center panel, a UI gap it noticed in receipts, a trainer-surface improvement — it:

1. **Drafts a T1 design brief** (zero external effect, clearly labeled DRAFT) addressed to `swan-design-router` / Fable, containing: surface + route, consumer role (Sean-operator vs trainer vs client), workflow job, data truth available (which receipts/endpoints feed it), tier badges involved, and the specific pain observed (with receipt/log evidence).
2. **Queues it** through the normal approval path (bridge §7). Sean or Fable pulls it into the design pipeline: `grill-me`/direction gate as needed → `fable.md` → `builders.md`.
3. **Never** edits styled-components, tokens, or `../design.md` itself; never instructs a builder directly; never self-authorizes even a "tiny" visual tweak. Hermes is a broker (effect ceiling T2, and design work is not on its allowlist).

## 5. Verification before done (any operator-surface design slice)

- [ ] Surface confirmed Sean-only / role-scoped; zero Cyberforest chrome reachable by clients
- [ ] Every rendered command/button shows the correct §2 tier badge (text + color, Fira Code tier label)
- [ ] No ambient motion on data panels; transitions ≤200ms; reduced-motion honored
- [ ] Receipts in Fira Code, format matching `../../hermes-agentic-os/audit-receipts.md`
- [ ] Status → attention → action hierarchy holds top-to-bottom; kill switches visible
- [ ] 44px / contrast / dark-first floors met despite density
- [ ] If Hermes originated the work: T1 brief + approval-queue entry exist; Hermes wrote no styles
