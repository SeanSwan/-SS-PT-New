# Exercise Database API & Source Research

**Date:** 2026-03-20
**Goal:** Build a self-hosted exercise database with 500+ exercises covering ALL equipment types. No runtime dependency on external APIs.

**Current State:** Only 10 exercises seeded in `backend/scripts/seedExercises.mjs`. The `Exercise` model (`backend/models/Exercise.mjs`) already supports: name, description, instructions, videoUrl, imageUrl, exerciseType, primaryMuscles, secondaryMuscles, difficulty, equipmentNeeded, coachingCues, contraindicationNotes, safetyTips, recommendedSets/Reps/Duration, restInterval, and gamification fields.

---

## PART 1: FREE EXERCISE APIs & OPEN-SOURCE DATABASES

### 1. Free Exercise DB (yuhonas/free-exercise-db) -- BEST FREE OPTION
- **URL:** https://github.com/yuhonas/free-exercise-db
- **Live Data:** https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json
- **Exercise Count:** 800+ exercises
- **License:** Public Domain (Unlicense)
- **Data Format (JSON):**
  ```json
  {
    "id": "Alternate_Incline_Dumbbell_Curl",
    "name": "Alternate Incline Dumbbell Curl",
    "force": "pull",
    "level": "beginner",
    "mechanic": "isolation",
    "equipment": "dumbbell",
    "primaryMuscles": ["biceps"],
    "secondaryMuscles": ["forearms"],
    "instructions": ["Step 1...", "Step 2..."],
    "category": "strength",
    "images": ["Alternate_Incline_Dumbbell_Curl/0.jpg", "Alternate_Incline_Dumbbell_Curl/1.jpg"]
  }
  ```
- **Bulk Download:** YES -- single `exercises.json` file, direct download from GitHub raw URL
- **Images:** YES -- hosted on GitHub, prefix path with `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/`
- **Verdict:** EXCELLENT starting point. Public domain, rich data, images included. Missing: video URLs, coaching cues, safety tips, difficulty score (has level but not numeric).

### 2. wrkout/exercises.json -- LARGEST FREE DATASET
- **URL:** https://github.com/wrkout/exercises.json
- **Exercise Count:** 2,500+ exercises
- **License:** Public Domain
- **Data Format:** Same schema as free-exercise-db (id, name, force, level, mechanic, equipment, primaryMuscles, secondaryMuscles, instructions, category, images)
- **Bulk Download:** YES -- `npm run build:json` generates combined file, or use raw GitHub URLs per exercise
- **PostgreSQL Export:** YES -- `npm run build:psql` generates SQL file for PostgreSQL directly
- **Images:** YES -- 10,000+ images showing muscles worked
- **Videos:** YES -- 3,500+ videos showing movements
- **Verdict:** BEST VOLUME. 2,500+ exercises with images AND videos. PostgreSQL SQL export is perfect for our Sequelize/PostgreSQL stack.

### 3. ExerciseDB API (Open Source v1) -- SELF-HOSTABLE
- **URL:** https://github.com/ExerciseDB/exercisedb-api
- **Docs:** https://www.exercisedb.dev/docs
- **Exercise Count:** 1,300+ exercises (open source version), 11,000+ (commercial version)
- **License:** MIT License (open source version)
- **Data Format:** JSON with bodyPart, equipment, gifUrl, id, name, target, secondaryMuscles, instructions
- **Bulk Download:** YES -- clone repo and self-host, or use the static dataset
- **Self-Hosting:** One-click Vercel deploy available
- **GIF Animations:** YES -- animated GIFs for each exercise
- **Verdict:** GOOD for GIF animations. MIT license allows commercial use. The 1,300 exercise open-source version is solid.

### 4. ExerciseDB Pro Dataset -- COMMERCIAL
- **URL:** https://github.com/exercisedb-pro/exercisedb-dataset
- **Exercise Count:** 1,500+ exercises
- **License:** Commercial license (requires purchase)
- **Data Format:** Structured JSON with muscles targeted, body part, equipment, instructions
- **Includes:** High-quality animated GIFs
- **Bulk Download:** YES (after purchase)
- **Verdict:** PAID option. Good quality but requires licensing fee. Skip unless we need premium GIFs.

### 5. ExerciseDB on RapidAPI -- API-ONLY (NOT RECOMMENDED)
- **URL:** https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
- **Exercise Count:** 11,000+
- **License:** Freemium (1,000 req/hour free, paid tiers $25-$150/mo)
- **Bulk Download:** NO -- API-only, rate limited
- **Verdict:** SKIP. Runtime dependency, rate limits, cost. Against our goal.

