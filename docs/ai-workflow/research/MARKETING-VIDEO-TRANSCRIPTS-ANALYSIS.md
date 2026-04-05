# Marketing Video Transcript Analysis — Compiled Research

> **Date:** 2026-04-05 | **Source:** 4 YouTube videos (2 full transcripts, 2 detailed summaries)
> **Purpose:** Foundation for SwanStudios Marketing Dashboard + Swan Coach upgrade

---

## Video 1: "Build Your Full AI Marketing Team" (FULL TRANSCRIPT)

### 4-Step Framework
1. **Map marketing functions** — list every marketing task done weekly
2. **Turn each repeatable into a Skill** — one skill per workflow
3. **Group skills into non-overlapping Agent roles** — dedicated, focused agents produce better work
4. **Connect agents + skills as a team** — CLAUDE.md routes tasks to correct agent

### The 5 Agents + 12 Skills Architecture
**Example brand:** Go Travel (travel brand)

**Folder Structure:**
```
brand/
  marketing/
    context/        ← Brand voice, style guide, product offerings, strategy (REUSABLE)
    templates/      ← Deck templates, social creative library, SOPs (REUSABLE)
    sops/           ← Standard operating procedures (REUSABLE)
    ads/            ← Working output folder
    pages/          ← Working output folder
    presentations/  ← Working output folder
  sales/
  ops/
```

**Key insight:** Context folder is CRITICAL — brand voice guide, style guide, product offerings, marketing strategy. Agents are pre-equipped with brand knowledge.

### Skill Building Methods

**Method 1: Reference-Based (Branded Deck)**
- Give Claude existing templates + detailed analysis of how template works
- Claude studies patterns → creates skill that follows exact brand style
- Result: 90% done branded presentations with correct style/tone
- Can have multiple templates: strategy deck, client reporting, product launch

**Method 2: MCP-Connected (Social Creative Designer)**
- Set up creative style library (templates/social-creatives/ with branded examples)
- Style guide tells Claude what styles are available and when to use each
- Connect MCP tool (Nano Banana for image gen via Gemini API)
- .mcp.json in project root defines external tool connections
- Skill generates carousels and social creatives following brand vibe (not exact copy)

### The 5 Agents
1. **Data Analyst** — thinks in numbers, charts, patterns. Uses campaign report + data visualization skills
2. **Content Creator** — thinks in stories, headlines. Uses blog writer, keyword research, lead magnet, social content skills
3. **Market Researcher** — competitive analysis, trend identification, audience research
4. **Creative Designer** — visual content, carousels, ad creatives
5. **Campaign Strategist** — synthesizes research into briefs, coordinates cross-agent work

### Agent Routing in CLAUDE.md
- Add explicit rules for WHEN to delegate to agent vs use skill directly
- Complex synthesis tasks → use agent (research, campaign brief)
- Straightforward execution → skill only (content creation, design)
- Claude decides based on CLAUDE.md rules

### Team Orchestration Example
Complex task: "Launch Japan Cherry Blossom campaign — full marketing package"
- Claude decides which steps need agents vs skills
- Calls research tool → campaign brief → image generation → landing page
- ~10 minutes for all deliverables
- All deliverables connected to same campaign theme
- Research → Brief → Social Posts → Creatives → Landing Page

### Notion Task Board Integration
- Kanban board for team collaboration
- AI agents scan pending tasks by priority
- Execute tasks, move to "complete", include output file paths
- Human teammates can drop tasks, AI picks them up

### Remote Control
- Claude Code connects mobile device to local session
- Send tasks from phone anywhere
- `/remote-control` slash command activates
- Everything syncs to local session
- Clear conversation to reset context when full

---

## Video 2: "How Claude Code Ranked Me FIRST on Google" (FULL TRANSCRIPT — partial)

### The Business Case
- Partner with "boring" local businesses (diesel mechanic, HVAC, etc.)
- Competition is unsophisticated — websites 10-15 years old
- AI-savvy person + domain expert operator = powerful combo
- Revenue within 24 hours of SEO optimization

### Keyword Research (Simplified "Vibe Marketing")
- Don't overcomplicate: ask AI for "25-50 keywords" for your business
- DON'T need: volume tools, competition analysis, keyword metrics
- Just ask: "Here's my website, here's what I do, give me keywords"
- Categorize by intent: emergency, service, problem, local
- Focus on HIGH-INTENT (ready to call/pay) not informational

### SEO = Demand + Supply
- **Demand** = what people search for (keywords)
- **Supply** = landing pages on your website
- Build dedicated pages for EACH keyword/service/location combination
- This is where Claude Code shines — can build 50+ pages in hours

