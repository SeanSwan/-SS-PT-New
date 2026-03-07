# Food Intelligence & Transparency Platform Blueprint
## SwanStudios — "Know What You Eat" Module

> **Vision:** An enterprise-grade food transparency system that empowers clients to scan, research, and understand every ingredient in their food — from barcode to farm to plate. Flags GMOs, pesticides (Roundup/glyphosate), harmful additives, microplastics risk, and connects users to local organic farms. Integrated into the personal training platform as a standalone workspace tab.

> **HARD RULE: ZERO MOCK DATA.** All data from real APIs (Open Food Facts, USDA, EWG) or user-contributed. No fake scores or placeholder ratings.

---

## Why This Matters

- 60% of Clean Fifteen produce is free from pesticides, but the Dirty Dozen has alarming residue levels (EWG 2026)
- Microplastics act as carriers for heavy metals, BPA, phthalates, and PFAS (FAO/SGS 2026 report)
- Glyphosate (Roundup) safety is under EPA reevaluation in 2026 after landmark study retraction
- USDA 2026 pesticide report shows residues in majority of tested food
- Consumers want transparency — apps like Yuka have 50M+ downloads proving demand

---

## Data Sources (All Free or Open Source)

### Primary APIs

| API | Cost | Data | Use |
|-----|------|------|-----|
| **Open Food Facts** | Free, open source | 4M+ products, 150 countries, barcode lookup, ingredients, additives, Nutri-Score, NOVA ultra-processing score | Primary barcode scanner + ingredient analysis |
| **USDA FoodData Central** | Free, no limits | 380,000+ foods, government-verified nutrition, pesticide residue data | Authoritative nutrition + residue data |
| **USDA Organic Integrity Database** | Free | All certified organic operations in US + worldwide | Local organic farm finder |
| **USDA Local Food Directories** | Free (API key required) | Farmers markets, CSAs, food hubs, on-farm markets by location | Find organic sources near user |
| **EWG Dirty Dozen / Clean Fifteen** | Free (scrape annually) | 46 produce items ranked by pesticide residue | Produce safety scoring |
| **FDA Food Recall API** | Free | Active food recalls with reason codes | Safety alerts |

### Supplementary Data (Curated/Built-In)

| Data Set | Source | Update Frequency |
|----------|--------|-----------------|
| Harmful additives list | EWG, CSPI, EU banned list | Quarterly |
| GMO crop database | USDA APHIS, Non-GMO Project | Annually |
| Glyphosate residue brands | Detox Project certified list | Annually |
| Microplastics risk factors | FAO reports, peer-reviewed studies | As published |
| Aluminum in food/packaging | FDA guidance, NIH Alzheimer's research | As published |
| Fast food nutrition | Restaurant APIs + USDA | Monthly |
| Brand safety ratings | Open Food Facts + community | Continuous |

---

## Architecture

### Phase G: Food Intelligence Backend

#### G1. Food Product Model (Enhanced)
**Modified:** `backend/models/FoodProduct.mjs` (exists, needs enhancement)
```javascript
{
  id, barcode,
  name, brand, category,
  // Nutrition (from USDA/OFF)
  calories, protein, carbs, fat, fiber, sodium, cholesterol, saturatedFat,
  // Transparency Scores
  nutriScore: 'A'|'B'|'C'|'D'|'E',   // Nutri-Score from Open Food Facts
  novaGroup: 1|2|3|4,                  // NOVA ultra-processing classification
  safetyScore: 0-100,                  // Our composite score
  // Ingredients Analysis
  ingredients: string,                  // Raw ingredients text
  ingredientsParsed: [{                 // Parsed + analyzed
    name: string,
    isOrganic: boolean,
    isGMO: 'yes'|'no'|'likely'|'unknown',
    concerns: string[],                 // ['artificial color', 'preservative', etc.]
    safetyRating: 'safe'|'caution'|'avoid',
  }],
  additives: [{                         // E-numbers / additives
    code: string,                       // E.g., 'E621' (MSG)
    name: string,
    risk: 'low'|'moderate'|'high',
    description: string,
    bannedIn: string[],                 // Countries where banned
  }],
  // Contamination Flags
  flags: {
    hasGMO: boolean,
    hasGlyphosate: boolean,             // Known glyphosate residue
    hasArtificialColors: boolean,
    hasArtificialSweeteners: boolean,
    hasHighFructoseCornSyrup: boolean,
    hasMSG: boolean,
    hasTransFat: boolean,
    hasBHA_BHT: boolean,               // Preservatives linked to health issues
    microplasticsRisk: 'low'|'moderate'|'high',
    aluminumExposure: boolean,          // Aluminum in packaging/ingredients
  },
  // Source tracking
  dataSource: 'open_food_facts'|'usda'|'manual'|'community',
  offProductId: string,                 // Open Food Facts ID
  usdaFdcId: number,                   // USDA FoodData Central ID
  imageUrl: string,
  lastUpdated: Date,
}
```

