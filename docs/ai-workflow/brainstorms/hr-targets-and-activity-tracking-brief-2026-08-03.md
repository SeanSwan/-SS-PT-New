# SwanStudios — Heart-Rate Prescription + Route/Activity Tracking
## Enterprise planning brief (enhanced from Sean's 2026-08-03 voice prompt)

**Status:** draft brief, pre-planning
**Author:** Claude Opus 5, enhancing Sean's raw prompt per his instruction
**Consult target:** Kimi K3 (full permission as of 2026-08-03 provider-policy amendment)
**Related:** SWA-108 (cardiac load ceiling — this brief COLLIDES with it, see §3)

---

## 0. Sean's original prompt — graded

**Verbatim intent:** (1) drop the anti-Chinese-AI data rule; (2) consult Kimi on how to set
heart-rate goals and produce HR targets from client goals; (3) Swan Coach must know about and
"think about" HR; (4) update all forms and UI to capture it; (5) client charts too; (6) add
runner-app-style GPS tracking for running/cycling/swimming/all sports — research what stats
those apps show; (7) enhance this prompt to enterprise level first; (8) then use Kimi to plan.

**Grade: B-.** The product instinct is right and the sequencing instruction (enhance → plan →
build) is correct. What holds it back:

| Gap | Why it matters |
|---|---|
| **No mention of the cardiac ceiling shipped hours earlier** | HR targets are *contraindicated* for the exact population that ceiling protects. This is the single highest-risk intersection in the whole brief. See §3. |
| **"HR targets" is underspecified** | %HRmax, %HRR (Karvonen), lactate-threshold %, or RPE-anchored are four different products with different data requirements and different failure modes. |
| **No data-source decision** | Does HR come from manual entry, a connected wearable, or a live sensor? The answer determines whether this is a form change or an integration program. |
| **GPS route data is treated as a feature, not as sensitive PII** | A route polyline reveals a home address. This has a real-world incident history and specific legal weight. See §6. |
| **No web-platform constraint acknowledged** | SwanStudios is a React web app. Background GPS on mobile web is severely limited — iOS Safari suspends geolocation when backgrounded. This may be a native/PWA decision, not a feature decision. |
| **Swimming lumped in with running/cycling** | GPS does not work underwater. Pool swimming is lap/SWOLF-based; open water is GPS-based. Two different builds. |
| **No "why us" test** | Strava owns route-social. Building a worse Strava inside a training app is a known failure pattern. The wedge must be trainer-led. See §7. |
| **Existing assets not referenced** | `WearableData` already models most of the metrics being asked for. Building parallel structures would be waste. See §2. |

**What the enhanced brief adds:** the safety interlock, the existing-asset inventory, the
privacy/legal frame, the platform reality check, an explicit metric taxonomy, and the
strategic test.

---

## 1. Product goal (restated)

Make SwanStudios *cardio-literate*: able to prescribe heart-rate and pace targets from a
client's goal, capture what the client actually did (including route-based outdoor work),
prove progress from it, and let Swan Coach reason about it — without ever prescribing a
target that is unsafe or meaningless for that individual.

---

## 2. What already exists (do NOT rebuild)

`backend/models/WearableData.mjs` is substantial and already wired
(`backend/routes/wearableDataRoutes.mjs`, `backend/services/wearableDataInterop.mjs`):

- **Cardiac:** `restingHeartRate`, `avgHeartRate`, `maxHeartRate`, `heartRateVariability`,
  `heartRateZones`, `vo2Max`, `spo2`, `respiratoryRate`
- **Running:** distance, duration, `runAvgPaceMinPerKm`, `runAvgCadence`, elevation gain,
  `runGroundContactTime`, `runVerticalOscillation`, `runTrainingEffect`
- **Cycling:** distance, duration, avg/max speed, `cyclingAvgPowerWatts`,
  `cyclingNormalizedPower`, cadence, elevation gain
- **Swimming:** `swimLaps`, distance, `swimStrokes`, `swimPacePer100m`, `swimStrokeType`,
  `swimSWOLF`, `poolLengthMeters`
- **Recovery:** sleep duration/score/stages, `stressLevel`, `bodyBatteryOrRecovery`

**The three real gaps:**
1. **Granularity.** `recordDate` is `DATEONLY` — this is a *daily aggregate rollup*, not a
   per-activity record. There is no "this run, at this time, with these splits."
2. **Route geometry.** No latitude/longitude/polyline/elevation-series anywhere in the repo.
   This is the genuinely greenfield part.
3. **Prescription.** Every field above records what *happened*. Nothing *prescribes* a target.
   HR-target generation is net-new.

---

## 3. ⚠ SAFETY INTERLOCK — the highest-priority constraint in this brief

Hours before this brief, SWA-108 shipped a cardiac load ceiling because the planner
prescribed maximal-strength work to a client on heart medication. During that work, an
adversarial review raised — and we deliberately deferred — precisely this:

> Beta-blockers blunt the chronotropic response. Any HR-zone target, HR-based intensity
> prescription, or HR-triggered progression rule is **physiologically meaningless** for that
> client, and can drive a trainer to push intensity chasing an unreachable number.

A `suppressHeartRateTargets` flag was deliberately NOT shipped, on the grounds that the
generators emitted no HR targets and an unenforced safety field is worse than none.
**This brief removes that justification.** The moment HR targets exist, that flag must exist
and must be enforced.

**Non-negotiable requirements for any HR feature:**

1. HR-target generation must consult `resolveMedicalLoadCeiling` and be **suppressed or
   substituted** when the medical tier is in force.