### 6. wger.de REST API -- OPEN SOURCE, SELF-HOSTABLE
- **URL:** https://wger.de/en/software/api
- **Docs:** https://wger.readthedocs.io/
- **GitHub:** https://github.com/wger-project/wger
- **Exercise Count:** 100+ exercises (community-contributed)
- **License:** AGPL-3.0 (copyleft -- must open-source derivative work if distributed as service)
- **Data Format:** REST API with JSON responses. Fields: name, description, muscles, equipment, category
- **Bulk Download:** YES -- self-host with Docker, then export. Or scrape the public API
- **Self-Hosting:** Full Docker deployment available
- **Verdict:** USEFUL for structure/schema reference. Lower exercise count than alternatives. AGPL license means we should only use the DATA (not the code) to avoid copyleft issues. Exercise data itself is community-contributed and likely CC-licensed.

### 7. Exercemus (Curated Merge) -- COMBINED DATASET
- **URL:** https://github.com/exercemus/exercises
- **Exercise Count:** Combined from wger.de + wrkout/exercises.json
- **License:** MIT License (code), exercises have their own licenses
- **Data Format:** `minified-exercises.json` with muscle_groups and exercises
- **Bulk Download:** YES -- single JSON file
- **Verdict:** GOOD shortcut. Pre-merged data from multiple sources under MIT license.

### 8. gainSON
- **URL:** https://github.com/MattiasHenders/gainSON
- **License:** Open source
- **Data Format:** JSON, generated via GUI tool
- **Verdict:** SMALLER dataset. Less documented. Lower priority.

### 9. ExRx.net Exercise API -- PAID COMMERCIAL
- **URL:** https://exrx.net/Store-2/Other/APIFAQ
- **Exercise Count:** 2,100+ exercises
- **License:** Commercial (Economy plan for free apps, Premium for full data)
- **Data Format:** JSON REST API with name, target muscle, apparatus, thumbnail, videos, instructions
- **Bulk Download:** NO -- API access only, requires license
- **Verdict:** GOLD STANDARD for exercise science accuracy but PAID. Economy plan may work for bootstrapping. Worth investigating pricing.

### 10. Kaggle Fitness Exercises Dataset
- **URL:** https://www.kaggle.com/datasets/exercisedb/fitness-exercises-dataset
- **License:** Varies by dataset
- **Bulk Download:** YES -- Kaggle download
- **Verdict:** CHECK for supplementary data.

---

## PART 2: PROGRAM-SPECIFIC EXERCISE LISTS

### P90X Complete Exercise Catalog (12 Workouts)

**NOTE:** P90X exercises are copyrighted by Beachbody/BODi. We can include the EXERCISE NAMES (factual) but NOT proprietary workout sequences, coaching scripts, or branding. We'll write our own descriptions and instructions.

#### Workout 1: Chest & Back
| # | Exercise | Equipment | Primary Muscles |
|---|----------|-----------|-----------------|
| 1 | Standard Push-Up | Bodyweight | Chest, Triceps |
| 2 | Wide Front Pull-Up | Pull-Up Bar | Lats, Biceps |
| 3 | Military Push-Up | Bodyweight | Chest, Triceps, Shoulders |
| 4 | Reverse Grip Chin-Up | Pull-Up Bar | Biceps, Lats |
| 5 | Wide Fly Push-Up | Bodyweight | Chest (outer) |
| 6 | Closed Grip Overhand Pull-Up | Pull-Up Bar | Lats, Forearms |
| 7 | Decline Push-Up | Bodyweight + Chair | Upper Chest |
| 8 | Heavy Pants (Bent-Over Row) | Dumbbells | Lats, Rhomboids |
| 9 | Diamond Push-Up | Bodyweight | Triceps, Inner Chest |
| 10 | Lawnmower (Single-Arm Row) | Dumbbell | Lats, Biceps |
| 11 | Dive-Bomber Push-Up | Bodyweight | Chest, Shoulders, Triceps |
| 12 | Back Fly | Dumbbells | Rear Delts, Rhomboids |

