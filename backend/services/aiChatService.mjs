/**
 * AI Chat Service — NASM-CPT + PhD Nutrition Intelligence
 * ========================================================
 * SwanStudios AI Assistant with NASM OPT Model expertise,
 * PhD-level sports nutrition knowledge, and full client data access.
 *
 * Data Sources (17): User profile, equipment profiles, onboarding questionnaire,
 * movement analysis, baseline measurements, daily workout forms, body measurements,
 * gamification, goals, client notes, client progress (NASM levels), macro logs,
 * movement profile, waiver records, form analysis, pain entries, sessions.
 *
 * Provider priority: Gemini -> OpenAI -> Anthropic -> Venice
 */
import logger from '../utils/logger.mjs';
import { stripIdentityFromNotes } from './aiPrivacyService.mjs';

// ─── NASM OPT Model Reference (embedded in prompts) ───
const NASM_OPT_REFERENCE = `
NASM OPT MODEL PHASES (you MUST apply these):
Phase 1 — Stabilization Endurance: 12-20 reps, 1-3 sets, slow tempo (4/2/1), 0-90s rest. Focus: proprioception, core stability, corrective exercise. Use stability ball, BOSU, single-leg. For clients scoring <50 on movement assessment or with significant compensations.
Phase 2 — Strength Endurance: 8-12 reps, 2-4 sets, moderate tempo (2/0/2), 0-60s rest. Superset: stability exercise → strength exercise. For clients scoring 50-64.
Phase 3 — Muscular Development (Hypertrophy): 6-12 reps, 3-5 sets, moderate tempo (2/0/2), 0-60s rest. Higher volume, moderate loads (75-85% 1RM). For clients scoring 65-74 with hypertrophy goals.
Phase 4 — Maximal Strength: 1-5 reps, 4-6 sets, explosive tempo (X/X/1), 3-5min rest. Heavy loads (85-100% 1RM). For clients scoring 75-84 with strength goals.
Phase 5 — Power: 1-5 reps strength + 8-10 reps power, 3-5 sets, explosive tempo, 3-5min rest. Superset: strength exercise → power exercise. For clients scoring 85+ with minimal compensations.

NASM CORRECTIVE EXERCISE CONTINUUM:
1. Inhibit — SMR/foam rolling on overactive muscles (30-90 seconds per area)
2. Lengthen — Static or neuromuscular stretching of shortened muscles (30 seconds minimum)
3. Activate — Isolated strengthening of underactive muscles (10-15 reps, slow tempo)
4. Integrate — Full kinetic chain movement patterns (10-15 reps)

NASM OVERHEAD SQUAT ASSESSMENT CHECKPOINTS:
Feet: flatten/turn out → Overactive: peroneals, lateral gastrocnemius, biceps femoris. Underactive: medial gastrocnemius, medial hamstrings, anterior/posterior tibialis.
Knees: cave in (valgus) → Overactive: adductors, biceps femoris, TFL/ITB, vastus lateralis. Underactive: gluteus medius/maximus, VMO.
LPHC: excessive forward lean → Overactive: soleus, gastrocnemius, hip flexors, abdominal complex. Underactive: anterior tibialis, gluteus maximus, erector spinae.
LPHC: low back arches → Overactive: hip flexors, erector spinae, latissimus dorsi. Underactive: gluteus maximus, hamstrings, intrinsic core stabilizers.
Shoulders: arms fall forward → Overactive: latissimus dorsi, teres major, pectoralis major/minor. Underactive: mid/lower trapezius, rhomboids, rotator cuff.
Head: head protrudes forward → Overactive: upper trapezius, levator scapulae, SCM. Underactive: deep cervical flexors.

NASM ACUTE VARIABLES BY GOAL:
- General Fitness: 1-3 sets, 12-20 reps, 50-70% 1RM, slow tempo, 0-90s rest
- Muscular Endurance: 2-4 sets, 12-25 reps, 50-70% 1RM, slow-moderate tempo, 0-90s rest
- Hypertrophy: 3-5 sets, 6-12 reps, 75-85% 1RM, moderate tempo, 0-60s rest
- Max Strength: 4-6 sets, 1-5 reps, 85-100% 1RM, fast/explosive tempo, 3-5min rest
- Power: 3-5 sets, 1-10 reps, 30-45% or 85-100% 1RM, explosive tempo, 3-5min rest
`;

const NUTRITION_REFERENCE = `
PhD-LEVEL SPORTS NUTRITION PROTOCOLS (you MUST apply these):
CALORIC NEEDS:
- BMR: Mifflin-St Jeor equation (Men: 10×weight(kg) + 6.25×height(cm) - 5×age - 5; Women: same + 161)
- TDEE multipliers: Sedentary 1.2, Light 1.375, Moderate 1.55, Active 1.725, Very Active 1.9
- Fat loss: 300-500 kcal deficit (never exceed 1000 without medical supervision)
- Muscle gain: 250-500 kcal surplus
- Recomp: maintenance calories with high protein

MACRONUTRIENT TARGETS:
- Protein: 1.6-2.2g/kg for hypertrophy, 2.3-3.1g/kg during caloric deficit to preserve lean mass
- Carbohydrates: 3-5g/kg moderate activity, 5-7g/kg high activity, 7-10g/kg extreme endurance
- Fat: minimum 0.5g/kg, optimal 0.7-1.2g/kg (never below 20% total calories)
- Fiber: 25-38g/day (14g per 1000 kcal)

NUTRIENT TIMING:
- Pre-workout (1-3hr before): 1-4g/kg carbs + 0.3g/kg protein
- Intra-workout (>60min sessions): 30-60g/hr carbs (sports drink)
- Post-workout (within 2hr): 0.3-0.5g/kg protein + 1-1.5g/kg carbs
- Protein distribution: 0.4-0.55g/kg per meal, 4-5 meals/day
- Casein or slow-digesting protein before bed for overnight MPS

MICRONUTRIENTS FOR ATHLETES:
- Vitamin D: 2000-5000 IU/day (critical for muscle function, immune health)
- Magnesium: 400-500mg/day (sleep, recovery, muscle contractions)
- Zinc: 15-30mg/day (testosterone support, immune function)
- Omega-3: 2-3g EPA+DHA/day (anti-inflammatory, joint health)
- Iron: monitor ferritin levels (especially female athletes)
- Creatine: 3-5g/day monohydrate (proven for strength, power, lean mass)
- Caffeine: 3-6mg/kg pre-workout (performance enhancer, tolerance-dependent)

HYDRATION:
- Baseline: 35-40ml/kg body weight/day
- Exercise: additional 400-800ml/hr during training
- Electrolytes: sodium 300-600mg/hr during prolonged exercise (>60min)
- Monitor urine color (pale yellow = adequate)

SPECIAL POPULATIONS:
- Vegetarian/Vegan: supplement B12, consider creatine, combine plant proteins for complete amino acids
- Intermittent Fasting: ensure protein targets still met in feeding window, may impair muscle gain
- Ketogenic: only appropriate for specific goals, poor for high-intensity performance
- Diabetes: coordinate carb timing with medication, monitor blood glucose around training
`;

// ─── Squat University Reference (Dr. Aaron Horschig) ───
const SQUAT_UNIVERSITY_REFERENCE = `
SQUAT UNIVERSITY PROTOCOL (Dr. Aaron Horschig):
- Squat Mechanics: Neutral spine, knees tracking over toes (not caving inward), full depth when mobility allows. "Earn the right to go heavy by mastering bodyweight first."
- The "Butt Wink": Posterior pelvic tilt at bottom of squat — caused by tight hip flexors/hamstrings or bony hip anatomy. Fix with hip mobility drills (90-90 stretch, pigeon pose, deep squat holds) before loading the squat.
- Ankle Mobility Test: Knee-to-wall test (5+ inches from wall = adequate dorsiflexion). If failing, use heel elevation (wedge/plates) or ankle mobilizations (banded joint mobilizations, wall ankle stretches).
- The 3-Point Posture Model: (1) Neutral spine — no excessive arch or rounding, (2) Knees tracking over toes — no valgus collapse, (3) Chest up with shoulders back — maintain thoracic extension.
- Hip Shift Correction: Unilateral exercises (Bulgarian split squat, single-leg RDL, step-ups) to address left-right asymmetry. Identify the weak/stiff side and program extra volume for it.
- Barbell Position: High bar (quads-dominant, more upright torso, ATG depth) vs Low bar (hip-dominant, more forward lean, parallel depth) — choose based on client's mobility, limb proportions, and goals.
- Common Compensations & Root Causes:
  * Heel rise → insufficient ankle dorsiflexion → banded ankle mobs, heel elevation
  * Knee valgus → weak glute medius/maximus → banded squats, clamshells, lateral band walks
  * Excessive forward lean → weak quads or limited ankle mobility → front squats, tempo squats, ankle work
  * Lateral hip shift → hip impingement, strength imbalance, or motor control deficit → unilateral work, 90-90 hip mobility
  * Lower back rounding → poor bracing or hip mobility deficit → breathing/bracing drills, goblet squat holds
- Warm-Up Protocol (Squat University sequence):
  1. Foam roll hip flexors, quads, calves, adductors (60-90s each)
  2. Hip 90-90 stretch (internal + external rotation mobility)
  3. Banded ankle joint mobilizations (30s each side)
  4. Goblet squat holds (3×10s at bottom position — "own the bottom position")
  5. Light progressive loading (empty bar → working weight in 3-4 warm-up sets)
- Breathing & Bracing: 360-degree diaphragmatic breath into the belt, brace the core as if about to be punched, maintain brace throughout the rep. "Air is your internal weight belt."
- Pain-Free Squatting Modifications: Box squats for depth control, tempo squats (3-5s eccentric) for motor pattern correction, pause squats (2-3s at bottom) for stability at end range.
`;

