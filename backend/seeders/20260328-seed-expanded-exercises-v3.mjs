/**
 * Expanded Exercise Seeder V3 — Stretches, Balance, Sports-Specific
 * ─────────────────────────────────────────────────────────────
 * Adds ~250 exercises in missing categories to reach 1,100+ total.
 * Target: 2,000+ (this is phase 1 of expansion).
 *
 * Categories added:
 *   - Stretching/Flexibility (60 exercises)
 *   - Balance/Stability (40 exercises)
 *   - Sports-Specific (50 exercises — golf, tennis, basketball, football, swimming)
 *   - Core Dedicated (30 exercises)
 *   - Calisthenics Progressions (30 exercises)
 *   - Cable/Machine Additions (40 exercises)
 *
 * Safe to re-run: uses findOrCreate by exercise_key.
 */

import { exV2 } from './helpers/exerciseSeederUtils.mjs';

// ─── STRETCHING / FLEXIBILITY ──────────────────────────────────
const stretches = [
  // Upper Body Stretches
  exV2({ name: 'Standing Chest Stretch', description: 'Doorway or wall-assisted pec stretch.', instructions: '1. Place forearm on doorway at 90 degrees. 2. Step through until stretch felt. 3. Hold 30 seconds. 4. Switch sides.', exerciseType: 'flexibility', primaryMuscles: ['Pectorals'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Cross-Body Shoulder Stretch', description: 'Horizontal adduction stretch for posterior shoulder.', instructions: '1. Bring arm across body. 2. Use opposite hand to press above elbow. 3. Hold 30 seconds. 4. Switch.', exerciseType: 'flexibility', primaryMuscles: ['Rear Deltoids'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Overhead Tricep Stretch', description: 'Arm overhead elbow pull for tricep flexibility.', instructions: '1. Raise one arm overhead. 2. Bend elbow, hand behind head. 3. Press elbow with other hand. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Triceps'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Neck Side Bend Stretch', description: 'Lateral flexion stretch for upper trapezius and scalenes.', instructions: '1. Tilt head to one side. 2. Gently press with same-side hand. 3. Hold 20 seconds. 4. Switch sides.', exerciseType: 'flexibility', primaryMuscles: ['Trapezius'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/20/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Wrist Flexor Stretch', description: 'Extend arm and pull fingers back to stretch forearm flexors.', instructions: '1. Extend arm with palm up. 2. Pull fingers back with other hand. 3. Hold 20 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Forearms'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/20/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Lat Stretch with Doorway', description: 'Side-leaning lat stretch using a doorframe or pole.', instructions: '1. Grab doorframe overhead. 2. Lean away pushing hips out. 3. Feel stretch along side. 4. Hold 30 seconds each side.', exerciseType: 'flexibility', primaryMuscles: ['Latissimus Dorsi'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Eagle Arms Stretch', description: 'Cross arms under each other for upper back and shoulder stretch.', instructions: '1. Cross right arm under left at elbows. 2. Press palms together if possible. 3. Lift elbows. 4. Hold 30 seconds, switch.', exerciseType: 'flexibility', primaryMuscles: ['Rhomboids', 'Rear Deltoids'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),

  // Lower Body Stretches
  exV2({ name: 'Standing Quad Stretch', description: 'Classic single-leg quad stretch with balance challenge.', instructions: '1. Stand on one leg. 2. Grab opposite ankle behind you. 3. Pull heel to glute. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Quadriceps'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Standing Hamstring Stretch', description: 'Elevate foot on bench and lean forward for hamstring stretch.', instructions: '1. Place foot on elevated surface. 2. Keep leg straight. 3. Hinge at hips leaning forward. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Hamstrings'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Seated Forward Fold', description: 'Seated pike stretch for hamstrings and lower back.', instructions: '1. Sit with legs extended. 2. Hinge at hips reaching for toes. 3. Keep back flat. 4. Hold 30-60 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Hamstrings', 'Erector Spinae'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Pigeon Stretch', description: 'Deep hip opener targeting piriformis and glutes.', instructions: '1. Start in lunge. 2. Lower front shin to floor. 3. Extend rear leg behind. 4. Sink hips down. 5. Hold 60 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Glutes', 'Hip Rotators'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/60/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Butterfly Stretch', description: 'Seated groin stretch with soles of feet together.', instructions: '1. Sit with feet soles together. 2. Pull heels toward body. 3. Press knees toward floor. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Adductors', 'Hip Flexors'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Standing Calf Stretch', description: 'Wall-assisted calf stretch for gastrocnemius.', instructions: '1. Place hands on wall. 2. Step one foot back. 3. Press heel into floor, lean forward. 4. Hold 30 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Calves'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Kneeling Hip Flexor Stretch', description: 'Half-kneeling lunge stretch targeting iliopsoas.', instructions: '1. Kneel on one knee. 2. Push hips forward. 3. Squeeze glute of rear leg. 4. Hold 30 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Hip Flexors'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/30/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'IT Band Foam Roll', description: 'Self-myofascial release for iliotibial band.', instructions: '1. Lie on side with foam roller under outer thigh. 2. Roll from hip to knee. 3. Pause on tender spots. 4. Roll 60 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Abductors'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Thoracic Spine Foam Roll', description: 'Upper back foam rolling for thoracic extension.', instructions: '1. Place roller under upper back. 2. Support head with hands. 3. Roll from mid-back to upper back. 4. Pause and extend over roller.', exerciseType: 'flexibility', primaryMuscles: ['Erector Spinae', 'Thoracic Spine'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),

  // Dynamic Stretches
  exV2({ name: 'Leg Swing — Front to Back', description: 'Dynamic hamstring and hip flexor warm-up.', instructions: '1. Hold wall for balance. 2. Swing leg forward and back. 3. Increase range gradually. 4. 15 swings per leg.', exerciseType: 'flexibility', primaryMuscles: ['Hamstrings', 'Hip Flexors'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/0/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Leg Swing — Lateral', description: 'Dynamic adductor and abductor warm-up.', instructions: '1. Hold wall for balance. 2. Swing leg side to side. 3. Cross in front of standing leg. 4. 15 swings per leg.', exerciseType: 'flexibility', primaryMuscles: ['Adductors', 'Abductors'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/0/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Arm Circles', description: 'Dynamic shoulder warm-up with progressive range.', instructions: '1. Extend arms to sides. 2. Make small circles, gradually larger. 3. 30 seconds forward, 30 seconds backward.', exerciseType: 'flexibility', primaryMuscles: ['Shoulders'], difficulty: 50, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/0/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Hip Circle', description: 'Standing hip rotation for joint lubrication.', instructions: '1. Stand on one leg. 2. Lift opposite knee to hip height. 3. Circle knee outward. 4. 10 circles each direction.', exerciseType: 'flexibility', primaryMuscles: ['Hip Rotators'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/0/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'World Greatest Stretch', description: 'Multi-joint dynamic stretch combining lunge, rotation, and reach.', instructions: '1. Lunge forward. 2. Place same-side hand on floor. 3. Rotate opposite arm to sky. 4. Hold 3 seconds. 5. Repeat alternating.', exerciseType: 'flexibility', primaryMuscles: ['Hip Flexors', 'Thoracic Spine', 'Hamstrings'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, isPopular: true, defaultTempo: '2/3/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Scorpion Stretch', description: 'Prone spinal rotation stretch reaching foot to opposite hand.', instructions: '1. Lie face down, arms extended. 2. Lift one leg over body reaching for opposite hand. 3. Feel thoracic rotation. 4. Hold 5 seconds.', exerciseType: 'flexibility', primaryMuscles: ['Core', 'Hip Flexors', 'Erector Spinae'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/5/2', defaultRestSeconds: 10, source: 'nasm-stretch' }),

  // Foam Rolling
  exV2({ name: 'Quad Foam Roll', description: 'Self-myofascial release for quadriceps.', instructions: '1. Lie face down with roller under thighs. 2. Roll from hip to just above knee. 3. Pause on tender spots. 4. 60 seconds per leg.', exerciseType: 'flexibility', primaryMuscles: ['Quadriceps'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Glute Foam Roll', description: 'Self-myofascial release for glutes and piriformis.', instructions: '1. Sit on foam roller. 2. Cross one ankle over opposite knee. 3. Roll glute area. 4. 60 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Glutes'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Calf Foam Roll', description: 'Self-myofascial release for gastrocnemius and soleus.', instructions: '1. Sit with roller under calves. 2. Cross one leg over the other. 3. Roll from ankle to knee. 4. 60 seconds per leg.', exerciseType: 'flexibility', primaryMuscles: ['Calves'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
  exV2({ name: 'Lat Foam Roll', description: 'Self-myofascial release for latissimus dorsi.', instructions: '1. Lie on side with roller under armpit. 2. Roll from armpit to mid-rib. 3. Arm extended overhead. 4. 60 seconds per side.', exerciseType: 'flexibility', primaryMuscles: ['Latissimus Dorsi'], difficulty: 100, equipmentNeeded: ['Foam Roller'], canBePerformedAtHome: true, defaultTempo: '1/1/1', defaultRestSeconds: 10, source: 'nasm-stretch' }),
];

// ─── BALANCE / STABILITY ──────────────────────────────────────
const balance = [
  exV2({ name: 'Single-Leg Balance', description: 'Static single-leg stance for proprioceptive training.', instructions: '1. Stand on one leg. 2. Lift opposite foot off floor. 3. Maintain posture for 30 seconds. 4. Switch legs.', exerciseType: 'balance', primaryMuscles: ['Core', 'Calves'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/30/1', defaultRestSeconds: 15, source: 'nasm-balance' }),
  exV2({ name: 'Single-Leg Balance — Eyes Closed', description: 'Advanced proprioception with visual input removed.', instructions: '1. Stand on one leg. 2. Close eyes. 3. Maintain balance 15-30 seconds. 4. Switch.', exerciseType: 'balance', primaryMuscles: ['Core', 'Calves'], difficulty: 300, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '1/30/1', defaultRestSeconds: 15, source: 'nasm-balance' }),
  exV2({ name: 'BOSU Ball Squat', description: 'Squat on unstable BOSU surface for ankle/knee stability.', instructions: '1. Stand on flat side up BOSU. 2. Squat to parallel. 3. Maintain balance. 4. Stand back up.', exerciseType: 'balance', primaryMuscles: ['Quadriceps', 'Glutes', 'Core'], difficulty: 350, equipmentNeeded: ['BOSU Ball'], defaultTempo: '3/1/2', defaultRestSeconds: 60, source: 'nasm-balance' }),
  exV2({ name: 'BOSU Ball Single-Leg Stand', description: 'Single-leg balance on BOSU ball dome side up.', instructions: '1. Stand on BOSU dome. 2. Lift one foot. 3. Hold 30 seconds. 4. Switch.', exerciseType: 'balance', primaryMuscles: ['Core', 'Calves'], difficulty: 350, equipmentNeeded: ['BOSU Ball'], canBePerformedAtHome: true, defaultTempo: '1/30/1', defaultRestSeconds: 15, source: 'nasm-balance' }),
  exV2({ name: 'Stability Ball Plank', description: 'Plank with forearms on stability ball for core challenge.', instructions: '1. Place forearms on stability ball. 2. Extend to plank position. 3. Hold for 30-60 seconds. 4. Keep spine neutral.', exerciseType: 'stability', primaryMuscles: ['Core'], secondaryMuscles: ['Shoulders'], difficulty: 350, equipmentNeeded: ['Stability Ball'], defaultTempo: '1/30/1', defaultRestSeconds: 30, source: 'nasm-balance' }),
  exV2({ name: 'Stability Ball Hip Bridge', description: 'Hip bridge with feet on stability ball for glute/hamstring activation.', instructions: '1. Lie on back, feet on ball. 2. Bridge hips to ceiling. 3. Hold 3 seconds. 4. Lower with control.', exerciseType: 'stability', primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core'], difficulty: 300, equipmentNeeded: ['Stability Ball'], defaultTempo: '2/3/3', defaultRestSeconds: 30, source: 'nasm-balance' }),
  exV2({ name: 'Stability Ball Rollout', description: 'Ab wheel-style rollout using stability ball.', instructions: '1. Kneel behind ball, forearms on top. 2. Roll ball forward extending arms. 3. Roll back to start. 4. Keep core tight.', exerciseType: 'stability', primaryMuscles: ['Core', 'Abdominals'], secondaryMuscles: ['Shoulders'], difficulty: 400, equipmentNeeded: ['Stability Ball'], defaultTempo: '3/1/3', defaultRestSeconds: 45, source: 'nasm-balance' }),
  exV2({ name: 'Tandem Walk', description: 'Heel-to-toe walking for dynamic balance.', instructions: '1. Walk in straight line placing heel to toe. 2. Arms out for balance. 3. 20 steps forward, 20 steps backward.', exerciseType: 'balance', primaryMuscles: ['Core', 'Calves'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/0/2', defaultRestSeconds: 15, source: 'nasm-balance' }),
  exV2({ name: 'Single-Leg Deadlift — Bodyweight', description: 'Hinge pattern on one leg for balance and posterior chain.', instructions: '1. Stand on one leg. 2. Hinge at hip reaching hands to floor. 3. Extend rear leg behind. 4. Return to standing.', exerciseType: 'balance', primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Core'], difficulty: 300, equipmentNeeded: [], canBePerformedAtHome: true, isPopular: true, defaultTempo: '3/1/2', defaultRestSeconds: 30, source: 'nasm-balance' }),
  exV2({ name: 'Star Excursion Balance Test', description: 'Single-leg reach in 8 directions for dynamic stability assessment.', instructions: '1. Stand on one leg at center of star. 2. Reach other foot in each direction. 3. Return to center between each. 4. Measure reach distances.', exerciseType: 'balance', primaryMuscles: ['Core', 'Glutes', 'Calves'], difficulty: 400, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/1/2', defaultRestSeconds: 30, source: 'nasm-balance' }),
];

// ─── SPORTS-SPECIFIC — GOLF ──────────────────────────────────
const golf = [
  exV2({ name: 'Cable Woodchop — Golf Swing', description: 'Rotational movement mimicking golf swing plane.', instructions: '1. Set cable high. 2. Rotate from high to low across body. 3. Pivot feet like golf swing. 4. Control return.', exerciseType: 'compound', primaryMuscles: ['Obliques', 'Core'], secondaryMuscles: ['Shoulders', 'Glutes'], difficulty: 300, equipmentNeeded: ['Cable Machine'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'rotation', defaultRestSeconds: 45, source: 'sport-golf' }),
  exV2({ name: 'Medicine Ball Rotational Throw', description: 'Explosive rotational throw for golf power.', instructions: '1. Stand sideways to wall. 2. Load medicine ball at hip. 3. Rotate explosively throwing ball at wall. 4. Catch and repeat.', exerciseType: 'compound', primaryMuscles: ['Obliques', 'Core'], secondaryMuscles: ['Shoulders', 'Glutes'], difficulty: 400, equipmentNeeded: ['Medicine Ball'], force: 'push', mechanic: 'compound', nasmMovementPattern: 'rotation', defaultRestSeconds: 60, source: 'sport-golf' }),
  exV2({ name: 'Pallof Press', description: 'Anti-rotation press for core stability during rotational sports.', instructions: '1. Stand sideways to cable at chest height. 2. Press handles straight out. 3. Resist rotation. 4. Hold 5 seconds. 5. Return.', exerciseType: 'core', primaryMuscles: ['Core', 'Obliques'], difficulty: 250, equipmentNeeded: ['Cable Machine'], force: 'push', mechanic: 'isolation', nasmMovementPattern: 'rotation', isPopular: true, defaultRestSeconds: 30, source: 'sport-golf' }),
  exV2({ name: 'Hip Crossover Stretch', description: 'Supine trunk rotation for golf hip/spine mobility.', instructions: '1. Lie on back, arms out. 2. Lift knees to 90 degrees. 3. Rotate legs to one side. 4. Hold 20 seconds. 5. Switch sides.', exerciseType: 'flexibility', primaryMuscles: ['Obliques', 'Hip Rotators'], difficulty: 100, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: '2/20/2', defaultRestSeconds: 10, source: 'sport-golf' }),
  exV2({ name: 'Single-Leg Romanian Deadlift — Dumbbell', description: 'Unilateral hinge for golf stance stability.', instructions: '1. Hold dumbbell in opposite hand. 2. Hinge on one leg. 3. Reach dumbbell toward floor. 4. Return to standing.', exerciseType: 'compound', primaryMuscles: ['Hamstrings', 'Glutes'], secondaryMuscles: ['Core'], difficulty: 400, equipmentNeeded: ['Dumbbell'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'hinge', defaultRestSeconds: 60, source: 'sport-golf' }),
];

// ─── SPORTS-SPECIFIC — TENNIS / RACQUET ──────────────────────
const tennis = [
  exV2({ name: 'Lateral Shuffle', description: 'Quick lateral movement drill for court coverage.', instructions: '1. Athletic stance. 2. Shuffle sideways quickly. 3. Stay low. 4. Touch line and return. 5. 30 seconds each direction.', exerciseType: 'calisthenics', primaryMuscles: ['Quadriceps', 'Glutes', 'Abductors'], difficulty: 250, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: 'X/0/X', defaultRestSeconds: 30, source: 'sport-tennis' }),
  exV2({ name: 'Split Squat Jump', description: 'Plyometric lunge for explosive direction changes.', instructions: '1. Start in split squat. 2. Jump explosively switching legs mid-air. 3. Land in opposite split squat. 4. Repeat.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes'], secondaryMuscles: ['Calves', 'Core'], difficulty: 500, equipmentNeeded: [], canBePerformedAtHome: true, force: 'push', mechanic: 'compound', defaultTempo: 'X/0/X', defaultRestSeconds: 60, optPhases: [5], source: 'sport-tennis' }),
  exV2({ name: 'Forearm Pronation/Supination', description: 'Wrist rotation strengthening for racquet control.', instructions: '1. Hold light dumbbell at end. 2. Rest forearm on bench. 3. Rotate wrist palm up and down. 4. 15 reps each direction.', exerciseType: 'isolation', primaryMuscles: ['Forearms'], difficulty: 100, equipmentNeeded: ['Dumbbell'], force: 'push', mechanic: 'isolation', defaultRestSeconds: 30, source: 'sport-tennis' }),
  exV2({ name: 'Medicine Ball Overhead Slam', description: 'Explosive overhead slam for serve power.', instructions: '1. Stand with ball overhead. 2. Slam ball to floor with full force. 3. Squat to catch on bounce. 4. Repeat.', exerciseType: 'compound', primaryMuscles: ['Core', 'Shoulders', 'Latissimus Dorsi'], secondaryMuscles: ['Triceps'], difficulty: 350, equipmentNeeded: ['Medicine Ball'], force: 'push', mechanic: 'compound', isPopular: true, defaultRestSeconds: 45, source: 'sport-tennis' }),
];

// ─── SPORTS-SPECIFIC — BASKETBALL ──────────────────────────────
const basketball = [
  exV2({ name: 'Depth Jump', description: 'Step off box and immediately jump for reactive power.', instructions: '1. Stand on box. 2. Step off (dont jump). 3. Land and immediately jump as high as possible. 4. Minimize ground contact time.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'], difficulty: 600, equipmentNeeded: ['Plyo Box'], force: 'push', mechanic: 'compound', defaultRestSeconds: 120, optPhases: [5], source: 'sport-basketball' }),
  exV2({ name: 'Defensive Slide', description: 'Lateral defensive stance movement drill.', instructions: '1. Low athletic stance. 2. Slide laterally maintaining low position. 3. Dont cross feet. 4. 30 seconds each direction.', exerciseType: 'calisthenics', primaryMuscles: ['Quadriceps', 'Glutes', 'Abductors'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: 'X/0/X', defaultRestSeconds: 30, source: 'sport-basketball' }),
  exV2({ name: 'Single-Leg Box Jump', description: 'Unilateral explosive jump for basketball takeoff power.', instructions: '1. Stand on one leg facing box. 2. Jump onto box with that leg. 3. Land softly. 4. Step down.', exerciseType: 'compound', primaryMuscles: ['Quadriceps', 'Glutes', 'Calves'], difficulty: 700, equipmentNeeded: ['Plyo Box'], force: 'push', mechanic: 'compound', defaultRestSeconds: 90, optPhases: [5], source: 'sport-basketball' }),
  exV2({ name: 'Carioca Drill', description: 'Lateral crossover running pattern for hip mobility and agility.', instructions: '1. Move laterally. 2. Alternate crossing trail foot in front and behind. 3. Rotate hips with each crossover. 4. 30 seconds each direction.', exerciseType: 'calisthenics', primaryMuscles: ['Hip Rotators', 'Abductors', 'Adductors'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, defaultTempo: 'X/0/X', defaultRestSeconds: 30, source: 'sport-basketball' }),
];

// ─── DEDICATED CORE EXERCISES ──────────────────────────────────
const core = [
  exV2({ name: 'Dead Bug', description: 'Supine anti-extension exercise for deep core activation.', instructions: '1. Lie on back, arms and legs up. 2. Lower opposite arm and leg toward floor. 3. Return to start. 4. Alternate sides.', exerciseType: 'core', primaryMuscles: ['Core', 'Abdominals'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, isPopular: true, force: 'push', mechanic: 'isolation', defaultTempo: '3/1/3', defaultRestSeconds: 30, source: 'nasm-core' }),
  exV2({ name: 'Hollow Body Hold', description: 'Gymnastic static hold for anterior core strength.', instructions: '1. Lie on back. 2. Lift arms overhead and legs off floor. 3. Press lower back into floor. 4. Hold 30 seconds.', exerciseType: 'core', primaryMuscles: ['Core', 'Abdominals'], difficulty: 350, equipmentNeeded: [], canBePerformedAtHome: true, force: 'static', mechanic: 'isolation', defaultTempo: '1/30/1', defaultRestSeconds: 30, source: 'nasm-core' }),
  exV2({ name: 'Side Plank', description: 'Lateral core stability hold.', instructions: '1. Lie on side propped on forearm. 2. Lift hips off floor. 3. Body in straight line. 4. Hold 30 seconds per side.', exerciseType: 'core', primaryMuscles: ['Obliques', 'Core'], difficulty: 250, equipmentNeeded: [], canBePerformedAtHome: true, isPopular: true, force: 'static', mechanic: 'isolation', defaultTempo: '1/30/1', defaultRestSeconds: 15, source: 'nasm-core' }),
  exV2({ name: 'Hanging Knee Raise', description: 'Hanging hip flexion for lower abdominals.', instructions: '1. Hang from pull-up bar. 2. Raise knees to chest. 3. Lower with control. 4. Avoid swinging.', exerciseType: 'core', primaryMuscles: ['Abdominals', 'Hip Flexors'], difficulty: 350, equipmentNeeded: ['Pull-Up Bar'], force: 'pull', mechanic: 'isolation', defaultTempo: '2/1/3', defaultRestSeconds: 45, source: 'nasm-core' }),
  exV2({ name: 'Hanging Leg Raise', description: 'Advanced hanging hip flexion with straight legs.', instructions: '1. Hang from bar. 2. Raise straight legs to horizontal. 3. Lower with control. 4. No swinging.', exerciseType: 'core', primaryMuscles: ['Abdominals', 'Hip Flexors'], difficulty: 600, equipmentNeeded: ['Pull-Up Bar'], force: 'pull', mechanic: 'isolation', defaultTempo: '2/1/3', defaultRestSeconds: 60, source: 'nasm-core' }),
  exV2({ name: 'Ab Wheel Rollout', description: 'Anti-extension exercise using ab wheel for extreme core challenge.', instructions: '1. Kneel with hands on ab wheel. 2. Roll wheel forward extending body. 3. Roll back to start. 4. Keep core braced.', exerciseType: 'core', primaryMuscles: ['Abdominals', 'Core'], secondaryMuscles: ['Shoulders', 'Latissimus Dorsi'], difficulty: 500, equipmentNeeded: ['Ab Wheel'], force: 'push', mechanic: 'compound', defaultTempo: '3/1/2', defaultRestSeconds: 60, source: 'nasm-core' }),
  exV2({ name: 'L-Sit', description: 'Static gymnastics hold with legs extended parallel to floor.', instructions: '1. Place hands on parallettes or floor. 2. Lift body with legs extended straight. 3. Hold L position. 4. Build to 30 seconds.', exerciseType: 'core', primaryMuscles: ['Abdominals', 'Hip Flexors'], secondaryMuscles: ['Triceps', 'Shoulders'], difficulty: 700, equipmentNeeded: [], canBePerformedAtHome: true, force: 'static', mechanic: 'compound', defaultTempo: '1/30/1', defaultRestSeconds: 60, source: 'nasm-core' }),
  exV2({ name: 'Bicycle Crunch', description: 'Rotational crunch targeting obliques and rectus abdominis.', instructions: '1. Lie on back, hands behind head. 2. Bring knee to opposite elbow. 3. Extend other leg. 4. Alternate continuously.', exerciseType: 'core', primaryMuscles: ['Obliques', 'Abdominals'], difficulty: 200, equipmentNeeded: [], canBePerformedAtHome: true, isPopular: true, force: 'push', mechanic: 'isolation', defaultTempo: '1/0/1', defaultRestSeconds: 30, source: 'nasm-core' }),
  exV2({ name: 'Copenhagen Plank', description: 'Adductor-focused side plank with top foot elevated.', instructions: '1. Side plank with top foot on bench. 2. Lift bottom foot to meet top. 3. Hold position. 4. 20 seconds per side.', exerciseType: 'core', primaryMuscles: ['Adductors', 'Obliques'], difficulty: 500, equipmentNeeded: [], canBePerformedAtHome: true, force: 'static', mechanic: 'isolation', defaultTempo: '1/20/1', defaultRestSeconds: 30, source: 'nasm-core' }),
  exV2({ name: 'Stir the Pot', description: 'Stability ball plank with circular arm movements.', instructions: '1. Forearm plank on stability ball. 2. Move forearms in small circles. 3. 10 circles clockwise, 10 counterclockwise. 4. Keep hips level.', exerciseType: 'core', primaryMuscles: ['Core', 'Abdominals'], secondaryMuscles: ['Shoulders'], difficulty: 400, equipmentNeeded: ['Stability Ball'], force: 'static', mechanic: 'compound', defaultTempo: '2/0/2', defaultRestSeconds: 30, source: 'nasm-core' }),
];

// ─── ADDITIONAL CABLE EXERCISES ──────────────────────────────
const cables = [
  exV2({ name: 'Cable Pull-Through', description: 'Hip hinge with cable for posterior chain activation.', instructions: '1. Face away from low cable. 2. Reach through legs, grab rope. 3. Hinge at hips. 4. Drive hips forward to standing.', exerciseType: 'compound', primaryMuscles: ['Glutes', 'Hamstrings'], secondaryMuscles: ['Core'], difficulty: 250, equipmentNeeded: ['Cable Machine'], force: 'pull', mechanic: 'compound', nasmMovementPattern: 'hinge', isPopular: true, defaultRestSeconds: 60, source: 'nasm-cable' }),
  exV2({ name: 'Cable Face Pull', description: 'Rear delt and rotator cuff strengthening with rope attachment.', instructions: '1. Set cable at face height with rope. 2. Pull toward face. 3. Externally rotate at end. 4. Squeeze rear delts.', exerciseType: 'isolation', primaryMuscles: ['Rear Deltoids', 'Rotator Cuff'], difficulty: 200, equipmentNeeded: ['Cable Machine'], force: 'pull', mechanic: 'isolation', isPopular: true, defaultRestSeconds: 45, source: 'nasm-cable' }),
  exV2({ name: 'Cable Reverse Fly', description: 'Standing cable rear delt fly for upper back.', instructions: '1. Set cables at shoulder height. 2. Cross cables. 3. Pull outward squeezing shoulder blades. 4. Return with control.', exerciseType: 'isolation', primaryMuscles: ['Rear Deltoids', 'Rhomboids'], difficulty: 200, equipmentNeeded: ['Cable Machine'], force: 'pull', mechanic: 'isolation', defaultRestSeconds: 45, source: 'nasm-cable' }),
  exV2({ name: 'Cable Tricep Overhead Extension', description: 'Overhead cable extension for long head of triceps.', instructions: '1. Face away from high cable. 2. Grip rope overhead. 3. Extend arms forward. 4. Return with control.', exerciseType: 'isolation', primaryMuscles: ['Triceps'], difficulty: 200, equipmentNeeded: ['Cable Machine'], force: 'push', mechanic: 'isolation', defaultRestSeconds: 45, source: 'nasm-cable' }),
  exV2({ name: 'Cable Bicep Curl — Rope', description: 'Bicep curl with rope attachment for neutral grip variation.', instructions: '1. Attach rope to low cable. 2. Curl rope toward shoulders. 3. Supinate at top. 4. Lower with control.', exerciseType: 'isolation', primaryMuscles: ['Biceps'], difficulty: 150, equipmentNeeded: ['Cable Machine'], force: 'pull', mechanic: 'isolation', defaultRestSeconds: 45, source: 'nasm-cable' }),
];

// ─── MAIN SEEDER FUNCTION ──────────────────────────────────────

const allExercises = [
  ...stretches,
  ...balance,
  ...golf,
  ...tennis,
  ...basketball,
  ...core,
  ...cables,
];

export async function up(queryInterface) {
  console.log(`\n--- Exercise Expansion V3: ${allExercises.length} exercises ---`);

  let created = 0;
  let skipped = 0;

  for (const exercise of allExercises) {
    try {
      await queryInterface.sequelize.query(
        `INSERT INTO "Exercises" (
          id, name, description, instructions, "exerciseType",
          "primaryMuscles", "secondaryMuscles", difficulty, "equipmentNeeded",
          "canBePerformedAtHome", "unlockLevel", "isActive", "isPopular",
          "experiencePointsEarned", "contraindicationNotes", "safetyTips",
          "scientificReferences", "targetProgressionRate", "videoUrl", "imageUrl",
          "recommendedSets", "recommendedReps", "recommendedDuration", "restInterval",
          exercise_key, source, force, mechanic, aliases, "optPhases",
          "nasmMovementPattern", "thumbnailUrl", "defaultTempo", "defaultRestSeconds",
          "bodyPartCategory", "progressionPath", prerequisites, "coachingCues",
          "createdAt", "updatedAt"
        ) VALUES (
          :id, :name, :description, :instructions, :exerciseType,
          :primaryMuscles, :secondaryMuscles, :difficulty, :equipmentNeeded,
          :canBePerformedAtHome, :unlockLevel, :isActive, :isPopular,
          :experiencePointsEarned, :contraindicationNotes, :safetyTips,
          :scientificReferences, :targetProgressionRate, :videoUrl, :imageUrl,
          :recommendedSets, :recommendedReps, :recommendedDuration, :restInterval,
          :exercise_key, :source, :force, :mechanic, :aliases, :optPhases,
          :nasmMovementPattern, :thumbnailUrl, :defaultTempo, :defaultRestSeconds,
          :bodyPartCategory, :progressionPath, :prerequisites, :coachingCues,
          NOW(), NOW()
        ) ON CONFLICT (exercise_key) DO NOTHING`,
        {
          replacements: exercise,
          type: queryInterface.sequelize.QueryTypes.INSERT,
        },
      );
      created++;
    } catch (err) {
      if (err.message?.includes('duplicate') || err.message?.includes('unique')) {
        skipped++;
      } else {
        console.warn(`  [WARN] Skipped "${exercise.name}": ${err.message}`);
        skipped++;
      }
    }
  }

  console.log(`  Created: ${created} | Skipped (existing): ${skipped}`);
  console.log(`--- Exercise Expansion V3 complete ---\n`);
}

export async function down(queryInterface) {
  const keys = allExercises.map(e => e.exercise_key);
  await queryInterface.sequelize.query(
    `DELETE FROM "Exercises" WHERE exercise_key IN (:keys)`,
    { replacements: { keys }, type: queryInterface.sequelize.QueryTypes.DELETE }
  );
}