### Technical SEO Audit Process
1. Ask Claude Code: "Go through this website in EXTREME detail. Ultra think about this."
2. Uses Opus-level deep thinking for thorough audit
3. Finds: missing sitemaps, robots.txt, schema markup, slow pages, meta issues
4. Then: "Fix them" — Claude goes into codebase and fixes everything
5. Process that takes agencies weeks → done in minutes

### Content Strategy (Deep, Not Generic)
- Location pages with LOCAL CONTEXT (landmarks, industry references, FAQs)
- Example: Charlotte page references NASCAR shipping activity relevant to trucking
- Service pages with common problems, FAQs, industry-specific issues
- Go DEEPER than competitors — they're using generic pages from 2010

### Sub-Agents for Parallel SEO Work
- While working in main chat, launch 3+ agents:
  - Agent 1: Find missing alt text
  - Agent 2: Analyze competitor sites
  - Agent 3: Audit meta descriptions
- Agents work in background, provide recommendations

### Technical Optimizations
- Compressed images, converted to WebP
- Page speed: achieved 100/100 on Google PageSpeed Insights (desktop)
- Google Business Profile consistency check
- Internal linking structure (Claude discovered and built automatically)

### Results
- Top 3 for "mobile diesel mechanic Charlotte" within 24 hours
- Appeared in Google Maps immediately
- Phone blowing up — mechanic fully booked for days
- Thousands of dollars revenue from a 4-hour weekend build

### Key Quote
"The biggest gap with AI is people don't know the questions to ask. That's where vertical expertise comes in. Simply knowing the questions is so clutch."

### LLM/GEO Strategy
- Good SEO = show up in LLMs too (ChatGPT, Perplexity)
- No unique GEO strategy different from good foundational SEO
- Technical foundation + meta tags + topical authority + backlinks + reviews
- LLMs pull from top SEO results as source material

### Design Integration
- Professional Figma designs (not vibe-coded look)
- Anima plugin converts Figma → React components
- Claude Code assembles components, gets 95% of the way
- Final manual polish for premium feel
- "Design differentiates AI-built from cookie-cutter"

---

## Video 3: "Claude Code SEO to Rank #1 in 24 Hours" (FULL TRANSCRIPT)

