/**
 * Teach Me Content — Educational content for all assessment tools and features.
 * Used by the TeachMeToggle component across admin and trainer dashboards.
 */

export const TEACH_ME_CONTENT: Record<string, { title: string; content: string }> = {
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
  bootcampFormats: {
    title: 'Class Formats Explained',
    content: `
      <strong>Station-Based Formats:</strong>
      <ul>
        <li><strong>4×N Stations:</strong> 4 exercises per station, 35s each. Dynamic station count based on duration. Best for variety and flow.</li>
        <li><strong>3×5 Stations:</strong> 3 exercises across 5 fixed stations, 40s each. Good balance of depth and breadth.</li>
        <li><strong>2×7 Stations:</strong> 2 exercises across 7 stations, 30s each. Quick rotations, high energy.</li>
        <li><strong>3×4 Stations:</strong> 3 exercises across 4 stations, 35s each. Compact class, fewer transitions.</li>
        <li><strong>5×3 Stations:</strong> 5 exercises across 3 stations, 30s each. Deep work per station.</li>
      </ul>
      <strong>Group Formats:</strong>
      <ul>
        <li><strong>Full Group Circuit:</strong> Everyone does the same exercises together, 40s each. Great for unity and coaching.</li>
        <li><strong>Timed Circuit:</strong> 40s work / 15s rest, 3 rounds. Classic boot camp format.</li>
      </ul>
      <strong>Time Protocols:</strong>
      <ul>
        <li><strong>EMOM (Every Minute On The Minute):</strong> Start a new exercise every 60 seconds. Rest is whatever time you have left in the minute. Builds work capacity.</li>
        <li><strong>Tabata:</strong> 20s max effort / 10s rest × 8 rounds per exercise. Extremely intense. Only 4 minutes per exercise but brutal.</li>
        <li><strong>AMRAP (As Many Reps As Possible):</strong> Set a time block (4 min) and do as many reps as possible. Self-paced intensity.</li>
      </ul>
      <strong>Specialty:</strong>
      <ul>
        <li><strong>Partner:</strong> Paired stations, I-go-you-go format. One works while one rests. Social and competitive.</li>
        <li><strong>Hybrid:</strong> Warm-up at stations → full group circuit → finisher. Best of both worlds.</li>
      </ul>
    `,
  },

  bootcampClassStyle: {
    title: 'Class Styles Explained',
    content: `
      <ul>
        <li><strong>Standard:</strong> Equal-weight rounds. Every set uses the same weight/resistance. Consistent effort throughout.</li>
        <li><strong>Pyramid:</strong> Start heavy → drop weight each round → lighter → finish to failure. Progressive fatigue. Great for strength endurance.</li>
        <li><strong>Superset:</strong> Same muscle group, 3 exercises back-to-back: compound movement → bodyweight → banded. Maximizes muscle fatigue.</li>
        <li><strong>Mixed:</strong> Different styles per station. Station 1 might be pyramid, Station 2 might be superset. Adds variety.</li>
      </ul>
    `,
  },

  bootcampDayType: {
    title: 'Day Types — Muscle Focus',
    content: `
      <ul>
        <li><strong>Lower Body:</strong> Quads, hamstrings, glutes, calves, hip flexors, core. Think squats, lunges, deadlifts, leg press.</li>
        <li><strong>Upper Body:</strong> Chest, lats, shoulders, biceps, triceps, core. Think bench press, rows, overhead press, curls.</li>
        <li><strong>Cardio/Conditioning:</strong> Full body with emphasis on heart rate. Burpees, mountain climbers, box jumps, sprints.</li>
        <li><strong>Full Body:</strong> Mix of all major muscle groups. Best for balanced classes and beginners.</li>
      </ul>
      <strong>Weekly Rotation:</strong> Lower → Upper → Cardio → Full Body → repeat. Allows 48-72 hours recovery per muscle group.
    `,
  },

  bootcampIntensity: {
    title: 'Intensity Categories',
    content: `
      <ul>
        <li><strong>High Impact:</strong> Jumping, plyometrics, explosive movements. RPE 8-10. Not suitable for joint issues or beginners.</li>
        <li><strong>Medium Impact:</strong> Controlled movements with moderate effort. RPE 6-8. Safe for most fitness levels.</li>
        <li><strong>Calisthenics:</strong> Bodyweight only. Push-ups, pull-ups, dips, squats. No equipment needed.</li>
        <li><strong>Stability:</strong> Balance, core, proprioception. BOSU, stability ball, single-leg work. Great for rehab and seniors.</li>
        <li><strong>Flexibility:</strong> Stretching, mobility, foam rolling, yoga-inspired. Low RPE. Recovery-focused.</li>
        <li><strong>Cardio:</strong> Sustained heart rate training. Running, cycling, rowing, jump rope.</li>
      </ul>
      <strong>Mixing:</strong> You can ask the AI for "intense but all low impact" — it will select exercises that drive heart rate up without jumping.
    `,
  },

  bootcampOPTPhase: {
    title: 'NASM OPT Phase for Boot Camps',
    content: `
      <ul>
        <li><strong>Phase 1 (Stabilization):</strong> 12-20 reps, slow tempo 4/2/1, unstable surfaces. Good for beginners and mixed-level classes.</li>
        <li><strong>Phase 2 (Strength Endurance):</strong> 8-12 reps, supersets of stable + unstable. Most common boot camp phase.</li>
        <li><strong>Phase 3 (Hypertrophy):</strong> 6-12 reps, moderate to heavy weights. Not typical for group classes unless advanced.</li>
        <li><strong>Phase 4 (Max Strength):</strong> 1-5 reps, heavy loads. Rarely used in boot camps — better for 1-on-1.</li>
        <li><strong>Phase 5 (Power):</strong> Explosive movements + heavy strength supersets. Advanced athletes only.</li>
      </ul>
      <strong>For most boot camps:</strong> Phase 1-2 is ideal. Phase 3+ only for advanced groups.
    `,
  },

  bootcampEquipment: {
    title: 'Equipment Profiles',
    content: `
      Equipment profiles tell the AI what gear is available at your location. When you select a profile, the AI only picks exercises that use equipment you actually have.
      <br/><br/>
      <strong>How to set up:</strong>
      <ol>
        <li>Go to the Equipment tab in the sidebar</li>
        <li>Create a profile for your gym (e.g., "Move Fitness Gym")</li>
        <li>Add the equipment items available (dumbbells, barbells, cables, bands, etc.)</li>
        <li>Select that profile here when generating a class</li>
      </ol>
      <strong>"Any Equipment"</strong> means no filtering — the AI can pick any exercise regardless of equipment needed.
    `,
  },

  bootcampDuration: {
    title: 'Workout Duration & 55-Minute Rule',
    content: `
      <strong>Total class time = Workout + Demo (5 min) + Clear (5 min) + Stretch (3 min)</strong>
      <br/><br/>
      Most gym class slots are 55-60 minutes. The timer bar at the top shows your total and turns red if you exceed 55 minutes.
      <br/><br/>
      <strong>Typical durations:</strong>
      <ul>
        <li><strong>30 min workout:</strong> Express class (43 min total). Good for lunch breaks.</li>
        <li><strong>40 min workout:</strong> Standard class (53 min total). Fits 55-min slot.</li>
        <li><strong>50 min workout:</strong> Extended class (63 min total). Over limit — reduce exercises or shorten sets.</li>
      </ul>
    `,
  },

  bootcampParticipants: {
    title: 'Expected Participants & Overflow',
    content: `
      Set the expected number of participants so the AI can plan station capacity. If more people show up than stations can handle, the system generates an <strong>overflow plan</strong> — a 3-5 minute outdoor lap circuit (jogging, lunges, bear crawls) that extra participants cycle through while waiting for a station.
      <br/><br/>
      <strong>Typical capacity per station:</strong> 2-4 people depending on equipment.
    `,
  },
};