#### Workout 2: Plyometrics
| # | Exercise | Equipment | Primary Muscles |
|---|----------|-----------|-----------------|
| 1 | Jump Squat | Bodyweight | Quads, Glutes |
| 2 | Run-Stance Squat | Bodyweight | Quads, Glutes |
| 3 | Airborne Heisman | Bodyweight | Full Body, Cardio |
| 4 | Swing Kick | Bodyweight | Hip Flexors, Core |
| 5 | Squat Reach Jump | Bodyweight | Quads, Glutes, Shoulders |
| 6 | Run-Stance Squat Switch Pick-Up | Bodyweight | Quads, Glutes, Core |
| 7 | Double Airborne Heisman | Bodyweight | Full Body, Cardio |
| 8 | Circle Run | Bodyweight | Cardio, Agility |
| 9 | Jump Knee Tuck | Bodyweight | Quads, Core |
| 10 | Mary Katherine Lunge | Bodyweight | Quads, Glutes |
| 11 | Leapfrog Squat | Bodyweight | Quads, Glutes |
| 12 | Twist Combo | Bodyweight | Core, Obliques |
| 13 | Rock Star Hop | Bodyweight | Full Body |
| 14 | Gap Jump | Bodyweight | Quads, Calves |
| 15 | Squat Jack | Bodyweight | Quads, Glutes, Adductors |
| 16 | Military March | Bodyweight | Core, Hip Flexors |
| 17 | Hot Foot | Bodyweight | Calves, Agility |

#### Workout 3: Shoulders & Arms
| # | Exercise | Equipment | Primary Muscles |
|---|----------|-----------|-----------------|
| 1 | Alternating Shoulder Press | Dumbbells | Shoulders |
| 2 | In-Out Bicep Curl | Dumbbells | Biceps |
| 3 | Two-Arm Tricep Kickback | Dumbbells | Triceps |
| 4 | Deep Swimmer's Press | Dumbbells | Shoulders |
| 5 | Full Supination Concentration Curl | Dumbbell | Biceps |
| 6 | Chair Dip | Chair/Bench | Triceps |
| 7 | Upright Row | Dumbbells | Shoulders, Traps |
| 8 | Static Arm Curl | Dumbbells | Biceps |
| 9 | Flip-Grip Twist Tricep Kickback | Dumbbells | Triceps |
| 10 | Seated Two-Angle Shoulder Fly | Dumbbells | Shoulders |
| 11 | Crouching Cohen Curl | Dumbbells | Biceps |
| 12 | Lying-Down Tricep Extension | Dumbbells | Triceps |

#### Workout 5: Legs & Back
| # | Exercise | Equipment | Primary Muscles |
|---|----------|-----------|-----------------|
| 1 | Balanced Lunge | Bodyweight | Quads, Glutes |
| 2 | Calf-Raise Squat | Bodyweight | Quads, Calves |
| 3 | Reverse Grip Chin-Up | Pull-Up Bar | Biceps, Lats |
| 4 | Super Skater | Bodyweight | Glutes, Quads |
| 5 | Wall Squat | Bodyweight | Quads, Glutes |
| 6 | Wide Front Pull-Up | Pull-Up Bar | Lats |
| 7 | Step Back Lunge | Bodyweight | Quads, Glutes |
| 8 | Single Leg Wall Squat | Bodyweight | Quads |
| 9 | Closed Grip Overhand Pull-Up | Pull-Up Bar | Lats |
| 10 | Deadlift Squat | Dumbbells | Quads, Glutes, Hamstrings |
| 11 | Three-Way Lunge | Bodyweight | Quads, Glutes, Adductors |
| 12 | Sneaky Lunge | Bodyweight | Quads, Glutes |
| 13 | Toe Roll Iso Lunge | Bodyweight | Quads, Calves |
| 14 | Groucho Walk | Bodyweight | Quads, Glutes |
| 15 | 80/20 Siebers Speed Squat | Bodyweight | Quads, Glutes |

#### Workout 6: Kenpo X (Martial Arts Cardio)
| # | Exercise | Equipment | Primary Muscles |
|---|----------|-----------|-----------------|
| 1 | Jab-Cross | Bodyweight | Shoulders, Core |
| 2 | Jab-Cross-Hook | Bodyweight | Shoulders, Core, Obliques |
| 3 | Jab-Cross-Hook-Uppercut | Bodyweight | Full Upper Body |
| 4 | Jab-Cross-Switch | Bodyweight | Shoulders, Core |
| 5 | Front Kick | Bodyweight | Quads, Hip Flexors |
| 6 | Side Kick | Bodyweight | Glutes, Abductors |
| 7 | Roundhouse Kick | Bodyweight | Quads, Glutes, Core |
| 8 | Back Kick | Bodyweight | Glutes, Hamstrings |
| 9 | Three-Direction Kick | Bodyweight | Full Lower Body |
| 10 | Knee Strike | Bodyweight | Hip Flexors, Core |
| 11 | Elbow Strike | Bodyweight | Core, Shoulders |
| 12 | Star Block | Bodyweight | Full Body, Balance |