2. The substitute must be RPE and/or the talk test — not a softened HR number.
3. `220 − age` must not be used as the sole basis for a max-HR estimate for a
   medically-flagged client; it has a standard deviation of roughly ±10–12 bpm in the general
   population and is invalid under rate-control medication.
4. Any *field-tested* max-HR protocol is a maximal effort and is itself contraindicated for
   this population. Estimated or submaximal-derived values only.
5. The same fail-closed doctrine applies: unknown medication status ⇒ no HR prescription.

---

## 4. Heart-rate prescription — the decision space (for Kimi)

- **Method:** %HRmax vs %HRR (Karvonen, needs resting HR) vs threshold-anchored vs RPE-mapped.
  Karvonen individualises better but requires a trustworthy resting HR.
- **Zone model:** 3-zone vs 5-zone; which is more actionable for a trainer-led product.
- **Goal→zone mapping:** fat loss, general fitness, BP/HR management, endurance, athletic
  performance, golf. This maps onto the existing `ALLOWED_GOALS` allowlist.
- **Max-HR estimation:** Tanaka (208 − 0.7×age) and Gulati (female-specific) are better
  validated than 220 − age; which to adopt, and how to present the uncertainty honestly.
- **Personalisation over time:** using observed `maxHeartRate` from `WearableData` to refine
  the estimate, and the guardrails on doing so.
- **Zone drift:** re-estimation cadence as fitness changes.

---

## 5. Route/activity tracking — the decision space (for Kimi)

**Research question Sean asked for:** what do Strava / Garmin Connect / Nike Run Club /
Komoot actually display, and which of those metrics earn their place in a *trainer-led* app?

- Per-activity record: route polyline, splits (per km/mile), elevation profile, HR stream,
  pace/speed stream, cadence, laps.
- Derived: GAP (grade-adjusted pace), moving vs elapsed time, best efforts/segments,
  training load / TSS-equivalent, HR drift / decoupling, VO2max trend.
- Swimming: pool (lap + SWOLF, no GPS) vs open water (GPS + stroke). Two builds.
- **Platform reality:** background geolocation on mobile web is unreliable; iOS Safari
  suspends it. Options: (a) native/PWA companion, (b) foreground-only "live" mode,
  (c) **import-only** — pull completed activities from Apple Health / Garmin / Strava rather
  than recording them ourselves. Option (c) is likely the highest value-to-cost ratio and
  should be pressure-tested first.
- Storage: polyline compression, retention policy, cost at scale.
- Offline: buffering when signal drops mid-activity.

---

## 6. Privacy, legal, and consent (largest under-specified risk)

- **Route data reveals home address.** Start/end points cluster at a residence. This has a
  documented real-world incident history (fitness heat-maps exposing sensitive sites, 2018).
  Mitigations: privacy zones / start-end obfuscation radius, default-private routes,
  explicit opt-in before any sharing.
- **Location is sensitive personal data** under GDPR/CCPA-class regimes, distinct from the
  workout data already handled.
- **Minors.** If SwanStudios has any client under 18, location tracking carries additional
  obligations. This must be settled before build, not after.
- **Rule 8 unchanged:** no PII into any LLM prompt. Route coordinates are PII. Swan Coach must
  reason over *derived* metrics (pace, HR, distance, elevation), never raw coordinates.
- **Community sharing:** the existing social surface must not become a location-disclosure
  vector. Default private; sharing is an explicit, per-activity act.
- **Trainer visibility:** does a trainer see a client's home-adjacent route? Consent model
  needed, distinct from workout-log visibility.

---

## 7. Strategic test (must be answered, not assumed)

SwanStudios is a **trainer-led B2B2C operating system**, not a fitness social network. Strava
owns route-social with a large network effect. The honest questions:

1. What does a *trainer* do with route data that Strava cannot? (Plausible: prescribe → verify
   adherence → adjust, inside one coaching relationship.)
2. Does this strengthen the Product Core Loop — log → chart → decide next action → share proof
   — or does it fork it?
3. Is **import** (own the coaching layer, let Garmin/Apple own capture) strictly better than
   **capture** for v1?
4. What is the smallest version that makes a trainer's next session better on Monday?

---

## 8. Surfaces requiring change (Sean's items 3–5, expanded)

- **Intake forms:** resting HR, known max HR, medication affecting HR, cardio history,
  activity preferences. Must feed the same PAR-Q-adjacent safety derivation.
- **Workout Planner:** cardio prescription alongside resistance work; HR/pace targets per
  interval; suppressed under the medical ceiling.
- **Workout Logger:** log a cardio session; import an activity; manual fallback.
- **Client charts:** HR trend, zone distribution, pace/VO2max progression, route map.
  Charts are Victory-only per house rules; a map is a new component class with its own
  licensing/cost question (tile provider).
- **Swan Coach:** must reason about zones, adherence, and drift — and must know when HR is
  meaningless for a client and pivot to RPE.
- **Trainer + admin dashboards:** adherence at a glance; who is drifting.

---

## 9. What we are asking Kimi to produce

1. A recommended HR-prescription model, with the safety interlock in §3 as a hard constraint.
2. A metric taxonomy for route activities: must-have / nice-to-have / vanity, judged for a
   trainer-led product rather than a social one.
3. A capture-vs-import recommendation for v1, given the web-platform constraint.
4. A privacy architecture for location data.
5. A phased build order with the smallest valuable first slice.
6. An honest read on §7 — including "don't build this" if that is the right answer.
