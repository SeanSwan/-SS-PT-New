# Karpathy LLM Wiki — Operations & Upgrade Playbook
> **Your wiki location:** `/home/kali/swanstudios-wiki/` (on Pi)
> **Created:** 2026-04-17 | **Maintained by:** Hermes (Gemini 3 Flash) + Sean (curator)
> **Pattern:** Karpathy's LLM Wiki v2 — compound knowledge that never starts from scratch
> **Sources:** Karpathy's original gist + April 2026 community best practices

---

## What Hermes Nailed in Setup

When Sean told Hermes about the wiki, Hermes auto-committed to:
- ✓ **Immutability rule** — reads raw/ but never modifies
- ✓ **Synthesis to wiki/** — all long-term memory writes go there
- ✓ **Cross-linking mandate** — every page has 2+ inbound/outbound `[[wikilinks]]`
- ✓ **Audit trail** — updates `index.md` + `log.md` in real-time
- ✓ **First seed entities** — `[[hermes]]`, `[[sean-swan]]`, `[[<OPERATOR>-pc]]`, `[[gemma-4-benchmarks]]`

This is an excellent foundation. Now let's upgrade it to production-grade.

---

## The 3 Core Operations (Karpathy v2)

Every action against the wiki falls into one of three modes:

### 1. INGEST
Sean drops raw material into `raw/<topic>/`. Hermes compiles it — creates/updates wiki pages, extracts concepts, builds backlinks, flags contradictions.

### 2. QUERY
Sean asks Hermes a question. Hermes searches wiki first, answers with citations, then **files the answer back into the wiki** (the compounding loop).

### 3. LINT
Weekly health check. Hermes scans for:
- Orphaned pages (no inbound links)
- Broken wikilinks (pointing to non-existent pages)
- Stale content (not verified in N days)
- Contradictions between pages
- Missing pages (concepts referenced but not yet written)
- Dead source refs (raw/ file deleted but still cited)

Run: `lint` (structural) or `lint --deep` (content contradictions).

---

## TIER 1 — Critical Upgrades (Do This Session)

### Upgrade 1.1: YAML Frontmatter On Every Wiki Page

Every page should start with structured metadata. This gives Hermes quick signals about relevance without reading the full body, and powers the lint + confidence system.

```yaml
---
title: Periodization
type: concept                    # concept | entity | source | comparison | playbook | client
confidence: 0.85                 # 0.0-1.0 — how confident Hermes is
sources:
  - raw/training/nasm-opt-manual-ch3.md
  - raw/training/sean-methodology-notes.md
last_ingested: 2026-04-17
last_verified: 2026-04-17
stale_after_days: 90
tags: [training, nasm, program-design]
backlinks_in: [[[swan-coach]], [[nasm-opt]], [[golf-client-program-generation]]]
backlinks_out: [[[progressive-overload]], [[5-phase-opt]]]
contradictions: none
---
```

**Required for all new pages. Hermes should retrofit existing pages over time.**

### Upgrade 1.2: Templates Folder

Create `~/swanstudios-wiki/wiki/_templates/` with files that define the standard format for each page type:

- `_templates/concept-template.md` — for abstract ideas (periodization, dual-button-glow, dr-sebi-principles)
- `_templates/entity-template.md` — for specific named things (sean-swan, swanstudios-app, swan-coach agent)
- `_templates/source-template.md` — for summaries of raw/ docs (NASM manual, research paper)
- `_templates/comparison-template.md` — for head-to-heads (opus-4.7-vs-gemini-3-flash, gemma-4-vs-qwen3)
- `_templates/playbook-template.md` — for repeatable processes (new-client-onboarding, cve-patch-flow)
- `_templates/client-template.md` — for per-client profiles (IDs only, zero PII)

Every new page copied from the right template → consistency at scale.

### Upgrade 1.3: Extended SCHEMA.md

Your current SCHEMA.md is empty. Here's what it should contain:

```markdown
# SwanStudios Wiki Schema

## Rules

### Immutability
- raw/ is read-only. Hermes reads, never writes.
- wiki/ is write-only for Hermes. Sean curates/reviews but Hermes owns updates.
- inbox/ is for speculative drafts. Promote to wiki/ after Sean reviews.

### Naming
- All files: kebab-case (e.g. `progressive-overload.md`, not `Progressive Overload.md`)
- Folders: lowercase, singular unless collection (e.g. `concepts/`, `entities/`, `clients/`)
- Client profiles: `client-<id>.md` (ID only, NEVER name)

### Required on every page
- YAML frontmatter (title, type, confidence, sources, last_ingested, tags)
- Summary line at top (one sentence)
- 2+ inbound or outbound wikilinks
- Citation of every source raw/ file

### Privacy (HARD RULES)
- ZERO PII in wiki/. Use client IDs only.
- Family roles: `spouse`, `child-A`, `child-B`, `child-C`, `child-D` (no per-child IDs that encode age or birth order)
- Real names, addresses, phones, emails: NEVER in wiki/ anywhere.
- SSN, financial account numbers: NEVER anywhere in the system.
- Medical specifics: Use anonymized patterns ("client with rotator cuff history") not identifying details.

### Confidence Scoring
- 1.0 = verified by multiple primary sources, recent, no contradictions
- 0.7-0.9 = strong single source, relevant, fresh
- 0.4-0.6 = anecdotal, needs corroboration
- 0.1-0.3 = speculative, flag for review
- Below 0.3 = do not use for recommendations, needs verification

### Staleness
- Default stale_after_days: 90
- Time-sensitive (legal, medical, financial): 30
- Historical/reference: 365
- Never expires (constants, laws of physics): set explicitly to null

### Linking
- Every new wiki page must create or strengthen at least 2 [[wikilinks]]
- Orphaned pages (no inbound links) flagged by weekly lint
- Broken links fixed automatically if target exists, or flagged for Sean if target missing

### Templates
- New pages must follow the template for their type (wiki/_templates/*)
- Never write a wiki page from scratch without a template

### Commit Discipline
- Hermes commits to git after every wiki write
- Commit messages: "wiki: <action> <page-name> (<type>)"
- Example: "wiki: update periodization (concept) - added golf-specific notes"

### Lint Cadence
- Daily: orphan check, broken link check
- Weekly: full lint + stale page review
- Monthly: contradiction deep-scan (lint --deep)
- Quarterly: confidence rescoring based on accumulated corroboration
```

### Upgrade 1.4: Add `inbox/` and `_templates/` Folders

```bash
cd ~/swanstudios-wiki
mkdir -p wiki/_templates wiki/inbox
touch wiki/_templates/{concept,entity,source,comparison,playbook,client}-template.md
git add -A && git commit -m "wiki: add templates folder and inbox staging area"
```

### Upgrade 1.5: Separate Curated From Speculative

- **wiki/** — Hermes's compiled knowledge (gets committed, trusted)
- **wiki/inbox/** — staging area for speculative drafts, new ingests not yet promoted
- **Promotion ritual:** Sean reviews inbox weekly, either promotes to wiki/ or discards

This prevents the wiki from getting polluted with half-baked ideas while still letting Hermes capture things quickly.

---

## TIER 2 — Content Seeding (Do This Weekend)

Your wiki is empty. Its value scales with what you feed it. Priority dumps:

### Training Knowledge (raw/training/)
- Your NASM CPT materials (PDFs, notes)
- Your NCEP cert materials
- The 736-exercise database export (CSV or JSON from SwanStudios DB)
- Your personal programming philosophy/methodology notes
- Bootcamp class formats you've used
- Golf-specific training research
- 25+ years of client experience patterns (anonymized)

### Nutrition Knowledge (raw/nutrition/)
- Meal plan templates
- Supplement research (AG1, creatine, magnesium research papers)
- Dr. Sebi recipe principles + alkaline food list
- Barcode data samples
- IARC Group 1 ingredient flags
- EU-banned ingredient list

### Business/Marketing (raw/business/)
- SwanStudios pricing model + package structure
- Marketing research you've accumulated
- Competitor analysis notes
- Revenue targets + unit economics
- SEO keyword research

### Family Safety (raw/family-safety/)
- Sundown towns reference (Loewen dataset export)
- Mapping Police Violence data (regional, location specifics held local-only)
- ICE ERO field office activity (regional, location specifics held local-only)
- SPLC hate map (regional, location specifics held local-only)
- NextDNS / VPN configs
- Safe travel routes you've mapped

### Immigration (raw/immigration/)
- Canada IRCC policy snapshots
- 2027 Native American border crossing law text
- Chickasaw Nation enrollment process
- Express Entry scoring criteria
- IELTS/TEF study materials
- Spouse's documentation checklist

### Kids (raw/kids/)
- Pediatric developmental milestones
- Vaccine schedules
- Age-appropriate tech stacks
- Nutrition for growth
- School district data for <home-ZIP>

### Coding/SwanStudios (raw/coding/)
- Your CLAUDE.md + ACTIVE-INDEX.md
- Key reference docs from docs/ai-workflow/references/
- Architecture decisions (why Victory, why styled-components, etc.)
- Bug fix patterns from git history

### AI Tools (raw/ai-tools/)
- This operations doc itself
- V4 master plan
- AI Village outputs
- Hermes docs
- Model comparison notes

**Dump strategy:** Add 3-5 topic directories per week. Let Hermes compile. Review. Repeat. Do NOT dump everything at once — Hermes needs time to synthesize properly and you need time to review.

---

## TIER 3 — Seed Entities (Do This Weekend — Telegram Prompts)

Your wiki has 4 entities. Here are entities Hermes should create immediately. Copy each block into Telegram to the bot:

### Family + Personal
```
Create wiki entity pages for:
1. [[spouse]] - spouse, principal Canada immigration applicant, Chickasaw Nation access through marriage to me
2. [[child-A]] - child, pediatric care priority
3. [[child-B]] - child, nutrition priority
4. [[child-C]] - child
5. [[child-D]] - child, career + independence support
6. [[chickasaw-heritage]] - concept: my tribal lineage, relevant to 2027-native-american-border-law, CDIB process, Chickasaw Nation services
7. [[2027-native-american-border-law]] - concept: upcoming law allowing tribal members to cross US-Canada border, implementation tracking, document prep

Follow the entity-template. Frontmatter with type=entity (or concept), confidence, tags=[family, personal]. Zero PII — use role labels only, no names, no ages, no per-child IDs that encode birth order.
```

### SwanStudios Product + Business
```
Create wiki entities:
1. [[swanstudios-app]] - my production fitness SaaS, stack: React + Node + PostgreSQL + Render, 100+ models, 166 routes, 840+ exercises, Victory charts, Crystalline Swan theme
2. [[move-fitness]] - my current employer, separate from SwanStudios, their clients use SS free for progress tracking (not poached)
3. [[crystalline-swan-palette]] - concept: the active design system, Midnight Sapphire #002060, Arctic Cyan #50A0F0, Wing Purple #8B5CF6, Gilded Fern #C6A84B (retired Galaxy-Swan #0a0a1a)
4. [[dual-button-glow]] - concept: SwanStudios design rule — blue bg = purple glow, purple bg = cyan glow
5. [[nasm-opt]] - concept: NASM Optimum Performance Training 5-phase model I use for programming
6. [[golf-client-program-generation]] - playbook: my golf-specific hypertrophy + stability program framework for high-net-worth clients

Tags as appropriate. Cross-link where relevant.
```

### Hermes Stack
```
Create wiki entities for the full AI stack:
1. [[swan-coach]] through [[swan-life]] - all 13 agents from V4 master plan (swan-coach, swan-content, swan-marketer, swan-platform, swan-ops, swan-sentinel, swan-healer, swan-nutrition, swan-dev, swan-scholar, swan-hunter, swan-justice, swan-life)
2. [[gemma-4]] - Google's April 2026 open model, my primary Phase B local inference brain
3. [[ollama]] - local runtime for LLMs, how I run Gemma 4 on the 4080 PC
4. [[claude-opus-4-7]] - top cloud model, accessed via OpenRouter, used for escalated coding
5. [[codex-5-4]] - OpenAI's coding model via OpenRouter, used for heavy SwanStudios refactors
6. [[karpathy-wiki]] - THIS system, persistent knowledge pattern
7. [[v4-master-plan]] - reference to docs/ai-workflow/AI-HANDOFF/HERMES-V4-FINAL-BLUEPRINT-2026-04-16.md — 3-phase architecture

Cross-link aggressively. Each agent entity should link to what it does, what models it uses, and what wiki sections it reads.
```

### Location + Safety Context
```
Create wiki entities:
1. [[home-zip]] - <home-ZIP>, <home-county>, proximity analysis for doctors/dentists/schools/safe travel (specifics held local-only, never written into any cloud-synced layer)
2. [[mixed-race-family-safety-framework]] - playbook: our household safety protocol, public-data sources for travel risk scoring, use with [[swan-sentinel]] family safety mapping
3. [[privacy-first-architecture]] - concept: why local Ollama + encrypted wiki + WireGuard, our V4 privacy posture
```

---

## TIER 4 — Ongoing Operations

### Daily (automated via cron)
- Hermes auto-commits every wiki change
- New raw/ files get inbox/ drafts created
- Orphan check runs, flags for Sean if >2 new orphans

### Weekly (Sunday AI Hermes cron)
- Full `lint` runs
- Stale page review — anything past `stale_after_days` gets flagged
- `index.md` regenerated with latest structure
- Weekly digest to Sean via Telegram: "wiki grew by N pages, M contradictions flagged, P stale pages"

### Monthly (Sunday of month 1)
- `lint --deep` runs (expensive, finds contradictions)
- Confidence rescoring based on accumulated sources
- Archive of any pages marked `archived: true` moved to wiki/_archive/
- Git push to remote (Cloudflare R2 or private GitHub repo for offsite backup)

### Quarterly
- Sean does a tour — browse via Obsidian graph view, verify quality
- Schema review: any new rules to add based on what you've learned?
- Template review: new page types needed?

---

## TIER 5 — Visual Browsing with Obsidian (Recommended)

Your wiki is Markdown — Obsidian can render it with graph view, backlinks panel, tag explorer, all the good stuff.

### Setup (Windows PC)
1. Download **Obsidian** (free) from [obsidian.md](https://obsidian.md)
2. Mount the Pi's wiki directory on Windows:
   - Option A: SSHFS — `sshfs kali@<PI-LAN-IP>:/home/kali/swanstudios-wiki Z:\wiki` (needs sshfs-win)
   - Option B: Router Samba share — nightly sync wiki → router USB drive → open that folder in Obsidian
   - Option C: Manual git pull — `git clone kali@<PI-LAN-IP>:/home/kali/swanstudios-wiki` to a Windows folder, refresh periodically
3. In Obsidian: "Open vault" → point to the mounted wiki folder
4. Enable Graph View (visualization of links), Backlinks panel, Tags panel

### Mobile Obsidian
- **Obsidian Sync** ($8/mo) — official, syncs across devices
- **FREE alternative**: Sync with Cloudflare R2 or Syncthing — your wiki on phone, always current
- Obsidian iOS app is the best mobile reader for Markdown-based wikis

### Graph View Benefits
- See the shape of your knowledge
- Instantly spot orphans (nodes with no edges)
- Spot over-connected hubs (possibly too much concentration)
- Walk from one idea to related ideas visually
- Lex Fridman uses this for podcast prep

---

## TIER 6 — Advanced Patterns (Later)

### Pattern: Personal Podcast Generation
Tell Hermes: "Generate a Lex Fridman-style 30-minute personal podcast on `[[periodization]]`, loading into voice mode for my run."

Hermes:
1. Pulls everything linked to `[[periodization]]` from wiki
2. Synthesizes into conversation format
3. Generates audio via Gemini TTS
4. Sends MP3 via Telegram
5. You listen on a run, come back with follow-up questions

### Pattern: Gist Sharing (Karpathy Style)
Once your wiki has real depth (3-6 months out), you can export subsets as shareable "gists":
- "Sean's Golf Hypertrophy Methodology (v1)" — a 10-article pack
- "SwanStudios Gamification Architecture" — technical reference
- Other trainers import it, build on top, credit you
- Positions you as thought leader, drives SwanStudios platform growth

### Pattern: Per-Client Compounding Knowledge
Each real client you train gets a `client-<id>.md` in wiki/clients/ (ID only, zero PII):
- Program history, PRs, injuries, preferences
- What works for THIS client specifically
- After 1 year of sessions → hyper-personalized knowledge base per client
- When you scale to 30-50 clients, this is your competitive moat

### Pattern: Wiki-Driven Content Studio
Your YouTube scripts / blog posts / social content auto-pull from wiki:
- Swan Content agent: "Write a YouTube script on seniors and core training"
- Pulls from `[[core-training]]`, `[[senior-populations]]`, `[[nasm-opt-stabilization-phase]]`
- Drafts with citations from the wiki
- You edit, publish — your content is evidence-based by default

---

## TIER 7 — Phase B Integration (Next Weekend)

When Ollama is running on the 4080:

### Wiki Sensitive Agents Run Local-Only
- Swan Healer writes to `wiki/concepts/health/*` via Gemma 4 31B Dense on 4080 → NEVER cloud
- Swan Justice writes to `wiki/concepts/legal/*` via Gemma 4 31B Dense on 4080 → NEVER cloud
- Swan Life writes to `wiki/entities/family/*` + `wiki/raw/family-safety/*` → NEVER cloud
- Privacy: your family's medical/legal/safety data stays 100% on your hardware

### Cloud Agents Still Read Wiki
- Even agents routing to Opus 4.7 via OpenRouter can READ the local wiki for context
- They just don't WRITE the sensitive categories
- Tight boundary: wiki is the shared knowledge layer, but write permissions enforce privacy

---

## Immediate Next Steps (Copy-Paste These Prompts to Hermes)

### Step 1: Upgrade SCHEMA.md
```
Update /home/kali/swanstudios-wiki/SCHEMA.md with the full production schema I'm about to give you. Write the rules for immutability, naming, YAML frontmatter requirements, privacy (ZERO PII, use client IDs only), confidence scoring (0.0-1.0 scale with meaning), staleness defaults (90 days general, 30 days for legal/medical/financial), linking (2+ wikilinks mandatory), template requirements, commit discipline, and lint cadence (daily/weekly/monthly/quarterly). Use the exact content from docs/ai-workflow/references/KARPATHY-WIKI-OPERATIONS.md Upgrade 1.3.
```

### Step 2: Create Templates
```
Create the six template files in ~/swanstudios-wiki/wiki/_templates/: concept-template.md, entity-template.md, source-template.md, comparison-template.md, playbook-template.md, client-template.md. Each template should have the standard YAML frontmatter at the top with placeholders, a Summary section, a Body section with appropriate subsections for that page type, a Sources section, and a Cross-references section. Commit to git with message "wiki: add 6 page type templates".
```

### Step 3: Add YAML Frontmatter To Existing Pages
```
Retrofit the wiki pages you've already created ([[hermes]], [[sean-swan]], [[<OPERATOR>-pc]], [[gemma-4-benchmarks]]) with the proper YAML frontmatter per the new SCHEMA.md. Set confidence, last_ingested, tags, type, and backlinks correctly. Commit with message "wiki: retrofit frontmatter on initial entities".
```

### Step 4: Seed The Critical Entities
Paste the three big entity-creation blocks from TIER 3 above. Hermes creates them over the next 5-15 min.

### Step 5: First Lint
```
Run a structural lint on the wiki now. Find orphaned pages, broken wikilinks, missing backlinks, and any pages that don't conform to SCHEMA.md. Report what you found and propose fixes.
```

---

## Sources

- [Karpathy's original LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- [LLM Wiki v2 extensions by rohitg00](https://gist.github.com/rohitg00/2067ab416f7bbe447c1977edaaa681e2)
- [Complete Guide to Karpathy's LLM Wiki Workflow](https://proudfrog.com/en/insights/karpathy-llm-wiki-complete-workflow-guide)
- [MindStudio — Personal Knowledge Base with Claude Code](https://www.mindstudio.ai/blog/andrej-karpathy-llm-knowledge-base-claude-code)
- [Level Up Coding — Beyond RAG](https://levelup.gitconnected.com/beyond-rag-how-andrej-karpathys-llm-wiki-pattern-builds-knowledge-that-actually-compounds-31a08528665e)
- [Obsidian + Karpathy Wiki integration](https://anthemcreation.com/en/artificial-intelligence/karpathy-llm-wiki-claude-obsidian/)
- [AIMaker — Second Brain in Obsidian](https://aimaker.substack.com/p/llm-wiki-obsidian-knowledge-base-andrej-karphaty)
- [GitHub — Obsidian LLM Wiki Local (Ollama)](https://github.com/kytmanov/obsidian-llm-wiki-local)
- [Karpathy Wiki v2 patterns in production](https://aaronfulkerson.com/2026/04/12/karpathys-pattern-for-an-llm-wiki-in-production/)

---

## Change Log

- 2026-04-17: Document created. Tier 1 upgrades pending Sean's Telegram prompts to Hermes.
