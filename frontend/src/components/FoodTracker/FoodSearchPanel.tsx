/**
 * ============================================================================
 * FILE: FoodSearchPanel.tsx
 * PURPOSE: Search foods across USDA FoodData Central + Open Food Facts APIs
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Queries two free public food APIs (USDA and Open Food
 * Facts) in parallel when the user types a search term. Results are merged,
 * deduplicated, and displayed as nutrition cards with macro breakdowns.
 *
 * HOW IT FITS IN THE APP: FoodTracker tab -> FoodSearchPanel (this) -> user clicks
 * "Add to <meal>" -> POST /api/macros (self-serve, Decision #2) logs it to today.
 *
 * KEY DECISIONS: Dual-API approach gives USDA accuracy + OFF international
 * coverage. Promise.allSettled ensures one API failure doesn't block results.
 * Category filtering is client-side on already-fetched results.
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { Search, Filter, Plus, Loader2, Check } from 'lucide-react';
import { theme } from '../../theme/tokens';
import { MEAL_TYPE_OPTIONS } from './mealPhotoLog';
import { formatMealLabel, useFoodSearchAddToLog } from './useFoodSearchAddToLog';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// PURPOSE: FoodResult interface, API config, category definitions
// ─────────────────────────────────────────────────────────────

interface FoodResult {
  id: string | number; name: string; brand?: string; category?: string;
  calories: number; protein: number; carbs: number; fat: number;
  servingSize?: string; healthRating?: 'good' | 'okay' | 'bad'; organic?: boolean;
  source?: 'USDA' | 'OFF';
  // Safety / ingredient metadata (populated if backend enrichment available)
  iarcGroup?: '1' | '2A' | '2B';
  isEUBanned?: boolean;
  isGMO?: boolean;
}

/** USDA nutrient IDs: 208=Energy(kcal), 203=Protein, 204=Fat, 205=Carbs */
interface USDANutrient {
  nutrientNumber: string;
  value: number;
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandName?: string;
  brandOwner?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

interface OFFProduct {
  _id: string;
  product_name?: string;
  brands?: string;
  categories_tags_en?: string[];
  categories?: string;
  serving_quantity?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    fat_100g?: number;
    carbohydrates_100g?: number;
  };
}

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
const USDA_ENDPOINT = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const OFF_ENDPOINT = 'https://world.openfoodfacts.org/cgi/search.pl';

const CATEGORIES = [
  'All', 'Protein', 'Vegetables', 'Fruits', 'Grains',
  'Dairy', 'Snacks', 'Beverages', 'International',
] as const;

const foodTheme = {
  panel: 'color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent)',
  panelDeep: 'color-mix(in srgb, var(--bg-base, #0A0A0F) 60%, transparent)',
  input: 'color-mix(in srgb, var(--bg-elevated, #141419) 58%, transparent)',
  border: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)',
  borderSoft: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)',
  borderHover: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)',
  accent: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  gold: 'var(--accent-gold, #C6A84B)',
  danger: 'var(--accent-error, #C92A54)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
  textDisabled: 'var(--text-muted, rgba(224, 236, 244, 0.4))',
  inverse: 'var(--text-inverse, #0F172A)',
  focus: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)',
  glow: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)',
  shadow: '0 8px 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 70%, transparent)',
} as const;

