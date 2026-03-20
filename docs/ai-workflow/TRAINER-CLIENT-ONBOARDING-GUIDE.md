# Trainer Client Onboarding Guide
**For:** Sean Swan (SwanStudios)
**Purpose:** Step-by-step guide for onboarding Move Fitness and external clients via the SwanStudios app
**Last Updated:** 2026-03-18

---

## Quick Start: Onboarding a New Client in 5 Steps

### Step 1: Create the Client Account

**Via Admin Dashboard:**
1. Log in to sswanstudios.com as admin
2. Go to **Clients & Team** (sidebar)
3. Click **"Add Client"** button
4. Fill in the form:
   - First Name, Last Name
   - Email (use a unique email — this is their login)
   - Username (suggestion: FirstNameLastInitial_MF for Move Fitness clients)
   - Password (or leave blank for auto-generated)
   - Date of Birth, Gender, Weight, Height
   - Fitness Goal (free text)
   - Training Experience: beginner / intermediate / advanced
   - Health Concerns (list ALL surgeries, injuries, conditions)
   - Client Source: select "Move Fitness" or "External"
   - Available Sessions: number of sessions purchased
5. Click **Create** — the client will receive a welcome email with login credentials

**Via AI Assistant (Future — once fully deployed):**
1. Open the AI Assistant (Ctrl+K or tap the Swan logo)
2. Select a client or say: *"Create a new client named [Name], age [X], [gender], [weight] lbs, [height], from Move Fitness"*
3. The AI will prompt you for missing fields
4. Confirm the creation

### Step 2: Record Medical / Injury History

**Via Admin Dashboard:**
1. Go to **Clients & Team** → click on the client's card
2. Navigate to their **Pain & Injury** section
3. Click **Add Pain Entry** for each condition:
   - Select the body region on the body map
   - Set pain level (1-10, or 1 for "history only")
   - Add description (surgery details, recovery status)
   - Note aggravating movements (what to AVOID)
4. Repeat for each condition

**What to Record for Move Fitness Clients:**
- Any surgeries (tummy tuck, arm reduction, knee replacement, etc.)
- Current pain points and their levels
- Movement restrictions (no overhead, no deep squat, etc.)
- Recovery timeline (how many weeks post-op)

### Step 3: Set Client Goals

**Via Admin Dashboard:**
1. Go to the client's profile → **Goals** section
2. Click **Add Goal** for each:
   - Title: "Bench Press 75 lbs" or "Lose 10 lbs"
   - Category: strength / body_composition / endurance / flexibility
   - Target value + unit (e.g., 75 lbs, 155 lbs, 30 minutes)
   - Current value (where they are now)
   - Deadline (6 months out is a good default)
3. Goals help the AI create personalized plans

### Step 4: Generate an AI Workout Plan

**Via AI Assistant (Recommended):**
1. Open the AI Assistant (Ctrl+K)
2. Select the client from the **Client Picker** dropdown
3. Set context to **"Workout Generation"**
4. Send a message like:

> Create a 4-week workout plan for this client. She is [age], [gender], [weight] lbs, [height], [experience level] from Move Fitness.
> KEY DETAILS: [list all medical conditions, surgeries, and restrictions]
> GOALS: [list all goals]
> SCHEDULE: [sessions per week, duration, days/times]
> RECENT EXERCISES: [list what they've been doing]
> Use NASM OPT Phase [X] protocol.

5. Review the AI-generated plan
6. If it's good, tap **"Apply to Logger"** to save it
7. If it needs changes, ask the AI to modify specific parts

**Pro Tips for Better AI Plans:**
- **Always include surgical details** — the AI will modify exercises to protect healing areas
- **Mention specific weights** — "bench 65lb x10" helps the AI set appropriate progression
- **State the session length** — "30 minutes" ensures the AI doesn't create a 60-min plan
- **Name the NASM phase** — the AI follows OPT model strictly when you specify

### Step 5: Input Historical Workout Data (Optional but Recommended)

**For Move Fitness transfers with existing session logs:**
1. Go to **Workouts** section in the admin dashboard
2. For each historical session, create a **Workout Session** with:
   - Date of the session
   - Each exercise: name, sets, reps, weight, tempo, RPE
   - Notes on form, modifications, or trainer observations
3. This data feeds into the AI's understanding of the client's progression

**Via AI Assistant (Future):**
> Log these workout sessions for [client]:
> Jan 19: Goblet box squat 30lb, cable row rope 70lb, reverse lunges bodyweight
> Jan 22: Bench 45lb x13, 55lb x12, side leg lifts, lat pulldown 44lb

---

## Move Fitness Client Checklist

Use this checklist for every Move Fitness client you onboard:

- [ ] **Account created** with unique email and "Move Fitness" client source
- [ ] **Profile complete**: DOB, gender, weight, height, fitness goal, experience level
- [ ] **Health concerns documented**: ALL surgeries, injuries, conditions, recovery timelines
- [ ] **Pain entries created**: Body map markers for each active issue
- [ ] **Goals set**: At least 2-3 measurable goals with deadlines
- [ ] **Historical sessions logged**: As many past sessions as you have data for
- [ ] **AI workout plan generated**: Using NASM protocol appropriate for their level
- [ ] **Plan reviewed**: Verify all exercises are safe given their medical history
- [ ] **Credentials shared**: Client has login info to access their dashboard

---

## Common Scenarios

### Scenario: Client with Recent Surgery
1. Record the surgery as a pain entry with high severity
2. Note EXACT restrictions: "No overhead pressing for 6 weeks", "No chest stretching until 8 weeks post-op"
3. When generating AI plan, state: "Client had [surgery] [X weeks] ago. Must avoid [specific movements]."
4. The AI will automatically substitute safer alternatives (e.g., floor press instead of bench)

### Scenario: Client with Muscle Atrophy
1. Note the atrophy in health concerns AND as a pain entry
2. When generating AI plan, state: "Right quad atrophy, needs unilateral prioritization"
3. The AI will program single-leg exercises with the weak side going first

### Scenario: Transferring Multiple Move Fitness Clients
1. Create accounts in batch (one at a time via the UI)
2. For each client, focus on the minimum viable data:
   - Name, email, basic stats, health concerns
   - 2-3 goals
   - Current exercise level
3. Generate AI plans after profile creation
4. Historical data can be added gradually over the first few sessions

### Scenario: Client Bench Press Progression
The AI uses this data to set appropriate weights:
- Tell the AI their current max reps at each weight
- Example: "45lb x14, 55lb x12 assisted, 65lb x10 failing"
- The AI calculates estimated 1RM and programs appropriate progression

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Add Client" button doesn't open modal | Refresh the page or use Ctrl+Shift+R for hard refresh |
| AI generation says "degraded mode" | AI providers may be temporarily down. Try again in 5 min, or use manual templates |
| "Master Prompt JSON not found" | The system auto-generates a fallback profile. If this persists, update the client's profile with more data |
| 500 error on any endpoint | Check if DB migrations are current — contact support |
| AI plan doesn't account for surgery | Make sure surgical details are in both health concerns AND your message to the AI |

---

## AI Assistant Commands (Future Capabilities)

These commands will work once the AI Terminal Phase 2 (Client Selector) is fully deployed:

| Say This | AI Does This |
|----------|-------------|
| "Select [client name]" | Switches the AI context to that client |
| "Show me their profile" | Displays client summary with goals, measurements, history |
| "Create a workout plan" | Generates NASM-appropriate plan based on all client data |
| "Log today's workout" | Opens workout logging with the client pre-selected |
| "How's their progress?" | Shows progress trends, streak, and compliance metrics |
| "Update their weight to [X]" | Records a new body measurement |
| "Add a note: [text]" | Creates a trainer note attached to the client |

---

*Guide created 2026-03-18 by Claude Opus 4.6 for SwanStudios trainer onboarding workflow.*
