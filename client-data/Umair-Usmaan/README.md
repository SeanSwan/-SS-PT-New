# Client: [CLIENT NAME]

**Tier:** [Silver/Golden/Rhodium]
**Start Date:** [YYYY-MM-DD]
**Status:** [Active/Paused/Completed]

---

## 📋 Quick Info

**Contact:**
- Email: [client email]
- Phone: [client phone]
- Preferred Contact: [SMS/Email/Call]

**Training Schedule:**
- Days: [Mon/Wed/Fri or specify]
- Time: [Morning/Afternoon/Evening]
- Location: [Gym name or "Home"]

**Current Stats (as of [date]):**
- Weight: [lbs]
- Body Fat %: [if available]
- Primary Goal: [from questionnaire]

---

## 📁 Folder Structure

```
[client-name-tier]/
├── README.md                  ← YOU ARE HERE (client overview)
├── questionnaire.md           ← Completed 85-question onboarding form
├── master-prompt.json         ← AI training configuration for this client
├── progress/
│   ├── week-01.md            ← Weekly check-ins
│   ├── week-02.md
│   └── ...
├── workouts/
│   ├── 2025-11-05-workout.md ← Individual workout plans
│   └── ...
├── nutrition/
│   ├── meal-plan-week-1.md   ← Meal plans
│   ├── macro-targets.md      ← Macros and targets
│   └── ...
├── photos/
│   ├── 2025-11-05-front.jpg  ← Progress photos (front, side, back)
│   └── ...
└── notes/
    ├── training-notes.md      ← Training observations
    ├── red-flags.md           ← Health concerns, injuries
    └── ...
```

---

## 🎯 Client Goals

**Primary Goal:** [From questionnaire Q1]
**Secondary Goals:** [From questionnaire Q2]
**Timeline:** [From questionnaire Q3]

**Why This Matters to Them:** [From questionnaire - motivation section]

---

## ⚠️ Important Notes

### Medical/Health Concerns:
- [List any injuries, conditions, medications from questionnaire]
- [Note: Always reference questionnaire.md Section 2 before programming]

### Training Restrictions:
- [Any exercises to avoid]
- [Movement limitations]
- [Equipment preferences/restrictions]

### Preferences:
- Preferred training style: [e.g., strength, HIIT, bodybuilding]
- Dislikes: [exercises they hate]
- Music preference: [if relevant]

---

## 📊 Progress Summary

### Week 1:
- Workouts completed: [X/Y]
- Weight: [lbs]
- Notes: [brief summary]

### Week 2:
- Workouts completed: [X/Y]
- Weight: [lbs]
- Notes: [brief summary]

[Continue for each week...]

---

## 🔄 Recent Updates

**[Date]:** [What changed - e.g., adjusted macros, new workout split, injury recovery protocol]

---

## 📞 Communication Log

**[Date]:** [SMS/Call/Email] - [Brief summary of conversation]
**[Date]:** [SMS/Call/Email] - [Brief summary of conversation]

---

## 💡 AI Training Tips

**When generating workouts for this client:**
1. Always reference `questionnaire.md` first
2. Use `master-prompt.json` for AI configuration
3. Check `notes/red-flags.md` for current injuries/concerns
4. Review last week's progress in `progress/` folder
5. Adjust intensity based on recovery and compliance

**Paste into AI:**
```
I need a workout for [CLIENT NAME]. Here's their info:
[Paste relevant sections from questionnaire.md and latest progress/week-XX.md]
```

---

## 📚 Quick Links

- [Questionnaire](questionnaire.md) - All client data
- [Master Prompt JSON](master-prompt.json) - AI configuration
- [Latest Progress](progress/) - Weekly tracking
- [Red Flags](notes/red-flags.md) - Health concerns

---

**Last Updated:** [Date]
**Next Check-in:** [Date]