/**
 * Maps category chip to keywords used for client-side filtering.
 * Matched against the food name + category fields (case-insensitive).
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Protein: ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'egg', 'tofu', 'protein', 'meat', 'steak', 'lamb', 'sausage', 'bacon', 'ham', 'whey', 'casein'],
  Vegetables: ['vegetable', 'broccoli', 'spinach', 'carrot', 'lettuce', 'tomato', 'pepper', 'onion', 'kale', 'celery', 'cucumber', 'zucchini', 'cauliflower', 'corn', 'peas', 'bean', 'potato', 'sweet potato', 'cabbage', 'asparagus', 'mushroom', 'salad', 'greens'],
  Fruits: ['fruit', 'apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry', 'mango', 'pineapple', 'peach', 'pear', 'melon', 'watermelon', 'cherry', 'lemon', 'lime', 'avocado', 'kiwi'],
  Grains: ['grain', 'bread', 'rice', 'pasta', 'oat', 'wheat', 'cereal', 'quinoa', 'barley', 'tortilla', 'flour', 'noodle', 'bagel', 'muffin', 'cracker', 'granola'],
  Dairy: ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 'ice cream', 'cottage', 'mozzarella', 'cheddar', 'parmesan', 'whey'],
  Snacks: ['snack', 'chip', 'cookie', 'cake', 'candy', 'chocolate', 'bar', 'pretzel', 'popcorn', 'cracker', 'trail mix', 'nuts', 'almond', 'peanut', 'cashew', 'walnut', 'granola bar'],
  Beverages: ['beverage', 'drink', 'juice', 'soda', 'water', 'tea', 'coffee', 'smoothie', 'shake', 'beer', 'wine', 'milk', 'lemonade', 'energy drink', 'sports drink', 'kombucha'],
  International: ['sushi', 'ramen', 'curry', 'kimchi', 'naan', 'hummus', 'falafel', 'taco', 'burrito', 'gyoza', 'pho', 'pad thai', 'tikka', 'dim sum', 'samosa', 'empanada', 'pierogi', 'borscht', 'paella', 'bibimbap', 'miso', 'tempura', 'dosa', 'biryani'],
};

// ─────────────────────────────────────────────────────────────
// SECTION: API Helpers
// PURPOSE: Query USDA + OFF, map to FoodResult, deduplicate
// ─────────────────────────────────────────────────────────────

/** Extract a specific nutrient value from the USDA foodNutrients array */
function usdaNutrient(nutrients: USDANutrient[], id: string): number {
  const n = nutrients.find((x) => x.nutrientNumber === id);
  return n ? Math.round(n.value) : 0;
}

/** Map a USDA food item to our FoodResult interface */
function mapUSDA(item: USDAFood): FoodResult {
  const servingLabel = item.servingSize && item.servingSizeUnit
    ? `${item.servingSize}${item.servingSizeUnit}`
    : '100g';
  return {
    id: `usda-${item.fdcId}`,
    name: titleCase(item.description),
    brand: item.brandOwner || item.brandName || undefined,
    category: item.foodCategory || undefined,
    calories: usdaNutrient(item.foodNutrients, '208'),
    protein: usdaNutrient(item.foodNutrients, '203'),
    fat: usdaNutrient(item.foodNutrients, '204'),
    carbs: usdaNutrient(item.foodNutrients, '205'),
    servingSize: servingLabel,
    source: 'USDA',
  };
}

/** Map an Open Food Facts product to our FoodResult interface */
function mapOFF(item: OFFProduct): FoodResult | null {
  // Skip items with no name or no nutrient data
  if (!item.product_name || !item.nutriments) return null;
  const n = item.nutriments;
  return {
    id: `off-${item._id}`,
    name: titleCase(item.product_name),
    brand: item.brands || undefined,
    category: item.categories
      ? item.categories.split(',')[0]?.trim()
      : undefined,
    calories: Math.round(n['energy-kcal_100g'] || 0),
    protein: Math.round(n.proteins_100g || 0),
    fat: Math.round(n.fat_100g || 0),
    carbs: Math.round(n.carbohydrates_100g || 0),
    servingSize: item.serving_quantity ? `${item.serving_quantity}g` : '100g',
    source: 'OFF',
  };
}

/** Title-case a food name (USDA returns ALL CAPS) */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(?:^|\s|[-/,(])\S/g, (c) => c.toUpperCase());
}

/**
 * Simple deduplication: if two items have very similar names (after
 * lowercasing + stripping punctuation), keep only the USDA version.
 */
function deduplicateResults(items: FoodResult[]): FoodResult[] {
  const seen = new Map<string, FoodResult>();
  for (const item of items) {
    const key = item.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
    // If already seen, prefer USDA (more reliable nutrient data)
  }
  return Array.from(seen.values());
}

/** Check if a food matches a category based on keyword matching */
function matchesCategory(food: FoodResult, cat: string): boolean {
  if (cat === 'All') return true;
  const keywords = CATEGORY_KEYWORDS[cat];
  if (!keywords) return true;
  const haystack = `${food.name} ${food.category || ''} ${food.brand || ''}`.toLowerCase();
  return keywords.some((kw) => haystack.includes(kw));
}

