# Free API Integrations Research — SwanStudios
## External APIs to Enhance the Platform (All Free Tier or Open Source)

> **Research Date:** 2026-03-07
> **Criteria:** Free to use (or generous free tier), adds real value to a personal training SaaS, production-ready

---

## Tier 1: HIGH IMPACT (Implement First)

### 1. Nutrition / Food Database APIs

| API | Free Tier | Data | Best For |
|-----|-----------|------|----------|
| **USDA FoodData Central** | Completely free, no limits, no API key | 380,000+ foods, government-verified macros | Gold standard nutrition data for macro logging |
| **CalorieNinjas** | Free (rate limited) | Natural language food parsing → calories/macros | AI-assisted macro logging ("I had chicken and rice") |
| **Open Food Facts** | Open source, unlimited | Barcode scanner database, global products | Future barcode scanning feature |
| **Edamam Nutrition API** | Free tier (limited calls) | Recipe analysis, 28 macro/micronutrients | Meal plan nutritional breakdown |
| **FatSecret Platform API** | Free for developers | 2.3M+ foods, 24 languages | International food database backup |

**Recommended:** USDA FoodData Central as primary (free, unlimited, authoritative) + CalorieNinjas for natural language parsing in AI chat.

**Integration point:** Phase A (AI Chat) + Phase E (Macro Logging)
```
Client says: "I had 2 scrambled eggs and toast with butter"
→ CalorieNinjas API parses → returns: 320 cal, 22g protein, 18g carbs, 18g fat
→ Saved to DailyMacroLog
→ USDA used for detailed micronutrient breakdown if user taps "details"
```

---

### 2. Weather API (Outdoor Training Context)

| API | Free Tier | Features | Best For |
|-----|-----------|----------|----------|
| **Open-Meteo** | Completely free, open source, no auth needed | 14-day forecast, hourly data, air quality | Primary weather widget |
| **OpenWeatherMap** | Free (1,000 calls/day) | Current weather, 5-day forecast | Backup/alternative |
| **WeatherWidget.io** | Free embeddable widget | Customizable, responsive, no signup | Quick embed option |

**Recommended:** Open-Meteo (no API key, no rate limits, open source)

**Integration points:**
- Client Dashboard Overview: "Training Conditions" card showing current weather + outdoor workout recommendation
- Scheduling: Weather-aware session suggestions ("Rain expected Thursday — consider indoor workout")
- Trainer Dashboard: Weather overlay on schedule view for outdoor session planning
```
Sunny 72F → "Great day for outdoor cardio!"
Rainy 45F → "Indoor workout recommended today"
Snow/Ice → "Safety alert: Consider rescheduling outdoor sessions"
```

---

### 3. Exercise Database APIs

| API | Free Tier | Data | Best For |
|-----|-----------|------|----------|
| **ExerciseDB** | Open source (self-host) | 11,000+ exercises, GIFs, images, instructions | Master exercise library |
| **free-exercise-db** | MIT license, public domain | 800+ exercises, JSON format | Lightweight backup |
| **API Ninjas Exercises** | Free tier | 3,000+ exercises by muscle group | Quick muscle-group queries |
| **GymFit API** | Free tier | Exercise data + fitness calculators (TDEE, BMR, BMI) | Calculators + exercise data |

**Recommended:** ExerciseDB (self-host for unlimited access) — supplements existing 81-exercise form analysis library

**Integration points:**
- Exercise library search in workout logger
- Exercise demonstration GIFs/videos during form analysis
- AI chat: "Show me how to do a Romanian deadlift" → returns exercise info + GIF
- Supplement form analysis with proper form reference images

---

### 4. Wearable / Health Device Integration

| API | Free Tier | Devices | Best For |
|-----|-----------|---------|----------|
| **Open Wearables** | MIT license, self-hosted, zero per-user fees | 200+ devices: Apple Health, Samsung, Garmin, Polar, Suunto, Whoop | Primary wearable integration |
| **Terra API** | Free tier available | Apple, Fitbit, Garmin, Oura, Google, 100+ others | Managed integration if self-hosting too complex |
| **Garmin Connect API** | Free for approved developers | Garmin devices | Direct Garmin integration |