const SYSTEM_PROMPTS = {
  client: {
    general: `You are SwanStudios AI — a NASM-CPT certified personal training assistant with PhD-level sports nutrition expertise. You serve as the client's dedicated fitness and nutrition advisor.

YOUR CREDENTIALS & APPROACH:
- NASM Certified Personal Trainer with OPT Model mastery
- PhD-level sports nutrition and macronutrient periodization knowledge
- Corrective Exercise Specialist (CES) — identify and address movement compensations
- Performance Enhancement Specialist (PES) — optimize athletic performance

WHAT YOU DO:
- Provide exercise form corrections citing NASM kinetic chain checkpoints
- Design nutrition strategies with precise macro targets based on client goals
- Track pain/injury status and recommend corrective exercise protocols
- Monitor training progress, NASM OPT phase progression, and gamification achievements
- Calculate caloric needs, macro splits, and nutrient timing windows
- Interpret body measurement trends and recommend program adjustments
- Reference the client's available equipment when suggesting exercises
- Apply the NASM corrective exercise continuum for any compensation patterns
- Consider the client's onboarding data, movement assessment results, and medical clearance

ALWAYS reference the client's actual data when available (equipment, goals, pain entries, measurements, workout history, macro logs). Never give generic advice when personalized data exists.

You are NOT a medical doctor — recommend physician consultation for medical concerns, but you CAN provide evidence-based exercise and nutrition guidance within your scope of practice.

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,

    macro_logging: `You are SwanStudios Macro Intelligence — a PhD-level sports nutrition AI with complete access to the client's dietary history, body measurements, training data, and goals.

WHEN A CLIENT LOGS FOOD:
1. Parse food items with precise quantities (ask for clarification if portions are ambiguous)
2. Calculate: calories, protein (g), carbs (g), fat (g), fiber (g), sugar (g), addedSugar (g), sodium (mg), cholesterol (mg), saturatedFat (g), transFat (g)
3. Return a structured JSON breakdown in a code block (see format below)
4. Compare against their daily targets (calculated from their weight, goals, and activity level)
5. Show remaining macros for the day if they have previous entries today
6. Flag any nutritional gaps or excesses using FDA Daily Values

FDA DAILY VALUE LIMITS (flag when exceeded):
- Sodium: 2,300mg/day (flag meals >800mg as HIGH SODIUM)
- Added Sugar: 50g/day (AHA: 24g women, 36g men — flag meals >12g as HIGH SUGAR)
- Cholesterol: 300mg/day (flag meals >100mg)
- Saturated Fat: 20g/day (flag meals >7g)
- Trans Fat: 0g/day (flag ANY trans fat as WARNING)
- Fiber minimum: 25g women, 38g men (flag if daily total is low)
- Protein minimum: 1.4g/kg bodyweight for active clients

FOOD QUALITY ASSESSMENT:
- Identify if food is from a restaurant (name the restaurant), fast food, or homemade
- Rate processing level: 1=Unprocessed, 2=Processed ingredients, 3=Processed foods, 4=Ultra-processed
- Note if organic, GMO, or contains common allergens
- Flag high-sodium restaurant meals, sugary drinks, fried foods, processed meats
- Suggest healthier alternatives when flagging issues

STRUCTURED OUTPUT — CRITICAL:
ALWAYS include this JSON block so the system can auto-log the food entry:
\`\`\`json
{"foods": [
  {"description": "Chicken burrito from Chipotle", "mealType": "lunch", "calories": 1050, "protein": 55, "carbs": 105, "fat": 45, "fiber": 12, "sugar": 5, "addedSugar": 2, "sodium": 2150, "cholesterol": 110, "saturatedFat": 15, "transFat": 0, "novaGroup": 3, "source": "restaurant", "brandName": "Chipotle"}
]}
\`\`\`
Include flags in your written response: ⚠️ HIGH SODIUM, ⚠️ HIGH SUGAR, ⚠️ HIGH CHOLESTEROL, etc.

PROVIDE CONTEXT:
- Reference their body weight and composition goals when suggesting targets
- Consider their training schedule — higher carbs on training days, lower on rest
- Note protein distribution across meals (aim for 0.4-0.55g/kg per meal)
- Suggest meal timing relative to their workout schedule
- Track compliance trends from their macro log history
- Based on their eating patterns, suggest dishes they might enjoy but haven't tried

BARCODE SCANNING INTEGRATION:
If the user mentions scanning a barcode or provides a barcode number (UPC/EAN, typically 8-13 digits):
1. Note that the system can look up the product via Open Food Facts database
2. Analyze the product's ingredients for GMO, artificial additives, ultra-processed ingredients
3. Flag any health concerns: microplastics (bottled water), BPA (canned goods), artificial colors/flavors
4. Research the brand's reputation for food safety and ingredient quality
5. Suggest healthier alternatives from the same food category
6. Include the product in the structured JSON output for auto-logging
7. Rate the product: GOOD (organic, clean ingredients), OKAY (some concerns), BAD (avoid — toxic ingredients, high processing)

FOOD SAFETY ANALYSIS (apply to ALL foods, not just scanned items):
- Flag products with controversial ingredients: high-fructose corn syrup, artificial sweeteners (aspartame, sucralose), artificial colors (Red 40, Yellow 5), sodium nitrite, BHT/BHA, titanium dioxide
- Note if a restaurant/chain has been flagged for food safety violations
- Identify ultra-processed foods (NOVA Group 4): ready-to-eat meals, packaged snacks, sodas, instant noodles
- Microplastics warning for bottled water brands — suggest filtered tap water or glass-bottled alternatives
- When a client consistently eats from fast food chains, provide a weekly eating quality score

${NUTRITION_REFERENCE}`,

    form_tips: `You are SwanStudios NASM Form Coach — a Corrective Exercise Specialist with complete access to the client's movement assessment, form analysis history, pain entries, and compensation patterns.

YOUR APPROACH:
1. Reference the client's NASM Overhead Squat Assessment results to identify their specific compensations
2. Apply the NASM Corrective Exercise Continuum: Inhibit → Lengthen → Activate → Integrate
3. Consider their active pain/injury entries when modifying exercises
4. Use their form analysis scores and symmetry data to track improvement
5. Reference their available equipment for corrective exercise suggestions
6. Align recommendations with their current NASM OPT phase

FOR EACH EXERCISE:
- Identify overactive vs underactive muscles based on their assessment
- Prescribe specific SMR (foam rolling) targets with duration
- Suggest static/neuromuscular stretches for shortened muscles
- Recommend activation exercises for underactive muscles
- Provide integration movements that reinforce proper patterns

ALWAYS cite NASM protocols by name. Never give generic "keep your back straight" advice — explain the kinetic chain checkpoint, the compensation pattern, and the corrective strategy.

${NASM_OPT_REFERENCE}
${SQUAT_UNIVERSITY_REFERENCE}`,

    workout_suggestions: `You are SwanStudios NASM Workout Advisor — an OPT Model specialist with full access to the client's equipment, goals, movement assessment, training history, and injury data.

WORKOUT DESIGN PROTOCOL:
1. Determine the client's NASM OPT phase from their movement profile and assessment scores
2. Select exercises appropriate for their phase, equipment, and compensations
3. Apply correct acute variables: sets, reps, tempo, rest periods per NASM guidelines
4. Include corrective exercises in warm-up based on their OHSA results
5. Progress exercises based on their training history and performance trends
6. Consider their active pain entries and modify exercises accordingly

WORKOUT STRUCTURE:
- Warm-up: SMR + stretching (targeting their specific overactive muscles) + activation
- Core: phase-appropriate core exercises (stabilization → strength → power)
- Balance: phase-appropriate balance exercises
- Resistance: compound → isolation, following OPT phase acute variables
- Cool-down: static stretching for muscles trained + full-body flexibility

ALWAYS reference their actual equipment profiles, movement compensations, and training history. Design workouts they can actually perform with what they have available.

STRUCTURED OUTPUT — CRITICAL:
When you list exercises, ALWAYS include a JSON block at the end of your response that the frontend can parse:
\`\`\`json
{"exercises": [
  {"exerciseName": "Exercise Name", "sets": 3, "reps": 10, "weight": 135, "tempo": "2/0/2", "restTime": 60, "notes": "optional"}
]}
\`\`\`
This JSON block enables the "Apply to Logger" feature. Include it after your written explanation.

WORKOUT FORM ACTIONS — FRONTEND DISPATCH:
You can directly control the workout logger form. When the user asks you to add exercises, load templates, or fill in the form, use this action block:

To add a single exercise to the form:
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_ADD_EXERCISE", "payload": {"exerciseName": "Barbell Bench Press", "sets": 3, "reps": 10, "weight": 135, "tempo": "2/0/2", "restSeconds": 60}}
\`\`\`

To load a NASM phase template (fills entire form with warmup + exercises + cooldown):
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_LOAD_TEMPLATE", "payload": {"phase": 2}}
\`\`\`

To mark warmup/cooldown items complete:
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_TOGGLE_NASM_ITEM", "payload": {"section": "warmup", "markAll": true, "completed": true}}
\`\`\`

Use these action blocks when:
- User says "add bench press" → use AI_ADD_EXERCISE
- User says "load phase 2 template" → use AI_LOAD_TEMPLATE
- User says "mark all warmup items complete" → use AI_TOGGLE_NASM_ITEM
- User describes a completed workout → use multiple AI_ADD_EXERCISE blocks (one per exercise)
You can include MULTIPLE action blocks in one response (one per exercise).

WORKOUT TRANSCRIPTION:
If the client describes a workout they already completed (e.g., "I did 4 sets of bench at 185 for 8 reps, then squats..."), parse ALL exercises from their description and output the structured JSON block AND individual AI_ADD_EXERCISE action blocks. Include the weight, sets, and reps they mentioned. This is for logging past workouts — not just generating new ones.

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,
  },

  trainer: {
    general: `You are SwanStudios AI — an advanced NASM-CPT certified assistant for personal trainers with PhD-level sports nutrition expertise and full platform data access.

YOUR ROLE:
- Program design consultant using NASM OPT Model periodization
- Client data analyst — workout history, measurements, compliance, nutrition
- Corrective exercise strategist — interpret OHSA results, prescribe CES protocols
- Sports nutrition advisor — macro periodization, nutrient timing, supplementation
- Business intelligence — client retention, session utilization, revenue optimization

DATA ACCESS:
You have FULL access to the target client's data including: equipment profiles, onboarding questionnaire, movement analysis (OHSA, PAR-Q), baseline measurements, workout history with per-exercise details, body measurements and progress, gamification (XP, level, achievements, streaks), goals with progress tracking, trainer notes, NASM progression levels, macro logs, movement profile (compensations, mobility scores), waiver records, form analysis scores, and pain/injury entries.

WHEN REVIEWING A CLIENT:
1. Check their NASM OPT phase recommendation against their current training program
2. Identify compensation patterns from movement assessment and form analysis
3. Compare macro intake vs targets for their goals
4. Track body measurement trends and adjust program accordingly
5. Flag any red flags from client notes, pain entries, or medical concerns
6. Suggest phase progressions or regressions based on assessment scores

When the trainer asks you to update client data, you can modify: body measurements, goals, client notes, macro logs, and progress levels. Use the data management action format.

WORKOUT PLAN NAVIGATION (VOICE-FIRST):
If the client has an ACTIVE WORKOUT PLAN, you can navigate it hands-free:
- "What's next?" → Tell the trainer the next exercise from the current session (name, sets, reps, weight, tempo, rest)
- "Next exercise" / "What do we do now?" → Move to the next exercise in the list
- "Done" / "We finished that" → Acknowledge and advance to next exercise
- "What's today's workout?" → Read the full current session
- "Skip" → Skip current exercise, move to next
- "What week/day are we on?" → Report plan position
Always be concise when navigating during a workout — the trainer is mid-session and needs quick answers.

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,

    workout_generation: `You are SwanStudios NASM Workout Generator — an elite program design tool for personal trainers with full client data access.

PROGRAM DESIGN PROTOCOL:
1. Pull the client's current NASM OPT phase from their movement profile
2. Review their equipment profiles to know what's available at each training location
3. Check their movement assessment for compensations — incorporate corrective exercises
4. Review their workout history for exercise preferences, performance trends, and fatigue patterns
5. Consider their goals, body composition data, and nutrition compliance
6. Factor in pain/injury entries — modify or exclude exercises for affected regions

OUTPUT FORMAT:
For each workout, provide:
- Phase designation (e.g., "Phase 2 — Strength Endurance")
- Warm-up with specific corrective exercises from their OHSA results
- Exercise list with: exercise name, sets, reps, tempo, rest, load guidance
- Progression criteria (when to advance sets/reps/load)
- Regression options for exercises they may struggle with
- Cool-down targeting muscles trained
- Estimated duration

STRUCTURED OUTPUT — CRITICAL:
After your written workout plan, ALWAYS include a JSON block the frontend can parse:
\`\`\`json
{"exercises": [
  {"exerciseName": "Exercise Name", "sets": 3, "reps": 10, "weight": 135, "tempo": "2/0/2", "restTime": 60, "notes": "optional"}
]}
\`\`\`
This JSON block enables the "Apply to Logger" feature for trainers.

WORKOUT FORM ACTIONS — FRONTEND DISPATCH:
You can directly control the workout logger form. When the trainer asks you to add exercises, load templates, or fill in the form, use this action block:

To add a single exercise to the form:
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_ADD_EXERCISE", "payload": {"exerciseName": "Barbell Bench Press", "sets": 3, "reps": 10, "weight": 135, "tempo": "2/0/2", "restSeconds": 60}}
\`\`\`

To load a NASM phase template (fills entire form with warmup + exercises + cooldown):
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_LOAD_TEMPLATE", "payload": {"phase": 2}}
\`\`\`

To mark warmup/cooldown items complete:
\`\`\`json
{"action": "frontend_dispatch", "event": "AI_TOGGLE_NASM_ITEM", "payload": {"section": "warmup", "markAll": true, "completed": true}}
\`\`\`

Use these action blocks when:
- Trainer says "add bench press" → use AI_ADD_EXERCISE
- Trainer says "load phase 2 template" → use AI_LOAD_TEMPLATE
- Trainer says "mark all warmup items complete" → use AI_TOGGLE_NASM_ITEM
- Trainer describes a completed workout → use multiple AI_ADD_EXERCISE blocks (one per exercise)
You can include MULTIPLE action blocks in one response (one per exercise).

WORKOUT TRANSCRIPTION:
If the trainer describes a workout that was already performed (e.g., "We did bench press 4x8 at 185, squats 3x10 at 225..."), parse ALL exercises and output individual AI_ADD_EXERCISE action blocks for each exercise with exact weights, sets, and reps. This is for logging completed sessions — treat it as transcription, not program design.

PERIODIZATION:
- Microcycle: 1-4 weeks within a phase
- Mesocycle: 4-6 weeks per OPT phase
- Macrocycle: 12+ week progression plan through multiple phases
- Deload: every 4th week (reduce volume 40-50%, maintain intensity)

ACTIVE WORKOUT PLAN NAVIGATION:
If the client has an ACTIVE WORKOUT PLAN in their data, you can navigate it:
- "What's next?" → Read the CURRENT SESSION from the plan data and tell the trainer the next exercise (name, sets, reps, weight, tempo, rest)
- "Next exercise" → Move to the next exercise in the current session's list
- "We finished that" / "Done with [exercise]" → Acknowledge completion, move to next exercise
- "What's the plan for today?" → Read the full current session from the plan
- "Skip this one" → Acknowledge skip, move to next exercise
- "What week are we on?" → Report current_week and current_day from the plan

When navigating a plan, also emit a save_workout_plan action to update the cursor position:
\`\`\`json
{"action": "save_workout_plan", "data": {"advanceSession": true}}
\`\`\`

If NO active workout plan exists, offer to create one based on the client's OPT phase and goals.

${NASM_OPT_REFERENCE}
${SQUAT_UNIVERSITY_REFERENCE}`,

    client_review: `You are SwanStudios Client Review Intelligence — a data-driven analyst for personal trainers with access to ALL client data sources.

REVIEW PROTOCOL:
1. MOVEMENT QUALITY: Pull OHSA scores, form analysis trends, symmetry scores, ROM percentages, compensation patterns. Compare current vs baseline.
2. TRAINING COMPLIANCE: Workout frequency, session utilization, exercise completion rates. Identify dropoff patterns.
3. BODY COMPOSITION: Weight trend, body fat %, circumference changes. Calculate rate of change per week.
4. NUTRITION: Macro log compliance, average daily protein/carb/fat vs targets. Identify gaps.
5. PAIN & INJURY: Active pain entries, severity trends, affected movements. Flag worsening patterns.
6. GAMIFICATION: XP earned, level progression, streak status, achievements unlocked. Engagement metrics.
7. GOALS: Active goals with progress %, on-track vs behind schedule. Recommend adjustments.
8. NASM PROGRESSION: Per-category NASM levels (core, balance, stability, etc.), unlocked exercises, phase readiness.

DELIVER:
- Executive summary (3-5 key findings)
- Data-backed recommendations with specific action items
- Phase progression or regression recommendation with justification
- Nutrition adjustments based on body composition trends
- Program modifications based on compliance and response patterns
- Red flags requiring immediate attention

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,

    client_onboarding: `You are SwanStudios Client Onboarding Intelligence — a NASM-CPT certified intake specialist for personal trainers. Your job is to parse unstructured trainer dictation about a new client and generate a structured onboarding record.

INTAKE PROTOCOL:
The trainer will describe a new client in natural language — possibly dictated via voice, typed in shorthand, or pasted from notes. You must extract ALL relevant data and generate a structured ONBOARD_CLIENT_INTENT action block.

REQUIRED FIELDS (ask clarifying questions if missing):
- firstName (REQUIRED — cannot proceed without it)
- lastName (REQUIRED — cannot proceed without it)

EXTRACTED FIELDS (parse from description):
- dateOfBirth or age (convert age to approximate DOB if only age given, using format YYYY-MM-DD)
- gender (Male, Female, Non-binary, Prefer not to say)
- clientSource: "move_fitness" (free tier — gym client the trainer works with at their gym job) OR "swanstudios" (paid tier — client purchasing personal training sessions directly)
- fitnessGoal (combine all stated goals into a comma-separated string, e.g., "Senior Fitness & Balance, Improve Mobility & Flexibility")
- trainingExperience: "beginner" (0-6 months), "intermediate" (6-24 months), "advanced" (2+ years)
- healthConcerns (injuries, surgeries, chronic conditions, medications, limitations — be thorough)
- trainerNotes (YOUR NASM assessment — see below)
- assignToSelf: true (always default to true — the trainer creating the client is assigned)
- generateClaimCode: true (always default to true — generates a code/URL for the client to claim their account)
- availableSessions: 0 for move_fitness clients, ask or default to 0 for swanstudios clients

NASM ASSESSMENT (trainerNotes field):
Based on the trainer's description, write a professional NASM assessment paragraph that includes:
1. Client age and activity level summary
2. Recommended NASM OPT Phase with justification
3. Key compensation patterns identified or suspected from the description
4. Corrective exercise strategy using the NASM continuum (Inhibit → Lengthen → Activate → Integrate)
5. Specific muscle groups to target (overactive vs underactive)
6. Any surgical/medical considerations and timeline impacts
7. Recommended program duration and progression plan

CRITICAL RULES:
- NEVER generate workout routines, exercise sets, reps, or weight prescriptions during onboarding
- The trainerNotes field is a TEXT PARAGRAPH summarizing movement analysis — NOT a workout plan
- Refer to the client by first name only in your conversational response (identity-blind in data)
- If the trainer mentions the client is from their gym job / Move Fitness / a gym they work at → clientSource = "move_fitness"
- If the trainer mentions the client is paying for sessions / buying packages / SwanStudios client → clientSource = "swanstudios"
- If clientSource is unclear, ASK the trainer

OUTPUT FORMAT:
After your conversational summary, ALWAYS include this action block:
\`\`\`json
{"action": "ONBOARD_CLIENT", "data": {"firstName": "...", "lastName": "...", "dateOfBirth": "YYYY-MM-DD", "gender": "...", "clientSource": "move_fitness|swanstudios", "fitnessGoal": "...", "trainingExperience": "beginner|intermediate|advanced", "healthConcerns": "...", "trainerNotes": "...", "assignToSelf": true, "generateClaimCode": true, "availableSessions": 0}}
\`\`\`

If critical info is missing (name), ask the trainer before generating the action block. For non-critical missing fields, use reasonable defaults and note what you assumed.

${NASM_OPT_REFERENCE}`,
  },

  admin: {
    general: `You are SwanStudios AI — the most powerful version of the platform's NASM-CPT certified assistant with PhD-level sports nutrition expertise and FULL read-write access to all platform data.

YOUR CAPABILITIES:
- NASM OPT Model program design and periodization for any client
- PhD-level sports nutrition consulting with macro periodization
- Corrective Exercise Specialist analysis with OHSA interpretation
- Full platform data access across ALL clients and trainers
- Data management: update client measurements, goals, notes, progress levels, macro logs
- Business analytics: revenue, retention, session utilization, growth metrics
- Client onboarding review and risk assessment

DATA MANAGEMENT ACTIONS:
When asked to update client data, you can:
- Record body measurements (weight, body fat, circumferences)
- Update or create goals with progress tracking
- Add client notes (observations, red flags, achievements)
- Log macro entries from food descriptions
- Update NASM progression levels for specific categories
- Modify client progress scores

To trigger a data update, include this action block in your response:
\`\`\`json
{"action": "update_client_data", "targetUserId": <id>, "updates": [
  {"type": "body_measurement", "data": {"weight": 185, "bodyFatPercentage": 18.5, ...}},
  {"type": "goal", "data": {"title": "...", "targetValue": ..., "category": "..."}},
  {"type": "client_note", "data": {"noteType": "observation", "content": "...", "severity": "low"}},
  {"type": "macro_log", "data": {"mealType": "lunch", "description": "...", "calories": ..., "protein": ..., "carbs": ..., "fat": ...}},
  {"type": "progress_level", "data": {"category": "coreLevel", "value": 150}}
]}
\`\`\`

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,

    data_management: `You are SwanStudios Data Intelligence — an advanced data management and analytics AI for platform administrators.

FULL DATA ACCESS across all 17 data sources: user profiles, equipment profiles, onboarding questionnaires, movement analyses, baseline measurements, daily workout forms, body measurements, gamification (XP/levels/achievements), goals, client notes, NASM progression levels, macro logs, movement profiles, waiver records, form analyses, pain entries, and training sessions.

ANALYSIS CAPABILITIES:
- Cross-client comparison and benchmarking
- Trend analysis with statistical significance
- Anomaly detection in training and nutrition data
- Compliance scoring across multiple dimensions
- ROI analysis per client (sessions used vs progress made)
- Injury pattern recognition across the client population

DATA WRITE CAPABILITIES:
Use the action block format to update any client's data:
\`\`\`json
{"action": "update_client_data", "targetUserId": <id>, "updates": [
  {"type": "body_measurement", "data": {...}},
  {"type": "goal", "data": {...}},
  {"type": "client_note", "data": {...}},
  {"type": "macro_log", "data": {...}},
  {"type": "progress_level", "data": {...}},
  {"type": "draft_email", "data": {"subject": "...", "body": "..."}},
  {"type": "draft_sms", "data": {"body": "..." (max 160 chars)}}
]}
\`\`\`

COMMUNICATION DRAFTS (Trainer/Admin only):
- You can draft emails or SMS to a client using "draft_email" or "draft_sms" update types.
- Drafts are NEVER sent automatically — they go to a review queue.
- The trainer must manually approve each draft before it is sent.
- Recipient address is auto-populated from client profile (you cannot override it).
- Max 10 drafts per client per day (rate limited).
- Email body max: 5000 chars. SMS body max: 160 chars.
- Write professional, encouraging messages aligned with the client's goals and progress.

When data is included below, analyze it thoroughly. Provide specific numbers, percentages, and trends — never vague summaries.

${NASM_OPT_REFERENCE}
${NUTRITION_REFERENCE}`,

    client_onboarding: `You are SwanStudios Client Onboarding Intelligence — a NASM-CPT certified intake specialist for platform administrators. Your job is to parse unstructured dictation about a new client and generate a structured onboarding record.

INTAKE PROTOCOL:
The admin will describe a new client in natural language — possibly dictated via voice, typed in shorthand, or pasted from notes. You must extract ALL relevant data and generate a structured ONBOARD_CLIENT_INTENT action block.

REQUIRED FIELDS (ask clarifying questions if missing):
- firstName (REQUIRED — cannot proceed without it)
- lastName (REQUIRED — cannot proceed without it)

EXTRACTED FIELDS (parse from description):
- dateOfBirth or age (convert age to approximate DOB if only age given, using format YYYY-MM-DD)
- gender (Male, Female, Non-binary, Prefer not to say)
- clientSource: "move_fitness" (free tier — gym client the trainer works with at their gym job) OR "swanstudios" (paid tier — client purchasing personal training sessions directly)
- fitnessGoal (combine all stated goals into a comma-separated string, e.g., "Senior Fitness & Balance, Improve Mobility & Flexibility")
- trainingExperience: "beginner" (0-6 months), "intermediate" (6-24 months), "advanced" (2+ years)
- healthConcerns (injuries, surgeries, chronic conditions, medications, limitations — be thorough)
- trainerNotes (YOUR NASM assessment — see below)
- assignToSelf: true (always default to true — the admin creating the client is assigned)
- generateClaimCode: true (always default to true — generates a code/URL for the client to claim their account)
- availableSessions: 0 for move_fitness clients, ask or default to 0 for swanstudios clients

NASM ASSESSMENT (trainerNotes field):
Based on the description, write a professional NASM assessment paragraph that includes:
1. Client age and activity level summary
2. Recommended NASM OPT Phase with justification
3. Key compensation patterns identified or suspected from the description
4. Corrective exercise strategy using the NASM continuum (Inhibit → Lengthen → Activate → Integrate)
5. Specific muscle groups to target (overactive vs underactive)
6. Any surgical/medical considerations and timeline impacts
7. Recommended program duration and progression plan

CRITICAL RULES:
- NEVER generate workout routines, exercise sets, reps, or weight prescriptions during onboarding
- The trainerNotes field is a TEXT PARAGRAPH summarizing movement analysis — NOT a workout plan
- Refer to the client by first name only in your conversational response (identity-blind in data)
- If the description mentions the client is from a gym job / Move Fitness / a gym they work at → clientSource = "move_fitness"
- If the description mentions the client is paying for sessions / buying packages / SwanStudios client → clientSource = "swanstudios"
- If clientSource is unclear, ASK
- As admin, you can also assign the client to a specific trainer if mentioned

OUTPUT FORMAT:
After your conversational summary, ALWAYS include this action block:
\`\`\`json
{"action": "ONBOARD_CLIENT", "data": {"firstName": "...", "lastName": "...", "dateOfBirth": "YYYY-MM-DD", "gender": "...", "clientSource": "move_fitness|swanstudios", "fitnessGoal": "...", "trainingExperience": "beginner|intermediate|advanced", "healthConcerns": "...", "trainerNotes": "...", "assignToSelf": true, "generateClaimCode": true, "availableSessions": 0}}
\`\`\`

If critical info is missing (name), ask before generating the action block. For non-critical missing fields, use reasonable defaults and note what you assumed.

${NASM_OPT_REFERENCE}`,
  },
};

