# Client Onboarding UI Wireframes (Part 2)
**Version:** 1.0
**Created:** 2026-01-15
**Phase:** Phase 1.1 - Client Onboarding Blueprint
**Purpose:** Define UI/UX for questionnaire, movement screen, onboarding progress, and admin interfaces
**Part:** 2 of 2
**Scope:** Movement screen UI, admin interfaces, mobile responsive layouts, accessibility

---

## Table of Contents
1. [Movement Screen Assessment UI](#movement-screen-assessment-ui)
2. [Admin Onboarding Management Interface](#admin-onboarding-management-interface)
3. [Mobile Responsive Designs](#mobile-responsive-designs)
4. [UI/UX Best Practices](#uiux-best-practices)
5. [Accessibility Requirements](#accessibility-requirements)
6. [Next Steps](#next-steps)

---

## Movement Screen Assessment UI

### Trainer/Admin Interface (NASM OHSA Protocol)

```
+--------------------------------------------------------------------+
| SwanStudios Admin Dashboard                       [Admin Menu]    |
+-------------------------------------------------------------------+
|                                                                    |
| NASM Overhead Squat Assessment (OHSA)                              |
| Client: John Smith (ID: 7) | Package: Signature 60 AI Data         |
|                                                                    |
| PAR-Q+ Pre-Screen                                                  |
| - Heart condition? [No]  - Chest pain? [No]                        |
| - Dizziness? [No]       - Bone/joint issues? [No]                  |
| - BP meds? [Yes]       - Medical reason to avoid exercise? [No]    |
| - Other risks? [No]                                                |
| Medical Clearance Required: [Yes]                                  |
|                                                                    |
| OHSA Checkpoints (none/minor/significant)                          |
| Anterior View                                                      |
| - Feet turnout: [minor v]    - Feet flattening: [none v]           |
| - Knee valgus: [significant v] - Knee varus: [none v]              |
|                                                                    |
| Lateral View                                                       |
| - Excessive forward lean: [minor v]  - Low back arch: [none v]      |
| - Arms fall forward: [minor v]    - Forward head: [none v]          |
|                                                                    |
| Asymmetric weight shift: [none v]                                  |
| Notes: [Client shows knee valgus + forward lean]                   |
| Video URL: [s3://movement-screens/user-7-ohsa.mp4]                 |
|                                                                    |
| NASM Score: 73/100 (auto) | OPT Phase: 2 Strength Endurance        |
|                                                                    |
| Corrective Strategy (auto-generated)                               |
| Inhibit: TFL foam roll, adductors foam roll                         |
| Lengthen: hip flexor stretch, adductor stretch                      |
| Activate: glute medius, glute maximus                               |
| Integrate: ball wall squats                                         |
|                                                                    |
| [Cancel]                                   [Save NASM Assessment]  |
+--------------------------------------------------------------------+

On Save:
-> POST /api/onboarding/:userId/movement-screen
-> Calculate nasmAssessmentScore (none/minor/significant)
-> Generate correctiveExerciseStrategy + OPT phase
-> Save to client_baseline_measurements table
-> Show success toast: "NASM assessment saved for John Smith"
```

### Video Demo Integration

```
+--------------------------------------------------------------------+
| Movement Assessment Video Player                                  |
+-------------------------------------------------------------------+
|                                                                    |
|                [OHSA Demo Video: Overhead Squat]                   |
|                                                                    |
| Key Points Overlay:                                                |
| - Feet: turnout/flattening                                         |
| - Knees: valgus/varus                                              |
| - LPHC: forward lean/low back arch                                 |
| - Shoulders: arms fall forward                                     |
| - Head: forward head                                               |
|                                                                    |
| [00:15 / 00:45]  [Play] [Pause] [Rewind] [Fullscreen]              |
|                                                                    |
| Scoring Guidelines (NASM):                                        |
| - none: no compensation                                            |
| - minor: slight deviation                                          |
| - significant: clear compensation                                  |
|                                                                    |
| Score = average of 9 checkpoints (0-100)                           |
+--------------------------------------------------------------------+
```

## Admin Onboarding Management Interface

### Admin Dashboard - Client Onboarding Table

```
┌─────────────────────────────────────────────────────────────────┐
│  SwanStudios Admin Dashboard                    [Admin Menu]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client Onboarding Management                                   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Filters:                                                   ││
│  │  ┌─────────┐ ┌──────────────┐ ┌──────────────┐             ││
│  │  │ All (42)│ │ Package: All │ │ Status: All  │             ││
│  │  └─────────┘ └──────────────┘ └──────────────┘             ││
│  │                                                             ││
│  │  Search: ┌───────────────────────┐ [🔍 Search]             ││
│  │          │ John Smith            │                          ││
│  │          └───────────────────────┘                          ││
│  │                                                             ││
│  │  [+ Create Questionnaire for Client] [📥 Import CSV]       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Client Onboarding Table (42 clients)                       ││
│  ├──────┬─────────────┬──────────┬────────┬────────┬──────────┤│
│  │Client│   Package   │Questnnr  │Movement│Primary │  Actions ││
│  │      │             │ Status   │ Screen │  Goal  │          ││
│  ├──────┼─────────────┼──────────┼────────┼────────┼──────────┤│
│  │John  │Signature 60 │✅ 100%   │✅ 73  │Weight  │[View]    ││
│  │Smith │AI Data      │Submitted │Scored  │Loss    │[Edit]    ││
│  │      │             │Jan 15    │Jan 15  │        │[Delete]  ││
│  ├──────┼─────────────┼──────────┼────────┼────────┼──────────┤│
│  │Sarah │Transform.   │⏸️ 65%    │⏸️ N/A  │Muscle  │[View]    ││
│  │Jones │Pack         │Draft     │Pending │Gain    │[Remind]  ││
│  │      │             │Jan 14    │        │        │[Edit]    ││
│  ├──────┼─────────────┼──────────┼────────┼────────┼──────────┤│
│  │Mike  │Express 30   │✅ 100%   │⏸️ N/A  │Athletic│[View]    ││
│  │Chen  │             │Submitted │Pending │Perform │[Schedule]││
│  │      │             │Jan 13    │        │        │[Edit]    ││
│  ├──────┼─────────────┼──────────┼────────┼────────┼──────────┤│
│  │Emily │Signature 60 │❌ 0%     │⏸️ N/A  │N/A     │[View]    ││
│  │Davis │Standard     │Not Start │Pending │        │[Create]  ││
│  │      │             │          │        │        │[Remind]  ││
│  ├──────┼─────────────┼──────────┼────────┼────────┼──────────┤│
│  │      │             │          │        │        │          ││
│  │ ...  │    ...      │   ...    │  ...   │  ...   │   ...    ││
│  └──────┴─────────────┴──────────┴────────┴────────┴──────────┘│
│                                                                 │
│  [Previous] Page 1 of 5 [Next]                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

Legend:
✅ = Complete
⏸️ = Pending
❌ = Not Started
```

### Admin - Create Questionnaire for Client (Manual Entry)

```
┌─────────────────────────────────────────────────────────────────┐
│  Create Questionnaire for Client                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Client: ┌────────────────────────────────┐ [🔍 Search]         │
│          │ John Smith (ID: 7)             │                     │
│          └────────────────────────────────┘                     │
│                                                                 │
│  Questionnaire Version: ┌──────┐                                │
│                         │ 3.0  │                                │
│                         └──────┘                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Quick Entry Mode (Admin can fill out on behalf of client)  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                             ││
│  │  Section 1: Personal Info                                  ││
│  │  Age: ┌────┐  Height: ┌────┐ in  Weight: ┌────┐ lbs       ││
│  │       │ 35 │          │ 70 │             │ 185│            ││
│  │       └────┘          └────┘             └────┘            ││
│  │                                                             ││
│  │  Section 2: Goals & Package                                ││
│  │  Primary Goal: ┌──────────────────┐                        ││
│  │                │ Weight Loss      │                         ││
│  │                └──────────────────┘                        ││
│  │  Package:      ┌──────────────────┐                        ││
│  │                │ Signature 60 AI  │                         ││
│  │                └──────────────────┘                        ││
│  │                                                             ││
│  │  Section 3: Health History                                 ││
│  │  Chronic Conditions: ☑ Hypertension ☐ Diabetes             ││
│  │  Medications: ┌──────────────────────────────────────┐     ││
│  │               │ Lisinopril 10mg daily                │     ││
│  │               └──────────────────────────────────────┘     ││
│  │                                                             ││
│  │  ... (13 sections total, collapsed for brevity)            ││
│  │                                                             ││
│  │  [Expand All Sections] [Import from Previous Client]       ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Auto-Extracted Indexed Fields (Preview)                    ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │  primaryGoal: "weight_loss"                                 ││
│  │  trainingTier: "signature_60_ai"                            ││
│  │  commitmentLevel: "high"                                    ││
│  │  healthRisk: "medium" (1 chronic condition)                 ││
│  │  nutritionPrefs: ["vegetarian"]                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [Cancel] [Save as Draft] [Submit Questionnaire]                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

On Submit:
→ POST /api/onboarding/:userId/questionnaire
→ Status: "submitted" (on behalf of client)
→ Created by: Admin (tracked in audit log)
```

### Admin - Bulk Import Questionnaires (CSV Upload)

```
┌─────────────────────────────────────────────────────────────────┐
│  Bulk Import Questionnaires                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Upload CSV file with client questionnaire data                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                             ││
│  │         [📁 Choose CSV File]                                ││
│  │                                                             ││
│  │  File: clients_onboarding_jan_2026.csv                     ││
│  │  Size: 245 KB                                              ││
│  │  Rows: 15 clients                                          ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  CSV Format Requirements:                                       │
│  ──────────────────────────────────────────────────────────────  │
│  - Column 1: userId (integer)                                   │
│  - Column 2: questionnaireVersion (string, e.g., "3.0")         │
│  - Column 3: responsesJson (JSON string with all 85 questions)  │
│  - Column 4: primaryGoal (string)                               │
│  - Column 5: trainingTier (string)                              │
│  - ... etc.                                                     │
│                                                                 │
│  [📥 Download Sample CSV Template]                              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  Import Preview (15 rows)                                   ││
│  ├──────┬──────────────┬──────────────┬────────────────────────┤│
│  │UserID│Package       │Primary Goal  │Status                  ││
│  ├──────┼──────────────┼──────────────┼────────────────────────┤│
│  │  7   │Signature 60  │Weight Loss   │✅ Valid                ││
│  │  8   │Transform Pack│Muscle Gain   │✅ Valid                ││
│  │  9   │Express 30    │Athletic Perf │❌ Missing healthRisk   ││
│  │  10  │Signature 60  │Weight Loss   │✅ Valid                ││
│  │ ...  │     ...      │     ...      │       ...              ││
│  └──────┴──────────────┴──────────────┴────────────────────────┘│
│                                                                 │
│  Validation Summary:                                            │
│  ✅ 14 valid rows                                               │
│  ❌ 1 row with errors (will be skipped)                         │
│                                                                 │
│  [Cancel] [Import Valid Rows Only] [Fix Errors & Re-Upload]     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mobile Responsive Designs

### Mobile Questionnaire (Stacked Layout)

```
┌─────────────────────────┐
│ SwanStudios        [≡]  │
├─────────────────────────┤
│                         │
│  Onboarding             │
│  Questionnaire          │
│                         │
│  ┌───────────────────┐  │
│  │ [████░░░░░░] 35%  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Section 5:        │  │
│  │ Nutrition Prefs   │  │
│  │ (7 questions)     │  │
│  └───────────────────┘  │
│                         │
│  1. Dietary             │
│     restrictions?       │
│                         │
│  ☑ Vegetarian           │
│  ☐ Vegan                │
│  ☐ Pescatarian          │
│  ☐ None                 │
│                         │
│  2. Food allergies?     │
│                         │
│  ☐ Dairy                │
│  ☐ Gluten               │
│  ☐ Nuts                 │
│  ☑ Shellfish            │
│  ☐ None                 │
│                         │
│  3. Meals per day?      │
│                         │
│  ○ 1-2  ● 3  ○ 4-5      │
│                         │
│  ┌───────────────────┐  │
│  │ [< Prev] [Next >] │  │
│  │   [Save Draft]    │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
```

### Mobile Movement Screen (Simplified)

```
+-----------------------------+
| SwanStudios Admin       [=] |
+-----------------------------+
| NASM OHSA - Mobile           |
| Client: John Smith           |
|                              |
| OHSA Checkpoints             |
| - Feet turnout: minor        |
| - Knee valgus: significant   |
| - Forward lean: minor        |
| - Arms fall forward: minor   |
|                              |
| NASM Score: 73/100           |
| OPT Phase: 2 Strength End.   |
|                              |
| Notes: Knee valgus + lean    |
| Medical clearance: Yes       |
|                              |
| [Cancel]         [Save]      |
+-----------------------------+
```

## UI/UX Best Practices

### Loading States

```
┌─────────────────────────────────────────────────────────────────┐
│  Loading Questionnaire...                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         ⏳ Loading your onboarding questionnaire...             │
│                                                                 │
│  [Spinner animation]                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Error States

```
┌─────────────────────────────────────────────────────────────────┐
│  ❌ Error Loading Questionnaire                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Unable to load your questionnaire. Please try again.           │
│                                                                 │
│  Error: Failed to fetch /api/onboarding/7/questionnaire         │
│  (Network timeout after 10 seconds)                             │
│                                                                 │
│  [Retry] [Contact Support]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Empty States

```
┌─────────────────────────────────────────────────────────────────┐
│  No Questionnaire Found                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📋 You haven't started your onboarding questionnaire yet.      │
│                                                                 │
│  Complete your profile to unlock personalized AI training!      │
│                                                                 │
│  [Start Questionnaire]                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

1. **Keyboard Navigation**
   - All form fields tabbable
   - Enter key submits current section
   - Escape key cancels/goes back

2. **Screen Reader Support**
   - Aria labels on all inputs
   - Progress announcements ("Section 5 of 13")
   - Validation error announcements

3. **Color Contrast**
   - Text: 4.5:1 minimum contrast ratio
   - Interactive elements: 3:1 minimum
   - Error messages: red with icon (not color-only)

4. **Focus Indicators**
   - Visible focus ring on all interactive elements
   - Skip to main content link

---

## Next Steps

1. ✅ ONBOARDING-FLOW.mermaid.md complete
2. ✅ ONBOARDING-WIREFRAMES.md complete
3. ⏭️ Update ADMIN-DASHBOARD-BACKEND-ARCHITECTURE.mermaid.md
4. ⏭️ Implement controllers and routes (after documentation approval)

---

**END OF ONBOARDING-WIREFRAMES.md**


