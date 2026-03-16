# Code Quality — Validation Report

> **Status:** PASS | **Model:** anthropic/claude-4.5-sonnet-20250929 | **Duration:** 49.6s
> **Files:** frontend/src/utils/badgeImageResolver.ts, backend/seeders/20260315000001-seed-manifest-achievements.cjs
> **Generated:** 3/15/2026, 6:12:34 PM

---

# Code Review: Badge Image Resolver & Achievement Seeder

## frontend/src/utils/badgeImageResolver.ts

### CRITICAL Issues

**C1. Unsafe Type Assertion with `any`**
```ts
const achievements = (badgeManifest as any).achievements as Record<string, BadgeEntry>;
```
- **Issue**: Using `any` bypasses all type safety. If `badgeManifest` structure changes, runtime errors will occur.
- **Fix**: Define proper manifest type and validate structure:
```ts
interface BadgeManifest {
  achievements: Record<string, BadgeEntry>;
  version?: string;
}

// Type guard
function isBadgeManifest(obj: unknown): obj is BadgeManifest {
  return typeof obj === 'object' && obj !== null && 'achievements' in obj;
}

const manifest = badgeManifest as unknown;
if (!isBadgeManifest(manifest)) {
  throw new Error('Invalid badge manifest structure');
}
const achievements = manifest.achievements;
```

---

### HIGH Issues

**H1. DRY Violation: Duplicated Tier Stripping Logic**
```ts
// Appears in getBadgeImage, getBadgeImages, and getBadgeEntry
const baseName = achievementName.replace(/_tier\d+$/, '');
```
- **Issue**: Same regex logic repeated 3 times. Changes require updating multiple locations.
- **Fix**: Extract to helper function:
```ts
/**
 * Normalize achievement name by stripping tier suffix.
 * @example "first_login_tier2" → "first_login"
 */
function normalizeAchievementName(name: string): string {
  return name.replace(/_tier\d+$/, '');
}

// Then use in all functions:
const baseName = normalizeAchievementName(achievementName);
```

**H2. DRY Violation: Duplicated Lookup Pattern**
```ts
// Pattern repeated in all 3 getter functions:
const entry = achievements[achievementName];
if (entry) return /* ... */;

const baseName = achievementName.replace(/_tier\d+$/, '');
const baseEntry = achievements[baseName];
if (baseEntry) return /* ... */;
```
- **Issue**: Lookup logic duplicated across functions.
- **Fix**: Extract base lookup function:
```ts
/**
 * Find badge entry by name, with fallback to base name (tier stripped).
 */
function findBadgeEntry(achievementName: string): BadgeEntry | null {
  const entry = achievements[achievementName];
  if (entry) return entry;
  
  const baseName = normalizeAchievementName(achievementName);
  return achievements[baseName] || null;
}

export function getBadgeImage(
  achievementName: string | undefined | null,
  style: BadgeStyle = 'glass'
): string | null {
  if (!achievementName) return null;
  const entry = findBadgeEntry(achievementName);
  return entry?.images?.[style] || null;
}

export function getBadgeImages(
  achievementName: string | undefined | null
): BadgeImages | null {
  if (!achievementName) return null;
  const entry = findBadgeEntry(achievementName);
  return entry?.images || null;
}

export function getBadgeEntry(
  achievementName: string | undefined | null
): BadgeEntry | null {
  if (!achievementName) return null;
  return findBadgeEntry(achievementName);
}
```

**H3. Missing Error Handling for Manifest Load**
- **Issue**: If `badge-manifest.json` is missing, malformed, or empty, the module will fail silently or throw cryptic errors.
- **Fix**: Add validation at module initialization:
```ts
if (!achievements || Object.keys(achievements).length === 0) {
  console.error('[BadgeImageResolver] Badge manifest is empty or invalid');
  // Consider throwing in development, logging in production
}
```

---

### MEDIUM Issues

**M1. Overly Permissive Generic Constraint**
```ts
export function enrichWithBadgeImage<T extends { name?: string; templateId?: string; iconUrl?: string | null }>
```
- **Issue**: Generic accepts any object with optional properties. Could lead to unexpected behavior if called with wrong types.
- **Fix**: Define explicit interface:
```ts
export interface EnrichableAchievement {
  name?: string;
  templateId?: string;
  iconUrl?: string | null;
}

export function enrichWithBadgeImage<T extends EnrichableAchievement>(
  achievement: T,
  style: BadgeStyle = 'glass'
): T & { iconUrl: string | null } {
  // Implementation
}
```