### The Proof
- Real company getting 16,000+ organic traffic
- Traffic value: ~$1,600/mo (what they'd pay for ads)
- 100% organic — using this exact strategy
- Top ranking pages are ALL SEO-optimized blog articles

### The Strategy: Find Gaps → Write → Publish → Social (Fully Automated)

**Step 1: Claude Code does competitor research**
- Analyzes competitor websites for gaps and opportunities
- Identifies what competitors are doing well
- Finds bottom-funnel, high-intent keywords
- Generates article titles + keyword focus from gaps
- Give it your top 5 competitor websites
- For local business, it also looks around the area

**Step 2: Arvo writes SEO articles automatically**
- Claude sends keywords + titles to Arvo via API
- Arvo uses YOUR brand assets (not generic)
- Configurable: formatting structure, CTAs ("Book Now"), sitemap for internal links
- External links to trusted sources automatically
- Your own images or AI-generated
- YouTube video embeds optional
- Focus keywords, meta descriptions, H1s, H3s all handled
- Articles are genuinely good quality, brand-aligned

**Step 3: Auto-publish to website**
- Arvo integrates directly with your website (WordPress, etc.)
- Articles publish without manual intervention
- Can do 1/day, 2/day, 5/day, 1/week — whatever you set

**Step 4: Social media from RSS feed (Blotato)**
- Claude analyzes your blog RSS feed
- Generates Instagram + Facebook post captions
- Generates images if wanted
- Sends to Blotato to schedule and auto-publish
- Full content calendar automated — Claude did ALL of it

### Setup Process
1. Download VS Code (free)
2. Install Claude Code extension
3. Create folder on desktop, open in VS Code
4. Enter the master prompt (role: SEO content creator + business context + competitor list)
5. Connect Arvo API key
6. Connect website integration in Arvo (auto-publish)
7. Optionally connect Blotato API for social media
8. Claude builds Skills on backend — then just say "run my weekly blog plan" or "run my social media plan"

### Key Quote
"Set this up in probably 20 minutes. You don't have to have a team. Completely hands-off."

### Tools Used
- **Claude Code** — research, keyword gaps, competitor analysis, social content generation
- **Arvo** — SEO article writing with brand assets, auto-publishing
- **Blotato** — social media scheduling from RSS feed
- **VS Code** — workspace for Claude Code skills and outputs

---

## Video 4: "Boris Cherney (Claude Code Creator) Project Setup" (FULL TRANSCRIPT)

### Boris's 6-Part System

**1. Plan Mode First (~80% of sessions)**
- "Move slow to move fast"
- Prompt: "Before we start building, interview me about this. What are the core problems this solves? What does success look like? What should this NOT do? Summarize it back to me before you write any code."
- Claude proactively asks questions about things it would otherwise make assumptions about
- "Putting Claude in the best position to succeed"

**2. Minimal CLAUDE.md (Counterintuitive)**
- Keep it ~2000 tokens
- If it's bloated: DELETE THE ENTIRE THING and start fresh
- "The capability changes with every model. Do the minimal possible thing to get the model on track."
- Only add instructions back when the model goes off track
- "With every model you have to add less and less"
- Alternative to deletion: "Update CLAUDE.md to remove anything no longer needed, contradictory, duplicate information, or unnecessary bloat impacting effectiveness"
- Key: update it after mistakes — "Based on this conversation, update CLAUDE.md so this doesn't happen again"

**3. Verification (2-3x Quality Multiplier)**
- "Give Claude a way to verify its work. If Claude has that feedback loop, it will 2-3x the quality."
- Two steps: (a) Give Claude a tool to see output of its work, (b) Tell Claude about that tool
- For websites: open browser, test what was built, iterate until it works
- For content: "Review this against my brand guidelines and flag anything that doesn't match"
- For automations: "Run this workflow and verify the output matches what we expected"
- Add to CLAUDE.md: "Before you do any work, mention how you could verify that work"
- After building: "Please verify all your work so far. Make sure you used best practices, were efficient, and didn't introduce any issues."

**4. Parallel Sessions (Multiply Yourself)**
- Multiple Claude sessions on different PARTITIONED tasks (not overlapping)
- "Two context windows that don't know about each other tend to get better results"
- Fresh session = no baggage = sees obvious things first session missed
- Like turning it off and coming back — "it just works"

**5. Inner Loops → Skills (Document Once, Run Forever)**
- Identify tasks done multiple times per day
- "A prompt tells a player to dribble. A skill is the exact play to run."
- Slash commands for every inner loop workflow
- Skills are infinitely repeatable — only the data changes
- Start prompt: "Based on the project I'm working on, what Claude skills should I create?"

**6. Build for the Future (Never Bet Against the Model)**
- References Rich Sutton's "The Bitter Lesson" — "the more general model will always beat the more specific model"
- Every piece of scaffolding or micro-tweaks will be unnecessary in 6 months
- Focus on your INFORMATION (context fed to model), not prompt optimization
- "AI will never be as bad as it is today"
- Don't waste time optimizing prompts — the model gets better, your prompts become obsolete

---

## Actionable Strategies for SwanStudios Marketing Dashboard

### IMMEDIATE (Build into admin dashboard)
1. **SEO Audit Tool** — one-click audit of sswanstudios.com (PageSpeed, meta, schema, accessibility)
2. **Keyword Research** — Swan Coach generates target keywords for fitness/golf/local market
3. **Content Calendar** — Plan blog posts, social media, email campaigns
4. **Local SEO Manager** — Google Business Profile optimization, NAP consistency, review monitoring
5. **Competitor Analyzer** — Scan competitor PT/fitness websites for gaps

### GROWTH ENGINE
6. **Blog Post Generator** — SEO-optimized articles about fitness, training, nutrition, golf
7. **Social Media Auto-poster** — Generate posts from blog RSS, schedule across platforms
8. **Landing Page Builder** — Campaign-specific pages with tracked conversions
9. **Lead Magnet Creator** — PDF guides, workout plans, nutrition guides for email capture
10. **Email Campaign Planner** — Nurture sequences for leads → clients

### ADVANCED
11. **Ad Creative Generator** — Social ad designs + copy for Facebook/Instagram/Google
12. **Marketing ROI Dashboard** — Track spend vs revenue across all channels
13. **Client Acquisition Funnel** — Visualize: Visit → Lead → Consultation → Client → Revenue

### ARCHITECTURE (Following Video 1's Framework)
```
Swan Coach Marketing System:
  Agents:
    - SEO Strategist (audits, keywords, technical fixes)
    - Content Creator (blog, social, email, lead magnets)
    - Analytics Tracker (traffic, conversions, revenue, ROI)
    - Campaign Manager (coordinates launches, schedules, tracks)
  Skills:
    - site-audit (technical SEO scan)
    - keyword-research (local + niche keywords)
    - blog-writer (NASM-informed fitness content)
    - social-post-generator (platform-specific posts)
    - competitor-analysis (scan and compare)
    - landing-page-builder (conversion-optimized pages)
    - email-campaign (nurture sequences)
    - ad-creative (social ad designs + copy)
    - local-seo (GBP, citations, reviews)
    - analytics-report (weekly/monthly dashboards)
```