// ─── RESPONSE STYLE MODIFIERS ("Keeping it 100" feature) ───
const RESPONSE_STYLE_INSTRUCTIONS = {
  phd_only: `
RESPONSE STYLE: PhD/Expert Mode
Assume the reader has advanced education. Use precise scientific terminology, cite research when relevant, reference dose-response relationships with exact numbers, and explain biochemical pathways in detail. Do NOT simplify. This reader wants the full technical breakdown.
`,

  simple_only: `
RESPONSE STYLE: "Keep It 100" Mode (Grandma-Friendly)
Explain EVERYTHING like you are talking to a 70-year-old grandma who never went to college. ZERO jargon.

RULES:
- Use everyday analogies (e.g., "your muscles are like a sponge — they soak up the good stuff after a workout")
- Short sentences. One idea at a time.
- If you MUST use a big word, explain it right away in parentheses: "protein (the stuff that builds muscle)"
- Instead of "consume 1.6g/kg of protein" → say "eat a palm-sized piece of chicken or fish with every meal"
- Instead of "progressive overload" → say "add a little more weight each week when it gets easy"
- Instead of "HFCS triggers hepatic de novo lipogenesis" → say "that fake sugar goes straight to your liver and turns into belly fat"
- Use "good" and "bad" language. Be direct: "This is bad for you. Here's why."
- Give the FIX in 1-3 simple steps. Example: "1. Stop drinking this. 2. Drink water instead. 3. If you want fizzy, try sparkling water with lemon."
- Be warm and encouraging like a kind neighbor who cares about their health
- Use phrases like "here's the deal", "bottom line", "real talk", "no sugarcoating"
- End with a simple action item they can do TODAY

TONE: Warm, direct, zero judgment, zero confusion. If grandma can't follow it, rewrite it.
`,

  both: `
RESPONSE STYLE: Dual-Mode — Give BOTH a scientific response AND a simple "Keep It 100" response.

FORMAT your response EXACTLY like this:

🎓 **THE SCIENCE**
[Give the full PhD-level scientific explanation with proper terminology, research references, and detailed analysis]

---

💯 **KEEPING IT 100**
[Now explain the SAME thing like you're talking to a grandma who never went to college. Zero jargon. Short sentences. Give 1-3 simple action steps.]

IMPORTANT: Both sections must cover the SAME topic but at different reading levels. The "Keeping it 100" section should NOT just be a summary — it should be a complete standalone explanation that makes sense on its own.
`,
};

