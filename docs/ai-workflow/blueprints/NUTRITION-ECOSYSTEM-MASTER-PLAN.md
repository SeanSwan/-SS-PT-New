# SwanStudios Nutrition Ecosystem — Master Plan

> **Author:** Claude Opus 4.6 (CEO) + Sean (Owner)
> **Date:** 2026-03-31
> **Status:** PENDING AI VILLAGE REVIEW
> **Purpose:** Define the complete nutrition feature ecosystem for SwanStudios — from meal logging to farm-to-table intelligence
> **Target:** Premium fitness SaaS for NASM-certified trainer with wealthy golf clients, working professionals 30-55

---

## 1. Executive Summary

SwanStudios needs a comprehensive nutrition ecosystem that goes far beyond basic calorie counting. The vision is a premium, health-conscious nutrition platform that combines:

- **Meal logging** (manual + barcode + AI photo recognition)
- **Barcode scanner with camera** + ingredient color-coding (green/yellow/red for health safety)
- **Restaurant & grocery nutrition facts** for North America and Europe
- **Home gardening calculator** with geography-based plant recommendations
- **Local farm finder map** (non-GMO, organic farmers near you)
- **Supplement store section** (AG1 affiliate + curated recommendations)
- **Clothing/merch store placeholder** (future revenue stream)
- **Trainer & admin nutrition widgets** (client macro tracking, plan builder)
- **AI hive mind integration** with zero-PII privacy proxy

This ecosystem differentiates SwanStudios from every competitor by combining NASM-certified nutrition science with food safety intelligence, local sustainability, and premium user experience.

---

## 2. Current State (What's Already Built)

### 2.1 Frontend Components (WORKING)
| Component | Status | Notes |
|-----------|--------|-------|
| NutritionWorkspace.tsx | WORKING | 6-tab hub: Log Meal, Food Search, Hydration, My Macros, Intelligence, Learn |
| FoodIntakeForm.tsx | WORKING | Manual meal entry with macro calculations, submits to POST /api/macros |
| FoodSearchPanel.tsx | WORKING | Dual-API: USDA FoodData Central + Open Food Facts |
| FoodIntelligenceDashboard.tsx | WORKING | CalorieNinjas NLP, produce safety guide, fast food analyzer |
| BarcodeScanner.tsx | PARTIAL | Manual barcode entry works; camera scanning removed (Quagga build failures) |
| ProductAnalysis.tsx | WORKING | Health ratings, ingredient breakdown, GMO/organic status |
| NutritionHydrationTab.tsx | WORKING | localStorage-based water tracker (8-glass goal) |
| NutritionLearnTab.tsx | WORKING | 4 NASM-aligned education modules (50 XP each) |
| MacroDonut.tsx (Victory) | WORKING | Static demo data — NOT wired to real macro logs |
| NutritionBalanceRadar.tsx (Victory) | EXISTS | Placeholder |
| NutritionPlanBuilder.tsx (Admin) | WORKING | Admin creates nutrition plans for clients |

### 2.2 Backend (FULLY IMPLEMENTED)
| Endpoint | Status | Notes |
|----------|--------|-------|
| POST /api/macros | WORKING | Log food with 15 nutrients + health flags |
| GET /api/macros?date= | WORKING | Daily entries |
| GET /api/macros/summary | WORKING | Daily totals |
| GET /api/macros/weekly | WORKING | Weekly summary (max 90 days) |
| GET /api/food-scanner/scan/:barcode | WORKING | Local DB → Open Food Facts fallback |
| GET /api/food-scanner/search | WORKING | Multi-filter product search |
| POST /api/food-scanner/analyze-ingredients | WORKING | AI ingredient analysis (rate limited) |
| POST /api/food-scanner/log-scan | WORKING | Scan → auto-log to daily macros |
| POST /api/food-scanner/ai-analyze | WORKING | AI food safety analysis |
| GET /api/free/food-search | WORKING | USDA proxy |
| GET /api/free/nutrition | WORKING | CalorieNinjas NLP proxy |
| GET /api/nutrition/:userId/current | WORKING | Client nutrition plan |

### 2.3 Database Models (FULLY IMPLEMENTED)
- **DailyMacroLog** — 15 nutrients, health flags, NOVA classification, AI linking
- **FoodProduct** — Barcode products with nutrition JSON, health ratings, GMO/organic
- **FoodIngredient** — Individual ingredients with health ratings, GMO status, research URLs
- **FoodScanHistory** — User scan tracking with favorites, ratings, location
- **ClientNutritionPlan** — JSONB meals, grocery list, dietary restrictions, hydration target