#### G2. Food Scanner Routes
**New file:** `backend/routes/foodScannerRoutes.mjs`
- `GET /api/food/scan/:barcode` — Scan barcode, lookup in local DB first, then Open Food Facts + USDA
- `GET /api/food/search?q=` — Text search for food products
- `GET /api/food/:id/details` — Full product details with ingredient analysis
- `GET /api/food/:id/alternatives` — Find healthier alternatives in same category
- `POST /api/food/report` — Community report: flag incorrect data or add missing product
- `GET /api/food/dirty-dozen` — Current Dirty Dozen list with details
- `GET /api/food/clean-fifteen` — Current Clean Fifteen list
- `GET /api/food/recalls` — Active FDA food recalls
- `GET /api/food/brands/ratings` — Brand safety leaderboard

#### G3. Food Intelligence Service
**New file:** `backend/services/foodIntelligenceService.mjs`
- `scanBarcode(barcode)` — Orchestrates lookup: local DB → Open Food Facts → USDA
- `analyzeIngredients(ingredientsList)` — Parses ingredients, flags concerns, rates safety
- `calculateSafetyScore(product)` — Composite 0-100 score based on:
  - Nutri-Score (nutrition quality)
  - NOVA group (ultra-processing level)
  - Additive count and severity
  - GMO/pesticide flags
  - Known harmful ingredient presence
- `findAlternatives(product)` — Query same category, sort by safety score
- `getProduceSafetyInfo(produce)` — EWG Dirty Dozen / Clean Fifteen lookup

#### G4. Local Farm Finder Routes
**New file:** `backend/routes/localFarmRoutes.mjs`
- `GET /api/farms/nearby?lat=&lng=&radius=` — Find organic farms near location
  - Uses USDA Organic Integrity Database + Local Food Directories
- `GET /api/farms/:id` — Farm details (certifications, products, contact)
- `GET /api/farms/markets?zip=` — Farmers markets near zip code
- `GET /api/farms/csa?zip=` — CSA programs near zip code

#### G5. Fast Food Nutrition Routes
**New file:** `backend/routes/fastFoodRoutes.mjs`
- `GET /api/food/restaurants` — List supported restaurant chains
- `GET /api/food/restaurants/:chain/menu` — Full menu with nutrition data
- `GET /api/food/restaurants/:chain/menu/:item` — Item details with:
  - Calories, fat, saturated fat, sodium, cholesterol, sugar
  - Ingredient breakdown
  - Health rating (red/yellow/green)
  - Healthier alternatives at same restaurant
- Data source: Nutritionix restaurant API + USDA

---

### Phase H: Food Intelligence Frontend

#### H1. Food Scanner Tab (Client Dashboard)
**New section in:** Client Dashboard sidebar config
- New tab: "Food Scanner" with barcode icon
- Prominent placement — this is a key differentiator

#### H2. FoodScannerView Component
**New file:** `frontend/src/components/FoodIntelligence/FoodScannerView.tsx`
- **Barcode Scanner** — Camera-based barcode scanning (QuaggaJS or ZXing library)
- **Search Bar** — Text search for products by name
- **Results Card:**
  - Product image + name + brand
  - Safety Score (0-100) with color ring (green/yellow/red)
  - Nutri-Score badge (A-E)
  - NOVA ultra-processing badge (1-4)
  - Quick flags: GMO, Glyphosate, Artificial Colors, etc.
