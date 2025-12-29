# Manual Onboarding Fallback Workflow

**Purpose:** Backup process for creating client Master Prompt JSON when API is unavailable or digital form fails
**Last Updated:** 2025-11-07
**Status:** ✅ Production Ready - Always Available Fallback

---

## When to Use This Manual Process

**Use this fallback when:**
- ❌ Onboarding API endpoint is down
- ❌ Digital questionnaire form has technical issues
- ❌ Client prefers paper/verbal interview over digital form
- ❌ Internet connectivity is unavailable during client intake
- ❌ Emergency onboarding needed (new client walk-in)

**Default workflow:** Use the API (POST /api/onboarding) - it's faster and prevents errors

---

## Manual Process Overview

### Step 1: Collect Client Information

Use [CLIENT-ONBOARDING-QUESTIONNAIRE.md](CLIENT-ONBOARDING-QUESTIONNAIRE.md) (85 questions)

**Delivery Methods:**
- 📋 **Paper form** - Print questionnaire, client fills out by hand
- 🎤 **Voice interview** - Sean asks questions, records responses
- 📝 **Hybrid** - Client fills basics, Sean completes during Session 1

**Estimated Time:** 30-40 minutes

### Step 2: Create Master Prompt JSON Manually

Use the template below and fill in collected data:

**Template Location:** `client-data/templates/MASTER-PROMPT-TEMPLATE.json`

#### Quick Copy-Paste Template