#### Ab Ripper X (11 exercises, 25 reps each)
| # | Exercise | Primary Muscles |
|---|----------|-----------------|
| 1 | In and Outs | Lower Abs |
| 2 | Bicycles | Obliques, Abs |
| 3 | Crunchy Frog | Core |
| 4 | Cross Leg/Wide Leg Sit-Ups | Abs |
| 5 | Fifer Scissors | Lower Abs, Hip Flexors |
| 6 | Hip Rock and Raise | Lower Abs |
| 7 | Pulse Ups (Heels to the Heavens) | Lower Abs |
| 8 | V-Up/Roll-Up | Full Abs |
| 9 | Oblique V-Ups | Obliques |
| 10 | Leg Climbs | Abs, Hip Flexors |
| 11 | Mason Twist | Obliques, Core |

#### Core Synergistics
Key exercises: Stacked Foot/Staggered Push-Up, Banana Roll, Leaning Crescent Lunges, Squat Run, Sphinx Push-Up, Bow-to-Boat, Low Lateral Skaters, Lunge Kickback Curl Press, Towel Hoppers, Reach High & Under Push-Ups, Steam Engine, Dreya Roll, Plank to Chaturanga Run, Walking Push-Up

#### Chest, Shoulders & Triceps (24 exercises)
Key exercises: Slow Motion 3-in-1 Push-Up, Y-Press, Lying Tricep Extension, Pike Press, Side Tri-Rise, Floor Fly, Scarecrow, Overhead Tricep Extension, Two-Twitch Speed Push-Up, Plange Push-Up, Clap/Plyo Push-Up

#### Back & Biceps
Key exercises: Wide Pull-Up, Lawnmower Row, Twenty-One Curls, One-Arm Cross-Body Curl, Switch Grip Pull-Up, Elbows-Out Lawnmower, Standing Bicep Curl, Corn Cob Pull-Up, Reverse Grip Bent-Over Row, Open Arm Curl, Towel Pull-Up, Congdon Curl, Hammer Curl

---

### Billy Blanks Tae Bo Exercise Catalog

**NOTE:** Tae Bo is a trademark of Billy Blanks. We include exercise move NAMES which are standard martial arts/fitness terminology.

#### Punching Techniques
| # | Exercise | Primary Muscles | Notes |
|---|----------|-----------------|-------|
| 1 | Jab | Shoulders, Triceps | Quick front-arm extension |
| 2 | Cross (Rear Punch) | Shoulders, Core, Triceps | Power from rear leg pivot |
| 3 | Hook | Obliques, Shoulders | Circular front-hand motion |
| 4 | Uppercut | Biceps, Shoulders, Core | Upward circular motion |
| 5 | Speed Bag | Shoulders, Rotator Cuff | Circular arm motion overhead |
| 6 | Double Jab | Shoulders, Triceps | Two quick jabs |
| 7 | Jab-Cross Combo | Full Upper Body | Basic 1-2 combination |

#### Kicking Techniques
| # | Exercise | Primary Muscles | Notes |
|---|----------|-----------------|-------|
| 1 | Front Kick | Quads, Hip Flexors | Knee-heel extension forward |
| 2 | Side Kick | Glutes, Abductors | Lateral knee-heel extension |
| 3 | Roundhouse Kick | Quads, Glutes, Core | Rotating hip kick |
| 4 | Back Kick | Glutes, Hamstrings | Rear extension |
| 5 | Knee Strike | Hip Flexors, Core | Driving knee upward |
| 6 | Double Front Kick | Quads, Core | Two kicks same leg |
| 7 | Crescent Kick | Hip Flexors, Adductors | Arcing kick |

#### Combination Movements
| # | Exercise | Type |
|---|----------|------|
| 1 | Jab-Cross-Front Kick | Combo |
| 2 | Jab-Cross-Hook-Roundhouse | Combo |
| 3 | Speed Bag with Knee | Combo |
| 4 | Shuffle Punch Combo | Cardio + Striking |
| 5 | Jumping Jack with Jabs | Cardio + Striking |
| 6 | Squat Thrust with Kicks | Full Body |

