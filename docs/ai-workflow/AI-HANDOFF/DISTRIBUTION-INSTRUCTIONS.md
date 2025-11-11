# 📨 AI Village Review Distribution Instructions

**For Sean**: Copy-paste instructions to distribute review to remaining 4 AIs

**Date**: November 10, 2025
**Target AIs**: Roo Code, MinMax V2, Gemini, ChatGPT-5

---

## 🎯 Quick Summary

**What happened**: styled-components production error persists after multiple fix attempts. You decided to pause debugging and create comprehensive blueprint with AI Village consensus.

**Current Status**: 2/6 votes collected (Claude Code ✅, Kilo Code ✅). Need 4 more votes to reach consensus.

**Action Required**: Distribute review request to remaining 4 AIs and collect their votes.

---

## 📋 Step-by-Step Distribution Process

### Step 1: Copy the Review Request

**File to copy**: `docs/ai-workflow/AI-HANDOFF/AI-VILLAGE-REVIEW-REQUEST.md`

**What it contains**:
- Mission overview
- 5 critical questions requiring votes
- AI-specific review checklists
- Current vote tally
- Submission instructions

### Step 2: Distribute to Each AI

Copy the ENTIRE contents of `AI-VILLAGE-REVIEW-REQUEST.md` and paste it into each AI's chat:

#### For Roo Code (xAI Grok)
**Paste this into Roo Code:**

```
[PASTE ENTIRE AI-VILLAGE-REVIEW-REQUEST.md HERE]

Focus on:
- Backend API alignment with admin dashboard needs
- Database schema for social integration
- WebSocket vs SSE performance trade-offs
- Real-time metrics endpoints design

Submit your votes in ROO-CODE-STATUS.md file format.
```

#### For MinMax V2 (Google Gemini)
**Paste this into MinMax V2:**

```
[PASTE ENTIRE AI-VILLAGE-REVIEW-REQUEST.md HERE]

Focus on:
- UX impact of rebuild vs incremental refactor
- Galaxy-Swan theme migration UX implications
- Social media integration from user perspective
- Multi-AI consensus building

Submit your votes in MINMAX-V2-STATUS.md file format.
```

#### For Gemini (Google Gemini Code Assist)
**Paste this into Gemini:**

```
[PASTE ENTIRE AI-VILLAGE-REVIEW-REQUEST.md HERE]

Focus on:
- React component architecture for admin dashboard
- TypeScript type safety improvements
- Emotion vs styled-components migration
- Frontend testing approach

Submit your votes in GEMINI-STATUS.md file format.
```

#### For ChatGPT-5 (OpenAI)
**Paste this into ChatGPT-5:**

```
[PASTE ENTIRE AI-VILLAGE-REVIEW-REQUEST.md HERE]

Focus on:
- Testing strategy for incremental refactor
- Edge case detection for admin workflows
- Quality gates for each phase
- Production monitoring and error tracking

Submit your votes in CHATGPT-STATUS.md file format.
```

### Step 3: Collect Votes

Each AI should respond with their votes in this format:

```markdown
## Admin Dashboard Blueprint Review (Nov 10, 2025)

### My Votes
- Q1 (Styling): **[A/B/C]** - [Reasoning]
- Q2 (Rebuild vs Incremental): **[A/B]** - [Reasoning]
- Q3 (Social Integration): **[A/B/C]** - [Reasoning]
- Q4 (Real-time): **[A/B/C]** - [Reasoning]
- Q5 (Testing Coverage): **[A/B/C]** - [Reasoning]

### Key Concerns
[Any concerns not covered by questions]

### Recommendations
[AI-specific recommendations]

**Status**: ✅ REVIEW COMPLETE
```

### Step 4: Return Results to Claude Code

Once you have all 4 votes, paste them back into Claude Code with:

```
I have the AI Village votes:

[Roo Code's votes]
[MinMax V2's votes]
[Gemini's votes]
[ChatGPT-5's votes]

Please tally the results and update the consolidated review.
```

---

## 🗳️ Current Vote Tally (2/6)

