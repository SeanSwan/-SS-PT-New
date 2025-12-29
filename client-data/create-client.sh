#!/bin/bash
# Quick script to create a new client folder
# Usage: ./create-client.sh "JOHN-DOE"

# Check if client name was provided
if [ -z "$1" ]; then
  echo "❌ Error: Please provide a client name"
  echo "Usage: ./create-client.sh \"JOHN-DOE\""
  echo "Example: ./create-client.sh \"SARAH-MITCHELL\""
  exit 1
fi

CLIENT_NAME="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$SCRIPT_DIR/$CLIENT_NAME"

# Check if client folder already exists
if [ -d "$CLIENT_DIR" ]; then
  echo "❌ Error: Client folder '$CLIENT_NAME' already exists!"
  exit 1
fi

echo "Creating new client: $CLIENT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Copy template folder
echo "📁 Copying template folder..."
cp -r "$SCRIPT_DIR/TEMPLATE-CLIENT" "$CLIENT_DIR"

# Rename Master Prompt file
echo "📝 Creating Master Prompt file..."
cd "$CLIENT_DIR"
mv MASTER-PROMPT-TEMPLATE.json "${CLIENT_NAME}-MASTER-PROMPT-v1.0.json"

# Create consent folder and summary
echo "🔒 Setting up consent folder..."
mkdir -p consent
cat > consent/consent-summary.md << EOF
# Consent Summary: ${CLIENT_NAME}
**Last Updated:** $(date +%Y-%m-%d)
**Next Review:** $(date -d '+3 months' +%Y-%m-%d 2>/dev/null || date -v +3m +%Y-%m-%d 2>/dev/null || echo "YYYY-MM-DD")

## Active Consents
- [ ] General Training Services (signed: YYYY-MM-DD)
- [ ] Medical Information Collection (signed: YYYY-MM-DD)
- [ ] Progress Photos - Personal Use Only (signed: YYYY-MM-DD)
- [ ] Marketing Use of Photos (signed: YYYY-MM-DD)
- [ ] AI Coaching - Text/Voice check-ins (signed: YYYY-MM-DD)

## Special Considerations
- [Add any special notes about client preferences]

## Next Actions
- [ ] Quarterly review due: [DATE]
- [ ] Annual renewal due: [DATE]
EOF

# Create first session template
echo "🏋️ Creating first session template..."
mkdir -p workouts
cat > "workouts/$(date +%Y-%m-%d)-session-1.md" << EOF
# Session 1: ${CLIENT_NAME}
**Date:** $(date +%Y-%m-%d)
**Time:** [TIME]
**Duration:** 60 minutes
**Location:** [GYM NAME]

## Goals for Today
- Baseline strength testing
- Learn foundational movements
- Build rapport and confidence

## Warm-Up (10 min)
- Treadmill walk: 5 min at 3.0 mph
- Dynamic stretches: arm circles, leg swings, torso twists

## Baseline Assessments
- Weight: ___ lbs
- Body measurements:
  - Waist: ___ inches
  - Hips: ___ inches
  - Chest: ___ inches
- Strength tests:
  - Goblet squat: ___ lbs × ___ reps
  - Push-ups: ___ reps
  - Plank: ___ seconds

## Workout
[Add workout details here]

## Cool-Down (5 min)
- Stretching: lower back, hips, shoulders

## Client Feedback
"[Client's reaction to first session]"

## Notes for Next Session
- [Training adjustments]
- [Areas to focus on]
- [Client preferences noted]
EOF

# Create notes folder with private notes template
echo "📋 Creating notes folder..."
mkdir -p notes
cat > notes/private-notes.md << EOF
# Private Trainer Notes: ${CLIENT_NAME}
**Last Updated:** $(date +%Y-%m-%d)

## First Impressions
- [Initial observations about client]
- [Communication style preferences]
- [Motivation level and commitment]

## Health Considerations
- [Medical conditions to monitor]
- [Injury history and limitations]
- [Pain or discomfort to watch for]

## Training Strategy
- [Approach for this client]
- [Key exercises to emphasize]
- [Exercises to avoid or modify]

## Progress Notes
### $(date +%Y-%m-%d)
- [Add ongoing notes here as training progresses]
EOF

# Create README for client folder
echo "📖 Creating client folder README..."
cat > README.md << EOF
# ${CLIENT_NAME} - Client Folder

**Created:** $(date +%Y-%m-%d)
**Status:** Active
**Package Tier:** [Silver/Golden/Rhodium]

## Quick Links
- **Master Prompt:** [${CLIENT_NAME}-MASTER-PROMPT-v1.0.json](${CLIENT_NAME}-MASTER-PROMPT-v1.0.json)
- **Consent Summary:** [consent/consent-summary.md](consent/consent-summary.md)
- **Latest Workout:** [workouts/$(date +%Y-%m-%d)-session-1.md](workouts/$(date +%Y-%m-%d)-session-1.md)
- **Private Notes:** [notes/private-notes.md](notes/private-notes.md)

## Primary Goal
[Weight loss / Muscle gain / Strength / Pain relief / Athletic performance / General health]

## Session Schedule
- **Frequency:** [X] sessions per week
- **Days/Times:** [Mon/Wed/Fri at 6pm, etc.]

## Next Session
**Date:** [YYYY-MM-DD]
**Time:** [HH:MM AM/PM]
**Focus:** [Workout focus for next session]

## Progress Milestones
- [ ] Baseline assessments complete
- [ ] First month progress photos
- [ ] First strength gains recorded
- [ ] First goal milestone achieved

## Notes
[Add important client-specific information here]
EOF

echo ""
echo "✅ SUCCESS! Client folder created: $CLIENT_DIR"
echo ""
echo "Next steps:"
echo "  1. Edit: ${CLIENT_NAME}-MASTER-PROMPT-v1.0.json (fill in client data)"
echo "  2. Update: consent/consent-summary.md (after getting signed forms)"
echo "  3. Log first session: workouts/$(date +%Y-%m-%d)-session-1.md"
echo "  4. Add to registry: ../CLIENT-REGISTRY.md"
echo ""
echo "📁 Client folder location:"
echo "  $CLIENT_DIR"
echo ""
echo "🎉 Ready to train ${CLIENT_NAME}!"