/**
 * Combine a base system prompt with a response style modifier.
 */
function buildStyledPrompt(basePrompt, responseStyle = 'both') {
  const styleBlock = RESPONSE_STYLE_INSTRUCTIONS[responseStyle];
  if (!styleBlock) return basePrompt;
  return basePrompt + '\n\n' + styleBlock;
}

/**
 * Get the system prompt for a given role, context, and response style.
 */
export function getSystemPrompt(role, context, responseStyle = 'both') {
  const rolePrompts = SYSTEM_PROMPTS[role] || SYSTEM_PROMPTS.client;
  const basePrompt = rolePrompts[context] || rolePrompts.general;
  return buildStyledPrompt(basePrompt, responseStyle);
}

/**
 * Fetch relevant user data to enrich the AI context.
 * Returns a comprehensive string summary of ALL client data sources.
 *
 * 17 DATA SOURCES:
 *  1. User profile + masterPromptJson
 *  2. Equipment profiles (gym, home, park, client_home)
 *  3. Client onboarding questionnaire (goals, health risk, nutrition prefs)
 *  4. Movement analysis (OHSA, PAR-Q, corrective strategy)
 *  5. Baseline measurements (strength benchmarks, body comp, medical clearance)
 *  6. Daily workout forms (exercise history with sets/reps/weight/RPE/form)
 *  7. Body measurements (weight, body fat, circumferences, progress)
 *  8. Gamification (XP, level, tier, achievements, streaks)
 *  9. Active goals (with progress tracking)
 * 10. Client notes (trainer observations, red flags)
 * 11. Client progress (NASM category levels, unlocked exercises)
 * 12. Daily macro logs (nutrition tracking)
 * 13. Movement profile (mobility scores, compensation trends, NASM phase)
 * 14. Waiver records (medical clearance, activity restrictions)
 * 15. Form analysis history (scores, symmetry, ROM)
 * 16. Pain/injury entries (body map)
 * 17. Recent sessions (scheduling, attendance)
 */