| Question | Claude Code | Kilo Code | Roo Code | MinMax V2 | Gemini | ChatGPT-5 | Consensus |
|----------|-------------|-----------|----------|-----------|--------|-----------|-----------|
| **Q1: Styling** | A | A | ? | ? | ? | ? | Need 2 more for 4/6 |
| **Q2: Rebuild vs Incremental** | B | B | ? | ? | ? | ? | Need 2 more for 4/6 |
| **Q3: Social Integration** | B | B | ? | ? | ? | ? | Need 2 more for 4/6 |
| **Q4: Real-time** | A | A | ? | ? | ? | ? | Need 2 more for 4/6 |
| **Q5: Testing Coverage** | B | B | ? | ? | ? | ? | Need 2 more for 4/6 |

**Consensus Threshold**: 4/6 votes (66%) required to proceed

---

## 📚 Required Reading for AIs

**Primary Document** (MUST READ):
- `docs/ai-workflow/AI-VILLAGE-CONSOLIDATED-DASHBOARD-REVIEW.md`

**Secondary Documents** (Reference):
- `docs/ai-workflow/AI-VILLAGE-ADMIN-DASHBOARD-REBUILD-MASTER-PROMPT.md`
- `AI-Village-Documentation/AI-VILLAGE-MASTER-ONBOARDING-PROMPT-V2.md`

**Context Files** (Optional):
- `frontend/vite.config.ts` (production error fix attempts)
- `frontend/src/components/DashBoard/UnifiedAdminDashboardLayout.tsx` (895 lines, needs refactor)
- `frontend/src/context/ThemeContext/UniversalThemeContext.tsx` (Galaxy-Swan theme)

---

## ⏰ Timeline

**Target Completion**: November 12, 2025 (2 days from now)

**Why Urgent**: Production blocker - admin dashboard inaccessible at https://sswanstudios.com

**What Happens After Consensus**:
1. Claude Code tallies votes
2. Update consolidated review with final decisions
3. Begin Week 1 implementation (fix production blocker)
4. Deploy behind feature flag with canary rollout

---

## 🆘 If You Get Stuck

**If an AI asks clarifying questions**:
- Direct them to read the consolidated review first
- If still unclear, bring questions back to Claude Code

**If an AI refuses to vote**:
- Ask them to provide alternative options
- Explain this is a production blocker requiring timely decision

**If votes are split 3-3**:
- Claude Code will call for discussion session
- May require tie-breaker or hybrid approach

---

## ✅ Success Criteria

**AI Village consensus reached when**:
- All 6 AIs have submitted votes ✅
- At least 4/6 agreement on each question (66% threshold) ✅
- Critical concerns documented and addressed ✅
- Implementation roadmap approved ✅

**Then we proceed to**:
- Week 1: Fix production blocker (styled-components or Emotion)
- Week 2-4: Incremental refactor with approved architecture
- Week 5+: Social integration based on consensus

---

## 📝 Quick Copy-Paste for You

**Message to send to each AI**:

```
Hi [AI Name],

We have a critical production error blocking admin dashboard access. I've paused debugging to create a comprehensive blueprint with AI Village consensus.

Claude Code and Kilo Code have already voted. I need your review and votes on 5 critical questions.

Please read the review request below and submit your votes.

[PASTE AI-VILLAGE-REVIEW-REQUEST.md CONTENTS HERE]

Thank you!
```

---

## 🎯 Expected Outcome

**Best Case** (Likely):
- Strong consensus on all 5 questions (5/6 or 6/6 votes)
- Minor disagreements addressed through hybrid approaches
- Implementation begins within 24 hours of consensus

**Neutral Case**:
- Mixed votes (4/6 consensus threshold met)
- Some questions require discussion or clarification
- Implementation begins within 48 hours

**Worst Case** (Unlikely):
- No consensus reached (3-3 split or worse)
- Requires AI Village discussion session
- Implementation delayed 3-5 days for alignment

---

**Ready to distribute! 🚀**

Copy the review request file and send to all 4 remaining AIs.
