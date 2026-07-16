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
import { Check, ClipboardCheck, Filter, Plus, RefreshCw } from 'lucide-react';
import { MEAL_TYPE_OPTIONS } from './mealPhotoLog';
import { formatMealLabel, useFoodSearchAddToLog } from './useFoodSearchAddToLog';
import { searchFoodToNutritionDraft } from './nutritionDraft.adapters';
import type { NutritionEntryDraft } from './nutritionDraft.types';
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
  RetryButton,
  SIcon,
  SInput,
  SafetyPill,
  SearchBar,
  SourceBadge,
  Spin,
  Wrap,
  foodTheme,
} from './FoodSearchPanel.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface BadgeProps {
  group?: '1' | '2A' | '2B';
  isEUBanned?: boolean;
  isGMO?: boolean;
}

interface FoodSearchPanelProps {
  onDataSent?: (success: boolean) => void;
  onReviewDraft?: (draft: NutritionEntryDraft) => void;
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

const FoodSearchPanel: React.FC<FoodSearchPanelProps> = ({ onDataSent, onReviewDraft }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [allResults, setAllResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const { addError, addToLog, addedIds, addedMealTypes, mealType, savingId, setMealType } = useFoodSearchAddToLog(onDataSent);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequence = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const doSearch = useCallback(async (rawQuery: string) => {
    const requestId = ++requestSequence.current;
    const trimmed = rawQuery.trim();
    if (!trimmed) {
      setAllResults([]);
      setSearched(false);
      setSearchError(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    setSearchError(false);
    try {
      const results = await fetchFoodSearchResults(trimmed);
      if (requestId === requestSequence.current) setAllResults(results);
    } catch {
      if (requestId === requestSequence.current) {
        setAllResults([]);
        setSearchError(true);
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
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
          ref={searchInputRef}
          aria-label="Search foods"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search foods... (e.g. chicken breast, oatmeal)"
          type="text"
          value={query}
        />
      </SearchBar>

      <Filters>
        <StyledBox as={Filter} size={16} $style={{ flexShrink: 0, alignSelf: 'center', color: foodTheme.textSoft }} />
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
      {addError && <StyledBox as={Empty} role="alert" $style={{ color: foodTheme.danger, padding: '8px' }}>{addError}</StyledBox>}
      {searchError && (
        <Empty role="alert">
          <p>Food search is temporarily unavailable. Your Nutrition Center is still available.</p>
          <RetryButton type="button" onClick={() => doSearch(query)}>
            <RefreshCw size={17} /> Retry Food Search
          </RetryButton>
        </Empty>
      )}

      {loading && <Empty><Spin size={28} /></Empty>}
      {!loading && !searchError && searched && filteredResults.length === 0 && (
        <Empty>No foods found. Try a different search term or category.</Empty>
      )}

      {!loading && filteredResults.length > 0 && (
        <Grid>
          {filteredResults.map((food, index) => {
            const added = addedIds.has(food.id);
            const saving = savingId === food.id;
            const currentMeal = formatMealLabel((added && addedMealTypes.get(food.id)) || mealType);
            return (
              <StyledBox as={Card} key={food.id ?? index} $healthRating={food.healthRating} $style={{ animationDelay: `${index * 50}ms` }}>
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
                  <StyledBox as="div" $style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {food.source && <SourceBadge $src={food.source}>{food.source}</SourceBadge>}
                    {food.category && <Meta>{food.category}</Meta>}
                  </StyledBox>
                </Header>
                <Kcal>{formatMacroValue(food.calories)} <span>kcal</span></Kcal>
                <Macros>
                  <Macro $c={foodTheme.accent}><div className="v">{formatMacroValue(food.protein, 'g')}</div><div className="l">Protein</div></Macro>
                  <Macro $c={foodTheme.accentSecondary}><div className="v">{formatMacroValue(food.carbs, 'g')}</div><div className="l">Carbs</div></Macro>
                  <Macro $c={foodTheme.gold}><div className="v">{formatMacroValue(food.fat, 'g')}</div><div className="l">Fat</div></Macro>
                </Macros>
                <AddBtn
                  aria-busy={onReviewDraft ? false : saving}
                  aria-label={
                    onReviewDraft
                      ? ['Review', food.name, 'for', currentMeal].join(' ')
                      : added
                      ? `${food.name} added to ${currentMeal}`
                      : saving
                        ? `Adding ${food.name} to ${currentMeal}`
                        : `Add ${food.name} to ${currentMeal}`
                  }
                  disabled={!onReviewDraft && (savingId != null || added)}
                  onClick={() => onReviewDraft
                    ? onReviewDraft(searchFoodToNutritionDraft(food, { mealType }))
                    : addToLog(food)}
                >
                  {onReviewDraft
                    ? <><ClipboardCheck size={18} /> Review for {currentMeal}</>
                    : added
                      ? <><Check size={18} /> Added</>
                      : saving
                        ? <><Spin size={18} /> Adding...</>
                        : <><Plus size={18} /> Add to {currentMeal}</>}
                </AddBtn>
              </StyledBox>
            );
          })}
        </Grid>
      )}
    </Wrap>
  );
};

export default FoodSearchPanel;