export async function enrichWithUserData(userId, role, context, sequelize) {
  try {
    const dataParts = [];
    const startTime = Date.now();

    // Helper: safe query that always returns array
    const safeQuery = async (sql, replacements) => {
      try {
        const result = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT }).catch(() => []);
        return Array.isArray(result) ? result : [];
      } catch { return []; }
    };

    // ── PARALLEL FETCH: Fire ALL 17 queries concurrently for speed ──
    const includeNutrition = ['general', 'macro_logging', 'client_review', 'data_management', 'workout_suggestions', 'progress_analysis'].includes(context);
    const isAdminOrTrainer = role === 'admin' || role === 'trainer';

    const [
      users, equipment, onboarding, movement, baseline,
      workouts, measurements, gamification, streaks, goals,
      notes, progress, macros, movementProfile, waivers,
      analyses, painEntries, sessions,
      complianceData, businessKpis, checkInData, workoutPlans,
    ] = await Promise.all([
      // 1. User profile (includes clientSource for Move Fitness vs SwanStudios context)
      safeQuery(
        `SELECT role, "createdAt", "fitnessGoal",
                "weight", "height", "dateOfBirth", "gender", "healthConcerns",
                "trainingExperience", "masterPromptJson", "availableSessions",
                "clientSource", "accountStatus"
         FROM "Users" WHERE id = :userId LIMIT 1`, { userId }),
      // 2. Equipment profiles
      safeQuery(
        `SELECT ep.name, ep."locationType", ep.description,
                COALESCE(
                  (SELECT json_agg(json_build_object('name', ei.name, 'category', ei.category, 'quantity', ei.quantity))
                   FROM equipment_items ei WHERE ei."profileId" = ep.id AND ei."isAvailable" = true),
                  '[]'
                ) as items
         FROM equipment_profiles ep
         WHERE ep."trainerId" = :userId AND ep."isActive" = true
         ORDER BY ep."isDefault" DESC`, { userId }),
      // 3. Onboarding questionnaire
      safeQuery(
        `SELECT "primaryGoal", "trainingTier", "commitmentLevel", "healthRisk",
                "nutritionPrefs", "responsesJson", status
         FROM client_onboarding_questionnaires
         WHERE "userId" = :userId AND status IN ('submitted', 'completed')
         ORDER BY "completedAt" DESC NULLS LAST LIMIT 1`, { userId }),
      // 4. Movement analysis
      safeQuery(
        `SELECT "overheadSquatAssessment", "nasmAssessmentScore", "parqScreening",
                "posturalAssessment", "correctiveExerciseStrategy", "optPhaseRecommendation",
                "overallMovementQualityScore", "trainerNotes", "assessmentDate",
                "medicalClearanceRequired", "medicalClearanceDate"
         FROM movement_analyses
         WHERE "userId" = :userId AND status = 'completed'
         ORDER BY "assessmentDate" DESC NULLS LAST LIMIT 1`, { userId }),
      // 5. Baseline measurements
      safeQuery(
        `SELECT "takenAt", "restingHeartRate", "bloodPressureSystolic", "bloodPressureDiastolic",
                "benchPressWeight", "benchPressReps", "squatWeight", "squatReps",
                "deadliftWeight", "deadliftReps", "overheadPressWeight", "overheadPressReps",
                "pullUpsReps", "bodyFatPercentage", "plankDuration",
                "flexibilityNotes", "injuryNotes", "painLevel",
                "nasmAssessmentScore", "overheadSquatAssessment"
         FROM client_baseline_measurements
         WHERE "userId" = :userId
         ORDER BY "takenAt" DESC NULLS LAST LIMIT 1`, { userId }),
      // 6. Recent workout forms
      safeQuery(
        `SELECT date, "formData", "totalPointsEarned", "estimatedDuration",
                "trainerNotes", "clientSummary"
         FROM daily_workout_forms
         WHERE "clientId" = :userId AND "submittedAt" IS NOT NULL
         ORDER BY date DESC LIMIT 10`, { userId }),
      // 7. Body measurements
      safeQuery(
        `SELECT "measurementDate", weight, "weightUnit", "bodyFatPercentage",
                "muscleMassPercentage", bmi, neck, chest, "naturalWaist",
                hips, "rightBicep", "leftBicep", "rightThigh", "leftThigh",
                "progressScore", notes
         FROM body_measurements
         WHERE "userId" = :userId
         ORDER BY "measurementDate" DESC LIMIT 5`, { userId }),
      // 8. Gamification (user XP/level)
      safeQuery(
        `SELECT u."experiencePoints", u.level, u.tier
         FROM "Users" u WHERE u.id = :userId LIMIT 1`, { userId }),
      // 8b. Streaks
      safeQuery(
        `SELECT "streakType", "currentCount", "longestCount", "isActive"
         FROM streaks WHERE "userId" = :userId AND "isActive" = true`, { userId }),
      // 9. Goals
      safeQuery(
        `SELECT title, description, category, status, priority,
                "targetValue", "currentValue", unit, "progressPercentage",
                deadline, "estimatedCompletionDate"
         FROM goals
         WHERE "userId" = :userId AND status IN ('active', 'draft')
         ORDER BY priority DESC, "createdAt" DESC LIMIT 10`, { userId }),
      // 10. Client notes (admin/trainer only)
      isAdminOrTrainer ? safeQuery(
        `SELECT "noteType", severity, content, "followUpDate", "isResolved", "createdAt"
         FROM client_notes
         WHERE "userId" = :userId
         ORDER BY CASE WHEN severity = 'critical' THEN 0 WHEN severity = 'high' THEN 1 WHEN severity = 'medium' THEN 2 ELSE 3 END,
                  "createdAt" DESC
         LIMIT 10`, { userId }) : Promise.resolve([]),
      // 11. Client progress (NASM levels)
      safeQuery(
        `SELECT "overallLevel", "experiencePoints",
                "coreLevel", "balanceLevel", "stabilityLevel", "flexibilityLevel",
                "calisthenicsLevel", "isolationLevel", "stabilizersLevel",
                "injuryPreventionLevel", "injuryRecoveryLevel",
                "glutesLevel", "hamstringsLevel", "absLevel", "chestLevel",
                "bicepsLevel", "tricepsLevel", "shouldersLevel",
                "squatsLevel", "lungesLevel", "planksLevel",
                "unlockedExercises", "progressNotes", "lastAssessmentDate"
         FROM client_progress
         WHERE "userId" = :userId LIMIT 1`, { userId }),
      // 12. Macro logs
      includeNutrition ? safeQuery(
        `SELECT date, "mealType", description, calories, protein, carbs, fat, fiber
         FROM daily_macro_logs
         WHERE "userId" = :userId AND date >= CURRENT_DATE - INTERVAL '2 days'
         ORDER BY date DESC, "createdAt" DESC LIMIT 20`, { userId }) : Promise.resolve([]),
      // 13. Movement profile
      safeQuery(
        `SELECT "mobilityScores", "strengthBalance", "commonCompensations",
                "exerciseScores", "nasmPhaseRecommendation", "totalAnalyses",
                "lastAnalysisAt"
         FROM movement_profiles
         WHERE "userId" = :userId LIMIT 1`, { userId }),
      // 14. Waiver records
      safeQuery(
        `SELECT "activityTypes", "signedAt", status, metadata
         FROM waiver_records
         WHERE "userId" = :userId AND status IN ('linked', 'pending_match')
         ORDER BY "signedAt" DESC LIMIT 1`, { userId }),
      // 15. Form analyses
      safeQuery(
        `SELECT "exerciseName", "overallScore", "repCount",
                findings->>'symmetryScore' as symmetry,
                findings->>'rangeOfMotionPercent' as rom,
                findings->>'fatigueDetected' as fatigue,
                "createdAt"
         FROM form_analyses
         WHERE "userId" = :userId AND "analysisStatus" = 'complete'
         ORDER BY "createdAt" DESC LIMIT 10`, { userId }),
      // 16. Pain entries
      safeQuery(
        `SELECT region, pain_level, pain_type, side, description, created_at
         FROM client_pain_entries WHERE user_id = :userId AND status = 'active'
         ORDER BY pain_level DESC LIMIT 10`, { userId }),
      // 17. Sessions
      safeQuery(
        `SELECT s."sessionDate", s.status, s.notes, s.duration
         FROM sessions s WHERE s."userId" = :userId
         ORDER BY s."sessionDate" DESC LIMIT 5`, { userId }),
      // 18. Compliance data (workout frequency for this client)
      safeQuery(
        `SELECT
           COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END) AS "workouts7d",
           COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END) AS "workouts30d",
           COUNT(CASE WHEN "createdAt" >= NOW() - INTERVAL '90 days' THEN 1 END) AS "workouts90d",
           MAX("createdAt") AS "lastWorkoutDate"
         FROM daily_workout_forms WHERE "userId" = :userId OR "clientId" = :userId`, { userId }),
      // 19. Business KPIs (admin/trainer only — platform-wide stats)
      isAdminOrTrainer ? safeQuery(
        `SELECT
           (SELECT COUNT(*) FROM "Users" WHERE role = 'client' AND "isActive" != false) AS "activeClients",
           (SELECT COUNT(*) FROM "Users" WHERE role = 'client' AND "createdAt" >= NOW() - INTERVAL '30 days') AS "newClientsThisMonth",
           (SELECT COALESCE(SUM("totalAmount"), 0) FROM orders WHERE status IN ('completed', 'paid') AND "createdAt" >= NOW() - INTERVAL '30 days') AS "revenueThisMonth",
           (SELECT COUNT(*) FROM daily_workout_forms WHERE "createdAt" >= NOW() - INTERVAL '7 days') AS "platformWorkouts7d"`,
        {}) : Promise.resolve([]),
      // 20. Check-in data placeholder (for when check-in scheduling is built out)
      Promise.resolve([]),
      // 21. Active workout plans (for "what's next?" queries)
      safeQuery(
        `SELECT id, title, description, nasm_phase, status,
                current_week, current_day, duration_weeks,
                plan_data, progress_notes, created_by,
                start_date, end_date, created_at
         FROM workout_plans
         WHERE user_id = :userId AND status IN ('active', 'paused')
         ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                  created_at DESC LIMIT 3`, { userId }),
    ]);

    logger.info('[AIChatService] Enrichment queries completed in %dms for user %d', Date.now() - startTime, userId);

    // ── PROCESS RESULTS: Build data parts from parallel query results ──

    // ── PRIVACY: Fetch client identity for PII stripping in notes/sessions ──
    let clientIdentity = null;
    try {
      const idRows = await sequelize.query(
        `SELECT "firstName", "lastName", email, phone FROM "Users" WHERE id = :userId LIMIT 1`,
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );
      if (idRows.length > 0) clientIdentity = idRows[0];
    } catch { /* non-fatal */ }

    // ── 1. USER PROFILE ──
    // PRIVACY: Use user ID only — no real names or emails sent to AI providers
    try {
      if (users.length > 0) {
        const u = users[0];
        const age = u.dateOfBirth ? Math.floor((Date.now() - new Date(u.dateOfBirth).getTime()) / 31557600000) : null;
        dataParts.push(`\n--- CLIENT PROFILE ---
Client ID: ${userId}
Gender: ${u.gender || 'Not specified'}
Age: ${age || 'Unknown'}
Weight: ${u.weight || 'Not recorded'}
Height: ${u.height || 'Not recorded'}
Goal: ${u.fitnessGoal || 'Not set'}
Experience: ${u.trainingExperience || 'Not set'}
Health Concerns: ${u.healthConcerns || 'None noted'}
Sessions Available: ${u.availableSessions ?? 'Unknown'}
Client Source: ${u.clientSource === 'move_fitness' ? 'Move Fitness (external gym client — DO NOT discuss billing, session packages, or SwanStudios pricing)' : u.clientSource === 'external' ? 'External Client' : 'SwanStudios'}
Member Since: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}`);

        if (u.masterPromptJson) {
          try {
            const mp = typeof u.masterPromptJson === 'string' ? JSON.parse(u.masterPromptJson) : u.masterPromptJson;
            if (mp.goals) {
              dataParts.push(`\n--- MASTER PROMPT GOALS ---\nPrimary: ${mp.goals.primary || 'general_fitness'}\nSecondary: ${(mp.goals.secondary || []).join(', ') || 'None'}\nNotes: ${mp.goals.notes || 'None'}`);
            }
            if (mp.health?.injuries?.length > 0) {
              dataParts.push(`\n--- MASTER PROMPT INJURIES ---\n${mp.health.injuries.join(', ')}`);
            }
          } catch { /* malformed JSON */ }
        }
      }
    } catch { /* best-effort */ }

    // ── 2. EQUIPMENT PROFILES ──
    try {
      if (equipment.length > 0) {
        const lines = equipment.map(e => {
          const items = typeof e.items === 'string' ? JSON.parse(e.items) : e.items;
          const itemNames = (items || []).map(i => `${i.name}${i.quantity > 1 ? ` (x${i.quantity})` : ''}`).join(', ');
          return `${e.name} (${e.locationType}): ${itemNames || 'No equipment listed'}`;
        });
        dataParts.push(`\n--- AVAILABLE EQUIPMENT BY LOCATION ---\n${lines.join('\n')}`);
      }
    } catch { /* best-effort */ }

    // ── 3. ONBOARDING ──
    if (onboarding.length > 0) {
      const ob = onboarding[0];
      const np = tryParse(ob.nutritionPrefs);
      dataParts.push(`\n--- ONBOARDING ---\nGoal: ${ob.primaryGoal || '-'} | Tier: ${ob.trainingTier || '-'} | Commitment: ${ob.commitmentLevel || '-'}/10 | Health Risk: ${ob.healthRisk || '-'}\nNutrition Prefs: ${np ? JSON.stringify(np) : 'None'}`);
    }

    // ── 4. MOVEMENT ANALYSIS ──
    if (movement.length > 0) {
      const m = movement[0];
      const ohsa = tryParse(m.overheadSquatAssessment);
      const ohsaStr = ohsa && typeof ohsa === 'object'
        ? Object.entries(ohsa).filter(([_, v]) => v && typeof v === 'object').map(([k, v]) => `${k}: ${v.finding || v.status || JSON.stringify(v)}`).join('; ') || 'No findings'
        : 'Not performed';
      dataParts.push(`\n--- NASM MOVEMENT ANALYSIS ---\nDate: ${m.assessmentDate || '?'} | Score: ${m.nasmAssessmentScore ?? '?'}/100 | Quality: ${m.overallMovementQualityScore ?? '?'}/100 | Med Clearance: ${m.medicalClearanceRequired ? 'YES' : 'No'}${m.medicalClearanceDate ? ` (${m.medicalClearanceDate})` : ''}\nOHSA: ${ohsaStr}${m.correctiveExerciseStrategy ? `\nCorrective: ${JSON.stringify(tryParse(m.correctiveExerciseStrategy))}` : ''}${m.optPhaseRecommendation ? `\nOPT Phase: ${JSON.stringify(tryParse(m.optPhaseRecommendation))}` : ''}${m.trainerNotes ? `\nNotes: ${m.trainerNotes}` : ''}`);
    }

    // ── 5. BASELINE ──
    if (baseline.length > 0) {
      const b = baseline[0];
      const lift = (w, r, name) => w ? `${name}: ${w}lbs×${r}` : null;
      const lifts = [lift(b.benchPressWeight, b.benchPressReps, 'Bench'), lift(b.squatWeight, b.squatReps, 'Squat'), lift(b.deadliftWeight, b.deadliftReps, 'DL'), lift(b.overheadPressWeight, b.overheadPressReps, 'OHP')].filter(Boolean).join(' | ');
      dataParts.push(`\n--- BASELINE (${b.takenAt || '?'}) ---\n${lifts || 'No lifts tested'} | Pull-ups: ${b.pullUpsReps ?? '-'} | Plank: ${b.plankDuration ? `${b.plankDuration}s` : '-'} | BF: ${b.bodyFatPercentage ? `${b.bodyFatPercentage}%` : '-'} | HR: ${b.restingHeartRate || '-'} | BP: ${b.bloodPressureSystolic ? `${b.bloodPressureSystolic}/${b.bloodPressureDiastolic}` : '-'}${b.injuryNotes ? `\nInjuries: ${b.injuryNotes}` : ''}`);
    }

    // ── 6. WORKOUT HISTORY ──
    if (workouts.length > 0) {
      const lines = workouts.map(w => {
        const fd = tryParse(w.formData);
        const exs = fd?.exercises?.slice(0, 6)?.map(ex => `${ex.name || ex.exerciseName}: ${ex.sets || '?'}×${ex.reps || '?'}@${ex.weight || '?'}lbs${ex.rpe ? ` RPE${ex.rpe}` : ''}`).join(', ') || 'N/A';
        return `${w.date}: ${exs}${w.totalPointsEarned ? ` +${w.totalPointsEarned}XP` : ''}`;
      });
      dataParts.push(`\n--- WORKOUT HISTORY (${workouts.length}) ---\n${lines.join('\n')}`);
    }

    // ── 7. BODY MEASUREMENTS ──
    if (measurements.length > 0) {
      const l = measurements[0];
      dataParts.push(`\n--- BODY (${l.measurementDate || '?'}) ---\nWt: ${l.weight || '-'} ${l.weightUnit || 'lbs'} | BF: ${l.bodyFatPercentage || '-'}% | BMI: ${l.bmi || '-'} | Muscle: ${l.muscleMassPercentage || '-'}%\nChest: ${l.chest || '-'}" Waist: ${l.naturalWaist || '-'}" Hips: ${l.hips || '-'}" R.Bi: ${l.rightBicep || '-'}" L.Bi: ${l.leftBicep || '-'}" R.Th: ${l.rightThigh || '-'}" L.Th: ${l.leftThigh || '-'}"`);
      if (measurements.length >= 2) {
        const wts = measurements.filter(m => m.weight);
        if (wts.length >= 2) dataParts.push(`Trend: ${(wts[0].weight - wts[wts.length - 1].weight) > 0 ? '+' : ''}${(wts[0].weight - wts[wts.length - 1].weight).toFixed(1)} ${l.weightUnit || 'lbs'}`);
      }
    }

    // ── 8. GAMIFICATION ──
    if (gamification.length > 0) {
      const g = gamification[0];
      let line = `\n--- GAMIFICATION ---\nXP: ${g.experiencePoints ?? 0} | Lv: ${g.level ?? 1} | Tier: ${g.tier || 'Bronze'}`;
      if (streaks.length > 0) line += ` | Streaks: ${streaks.map(s => `${s.streakType}:${s.currentCount}d`).join(', ')}`;
      dataParts.push(line);
    }

    // ── 9. GOALS ──
    if (goals.length > 0) {
      dataParts.push(`\n--- GOALS ---\n${goals.map(g => `[${(g.priority || 'med').toUpperCase()}] ${g.title}: ${g.progressPercentage ?? 0}%${g.targetValue ? ` (${g.currentValue || 0}/${g.targetValue})` : ''}${g.deadline ? ` due:${g.deadline}` : ''}`).join('\n')}`);
    }

    // ── 10. TRAINER NOTES (PII-stripped) ──
    if (notes.length > 0) {
      dataParts.push(`\n--- TRAINER NOTES ---\n${notes.map(n => {
        const safeContent = stripIdentityFromNotes(n.content, userId, clientIdentity);
        return `[${n.severity?.toUpperCase()}/${n.noteType}] ${safeContent}${n.isResolved ? ' (RESOLVED)' : ''}`;
      }).join('\n')}`);
    }

    // ── 11. NASM PROGRESS LEVELS ──
    if (progress.length > 0) {
      const p = progress[0];
      const lvls = Object.entries({
        Core: p.coreLevel, Balance: p.balanceLevel, Stability: p.stabilityLevel,
        Flex: p.flexibilityLevel, Calisthenics: p.calisthenicsLevel,
        Glutes: p.glutesLevel, Hams: p.hamstringsLevel, Abs: p.absLevel,
        Chest: p.chestLevel, Bi: p.bicepsLevel, Tri: p.tricepsLevel,
        Shoulders: p.shouldersLevel, Squats: p.squatsLevel, Lunges: p.lungesLevel,
      }).filter(([_, v]) => v > 0).map(([k, v]) => `${k}:${v}`).join(', ');
      dataParts.push(`\n--- NASM LEVELS ---\nOverall: ${p.overallLevel || 0} | ${lvls || 'No levels yet'}`);
      const unlocked = tryParse(p.unlockedExercises);
      if (Array.isArray(unlocked) && unlocked.length > 0) dataParts.push(`Unlocked: ${unlocked.slice(0, 15).join(', ')}${unlocked.length > 15 ? ` +${unlocked.length - 15}` : ''}`);
    }

    // ── 12. MACRO LOGS ──
    if (macros.length > 0) {
      const byDate = {};
      for (const m of macros) {
        const d = m.date?.toISOString?.()?.split('T')[0] || String(m.date);
        if (!byDate[d]) byDate[d] = { meals: [], t: { cal: 0, pro: 0, carb: 0, fat: 0 } };
        byDate[d].meals.push(`${m.mealType}: ${m.description} (${m.calories || 0}cal ${m.protein || 0}P ${m.carbs || 0}C ${m.fat || 0}F)`);
        byDate[d].t.cal += (m.calories || 0); byDate[d].t.pro += (m.protein || 0);
        byDate[d].t.carb += (m.carbs || 0); byDate[d].t.fat += (m.fat || 0);
      }
      dataParts.push(`\n--- NUTRITION ---\n${Object.entries(byDate).map(([d, x]) => `${d}: ${x.meals.join('; ')} TOTAL: ${x.t.cal}cal ${x.t.pro}P ${x.t.carb}C ${x.t.fat}F`).join('\n')}`);
    }

    // ── 13. MOVEMENT PROFILE ──
    if (movementProfile.length > 0) {
      const mp = movementProfile[0];
      let line = `\n--- MOVEMENT PROFILE ---\nPhase: ${mp.nasmPhaseRecommendation || '1'} | Analyses: ${mp.totalAnalyses || 0} | Last: ${mp.lastAnalysisAt || 'Never'}`;
      const mob = tryParse(mp.mobilityScores);
      if (mob) { const e = Object.entries(mob).filter(([_, v]) => v != null); if (e.length) line += `\nMobility: ${e.map(([k, v]) => `${k}:${v}`).join(', ')}`; }
      const comps = tryParse(mp.commonCompensations);
      if (Array.isArray(comps) && comps.length) line += `\nCompensations: ${comps.map(c => `${c.type || c} (freq:${c.frequency || '?'} sev:${c.avgSeverity || '?'})`).join('; ')}`;
      const exScores = tryParse(mp.exerciseScores);
      if (exScores) { const e = Object.entries(exScores).filter(([_, v]) => v != null); if (e.length) line += `\nForm Scores: ${e.map(([k, v]) => `${k}:${typeof v === 'object' ? v.avg : v}`).join(', ')}`; }
      dataParts.push(line);
    }

    // ── 14. WAIVER ──
    if (waivers.length > 0) {
      const w = waivers[0];
      const acts = tryParse(w.activityTypes);
      dataParts.push(`\n--- WAIVER ---\n${w.status} | Signed: ${w.signedAt || '?'} | Activities: ${Array.isArray(acts) ? acts.join(', ') : 'All standard'}`);
    }

    // ── 15. FORM ANALYSIS ──
    if (analyses.length > 0) {
      dataParts.push(`\n--- FORM SCORES ---\n${analyses.map(a => `${a.exerciseName}: ${a.overallScore}/100${a.symmetry ? ` Sym:${a.symmetry}%` : ''}${a.rom ? ` ROM:${a.rom}%` : ''}${a.repCount ? ` ${a.repCount}reps` : ''}${a.fatigue === 'true' ? ' FATIGUE' : ''}`).join('\n')}`);
    }

    // ── 16. PAIN ──
    if (painEntries.length > 0) {
      dataParts.push(`\n--- PAIN/INJURY ---\n${painEntries.map(p => `${p.region}${p.side ? `(${p.side})` : ''}: ${p.pain_level}/10 ${p.pain_type || ''}${p.description ? ` — ${p.description}` : ''}`).join('\n')}`);
    }

    // ── 17. SESSIONS (notes PII-stripped) ──
    if (sessions.length > 0) {
      dataParts.push(`\n--- SESSIONS ---\n${sessions.map(s => {
        const safeNotes = s.notes ? stripIdentityFromNotes(s.notes, userId, clientIdentity) : '';
        return `${s.sessionDate}: ${s.status}${s.duration ? ` (${s.duration}min)` : ''}${safeNotes ? ` — ${safeNotes}` : ''}`;
      }).join('\n')}`);
    }

    // ── 18. COMPLIANCE ──
    if (complianceData.length > 0) {
      const cd = complianceData[0];
      const w7 = Number(cd.workouts7d || 0), w30 = Number(cd.workouts30d || 0), w90 = Number(cd.workouts90d || 0);
      const comp7 = Math.min(100, Math.round((w7 / 3) * 100));
      const comp30 = Math.min(100, Math.round((w30 / 12) * 100));
      const lastWk = cd.lastWorkoutDate ? new Date(cd.lastWorkoutDate) : null;
      const daysSince = lastWk ? Math.floor((Date.now() - lastWk.getTime()) / 86400000) : null;
      let risk = 'On Track';
      if (daysSince && daysSince > 10) risk = 'CRITICAL — no activity in ' + daysSince + ' days';
      else if (daysSince && daysSince > 5) risk = 'WARNING — declining activity';
      else if (comp30 < 50) risk = 'WARNING — low compliance';
      dataParts.push(`\n--- CLIENT COMPLIANCE ---\n7-day: ${w7} workouts (${comp7}%) | 30-day: ${w30} workouts (${comp30}%) | 90-day: ${w90} workouts\nLast workout: ${daysSince != null ? daysSince + ' days ago' : 'Never'} | Risk: ${risk}`);
    }

    // ── 19. BUSINESS KPIs (admin/trainer only) ──
    if (businessKpis.length > 0 && isAdminOrTrainer) {
      const bk = businessKpis[0];
      dataParts.push(`\n--- BUSINESS KPIs (Platform) ---\nActive Clients: ${bk.activeClients || 0} | New This Month: ${bk.newClientsThisMonth || 0}\nRevenue (30d): $${Number(bk.revenueThisMonth || 0).toLocaleString()} | Platform Workouts (7d): ${bk.platformWorkouts7d || 0}`);
    }

    // ── 20. ACTIVE WORKOUT PLANS (enables "what's next?" voice queries) ──
    try {
      if (workoutPlans.length > 0) {
        const planLines = workoutPlans.map(plan => {
          const pd = typeof plan.plan_data === 'string' ? JSON.parse(plan.plan_data) : plan.plan_data;
          const week = Number(plan.current_week) || 1;
          const day = Number(plan.current_day) || 1;

          // Extract current session from plan data
          let currentSessionStr = 'No session data';
          if (pd?.weeks) {
            const weekData = pd.weeks.find(w => w.weekNumber === week) || pd.weeks[week - 1];
            if (weekData?.sessions) {
              const sessionData = weekData.sessions.find(s => s.dayNumber === day) || weekData.sessions[day - 1];
              if (sessionData) {
                const exercises = (sessionData.exercises || []).map(ex =>
                  `  • ${ex.name}: ${ex.sets}×${ex.reps}${ex.weight ? ` @${ex.weight}` : ''}${ex.tempo ? ` tempo:${ex.tempo}` : ''}${ex.rest ? ` rest:${ex.rest}` : ''}`
                ).join('\n');
                currentSessionStr = `${sessionData.name || `Day ${day}`}${sessionData.focus ? ` (${sessionData.focus})` : ''}\n${exercises || '  No exercises listed'}`;
              }
            }
          }

          // Count total sessions and completed
          const totalSessions = pd?.weeks?.reduce((sum, w) => sum + (w.sessions?.length || 0), 0) || 0;
          const pn = typeof plan.progress_notes === 'string' ? JSON.parse(plan.progress_notes) : plan.progress_notes;
          const completedSessions = Array.isArray(pn) ? pn.filter(n => n.type === 'session_complete').length : 0;

          return `Plan: "${plan.title}" [${plan.status.toUpperCase()}]
NASM Phase: ${plan.nasm_phase} | Duration: ${plan.duration_weeks} weeks | Progress: Week ${week}, Day ${day}
Sessions Completed: ${completedSessions}/${totalSessions}
Created: ${plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '?'} by ${plan.created_by || 'unknown'}
--- CURRENT SESSION (Week ${week}, Day ${day}) ---
${currentSessionStr}`;
        });

        dataParts.push(`\n--- ACTIVE WORKOUT PLANS ---
${planLines.join('\n\n')}
--- VOICE HINT: If the trainer asks "what's next?" or "next exercise", read the CURRENT SESSION above and guide them through it. When they say an exercise is done, acknowledge and move to the next one in the list. ---`);
      }
    } catch { /* workout_plans table may not exist yet — non-fatal */ }

    // ── 21. ANALYTICS: Exercise history + variety (from MV or direct query) ──
    try {
      const [exerciseStats] = await Promise.all([
        safeQuery(
          `SELECT "exerciseName", "timesPerformed"::int, "maxWeight"::numeric, "totalVolume"::numeric
           FROM "UserExerciseStats_MV"
           WHERE "userId" = :userId
           ORDER BY "timesPerformed" DESC LIMIT 10`, { userId })
          .catch(() => safeQuery(
            `SELECT e.name AS "exerciseName",
                    COUNT(DISTINCT we."workoutSessionId")::int AS "timesPerformed",
                    COALESCE(MAX(s."weightUsed"), 0)::numeric AS "maxWeight",
                    COALESCE(SUM(s."weightUsed" * s."repsCompleted"), 0)::numeric AS "totalVolume"
             FROM "WorkoutExercises" we
             JOIN "Exercises" e ON we."exerciseId" = e.id
             JOIN "WorkoutSessions" ws ON we."workoutSessionId" = ws.id
             LEFT JOIN "Sets" s ON s."workoutExerciseId" = we.id
             WHERE ws."userId" = :userId AND ws.status = 'completed'
             GROUP BY e.id, e.name
             ORDER BY "timesPerformed" DESC LIMIT 10`, { userId })),
      ]);

      if (exerciseStats.length > 0) {
        const lines = exerciseStats.map(e =>
          `${e.exerciseName}: ${e.timesPerformed}× | Max: ${Number(e.maxWeight)}lbs | Vol: ${(Number(e.totalVolume) / 1000).toFixed(1)}k lbs`
        );
        dataParts.push(`\n--- EXERCISE ANALYTICS (Top ${exerciseStats.length}) ---\n${lines.join('\n')}`);
      }
    } catch { /* MV or tables may not exist yet — non-fatal */ }

    if (dataParts.length === 0) return '';

    // PRIVACY: Prepend identity-blind instruction to AI
    const privacyHeader = `
=== PRIVACY: IDENTITY-BLIND MODE ===
You are operating in identity-blind mode. The client is referred to ONLY as "Client #${userId}".
You do NOT know and must NOT guess the client's real name, email, phone, or address.
If the trainer mentions a name, it has been replaced with "[Client #${userId}]" for privacy.
NEVER ask for or reference personal identifying information. Focus solely on their fitness data.
=== END PRIVACY ===`;

    return '\n\n' + privacyHeader + '\n\n=== CLIENT DATA (22 sources) ===\n' + dataParts.join('\n') + '\n=== END ===';
  } catch (err) {
    logger.warn('[AIChatService] Data enrichment failed (non-fatal):', err.message);
    return '';
  }
}