---

### Squat University / Dr. Aaron Horschig Exercises

#### Mobility Exercises
| # | Exercise | Target | Equipment |
|---|----------|--------|-----------|
| 1 | Ankle Dorsiflexion Stretch | Ankle Mobility | Wall |
| 2 | Banded Ankle Mobilization | Ankle Mobility | Resistance Band |
| 3 | Hip 90/90 Stretch | Hip Mobility | Bodyweight |
| 4 | Pigeon Stretch | Hip Mobility | Bodyweight |
| 5 | Couch Stretch | Hip Flexor | Wall/Couch |
| 6 | Thoracic Spine Extension (Foam Roller) | T-Spine Mobility | Foam Roller |
| 7 | Cat-Cow | Spine Mobility | Bodyweight |
| 8 | World's Greatest Stretch | Full Body Mobility | Bodyweight |
| 9 | Deep Squat Hold | Hip/Ankle Mobility | Bodyweight |

#### Squat Variations
| # | Exercise | Equipment | Focus |
|---|----------|-----------|-------|
| 1 | Bodyweight Squat | None | Foundation |
| 2 | Goblet Squat | Dumbbell/KB | Learning mechanics |
| 3 | Front Squat | Barbell | Quad-dominant, upright torso |
| 4 | Back Squat (High Bar) | Barbell | Quad emphasis |
| 5 | Back Squat (Low Bar) | Barbell | Posterior chain emphasis |
| 6 | Overhead Squat | Barbell | Full body mobility test |
| 7 | Box Squat | Barbell + Box | Posterior chain, depth control |
| 8 | Pause Squat | Barbell | Strength out of hole |
| 9 | Tempo Squat | Barbell | Time under tension |
| 10 | Anderson Squat (Pin Squat) | Barbell + Rack | Concentric strength |
| 11 | Zercher Squat | Barbell | Core, upper back |
| 12 | Bulgarian Split Squat | Dumbbells + Bench | Single-leg strength |
| 13 | Pistol Squat | Bodyweight | Single-leg balance/strength |
| 14 | Cossack Squat | Bodyweight | Lateral mobility |

#### Corrective Exercises
| # | Exercise | Addresses |
|---|----------|-----------|
| 1 | Banded Squat | Knee valgus |
| 2 | Goblet Squat with Pause | Depth issues |
| 3 | Wall-Facing Squat | Forward lean |
| 4 | Heel-Elevated Squat | Ankle mobility deficit |
| 5 | TFL/IT Band Foam Roll | Lateral knee pain |
| 6 | Glute Bridge | Glute activation |
| 7 | Single-Leg Glute Bridge | Asymmetry correction |
| 8 | Dead Bug | Core stability |
| 9 | Bird Dog | Core/hip stability |

---

## PART 3: EQUIPMENT-SPECIFIC EXERCISE CATALOGS

### Resistance Band Exercises (~40 exercises)
**Chest:** Band Chest Press, Band Chest Fly, Band Push-Up (banded), Band Crossover
**Back:** Band Pull-Apart, Band Seated Row, Band Lat Pulldown, Band Face Pull, Band Bent-Over Row, Band Straight-Arm Pulldown
**Shoulders:** Band Lateral Raise, Band Front Raise, Band Overhead Press, Band Upright Row, Band Rear Delt Fly, Band Shoulder Shrug
**Arms:** Band Bicep Curl, Band Hammer Curl, Band Tricep Extension, Band Tricep Pushdown, Band Concentration Curl
**Legs:** Band Squat, Band Deadlift, Band Glute Bridge, Band Hip Thrust, Band Lateral Walk, Band Monster Walk, Band Clamshell, Band Leg Press, Band Romanian Deadlift, Band Good Morning
**Core:** Band Pallof Press, Band Woodchop, Band Rotation, Band Ab Crunch

### Dumbbell Exercises (~60 exercises)
**Chest:** DB Bench Press, DB Incline Press, DB Decline Press, DB Fly, DB Incline Fly, DB Pullover, DB Floor Press
**Back:** DB Row, DB Single-Arm Row, DB Bent-Over Row, DB Reverse Fly, DB Pullover, DB Shrug, DB Renegade Row
**Shoulders:** DB Overhead Press, DB Arnold Press, DB Lateral Raise, DB Front Raise, DB Rear Delt Fly, DB Upright Row, DB Shrug, DB Scarecrow
**Arms:** DB Bicep Curl, DB Hammer Curl, DB Concentration Curl, DB Preacher Curl, DB Incline Curl, DB Tricep Kickback, DB Overhead Tricep Extension, DB Skull Crusher, DB Wrist Curl
**Legs:** DB Goblet Squat, DB Lunge, DB Bulgarian Split Squat, DB Romanian Deadlift, DB Step-Up, DB Sumo Squat, DB Calf Raise, DB Single-Leg Deadlift, DB Hip Thrust
**Core:** DB Russian Twist, DB Side Bend, DB Woodchop, DB Weighted Sit-Up, DB Farmer's Walk

