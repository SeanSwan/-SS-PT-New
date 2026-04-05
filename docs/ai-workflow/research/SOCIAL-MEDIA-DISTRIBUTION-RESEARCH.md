# Social Media Distribution System — Competitive Research

> **Date:** 2026-04-05 | **Purpose:** Research for SwanStudios Social Post Generator + Distribution Hub

---

## Sean's Target Platforms
1. Facebook ✅ (API available through all providers)
2. Instagram ✅ (API available through all providers)
3. TikTok ✅ (API available through all providers)
4. Nextdoor ✅ (Has Publish API — developer.nextdoor.com — requires approval)
5. BlueSky ✅ (FREE open API — AT Protocol, no API key needed, no approval)
6. + Any future platforms (YouTube, LinkedIn, Threads, Pinterest, X, Google Business, Reddit)

---

## Competitor Feature Matrix (Must-Haves)

### What Hootsuite Does ($99-$739/mo)
- Schedule/publish to all major platforms from one dashboard
- AI caption generator (OwlyWriter AI) — platform-optimized
- Best time to post recommendations based on audience data
- Visual content calendar with drag-and-drop
- Analytics & reporting (cross-platform performance)
- Social listening & mention alerts
- Team collaboration (assignments, approvals)
- Influencer discovery (Upfluence integration)
- 150+ integrations
- **What we want:** AI captions, scheduling, calendar, analytics, multi-platform

### What Buffer Does ($0-6/mo per channel)
- Simple scheduling across platforms
- AI caption generator
- Analytics (engagement, reach, clicks)
- "Best time to post" suggestions
- Link shortening + tracking
- Landing page builder
- Free tier: 3 channels, 10 scheduled posts/channel
- **What we want:** Simplicity, free tier model, AI captions

### What Later Does ($18-80/mo)
- Visual content calendar (drag-drop)
- Auto-posting to Instagram, TikTok, Facebook, LinkedIn, Pinterest, X, YouTube, Threads
- AI caption ideas
- Link in bio page builder
- Analytics & insights
- **What we want:** Visual calendar, auto-posting, AI captions

### What Sprout Social Does ($249-499/seat/mo)
- Advanced analytics and reporting
- Social listening + sentiment tracking
- CRM-style social inbox
- Team workflows + approval chains
- Competitor benchmarking
- **Too expensive for us, but want:** Competitor benchmarking, analytics

---

## API-First Solutions (Build Our Own — Cheapest)

### Option 1: Late.dev — $19/mo (BEST VALUE)
- 13 platforms: Instagram, TikTok, X, LinkedIn, Facebook, YouTube, Threads, Reddit, Pinterest, Bluesky, Google Business, Telegram
- Single REST API for all platforms
- Scheduling built-in
- 99.97% uptime, sub-50ms response
- Unlimited team members
- 87% cheaper than Ayrshare ($19 vs $149)
- **Missing:** Nextdoor (would need separate integration)

### Option 2: Ayrshare — $0-149/mo
- Free tier: 20 posts/month (images only)
- Platforms: Facebook, X, Instagram, LinkedIn, Telegram, Google Business, Pinterest, Reddit, TikTok, Bluesky
- Premium ($149/mo) needed for video + scheduling
- **Too expensive for video posting**

### Option 3: Post for Me — $10/mo
- TikTok, Instagram, Facebook, X, LinkedIn, YouTube, Threads, Pinterest, Bluesky
- Unlimited accounts, analytics included
- $10/mo starting price
- **Missing:** Nextdoor

### Option 4: Build Direct API Integrations (FREE but complex)
- Facebook/Instagram: Meta Graph API (free, requires app review)
- TikTok: Content Posting API (free, requires app review)
- BlueSky: AT Protocol (free, no approval needed, 4 lines of Python)
- Nextdoor: Publish API (free, requires developer approval)
- YouTube: YouTube Data API v3 (free quota, Google Cloud)
- LinkedIn: Marketing API (free, requires approval)
- X/Twitter: API v2 (free tier = 1,500 posts/month)

---

## Platform API Access Summary