/** Safe JSON parse helper */
function tryParse(val) {
  if (val == null) return null;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return null; }
}

/**
 * Build the messages array for the AI provider.
 * Takes conversation history and adds the system prompt.
 */
export function buildPromptMessages(systemPrompt, conversationMessages, newMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // ── HISTORY TRIMMING ──
  // Keep last 6 messages (3 exchanges) to stay within Render's 30s proxy timeout.
  // Truncate long messages (AI responses can be 5000+ chars) to prevent prompt bloat.
  const MAX_HISTORY_MESSAGES = 6;
  const MAX_MSG_CHARS = 800;

  const recentMessages = conversationMessages.slice(-MAX_HISTORY_MESSAGES);
  for (const msg of recentMessages) {
    let content = msg.content || '';
    if (content.length > MAX_MSG_CHARS) {
      // Keep first 500 chars + last 200 chars with truncation marker
      content = content.slice(0, 500) + '\n\n[... response truncated for context window ...]\n\n' + content.slice(-200);
    }
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content,
    });
  }

  // Add the new user message (full, not truncated)
  messages.push({ role: 'user', content: newMessage });

  return messages;
}

/**
 * Send a chat message to an AI provider.
 * Tries providers in order: OpenAI -> Anthropic -> Gemini
 */
export async function sendChatMessage(messages, options = {}) {
  // maxTokens: 2500 balances response quality vs Render's 30s proxy timeout
  // (History trimming in buildPromptMessages keeps prompt size manageable)
  const { maxTokens = 2500, temperature = 0.7 } = options;
  const providers = getAvailableProviders();
  const failoverTrace = [];

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, messages, { maxTokens, temperature });
      failoverTrace.push(`${provider.name}:success`);
      return {
        ok: true,
        content: result.content,
        provider: provider.name,
        model: result.model,
        tokenUsage: result.tokenUsage,
        failoverTrace,
      };
    } catch (err) {
      failoverTrace.push(`${provider.name}:${err.message}`);
      logger.warn(`[AIChatService] ${provider.name} failed: ${err.message}`);
      continue;
    }
  }

  const availableCount = providers.length;
  logger.error(`[AIChatService] All ${availableCount} providers failed. Trace: ${failoverTrace.join(' -> ')}`);

  return {
    ok: false,
    content: availableCount === 0
      ? "AI service is not configured on this server. Please contact your administrator to set up AI API keys."
      : "I'm sorry, I'm having trouble connecting to our AI service right now. Please try again in a moment.",
    provider: 'fallback',
    failoverTrace,
  };
}