- **Tap for Details:**
  - Full ingredient list with color-coded safety ratings
  - Each ingredient expandable: what it is, why it's flagged, health impact
  - Additive breakdown with international ban status
  - Macro/micronutrient breakdown
  - "Find Healthier Alternatives" button

#### H3. IngredientAnalysisPanel Component
**New file:** `frontend/src/components/FoodIntelligence/IngredientAnalysisPanel.tsx`
- Color-coded ingredient list:
  - Green: Safe, natural, organic
  - Yellow: Caution — moderate concern, synthetic but generally recognized as safe
  - Red: Avoid — linked to health issues, banned in other countries
- Expandable detail for each ingredient:
  - What it is (plain English description)
  - How it's made (manufacturing process)
  - Health concerns (with citations)
  - Where it's banned
- Special sections:
  - "Microplastics Risk" — packaging analysis
  - "Aluminum Exposure" — deodorant/antacid/food contact
  - "Pesticide Residue" — glyphosate/Roundup detection history

#### H4. ProduceSafetyGuide Component
**New file:** `frontend/src/components/FoodIntelligence/ProduceSafetyGuide.tsx`
- **Dirty Dozen** card — 12 produce items with highest pesticide residue
  - "Buy organic for these" messaging
  - Pesticide count per item
  - Trend vs previous year
- **Clean Fifteen** card — 15 safest conventional produce
  - "Conventional is OK for these"
- Seasonal availability overlay
- Link to local organic farm finder for Dirty Dozen items

#### H5. LocalFarmFinder Component
**New file:** `frontend/src/components/FoodIntelligence/LocalFarmFinder.tsx`
- Map view (Leaflet + OpenStreetMap) showing:
  - Certified organic farms (USDA Organic Integrity DB)
  - Farmers markets (USDA Local Food Directory)
  - CSA programs
  - On-farm markets
- Filter by: Product type, certifications (USDA Organic, Non-GMO Verified, Glyphosate Residue Free)
- Farm detail cards with contact info, products, certifications
- "Get Directions" link to mapping app

#### H6. FastFoodAnalyzer Component
**New file:** `frontend/src/components/FoodIntelligence/FastFoodAnalyzer.tsx`
- Restaurant chain selector
- Menu browser with nutrition traffic lights:
  - Green: Under daily limits
  - Yellow: Approaching limits
  - Red: Exceeds recommended (high sodium, saturated fat, etc.)
- Per-item breakdown: Calories, fat, saturated fat, sodium, cholesterol, sugar
- "Better Choices" section — healthier options at same restaurant
- Comparison mode: side-by-side menu items
- Integration with daily macro log — "Add to today's log" button

#### H7. FoodEducationHub Component
**New file:** `frontend/src/components/FoodIntelligence/FoodEducationHub.tsx`
- Curated educational content (cards/articles):
  - "What Are Microplastics and Why They're in Your Food"
  - "Aluminum and Alzheimer's: What the Research Says"
  - "Understanding GMOs: Science vs Marketing"
  - "Roundup (Glyphosate): The Controversy Explained"
  - "Ultra-Processed Foods: The NOVA Classification System"
  - "Reading Ingredient Labels: A Complete Guide"
  - "The Dirty Dozen: Why These 12 Produce Items Matter"
  - "Farm to Table: Finding Clean Food Near You"
- Content stored as markdown in DB or static files
- Searchable, categorized, shareable

---

### Phase I: Supplements & AG1 Integration

#### I1. Supplements Workspace Tab
**New section in:** Store workspace or dedicated tab
- Curated supplement recommendations
- AG1 featured product card with affiliate link
- Supplement safety scoring (same framework as food scanner)

#### I2. AG1 Affiliate Integration
- Sign up for AG1 affiliate program (free, 20-30% commission per sale)
- Embed referral link: `https://drinkag1.com/swanstudios` (or similar)
- Featured product card on:
  - Client dashboard overview (subtle recommendation)
  - Food Intelligence tab (in supplements section)
  - Store workspace