async function fetchUSDA(query: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    api_key: USDA_API_KEY,
    query,
    pageSize: '15',
  });
  const res = await fetch(`${USDA_ENDPOINT}?${params}`);
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const data = await res.json();
  const foods: USDAFood[] = data.foods || [];
  return foods.map(mapUSDA);
}

async function fetchOFF(query: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '15',
  });
  const res = await fetch(`${OFF_ENDPOINT}?${params}`);
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const data = await res.json();
  const products: OFFProduct[] = data.products || [];
  return products.map(mapOFF).filter((x): x is FoodResult => x !== null);
}

// ─────────────────────────────────────────────────────────────
// SECTION: Ingredient / Safety Helpers
// PURPOSE: Health rating colors + safety badge component
// ─────────────────────────────────────────────────────────────

const healthBorderColor = (rating?: 'good' | 'okay' | 'bad'): string => {
  if (rating === 'good') return foodTheme.accent;
  if (rating === 'okay') return foodTheme.gold;
  if (rating === 'bad') return foodTheme.danger;
  return 'transparent';
};

interface BadgeProps { group?: '1' | '2A' | '2B'; isEUBanned?: boolean; isGMO?: boolean }
const IngredientBadge: React.FC<BadgeProps> = ({ group, isEUBanned, isGMO }) => (
  <>
    {group === '1' && <SafetyPill $color={foodTheme.danger}>IARC-1</SafetyPill>}
    {group === '2A' && <SafetyPill $color={foodTheme.gold}>IARC-2A</SafetyPill>}
    {group === '2B' && <SafetyPill $color={foodTheme.gold} $dim>IARC-2B</SafetyPill>}
    {isEUBanned && <SafetyPill $color={foodTheme.danger}>EU Banned</SafetyPill>}
    {isGMO && <SafetyPill $color={foodTheme.gold}>GMO</SafetyPill>}
  </>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan themed UI for search, filter, cards
// ─────────────────────────────────────────────────────────────

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

const Wrap = styled.div`
  width: 100%; max-width: 1200px; margin: 0 auto; padding: ${theme.spacing.lg};
  @media (max-width: 430px) { padding: ${theme.spacing.md}; }
`;
const SearchBar = styled.div`position: relative; margin-bottom: ${theme.spacing.lg};`;
const SIcon = styled(Search)`
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: ${foodTheme.textSoft}; pointer-events: none;
`;
const SInput = styled.input`
  width: 100%; height: 48px; padding: 0 ${theme.spacing.md} 0 44px;
  background: ${foodTheme.input}; border: 1px solid ${foodTheme.border};
  border-radius: 12px; color: ${foodTheme.text};
  font-family: 'Sora', sans-serif; font-size: ${theme.typography.scale.base}; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: ${foodTheme.textDisabled}; }
  &:focus { border-color: ${foodTheme.accentSecondary}; box-shadow: 0 0 0 3px ${foodTheme.focus}; }
`;
const Filters = styled.div`
  display: flex; gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.lg};
  overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent); border-radius: 2px; }
`;
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 22px;
  border: 1px solid ${({ $on }) => $on ? foodTheme.accentSecondary : foodTheme.border};
  background: ${({ $on }) => $on ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)' : foodTheme.input};
  color: ${({ $on }) => $on ? foodTheme.text : foodTheme.textSoft};
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.2s;
  &:hover { border-color: ${foodTheme.accentSecondary}; }
`;
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.md};
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
const Card = styled.div<{ $healthRating?: 'good' | 'okay' | 'bad' }>`
  background: ${foodTheme.panel}; backdrop-filter: blur(16px);
  border: 1px solid ${foodTheme.borderSoft}; border-radius: 16px;
  border-left: 3px solid ${({ $healthRating }) => healthBorderColor($healthRating)};
  box-shadow: ${foodTheme.shadow}; padding: ${theme.spacing.lg};
  animation: ${fadeUp} 0.3s ease-out both; transition: transform 0.2s, border-color 0.2s;
  will-change: transform;
  &:hover { transform: translateY(-2px); border-color: ${foodTheme.borderHover}; }
  @media (prefers-reduced-motion: reduce) { animation: none; transition: border-color 0.2s; &:hover { transform: none; } }
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.md};
`;
const Name = styled.h3`
  margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: ${theme.typography.scale.lg}; font-weight: ${theme.typography.weight.semibold};
  color: ${foodTheme.text}; line-height: 1.3;