| Platform | Free API? | Approval Needed? | Difficulty |
|----------|-----------|-------------------|-----------|
| **BlueSky** | ✅ 100% free, open | No | Easy (4 lines of code) |
| **X/Twitter** | ✅ Free tier (1,500 posts/mo) | Yes (basic) | Medium |
| **Facebook** | ✅ Free | Yes (app review) | Medium |
| **Instagram** | ✅ Free (via Facebook) | Yes (app review) | Medium |
| **TikTok** | ✅ Free | Yes (app review) | Medium |
| **Nextdoor** | ✅ Free | Yes (developer approval) | Medium |
| **YouTube** | ✅ Free quota | Yes (Google Cloud) | Medium |
| **LinkedIn** | ✅ Free | Yes (marketing API) | Hard |
| **Threads** | ✅ Free (via Meta) | Yes (via Facebook) | Medium |
| **Pinterest** | ✅ Free | Yes | Medium |

---

## Must-Have Features for SwanStudios Social Post Generator

### TIER 1: MVP (Build First)
1. **AI Post Generator** — Swan Coach writes platform-specific content
   - Different tone/format per platform (Instagram = visual + hashtags, TikTok = trendy, Facebook = community, LinkedIn = professional, Nextdoor = local, BlueSky = conversational)
   - Based on blog content, campaign themes, or manual topics
   - Image generation via Gemini (already have this)
   - Video thumbnail generation
   
2. **Content Calendar** — Visual weekly/monthly view
   - Already have UI (ContentCalendarPanel) — need backend persistence
   - Drag-and-drop scheduling
   - Color-coded by platform
   - "Best time to post" suggestions per platform

3. **Multi-Platform Publishing** — Post to all selected platforms at once
   - Platform selector (checkboxes for which platforms to post to)
   - Preview per platform before posting
   - Scheduled posting (queue for future)
   - Status tracking (pending → published → failed)

4. **Post Templates** — Reusable templates for common post types
   - New blog post announcement
   - Client success story
   - Workout tip of the day
   - Community event promotion
   - Training package promo
   - Motivational quote

### TIER 2: Growth Features (Build Next)
5. **Analytics Dashboard** — Cross-platform performance
   - Engagement (likes, comments, shares) per post
   - Reach and impressions
   - Best performing content types
   - Follower growth tracking

6. **Hashtag Manager** — Platform-specific hashtag sets
   - Research trending hashtags
   - Save hashtag groups (fitness, golf, nutrition, local)
   - Auto-suggest based on content

7. **Content Repurposing** — One piece of content → multiple formats
   - Blog post → 5 social posts (one per platform)
   - Video → thumbnail + caption + hashtags
   - Client testimonial → quote graphic + story post

### TIER 3: Advanced (Build Later)
8. **Social Listening** — Monitor mentions and conversations
9. **Competitor Monitoring** — Track competitor social activity
10. **A/B Testing** — Test different captions/images
11. **Team Collaboration** — Approval workflows for posts

---

## Recommended Architecture

### Plan A: Late.dev API ($19/mo) + Direct Nextdoor API (Free)
- Late.dev handles 13 platforms via single REST API
- Nextdoor handled separately via their Publish API
- Swan Coach generates all content (Gemini — already paid for)
- Total: $19/mo for ALL social media distribution
- **This replaces Blotato entirely**

### Plan B: Direct APIs Only ($0/mo — more development work)
- Build integrations directly to each platform API
- BlueSky: trivial (AT Protocol, 4 lines)
- Facebook/Instagram: Meta Graph API (need app review)
- TikTok: Content Posting API (need app review)
- Nextdoor: Publish API (need developer approval)
- Total: $0/mo but 2-4 weeks of development + approval waiting
- **More work upfront, zero ongoing cost**

### Plan C: Blotato (Already in Content Studio UI)
- Distribution Hub UI already built for Blotato
- Just needs backend route implementation
- Blotato pricing: varies by plan
- **Quickest to ship since UI exists, but adds another paid tool**

### Hybrid Recommendation
- **Start with Plan B for BlueSky** (free, easy, ship immediately)
- **Add Late.dev ($19/mo) when ready** for all other platforms at once
- **Keep Blotato as optional toggle** in Content Studio (already built)
- **Build toward Plan B over time** — replace Late.dev with direct APIs as each gets approved
- Swan Coach generates ALL content regardless of distribution method
