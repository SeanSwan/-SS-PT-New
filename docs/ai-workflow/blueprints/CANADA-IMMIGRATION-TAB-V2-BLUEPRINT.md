# Canada Immigration Tab v2.0 — Full Refactor Blueprint

## Source of Truth
`canada-immigration-master-strategy-FINAL.pdf` (16 pages, 8 parts)

## Gap Analysis Summary

### HIGH Priority Gaps (Missing Entirely)
1. **Wife MEd/Spousal OWP Pathway** — Core family strategy absent from UI
2. **Self-Employed Persons Program** — Entire pathway invisible (paused until 2027, 26yr NASM, score 68-80)
3. **Phase 4 (Months 13-24)** — Timeline stops at month 12, no PR pathway
4. **12-Month Scorecard** — No week-by-week/monthly milestone tracker
5. **Family Milestones** — Wife MEd, kids school, grandma Super Visa not tracked

### MEDIUM Priority Gaps (Partial/Missing Context)
6. **PT Market Strategy** — Generic links exist but no neighborhood data (Bridle Path, Westmount, Shaughnessy)
7. **Honest AI Cert Framing** — "0 CRS points" not stated anywhere
8. **Chickasaw 5-Step Process** — Links exist but no strategic guide/visualization
9. **Cost Aggregation** — Individual task costs exist but no phase/total summaries
10. **IELTS/French Point Impact** — "136 CRS points" and "+50 bonus" not prominently shown

### LOW Priority Gaps
11. **API endpoint mismatches** — PATCH vs PUT, `/study-sessions` vs `/study`
12. **Hardcoded milestone dates** — Should use task due_dates

---

## Architecture: 8 Components → 8 Components (Same Structure, Enhanced)

### Component Mapping to PDF Parts

| Component | PDF Parts Covered | Enhancement Level |
|-----------|------------------|-------------------|
| `CanadaImmigrationTab.tsx` | Container (all) | MINOR — add Phase 4 seed, fix API endpoints |
| `ImmigrationDashboard.tsx` | Parts 1-8 overview | MAJOR — add scorecard, cost tracking, family status, 6 pathways |
| `MasterChecklist.tsx` | Parts 1-6 tasks | MAJOR — add wife MEd tasks, self-employed tasks, Phase 4, cost totals |
| `DocumentTracker.tsx` | Parts 1-4 docs | MODERATE — add self-employed docs, wife MEd docs, grandma docs |
| `CRSCalculator.tsx` | Part 3, 5 | MODERATE — add "0 CRS for certs" banner, wife-as-principal toggle, point impact labels |
| `ImmigrationTimeline.tsx` | Part 8 | MAJOR — add Phase 4, 12-month scorecard, family milestones, cost accumulation |
| `StudyPlatform.tsx` | Parts 3, 5 | MAJOR — honest cert framing, cost/time/difficulty table, study progression, IELTS/TEF targets |
| `ResourceHub.tsx` | Parts 1-7 | MAJOR — PT neighborhood profiles, self-employed program, wife MEd info, Jay Treaty table |

---

## Detailed Enhancement Spec Per Component

### 1. ImmigrationDashboard.tsx (Overview)
**Add:**
- **Six Pathways Summary** — Card grid showing all 6 viable routes with status indicator
  1. Express Entry (wife principal + French bonus)
  2. PNP Nomination (+600 points)
  3. Wife Studies in Canada (family pathway) — PRIMARY
  4. Francophone Mobility Work Permit
  5. Self-Employed Persons Program (2027)
  6. Indigenous Mobility (APM SP52)
- **12-Month Scorecard** — Grid showing key milestones by month with check/pending/upcoming status
- **Cost Dashboard** — Total spent, total remaining, by phase, by category
- **Family Status Board** — Sean, Wife, 4 Kids, Grandma status cards
- **CRS Quick View** — Current estimated score with "what gets you to 500+" breakdown
- **Phase 4 inclusion** in phase progress cards

### 2. MasterChecklist.tsx
**Add:**
- **Phase 4 tasks** (months 13-24): PR application, PT market entry, networking, credential equiv
- **Wife MEd tasks**: research programs, apply, acceptance, study permit, enrollment
- **Spousal OWP tasks**: documentation, application, approval
- **Kids tasks**: school research, enrollment, documentation
- **Grandma tasks**: Super Visa application, medical exam, insurance
- **Self-Employed tasks**: document PT business, gather NOAs, business plan, client testimonials
- **Cost totals per phase** in phase progress bars
- **Critical path warnings** for blocking tasks

