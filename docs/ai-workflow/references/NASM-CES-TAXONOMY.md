# NASM CES Corrective Exercise Taxonomy — SwanStudios Reference

**Owner:** Claude Opus 4.7
**Date:** 2026-05-03
**Status:** Reference document (V3b.2 — Codex Diff #12 requirement)
**Triggered by:** V3 spec §1.2.5 F16-F17 (Sean's "more corrective exercises" ask), AI Village 2026-05-03 NASM track HIGH ("CES 4-step process required"), Codex final-pass Diff #12 ("Add `docs/ai-workflow/references/NASM-CES-TAXONOMY.md`")

---

## 0. Why this document exists

When the workout-builder AI (Swan Coach) generates a plan, it must select corrective exercises that match the client's specific postural compensations identified through the Overhead Squat Assessment (OHSA). Without a documented taxonomy, the AI either:

1. Hallucinates corrective exercises that are not in our seeded registry (closed-set guarantee violation), or
2. Picks exercises that don't match the underlying postural distortion (clinically inappropriate).

This doc is the **canonical source of truth** for:
- The four primary NASM postural distortion patterns SwanStudios supports
- The 4-step CES protocol (Inhibit → Lengthen → Activate → Integrate)
- Which exercises in our registry are tagged for each compensation
- Sourcing rules and citation requirements for V3b.3 corrective seeder

**Authoritative sources:**
- NASM-CPT 7th Edition (2018) — Chapters 7-9 (Movement & Assessment)
- NASM Essentials of Corrective Exercise Training (NASM-CES, 2014)
- Cleveland Clinic — Postural Distortion Patterns clinical reference
- AAOS (American Academy of Orthopaedic Surgeons) — Movement assessment guidelines
- Peer-reviewed corrective-exercise meta-analyses (citation list at §6 below)

**Hard rule (Sean L7 + Codex Diff #12):** every corrective exercise we seed must cite a source from §6 OR be tagged for trainer review before promotion to the live registry. No "AI-knows-NASM" content.

---

## 1. The four primary NASM postural distortion patterns

NASM identifies five postural distortion patterns. SwanStudios V3b focuses on the four most clinically common; the fifth (combined) is composed of overlap between the others.

### 1.1 Upper Crossed Syndrome (UCS)

**Description:** Forward head posture + rounded shoulders + protracted scapulae. Tight pectorals, upper trapezius, levator scapulae, sternocleidomastoid; weak deep cervical flexors, mid/lower trapezius, rhomboids, serratus anterior.

**OHSA observable indicators:**
- Arms fall forward during overhead squat
- Forward head position (chin protrudes past sternum)
- Rounded shoulders / scapular winging at end-range overhead
- Excessive thoracic kyphosis

**4-step CES protocol:**

| Step | Targets | Example exercises (tagged in registry) |
|---|---|---|
| 1. Inhibit (SMR / foam roll) | pec major/minor, levator scapulae, upper trapezius, sternocleidomastoid, latissimus dorsi | Foam Roll Pec, Foam Roll Lat, Lacrosse Ball SCM, Foam Roll Upper Trap |
| 2. Lengthen (static stretch) | same muscles as inhibit | Doorway Pec Stretch, Levator Scap Stretch, Upper Trap Stretch, SCM Stretch, Lat Stretch |
| 3. Activate (isolated strengthening) | deep cervical flexors, mid/lower trap, rhomboids, serratus anterior | Chin Tuck, Wall Slides, Y-T-W on Stability Ball, Scapular Retraction, Prone Cobra, Serratus Punch |
| 4. Integrate (dynamic) | total kinetic chain in functional patterns | Squat to Row, Single-Leg Reach, Step-Up to Y-Press, Reverse Lunge to Overhead Reach |

**Compensation tag:** `nasmCorrectiveCategory: 'upper_crossed_syndrome'`

### 1.2 Lower Crossed Syndrome (LCS)

**Description:** Anterior pelvic tilt + excessive lumbar lordosis. Tight hip flexors (iliopsoas, rectus femoris), erector spinae, latissimus dorsi; weak gluteus maximus/medius, deep abdominal core (transverse abdominis), hamstrings.

**OHSA observable indicators:**
- Excessive low back arch during overhead squat
- Anterior pelvic tilt (belt line tilts forward)
- Knees bow outward as compensation (overlap with PDS)

**4-step CES protocol:**

| Step | Targets | Example exercises (tagged in registry) |
|---|---|---|
| 1. Inhibit | TFL, hip flexors (psoas/rectus), erectors, lats, adductors | Foam Roll TFL, Foam Roll Hip Flexor, Foam Roll Quad, Foam Roll Erector Spinae, Foam Roll Adductor |
| 2. Lengthen | hip flexors, erectors, lats, quads | Kneeling Hip Flexor Stretch, 90/90 Hip Stretch, Child's Pose, Cat-Cow, Couch Stretch |
| 3. Activate | gluteus maximus, gluteus medius, transverse abdominis, hamstrings | Glute Bridge, Single-Leg Bridge, Quadruped Hip Extension, Dead Bug, Bird Dog, Lateral Band Walks |
| 4. Integrate | core-stable squat and lunge patterns | Ball Squat to Row, Single-Leg Balance Reach, Step-Up with Knee Drive |

**Compensation tag:** `nasmCorrectiveCategory: 'lower_crossed_syndrome'`

### 1.3 Pronation Distortion Syndrome (PDS)

**Description:** Foot pronation + knee valgus (knees-cave-in) + tibial/femoral internal rotation. Tight peroneals, IT band, adductors, TFL; weak gluteus medius, posterior tibialis, anterior tibialis.

**OHSA observable indicators (Sean L9):**
- Knees cave inward during squat (most common)
- Feet flatten / arches collapse
- Feet turn outward (eversion / external rotation)

**4-step CES protocol:**

| Step | Targets | Example exercises (tagged in registry) |
|---|---|---|
| 1. Inhibit | peroneals, IT band, TFL, adductors, gastrocnemius, biceps femoris | Foam Roll Peroneal, Foam Roll IT Band, Foam Roll Calf, Foam Roll Adductor |
| 2. Lengthen | gastrocnemius/soleus, adductors, biceps femoris (lateral) | Gastrocnemius Stretch, Soleus Stretch, Adductor Stretch, Standing Hamstring Stretch |
| 3. Activate | gluteus medius, anterior tibialis, posterior tibialis | Single-Leg Balance, Lateral Band Walks, Tibialis Anterior Raise, Heel Drop, Short-Foot Activation |
| 4. Integrate | single-leg stance + squat patterns with controlled foot/knee tracking | Single-Leg Squat to Tap, Lateral Step-Up with Hip Drive, Lateral Lunge |

**Compensation tag:** `nasmCorrectiveCategory: 'pronation_distortion_syndrome'`

### 1.4 OHSA-specific compensations (Sean L9 explicit)

In addition to the three syndromes, SwanStudios tags individual OHSA observations so the AI can address them directly without forcing a full syndrome label:

| OHSA finding | Compensation tag | Primary corrective focus |
|---|---|---|
| Knees cave inward | `knees_cave` | Glute medius activation + adductor SMR |
| Knees bow outward | `knees_bow` | Adductor activation + TFL/IT band SMR |
| Excessive forward lean | `excessive_forward_lean` | Hip flexor SMR + glute activation + soleus mobility |
| Heels rise off ground | `heels_rise` | Gastrocnemius/soleus SMR + lengthen + tib-ant activation |
| Low back arches | `low_back_arch` | Hip flexor SMR + TVA activation + glute activation |
| Asymmetric weight shift | `asymmetric_shift` | Single-leg corrective work + unilateral activation |
| Forward head posture | `forward_head` | Cervical retraction + deep cervical flexor activation |
| Arms fall forward | `arms_fall_forward` | Pec/lat SMR + lengthen + lower trap activation (UCS subset) |

---

## 2. The 4-step CES protocol (Village CRITICAL)

Every active recovery day, every warmup, and every plan that targets a specific compensation MUST follow the Inhibit → Lengthen → Activate → Integrate sequence. The AI Village 2026-05-03 NASM track elevated this to CRITICAL.

| Step | Goal | Modality | Time per exercise |
|---|---|---|---|
| 1. Inhibit | Reduce overactive muscle tone via mechanical pressure | Self-Myofascial Release (foam roll, lacrosse ball, peanut) | 30-90 seconds |
| 2. Lengthen | Restore optimal muscle length | Static stretching (post-inhibit) or active-isolated stretching | 20-30 seconds × 2 sets |
| 3. Activate | Strengthen underactive antagonists / synergists | Isolated strengthening (low load, high-quality reps) | 10-15 reps × 2-4 sets |
| 4. Integrate | Re-pattern the kinetic chain in functional movement | Multi-joint dynamic movement | 10-15 reps × 2-3 sets |

**For Phase 1 (Stabilization Endurance) clients**, EVERY warmup includes at least one Inhibit + one Lengthen + one Activate exercise targeting the client's primary OHSA compensation.

**For Phase 2-3 clients**, the warmup compresses Inhibit + Lengthen into 1-2 SMR exercises plus 1 dynamic stretch, with Activate work moved into the main session as supersets.

**For Phase 4-5 clients**, corrective work shifts to dedicated active-recovery days (V3a `active_recovery` day type) since the strength/power demands of the main sessions require minimal warmup-time corrective work.

---

## 3. Mapping client `OHSA findings → AI corrective bias`

SwanStudios `clientIntelligenceService.movement.compensations` already exposes a list of compensation strings. V3b.3 will extend the schema so each compensation maps to a list of `nasmCorrectiveCategory` tags the AI must include in plan generation.

**Example mapping (for V3b.3 implementation):**

```json
{
  "movement": {
    "compensations": [
      { "type": "knees_cave_inward", "severity": "moderate" },
      { "type": "low_back_arch",     "severity": "mild" }
    ]
  }
}
```

→ AI receives sanitized DTO (per Village CRITICAL-3 sanitizer DTO):

```json
{
  "movementCompensations": [
    "pronation_distortion_syndrome",
    "knees_cave",
    "lower_crossed_syndrome",
    "low_back_arch"
  ]
}
```

→ AI MUST select corrective exercises tagged with at least one of those compensation labels for every warmup of every session in the plan. Closed-set guarantee enforces selection from the eligible registry slice only.

---

## 4. V3b.3 corrective seeder requirements

The corrective seeder slice (`backend/seeders/20260504-seed-nasm-corrective-comprehensive.mjs` — to be written in V3b.3) must:

### 4.1 Coverage targets

| Compensation tag | Target exercise count (split across Inhibit / Lengthen / Activate / Integrate) |
|---|---|
| upper_crossed_syndrome | ~30 (8 Inhibit / 8 Lengthen / 10 Activate / 4 Integrate) |
| lower_crossed_syndrome | ~30 (8 / 8 / 10 / 4) |
| pronation_distortion_syndrome | ~25 (6 / 6 / 9 / 4) |
| knees_cave | ~10 (subset of PDS — same exercises, different tag) |
| knees_bow | ~10 |
| forward_head | ~10 (subset of UCS) |
| low_back_arch | ~10 (subset of LCS) |
| heels_rise | ~10 |
| asymmetric_shift | ~10 |
| excessive_forward_lean | ~10 |

**Total estimated rows:** ~155 new exercises (subset overlap means real new-row count is closer to ~120 due to multi-tag entries).

### 4.2 Required exercise metadata fields

Every seeded corrective exercise row MUST include:

```js
{
  name: 'Foam Roll Pec',
  description: 'Self-myofascial release for the pectoralis major/minor.',
  instructions: '1. Lie face-down with foam roller under chest. 2. Roll slowly from sternum to shoulder. 3. Pause on tender spots for 30 seconds. 4. Switch sides.',
  exerciseType: 'injury_prevention',         // Phase 1 warmup / Phase 2-5 SMR
  bodyPartCategory: 'Recovery',
  primaryMuscles: ['Pectoralis Major'],
  secondaryMuscles: ['Pectoralis Minor'],
  equipmentNeeded: ['Foam Roller'],
  difficulty: 100,                            // low — most clients can do
  nasmCorrectiveCategory: ['upper_crossed_syndrome', 'forward_head', 'arms_fall_forward'],
  cesProtocolStep: 'inhibit',                 // 'inhibit' | 'lengthen' | 'activate' | 'integrate'
  contraindicationNotes: 'Avoid with acute shoulder impingement.',
  safetyTips: 'Move slowly; do not roll over rib cage.',
  recommendedSets: 1,
  recommendedReps: '30-60 seconds',           // duration-based for SMR
  restInterval: 30,
  source: 'NASM-CPT 7th ed. p. 312',          // CITATION REQUIRED — Sean L7
  isActive: true,
}
```

### 4.3 Citation rules (Sean L7 + Codex Diff #12)

Every new corrective row MUST cite an authoritative source. Allowed sources (each row picks ONE):

1. NASM-CPT 7th Edition (2018) — page reference
2. NASM-CES (2014) — chapter + page reference
3. Cleveland Clinic — public clinical reference URL or document ID
4. AAOS — guideline reference number
5. Peer-reviewed meta-analysis from §6 list

**Forbidden sources:**
- "GPT generated"
- "AI knows NASM"
- Personal trainer YouTube channels without medical credentialing
- Bodybuilding.com, T-Nation, generic fitness blogs

**Trainer review gate:** if a corrective exercise lacks a citation from the allowed list, it MUST be flagged `isActive: false` and surfaced to admin for manual review before going live. The seeder validates this at write time — uncited rows get rejected with a clear error.

---

## 5. Schema fields V3b.3 will add (Rule 58 schema-drift forecast)

V3b.3 adds the following fields to the `Exercise` Sequelize model + a migration:

| Field | Type | Notes |
|---|---|---|
| `nasmCorrectiveCategory` | `JSON` (array of strings) | Multi-tag (an exercise can correct multiple compensations) |
| `cesProtocolStep` | `STRING` enum | `'inhibit' \| 'lengthen' \| 'activate' \| 'integrate' \| null` |
| `source` | `STRING` | Citation reference; required for all `injury_prevention` / `injury_recovery` rows |

The migration is **strictly additive** (new columns, no field removal, no type change). No JSONB → column migration. No FK changes.

**Pre-V3b.3 verification (Codex Diff #8 / V3 T0):** before the migration runs, query production registry to confirm:
1. Total Exercise count
2. Exercise count by `exerciseType` and `bodyPartCategory`
3. Whether the `20260228-seed-nasm-comprehensive-exercises.mjs` seeder has run (e.g., does any row have name='Foam Roll Adductors'?)

---

## 6. Authoritative source list (citations the seeder is allowed to use)

### 6.1 NASM official

1. **NASM Essentials of Personal Fitness Training (NASM-CPT)** 7th ed., 2018 — Chapters 6 (Assessment), 7 (Training Concepts), 9 (Flexibility Training).
2. **NASM Essentials of Corrective Exercise Training (NASM-CES)**, 1st ed., 2014 — full text (Inhibit / Lengthen / Activate / Integrate methodology).
3. **NASM Optimum Performance Training Model** — official 5-phase framework documentation.

### 6.2 Clinical references

4. **Cleveland Clinic — Pronation/Supination clinical reference** (https://my.clevelandclinic.org/health/symptoms/22091-pronation)
5. **Cleveland Clinic — Forward Head Posture** (https://my.clevelandclinic.org/health/symptoms/...)
6. **AAOS — Common Knee Injuries** (https://orthoinfo.aaos.org/en/diseases--conditions/common-knee-injuries/)
7. **AAOS — Rotator Cuff Tears** (https://orthoinfo.aaos.org/en/diseases--conditions/rotator-cuff-tears/)

### 6.3 Peer-reviewed corrective-exercise meta-analyses

8. **Comerford & Mottram, Kinetic Control: The Management of Uncontrolled Movement** — Elsevier, 2012.
9. **Page, Frank, & Lardner — Assessment and Treatment of Muscle Imbalance: The Janda Approach** — Human Kinetics, 2010.
10. **Sahrmann — Diagnosis and Treatment of Movement Impairment Syndromes** — Mosby, 2002.
11. **Boyle — New Functional Training for Sports** — Human Kinetics, 2016.

### 6.4 SwanStudios in-repo references (for cross-linking from seeder rows)

12. **`docs/ai-workflow/references/NASM-OPT-PROTOCOL.md`** — internal SwanStudios reference for the OPT 5-phase model.
13. **This document** — `docs/ai-workflow/references/NASM-CES-TAXONOMY.md` (V3b.2).

---

## 7. Open questions for V3b.3 implementation

1. **Multi-tag exercise overlap:** how many exercises legitimately serve multiple compensations? (e.g., Foam Roll Adductors helps both LCS and PDS.) Decide if seeder dedupes by name or accepts duplicates with different tag arrays.
2. **Variation engine update:** `variationEngine.mjs` `categoryMap` currently maps `bodyPartCategory: 'recovery' → category: 'corrective'`. Should the corrective seeder rows use `bodyPartCategory: 'Corrective'` directly (cleaner), or stay on `'Recovery'` (backwards compat)?
3. **Trainer review queue:** when a seeder row lacks a citation, should the row land as `isActive: false` AND get added to a "pending review" admin surface, or just be rejected at seed time?
4. **Versioning:** if NASM publishes 8th edition, how do we handle citation updates? (Probably out of scope for V3b.3; flag as future review hook.)
5. **OHSA → compensation tagging:** the `clientIntelligenceService.movement.compensations` field today emits free-text strings. V3b.3 may need to tighten this to a closed enum matching `nasmCorrectiveCategory` values, OR the AI prompt sanitizer can do the mapping. Decide before V3b.3 starts.

---

## 8. Future review hooks (Rule 48 §10)

- [ ] Re-audit citation list when NASM publishes the 8th-edition CPT (rumored 2027).
- [ ] Verify the corrective registry holds up against AAOS guideline updates (annual).
- [ ] Trainer feedback loop: track which seeded corrective exercises are flagged "doesn't fit my client" most often; rotate those out of the eligible pool.
- [ ] Cleveland Clinic + AAOS URLs go stale — add a quarterly link-check task.
- [ ] When V3c lands the AI orchestration, this taxonomy becomes the closed-set guarantee Codex required (no AI-invented exercises). Re-confirm the guarantee holds at V3c review.

---

**End of NASM CES Taxonomy reference. V3b.3 corrective seeder will cite this doc by section number for every seeded row.**