**M2. Inconsistent Null Handling**
```ts
// getBadgeImage returns null, but enrichWithBadgeImage always returns object
iconUrl: existingUrl || getBadgeImage(name, style), // Could be null
```
- **Issue**: Type signature says `iconUrl: string | null` but logic doesn't make it clear when null is intentional vs. error state.
- **Fix**: Add explicit null handling with logging:
```ts
const name = achievement.name || achievement.templateId;
if (!name) {
  console.warn('[BadgeImageResolver] Achievement missing name and templateId', achievement);
}

const resolvedUrl = existingUrl || getBadgeImage(name, style);
if (!resolvedUrl && name) {
  console.warn(`[BadgeImageResolver] No badge image found for: ${name}`);
}

return {
  ...achievement,
  iconUrl: resolvedUrl,
};
```

**M3. Missing JSDoc for Type Parameters**
- **Issue**: Generic functions lack documentation for type parameter constraints.
- **Fix**: Add JSDoc:
```ts
/**
 * Enrich an achievement object with badge image URL.
 * Sets iconUrl from manifest if not already set.
 * 
 * @template T - Achievement object type (must have name/templateId and iconUrl)
 * @param achievement - Achievement to enrich
 * @param style - Badge style to use (defaults to 'glass')
 * @returns Achievement with resolved iconUrl
 */
```

---

### LOW Issues

**L1. Magic String: Default Style**
```ts
style: BadgeStyle = 'glass'
```
- **Issue**: 'glass' hardcoded as default in multiple places. If default changes, multiple updates needed.
- **Fix**: Define constant:
```ts
export const DEFAULT_BADGE_STYLE: BadgeStyle = 'glass';

export function getBadgeImage(
  achievementName: string | undefined | null,
  style: BadgeStyle = DEFAULT_BADGE_STYLE
): string | null {
  // ...
}
```

**L2. Potential Performance: Array Map in Batch Function**
```ts
export function enrichAllWithBadgeImages<T extends { name?: string; templateId?: string; iconUrl?: string | null }>(
  achievements: T[],
  style: BadgeStyle = 'glass'
): (T & { iconUrl: string | null })[] {
  return achievements.map(a => enrichWithBadgeImage(a, style));
}
```
- **Issue**: For large arrays, this creates many intermediate objects. Not critical but could be optimized.
- **Note**: Likely fine for typical use cases (< 1000 achievements), but consider memoization if called frequently in React components.

---

## backend/seeders/20260315000001-seed-manifest-achievements.cjs

### CRITICAL Issues

**C2. Unsafe File Read Without Error Handling**
```js
const manifestPath = path.resolve(__dirname, '../../scripts/achievement-badge-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
```
- **Issue**: If file doesn't exist or contains invalid JSON, seeder crashes with unhelpful error.
- **Fix**: Add try/catch with descriptive error:
```js
let manifest;
try {
  const manifestPath = path.resolve(__dirname, '../../scripts/achievement-badge-manifest.json');
  const fileContent = fs.readFileSync(manifestPath, 'utf-8');
  manifest = JSON.parse(fileContent);
} catch (error) {
  console.error('[Badge Seeder] Failed to load achievement manifest:', error.message);
  throw new Error(
    `Cannot seed achievements: manifest file missing or invalid at ${manifestPath}`
  );
}
```

**C3. No Transaction Wrapping**
```js
await queryInterface.bulkDelete('Achievements', null, {});
// ... later ...
await queryInterface.bulkInsert('Achievements', batch, {});
```
- **Issue**: If insert fails mid-batch, database left in inconsistent state (all achievements deleted, partial insert).
- **Fix**: Wrap in transaction:
```js
const transaction = await queryInterface.sequelize.transaction();
try {
  await queryInterface.bulkDelete('Achievements', null, { transaction });
  
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await queryInterface.bulkInsert('Achievements', batch, { transaction });
  }
  
  await transaction.commit();
  console.log(`[Badge Seeder] Successfully seeded ${rows.length} achievements`);
} catch (error) {
  await transaction.rollback();
  console.error('[Badge Seeder] Seeding failed, rolled back:', error);
  throw error;
}
```

---

### HIGH Issues

**H4. DRY Violation: Hardcoded Image Path Pattern**
```js
const imagePaths = {
  claymation: `/badges/achievements/${tpl.name}_claymation.png`,
  glass: `/badges/achievements/${tpl.name}_glass.png`,
  metallic: `/badges/achievements/${tpl.name}_metallic.png`,
};
```
- **Issue**: Path structure hardcoded. If badge directory changes, requires code update.
- **Fix**: Extract to constant/function:
```js
const BADGE_BASE_PATH = '/badges/achievements';
const BADGE_STYLES = ['claymation', 'glass', 'metallic'];

function generateBadgeImagePaths(achievementName) {
  return BADGE_STYLES.reduce((acc, style) => {
    acc[style] = `${BADGE_BASE_PATH}/${achievementName}_${style}.png`;
    return acc;
  }, {});
}

// Usage:
const imagePaths = generateBadgeImagePaths(tpl.name);
```

