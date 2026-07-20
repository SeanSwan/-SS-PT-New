# Measurement Charter — funnel baseline before activation (Kimi roadmap #5)

> **Purpose.** You cannot claim the value of a redesign or of marketing spend you can't attribute. Before the
> first Swan Lens flag flips (`FLAG-FLIP-RUNBOOK.md`) and before the PRISM CAPTURE acquisition epic ships, the
> canonical funnel must be captured as a **baseline** so lift is measurable and every future dollar is
> attributable. This charter defines the event taxonomy, where each event fires, and the baseline rule. It is
> also the seed for the Marketing Command Center.

## 1. The canonical funnel (one spine, all roles)
```
visit → lead_captured → signup → first_session_logged → purchase → adherence(week-2 return)
                    └─ referral: ref_shared → ref_landed → ref_converted
```
Every step is one event with a small, non-identifying payload. This is the ONLY funnel — surfaces feed it, they
don't invent parallel ones.

## 2. Event taxonomy (name · where it fires · payload)
| Event | Fires when | Payload (IDs/roles only — Rule 8) |
|---|---|---|
| `visit` | first paint of a marketing route | `{ route, ref?, utm{} }` |
| `lead_captured` | `POST /api/leads` 200 (PRISM CAPTURE) | `{ source, intent?, ref? }` |
| `booking_started` | booking modal opened from capture success | `{ source }` |
| `signup` | account created | `{ role, ref? }` |
| `first_session_logged` | first WorkoutSession saved for a client | `{ }` (client ref only) |
| `purchase` | checkout success (Store / Gallery credits / VIP) | `{ kind, amount_bucket }` |
| `adherence_w2` | client returns + logs in calendar week 2 | `{ }` |
| `ref_shared` / `ref_landed` / `ref_converted` | share tapped / `?ref=` landed / referred conversion | `{ ref }` |
| gate outcomes | see `FLAG-FLIP-RUNBOOK.md` §4 | `{ surface, outcome, vw }` |

**Amount is bucketed, never raw** (`amount_bucket ∈ {<100, 100-499, 500-999, 1k-5k, >5k}`) — no exact dollar
figures or client identity in the event stream.

## 3. Transport (additive, no third-party analytics dependency)
- Frontend emits via one thin module (`frontend/src/lib/acquisition.ts`) → a best-effort beacon to a new
  additive backend route (`POST /api/telemetry/funnel`, mounted beside contact/leads) → an `acquisition_events`
  table (`event, ref?, meta_json, ts`). Gate events reuse the same beacon path.
- No PII, no exact amounts, no raw ids in `meta_json`. Server drops any unknown field (allowlist).
- This is a Wave-2 build alongside PRISM CAPTURE; the CHARTER (this doc) lands first so the taxonomy is fixed
  before anyone emits.

## 4. The baseline rule (the load-bearing discipline)
- **Capture ≥ 1 full week of the funnel on the CURRENT (V-prev) surfaces BEFORE the first flag flip.** A redesign
  measured against no baseline is a vibe, not a result.
- Report ONE weekly number Sean can say out loud: `visits → captures → bookings → joins`, plus referral-share
  rate and median time-to-first-touch.
- After each flag flip, compare the surface's funnel step against baseline; a > relative-10% drop is a
  `FLAG-FLIP-RUNBOOK.md` abort trigger.

## 5. Status
- Taxonomy: **DEFINED** (this doc). Transport route + `acquisition_events` table + `lib/acquisition.ts`:
  **pending** (Wave-2, with PRISM CAPTURE). No events emitted yet — baseline capture starts when the transport
  lands, and must precede the first flip.