- Track clicks and conversions via affiliate dashboard
- Disclosure: "SwanStudios earns a commission on AG1 purchases" (FTC compliance)

#### I3. Supplement Safety Scanner
- Same barcode scanning for supplements
- Verify third-party testing certifications:
  - NSF Certified for Sport
  - USP Verified
  - Informed Sport
  - Non-GMO Project Verified
  - USDA Organic
- Flag proprietary blends (hidden dosages)
- Show individual ingredient analysis

---

## Unsplash Integration for Social Media

### Social Feed Background Rotation
**Modified:** `frontend/src/components/Social/Feed/SocialFeed.tsx`
- Fetch curated fitness/lifestyle images from Unsplash API
- Categories: workout, hiking, dancing, cooking healthy, community, motivation
- Rotate background hero image every 30 minutes (cached)
- Subtle overlay to not distract from content
- Pre-curated collection IDs to ensure quality (no random results)
- Fallback to local images if API unavailable

```typescript
const UNSPLASH_COLLECTIONS = {
  fitness: 'collection-id-1',      // People working out
  outdoors: 'collection-id-2',     // Hiking, nature
  dance: 'collection-id-3',        // Dancing, movement
  cooking: 'collection-id-4',      // Healthy cooking
  community: 'collection-id-5',    // People together, motivating
  gaming: 'collection-id-6',       // Gaming + fitness crossover
};
```

---

## Best Paid APIs (Premium Tier Recommendations)

| API | Price | What It Adds | Priority |
|-----|-------|-------------|----------|
| **Terra API** | From $0/mo (startup), scales with users | 300+ wearable integrations (Apple Watch, Garmin, Fitbit, Oura, Whoop) via single SDK | P1 — Critical for wearable sync |
| **Nutritionix** | $299/mo (Track API) | 1M+ food items, restaurant menus (600+ chains), natural language parsing, barcode scanner | P1 — Best restaurant + food data |
| **Sahha Health API** | Custom pricing | 500+ health insights from wearables, mental health scoring, sleep quality, readiness scores | P2 — Advanced health intelligence |
| **ROOK API** | Custom pricing | 300+ wearables, unified data schema, real-time sync, enterprise SLA | P2 — Alternative to Terra |
| **Edamam Nutrition API** | $0-$499/mo | Recipe analysis, 28 nutrients, meal plan generation, diet filtering | P2 — Recipe/meal planning |
| **Stripe Revenue Recognition** | Included with Stripe | Automated revenue recognition, MRR/ARR calculations, churn tracking | P1 — Real financial metrics |
| **Twilio (SendGrid)** | Free-$20/mo | Transactional email (workout reminders, progress reports, meal plan delivery) | P2 — Email notifications |
| **OneSignal** | Free tier | Push notifications (streak reminders, session alerts, food recalls) | P2 — Mobile engagement |
| **Cloudinary** | Free-$89/mo | Image optimization, before/after progress photo comparison, thumbnail generation | P3 — Image processing |
| **Mapbox** | Free (50K loads/mo) | Premium maps for farm finder, outdoor workout routes, gym locator | P3 — Map upgrade |

---

## Implementation Priority

| Priority | Phase | What | Effort |
|----------|-------|------|--------|
| P0 | G1-G3 | Food Scanner backend (Open Food Facts + USDA + safety scoring) | 2-3 days |
| P0 | H1-H2 | Food Scanner UI (barcode scan + results) | 2-3 days |
| P1 | H3-H4 | Ingredient analysis + Dirty Dozen/Clean Fifteen | 1-2 days |
| P1 | H5 | Local Farm Finder (USDA directories + map) | 1-2 days |
| P1 | H6 | Fast Food Analyzer | 1-2 days |
| P2 | H7 | Food Education Hub (content articles) | 1-2 days |
| P2 | I1-I2 | AG1 affiliate + supplements section | 1 day |
| P2 | I3 | Supplement safety scanner | 1 day |
| P3 | Unsplash | Social feed background rotation | 0.5 day |

---

## Role-Based Access

