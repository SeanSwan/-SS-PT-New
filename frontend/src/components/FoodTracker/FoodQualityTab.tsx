/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: FoodQualityTab                                   ║
 * ║  PURPOSE: Self-contained tab surface that resurrects the     ║
 * ║           dormant ingredient-safety intelligence             ║
 * ║           (IngredientSafetyPanel + IngredientDetailModal).   ║
 * ║  CREATED: 2026-08-04 | PHASE: Nutrition 4E                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS FILE DOES:
 * Search a food product (GET /api/food-scanner/search via the house
 * apiService), pick a result, and inspect its per-ingredient safety
 * badges (IARC group, EU-banned, GMO). Sparse ingredient records are
 * enriched through GET /api/food-scanner/ingredient/:id before the
 * detail modal opens — the same data the dormant
 * FoodTracker/BarcodeScanner flow fed the panel.
 *
 * HOW IT FITS IN THE APP:
 *   NutritionWorkspace (Explore segment — wired by the orchestrator)
 *     → FoodQualityTab → IngredientSafetyPanel → IngredientDetailModal
 *
 * LEGAL GATE:
 *   Mirrors BarcodeScanner.tsx — the safety panel renders only when
 *   VITE_INGREDIENT_SAFETY_ENABLED=true (Sean's IARC/FDA sign-off).
 *   Until then the tab still works as a product-quality lookup and
 *   shows a pending-review note instead of the badges.
 */

import React, { useCallback, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import apiService from '../../services/api.service';
import IngredientSafetyPanel, { type IngredientSafety } from './IngredientSafetyPanel';
import {
  BackButton,
  GateNote,
  IntroCopy,
  RatingChip,
  ResultBrand,
  ResultName,
  ResultRow,
  ResultsList,
  RetryButton,
  SearchField,
  SearchRow,
  SearchSubmit,
  SelectedCard,
  SelectedHeader,
  SelectedTitle,
  SkeletonBlock,
  StateCard,
  TabShell,
} from './FoodQualityTab.styles';

/** Same legal gate as FoodTracker/BarcodeScanner.tsx — do not widen without sign-off. */
const INGREDIENT_SAFETY_ENABLED = import.meta.env.VITE_INGREDIENT_SAFETY_ENABLED === 'true';

/** How many sparse ingredients we enrich per selection (fail-soft, bounded). */
const ENRICH_LIMIT = 8;

interface QualityProduct {
  id: number | string;
  name: string;
  brand?: string | null;
  overallRating?: string | null;
  ingredientsList?: string | null;
  ingredients?: IngredientSafety[] | null;
}

const SEARCH_ERROR_COPY = 'Product lookup is resting its wings. Please try again.';
const EMPTY_STATE_COPY = 'Search a product to inspect its ingredient quality.';

const FoodQualityTab: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<QualityProduct[] | null>(null);
  const [selected, setSelected] = useState<QualityProduct | null>(null);

  const runSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;

    setSearching(true);
    setError(null);
    setSelected(null);

    try {
      const response = await apiService.get('/api/food-scanner/search', {
        params: { query: term.trim(), limit: 10 },
      });
      const data = response.data;
      if (data?.success && Array.isArray(data.products)) {
        setResults(data.products);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error('[FoodQualityTab] search failed:', err);
      setError(SEARCH_ERROR_COPY);
    } finally {
      setSearching(false);
    }
  }, []);

  /**
   * Enrich sparse ingredient rows (id but no description) via
   * GET /api/food-scanner/ingredient/:id so the detail modal has the
   * full concern/alternative/research payload. Bounded and fail-soft:
   * a failed lookup just leaves that row as-is.
   */
  const selectProduct = useCallback(async (product: QualityProduct) => {
    setSelected(product);

    const ingredients = product.ingredients;
    if (!Array.isArray(ingredients)) return;

    const sparse = ingredients
      .filter((ing) => typeof ing.id === 'number' && !ing.description)
      .slice(0, ENRICH_LIMIT);
    if (sparse.length === 0) return;

    const details = await Promise.allSettled(
      sparse.map((ing) => apiService.get(`/api/food-scanner/ingredient/${ing.id}`)),
    );

    const byId = new Map<number, Partial<IngredientSafety>>();
    details.forEach((outcome, index) => {
      const target = sparse[index];
      if (outcome.status === 'fulfilled' && outcome.value.data?.success && target.id != null) {
        byId.set(target.id, outcome.value.data.ingredient ?? {});
      }
    });
    if (byId.size === 0) return;

    setSelected((current) => {
      // The user may have navigated away or picked another product meanwhile.
      if (!current || current.id !== product.id || !Array.isArray(current.ingredients)) return current;
      return {
        ...current,
        ingredients: current.ingredients.map((ing) => {
          const detail = ing.id != null ? byId.get(ing.id) : undefined;
          if (!detail) return ing;
          // Fill gaps only — the product's own analysis stays authoritative.
          return {
            ...ing,
            description: ing.description ?? detail.description,
            healthConcerns: ing.healthConcerns?.length ? ing.healthConcerns : detail.healthConcerns,
            healthierAlternatives: ing.healthierAlternatives?.length
              ? ing.healthierAlternatives
              : detail.healthierAlternatives,
            researchUrls: ing.researchUrls?.length ? ing.researchUrls : detail.researchUrls,
          };
        }),
      };
    });
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    runSearch(query);
  };

  return (
    <TabShell>
      <IntroCopy>
        <ShieldCheck size={14} aria-hidden="true" /> Check what is actually inside a product —
        ingredient quality signals before it lands in a plan or a log.
      </IntroCopy>

      <SearchRow onSubmit={handleSubmit} role="search" aria-label="Search food products">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by product or brand name"
          aria-label="Product search"
        />
        <SearchSubmit type="submit" disabled={searching || !query.trim()}>
          <Search size={16} aria-hidden="true" /> Search
        </SearchSubmit>
      </SearchRow>

      {searching && (
        <ResultsList aria-hidden="true">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </ResultsList>
      )}

      {!searching && error && (
        <StateCard role="alert">
          {error}
          <div>
            <RetryButton type="button" onClick={() => runSearch(query)}>Retry</RetryButton>
          </div>
        </StateCard>
      )}

      {!searching && !error && !selected && results === null && (
        <StateCard>{EMPTY_STATE_COPY}</StateCard>
      )}

      {!searching && !error && !selected && results !== null && results.length === 0 && (
        <StateCard>No products matched that search. Try a simpler name or the brand.</StateCard>
      )}

      {!searching && !error && !selected && results !== null && results.length > 0 && (
        <ResultsList>
          {results.map((product) => (
            <ResultRow key={product.id} type="button" onClick={() => selectProduct(product)}>
              <ResultName>
                {product.name}
                {product.brand && <ResultBrand>{product.brand}</ResultBrand>}
              </ResultName>
              <RatingChip $rating={product.overallRating}>
                {product.overallRating === 'good' ? 'Good'
                  : product.overallRating === 'bad' ? 'Poor'
                  : product.overallRating === 'okay' ? 'Okay'
                  : 'Unrated'}
              </RatingChip>
            </ResultRow>
          ))}
        </ResultsList>
      )}

      {selected && (
        <SelectedCard>
          <SelectedHeader>
            <SelectedTitle>
              {selected.brand ? `${selected.brand} — ${selected.name}` : selected.name}
            </SelectedTitle>
            <BackButton type="button" onClick={() => setSelected(null)}>
              Back to results
            </BackButton>
          </SelectedHeader>

          {INGREDIENT_SAFETY_ENABLED && Array.isArray(selected.ingredients) && selected.ingredients.length > 0 ? (
            <IngredientSafetyPanel ingredients={selected.ingredients} />
          ) : Array.isArray(selected.ingredients) && selected.ingredients.length > 0 ? (
            <GateNote>
              Detailed ingredient safety analysis is pending final review and will appear here
              once enabled.
            </GateNote>
          ) : selected.ingredientsList ? (
            <GateNote>Listed ingredients: {selected.ingredientsList}</GateNote>
          ) : (
            <GateNote>
              No ingredient breakdown is available for this product yet — scanning its barcode
              in the tracker will build one.
            </GateNote>
          )}
        </SelectedCard>
      )}
    </TabShell>
  );
};

export default FoodQualityTab;