`;
const Meta = styled.span`
  font-size: ${theme.typography.scale.xs}; color: ${foodTheme.textSoft};
  font-family: 'Sora', sans-serif;
`;

/** Small badge showing which API the result came from */
const SourceBadge = styled.span<{ $src: 'USDA' | 'OFF' }>`
  display: inline-flex; align-items: center; padding: 2px 8px;
  border-radius: 6px; font-size: 0.65rem; font-weight: ${theme.typography.weight.semibold};
  font-family: 'Fira Code', monospace; letter-spacing: 0.5px; flex-shrink: 0;
  background: ${({ $src }) =>
    $src === 'USDA' ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)' : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 15%, transparent)'};
  color: ${({ $src }) =>
    $src === 'USDA' ? foodTheme.accent : foodTheme.gold};
  border: 1px solid ${({ $src }) =>
    $src === 'USDA' ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)' : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)'};
`;

const Kcal = styled.div`
  font-family: 'Fira Code', monospace; font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold}; color: ${foodTheme.text};
  margin-bottom: ${theme.spacing.md};
  span { font-size: ${theme.typography.scale.sm}; color: ${foodTheme.textSoft}; }
`;
const Macros = styled.div`display: flex; gap: ${theme.spacing.md}; margin-bottom: ${theme.spacing.md};`;
const Macro = styled.div<{ $c: string }>`
  flex: 1; text-align: center; padding: ${theme.spacing.sm}; border-radius: 8px;
  background: ${foodTheme.panelDeep};
  .v { font: ${theme.typography.weight.semibold} ${theme.typography.scale.base} 'Fira Code', monospace; color: ${({ $c }) => $c}; }
  .l { font-size: ${theme.typography.scale.xs}; color: ${foodTheme.textSoft}; margin-top: 2px; }
`;
const AddBtn = styled.button`
  width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center;
  gap: ${theme.spacing.sm}; background: linear-gradient(135deg, ${foodTheme.accentSecondary}, ${foodTheme.accent}); border: none; border-radius: 10px;
  color: ${foodTheme.inverse}; font: ${theme.typography.weight.semibold} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; transition: box-shadow 0.2s, transform 0.15s;
  &:hover:not(:disabled) { box-shadow: 0 0 16px ${foodTheme.glow}; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: 0.6; cursor: default; }
  @media (prefers-reduced-motion: reduce) { transition: box-shadow 0.2s; &:hover:not(:disabled) { transform: none; } }
`;

const MealRow = styled.div`
  display: flex; align-items: center; gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.md};
  label { color: ${foodTheme.textSoft}; font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif; }