function getAvailableProviders() {
  const providers = [];

  // Gemini first — primary provider (user has Gemini 3.1 API key)
  if (process.env.GEMINI_API_KEY) {
    providers.push({ name: 'gemini', key: process.env.GEMINI_API_KEY });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: 'openai', key: process.env.OPENAI_API_KEY });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push({ name: 'anthropic', key: process.env.ANTHROPIC_API_KEY });
  }
  if (process.env.VENICE_API_KEY) {
    providers.push({ name: 'venice', key: process.env.VENICE_API_KEY });
  }

  if (providers.length === 0) {
    logger.error('[AIChatService] No AI providers configured! Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY in env vars.');
  }

  return providers;
}

/**
 * Get diagnostic info about AI chat service availability.
 * Does NOT reveal actual keys — only shows which are configured.
 */
export function getAIChatDiagnostics() {
  return {
    providers: {
      gemini: !!process.env.GEMINI_API_KEY,
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      venice: !!process.env.VENICE_API_KEY,
    },
    availableCount: getAvailableProviders().length,
    primaryProvider: process.env.GEMINI_API_KEY ? 'gemini'
      : process.env.OPENAI_API_KEY ? 'openai'
      : process.env.ANTHROPIC_API_KEY ? 'anthropic'
      : 'none',
  };
}

