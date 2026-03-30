# AI-Powered Client Onboarding Enhancement Plan

## Goal
Enable the SwanStudios AI Assistant to fully onboard clients when a trainer pastes client info into the chat. Two tiers:
1. **Move Fitness clients** (free, clientSource='move_fitness', no billing)
2. **SwanStudios clients** (paid, clientSource='swanstudios', session tracking)

## Current State
- AI Assistant has 10 data update action types (body_measurement, goal, client_note, macro_log, progress_level, daily_workout_form, draft_email, draft_sms)
- NO `create_client` action exists — AI cannot create new users
- Admin CRUD endpoint exists: POST /api/admin/clients (adminClientController.mjs)
- Claim code system exists: SWAN-XXXX tokens for invite flow
- Onboarding wizard exists but requires manual form filling
- AI system prompts have role-based contexts but no onboarding context

## Proposed Changes

### Backend Changes

#### 1. New AI Action Type: `create_client` in aiDataWriteService.mjs
- Add handler that calls adminClientController logic internally
- Required fields: firstName, lastName (minimum)
- Optional: email, phone, dateOfBirth, gender, clientSource, goals, healthConcerns, trainingExperience
- Auto-generates username from firstName+lastName if not provided
- Auto-generates temp password
- Sets clientSource based on AI instruction ('move_fitness' or 'swanstudios')
- Sets forcePasswordChange=true
- Creates ClientProgress record
- Returns: userId, temporaryPassword, claimUrl (if claim token generated)

#### 2. New AI Action Type: `generate_claim_code` in aiDataWriteService.mjs
- Generates SWAN-XXXX claim token for the newly created client
- Returns claimUrl for the trainer to share with client
- Sets accountStatus='invited'

#### 3. New AI Action Type: `assign_trainer` in aiDataWriteService.mjs
- Creates ClientTrainerAssignment record
- Auto-assigns the requesting trainer/admin as the trainer
- Sets status='active'

#### 4. New AI Action Type: `create_movement_analysis` in aiDataWriteService.mjs
- Creates MovementAnalysis record from AI-parsed assessment data
- Stores overheadSquatAssessment, posturalAssessment, movementQualityAssessments
- Auto-calculates NASM score, corrective strategy, OPT phase recommendation

#### 5. New AI Context: 'client_onboarding' in aiChatService.mjs
- System prompt that instructs AI how to:
  - Parse unstructured client info (like trainer dictation/paste)
  - Extract: name, age, gender, health conditions, movement limitations, goals, training history
  - Determine clientSource (Move Fitness vs SwanStudios)
  - Generate structured create_client action
  - Follow up with movement analysis, goals, and trainer assignment
  - Generate initial Phase 1 workout plan

#### 6. Update system prompt to include onboarding instructions
- AI should know about the two-tier system
- AI should ask clarifying questions if critical info is missing
- AI should generate claim code and provide instructions

### Frontend Changes

#### 7. Add 'client_onboarding' context to AIContextSelector.tsx
- New context pill for "Client Onboarding"
- Available for admin and trainer roles

#### 8. Add CREATE_CLIENT to parseAIActions.ts valid actions whitelist
- Add to VALID_ACTIONS set
- Create ActionCard rendering for client creation confirmation

#### 9. Update ChatMessage.tsx to render onboarding results
- Show new client info card with: name, temp password, claim URL, QR code
- Copy-to-clipboard for claim URL and temp password
- Show assigned trainer confirmation

### Security Considerations
- Only admin and trainer roles can trigger create_client
- Rate limit: max 5 client creations per hour per user
- Validate clientSource against allowed values
- Never expose passwords in AI response text (only in structured action result)
- Audit trail: log who created the client and when

### Enhancement Opportunities
- AI could detect Move Fitness vs SwanStudios from context clues ("free client", "gym client", "my paying client")
- AI could auto-detect OPT phase from described limitations
- AI could generate initial 3-month periodization plan immediately after onboarding
- AI could create initial goals from the client description
- AI could set up check-in schedule based on training frequency