### 2.4 Connected APIs
| API | Coverage | Status |
|-----|----------|--------|
| USDA FoodData Central | 400,000+ foods | LIVE |
| Open Food Facts | Global barcode database | LIVE |
| CalorieNinjas | Natural language → nutrition | LIVE |
| ZenQuotes | Motivational quotes | LIVE |

---

## 3. Proposed Features (New Build)

### 3.1 Camera Barcode Scanner (RESTORE)
**Priority:** CRITICAL — This was built and working, then removed for build stability.

**What:**
- Restore real-time camera barcode scanning using a modern, Vite-compatible library
- Support UPC-A, EAN-13, EAN-8, Code 128 (covers 99% of grocery barcodes)
- Mobile-first: rear camera default, torch/flashlight toggle

**Library options to research:**
- `@nicgirault/react-zbar-wasm` (WASM-based, no native deps)
- `html5-qrcode` (pure JS, actively maintained)
- `@nicgirault/quagga2` (fork of QuaggaJS, fixed build issues)
- Native `BarcodeDetector` API (Chrome 83+, not Safari — needs polyfill)

**Technical approach:**
- Wrap in `React.lazy()` + `Suspense` (camera module is heavy)
- `<video>` element with `getUserMedia({ video: { facingMode: 'environment' } })`
- Scan loop: decode frame every 100ms, debounce duplicate scans (500ms)
- On successful scan: vibrate (navigator.vibrate), show product overlay
- Fallback: manual entry input (already exists)

**Integration:**
- On scan → `GET /api/food-scanner/scan/:barcode` (already built)
- Product found → show `ProductAnalysis` component with health rating
- Not found → offer manual entry or search USDA

### 3.2 Ingredient Color-Coding System
**Priority:** HIGH — Key differentiator, health-conscious users care deeply about this.

**What:**
- Every ingredient in scanned products gets a color badge:
  - **Green** (Safe) — Natural, whole food ingredients, organic certified
  - **Yellow** (Caution) — Processed but generally recognized as safe, artificial sweeteners, preservatives
  - **Red** (Concern) — Known carcinogens (IARC classified), glyphosate-associated, banned in EU/Japan
- Glyphosate-specific alerts for grains, oats, cereals
- GMO indicators where data is available

**Data source:**
- FoodIngredient model already has `healthRating` (good/bad/okay) and `isGMO`
- Extend with: `riskLevel` ('safe'|'caution'|'concern'), `bannedRegions` (JSON), `iarcClassification` (string)
- Seed data from: EWG Dirty Dozen, IARC monographs, EU banned additives list
- Research needed: Best open-source ingredient safety databases

**UI:**
- Ingredient list with colored dots/pills next to each ingredient name
- Tap ingredient → expandable card: health concerns, research URL, alternatives
- Summary bar at top: "5 safe / 2 caution / 1 concern"
- Concerns section with Crimson Frost border (error design system)

### 3.3 Restaurant & Grocery Nutrition Facts
**Priority:** HIGH — Covers the "eating out" gap that most fitness apps ignore.