### 3. DocumentTracker.tsx
**Add new document categories:**
- **Wife MEd Documents**: transcripts, degree ECA, MEd acceptance letter, study permit
- **Spousal OWP Documents**: marriage cert (3 copies), relationship proof, OWP application
- **Kids Documents**: birth certificates, school records, immunization records
- **Grandma Documents**: Super Visa application, medical exam, insurance proof
- **Self-Employed Documents**: NASM cert (26yr), business plan, NOAs (5yr), client contracts, bank statements
- **Cost per document** field

### 4. CRSCalculator.tsx
**Add:**
- **"AI Certifications = 0 CRS Points" banner** — prominent callout at top
- **Point Impact Labels** — "IELTS CLB 9 = up to 136 points", "French NCLC 7 = +50 bonus"
- **Wife-as-Principal toggle** — swap primary/spouse fields for wife-led Express Entry calc
- **Strategy Notes** — inline tips like "French-category draws: cutoff ~379 vs general ~520"
- **Self-Employed Score** — separate section showing 68-80 estimate vs 35 pass mark
- **Recent draw data** — more categories (General, French, STEM, PNP, CEC)

### 5. ImmigrationTimeline.tsx
**Add:**
- **Phase 4** (months 13-24): Build Canadian experience, wife PGWP, PR application
- **12-Month Scorecard View** — toggle between timeline and scorecard grid
- **Family Milestones** — wife MEd start, kids first day, grandma arrival
- **Cost Accumulation Bar** — running total by phase
- **Critical Path Indicators** — red border on blocking tasks
- **"Today" marker** with days-until-next-milestone

### 6. StudyPlatform.tsx
**Add:**
- **Honest AI Cert Framing** — prominent banner: "AI certifications give ZERO direct CRS points"
- **Cost/Time/Difficulty Table** for each cert:
  - IBM GenAI: ~$150, 2-3mo, Beginner
  - Azure AI-102: $165 exam, 3-4mo, Moderate
  - AWS AI Practitioner: $100 exam, 2-4wks, Beginner
  - Google ML: $200 exam, 3-6mo, Advanced (optional)
- **IELTS Target Tracker** — CLB 9 requirements per band with current/target display
- **TEF Target Tracker** — NCLC 7 requirements with study progression (Months 1-3 Duolingo, 4-6 iTalki, 7-12 TEF prep)
- **Study Progression Timeline** — visual schedule of what to study when
- **Total Investment Calculator** — $415-$615 for 3 certs

### 7. ResourceHub.tsx
**Add:**
- **PT Neighborhood Profiles** — 3 city sections with table: neighborhood, avg net worth, home prices, PT opportunity rating
  - Toronto: Bridle Path ($22.7M), York Mills ($21.5M), Forest Hill ($8-10M+)
  - Vancouver: Shaughnessy ($12M), West Vancouver ($9M+), Kerrisdale ($12.8M)
  - Montreal: Westmount ($2.5M-$25M+), Outremont ($2M-$10M+), Mount Royal ($1.5M-$5M+)
- **"Why Montreal?" Section** — cost comparison, French immersion, AI hub, lowest CRS cutoffs
- **Self-Employed Persons Program Section** — status (paused until 2027), your score (68-80), documents needed
- **Wife MEd Programs** — links to McGill, UBC, UofT, Concordia MEd programs
- **Spousal OWP** — IRCC spousal OWP guide
- **Grandma Super Visa** — requirements and links
- **Jay Treaty Comparison Table** — USA recognizes vs Canada evolving
- **Chickasaw 5-Step Guide** — visual process with phone numbers and links
- **Marriage Step-by-Step** — OC Clerk-Recorder steps with costs

---

## Backend Changes

### Seed Data Expansion
Add to `/api/immigration/seed`:
- **Phase 4 tasks** (~15 new tasks)
- **Wife MEd tasks** (~8 new tasks)
- **Self-Employed tasks** (~6 new tasks)
- **Family milestone tasks** (~10 new tasks)
- **New documents** (~15 new documents for wife, kids, grandma, self-employed)

### API Fixes
- Fix `/study` → accept calls to `/study-sessions` (add alias)
- Add cost aggregation to `/dashboard` response

---

## Implementation Order
1. Backend: Expand seed data + fix endpoints
2. ResourceHub: Most content, least logic — good warm-up
3. StudyPlatform: Honest framing + cert table
4. CRSCalculator: Point labels + wife toggle
5. ImmigrationDashboard: Scorecard + pathways + family status
6. MasterChecklist: New tasks + Phase 4 + cost totals
7. DocumentTracker: New document categories
8. ImmigrationTimeline: Phase 4 + scorecard toggle + family milestones

## Design Notes
- Crystalline Swan theme throughout (Midnight Sapphire surfaces, Ice Wing accents, Wing Purple glows)
- 44px minimum touch targets
- Plus Jakarta Sans headings, Sora UI, Fira Code data
- Responsive: 375px → 1920px minimum