**H5. DRY Violation: Duplicated Rarity Pattern Matching**
```js
function assignRarity(name, skillTree) {
  const legendaryPatterns = [ /* 10+ patterns */ ];
  if (legendaryPatterns.some(p => p.test(name))) return 'legendary';
  
  const epicPatterns = [ /* 20+ patterns */ ];
  if (epicPatterns.some(p => p.test(name))) return 'epic';
  
  const rarePatterns = [ /* 30+ patterns */ ];
  if (rarePatterns.some(p => p.test(name))) return 'rare';
  
  return 'common';
}
```
- **Issue**: Pattern matching logic is brittle and hard to maintain. Adding new achievement requires code change.
- **Fix**: Move rarity to manifest JSON:
```js
// In achievement-badge-manifest.json:
{
  "name": "workout_count_1000",
  "rarity": "legendary",  // ← Add this field
  // ...
}

// In seeder:
const rarity = tpl.rarity || assignRarity(tpl.name, tpl.skillTree);
```

**H6. Magic Numbers: XP Values**
```js
const XP_BY_CATEGORY = {
  milestone: 50,
  fitness: 60,
  social: 30,
  // ...
};

const XP_MULTIPLIER = {
  common: 1,
  rare: 2,
  epic: 4,
  legendary: 10,
};
```
- **Issue**: Game balance values hardcoded in seeder. Should be in config file for easier tuning.
- **Fix**: Move to separate config:
```js
// config/achievement-rewards.json
{
  "xpByCategory": { "milestone": 50, /* ... */ },
  "xpMultiplier": { "common": 1, /* ... */ }
}

// In seeder:
const rewardConfig = require('../../config/achievement-rewards.json');
const baseXp = rewardConfig.xpByCategory[effectiveCategory] || 50;
```

---

### MEDIUM Issues

**M4. Inconsistent Error Handling**
```js
if (!templates || templates.length === 0) {
  throw new Error('No templates found in achievement-badge-manifest.json');
}
```
- **Issue**: Only checks templates, doesn't validate structure of individual templates.
- **Fix**: Add template validation:
```js
function validateTemplate(tpl, index) {
  const required = ['name', 'title', 'description', 'skillTree', 'category'];
  const missing = required.filter(field => !tpl[field]);
  
  if (missing.length > 0) {
    throw new Error(
      `Template at index ${index} missing required fields: ${missing.join(', ')}`
    );
  }
}

templates.forEach((tpl, idx) => validateTemplate(tpl, idx));
```

**M5. Potential Data Inconsistency: Duplicate Storage**
```js
tags: JSON.stringify({
  skillTree: tpl.skillTree,
  skillTreeOrder,
  templateId: tpl.name,
  tierLevel: 1,
  images: imagePaths,
}),
skillTree: tpl.skillTree || null,
skillTreeOrder,
templateId: tpl.name,
tierLevel: 1,
```
- **Issue**: `skillTree`, `skillTreeOrder`, `templateId`, `tierLevel` stored both in `tags` JSONB and as separate columns. Risk of desync.
- **Fix**: Choose one source of truth:
```js
// Option 1: Remove from tags (if columns are indexed)
tags: JSON.stringify({
  images: imagePaths,
  metadata: { /* other non-indexed data */ }
}),

// Option 2: Remove columns (if JSONB queries are acceptable)
// Keep only in tags
```

**M6. Unclear Category Mapping**
```js
const effectiveCategory = tpl.category === 'hidden' ? 'special' : tpl.category;
// ... later ...
category: ['fitness', 'social', 'streak', 'milestone', 'special', 'community'].includes(effectiveCategory)
  ? effectiveCategory
  : 'special',
```
- **Issue**: Category validation happens after transformation. Could mask data issues.
- **Fix**: Validate and transform separately:
```js
const VALID_CATEGORIES = ['fitness', 'social', 'streak', 'milestone', 'special', 'community'];

function normalizeCategory(category) {
  if (category === 'hidden') return 'special';
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`[Badge Seeder] Invalid category "${category}", defaulting to "special"`);
    return 'special';
  }
  return category;
}

const category = normalizeCategory(tpl.category);
```

**M7. Hardcoded Difficulty Mapping**
```js
difficulty: rarity === 'legendary' ? 5 : rarity === 'epic' ? 4 : rarity === 'rare' ? 3 : rarity === 'common' ? 1 : 2,
```
- **Issue**: Nested ternaries hard to read. Doesn't handle unknown rarities well.
- **Fix**: Use lookup object:
```js
const DIFFICULTY_BY_RARITY = {
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
};

const difficulty = DIFFICULTY_BY_RARITY[rarity] || 2;
```

---

### LOW Issues

**L3. Console Logs in Production Seeder**
```js
console.log(`[Badge Seeder] Processing ${templates.length} achievement templates...`);
console.log('[Badge Seeder] By skill tree:', JSON.stringify(byTree));
```
- **Issue**: Verbose logging may clutter production logs.
- **

---

*Part of SwanStudios 9-Brain Recursive Consensus System*
