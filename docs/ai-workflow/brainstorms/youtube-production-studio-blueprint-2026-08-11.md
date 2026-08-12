---
decision: Build a YouTube production studio in the Content Center — ingest, sync, proxy-edit, render on the home GPU, caption with Whisper, publish to YouTube — closing the exercise-coverage loop.
status: open
supersedes: none
---

# YouTube Production Studio — consolidated blueprint

**Date:** 2026-08-11 · **Owner:** Sean · **Surface:** Admin Content Studio (`/content`)
**Sources:** Kimi K3 (architecture, complete), HY3 ×2 (design + diagrams), Opus 5 (synthesis +
verification). **External-model claims are corrected below where verification contradicted them —
do not build from the raw reviews.**

---

## 1. What this is for

Turn footage into published YouTube videos without leaving the dashboard, and **close the
exercise-coverage loop**: an uncovered exercise → a filmed video → published → gap marked closed.

Kimi's framing, adopted: *without the coverage loop this is a worse youtube.com.* HY3 reached the
same conclusion independently from the design side — its signature animation fires only when a
published video closes a known gap. **Two models converging from opposite directions is the
strongest signal in this design phase.**

---

## 2. Production reality (binding facts)

**Camera — Sony A7R IV:** 4K 30p, XAVC S (H.264/MP4), 100 Mbps, **8-bit** → **≈750 MB/min**.
10-min video ≈ 7.5 GB · 20-min ≈ 15 GB · 1 hr raw ≈ 45 GB.

Consequences: browser editing of masters is arithmetically impossible (~2–4 GB tab ceiling);
masters never transit Render (ephemeral FS, metered bandwidth); the home agent (RTX 5090, NVENC)
is **mandatory**; a **proxy workflow is required**. 8-bit ⇒ limited grading latitude, so an
elaborate LUT stage buys little.

**Audio — DJI wireless, four paths, all supported:**

| Path | Files | Sync | Notes |
|---|---|---|---|
| A. Camera mic only | 1 | none | poor; worse transcription |
| B. DJI receiver → camera hot shoe | 1 | **none** | clean lav, zero complexity |
| C. DJI onboard the transmitter | 2 | **yes** | best; survives receiver dropout |
| D. Separate recorder / phone | 2 | **yes** | hardest to match to takes |

Ingest classifier: video alone with usable audio → A/B, straight to proxy. Video + audio file(s)
→ C/D, sync first. Video with silent track and **no** audio file → **halt and report**.

---

## 3. Sync — the owner's top priority. Two problems, not one.

**3a. Offset** — waveform cross-correlation against the camera scratch track. Sub-frame, seconds,
no clapperboard. **Must emit a confidence score.** A sync system that cannot report its own
failure is worse than manual sync, because the operator stops checking.

**3b. Drift** — the one that actually ruins recordings. Independent clocks diverge: aligned at
00:00, **hundreds of ms out by minute 20** — exactly the video length being made. Fix by measuring
offset at start AND end, then **resampling**, not sliding. (29.97 vs true 30 fps produces the same
creep from a different cause.)