### Cable Machine Exercises (~45 exercises)
**Chest:** Cable Chest Fly, Cable Crossover, Cable Chest Press, Cable Low-to-High Fly, Cable High-to-Low Fly
**Back:** Cable Seated Row, Cable Lat Pulldown, Cable Straight-Arm Pulldown, Cable Face Pull, Cable Single-Arm Row, Cable Reverse Fly
**Shoulders:** Cable Lateral Raise, Cable Front Raise, Cable Rear Delt Fly, Cable Upright Row, Cable Shoulder Press, Cable External Rotation, Cable Internal Rotation
**Arms:** Cable Bicep Curl, Cable Hammer Curl, Cable Preacher Curl, Cable Tricep Pushdown, Cable Overhead Tricep Extension, Cable Rope Tricep Extension, Cable Cross-Body Curl
**Legs:** Cable Hip Abduction, Cable Hip Adduction, Cable Kickback (Glute), Cable Pull-Through, Cable Romanian Deadlift, Cable Squat
**Core:** Cable Woodchop, Cable Pallof Press, Cable Crunch, Cable Oblique Twist, Cable Reverse Crunch

### Kettlebell Exercises (~35 exercises)
**Foundational:** KB Swing (Two-Hand), KB Swing (Single-Arm), KB Clean, KB Press, KB Snatch, Turkish Get-Up, KB Goblet Squat
**Upper Body:** KB Floor Press, KB Row, KB Halo, KB Windmill, KB Bottoms-Up Press, KB Push Press
**Lower Body:** KB Deadlift, KB Sumo Deadlift, KB Lunge, KB Front Squat, KB Single-Leg Deadlift, KB Pistol Squat, KB Step-Up
**Full Body:** KB Thruster, KB Clean and Press, KB Clean and Jerk, KB Long Cycle, KB Man Maker
**Core:** KB Russian Twist, KB Side Bend, KB Farmer's Walk, KB Suitcase Carry, KB Racked Walk, KB Around the World
**Cardio:** KB Swing HIIT, KB Snatch Test

### Stability Ball Exercises (~30 exercises)
**Core:** Ball Crunch, Ball Oblique Crunch, Ball Pike, Ball Roll-Out, Ball Plank, Ball Knee Tuck, Ball Pass (V-Up), Ball Russian Twist, Ball Dead Bug, Ball Stir the Pot
**Chest:** Ball Push-Up, Ball Chest Press (DB), Ball Fly (DB), Ball Chest Squeeze
**Back:** Ball Back Extension, Ball Reverse Fly, Ball Superman, Ball I-Y-T Raises
**Legs:** Ball Wall Squat, Ball Hamstring Curl, Ball Glute Bridge, Ball Hip Thrust, Ball Single-Leg Curl, Ball Lunge (rear foot on ball)
**Shoulders:** Ball Shoulder Press (DB), Ball Lateral Raise (DB)
**Flexibility:** Ball Chest Stretch, Ball Hip Flexor Stretch, Ball Spinal Extension

### Medicine Ball Exercises (~30 exercises)
**Explosive/Power:** Med Ball Slam, Med Ball Overhead Throw, Med Ball Chest Pass, Med Ball Rotational Throw, Med Ball Side Slam, Med Ball Scoop Toss
**Core:** Med Ball Russian Twist, Med Ball Woodchop, Med Ball V-Up, Med Ball Sit-Up Throw, Med Ball Plank Drag, Med Ball Mountain Climber
**Upper Body:** Med Ball Push-Up, Med Ball Overhead Press, Med Ball Tricep Extension
**Lower Body:** Med Ball Squat, Med Ball Lunge with Twist, Med Ball Wall Ball (Squat + Throw), Med Ball Step-Up
**Partner:** Med Ball Partner Chest Pass, Med Ball Partner Rotational Pass, Med Ball Partner Sit-Up Throw
**Wall Drills:** Med Ball Wall Slam, Med Ball Wall Chest Pass, Med Ball Wall Rotational Throw, Med Ball Wall Ball Shuffle

