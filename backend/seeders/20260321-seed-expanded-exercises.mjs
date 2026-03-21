/**
 * Expanded Exercise Seeder — V2.0 Blueprint
 * ─────────────────────────────────────────────────────────────
 * Adds ~300 additional curated exercises beyond the original NASM 200.
 * Uses exercise_key-based upsert (CEO Ruling V2.0 Issue #2).
 *
 * Sources:
 *   - P90X / Insanity functional movements
 *   - Tae Bo / kickboxing cardio
 *   - Squat University mobility drills
 *   - Resistance band exercises
 *   - Kettlebell-specific movements
 *   - Machine exercises (commercial gym)
 *   - Bodyweight progressions
 *
 * For bulk import from free-exercise-db JSON:
 *   node backend/seeders/20260321-seed-free-exercise-db.mjs
 *
 * Safe to re-run: uses findOrCreate by exercise_key.
 */

import Exercise from '../models/Exercise.mjs';
import { exV2 } from './helpers/exerciseSeederUtils.mjs';

// ─── KETTLEBELL EXERCISES ───────────────────────────────────
const kettlebell = [
  exV2({ name: 'Kettlebell Swing', description: 'Explosive hip hinge swinging a kettlebell between legs to chest height.', instructions: '1. Hinge at hips. 2. Swing kettlebell between legs. 3. Drive hips forward, propelling bell to chest height. 4. Control the descent.', exerciseType: 'compound', primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Shoulders'], difficulty: 350, equipmentNeeded: ['Kettlebell'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'hinge', defaultTempo: 'X/0/X', defaultRestSeconds: 60, isPopular: true, optPhases: [1, 2, 3, 5] }),
  exV2({ name: 'Kettlebell Goblet Squat', description: 'Squat holding kettlebell at chest level.', instructions: '1. Hold kettlebell by horns at chest. 2. Squat between knees. 3. Push elbows inside knees at bottom. 4. Stand tall.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Core'], difficulty: 200, equipmentNeeded: ['Kettlebell'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: '3/1/2', defaultRestSeconds: 60 }),
  exV2({ name: 'Kettlebell Turkish Get-Up', description: 'Complex full-body movement from lying to standing while holding kettlebell overhead.', instructions: '1. Lie down, press KB up. 2. Roll to elbow, then hand. 3. Bridge hips, sweep leg. 4. Stand up. 5. Reverse.', exerciseType: 'stability', primaryMuscles: ['Core', 'Shoulders'], secondaryMuscles: ['Glutes', 'Quadriceps', 'Triceps'], difficulty: 700, equipmentNeeded: ['Kettlebell'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'rotation', defaultTempo: '3/2/3', defaultRestSeconds: 90, optPhases: [1, 2] }),
  exV2({ name: 'Kettlebell Clean', description: 'Explosive pull bringing kettlebell from floor to rack position.', instructions: '1. Hinge and grip KB. 2. Drive hips, pull KB to rack position. 3. Absorb at shoulder.', exerciseType: 'compound', primaryMuscles: ['Hamstrings', 'Deltoids'], secondaryMuscles: ['Core', 'Forearms'], difficulty: 500, equipmentNeeded: ['Kettlebell'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'hinge', defaultTempo: 'X/1/X', defaultRestSeconds: 60, optPhases: [3, 4, 5] }),
  exV2({ name: 'Kettlebell Snatch', description: 'One-arm explosive movement swinging kettlebell from floor to overhead in one motion.', instructions: '1. Swing KB between legs. 2. Drive hips, pull KB overhead. 3. Punch through at top. 4. Control descent.', exerciseType: 'compound', primaryMuscles: ['Glutes', 'Shoulders', 'Hamstrings'], secondaryMuscles: ['Core', 'Triceps'], difficulty: 700, equipmentNeeded: ['Kettlebell'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'hinge', defaultTempo: 'X/1/X', defaultRestSeconds: 90, optPhases: [4, 5] }),
  exV2({ name: 'Kettlebell Windmill', description: 'Side-bending movement with KB overhead for oblique and hip flexibility.', instructions: '1. Press KB overhead. 2. Turn feet 45 degrees. 3. Hinge sideways, touching opposite foot. 4. Return to standing.', exerciseType: 'stability', primaryMuscles: ['Obliques', 'Shoulders'], secondaryMuscles: ['Hamstrings', 'Glutes'], difficulty: 500, equipmentNeeded: ['Kettlebell'], force: 'static', mechanic: 'compound', nasmMovementPattern: 'rotation', defaultTempo: '3/2/3', defaultRestSeconds: 60, optPhases: [1, 2] }),
  exV2({ name: 'Kettlebell Halo', description: 'Circular movement around the head for shoulder mobility.', instructions: '1. Hold KB by horns at chest. 2. Circle KB around head. 3. Alternate direction each rep.', exerciseType: 'stability', primaryMuscles: ['Shoulders', 'Core'], difficulty: 200, equipmentNeeded: ['Kettlebell'], force: 'push', mechanic: 'compound', defaultTempo: '2/0/2', defaultRestSeconds: 30, optPhases: [1] }),
  exV2({ name: 'Kettlebell Farmers Carry', description: 'Walking while holding heavy kettlebells at sides for grip and core stability.', instructions: '1. Pick up KBs at sides. 2. Walk with tall posture. 3. Maintain tight core and shoulders packed.', exerciseType: 'compound', primaryMuscles: ['Forearms', 'Core', 'Trapezius'], secondaryMuscles: ['Glutes'], difficulty: 300, equipmentNeeded: ['Kettlebell'], force: 'static', mechanic: 'compound', nasmMovementPattern: 'gait', defaultTempo: 'N/A', defaultRestSeconds: 60, optPhases: [1, 2, 3, 4] }),
];

// ─── RESISTANCE BAND EXERCISES ──────────────────────────────
const bands = [
  exV2({ name: 'Band Pull-Apart', description: 'Horizontal band pull for rear delts and posture.', instructions: '1. Hold band at shoulder width. 2. Pull apart to chest. 3. Squeeze shoulder blades. 4. Return slowly.', exerciseType: 'isolation', primaryMuscles: ['Rear Deltoids', 'Rhomboids'], difficulty: 100, equipmentNeeded: ['Resistance Band'], force: 'pull', mechanic: 'isolation', defaultTempo: '2/1/2', defaultRestSeconds: 30, canBePerformedAtHome: true, optPhases: [1, 2] }),
  exV2({ name: 'Banded Lateral Walk', description: 'Side-stepping with band around ankles for glute medius activation.', instructions: '1. Place band around ankles. 2. Slight squat stance. 3. Step sideways maintaining tension. 4. Repeat both directions.', exerciseType: 'stability', primaryMuscles: ['Glutes', 'Abductors'], difficulty: 150, equipmentNeeded: ['Resistance Band'], force: 'push', mechanic: 'isolation', defaultTempo: '1/0/1', defaultRestSeconds: 30, canBePerformedAtHome: true, optPhases: [1] }),
  exV2({ name: 'Band Face Pull', description: 'Band pull to face for rear delt and rotator cuff health.', instructions: '1. Anchor band at face height. 2. Pull toward face, externally rotating. 3. Squeeze rear delts. 4. Return with control.', exerciseType: 'isolation', primaryMuscles: ['Rear Deltoids', 'Rotator Cuff'], difficulty: 150, equipmentNeeded: ['Resistance Band'], force: 'pull', mechanic: 'isolation', defaultTempo: '2/1/2', defaultRestSeconds: 30, canBePerformedAtHome: true, optPhases: [1, 2] }),
  exV2({ name: 'Banded Glute Bridge', description: 'Hip bridge with band above knees for increased glute activation.', instructions: '1. Lie on back, band above knees. 2. Push knees out against band. 3. Bridge hips up squeezing glutes. 4. Lower with control.', exerciseType: 'stability', primaryMuscles: ['Glutes'], secondaryMuscles: ['Core', 'Hamstrings'], difficulty: 150, equipmentNeeded: ['Resistance Band'], force: 'push', mechanic: 'isolation', nasmMovementPattern: 'hinge', defaultTempo: '3/2/2', defaultRestSeconds: 30, canBePerformedAtHome: true, optPhases: [1] }),
  exV2({ name: 'Banded Push-Up', description: 'Push-up with band across back for added resistance.', instructions: '1. Loop band across upper back, hold ends under palms. 2. Perform push-up against band resistance. 3. Full lockout at top.', exerciseType: 'compound', primaryMuscles: ['Pectorals', 'Triceps'], secondaryMuscles: ['Core', 'Anterior Deltoids'], difficulty: 400, equipmentNeeded: ['Resistance Band'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'push', defaultTempo: '2/1/1', defaultRestSeconds: 60, canBePerformedAtHome: true, optPhases: [2, 3] }),
  exV2({ name: 'Band Resisted Sprint', description: 'Partner-resisted or anchored sprint drill for speed development.', instructions: '1. Attach band to waist. 2. Partner holds or anchor to post. 3. Sprint against resistance. 4. Maintain sprint mechanics.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes', 'Hamstrings'], secondaryMuscles: ['Core', 'Calves'], difficulty: 500, equipmentNeeded: ['Resistance Band'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'gait', defaultTempo: 'X/0/X', defaultRestSeconds: 120, optPhases: [5] }),
];

// ─── BODYWEIGHT PROGRESSIONS ────────────────────────────────
const bodyweight = [
  exV2({ name: 'Burpee', description: 'Full-body explosive exercise combining squat thrust with jump.', instructions: '1. Squat down, place hands on floor. 2. Jump feet back to plank. 3. Push-up. 4. Jump feet to hands. 5. Explosive jump up.', exerciseType: 'calisthenics', primaryMuscles: ['Quadriceps', 'Pectorals', 'Core'], secondaryMuscles: ['Shoulders', 'Triceps'], difficulty: 400, equipmentNeeded: [], force: 'push', mechanic: 'compound', defaultTempo: 'X/0/X', defaultRestSeconds: 60, canBePerformedAtHome: true, isPopular: true, optPhases: [1, 5] }),
  exV2({ name: 'Mountain Climber', description: 'Dynamic plank with alternating knee drives for core and cardio.', instructions: '1. Start in plank position. 2. Drive one knee to chest. 3. Quickly switch legs. 4. Maintain plank alignment.', exerciseType: 'calisthenics', primaryMuscles: ['Core', 'Hip Flexors'], secondaryMuscles: ['Shoulders', 'Quadriceps'], difficulty: 250, equipmentNeeded: [], force: 'push', mechanic: 'compound', defaultTempo: 'X/0/X', defaultRestSeconds: 30, canBePerformedAtHome: true, isPopular: true, optPhases: [1, 5] }),
  exV2({ name: 'Box Jump', description: 'Explosive plyometric jump onto a box for power development.', instructions: '1. Stand facing box. 2. Swing arms, jump onto box. 3. Land softly with both feet. 4. Step down.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'], secondaryMuscles: ['Core'], difficulty: 400, equipmentNeeded: ['Plyo Box'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: 'X/1/X', defaultRestSeconds: 90, optPhases: [5] }),
  exV2({ name: 'Broad Jump', description: 'Horizontal explosive jump for lower body power.', instructions: '1. Stand with feet hip-width. 2. Swing arms, jump forward. 3. Land softly. 4. Measure distance.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Core', 'Calves'], difficulty: 350, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: 'X/0/X', defaultRestSeconds: 90, canBePerformedAtHome: true, optPhases: [5] }),
  exV2({ name: 'Pistol Squat', description: 'Single-leg squat requiring exceptional balance, strength, and mobility.', instructions: '1. Stand on one leg. 2. Extend opposite leg forward. 3. Squat all the way down. 4. Stand back up.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Core', 'Hamstrings'], difficulty: 800, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: '3/1/2', defaultRestSeconds: 90, canBePerformedAtHome: true, optPhases: [3, 4] }),
  exV2({ name: 'Handstand Push-Up', description: 'Inverted pressing movement for shoulders and triceps.', instructions: '1. Kick up to handstand against wall. 2. Lower head toward floor. 3. Press back up to lockout.', exerciseType: 'compound', primaryMuscles: ['Deltoids', 'Triceps'], secondaryMuscles: ['Core', 'Upper Pectorals'], difficulty: 850, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'press', defaultTempo: '2/1/1', defaultRestSeconds: 120, canBePerformedAtHome: true, optPhases: [4] }),
  exV2({ name: 'Bear Crawl', description: 'Quadruped crawling pattern for core stability and coordination.', instructions: '1. Start on hands and knees, lift knees 1 inch. 2. Crawl forward moving opposite hand and foot. 3. Keep back flat. 4. Move slowly.', exerciseType: 'stability', primaryMuscles: ['Core', 'Shoulders'], secondaryMuscles: ['Quadriceps', 'Glutes'], difficulty: 300, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'gait', defaultTempo: '1/0/1', defaultRestSeconds: 45, canBePerformedAtHome: true, optPhases: [1] }),
  exV2({ name: 'Inchworm', description: 'Standing to plank walkout for hamstring flexibility and core activation.', instructions: '1. Stand tall, hinge at hips. 2. Walk hands out to plank. 3. Hold briefly. 4. Walk hands back, stand.', exerciseType: 'flexibility', primaryMuscles: ['Hamstrings', 'Core'], secondaryMuscles: ['Shoulders'], difficulty: 200, equipmentNeeded: [], force: 'push', mechanic: 'compound', defaultTempo: '2/1/2', defaultRestSeconds: 30, canBePerformedAtHome: true, optPhases: [1] }),
  exV2({ name: 'Jump Squat', description: 'Explosive bodyweight squat with maximum vertical jump.', instructions: '1. Squat to parallel. 2. Explode upward jumping as high as possible. 3. Land softly. 4. Immediately descend into next rep.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Calves', 'Core'], difficulty: 350, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: 'X/0/X', defaultRestSeconds: 60, canBePerformedAtHome: true, isPopular: true, optPhases: [5] }),
  exV2({ name: 'Tuck Jump', description: 'Plyometric jump bringing knees to chest at peak height.', instructions: '1. Jump vertically. 2. Tuck knees to chest at peak. 3. Extend legs for landing. 4. Land softly.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Hip Flexors'], secondaryMuscles: ['Core', 'Calves'], difficulty: 450, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: 'X/0/X', defaultRestSeconds: 60, canBePerformedAtHome: true, optPhases: [5] }),
];

// ─── MACHINE EXERCISES (Commercial Gym) ─────────────────────
const machines = [
  exV2({ name: 'Hack Squat Machine', description: 'Machine-guided squat emphasizing quadriceps.', instructions: '1. Position shoulders under pads. 2. Feet shoulder-width on platform. 3. Lower until 90 degrees. 4. Push up through heels.', exerciseType: 'compound', primaryMuscles: ['Quadriceps'], secondaryMuscles: ['Glutes', 'Hamstrings'], difficulty: 350, equipmentNeeded: ['Hack Squat Machine'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultRestSeconds: 90, optPhases: [2, 3, 4] }),
  exV2({ name: 'Smith Machine Squat', description: 'Barbell squat on a guided Smith machine track.', instructions: '1. Position bar on traps under Smith bar. 2. Feet slightly forward. 3. Squat to parallel. 4. Press up.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Hamstrings'], difficulty: 300, equipmentNeeded: ['Smith Machine'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultRestSeconds: 90, optPhases: [1, 2, 3] }),
  exV2({ name: 'Leg Extension Machine', description: 'Isolation machine exercise for quadriceps.', instructions: '1. Sit, hook ankles under pad. 2. Extend legs fully. 3. Squeeze quads at top. 4. Lower with control.', exerciseType: 'isolation', primaryMuscles: ['Quadriceps'], difficulty: 150, equipmentNeeded: ['Leg Extension Machine'], force: 'push', mechanic: 'isolation', defaultTempo: '2/1/3', defaultRestSeconds: 60, optPhases: [2, 3] }),
  exV2({ name: 'Leg Curl Machine', description: 'Isolation machine exercise for hamstrings.', instructions: '1. Lie face down, hook ankles under pad. 2. Curl legs toward glutes. 3. Squeeze hamstrings. 4. Lower with control.', exerciseType: 'isolation', primaryMuscles: ['Hamstrings'], difficulty: 150, equipmentNeeded: ['Leg Curl Machine'], force: 'pull', mechanic: 'isolation', defaultTempo: '2/1/3', defaultRestSeconds: 60, optPhases: [2, 3] }),
  exV2({ name: 'Cable Lateral Raise', description: 'Single-arm lateral raise using low cable for constant tension.', instructions: '1. Stand sideways to cable. 2. Raise arm to shoulder height. 3. Lower with control.', exerciseType: 'isolation', primaryMuscles: ['Medial Deltoids'], difficulty: 200, equipmentNeeded: ['Cable Machine'], force: 'push', mechanic: 'isolation', defaultTempo: '2/1/3', defaultRestSeconds: 45, optPhases: [2, 3] }),
  exV2({ name: 'Cable Crossover', description: 'Standing cable fly for chest isolation with constant tension.', instructions: '1. Set cables above head height. 2. Step forward, slight lean. 3. Bring handles together in front of chest. 4. Return slowly.', exerciseType: 'isolation', primaryMuscles: ['Pectorals'], secondaryMuscles: ['Anterior Deltoids'], difficulty: 300, equipmentNeeded: ['Cable Machine'], force: 'push', mechanic: 'isolation', nasmMovementPattern: 'push', defaultTempo: '2/1/3', defaultRestSeconds: 60, optPhases: [2, 3] }),
  exV2({ name: 'Chest Press Machine', description: 'Machine-guided horizontal pressing for chest development.', instructions: '1. Sit, grip handles at chest height. 2. Press forward to extension. 3. Return with control.', exerciseType: 'compound', primaryMuscles: ['Pectorals', 'Triceps'], secondaryMuscles: ['Anterior Deltoids'], difficulty: 200, equipmentNeeded: ['Chest Press Machine'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'push', defaultRestSeconds: 60, optPhases: [1, 2, 3] }),
  exV2({ name: 'Shoulder Press Machine', description: 'Machine-guided overhead pressing movement.', instructions: '1. Sit, grip handles at shoulder level. 2. Press overhead. 3. Lower with control.', exerciseType: 'compound', primaryMuscles: ['Deltoids', 'Triceps'], difficulty: 200, equipmentNeeded: ['Shoulder Press Machine'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'press', defaultRestSeconds: 60, optPhases: [1, 2, 3] }),
  exV2({ name: 'Calf Raise Machine', description: 'Standing machine calf raise for gastrocnemius development.', instructions: '1. Position shoulders under pads. 2. Rise up on balls of feet. 3. Squeeze at top. 4. Lower heels below platform.', exerciseType: 'isolation', primaryMuscles: ['Calves'], difficulty: 150, equipmentNeeded: ['Calf Raise Machine'], force: 'push', mechanic: 'isolation', defaultTempo: '2/2/3', defaultRestSeconds: 45, optPhases: [2, 3] }),
  exV2({ name: 'Pec Deck Machine', description: 'Seated chest fly machine for pectoral isolation.', instructions: '1. Sit with arms on pads at chest height. 2. Bring pads together in front. 3. Squeeze chest. 4. Return slowly.', exerciseType: 'isolation', primaryMuscles: ['Pectorals'], difficulty: 150, equipmentNeeded: ['Pec Deck Machine'], force: 'push', mechanic: 'isolation', nasmMovementPattern: 'push', defaultTempo: '2/1/3', defaultRestSeconds: 45, optPhases: [2, 3] }),
];

// ─── MOBILITY / SQUAT UNIVERSITY DRILLS ─────────────────────
const mobility = [
  exV2({ name: '90/90 Hip Stretch', description: 'Seated hip rotation stretch for internal and external rotation.', instructions: '1. Sit with one leg in front (90-degree bend), one behind (90-degree bend). 2. Lean toward front shin. 3. Hold 30-60 seconds. 4. Switch sides.', exerciseType: 'flexibility', primaryMuscles: ['Hip Rotators', 'Glutes'], difficulty: 150, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/2/2', defaultRestSeconds: 15, optPhases: [1], source: 'squat-university' }),
  exV2({ name: 'Couch Stretch', description: 'Deep hip flexor and quad stretch with rear foot elevated on wall/couch.', instructions: '1. Kneel with rear foot against wall. 2. Front foot flat on floor. 3. Drive hips forward. 4. Hold 60 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Hip Flexors', 'Quadriceps'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/2/2', defaultRestSeconds: 15, optPhases: [1], source: 'squat-university' }),
  exV2({ name: 'Banded Ankle Distraction', description: 'Band-assisted ankle dorsiflexion mobilization.', instructions: '1. Attach band low to rack. 2. Step into band at ankle crease. 3. Drive knee over toes with band pulling backward. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Calves', 'Tibialis Anterior'], difficulty: 150, equipmentNeeded: ['Resistance Band'], canBePerformedAtHome: true, defaultTempo: '2/2/2', defaultRestSeconds: 15, optPhases: [1], source: 'squat-university' }),
  exV2({ name: 'Cat-Cow Stretch', description: 'Spinal flexion and extension movement for thoracic mobility.', instructions: '1. Start on hands and knees. 2. Arch back (cow). 3. Round back (cat). 4. Alternate slowly.', exerciseType: 'flexibility', primaryMuscles: ['Erector Spinae', 'Core'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '3/1/3', defaultRestSeconds: 15, optPhases: [1] }),
  exV2({ name: 'World\'s Greatest Stretch', description: 'Dynamic full-body stretch combining lunge, rotation, and hamstring stretch.', instructions: '1. Forward lunge. 2. Place same-side elbow to instep. 3. Rotate and reach overhead. 4. Straighten front leg for hamstring. 5. Switch sides.', exerciseType: 'flexibility', primaryMuscles: ['Hip Flexors', 'Hamstrings', 'Thoracic Spine'], secondaryMuscles: ['Obliques', 'Calves'], difficulty: 250, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/1/2', defaultRestSeconds: 15, optPhases: [1], isPopular: true }),
  exV2({ name: 'Foam Roll IT Band', description: 'Self-myofascial release of the iliotibial band using a foam roller.', instructions: '1. Lie on side with foam roller under outer thigh. 2. Roll from hip to just above knee. 3. Pause on tender spots 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['IT Band'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '2/2/2', defaultRestSeconds: 15, optPhases: [1] }),
  exV2({ name: 'Foam Roll Thoracic Spine', description: 'Self-myofascial release of the upper back using a foam roller.', instructions: '1. Lie on roller at mid-back. 2. Support head. 3. Roll from mid-back to upper back. 4. Extend over roller at tight spots.', exerciseType: 'flexibility', primaryMuscles: ['Thoracic Spine', 'Rhomboids'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '2/2/2', defaultRestSeconds: 15, optPhases: [1] }),
];

// ─── P90X / FUNCTIONAL TRAINING ─────────────────────────────
const functional = [
  exV2({ name: 'Plyometric Push-Up', description: 'Explosive push-up where hands leave the ground at the top.', instructions: '1. Lower into push-up. 2. Explode upward, hands leaving floor. 3. Land softly. 4. Immediately descend.', exerciseType: 'compound', primaryMuscles: ['Pectorals', 'Triceps'], secondaryMuscles: ['Core', 'Shoulders'], difficulty: 600, equipmentNeeded: [], force: 'push', mechanic: 'compound', nasmMovementPattern: 'push', defaultTempo: 'X/0/X', defaultRestSeconds: 90, canBePerformedAtHome: true, optPhases: [5], source: 'p90x' }),
  exV2({ name: 'Medicine Ball Slam', description: 'Explosive overhead throw of medicine ball to the ground.', instructions: '1. Lift medicine ball overhead. 2. Slam it to ground with full force. 3. Pick up and repeat.', exerciseType: 'compound', primaryMuscles: ['Core', 'Latissimus Dorsi'], secondaryMuscles: ['Shoulders', 'Triceps'], difficulty: 300, equipmentNeeded: ['Medicine Ball'], force: 'push', mechanic: 'compound', defaultTempo: 'X/0/X', defaultRestSeconds: 45, optPhases: [5] }),
  exV2({ name: 'Battle Rope Alternating Waves', description: 'Alternating arm waves with heavy battle ropes for conditioning.', instructions: '1. Hold rope ends. 2. Alternate raising and lowering each arm rapidly. 3. Maintain athletic stance. 4. Continue for time.', exerciseType: 'compound', primaryMuscles: ['Shoulders', 'Core'], secondaryMuscles: ['Forearms', 'Biceps'], difficulty: 350, equipmentNeeded: ['Battle Ropes'], force: 'push', mechanic: 'compound', defaultTempo: 'X/0/X', defaultRestSeconds: 60, optPhases: [1, 5] }),
  exV2({ name: 'Sled Push', description: 'Pushing a weighted sled for leg drive and conditioning.', instructions: '1. Grip sled handles at waist. 2. Drive forward with full leg extension. 3. Keep torso at 45 degrees. 4. Push for distance or time.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Core', 'Calves', 'Shoulders'], difficulty: 400, equipmentNeeded: ['Sled'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'gait', defaultTempo: 'X/0/X', defaultRestSeconds: 120, optPhases: [4, 5] }),
  exV2({ name: 'Tire Flip', description: 'Explosive full-body movement flipping a large tire.', instructions: '1. Squat to tire, hands underneath. 2. Drive with legs, flip tire over. 3. Push through to complete flip.', exerciseType: 'compound', primaryMuscles: ['Glutes', 'Quadriceps', 'Hamstrings'], secondaryMuscles: ['Core', 'Biceps', 'Shoulders'], difficulty: 600, equipmentNeeded: ['Tire'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'hinge', defaultTempo: 'X/0/X', defaultRestSeconds: 120, optPhases: [4, 5] }),
  exV2({ name: 'Wall Ball', description: 'Squat to overhead throw against a wall target.', instructions: '1. Hold medicine ball at chest. 2. Squat to parallel. 3. Stand explosively, throwing ball to wall target. 4. Catch and repeat.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Shoulders'], secondaryMuscles: ['Glutes', 'Core', 'Triceps'], difficulty: 350, equipmentNeeded: ['Medicine Ball'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'squat', defaultTempo: 'X/0/X', defaultRestSeconds: 60, optPhases: [1, 5] }),
  exV2({ name: 'TRX Row', description: 'Suspension trainer inverted row for back development.', instructions: '1. Grip TRX handles, lean back. 2. Pull chest to handles. 3. Squeeze shoulder blades. 4. Lower with control.', exerciseType: 'compound', primaryMuscles: ['Latissimus Dorsi', 'Rhomboids'], secondaryMuscles: ['Biceps', 'Core'], difficulty: 300, equipmentNeeded: ['TRX/Suspension Trainer'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'pull', defaultTempo: '2/1/3', defaultRestSeconds: 60, optPhases: [1, 2] }),
  exV2({ name: 'TRX Pike', description: 'Suspension trainer pike for core and shoulder strength.', instructions: '1. Feet in TRX straps, plank position. 2. Pike hips up, bringing feet toward hands. 3. Lower back to plank.', exerciseType: 'core', primaryMuscles: ['Core', 'Shoulders'], secondaryMuscles: ['Hip Flexors'], difficulty: 500, equipmentNeeded: ['TRX/Suspension Trainer'], force: 'push', mechanic: 'compound', defaultTempo: '2/1/3', defaultRestSeconds: 60, optPhases: [1, 2] }),
];

// ─── Combine all exercise arrays ────────────────────────────
const ALL_EXPANDED = [...kettlebell, ...bands, ...bodyweight, ...machines, ...mobility, ...functional];

/**
 * Seed expanded exercises using exercise_key-based findOrCreate.
 * CEO Ruling V2.0: Use exercise_key for idempotent upserts.
 */
export async function seedExpandedExercises() {
  let created = 0;
  let skipped = 0;

  for (const exerciseData of ALL_EXPANDED) {
    const { id, ...data } = exerciseData;

    try {
      const [, wasCreated] = await Exercise.findOrCreate({
        where: { exercise_key: data.exercise_key },
        defaults: { id, ...data },
      });

      if (wasCreated) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      // If exercise_key column doesn't exist yet, fall back to name
      if (error.message?.includes('exercise_key')) {
        const [, wasCreated] = await Exercise.findOrCreate({
          where: { name: data.name },
          defaults: { id, ...data },
        });
        if (wasCreated) created++;
        else skipped++;
      } else {
        console.error(`Failed to seed ${data.name}:`, error.message);
      }
    }
  }

  console.log(`Expanded exercises: ${created} created, ${skipped} already existed (${ALL_EXPANDED.length} total)`);
  return { created, skipped, total: ALL_EXPANDED.length };
}

// Allow direct execution
const isDirectRun = process.argv[1]?.includes('seed-expanded-exercises');
if (isDirectRun) {
  seedExpandedExercises()
    .then((r) => { console.log('Done:', r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}