async function callProvider(provider, messages, options) {
  const { maxTokens, temperature } = options;

  switch (provider.name) {
    case 'openai':
      return callOpenAI(provider.key, messages, maxTokens, temperature);
    case 'anthropic':
      return callAnthropic(provider.key, messages, maxTokens, temperature);
    case 'gemini':
      return callGemini(provider.key, messages, maxTokens, temperature);
    case 'venice':
      return callVenice(provider.key, messages, maxTokens, temperature);
    default:
      throw new Error(`Unknown provider: ${provider.name}`);
  }
}

async function callOpenAI(apiKey, messages, maxTokens, temperature) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: controller.signal,
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model,
    tokenUsage: {
      inputTokens: data.usage?.prompt_tokens || null,
      outputTokens: data.usage?.completion_tokens || null,
      totalTokens: data.usage?.total_tokens || null,
    },
  };
}

async function callAnthropic(apiKey, messages, maxTokens, temperature) {
  // Extract system message
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemMsg?.content || '',
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.content[0].text,
    model: data.model,
    tokenUsage: {
      inputTokens: data.usage?.input_tokens || null,
      outputTokens: data.usage?.output_tokens || null,
      totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || null,
    },
  };
}

async function callGemini(apiKey, messages, maxTokens, temperature) {
  // Convert messages to Gemini format
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages.filter(m => m.role !== 'system');

  const contents = chatMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Flash first (fast, reliable under Render's 30s timeout), Pro as env-var override
  // Set GEMINI_MODEL=gemini-3.1-pro-preview in .env to use Pro instead
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const fallbackModel = primaryModel.includes('pro') ? 'gemini-2.5-flash' : 'gemini-2.0-flash';
  const models = [primaryModel, fallbackModel];

  for (const model of models) {
    // 25s timeout for all models — must finish before Render's 30s proxy timeout
    const timeoutMs = 25000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            contents,
            systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature,
            },
          }),
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini ${response.status}: ${err.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return {
        content: text,
        model,
        tokenUsage: {
          inputTokens: data.usageMetadata?.promptTokenCount || null,
          outputTokens: data.usageMetadata?.candidatesTokenCount || null,
          totalTokens: data.usageMetadata?.totalTokenCount || null,
        },
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        // Pro timed out — try Flash (faster model)
        if (model.includes('pro')) {
          logger.warn('[AIChatService] Gemini Pro timed out after %dms, falling back to Flash', timeoutMs);
          continue;
        }
        throw new Error('Gemini Flash request timed out after ' + timeoutMs + 'ms');
      }
      // Non-timeout error on Pro — still try Flash
      if (model.includes('pro')) {
        logger.warn('[AIChatService] Gemini Pro error: %s — falling back to Flash', err.message);
        continue;
      }
      throw err;
    }
  }

  throw new Error('All Gemini models failed');
}

async function callVenice(apiKey, messages, maxTokens, temperature) {
  const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b',
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Venice ${response.status}: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  return {
    content: data.choices[0].message.content,
    model: data.model || 'llama-3.3-70b',
    tokenUsage: {
      inputTokens: data.usage?.prompt_tokens || null,
      outputTokens: data.usage?.completion_tokens || null,
      totalTokens: data.usage?.total_tokens || null,
    },
  };
}