**Recommended:** Open Wearables (open source, self-hosted, no per-user fees)

**Integration points:**
- Auto-import workout data from Apple Watch / Garmin / Fitbit
- Heart rate zones during workouts → better RPE estimation
- Sleep data → recovery recommendations
- Step count → daily activity tracking
- Sync to client dashboard automatically
```
Client completes Apple Watch workout → Open Wearables syncs →
WorkoutSession created → XP awarded → Shows on dashboard
```

---

## Tier 2: MEDIUM IMPACT (Implement Second)

### 5. Fitness Calculators

| Calculator | Source | Formula | Use |
|------------|--------|---------|-----|
| **BMI** | GymFit API or built-in | weight/height² | Body composition tracking |
| **BMR** (Basal Metabolic Rate) | Mifflin-St Jeor formula | Age, weight, height, sex | Calorie target calculation |
| **TDEE** (Total Daily Energy Expenditure) | BMR × activity multiplier | Activity level factor | Daily calorie goal |
| **1RM Estimate** | Epley/Brzycki formula | Weight × reps | Strength progress tracking |
| **Body Fat %** | Navy method | Neck, waist, hip measurements | Composition tracking |
| **Wilks Score** | Wilks coefficient table | Bodyweight + total lifted | Strength comparison |

**Recommended:** Build these in-house (simple formulas, no API needed) — but GymFit API can provide validation

**Integration points:**
- Client onboarding: Calculate TDEE → set macro targets automatically
- Client overview: Show BMI/BF% trend
- Workout logger: Auto-calculate estimated 1RM from logged sets
- Trainer view: Compare client Wilks scores for relative strength

---

### 6. Motivational Content

| API | Free Tier | Content | Best For |
|-----|-----------|---------|----------|
| **ZenQuotes.io** | Free, no auth | Motivational/inspirational quotes | Daily motivation widget |
| **Quotable API** | Free, open source | Curated quotes with tags | Category-filtered quotes |
| **Unsplash API** | Free (50 req/hr) | High-res fitness/nature photos | Background images, inspiration |

**Recommended:** ZenQuotes (simplest, no auth) + Unsplash for hero images

**Integration points:**
- Client dashboard: Daily motivational quote card on overview
- Workout completion screen: Congratulatory quote + inspiring image
- Loading screens: Random fitness quote while data loads
- Push notifications: Daily motivation (future PWA feature)

---

### 7. Spotify / Music Integration

| API | Free Tier | Features | Best For |
|-----|-----------|----------|----------|
| **Spotify Web API** | Free (requires user auth) | Playlists, playback control, search | Workout music integration |

**Integration points:**
- Workout session: "Play my workout playlist" button
- AI chat: "Play some high-energy music for my HIIT session"
- Trainer can create/share workout playlists with clients
- Auto-suggest BPM-matched playlists based on workout type:
  - Strength: 120-140 BPM
  - HIIT: 140-170 BPM
  - Yoga/Stretching: 60-80 BPM
  - Cardio: 130-160 BPM

**Note:** Requires Spotify Premium for playback control. Free tier can browse/search/create playlists.

---

### 8. Maps / Location

| API | Free Tier | Features | Best For |
|-----|-----------|----------|----------|
| **Leaflet + OpenStreetMap** | Completely free, open source | Interactive maps, markers, routing | Gym/park finder, outdoor routes |
| **Google Maps** | $200/mo free credit (~28K loads) | Premium maps, Places API | Backup for richer data |

**Integration points:**
- Find nearby gyms/parks for outdoor workouts
- Track outdoor run/walk routes
- Client profile: Home gym vs. studio location
- Trainer: Client location map for scheduling optimization

---

## Tier 3: NICE TO HAVE (Future Enhancement)

### 9. YouTube Data API
- Free (10,000 units/day)
- Embed exercise demonstration videos
- Trainer can link YouTube exercise tutorials to workout plans

### 10. Giphy API
- Free tier available
- Celebration GIFs for achievement unlocks
- Fun engagement in social feed

### 11. Twilio SendGrid (Email)
- Free (100 emails/day)
- Workout reminder emails
- Weekly progress summary emails
- Session confirmation/reminder

