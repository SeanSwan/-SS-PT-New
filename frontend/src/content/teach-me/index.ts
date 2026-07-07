/**
 * Teach Me Content — Comprehensive educational content for all features.
 * Used by the TeachMeToggle component across admin and trainer dashboards.
 *
 * AI Village validated (14-Brain, 44 web sources, $0.15).
 * Content follows progressive disclosure: essential info first, details expandable.
 */

export const TEACH_ME_CONTENT: Record<string, { title: string; content: string }> = {
  // ─── Assessment Tools ────────────────────────────────────────
  rom: {
    title: 'How to Measure ROM with a Goniometer',
    content: `
      <strong>Setup:</strong> Place the fulcrum (center pivot) on the joint center.
      Align the stationary arm with the proximal bone. The moving arm follows the distal bone.
      <br/><br/>
      <strong>Hip Flexion Example:</strong><br/>
      Client: supine (face up)<br/>
      Fulcrum: greater trochanter (bony side of hip)<br/>
      Stationary arm: along torso (parallel to table)<br/>
      Moving arm: along femur (thigh)<br/>
      Normal: 120°
      <br/><br/>
      <strong>Common Mistakes:</strong>
      <ul>
        <li>Not stabilizing the pelvis (client compensates by tilting)</li>
        <li>Misaligning the fulcrum (too high or too low on the joint)</li>
        <li>Forcing past pain — STOP at first sign of sharp pain</li>
        <li>Not measuring both sides for asymmetry comparison</li>
      </ul>
      <strong>When to Refer Out:</strong> If ROM is severely limited (<60% of normal) or causes sharp/radiating pain, refer to a physical therapist or physician before programming exercises for that joint.
    `,
  },

  bloodPressure: {
    title: 'How to Take Blood Pressure',
    content: `
      <strong>Setup:</strong> Client seated for at least 5 minutes, feet flat on floor, back supported.
      Use left arm at heart level. Correct cuff size (bladder covers 80% of arm circumference).
      <br/><br/>
      <strong>Procedure:</strong>
      <ol>
        <li>Wrap cuff snugly 1 inch above elbow crease</li>
        <li>Place stethoscope bell over brachial artery (inner elbow)</li>
        <li>Inflate to 180 mmHg (or 30 above expected systolic)</li>
        <li>Release at 2-3 mmHg per second</li>
        <li>First sound = systolic. Sound disappears = diastolic</li>
      </ol>
      <strong>What the Numbers Mean:</strong>
      <ul>
        <li><strong>Normal:</strong> <120/80 mmHg</li>
        <li><strong>Elevated:</strong> 120-129/<80</li>
        <li><strong>Stage 1 Hypertension:</strong> 130-139/80-89</li>
        <li><strong>Stage 2 Hypertension:</strong> ≥140/≥90 — refer to physician</li>
      </ul>
      <strong>Red Flag:</strong> If BP > 180/120, do NOT exercise. Send client to urgent care.
    `,
  },

  bodyFat: {
    title: 'How to Measure Body Fat % (Skin Calipers)',
    content: `
      <strong>3-Site Protocol (Jackson-Pollock):</strong>
      <br/><br/>
      <strong>Men:</strong> Chest (diagonal fold), Abdomen (vertical fold, 1" right of navel), Thigh (vertical fold, midway between hip and knee)
      <br/>
      <strong>Women:</strong> Tricep (vertical fold, back of upper arm), Suprailiac (diagonal fold, above hip bone), Thigh (same as men)
      <br/><br/>
      <strong>How to Pinch:</strong>
      <ol>
        <li>Pinch skin fold with thumb and index finger (lift skin + fat, NOT muscle)</li>
        <li>Place caliper jaws 1 cm below your fingers</li>
        <li>Release caliper handles — wait 2 seconds</li>
        <li>Read measurement in mm</li>
        <li>Take 3 readings per site, use the average</li>
      </ol>
      <strong>Body Fat % Ranges (Men/Women):</strong>
      <ul>
        <li><strong>Essential:</strong> 2-5% / 10-13%</li>
        <li><strong>Athletic:</strong> 6-13% / 14-20%</li>
        <li><strong>Fitness:</strong> 14-17% / 21-24%</li>
        <li><strong>Average:</strong> 18-24% / 25-31%</li>
        <li><strong>Obese:</strong> 25%+ / 32%+</li>
      </ul>
    `,
  },

  heartRate: {
    title: 'How to Measure Resting Heart Rate',
    content: `
      <strong>Method 1 — Radial Pulse (Wrist):</strong>
      <ol>
        <li>Client seated, relaxed for 5 minutes</li>
        <li>Place index + middle finger on radial artery (thumb side of wrist)</li>
        <li>Count beats for 60 seconds (most accurate)</li>
        <li>Alternative: count for 15 seconds × 4</li>
      </ol>
      <strong>Method 2 — Carotid Pulse (Neck):</strong>
      Place fingers on the side of the neck, next to the trachea. Light pressure only — pressing too hard can trigger a vagal response.
      <br/><br/>
      <strong>Resting HR Ranges:</strong>
      <ul>
        <li><strong>Athlete:</strong> 40-60 bpm</li>
        <li><strong>Excellent:</strong> 60-65 bpm</li>
        <li><strong>Good:</strong> 65-75 bpm</li>
        <li><strong>Average:</strong> 75-85 bpm</li>
        <li><strong>Below Average:</strong> 85-100 bpm</li>
        <li><strong>Refer to physician:</strong> >100 bpm resting (tachycardia)</li>
      </ul>
      <strong>Target HR Zones (Karvonen Formula):</strong><br/>
      <code>THR = ((HRmax - HRrest) × %intensity) + HRrest</code><br/>
      <code>HRmax = 220 - age</code>
    `,
  },

  // ─── Workout Tools ───────────────────────────────────────────
  workoutPlanner: {
    title: 'How to Build a NASM-Protocol Workout',
    content: `
      <strong>NASM OPT Model — 5 Phases:</strong>
      <ul>
        <li><strong>Phase 1 (Stabilization):</strong> 12-20 reps, 1-3 sets, tempo 4/2/1, rest 0-90s. Focus: balance, core, controlled movement.</li>
        <li><strong>Phase 2 (Strength Endurance):</strong> 8-12 reps, 2-4 sets, tempo 2/0/2, rest 0-60s. Supersets: stable + unstable.</li>
        <li><strong>Phase 3 (Hypertrophy):</strong> 6-12 reps, 3-5 sets, tempo 2/0/2, rest 0-60s. Focus: muscle growth.</li>
        <li><strong>Phase 4 (Max Strength):</strong> 1-5 reps, 4-6 sets, tempo X/0/X, rest 3-5 min. Heavy compound lifts.</li>
        <li><strong>Phase 5 (Power):</strong> 1-5 reps strength + 8-10 reps power, 3-6 sets. Supersets: heavy + explosive.</li>
      </ul>
      <strong>Workout Structure (NASM Order):</strong>
      <ol>
        <li><strong>Warm-Up:</strong> 5-10 min cardio + foam roll + stretch</li>
        <li><strong>Core/Balance:</strong> 1-2 exercises</li>
        <li><strong>Plyometrics</strong> (Phase 5 only)</li>
        <li><strong>Resistance Training:</strong> 4-8 exercises following phase variables</li>
        <li><strong>Cool-Down:</strong> Stretch major muscle groups used</li>
      </ol>
      <strong>Tempo Notation:</strong> Eccentric/Isometric/Concentric (e.g., 4/2/1 = 4s lowering, 2s hold, 1s lifting)
    `,
  },

  workoutLogger: {
    title: 'How to Log a Workout Session',
    content: `
      <strong>During the Session:</strong>
      <ol>
        <li>Open the planned workout or create a new log</li>
        <li>For each exercise, record actual reps and weight per set</li>
        <li>If the client can't complete planned reps, log what they actually did</li>
        <li>If you add an unplanned exercise, use the Exercise Rolodex to find it</li>
        <li>Note RPE (1-10) if the client can communicate effort level</li>
      </ol>
      <strong>After the Session:</strong>
      <ul>
        <li>You can go back and edit any workout from the history timeline</li>
        <li>Fix reps, weights, add/remove exercises and sets</li>
        <li>Add session notes about the client's performance, tightness, or pain</li>
      </ul>
      <strong>Planned vs Actual:</strong>
      If a workout was planned, the log shows target reps/weight. After logging, you can compare what was planned vs what actually happened.
    `,
  },

  movementAnalysis: {
    title: 'How to Perform the NASM Overhead Squat Assessment',
    content: `
      <strong>Setup:</strong> Client stands feet shoulder-width apart, toes forward, arms overhead.
      <br/><br/>
      <strong>Instructions:</strong> "Squat down as if sitting in a chair, keeping arms overhead. Do 5 reps at a comfortable pace."
      <br/><br/>
      <strong>5 Checkpoints (Anterior View):</strong>
      <ol>
        <li><strong>Feet:</strong> Do they turn out? Do arches flatten?</li>
        <li><strong>Knees:</strong> Do they cave inward (valgus)? Bow out (varus)?</li>
      </ol>
      <strong>4 Checkpoints (Lateral View):</strong>
      <ol start="3">
        <li><strong>LPHC:</strong> Excessive forward lean? Low back arch?</li>
        <li><strong>Arms:</strong> Do they fall forward?</li>
        <li><strong>Head:</strong> Forward head posture?</li>
      </ol>
      <strong>Scoring:</strong> Each checkpoint: None (100), Minor (70), Significant (40). Average all 9 = NASM Score (0-100).
      <br/><br/>
      <strong>What It Tells You:</strong> Identifies muscle imbalances → guides corrective exercise strategy (Inhibit → Lengthen → Activate → Integrate).
    `,
  },

  onboarding: {
    title: 'How to Onboard a New Client',
    content: `
      <strong>Via AI Coach (Fastest):</strong>
      <ol>
        <li>Open the Coach Assistant</li>
        <li>Tell it about the new client: name, age, goals, health concerns, and whether they're Move Fitness (free) or SwanStudios (paid)</li>
        <li>The AI creates the account, pre-fills onboarding, and generates a SWAN-XXXX claim code</li>
        <li>Send the claim URL to the client via text or email</li>
        <li>Client activates their account and completes remaining onboarding sections</li>
      </ol>
      <strong>Move Fitness vs SwanStudios:</strong>
      <ul>
        <li><strong>Move Fitness:</strong> Free tier. Workouts logged for tracking only. No session deduction. Perfect for gym clients you're training through your employer.</li>
        <li><strong>SwanStudios:</strong> Paid tier. Sessions are deducted after each completed workout. Full session management.</li>
      </ul>
    `,
  },

  // ─── Bootcamp Builder ────────────────────────────────────────

  bootcampFormats: {
    title: 'Class Formats — Complete Guide',
    content: `
      <strong>STATION-BASED FORMATS</strong> — Participants rotate between stations. Each station has a fixed set of exercises.
      <br/><br/>

      <strong>4×N Stations (Most Popular)</strong><br/>
      <em>What:</em> 4 exercises per station, 35 seconds each, 15 seconds transition between exercises.<br/>
      <em>How to run it:</em>
      <ol>
        <li>Set up 4-6 stations around the room with equipment pre-placed</li>
        <li>Demo ALL exercises first (walk through each station, 30 seconds per station)</li>
        <li>Assign groups to starting stations</li>
        <li>Timer: 35 seconds work → 15 seconds transition (within station) → repeat × 4 exercises</li>
        <li>After all 4 exercises at a station, 30 seconds to rotate to next station</li>
        <li>Complete 2-3 full rotations through all stations</li>
      </ol>
      <em>Total time per station:</em> (35+15) × 4 = 3 min 20 sec + 30 sec rotation = ~4 min per station<br/>
      <em>Best for:</em> Mixed fitness levels, lots of variety, moderate equipment needs<br/>
      <em>Coaching cue:</em> "3-2-1 ROTATE! Move to your next station. You have 30 seconds to get there and set up."<br/>
      <em>Common mistake:</em> Not pre-placing equipment at each station. Participants waste 15+ seconds finding dumbbells.<br/>
      <em>Music BPM:</em> 128-135 BPM (house/EDM tempo)
      <br/><br/>

      <strong>3×5 Stations</strong><br/>
      <em>What:</em> 3 exercises across 5 fixed stations, 40 seconds each.<br/>
      <em>How to run it:</em> Same rotation logic but 5 stations with 3 exercises each. More stations = shorter time at each, more movement.<br/>
      <em>Total time per station:</em> (40+15) × 3 = 2 min 45 sec + 30 sec rotation = ~3 min 15 sec<br/>
      <em>Best for:</em> Larger classes (15-25 people), keeps energy high with frequent changes
      <br/><br/>

      <strong>2×7 Stations</strong><br/>
      <em>What:</em> 2 exercises across 7 stations, 30 seconds each. Quick rotations, high energy.<br/>
      <em>How to run it:</em> Very fast pace. Only 2 exercises per station means minimal setup. Great for bodyweight-heavy classes.<br/>
      <em>Total time per station:</em> (30+15) × 2 = 1 min 30 sec + 30 sec rotation = 2 min<br/>
      <em>Best for:</em> Cardio-focused classes, beginners who fatigue quickly (short bursts), outdoor workouts<br/>
      <em>Coaching cue:</em> "Keep it moving! Two exercises, then you're out. Let's GO!"
      <br/><br/>

      <strong>3×4 Stations</strong><br/>
      <em>What:</em> 3 exercises across 4 stations, 35 seconds each.<br/>
      <em>Best for:</em> Smaller spaces, fewer equipment needs. Compact but effective.
      <br/><br/>

      <strong>5×3 Stations</strong><br/>
      <em>What:</em> 5 exercises across 3 stations, 30 seconds each.<br/>
      <em>Best for:</em> Deep muscle fatigue per station. Advanced clients. 5 exercises is a LOT — ensure proper regression options.
      <br/><br/>
      <hr/>

      <strong>GROUP CIRCUIT FORMATS</strong> — Everyone does the same exercise at the same time. No stations, no rotation.
      <br/><br/>

      <strong>Full Group Circuit</strong><br/>
      <em>What:</em> Everyone does the same exercises together, 40 seconds each.<br/>
      <em>How to run it:</em>
      <ol>
        <li>Demo each exercise</li>
        <li>Everyone starts the first exercise at the same time</li>
        <li>40 seconds work → 15 seconds transition to next exercise</li>
        <li>Go through all exercises, then repeat for 2-3 rounds</li>
      </ol>
      <em>Best for:</em> Unity and coaching (you can watch everyone at once), team-building classes<br/>
      <em>Coaching cue:</em> "All together! Same exercise, same effort. I'm watching your form!"<br/>
      <em>Common mistake:</em> Not enough space between people. Each person needs at least a 6×6 foot area.
      <br/><br/>

      <strong>Timed Circuit</strong><br/>
      <em>What:</em> 40 seconds work / 15 seconds rest, 3 rounds. Classic boot camp format.<br/>
      <em>How to run it:</em> Like Full Group but structured as work:rest intervals. Classic and simple.<br/>
      <em>Best for:</em> Classes where you want consistent effort tracking across weeks
      <br/><br/>
      <hr/>

      <strong>TIME PROTOCOL FORMATS</strong> — Advanced intensity protocols with specific work-rest ratios.
      <br/><br/>

      <strong>EMOM (Every Minute On The Minute)</strong><br/>
      <em>What:</em> At the top of every minute, start a new exercise. Rest is whatever time you have left in that minute.<br/>
      <em>How to run it:</em>
      <ol>
        <li>Set a visible timer counting minutes (not seconds)</li>
        <li>At 0:00 — Exercise 1 begins. Participant does prescribed reps.</li>
        <li>Once they finish (say at 0:35), they rest the remaining 25 seconds</li>
        <li>At 1:00 — Exercise 2 begins. Same pattern.</li>
        <li>Continue for 15-25 minutes total</li>
      </ol>
      <em>The key insight:</em> Faster you finish the prescribed reps, more rest you get. This is SELF-PACED intensity — fit people go heavier/faster and still get rest, beginners go lighter/slower and still complete the work.<br/>
      <em>Rep prescription:</em> Give a number that takes 30-40 seconds for an average person (e.g., 12 squats, 10 push-ups, 8 rows).<br/>
      <em>Best for:</em> Mixed fitness levels (self-pacing), building work capacity, strength-focused boot camps<br/>
      <em>Coaching cue:</em> "Top of the minute! GO! Get your reps done, then rest until the next minute starts."<br/>
      <em>Common mistake:</em> Prescribing too many reps so nobody gets rest. If most people can't finish in 45 seconds, lower the reps.<br/>
      <em>Music BPM:</em> 120-128 BPM (moderate, not rushed)
      <br/><br/>

      <strong>Tabata</strong><br/>
      <em>What:</em> 20 seconds MAX effort / 10 seconds rest × 8 rounds = 4 minutes per exercise.<br/>
      <em>How to run it:</em>
      <ol>
        <li>Pick 4-6 exercises</li>
        <li>For each exercise: 20 sec ON (absolute maximum effort) → 10 sec OFF × 8 rounds</li>
        <li>That's 4 minutes per exercise</li>
        <li>Take 1 minute rest between exercises</li>
        <li>4 exercises × 5 minutes each = 20 minute workout</li>
      </ol>
      <em>The key insight:</em> Tabata was designed by Dr. Izumi Tabata in 1996 for Olympic speed skaters. The 20:10 ratio with TRUE max effort produces the same VO2max improvement as 60 minutes of moderate cardio. But only if effort is genuinely maximal.<br/>
      <em>Best for:</em> Advanced classes, conditioning, fat loss, time-efficient workouts<br/>
      <em>Coaching cue:</em> "This is 20 seconds. I want EVERYTHING you've got. 10 seconds is NOT enough to recover — that's the point. Push THROUGH!"<br/>
      <em>Common mistake:</em> Going 60-70% effort. If participants aren't struggling by round 5, it's not real Tabata. Pick harder exercises or add load.<br/>
      <em>Who should NOT do it:</em> Beginners, anyone with cardiovascular concerns, those who can't maintain form under fatigue<br/>
      <em>Music BPM:</em> 140-160 BPM (high energy)
      <br/><br/>

      <strong>AMRAP (As Many Reps As Possible)</strong><br/>
      <em>What:</em> Set a time block (usually 4-8 minutes) and do as many rounds of a circuit as possible.<br/>
      <em>How to run it:</em>
      <ol>
        <li>Define a mini-circuit: 3-5 exercises with set rep counts (e.g., 10 squats, 8 push-ups, 6 rows)</li>
        <li>Start the clock</li>
        <li>Participants cycle through the circuit continuously</li>
        <li>When time expires, note how many rounds + extra reps completed</li>
        <li>Rest 2 minutes, then do another AMRAP block with different exercises</li>
      </ol>
      <em>The key insight:</em> AMRAP is self-paced competition. Participants push themselves because they're tracking their score. Write rounds on a whiteboard for accountability.<br/>
      <em>Best for:</em> Competitive classes, progress tracking (repeat same AMRAP monthly to see improvement), CrossFit-influenced groups<br/>
      <em>Coaching cue:</em> "Your score is rounds plus reps. Write it down. Next month we're doing this again — beat your own number."<br/>
      <em>Common mistake:</em> Too many exercises in the circuit (keep it to 3-5). Too long a block (>8 minutes and form degrades).<br/>
      <em>Music BPM:</em> 130-140 BPM
      <br/><br/>
      <hr/>

      <strong>SPECIALTY FORMATS</strong>
      <br/><br/>

      <strong>Partner</strong><br/>
      <em>What:</em> Paired stations. I-go-you-go format: one person works while one rests.<br/>
      <em>How to run it:</em> Pair up participants. Partner A does the exercise for the prescribed time or reps while Partner B rests or does a hold (like a wall sit). Then they swap. Natural work:rest ratio is 1:1.<br/>
      <em>Best for:</em> Social classes, accountability, competitive energy. Great for retention — clients make workout friends.<br/>
      <em>Coaching cue:</em> "Your partner is counting on you! Don't let them rest too long!"
      <br/><br/>

      <strong>Hybrid</strong><br/>
      <em>What:</em> Warm-up at stations → full group circuit → finisher. Best of both worlds.<br/>
      <em>How to run it:</em> First 15 minutes at 3-4 stations (strength focus). Then 10 minutes of full-group circuit (cardio focus). Then 5-minute finisher (AMRAP or Tabata).<br/>
      <em>Best for:</em> Advanced programming, classes that want both strength and conditioning
    `,
  },

  bootcampClassStyle: {
    title: 'Class Styles — How Each One Works',
    content: `
      <strong>Standard</strong><br/>
      <em>What:</em> Equal-weight rounds. Every set uses the same weight/resistance.<br/>
      <em>How it feels:</em> Consistent effort throughout. Participants know what to expect each round.<br/>
      <em>Best for:</em> Most boot camps, mixed levels, when equipment variety is limited.<br/>
      <em>Coaching cue:</em> "Same weight, same effort. Focus on your form getting BETTER each round, not faster."
      <br/><br/>

      <strong>Pyramid</strong><br/>
      <em>What:</em> Start heavy → drop weight each round → lighter weight → finish to failure.<br/>
      <em>How it works on the floor:</em>
      <ol>
        <li>Round 1: Heavy weight, 6-8 reps (RPE 8-9)</li>
        <li>Round 2: Drop 20%, 10-12 reps (RPE 7-8)</li>
        <li>Round 3: Drop another 20%, max reps to failure (RPE 9-10)</li>
      </ol>
      <em>Best for:</em> Strength endurance, advanced participants, muscle fatigue training.<br/>
      <em>Equipment needed:</em> Multiple dumbbell weights per station (heavy, medium, light).<br/>
      <em>Common mistake:</em> Not having the lighter weights pre-staged. Participants waste time searching mid-set.<br/>
      <em>Coaching cue:</em> "Drop the weight, NOT your intensity! Lighter weight, MORE reps. Chase the burn."
      <br/><br/>

      <strong>Superset</strong><br/>
      <em>What:</em> Same muscle group, 3 exercises back-to-back: compound → bodyweight → banded.<br/>
      <em>How it works:</em>
      <ol>
        <li>Exercise 1: Heavy compound (e.g., dumbbell chest press)</li>
        <li>Exercise 2: Bodyweight (e.g., push-ups) — no rest between</li>
        <li>Exercise 3: Banded (e.g., band chest fly) — light but continuous tension</li>
      </ol>
      <em>Why this works:</em> Progressive fatigue. By exercise 3, even a light band feels impossible because the muscle is pre-exhausted.<br/>
      <em>Best for:</em> Hypertrophy-focused classes, intermediate+ participants<br/>
      <em>Coaching cue:</em> "No rest between exercises! The muscle should be SCREAMING by exercise 3."
      <br/><br/>

      <strong>Mixed</strong><br/>
      <em>What:</em> Different styles per station. Station 1 = pyramid, Station 2 = superset, Station 3 = standard.<br/>
      <em>Best for:</em> Keeping advanced clients engaged who've done every other format. High programming skill required.
    `,
  },

  bootcampDayType: {
    title: 'Day Types — Muscle Focus & Weekly Rotation',
    content: `
      <strong>Lower Body</strong><br/>
      <em>Target muscles:</em> Quads, hamstrings, glutes, calves, hip flexors, core<br/>
      <em>Exercise examples:</em> Squats, lunges, deadlifts, leg press, step-ups, hip thrusts, calf raises<br/>
      <em>Common mistake:</em> All quad-dominant exercises. Include hip hinges (deadlifts, RDLs) for hamstring/glute balance.
      <br/><br/>

      <strong>Upper Body</strong><br/>
      <em>Target muscles:</em> Chest, lats, shoulders, biceps, triceps, core<br/>
      <em>Exercise examples:</em> Bench press, rows, overhead press, curls, tricep dips, lat pulldowns<br/>
      <em>Common mistake:</em> Too much pressing, not enough pulling. Use a 2:1 pull-to-push ratio for shoulder health.
      <br/><br/>

      <strong>Cardio / Conditioning</strong><br/>
      <em>Target:</em> Cardiovascular endurance, full body with emphasis on heart rate elevation<br/>
      <em>Exercise examples:</em> Burpees, mountain climbers, box jumps, sprints, battle ropes, rowing<br/>
      <em>Key metric:</em> Keep heart rate at 70-85% of max throughout. Use RPE 7-8.
      <br/><br/>

      <strong>Full Body</strong><br/>
      <em>Target:</em> Mix of all major muscle groups. At least one push, one pull, one squat, one hinge, one carry.<br/>
      <em>Best for:</em> Balanced classes, beginners, once-per-week attendees who need everything.
      <br/><br/>

      <strong>Weekly Rotation Strategy:</strong><br/>
      Monday: Lower Body → Tuesday: Upper Body → Wednesday: Cardio → Thursday: Full Body → Friday: Lower Body<br/>
      This gives every muscle group 48-72 hours recovery. Cardio on Wednesday breaks up the strength days. Clients who attend 3x/week never miss a muscle group over 2 weeks.
    `,
  },

  bootcampIntensity: {
    title: 'Intensity Categories — When to Use Each',
    content: `
      <strong>High Impact</strong><br/>
      <em>What:</em> Jumping, plyometrics, explosive movements. RPE 8-10.<br/>
      <em>Examples:</em> Box jumps, burpees, jump squats, tuck jumps, power cleans<br/>
      <em>Who:</em> Athletes, advanced participants with no joint issues<br/>
      <em>Who should NOT:</em> Knee/ankle problems, beginners, pregnant clients, anyone >250 lbs<br/>
      <em>Coaching tip:</em> Always have a low-impact alternative ready. "If jumping bothers your knees, do step-ups instead."
      <br/><br/>

      <strong>Medium Impact</strong><br/>
      <em>What:</em> Controlled movements with moderate effort. RPE 6-8.<br/>
      <em>Examples:</em> Walking lunges, dumbbell rows, push-ups, TRX exercises<br/>
      <em>Who:</em> Most fitness levels. This is your bread and butter for group classes.
      <br/><br/>

      <strong>Calisthenics</strong><br/>
      <em>What:</em> Bodyweight only. No equipment needed.<br/>
      <em>Examples:</em> Push-ups, pull-ups, dips, squats, burpees, planks<br/>
      <em>Best for:</em> Outdoor boot camps, park workouts, hotel room workouts, travel
      <br/><br/>

      <strong>Stability</strong><br/>
      <em>What:</em> Balance, core, proprioception. BOSU, stability ball, single-leg work.<br/>
      <em>Examples:</em> Single-leg deadlift, BOSU squats, stability ball hamstring curls<br/>
      <em>Best for:</em> NASM Phase 1 classes, rehab, seniors, golfers (rotational stability)
      <br/><br/>

      <strong>Flexibility</strong><br/>
      <em>What:</em> Stretching, mobility, foam rolling. Low RPE. Recovery-focused.<br/>
      <em>Best for:</em> Active recovery days, cool-down classes, injury prevention<br/>
      <em>Note:</em> We use "flexibility" and "stretching" terminology — this is NASM corrective exercise methodology.
      <br/><br/>

      <strong>Cardio</strong><br/>
      <em>What:</em> Sustained heart rate training. Running, cycling, rowing, jump rope.<br/>
      <em>Best for:</em> Endurance building, weight loss focused classes<br/>
      <br/>
      <strong>Pro tip:</strong> You can mix intensities. Tell the AI "intense but all low impact" — it selects exercises that drive heart rate up WITHOUT jumping. Great for classes with mixed ages and joint concerns.
    `,
  },

  bootcampOPTPhase: {
    title: 'NASM OPT Phase for Boot Camps',
    content: `
      <strong>Phase 1 — Stabilization Endurance</strong><br/>
      <em>Variables:</em> 12-20 reps, slow tempo 4/2/1, unstable surfaces<br/>
      <em>In a boot camp:</em> Use stability balls, BOSU, single-leg exercises. Focus on form over speed. Great for beginners and mixed-level classes.<br/>
      <em>Coaching cue:</em> "Slow and controlled. I'd rather see 12 perfect reps than 20 sloppy ones."
      <br/><br/>

      <strong>Phase 2 — Strength Endurance</strong><br/>
      <em>Variables:</em> 8-12 reps, supersets of stable + unstable, moderate tempo 2/0/2<br/>
      <em>In a boot camp:</em> This is the MOST COMMON boot camp phase. Superset a machine/free weight exercise with a bodyweight/balance exercise.<br/>
      <em>Example:</em> Dumbbell chest press → push-up on BOSU<br/>
      <em>Coaching cue:</em> "The second exercise is harder BECAUSE you're already fatigued. That's the point!"
      <br/><br/>

      <strong>Phase 3 — Hypertrophy</strong><br/>
      <em>Variables:</em> 6-12 reps, 3-5 sets, moderate to heavy weights<br/>
      <em>In a boot camp:</em> Requires sufficient dumbbells/barbells for everyone. Only for advanced groups who know proper form. Longer rest periods mean less "boot camp" feel.<br/>
      <em>Coaching cue:</em> "Heavy enough that the last 2 reps are a STRUGGLE. If you could do 5 more, go heavier."
      <br/><br/>

      <strong>Phase 4 — Max Strength</strong><br/>
      <em>Variables:</em> 1-5 reps, heavy loads, 3-5 min rest<br/>
      <em>In a boot camp:</em> Rarely used. Long rest periods kill the energy. Better for 1-on-1 or small group (<4 people).<br/>
      <br/>

      <strong>Phase 5 — Power</strong><br/>
      <em>Variables:</em> Explosive + heavy supersets<br/>
      <em>In a boot camp:</em> Advanced athletes only. Requires coaching expertise to ensure safety under fatigue.<br/>
      <br/>
      <strong>Bottom line:</strong> For most boot camps, stick to Phase 1-2. Phase 3+ only for advanced groups you know well.
    `,
  },

  bootcampEquipment: {
    title: 'Equipment Profiles — Setup & AI Integration',
    content: `
      <strong>What Equipment Profiles Do:</strong><br/>
      When you select a profile, the AI only picks exercises that use equipment you actually have at that location. No more generating a class with barbells when you only have dumbbells.
      <br/><br/>
      <strong>How to Set Up:</strong>
      <ol>
        <li>Go to the <strong>Equipment</strong> tab in the sidebar</li>
        <li>Create a profile for each location (e.g., "Move Fitness", "Park", "Home Gym")</li>
        <li>Add equipment items: name, category, quantity</li>
        <li>Optional: Take a photo of your equipment and let AI identify it automatically</li>
        <li>Review and approve AI suggestions (AI might misidentify a landmine as a barbell)</li>
      </ol>
      <strong>AI Scan Feature:</strong><br/>
      Take a photo of a piece of equipment → Gemini Vision identifies it → creates an equipment item → you approve or edit. Saves time vs manual entry for large gyms.
      <br/><br/>
      <strong>"Any Equipment"</strong> means no filtering — the AI can pick any of 900+ exercises regardless of equipment. Use this when you don't have a profile set up yet, or for bodyweight-only classes.
      <br/><br/>
      <strong>Pro tip:</strong> Create separate profiles for different scenarios: "Full Gym" (everything), "Park Day" (bodyweight + bands), "Rainy Day" (indoor only). Switch between them when generating classes.
    `,
  },

  bootcampDuration: {
    title: 'Workout Duration & the 55-Minute Rule',
    content: `
      <strong>Total Class Time Breakdown:</strong>
      <ul>
        <li><strong>Demo:</strong> 5 minutes — walk through every exercise before anyone starts</li>
        <li><strong>Warm-up stretch:</strong> 3-5 minutes (if enabled)</li>
        <li><strong>Workout:</strong> The time you set here (30-50 minutes)</li>
        <li><strong>Equipment clear:</strong> 5 minutes — everyone puts equipment back</li>
        <li><strong>Total = Workout + 13 minutes overhead</strong></li>
      </ul>
      <strong>The 55-Minute Rule:</strong><br/>
      Most gym class slots are 55-60 minutes. The timer at the top turns RED if your class exceeds 55 minutes. This means you're running into the next class's time slot.
      <br/><br/>
      <strong>Practical Guide:</strong>
      <ul>
        <li><strong>30 min workout = 43 min total.</strong> Express class. Perfect for lunch-break boot camps.</li>
        <li><strong>37 min workout = 50 min total.</strong> Sweet spot for a 55-minute slot. 5 min buffer.</li>
        <li><strong>42 min workout = 55 min total.</strong> Tight but doable if transitions are clean.</li>
        <li><strong>45+ min workout = 58+ min total.</strong> You're over. Cut exercises or shorten work intervals.</li>
      </ul>
      <strong>Pro tip:</strong> Always plan for 37 minutes of workout time. Real-world transitions take longer than planned.
    `,
  },

  bootcampParticipants: {
    title: 'Expected Participants & Overflow Management',
    content: `
      Set the expected number of participants so the AI can plan station capacity.
      <br/><br/>
      <strong>Station Capacity:</strong>
      <ul>
        <li><strong>1-2 people per station:</strong> Ideal. Everyone has access to equipment.</li>
        <li><strong>3-4 people per station:</strong> Tight but workable. Stagger start times.</li>
        <li><strong>5+ people per station:</strong> Too many. Either add stations or use overflow.</li>
      </ul>
      <strong>Overflow Plan:</strong><br/>
      If more people show up than stations can handle, the system generates an overflow circuit — a 3-5 minute outdoor lap rotation (jogging, walking lunges, bear crawls, high knees) that extra participants cycle through while waiting for a station to open.
      <br/><br/>
      <strong>How to run overflow:</strong>
      <ol>
        <li>Overflow group starts with the lap circuit</li>
        <li>When a station group finishes their rotation, the overflow group takes that station</li>
        <li>The group that just finished goes to the lap circuit</li>
        <li>Everyone gets equal station time over the full class</li>
      </ol>
      <strong>Pro tip:</strong> Tell overflow participants "You're doing the HARDEST part right now — the lap. When you get to a station, it'll feel like a break." This reframes it positively.
    `,
  },

  // ─── New Sections (AI Village Recommended) ───────────────────

  bootcampBuildModes: {
    title: '3 Build Modes — When to Use Each',
    content: `
      <strong>AI Generate (Default)</strong><br/>
      <em>What:</em> Set your parameters (format, day type, intensity, duration, equipment profile) and click Generate. The AI builds the entire class for you.<br/>
      <em>When to use:</em> When you need a class FAST and trust the AI's exercise selection. Good for routine classes where you don't have strong preferences about specific exercises.<br/>
      <em>Pro tip:</em> Generate → review → swap 1-2 exercises you don't like. Faster than building from scratch.
      <br/><br/>

      <strong>Manual</strong><br/>
      <em>What:</em> Browse the 900+ exercise Rolodex and add exercises to stations yourself.<br/>
      <em>When to use:</em> When you have a specific class in mind. You know exactly which exercises you want at each station. Good for signature classes you run every week.<br/>
      <em>How it works:</em> The format you selected determines how many stations and exercises per station. Click the purple "+" to add exercises. They fill stations round-robin (Station 1 first, then 2, etc.).<br/>
      <em>Pro tip:</em> Click an exercise card (not the "+" button) to see the detail panel first — check the difficulty, equipment, and modifications before adding.
      <br/><br/>

      <strong>Hybrid (Best of Both)</strong><br/>
      <em>What:</em> AI generates a base class, then you can swap, add, or remove exercises using the Rolodex on the right panel.<br/>
      <em>When to use:</em> When you want AI to do the heavy lifting but you want to customize. The most flexible option.<br/>
      <em>How it works:</em> Generate with AI first → review the class preview → use the Rolodex on the right to find alternatives → swap exercises in and out.
    `,
  },

  bootcampFloorMode: {
    title: 'Floor Mode — Coaching on the Gym Floor',
    content: `
      <strong>What:</strong> High-contrast display mode designed for viewing on a phone or tablet WHILE you're coaching on the gym floor. Larger text, bolder colors, fewer distractions.
      <br/><br/>
      <strong>When to use:</strong> After you've built and saved your class, switch to Floor Mode right before class starts. Prop your device where you can glance at it during class.
      <br/><br/>
      <strong>What it shows:</strong> Station names, exercise names, timing, and regressions — everything you need to coach without scrolling through menus.
      <br/><br/>
      <strong>Pro tip:</strong> Set your phone brightness to maximum and use Floor Mode. The dark background with bright cyan text is readable even in bright gym lighting.
    `,
  },

  bootcampRegressions: {
    title: 'Exercise Regressions — The Green "Easier" Lines',
    content: `
      <strong>What:</strong> Below each exercise in the class preview, you'll see a green line: "↳ Easier: [alternative exercise]"<br/>
      <em>This is the regression — a simpler version of the same movement pattern for participants who can't do the main exercise.</em>
      <br/><br/>
      <strong>Why this matters:</strong> In ANY group class, you'll have participants at different levels. The regression lets you include challenging exercises while keeping everyone safe.<br/>
      <br/>
      <strong>How to use during class:</strong>
      <ol>
        <li>During the demo, show BOTH the main exercise AND the regression</li>
        <li>Say: "If [main exercise] bothers your knees/back/shoulders, do [regression] instead. Same muscle, safer movement."</li>
        <li>Watch for people struggling — walk over and redirect them to the regression</li>
        <li>Never shame someone for using the regression. Frame it as "smart training"</li>
      </ol>
      <strong>Sources of regressions:</strong>
      <ul>
        <li><strong>Easy Variation:</strong> A simpler version (e.g., push-up → knee push-up)</li>
        <li><strong>Knee Mod:</strong> Alternative when knees are the issue (e.g., squat jump → bodyweight squat)</li>
        <li><strong>Back Mod:</strong> Alternative for back pain (e.g., deadlift → hip hinge with no weight)</li>
        <li><strong>Shoulder Mod:</strong> Alternative for shoulder issues (e.g., overhead press → landmine press)</li>
      </ul>
    `,
  },

  bootcampPainMods: {
    title: 'Pain Modifications — Keeping Clients Safe',
    content: `
      <strong>What:</strong> Each exercise can have modifications for 5 joint areas: knee, shoulder, ankle, wrist, and back. These are alternative exercises that train the same muscles but avoid the problematic joint.
      <br/><br/>
      <strong>When a client reports pain:</strong>
      <ol>
        <li>Click the exercise in the class preview to see the detail panel</li>
        <li>Under "Pain Modifications," find the relevant joint</li>
        <li>The modification shows what exercise to substitute</li>
        <li>Direct the client to the modified exercise for the rest of class</li>
      </ol>
      <strong>Pain Scale Context:</strong>
      <ul>
        <li><strong>1-3:</strong> Mild discomfort. Monitor but usually OK to continue with modification.</li>
        <li><strong>4-6:</strong> Moderate pain. Switch to the modification immediately. Monitor closely.</li>
        <li><strong>7-10:</strong> Severe pain. STOP the exercise entirely. Have them rest or do a low-impact alternative. If 8+, refer to physician.</li>
      </ul>
      <strong>NEVER say "push through the pain."</strong> Use: "Let's find a movement that works better for you today."
      <br/><br/>
      <strong>Wellness language (MANDATORY):</strong> We say "wellness modifications" not "medical treatments" or "therapy." We are fitness professionals, not medical practitioners. If pain persists, refer to a physical therapist or physician.
    `,
  },

  rpeScale: {
    title: 'RPE Scale — Rating of Perceived Exertion',
    content: `
      <strong>What:</strong> RPE is how hard the client FEELS they're working, on a 1-10 scale. It's the simplest way to gauge intensity without a heart rate monitor.
      <br/><br/>
      <strong>The Scale:</strong>
      <ul>
        <li><strong>1-2:</strong> Very light. Could do this all day. Walking, light stretching.</li>
        <li><strong>3-4:</strong> Light. Comfortable conversation. Warm-up intensity.</li>
        <li><strong>5-6:</strong> Moderate. Can talk in sentences. Steady cardio, light resistance.</li>
        <li><strong>7-8:</strong> Hard. Can only speak a few words. Heavy lifting, HIIT work intervals.</li>
        <li><strong>9:</strong> Very hard. Can barely speak. Near-max effort. Tabata-level.</li>
        <li><strong>10:</strong> Maximum. Cannot speak. Sprint to save your life. Unsustainable >10 seconds.</li>
      </ul>
      <strong>How to use in class:</strong><br/>
      Ask: "On a scale of 1-10, how hard was that set?" or "I want you at an RPE 7 for this exercise."<br/>
      <br/>
      <strong>Pro tip:</strong> RPE is subjective — a fit client's RPE 7 is very different from a beginner's RPE 7. That's OK. RPE measures THEIR effort relative to THEIR capacity.
    `,
  },

  warmUpProtocol: {
    title: 'NASM Warm-Up Protocol',
    content: `
      <strong>The NASM Corrective Exercise Continuum (in order):</strong>
      <ol>
        <li><strong>Inhibit (SMR/Foam Rolling):</strong> 30-90 seconds per tight area. Targets overactive muscles. Roll slowly — 1 inch per second. Pause on tender spots for 30 seconds.</li>
        <li><strong>Lengthen (Static Stretch):</strong> 30 seconds per stretch. Target shortened muscles identified in the movement assessment. Hold at mild tension, never pain.</li>
        <li><strong>Activate (Isolated Strengthening):</strong> 10-15 reps. Target underactive muscles. Slow tempo (4/2/1). Examples: glute bridges, prone Ys, side-lying hip abduction.</li>
        <li><strong>Integrate (Dynamic Movement):</strong> 10-15 reps. Full kinetic chain. Examples: squat to press, lunge with rotation, step-up to balance.</li>
      </ol>
      <strong>For boot camps (5-minute version):</strong><br/>
      2 min foam roll (quads, IT band, lats) → 1 min dynamic stretch (hip circles, arm circles, leg swings) → 2 min activate + integrate (high knees, butt kicks, walking lunges, arm swings)
    `,
  },

  coolDownProtocol: {
    title: 'Cool-Down Protocol',
    content: `
      <strong>Purpose:</strong> Gradually lower heart rate, begin recovery, reduce muscle soreness.
      <br/><br/>
      <strong>3-5 Minute Cool-Down Sequence:</strong>
      <ol>
        <li><strong>1 min light cardio:</strong> Walk in place, slow march. Bring heart rate down gradually.</li>
        <li><strong>2-3 min static stretching:</strong> Hold each stretch 20-30 seconds. Target the muscles used in the workout.
          <ul>
            <li>Lower body day: quads, hamstrings, hip flexors, calves, glutes</li>
            <li>Upper body day: chest, lats, shoulders, triceps, forearms</li>
            <li>Full body: hip flexors, chest, lats, hamstrings (the tightest muscles)</li>
          </ul>
        </li>
        <li><strong>1 min breathing:</strong> Deep diaphragmatic breaths. 4 seconds in through nose, 6 seconds out through mouth. Activates parasympathetic recovery.</li>
      </ol>
      <strong>Never skip the cool-down.</strong> Clients who leave immediately after intense exercise are more likely to feel dizzy, nauseous, or have muscle cramps.
    `,
  },
};