### Landmine Exercises (~20 exercises)
**Press:** Landmine Press, Landmine Single-Arm Press, Landmine Half-Kneeling Press, Landmine Rotational Press, Landmine Floor Press
**Row:** Landmine Row (T-Bar Row), Landmine Meadows Row, Landmine Single-Arm Row
**Squat/Lunge:** Landmine Squat, Landmine Goblet Squat, Landmine Reverse Lunge, Landmine Lateral Lunge, Landmine Hack Squat
**Hinge:** Landmine Romanian Deadlift, Landmine Single-Leg RDL
**Core/Rotation:** Landmine Rotation (Russian Twist), Landmine Anti-Rotation, Landmine Rainbow
**Full Body:** Landmine Thruster, Landmine Clean and Press

### Bodyweight/Calisthenics Exercises (~50 exercises)
**Push (Horizontal):** Push-Up, Wide Push-Up, Diamond Push-Up, Decline Push-Up, Incline Push-Up, Pike Push-Up, Archer Push-Up, Clap Push-Up, Hindu Push-Up, Dive-Bomber Push-Up, Pseudo-Planche Push-Up
**Push (Vertical):** Handstand Push-Up (Wall), Pike Push-Up (elevated), Dip (parallel bars), Bench Dip
**Pull (Horizontal):** Inverted Row, Bodyweight Row (TRX/Ring)
**Pull (Vertical):** Pull-Up, Chin-Up, Wide-Grip Pull-Up, Close-Grip Pull-Up, Commando Pull-Up, Muscle-Up, Hanging Leg Raise
**Squat:** Bodyweight Squat, Prisoner Squat, Jump Squat, Pistol Squat, Cossack Squat, Sissy Squat, Hindu Squat, Shrimp Squat, Wall Sit
**Hinge:** Single-Leg Romanian Deadlift (BW), Glute Bridge, Hip Thrust (BW), Nordic Hamstring Curl
**Lunge:** Forward Lunge, Reverse Lunge, Walking Lunge, Lateral Lunge, Curtsy Lunge, Bulgarian Split Squat (BW), Jump Lunge
**Core:** Plank, Side Plank, Hollow Body Hold, Superman, Dead Bug, Bird Dog, Mountain Climber, Bicycle Crunch, Leg Raise, Flutter Kick, V-Up, L-Sit
**Cardio/Explosive:** Burpee, Jumping Jack, High Knees, Butt Kicks, Box Jump, Broad Jump, Bear Crawl, Crab Walk, Inchworm

### Machine Exercises (~35 exercises)
**Chest:** Machine Chest Press, Machine Incline Press, Pec Deck (Chest Fly Machine), Smith Machine Bench Press
**Back:** Lat Pulldown Machine, Seated Row Machine, Assisted Pull-Up Machine, T-Bar Row Machine, Back Extension Machine
**Shoulders:** Machine Shoulder Press, Reverse Pec Deck (Rear Delt), Smith Machine Overhead Press, Lateral Raise Machine
**Arms:** Machine Bicep Curl, Machine Preacher Curl, Machine Tricep Extension, Cable Rope Pushdown
**Legs:** Leg Press, Hack Squat Machine, Leg Extension, Leg Curl (Lying), Leg Curl (Seated), Smith Machine Squat, Hip Adductor Machine, Hip Abductor Machine, Standing Calf Raise Machine, Seated Calf Raise, Glute Kickback Machine
**Core:** Ab Crunch Machine, Rotary Torso Machine
**Cardio Machines:** Treadmill, Elliptical, Stationary Bike, Rowing Machine, Stair Climber

### Cardio Exercises (~25 exercises)
**Running:** Steady-State Run, Interval Sprints, Hill Sprints, Tempo Run, Fartlek Run
**Cycling:** Steady-State Cycling, Interval Cycling, Hill Climb Cycling, Spin Class
**Rowing:** Steady-State Row, Interval Row, Rowing Sprint
**Jump Rope:** Single-Unders, Double-Unders, Alternating Foot Jump, Criss-Cross, Boxer Step
**Other:** Swimming (Freestyle), Swimming (Backstroke), Stair Climbing, Battle Ropes, Sled Push, Sled Pull, Farmer's Walk (Cardio)

---

## PART 4: RECOMMENDED STRATEGY