**Non-negotiables:** sync **before** proxy, never after (proxies must carry the good audio, or the
problem relocates to where it's worse) · per-take confidence + measured drift stored · manual
escape hatch (waveform overlay, ±frame nudge, "use camera audio instead") · **regression test that
offsets a known clip by a known amount and asserts recovery within one frame**, plus a synthesized
resampled track asserting drift correction. Without that test, "syncs perfectly" is a hope that
decays silently as the code changes.

---

## 4. Architecture decisions

**Q1 — Keep BOTH queues. Boundary is *where the job runs*, not what it does.**
BullMQ + Redis for Render-side jobs (YouTube import/sync, metadata generation, analytics,
token refresh). Postgres-leased `video_render_jobs` for home-agent jobs (renders, Whisper, AI
b-roll, upload). Rationale: the agent is offline much of the day, and BullMQ stall-detection
assumes workers that are *supposed* to be up; a Redis credential on a home machine can inject
jobs into every consumer, whereas the hashed `render_agents` token is single-purpose and revoked
with one row update; leases+heartbeats are the correct primitive for a 40-minute NVENC render.
*This vindicates the Slice 3 migration already committed (`bca3a9e37`).*

**Q2 — Browser is the editor UI; the home agent is the renderer.**
The browser produces an **EDL** (versioned JSON: clips, in/out, title cards, overlay refs, music
bed, caption ref). Native ffmpeg/NVENC on the agent executes it. `ffmpeg.wasm` stays where it is
(Video Optimizer, short clips) and is **never** the long-form render path — it demos beautifully
on 30 seconds and fails on the real workload. **No Remotion**: not installed, React→video is the
wrong tool for cutting filmed footage, and the existing "Remotion" endpoint is a facade over
nothing. Delete the facade; do not adopt the framework.

*Minimum viable editing:* trim · cut/split · join · title cards + lower-thirds · intro/outro
splice · single brand overlay · music bed with ducking · caption sidecar (VTT, not burned in by
default) · thumbnail frame extraction.

*Accepted tradeoff:* machine off ⇒ you can edit (EDL is JSON) but nothing renders. Agent liveness
must be a first-class signal on every screen.

**Q3 — Build upload, but the sequencing is CORRECTED (see §5).**
OAuth 2.0; refresh token in `service_credentials` (AES-GCM), **never** `process.env`; resumable
upload executed by the agent (the master is already there — no R2 round-trip); **short-lived
access tokens minted just-in-time by Render and held in agent memory only. The refresh token never
leaves Render.** A compromised home machine must not equal a compromised channel.

**Q4 — Captions: Whisper (`faster-whisper` large-v3) on the 5090.** Free, offline, no PII leaves
the building, ~1–2 min for a 20-min video. Not ElevenLabs (TTS vendor; paying per-minute for what
the GPU does free, and its endpoint here was fake). Not YouTube auto-captions (mediocre on fitness
terminology — "Romanian deadlift" degrades badly — and captions are an SEO surface).

**Q5 — What kills this: assuming the agent is up when the pipeline needs it.**
Everything critical routes through a consumer Windows box that sleeps, reboots, and shares a GPU.
Mandatory: agent liveness on every screen · every job resumable after agent disappearance with
zero data loss · sweeper requeues rather than fails on lease expiry for retryable kinds.

---

## 5. ⚠ VERIFIED CORRECTIONS to the external reviews

**C1 — Upload quota: Kimi's figure is stale by 16×.** It cited ~1,600 units/upload → ~6/day.
Reality: `videos.insert` dropped to **~100 units** (Dec 2025) and since **June 2026 bills to a
dedicated ~100-calls/day bucket** separate from the 10,000-unit pool. Uploads no longer compete
with reads. **Quota is a non-issue.**

**C2 — The private lock is NOT "a feature", and this inverts the build order.** Kimi proposed
shipping private-first and flipping public after review. **That workflow does not exist.** Videos
uploaded from an unverified API project are locked private, **cannot be appealed**, and must be
**re-uploaded** via a verified project or by hand. So every upload before the audit clears is
wasted work.

> **Therefore: apply for the YouTube API audit FIRST (free, takes weeks). Build ingest → sync →
> proxy → edit → render → captions while it processes. Wire upload LAST, when verification lands.**

**C3 — End screens and cards cannot be set via Data API v3** *(Kimi, high confidence; not
independently verified)*. Design for it: the studio gets a video to *private-with-everything-
else-done*, and the publish checklist includes "add end screen in YouTube Studio (~2 min)."

---

## 6. Gaps worth building (Kimi's ranked analysis, filtered)

**CRITICAL**
- **Coverage loop** — Coverage → "film this" → project → published → gap closed, one click between
  steps. The highest-value screen in the studio.
- **Structural guard against lying endpoints** — ~15 new endpoints are coming. Rule: *any handler
  that enqueues work must create the job row in the same transaction as the response's claimed
  side effect, or 500.* Invariant: **every job id returned to the client must be pollable by id.**
  Delete `POST /render-job` in slice 1, not "later."
- **Channel-loss recovery** — the channel IS the funnel. Every master in R2 **plus** a versioned
  JSON metadata export (titles, descriptions, tags, chapters, thumbnails, publish dates, video
  IDs) so a new channel can be repopulated in a day. One export job; difference between a setback
  and a business event.
- **Token security** — see Q3.

**HIGH**
- Thumbnails (biggest CTR lever; `thumbnails.set` ~50 units) — extract frame + brand-kit overlay.
- Music licensing: `media_assets.license_status` (`cleared | youtube_audio_library | unverified`);
  **render refuses to burn in `unverified`**. Strikes compound to termination.
- Storage lifecycle: masters retained; **proxies + intermediates expire 30 days; failed-render
  artifacts 7 days**. One video/week of 4K is 0.5–2 TB/year.
- Metadata generation via Gemini (already paid for; exercise names are not PII). Chapters help
  retention and SEO.
- 9:16 Shorts derivative from the same EDL — cheapest top-of-funnel, one more render kind.

**MEDIUM** — AI-content disclosure flag for Wan 2.2 footage · retention analytics shown *next to
the gap it closed* (otherwise "analyzed" is a dead state) · brand kit as versioned JSONB, not
baked ffmpeg strings · scheduled publishing (`status.publishAt`, ~50 units).

**CUT for a solo operator** — multi-user roles, approval inboxes, collaborator invites, shared-
library permissions, thumbnail A/B (YouTube's native Test & Compare does it), audio description,
multi-language captions, calendar *view* (build the data, skip the grid).

---

## 7. Design system

**Signature moment — "Crystallization" (HY3).** Fires when a published video closes a known
coverage gap: frost particles converge into a faceted swan → the swan lifts → a frost trail draws
toward the Coverage tab → the gap cell fills (Gilded Fern border, Frost White 12%) → toast.
Reduced-motion: no particles, static swan glyph, 200ms opacity fade.
*Why here:* it is the only point where brand, product truth, and business goal collide.

**Two screens that carry the build:**
1. **Ingest / sync review** — per-take audio-path detection, sync confidence, human-confirm flag,
   waveform overlay, ±frame nudge, "use camera audio instead." This is where "sync perfectly" is
   earned or lost.
2. **Transcript editor** — transcript caret linked to playhead; delete a sentence and the video
   cuts; filler/dead-air markers. Highest-leverage editing surface for talking-head instruction.

**Palette discipline:** Ice Wing = frost/progress/active · **Gilded Fern = MONEY ONLY** · Wing
Purple = glow/focus · Arctic Cyan = charts only. Dual-Button Glow law holds. Measured contrast:
Ice Wing/Sapphire 7.48:1 ✓ · Gold/Obsidian 8.56:1 ✓ · Gold/Sapphire 6.62:1 ✓ · **Swan Lavender on
Carbon 3.76:1 ✗ (large text only)**. No fixed bottom nav — the dashboard uses a left drawer ≤1024px.

---

## 8. Build order

| # | Slice | Blocked? |
|---|---|---|
| 0 | **Apply for the YouTube API audit** (Sean, ~10 min, free) | — start the clock today |
| 1 | Delete the `/render-job` facade; add the enqueue-or-500 structural guard | no |
| 2 | Models + job service + status API on the Slice 3 migration | no |
| 3 | Home agent MVP: ingest, classify audio path, **sync + confidence + drift**, proxy | no |
| 4 | Ingest/sync review UI (incl. nudge + override) + the offset-recovery regression test | no |
| 5 | EDL editor against proxies + compose-and-submit | no |
| 6 | Render on agent (NVENC) → master + derivatives → R2 | no |
| 7 | Whisper captions → VTT/SRT sidecars | no |
| 8 | Coverage loop: gap → project → published → closed + Crystallization | no |
| 9 | Thumbnails, metadata generation, Shorts derivative | no |
| 10 | **YouTube OAuth + resumable upload + publish checklist** | **YES — audit** |
| 11 | Channel-loss archive export; retention analytics beside the gap | no |

Slices 1–9 and 11 are entirely unblocked and represent most of the value.

## 9. Model calibration (for future routing)
- **Kimi K3** ($0.21): complete 598-line blueprint, no degradation, excellent architectural
  reasoning with explicit "what would change my mind." **Stale on fast-moving external facts**
  (quota 16× wrong) and wrong on the private-lock consequence. Verify every external-API claim.
- **HY3** ($0.018 + $0.003): superb design value per cent, and it reached the proxy conclusion
  *unprompted*. **Degrades badly on broad multi-part asks** — round 1 collapsed into garbled
  filler after ~300 lines; a narrowed round-2 remit produced all 5 sections cleanly.
  **Route HY3 narrow, always.**