### 12. OneSignal (Push Notifications)
- Free tier (unlimited mobile push)
- Workout reminders
- Streak alerts ("Don't break your streak!")
- Session reminders

### 13. Cloudinary (Image Processing)
- Free tier (25 credits/mo)
- Progress photo before/after comparisons
- Automatic image optimization
- Thumbnail generation

---

## Implementation Priority Matrix

| Priority | API | Phase | Effort | Value |
|----------|-----|-------|--------|-------|
| P0 | USDA FoodData Central | A (Macro Logging) | Low | Critical for nutrition tracking |
| P0 | CalorieNinjas | A (AI Chat) | Low | Natural language food parsing |
| P0 | Open-Meteo Weather | D (Overview) | Low | Weather-aware training |
| P1 | ExerciseDB | C (Form Analysis) | Medium | Exercise reference library |
| P1 | Open Wearables | D (Overview) | High | Wearable device sync |
| P1 | ZenQuotes | D (Overview) | Low | Daily motivation |
| P2 | Fitness Calculators | D (Overview) | Low | BMI/TDEE/1RM built-in |
| P2 | Unsplash | D (Overview) | Low | Inspiring imagery |
| P2 | Spotify Web API | B (AI Chat) | Medium | Workout music |
| P3 | Leaflet/OSM | Future | Medium | Location features |
| P3 | YouTube Data | Future | Low | Exercise videos |
| P3 | OneSignal | Future | Medium | Push notifications |

---

## API Key Management

All API keys should be stored in `.env` (never committed):
```env
# Nutrition APIs
USDA_API_KEY=           # Optional - USDA works without key but rate limited
CALORIE_NINJAS_KEY=     # Free tier key from calorieninjas.com

# Weather (Open-Meteo needs NO key)

# Exercise DB (self-hosted, no key needed)

# Wearable Integration
OPEN_WEARABLES_KEY=     # Self-hosted, configure in deployment

# Content
UNSPLASH_ACCESS_KEY=    # Free developer account
ZENQUOTES_KEY=          # No key needed for basic tier

# Music
SPOTIFY_CLIENT_ID=      # From Spotify Developer Dashboard
SPOTIFY_CLIENT_SECRET=

# Future
YOUTUBE_API_KEY=
ONESIGNAL_APP_ID=
SENDGRID_API_KEY=
```

---

## Quick Wins (Can Add This Sprint)

1. **Open-Meteo Weather Widget** — No API key, 5 lines of fetch code, instant value on client overview
2. **ZenQuotes Daily Quote** — No auth, single GET request, motivational card on dashboard
3. **USDA Food Lookup** — Free, add to AI chat for macro validation
4. **BMI/BMR/TDEE Calculators** — Pure math, no API needed, add to client onboarding
5. **CalorieNinjas** — Natural language food parsing for AI macro logging

---

*SwanStudios Free API Integration Research v1.0*
*Generated: 2026-03-07*

## Sources
- [USDA FoodData Central](https://fdc.nal.usda.gov/)
- [CalorieNinjas API](https://calorieninjas.com/)
- [Open Food Facts](https://world.openfoodfacts.org/)
- [Edamam Nutrition API](https://developer.edamam.com/edamam-nutrition-api)
- [FatSecret Platform API](https://platform.fatsecret.com/platform-api)
- [Open-Meteo Weather API](https://open-meteo.com/)
- [OpenWeatherMap](https://openweathermap.org/api)
- [WeatherWidget.io](https://weatherwidget.io/)
- [ExerciseDB API](https://exercisedb.dev/)
- [free-exercise-db (GitHub)](https://github.com/yuhonas/free-exercise-db)
- [GymFit API](https://www.gymfit-api.com/)
- [Open Wearables](https://www.openwearables.io/)
- [Terra Wearable API](https://tryterra.co)
- [Garmin Connect Developer](https://developer.garmin.com/gc-developer-program/activity-api/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- [Unsplash API](https://unsplash.com/developers)
- [14 Best Fitness APIs (GetStream)](https://getstream.io/blog/fitness-api/)
- [14 Best Fitness APIs (MirrorFly)](https://www.mirrorfly.com/blog/fitness-api/)