### Phase 1: Seed from Free Sources (Target: 500+ exercises)
1. **Download `wrkout/exercises.json`** -- 2,500+ exercises with images/videos, public domain, PostgreSQL export built in
2. **Download `yuhonas/free-exercise-db`** -- 800+ exercises, cross-reference and merge unique ones
3. **Download `exercemus/exercises`** -- Pre-curated merge, use as validation

### Phase 2: Enrich with Program-Specific Exercises
4. **Add P90X exercises** listed above (~120 unique exercises) with our own descriptions/instructions
5. **Add Tae Bo/kickboxing exercises** (~20 unique exercises)
6. **Add Squat University corrective/mobility exercises** (~25 unique exercises)

### Phase 3: Fill Equipment Gaps
7. Cross-reference against equipment categories in our Equipment model:
   - `free_weight` (barbell, dumbbell)
   - `machine` (gym machines)
   - `bodyweight`
   - `cable`
   - `cardio`
   - `resistance_band`
   - `kettlebell`
   - `medicine_ball`
   - `stability` (stability ball, BOSU)
   - `other` (landmine, TRX, foam roller)
8. Add missing exercises from the catalogs in Part 3

### Phase 4: Map to Our Schema
Transform external data to match our `Exercise` model fields:
```
External Field    -> Our Field
name              -> name
instructions[]    -> instructions (joined with \n)
primaryMuscles[]  -> primaryMuscles (JSON array)
secondaryMuscles[]-> secondaryMuscles (JSON array)
equipment         -> equipmentNeeded (JSON array)
level             -> difficulty (map: beginner=100, intermediate=300, expert=500)
category          -> exerciseType (map: strength->compound/isolation, stretching->flexibility, etc.)
images[]          -> imageUrl (first image or hosted copy)
force             -> (new field or metadata)
mechanic          -> (map: compound/isolation -> exerciseType)
```

### Estimated Total Exercise Count
| Source | Unique Exercises |
|--------|-----------------|
| wrkout/exercises.json | ~2,500 |
| free-exercise-db (unique additions) | ~100 |
| P90X program exercises | ~120 |
| Tae Bo/Kickboxing | ~20 |
| Squat University | ~25 |
| Manual equipment-specific additions | ~50 |
| **TOTAL** | **~2,800+** |

### Build Script Requirements
Create `backend/scripts/seedExerciseLibrary.mjs` that:
1. Downloads JSON from GitHub raw URLs (or reads local cache)
2. Deduplicates by exercise name (case-insensitive)
3. Maps external fields to our Exercise model schema
4. Uses upsert-by-name pattern (don't duplicate on re-run)
5. Creates Equipment records for referenced equipment
6. Creates MuscleGroup records for referenced muscles
7. Links via ExerciseMuscleGroup and ExerciseEquipment junction tables
8. Logs stats: total imported, skipped (duplicate), failed

### License Summary
| Source | License | Commercial Use | Bulk Download |
|--------|---------|---------------|---------------|
| wrkout/exercises.json | Public Domain | YES | YES (npm build + PostgreSQL export) |
| yuhonas/free-exercise-db | Unlicense (Public Domain) | YES | YES (single JSON) |
| ExerciseDB v1 (open source) | MIT | YES | YES (clone repo) |
| exercemus | MIT | YES | YES (single JSON) |
| wger.de | AGPL-3.0 (code), CC (data) | Data YES, Code NO | YES (Docker self-host) |
| ExRx.net | Commercial | Requires license | NO (API only) |
| ExerciseDB Pro | Commercial | Requires purchase | YES (after purchase) |
| P90X exercise names | Fair use (factual) | Names YES, content NO | N/A (manual entry) |

---

## PART 5: IMMEDIATE NEXT STEPS

1. **Clone wrkout/exercises.json** and run `npm run build:json` to get combined dataset
2. **Download** `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
3. **Write import script** that maps to our Exercise model
4. **Add NASM exerciseType mapping** -- our model has NASM-specific types (core, balance, stability, flexibility, calisthenics, isolation, stabilizers, injury_prevention, injury_recovery, compound) that need intelligent mapping from generic categories
5. **Consider adding exerciseType ENUM values** -- current ENUM is NASM-focused. May need: `cardio`, `plyometric`, `martial_arts`, `stretching`, `olympic_lift`, `powerlifting` to cover all program types
6. **Host images on R2** -- don't hotlink GitHub. Download images and upload to Cloudflare R2 (we already use R2 for photo uploads)