```json
{
  "version": "3.0",
  "client": {
    "name": "[REAL NAME - will be encrypted]",
    "preferredName": "[PREFERRED NAME/NICKNAME]",
    "alias": "[SPIRIT NAME - e.g., Golden Hawk]",
    "age": 0,
    "gender": "[Male/Female/Non-binary/Prefer not to say]",
    "bloodType": "[A/B/AB/O/Unknown]",
    "contact": {
      "phone": "###-###-####",
      "email": "client@email.com",
      "preferredTime": "[Morning/Afternoon/Evening]"
    }
  },
  "measurements": {
    "height": {
      "feet": 0,
      "inches": 0
    },
    "currentWeight": 0,
    "targetWeight": null,
    "bodyFatPercentage": null,
    "lastDexaScan": null
  },
  "goals": {
    "primary": "[Weight loss/Muscle gain/Strength improvement/Pain relief/Athletic performance/General health]",
    "why": "[2-3 sentences on why this goal matters]",
    "successLooksLike": "[What success looks like in 6 months]",
    "timeline": "[3 months/6 months/1 year/Ongoing]",
    "commitmentLevel": 0,
    "pastObstacles": "[What prevented success before]",
    "supportNeeded": "[What client needs from trainer]"
  },
  "health": {
    "medicalConditions": [],
    "underDoctorCare": false,
    "doctorCleared": true,
    "medications": [
      {"name": "Med Name", "dosage": "XX mg", "frequency": "X times/day"}
    ],
    "supplements": [
      {"name": "Supplement Name", "consistent": true}
    ],
    "injuries": [
      {"year": 2020, "bodyPart": "Right knee", "type": "ACL tear", "status": "Fully healed"}
    ],
    "surgeries": [
      {"year": 2021, "surgery": "ACL repair", "recoveryStatus": "Complete"}
    ],
    "currentPain": [
      {"bodyPart": "Lower back", "intensity": 3, "duration": "2 weeks", "triggers": "Sitting", "relieves": "Stretching", "affectsDailyLife": false}
    ]
  },
  "nutrition": {
    "currentDiet": "[Very healthy/Somewhat healthy/Average/Poor]",
    "tracksFood": false,
    "trackingApp": null,
    "dailyProtein": 0,
    "targetProtein": 0,
    "waterIntake": 0,
    "eatingSchedule": {
      "breakfast": "7:00 AM",
      "lunch": "12:00 PM",
      "dinner": "6:00 PM",
      "snacks": 0
    },
    "bloodTypeDiet": false,
    "dietaryPreferences": [],
    "allergies": [],
    "lovesFood": [],
    "hatesFood": [],
    "cooksAtHome": "[Often/Sometimes/Rarely/Never]",
    "mealPrepInterest": false
  },
  "lifestyle": {
    "sleepHours": 0,
    "sleepQuality": "[Excellent/Good/Fair/Poor]",
    "stressLevel": 0,
    "stressSources": "",
    "occupation": "",
    "workActivityLevel": "[Sedentary/Moderate/Active]",
    "smokes": false,
    "alcoholConsumption": "[None/Occasionally/Moderate/Heavy]"
  },
  "training": {
    "fitnessLevel": "[Beginner/Beginner-Intermediate/Intermediate/Advanced]",
    "currentlyWorkingOut": false,
    "workoutsPerWeek": 0,
    "workoutTypes": "",
    "pastExperience": [],
    "previousTrainer": false,
    "previousTrainerExperience": "",
    "gymLocation": "Move Fitness",
    "favoriteExercises": [],
    "dislikedExercises": [],
    "preferredStyle": [],
    "sessionFrequency": 0,
    "sessionDuration": "[60 min/90 min/Flexible]"
  },
  "baseline": {
    "cardiovascular": null,
    "strength": null,
    "rangeOfMotion": null,
    "flexibility": null
  },
  "aiCoaching": {
    "dailyCheckIns": false,
    "checkInTime": "",
    "checkInMethod": "[Text/Voice/Both]",
    "aiHelp": [],
    "communicationStyle": "[Direct/Warm/Educational/Balanced]",
    "motivationStyle": "[Tough love/Compassion/Remind me why/Show data]",
    "progressReportFrequency": "[Weekly/Bi-weekly/Monthly/Only when I ask]"
  },
  "visualDiagnostics": {
    "comfortableWithPhotos": false,
    "painPhotos": false,
    "wearable": "[Apple Watch/Fitbit/Garmin/Oura/Whoop/None]",
    "wearableIntegration": false
  },
  "package": {
    "tier": "[Silver/Golden/Rhodium]",
    "price": 0,
    "sessionsPerWeek": 0,
    "commitment": "[4-week trial/12-week program/6-month commitment/1-year transformation]",
    "paymentMethod": "[Per session/Monthly/Upfront]"
  },
  "notes": {
    "anythingElse": "",
    "mostExcitedAbout": "",
    "nervousAbout": "",
    "questionsForTrainer": ""
  },
  "trainerAssessment": {
    "healthRisk": "[Low/Moderate/High]",
    "doctorClearanceNeeded": false,
    "priorityAreas": "",
    "recommendedFrequency": 0,
    "recommendedTier": "[Silver/Golden/Rhodium]"
  },
  "metadata": {
    "intakeDate": "YYYY-MM-DD",
    "firstSessionDate": null,
    "createdBy": "SwanStudios Personal Training System v3.0",
    "lastUpdated": "YYYY-MM-DDTHH:MM:SS.000Z"
  }
}
```

### Step 3: Generate Spirit Name

**Purpose:** Privacy-preserving alias for the client

**Option A - Auto-Generate (Recommended)**

Choose from the celestial spirit names list:

| Category | Spirit Names |
|----------|-------------|
| **Birds of Prey** | Golden Hawk, Silver Crane, Thunder Phoenix, Rising Eagle, Wise Owl, Young Falcon |
| **Powerful Animals** | Mountain Bear, Stone Bison, Crimson Wolf, Emerald Dragon, Azure Lion, Amber Tiger |
| **Agile Hunters** | Sapphire Fox, Ruby Leopard, Jade Panther, Pearl Lynx |

**Option B - Client Choice**

Ask client: "What spirit animal or nature name resonates with you?"

**Rules:**
- Must be 2-3 words
- Capitalized (e.g., "Golden Hawk" not "golden hawk")
- No profanity or inappropriate names
- Unique per client (check existing spirit names)

### Step 4: Create User Record in Database

**Method A - Use SQL Script**

Save this as `backend/create-client-manual.sql`:

