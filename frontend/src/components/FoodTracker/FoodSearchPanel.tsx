/**
 * COMPONENT: FoodSearchPanel
 * PURPOSE: Debounced food search and self-serve macro logging for NutritionWorkspace.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-21
 *
 * WIREFRAME:
 * [Search input]
 * [Category chips]
 * [Meal type selector]
 * [Result grid: food card -> macros -> Add button]
 *
 * DATA FLOW:
 * Props In:  { onDataSent?: (success: boolean) => void }
 * State:     { query, category, allResults, loading, searched }
 * API Calls: GET /api/nutrition/food-search via FoodSearchPanel.logic, POST /api/macros via useFoodSearchAddToLog
 * Events:    onDataSent(true|false) informs NutritionWorkspace macro refresh
 * Children:  styled primitives from FoodSearchPanel.styles
 *
 * ARCHITECTURE:
 * graph TD
 *   NutritionWorkspace --> FoodSearchPanel
 *   FoodSearchPanel --> FoodSearchPanelLogic
 *   FoodSearchPanel --> FoodSearchPanelStyles
 *   FoodSearchPanel --> useFoodSearchAddToLog
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Filter, Plus } from 'lucide-react';
import { MEAL_TYPE_OPTIONS } from './mealPhotoLog';
import { formatMealLabel, useFoodSearchAddToLog } from './useFoodSearchAddToLog';
import {
  CATEGORIES,
  type FoodResult,
  fetchFoodSearchResults,
  matchesCategory,
} from './FoodSearchPanel.logic';
import {
  AddBtn,
  Card,
  Chip,
  Empty,
  Filters,
  Grid,
  Header,
  Kcal,
  Macro,
  Macros,
  MealRow,
  MealSelect,
  Meta,
  Name,
  SIcon,
  SInput,
  SafetyPill,
  SearchBar,
  SourceBadge,
  Spin,
  Wrap,
  foodTheme,
} from './FoodSearchPanel.styles';

interface BadgeProps {
  group?: '1' | '2A' | '2B';
  isEUBanned?: boolean;
  isGMO?: boolean;
}

interface FoodSearchPanelProps {
  onDataSent?: (success: boolean) => void;
}

const formatMacroValue = (value: number | null | undefined, unit = '') =>
  value == null ? 'N/A' : `${value}${unit}`;

const IngredientBadge: React.FC<BadgeProps> = ({ group, isEUBanned, isGMO }) => (
  <>
    {group === '1' && <SafetyPill $color={foodTheme.danger}>IARC-1</SafetyPill>}
    {group === '2A' && <SafetyPill $color={foodTheme.gold}>IARC-2A</SafetyPill>}
    {group === '2B' && <SafetyPill $color={foodTheme.gold} $dim>IARC-2B</SafetyPill>}
    {isEUBanned && <SafetyPill $color={foodTheme.danger}>EU Banned</SafetyPill>}
    {isGMO && <SafetyPill $color={foodTheme.gold}>GMO</SafetyPill>}
  </>
);

const FoodSearchPanel: React.FC<FoodSearchPanelProps> = ({ onDataSent }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [allResults, setAllResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { addError, addToLog, addedIds, addedMealTypes, mealType, savingId, setMealType } = useFoodSearchAddToLog(onDataSent);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setAllResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      setAllResults(await fetchFoodSearchResults(trimmed));
    } catch {
      setAllResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query), 400);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, doSearch]);

  const filteredResults = useMemo(
    () => allResults.filter((food) => matchesCategory(food, category)),
    [allResults, category],
  );

  return (
    <Wrap>
      <SearchBar>
        <SIcon size={18} />
        <SInput
          aria-label="Search foods"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search foods... (e.g. chicken breast, oatmeal)"
          type="text"
          value={query}
        />
      </SearchBar>

      <Filters>
        <Filter size={16} style={{ flexShrink: 0, alignSelf: 'center', color: foodTheme.textSoft }} />
        {CATEGORIES.map((item) => (
          <Chip key={item} $on={category === item} onClick={() => setCategory(item)}>
            {item}
          </Chip>
        ))}
      </Filters>

      <MealRow>
        <label htmlFor="food-search-meal-type">Add to</label>
        <MealSelect id="food-search-meal-type" value={mealType} onChange={(event) => setMealType(event.target.value)}>
          {MEAL_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{formatMealLabel(type)}</option>)}
        </MealSelect>
      </MealRow>
      {addError && <Empty role="alert" style={{ color: foodTheme.danger, padding: '8px' }}>{addError}</Empty>}

      {loading && <Empty><Spin size={28} /></Empty>}
      {!loading && searched && filteredResults.length === 0 && (
        <Empty>No foods found. Try a different search term or category.</Empty>
      )}

      {!loading && filteredResults.length > 0 && (
        <Grid>
          {filteredResults.map((food, index) => {
            const added = addedIds.has(food.id);
            const saving = savingId === food.id;
            const currentMeal = formatMealLabel((added && addedMealTypes.get(food.id)) || mealType);
            return (
              <Card key={food.id ?? index} $healthRating={food.healthRating} style={{ animationDelay: `${index * 50}ms` }}>
                <Header>
                  <div>
                    <Name>
                      {food.name}
                      <IngredientBadge group={food.iarcGroup} isEUBanned={food.isEUBanned} isGMO={food.isGMO} />
                    </Name>
                    {(food.brand || food.servingSize) && (
                      <Meta>{[food.brand, food.servingSize].filter(Boolean).join(' - ')}</Meta>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {food.source && <SourceBadge $src={food.source}>{food.source}</SourceBadge>}
                    {food.category && <Meta>{food.category}</Meta>}
                  </div>
                </Header>
                <Kcal>{formatMacroValue(food.calories)} <span>kcal</span></Kcal>
                <Macros>
                  <Macro $c={foodTheme.accent}><div className="v">{formatMacroValue(food.protein, 'g')}</div><div className="l">Protein</div></Macro>
                  <Macro $c={foodTheme.accentSecondary}><div className="v">{formatMacroValue(food.carbs, 'g')}</div><div className="l">Carbs</div></Macro>
                  <Macro $c={foodTheme.gold}><div className="v">{formatMacroValue(food.fat, 'g')}</div><div className="l">Fat</div></Macro>
                </Macros>
                <AddBtn
                  aria-busy={saving}
                  aria-label={
                    added
                      ? `${food.name} added to ${currentMeal}`
                      : saving
                        ? `Adding ${food.name} to ${currentMeal}`
                        : `Add ${food.name} to ${currentMeal}`
                  }
                  disabled={savingId != null || added}
                  onClick={() => addToLog(food)}
                >
                  {added
                    ? <><Check size={18} /> Added</>
                    : saving
                      ? <><Spin size={18} /> Adding...</>
                      : <><Plus size={18} /> Add to {currentMeal}</>}
                </AddBtn>
              </Card>
            );
          })}
        </Grid>
      )}
    </Wrap>
  );
};

export default FoodSearchPanel;