`;
const MealSelect = styled.select`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 10px;
  border: 1px solid ${foodTheme.border}; background: ${foodTheme.input}; color: ${foodTheme.text};
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif; cursor: pointer;
`;
const Spin = styled(Loader2)`
  animation: ${spin} 0.8s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const SafetyPill = styled.span<{ $color: string; $dim?: boolean }>`
  display: inline-flex; align-items: center;
  padding: 2px 6px; border-radius: 4px; margin-left: 4px;
  font-family: 'Sora', sans-serif; font-size: 10px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid ${({ $color }) => $color};
  color: ${({ $color }) => $color};
  background: ${({ $color, $dim }) => `color-mix(in srgb, ${$color} ${$dim ? '6%' : '10%'}, transparent)`};
`;
const Empty = styled.div`
  text-align: center; padding: ${theme.spacing['2xl']} ${theme.spacing.lg};
  color: ${foodTheme.textSoft}; font-family: 'Sora', sans-serif;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Main search panel with debounced dual-API queries
// ─────────────────────────────────────────────────────────────

interface FoodSearchPanelProps {
  onDataSent?: (success: boolean) => void;
}

const FoodSearchPanel: React.FC<FoodSearchPanelProps> = ({ onDataSent }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [allResults, setAllResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { addError, addToLog, addedIds, mealType, savingId, setMealType } = useFoodSearchAddToLog(onDataSent);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Query USDA + Open Food Facts in parallel via Promise.allSettled.
   * If one API fails, results from the other still display.
   */
  const doSearch = useCallback(async (q: string) => {
    const t = q.trim();
    if (!t) { setAllResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const [usdaResult, offResult] = await Promise.allSettled([
        fetchUSDA(t),
        fetchOFF(t),
      ]);

      const usdaFoods = usdaResult.status === 'fulfilled' ? usdaResult.value : [];
      const offFoods = offResult.status === 'fulfilled' ? offResult.value : [];

      // USDA first (more reliable nutrient data), then OFF (international coverage)
      const merged = [...usdaFoods, ...offFoods];
      const deduped = deduplicateResults(merged);

      setAllResults(deduped);
    } catch {
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search by 400ms (slightly longer for external APIs)
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query), 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, doSearch]);

  // Client-side category filtering on already-fetched results
  const filteredResults = useMemo(
    () => allResults.filter((f) => matchesCategory(f, category)),
    [allResults, category],
  );

  // Search result saves live in useFoodSearchAddToLog; this panel keeps presentation state.
  return (
    <Wrap>
      <SearchBar>
        <SIcon size={18} />
        <SInput
          type="text" aria-label="Search foods" placeholder="Search foods... (e.g. chicken breast, oatmeal)"
          value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
        />
      </SearchBar>

      <Filters>
        <Filter size={16} style={{ flexShrink: 0, alignSelf: 'center', color: foodTheme.textSoft }} />
        {CATEGORIES.map((c) => (
          <Chip key={c} $on={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </Filters>

      <MealRow>
        <label htmlFor="food-search-meal-type">Add to</label>
        <MealSelect id="food-search-meal-type" value={mealType} onChange={(e) => setMealType(e.target.value)}>
          {MEAL_TYPE_OPTIONS.map((m) => <option key={m} value={m}>{formatMealLabel(m)}</option>)}
        </MealSelect>
      </MealRow>
      {addError && <Empty role="alert" style={{ color: foodTheme.danger, padding: '8px' }}>{addError}</Empty>}

      {loading && <Empty><Spin size={28} /></Empty>}
      {!loading && searched && filteredResults.length === 0 && (
        <Empty>No foods found. Try a different search term or category.</Empty>
      )}

      {!loading && filteredResults.length > 0 && (
        <Grid>
          {filteredResults.map((f, i) => (
            <Card key={f.id ?? i} $healthRating={f.healthRating} style={{ animationDelay: `${i * 50}ms` }}>
              <Header>
                <div>
                  <Name>
                    {f.name}
                    <IngredientBadge group={f.iarcGroup} isEUBanned={f.isEUBanned} isGMO={f.isGMO} />
                  </Name>
                  {(f.brand || f.servingSize) && (
                    <Meta>{[f.brand, f.servingSize].filter(Boolean).join(' - ')}</Meta>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {f.source && <SourceBadge $src={f.source}>{f.source}</SourceBadge>}
                  {f.category && <Meta>{f.category}</Meta>}
                </div>
              </Header>
              <Kcal>{f.calories} <span>kcal</span></Kcal>
              <Macros>
                <Macro $c={foodTheme.accent}><div className="v">{f.protein}g</div><div className="l">Protein</div></Macro>
                <Macro $c={foodTheme.accentSecondary}><div className="v">{f.carbs}g</div><div className="l">Carbs</div></Macro>
                <Macro $c={foodTheme.gold}><div className="v">{f.fat}g</div><div className="l">Fat</div></Macro>
              </Macros>
              <AddBtn
                onClick={() => addToLog(f)}
                disabled={savingId != null || addedIds.has(f.id)}
                aria-label={addedIds.has(f.id) ? `${f.name} added to ${formatMealLabel(mealType)}` : `Add ${f.name} to ${formatMealLabel(mealType)}`}
              >
                {addedIds.has(f.id)
                  ? <><Check size={18} /> Added</>
                  : savingId === f.id
                    ? <><Spin size={18} /> Adding...</>
                    : <><Plus size={18} /> Add to {formatMealLabel(mealType)}</>}
              </AddBtn>
            </Card>
          ))}
        </Grid>
      )}
    </Wrap>
  );
};

export default FoodSearchPanel;