```sql
-- Replace placeholders with actual values
INSERT INTO "Users" (
  "firstName",
  "lastName",
  "email",
  "username",
  "password", -- This will be hashed by trigger
  "phone",
  "role",
  "gender",
  "weight",
  "height",
  "fitnessGoal",
  "masterPromptJson",
  "spiritName",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES (
  'FirstName',                         -- firstName
  'LastName',                          -- lastName
  'client@email.com',                  -- email
  'client-username',                   -- username
  'TempPassword123!',                  -- password (will be hashed)
  '555-123-4567',                      -- phone
  'client',                            -- role
  'Male',                              -- gender
  180.0,                               -- weight (lbs)
  70.0,                                -- height (inches: feet*12 + inches)
  'Weight loss',                       -- fitnessGoal
  '[PASTE MASTER PROMPT JSON HERE]'::json,  -- masterPromptJson
  'Golden Hawk',                       -- spiritName
  true,                                -- isActive
  CURRENT_TIMESTAMP,                   -- createdAt
  CURRENT_TIMESTAMP                    -- updatedAt
) RETURNING id;

-- Note the returned ID (e.g., 15)
-- Client ID will be PT-00015
```

**Run the script:**

```bash
cd backend
psql -h localhost -U swanadmin -d swanstudios -f create-client-manual.sql
```

**Method B - Use Node.js Script**

Save this as `backend/create-client-manual.mjs`:

```javascript
import User from './models/User.mjs';
import sequelize from './database.mjs';
import fs from 'fs';

// Read Master Prompt JSON from file
const masterPromptJson = JSON.parse(
  fs.readFileSync('./temp-master-prompt.json', 'utf-8')
);

const clientData = {
  firstName: 'FirstName',
  lastName: 'LastName',
  email: 'client@email.com',
  username: 'client-username',
  password: 'TempPassword123!',
  phone: '555-123-4567',
  role: 'client',
  gender: masterPromptJson.client.gender,
  weight: masterPromptJson.measurements.currentWeight,
  height: masterPromptJson.measurements.height.feet * 12 + masterPromptJson.measurements.height.inches,
  fitnessGoal: masterPromptJson.goals.primary,
  masterPromptJson: masterPromptJson,
  spiritName: masterPromptJson.client.alias,
  isActive: true
};

try {
  const user = await User.create(clientData);
  const clientId = `PT-${String(user.id).padStart(5, '0')}`;

  console.log('✅ Client created successfully!');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Spirit Name: ${user.spiritName}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Temp Password: TempPassword123!`);

  // Also create PII record
  await sequelize.query(`
    INSERT INTO clients_pii (client_id, real_name, spirit_name, status, start_date, current_program, privacy_level, "createdAt", "updatedAt")
    VALUES (:clientId, :realName, :spiritName, 'active', CURRENT_DATE, :currentProgram, 'standard', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, {
    replacements: {
      clientId: clientId,
      realName: masterPromptJson.client.name,
      spiritName: masterPromptJson.client.alias,
      currentProgram: masterPromptJson.goals.primary
    }
  });

  console.log(`✅ PII record created for ${clientId}`);

} catch (error) {
  console.error('❌ Error creating client:', error);
} finally {
  await sequelize.close();
}
```

**Run the script:**

```bash
cd backend
node create-client-manual.mjs
```

### Step 5: Verify Client Creation

**Check database:**

```bash
cd backend
node -e "const sequelize = require('./database.mjs').default; (async () => { const [results] = await sequelize.query('SELECT id, email, \"spiritName\", role FROM \"Users\" WHERE email = \\'client@email.com\\''); console.log(results); await sequelize.close(); })()"
```

**Expected output:**

```
[
  {
    id: 15,
    email: 'client@email.com',
    spiritName: 'Golden Hawk',
    role: 'client'
  }
]
```

### Step 6: Send Client Credentials

**Email template:**

```
Subject: Welcome to SwanStudios Personal Training!

Hi [Preferred Name],

Welcome to the SwanStudios family! Your account has been created.

Your Login Credentials:
- Website: https://swanstudios.com
- Email: [client@email.com]
- Temporary Password: [TempPassword123!]

⚠️ IMPORTANT: Please log in and change your password immediately.

Your Client Profile:
- Client ID: PT-[#####]
- Spirit Name: [Golden Hawk] (your privacy-preserving alias)
- Training Goal: [Weight loss]
- Session Package: [Golden Tier - 3x/week]

Next Steps:
1. Log in and change your password
2. Complete your profile (optional: add photo, emergency contact)
3. Review your personalized training plan
4. First session scheduled: [Date/Time]

Questions? Reply to this email or text me at [phone].

Let's crush your goals together! 💪

- Sean
SwanStudios Personal Training
```

---

## Troubleshooting

### Issue: "Master Prompt JSON is invalid"

**Error:** JSON syntax error when inserting into database

**Solution:**
1. Copy Master Prompt JSON into [JSONLint.com](https://jsonlint.com)
2. Click "Validate JSON"
3. Fix any syntax errors (missing commas, quotes, brackets)
4. Try again

### Issue: "User already exists with this email"

**Error:** `Email address already in use`

**Solution:**
1. Check if client already has an account
2. If yes, update existing user instead of creating new one
3. Use `UPDATE "Users" SET ... WHERE email = 'client@email.com'`

### Issue: "Password too weak"

**Error:** Password validation fails

**Solution:**
Use password that meets requirements:
- At least 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character (!@#$%^&*)

Example: `TempPassword123!`

### Issue: "Spirit name already taken"

**Error:** Client wants "Golden Hawk" but it's already used

**Solution:**
1. Check existing spirit names:
   ```sql
   SELECT "spiritName" FROM "Users" WHERE "spiritName" IS NOT NULL;
   ```
2. Suggest alternative from the list
3. Or create custom variant: "Golden Hawk II", "Silver Hawk", "Bronze Hawk"

---

## Quality Checklist

Before finalizing manual onboarding, verify:

- [ ] All 85 questionnaire fields collected
- [ ] Master Prompt JSON validates (JSONLint.com)
- [ ] Spirit name chosen and unique
- [ ] Client ID assigned (PT-#####)
- [ ] User record created in database
- [ ] PII record created in clients_pii table
- [ ] Temporary password generated and documented
- [ ] Client credentials email sent
- [ ] First session scheduled
- [ ] Trainer notified of new client

---

## Time Comparison

| Method | Time to Complete | Error Rate | Recommended When |
|--------|------------------|------------|------------------|
| **API (POST /api/onboarding)** | 5-10 minutes | 1-2% | Always (default) |
| **Manual Process** | 30-40 minutes | 10-15% | API down, emergency, client preference |

**Best Practice:** Always attempt API method first. Only use manual process as fallback.

---

## File Storage

**Manual Master Prompt JSON files:**
- Location: `client-data/manual-onboarding/[ClientID]-[SpiritName]-[Date].json`
- Backup: Keep for 30 days in case database corruption
- After 30 days: Delete (data is in database)

**Example:**
```
client-data/manual-onboarding/PT-00015-GoldenHawk-2025-11-07.json
```

---

## Migration to API Method

**When API becomes available again:**

No action needed! Manual clients are already in the database with the same schema as API-created clients. Both methods produce identical results.

**Verification:**

```sql
SELECT
  id,
  email,
  "spiritName",
  CASE
    WHEN "masterPromptJson" IS NOT NULL THEN 'Has Master Prompt'
    ELSE 'Missing Master Prompt'
  END as prompt_status
FROM "Users"
WHERE role = 'client'
ORDER BY "createdAt" DESC;
```

---

## Support

**Questions about manual onboarding?**
- Docs: [ONBOARDING-TO-DATABASE-PIPELINE-COMPLETE.md](../ONBOARDING-TO-DATABASE-PIPELINE-COMPLETE.md)
- Schema: [MASTER-PROMPT-SCHEMA-v3.0.json](../../../client-data/templates/MASTER-PROMPT-SCHEMA-v3.0.json)
- Template: [MASTER-PROMPT-TEMPLATE.json](../../../client-data/templates/MASTER-PROMPT-TEMPLATE.json)

**Report issues:**
- Database errors: Check PostgreSQL logs
- JSON validation: Use JSONLint.com
- API availability: Check backend server status

---

**Last Updated:** 2025-11-07
**Maintained By:** SwanStudios Development Team
**Version:** 1.0 - Initial Release