**What:**
- Search nutrition facts for menu items at North American and European restaurant chains
- Grocery store brand products (Trader Joe's, Whole Foods, Costco, etc.)
- Auto-suggest nearby restaurants via geolocation

**Data sources to research:**
- **Nutritionix API** — 900,000+ restaurant menu items (premium, ~$400/month)
- **MenuStat** — Free research database from NYC Health Dept (200+ chains)
- **FatSecret Platform API** — Free tier, restaurant data, large food database
- **Edamam Nutrition API** — Free tier (100 calls/day), recipe analysis
- **OpenFoodFacts** — Already integrated, has some restaurant data
- **Spoonacular** — Free tier (150 calls/day), restaurant search

**Recommended approach (cost-conscious):**
1. **Free tier:** FatSecret + Edamam + OpenFoodFacts for basic coverage
2. **Growth tier:** Nutritionix when revenue supports it
3. **User-contributed:** Allow users to submit restaurant meal nutrition (gamification: 25 XP per verified submission)

**UI:**
- Restaurant search with filters: cuisine type, dietary preference, distance
- Menu item cards: calories, macros, health rating, ingredient warnings
- "Healthiest options" sort for each restaurant
- Meal comparison: side-by-side macro comparison of menu items

### 3.4 Home Gardening Calculator
**Priority:** MEDIUM — Unique differentiator for health-conscious premium clients.

**What:**
- Geography-based plant recommendations (USDA Hardiness Zones)
- Growing season calculator based on user's location (frost dates, sunlight hours)
- Potted/container crate recommendations for apartment dwellers
- Nutritional yield calculator: "Your basil plant yields ~X servings of vitamin K per month"
- Water and care scheduling reminders

**Data sources to research:**
- USDA Plant Hardiness Zone API
- Farmer's Almanac frost date data
- Local extension service data (county-level)
- PlantNet API (plant identification from photos)

**Technical approach:**
- User enters zip code or allows geolocation
- Backend maps to USDA Hardiness Zone (free data)
- Returns recommended plants by season with growing guides
- Optional: photo identification of existing plants via AI

**UI sections:**
- **My Garden** — Track what you're growing, care reminders
- **Plant Finder** — Search by zone, space (outdoor/balcony/indoor), difficulty
- **Container Crate Planner** — Drag-and-drop planter layouts for balcony/patio
- **Harvest Calculator** — When to plant, when to harvest, expected yield
- **Nutrition from Garden** — How your garden contributes to your macro goals

### 3.5 Local Farm Finder Map
**Priority:** MEDIUM — Appeals to health-conscious, non-GMO-focused golf client demographic.

**What:**
- Interactive map showing local farms, farmers markets, CSA programs
- Filters: organic, non-GMO, grass-fed, free-range, seasonal produce
- Distance-based search from user location
- Farm profiles: what they grow/raise, certifications, pricing, delivery options

**Data sources to research:**
- USDA Farmers Market Directory API (free, 8,000+ markets)
- LocalHarvest.org API (150,000+ farms & CSAs)
- Google Places API (with "farm" category filter)
- FarmFinder.com data

**Technical approach:**
- Leaflet.js or Mapbox GL JS for interactive map (both have free tiers)
- Backend caches farm data with 24h TTL (farm locations don't change often)
- User favorites and reviews (gamification: 15 XP per farm review)
- Driving directions link (opens native maps app)

**UI:**
- Full-screen map with farm pins (color-coded by type)
- List view toggle (distance-sorted)
- Farm detail cards: photo, products, certifications, contact
- "In Season Now" badge for farms with currently available produce
- Integration with Gardening Calculator: "Buy these seedlings from [Farm Name]"

### 3.6 Supplement Store Section (AG1 Affiliate + Curated)
**Priority:** MEDIUM — Revenue stream via affiliate partnerships.

**What:**
- AG1 (Athletic Greens) featured section with affiliate link
- Curated supplement recommendations by category:
  - Protein powders (whey, plant-based, collagen)
  - Vitamins & minerals (based on user's dietary gaps)
  - Performance (creatine, beta-alanine, caffeine)
  - Recovery (magnesium, omega-3, turmeric)
  - Golf-specific (joint support, vitamin D, electrolytes)
- "AI-recommended" supplements based on user's logged nutrition gaps
- Disclaimer: "Consult your healthcare provider before starting any supplement"

**Monetization:**
- AG1 affiliate program (~30% commission, $60+ AOV)
- Amazon Associates links for other supplements
- Future: direct supplement partnerships with premium brands

**UI:**
- Hero section: AG1 branded card with "Sean's Pick" badge
- Category grid: tap category → product cards with affiliate links
- "Your Gaps" section: AI analyzes user's macro logs → suggests supplements
- Reviews from community (social feed integration)
- NASM-aligned education for each category

### 3.7 Clothing & Merch Store (Placeholder)
**Priority:** LOW — Revenue stream, but not nutrition-specific. Placeholder for now.

**What:**
- SwanStudios branded merchandise: workout shirts, hoodies, water bottles
- Print-on-demand integration (no inventory risk)
- Gamification: unlock exclusive merch designs at certain tiers (Titanium Core+ gets holographic logo merch)

**Technical approach (future):**
- Printful or Printify API integration
- Product catalog stored in PostgreSQL
- Stripe checkout (already integrated for session packages)

### 3.8 Trainer & Admin Nutrition Widgets
**Priority:** HIGH — Trainer needs visibility into client nutrition.

**What:**
- **Trainer Dashboard Widget:** Client macro compliance heatmap (last 7/30 days)
- **Admin Dashboard Widget:** Aggregate nutrition stats across all clients
- **Client Detail Panel:** Nutrition tab showing recent logs, plan compliance, gaps
- **AI Coach Context:** When reviewing a client, the Coach Assistant automatically sees their recent nutrition data

**Technical approach:**
- New analytics endpoint: `GET /api/analytics/:userId/chart-nutrition-compliance`
- Victory charts: MacroDonut (already exists, wire to real data), compliance line chart, meal frequency bar
- Trainer can flag clients who haven't logged meals in 3+ days

**UI additions:**
- Client card badge: "Last logged: 2 hours ago" / "No logs in 3 days" (warning)
- Weekly compliance % (meals logged / expected meals)
- Macro target vs actual sparkline

### 3.9 AI Hive Mind Nutrition Integration
**Priority:** HIGH — Makes the AI coach nutrition-aware.

**What:**
- Coach Assistant can answer nutrition questions with real context
- "What should I eat before my golf game?" → AI considers user's logged macros, time of day, activity level
- "Analyze my nutrition this week" → AI pulls weekly macro summary, identifies gaps
- "Create a meal plan for my cutting phase" → AI generates plan aligned with OPT phase

**Technical approach:**
- Add `nutrition_analysis` context type to AI chat complexity detection
- When nutrition context detected:
  1. Fetch user's recent macro logs (last 7 days)
  2. Fetch active nutrition plan (if exists)
  3. Strip PII (user ID only, never names)
  4. Include in AI prompt as structured data
- AI responds with nutrition-aware recommendations

**Privacy:**
- All nutrition data passed to AI as anonymized aggregates
- "User #47's average daily intake: 2100 cal, 150g protein, 220g carbs, 70g fat"
- No meal descriptions or food names sent to external AI (could reveal preferences)

---

## 4. Architecture & File Organization

### 4.1 New Frontend Files
```
frontend/src/components/
├── NutritionEcosystem/
│   ├── index.ts                          # Barrel export
│   ├── NutritionEcosystemHub.tsx         # Main orchestrator (replaces/upgrades NutritionWorkspace)
│   ├── tabs/
│   │   ├── MealLogTab.tsx                # Enhanced meal logging (manual + barcode + photo)
│   │   ├── FoodSearchTab.tsx             # Existing FoodSearchPanel upgrade
│   │   ├── HydrationTab.tsx              # Existing hydration upgrade (API-backed)
│   │   ├── MacroDashboardTab.tsx         # Real-time Victory charts (wired to API)
│   │   ├── IntelligenceTab.tsx           # Existing FoodIntelligenceDashboard
│   │   ├── LearnTab.tsx                  # Existing NutritionLearnTab
│   │   ├── RestaurantTab.tsx             # NEW: Restaurant nutrition search
│   │   ├── GardeningTab.tsx              # NEW: Home gardening calculator
│   │   └── FarmFinderTab.tsx             # NEW: Local farm map
│   ├── scanner/
│   │   ├── CameraScanner.tsx             # NEW: Camera barcode scanning (lazy-loaded)
│   │   ├── IngredientColorCode.tsx       # NEW: Green/yellow/red ingredient display
│   │   └── ProductOverlay.tsx            # NEW: Scan result overlay
│   ├── supplements/
│   │   ├── SupplementStore.tsx           # NEW: AG1 + curated supplements
│   │   └── GapAnalysis.tsx              # NEW: AI-powered nutrition gap finder
│   ├── gardening/
│   │   ├── PlantFinder.tsx               # NEW: Zone-based plant search
│   │   ├── ContainerPlanner.tsx          # NEW: Balcony/patio planner
│   │   └── HarvestCalendar.tsx           # NEW: Growing season calendar
│   ├── farm/
│   │   ├── FarmMap.tsx                   # NEW: Leaflet/Mapbox map
│   │   └── FarmCard.tsx                  # NEW: Farm detail card
│   ├── charts/
│   │   ├── MacroTrendLine.tsx            # NEW: Victory line chart (real data)
│   │   └── MealFrequencyBar.tsx          # NEW: Victory bar chart
│   ├── hooks/
│   │   ├── useMacroData.ts              # NEW: SWR-like macro data fetcher
│   │   ├── useNutritionPlan.ts          # NEW: Current plan fetcher
│   │   ├── useBarcodeScanner.ts         # NEW: Camera scanner hook
│   │   ├── useFarmFinder.ts             # NEW: Geolocation + farm search
│   │   └── useGardeningZone.ts          # NEW: USDA zone lookup
│   └── styles/
│       ├── NutritionStyles.ts           # Shared nutrition styled-components
│       ├── ScannerStyles.ts             # Barcode scanner styles
│       └── MapStyles.ts                 # Farm map styles
```

### 4.2 New Backend Files
```
backend/
├── routes/
│   ├── restaurantNutritionRoutes.mjs    # NEW: Restaurant menu search
│   ├── gardeningRoutes.mjs              # NEW: Plant zone/growing data
│   └── farmFinderRoutes.mjs             # NEW: Local farm search
├── services/
│   ├── restaurantNutritionService.mjs   # NEW: FatSecret/Edamam integration
│   ├── gardeningService.mjs             # NEW: USDA zone + growing data
│   └── farmFinderService.mjs            # NEW: USDA Farmers Market Directory
├── models/
│   └── (no new models needed for Phase 1 — existing models sufficient)
├── seeders/
│   └── 20260401-seed-ingredient-safety-data.mjs  # NEW: Ingredient health ratings
```

### 4.3 New API Endpoints
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | /api/restaurant-nutrition/search | Search restaurant menus | Auth |
| GET | /api/restaurant-nutrition/chain/:id/menu | Get chain menu items | Auth |
| GET | /api/gardening/zone/:zipCode | Get USDA hardiness zone | Public |
| GET | /api/gardening/plants | Search plants by zone + filters | Auth |
| GET | /api/gardening/frost-dates/:zipCode | Get frost dates for location | Public |
| GET | /api/farm-finder/markets | Search farmers markets near location | Public |
| GET | /api/farm-finder/farms | Search farms near location | Auth |
| GET | /api/analytics/:userId/chart-nutrition-compliance | Macro compliance data | Auth |

---

## 5. Phased Implementation

### Phase 1: Quick Wins (1-2 days)
- Wire MacroDonut chart to real API data (GET /api/macros/summary)
- Restore barcode camera scanning with modern library
- Implement ingredient color-coding on existing ProductAnalysis component
- Wire NutritionBalanceRadar to real data
- Add Nutrition analytics endpoint for chart data

### Phase 2: Restaurant & Intelligence (3-5 days)
- Integrate FatSecret or Edamam API for restaurant nutrition
- Build RestaurantTab with search, filters, meal comparison
- Enhance AI Coach with nutrition context
- Add trainer nutrition widget to client detail panel
- Persist hydration data to backend (upgrade from localStorage)

### Phase 3: Scanning & Safety (3-5 days)
- Implement camera barcode scanner with modern library
- Build ingredient color-coding system with health risk database
- Seed ingredient safety data (EWG, IARC, EU bans)
- Build scan → analyze → log flow (one-tap from camera to macro log)

### Phase 4: Local & Sustainable (5-7 days)
- USDA Hardiness Zone API integration
- Plant Finder with growing season calculator
- Container garden planner
- USDA Farmers Market Directory integration
- Farm Finder map with Leaflet.js
- Local farm profiles and reviews

### Phase 5: Monetization (3-5 days)
- AG1 affiliate integration
- Supplement store with categories
- AI gap analysis → supplement recommendations
- Clothing/merch store placeholder
- Community supplement reviews (social feed integration)

### Phase 6: Premium Intelligence (5-7 days)
- AI meal planning based on OPT phase + macro targets
- Photo food recognition (Gemini multimodal)
- Nutrition trend analysis and alerts
- Cross-client nutrition analytics for trainer dashboard
- Golf-client specific nutrition presets (pre-round, post-round, tournament day)

---

## 6. Competitive Positioning

### What competitors DON'T have (our differentiators):
1. **Ingredient safety color-coding** with glyphosate/GMO alerts — NO fitness app does this
2. **Local farm finder** integrated into a fitness platform — unique
3. **Home gardening calculator** tied to nutrition goals — unprecedented
4. **NASM-certified AI nutrition advice** with zero-PII privacy — trust differentiator
5. **Restaurant nutrition + ingredient safety** combined — most apps only show calories

### What competitors DO have (must match):
1. Barcode scanning (MyFitnessPal, Lose It, Yazio) — MUST restore
2. Restaurant nutrition search (MyFitnessPal, Nutritionix) — Phase 2
3. AI food photo recognition (MyFitnessPal AI, Yazio) — Phase 6
4. Wearable integration for calorie burn (most apps) — future integration
5. Recipe database (Mealime, Eat This Much) — Phase 6

---

## 7. Privacy & Compliance

### Zero PII to LLMs (Existing Policy — Enforced)
- Nutrition data sent to AI as anonymized aggregates only
- No food diaries, meal photos, or dietary preferences shared with external AI
- All AI nutrition responses map User IDs back to names client-side

### Health Data Regulations
- **Research needed:** FDA guidance on AI-generated nutrition advice in apps
- **Research needed:** HIPAA applicability to nutrition data (likely not covered, but verify)
- **Research needed:** FTC requirements for supplement affiliate disclosures
- Mandatory disclaimer on all AI nutrition advice: "Not medical advice. Consult a healthcare provider."

### Ingredient Safety Disclaimers
- Data sourced from public health databases (IARC, EWG, FDA GRAS list)
- "This information is for educational purposes only"
- Clear labeling of data source and last update date

---

## 8. Gamification Integration

| Action | XP | Category |
|--------|----|----------|
| Log a meal | 10 | nutrition |
| Complete daily macro log (3+ meals) | 25 | nutrition |
| Scan a barcode | 5 | nutrition |
| Rate a scanned product | 5 | social |
| Submit restaurant nutrition data | 25 | social |
| Complete nutrition education module | 50 | education |
| Hit daily hydration goal | 10 | nutrition |
| Log a home garden harvest | 15 | nutrition |
| Review a local farm | 15 | social |
| 7-day meal logging streak | 75 | streak |
| 30-day meal logging streak | 300 | streak |
| Buy through supplement affiliate | 0 | (no XP for purchases — ethical gamification) |

### Achievement Badges (New)
- **Garden Guru** (Rare) — Log 10 harvests from home garden
- **Farm Fresh** (Common) — Visit and rate 3 local farms
- **Macro Master** (Epic) — Hit macro targets within 5% for 7 consecutive days
- **Scan Warrior** (Common) — Scan 25 unique products
- **Clean Eater** (Rare) — Log 30 meals with zero "red" ingredients
- **Nutrition Scholar** (Common) — Complete all 4 NASM nutrition modules

---

## 9. Questions for AI Village Research

The 14-Brain AI Village should specifically research:

1. **What's the best camera barcode library for Vite + React in 2026?** (html5-qrcode vs @nicgirault/quagga2 vs native BarcodeDetector)
2. **What ingredient safety databases exist as open APIs?** (beyond EWG and IARC)
3. **What are the FDA/FTC requirements for AI nutrition advice in fitness apps?**
4. **What restaurant nutrition APIs have free tiers suitable for a startup?**
5. **What mapping library works best for React + farm/market data?** (Leaflet vs Mapbox vs Google Maps)
6. **What wearable APIs should we plan to integrate with?** (Apple Health, Google Fit, Garmin, Whoop, Oura)
7. **What are the emerging trends in food tech that we should future-proof for?** (CGM integration, DNA-based nutrition, microbiome testing)
8. **What do competitor reviews say about nutrition features in fitness apps?** (App Store reviews for MyFitnessPal, Lose It, Cronometer)
9. **Are there open-source USDA Hardiness Zone APIs or datasets?**
10. **What's the current state of photo-based food recognition APIs?** (Google Cloud Vision, Clarifai, LogMeal)

---

## 10. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily meal logs per active user | 2.5+ | DailyMacroLog count / active users |
| Barcode scans per week | 10+ per active user | FoodScanHistory count |
| Restaurant nutrition searches | 5+ per active user/week | API call count |
| Supplement store click-through | 3%+ | Affiliate link clicks / page views |
| Nutrition module completion | 60%+ of active users | XP awards for nutrition education |
| Farm finder engagement | 20%+ of active users visit once | Page view analytics |
| Gardening calculator usage | 10%+ of active users | Zone lookup API calls |
| AI nutrition questions | 30%+ of AI chat queries | Context type analysis |

---

*This plan is PENDING review by the 14-Brain AI Village with web research enabled. The Strategic Research & Gap Analysis brain (Brain #13) will identify missing features, regulatory risks, and future-proofing opportunities.*