| Feature | Client | Trainer | Admin |
|---------|--------|---------|-------|
| Food Scanner (barcode) | Full access | Full access | Full access |
| Ingredient Analysis | Full access | Full access | Full access |
| Dirty Dozen / Clean Fifteen | Full access | Full access | Full access |
| Local Farm Finder | Full access | Full access | Full access |
| Fast Food Analyzer | Full access | Full access | Full access |
| Education Hub | Full access | Full access | Full + edit/add content |
| Add to Macro Log from scan | Own log only | Client logs | Full access |
| Supplement Store | Browse + buy | Browse + recommend to clients | Full + manage inventory |
| Brand Safety Ratings | View | View + contribute | Full + moderate |
| Community Reports | Submit | Submit + review | Full + moderate |

---

## New Files Summary

### Backend (6 new files)
| File | Purpose |
|------|---------|
| `backend/routes/foodScannerRoutes.mjs` | Barcode scan, search, details, alternatives |
| `backend/routes/localFarmRoutes.mjs` | USDA organic farm/market finder |
| `backend/routes/fastFoodRoutes.mjs` | Restaurant chain nutrition data |
| `backend/services/foodIntelligenceService.mjs` | Barcode orchestration, ingredient analysis, safety scoring |
| `backend/data/harmful-additives.json` | Curated harmful additive database |
| `backend/data/dirty-dozen.json` | EWG Dirty Dozen + Clean Fifteen (updated annually) |

### Frontend (7 new files)
| File | Purpose |
|------|---------|
| `frontend/src/components/FoodIntelligence/FoodScannerView.tsx` | Main scanner UI |
| `frontend/src/components/FoodIntelligence/IngredientAnalysisPanel.tsx` | Ingredient deep-dive |
| `frontend/src/components/FoodIntelligence/ProduceSafetyGuide.tsx` | Dirty Dozen / Clean Fifteen |
| `frontend/src/components/FoodIntelligence/LocalFarmFinder.tsx` | Map-based farm finder |
| `frontend/src/components/FoodIntelligence/FastFoodAnalyzer.tsx` | Restaurant nutrition analyzer |
| `frontend/src/components/FoodIntelligence/FoodEducationHub.tsx` | Educational content |
| `frontend/src/hooks/useFoodScanner.ts` | Barcode scan + API hook |

### Modified (3 files)
| File | Change |
|------|--------|
| `backend/models/FoodProduct.mjs` | Enhanced with transparency scores, flags, ingredients analysis |
| `frontend/src/components/ClientDashboard/StellarSidebar.config.ts` | Add Food Scanner nav item |
| `backend/core/startup.mjs` | Register new food routes |

---

## Verification

1. Scan a barcode (e.g., Cheerios) → see ingredients, safety score, Nutri-Score, NOVA group
2. Tap an ingredient → see what it is, how it's made, health concerns
3. See GMO/glyphosate/additive flags with red/yellow/green indicators
4. Search "strawberries" → Dirty Dozen warning with "buy organic" recommendation
5. Open farm finder → see organic farms on map near user's location
6. Browse McDonald's menu → see nutrition traffic lights per item
7. Tap "Add to macro log" → food data flows to daily macro tracking
8. AG1 affiliate link works and tracks clicks
9. All data from real APIs — no hardcoded mock values

---

## Sources
- [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/)
- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [USDA Organic Integrity Database](https://organic.ams.usda.gov/)
- [USDA Local Food Directories](https://www.usdalocalfoodportal.com/fe/datasharing/)
- [EWG Dirty Dozen 2026](https://www.ewg.org/foodnews/dirty-dozen.php)
- [EWG Clean Fifteen](https://www.ewg.org/foodnews/clean-fifteen.php)
- [Detox Project - Glyphosate Residue Free](https://detoxproject.org/certification/glyphosate-residue-free/)
- [FAO Microplastics in Food Report](https://openknowledge.fao.org/)
- [AG1 Affiliate Program](https://www.creator-hero.com/blog/ag1-affiliate-program-in-depth-review-pros-and-cons)
- [Nutritionix Restaurant API](https://www.nutritionix.com/)
- [Terra Wearable API](https://tryterra.co)
- [Sahha Health API](https://sahha.ai/)

*SwanStudios Food Intelligence Blueprint v1.0*
*Generated: 2026-03-07*
