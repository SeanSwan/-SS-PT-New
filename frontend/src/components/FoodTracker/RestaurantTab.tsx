/**
 * ============================================================================
 * FILE: RestaurantTab.tsx
 * PURPOSE: Restaurant & brand food search with nutrition facts via FatSecret
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: Pending
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Search restaurant menus & branded foods, view macros,
 * and add items to your daily food log with one tap.
 * HOW IT FITS IN THE APP: NutritionWorkspace → Restaurant tab
 *
 * ┌─── SUB-COMPONENT: RestaurantTab ───────────────────────────┐
 * │ PARENT: NutritionWorkspace                                  │
 * │ PURPOSE: Search restaurant/brand food nutrition facts       │
 * │ Props: { onAddFood? }                                       │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Search] → GET /api/restaurant/search → Show results        │
 * │ [Result card] → GET /api/restaurant/food/:id → Show detail  │
 * │ [Add to Log] → onAddFood callback → logs to daily macros   │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Search, Plus, Loader2, AlertCircle, Building2, UtensilsCrossed, ChevronRight } from 'lucide-react';
import { useRestaurantSearch, FoodResult, FoodDetail } from '../../hooks/useRestaurantSearch';

interface RestaurantTabProps {
  onAddFood?: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    portion: string;
    brandName?: string;
    mealSource?: string;
  }) => void;
}

const POPULAR_SEARCHES = [
  'Chipotle burrito bowl', 'Chick-fil-A sandwich', 'Subway turkey',
  'Starbucks latte', 'McDonald\'s Big Mac', 'Panera soup',
];

const RestaurantTab: React.FC<RestaurantTabProps> = ({ onAddFood }) => {
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodDetail | null>(null);
  const { results, totalResults, loading, error, search, getDetails, detailLoading, configured, page } = useRestaurantSearch();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      setSelectedFood(null);
      search(query.trim());
    }
  }, [query, search]);

  const handleQuickSearch = useCallback((term: string) => {
    setQuery(term);
    setSelectedFood(null);
    search(term);
  }, [search]);

  const handleSelectFood = useCallback(async (food: FoodResult) => {
    const detail = await getDetails(food.id);
    setSelectedFood(detail);
  }, [getDetails]);

  const handleAddToLog = useCallback(() => {
    if (!selectedFood || !onAddFood) return;
    const s = selectedFood.primaryServing;
    onAddFood({
      name: selectedFood.brand ? `${selectedFood.brand} ${selectedFood.name}` : selectedFood.name,
      calories: s.calories,
      protein: s.protein,
      carbs: s.carbs,
      fat: s.fat,
      portion: s.description,
      brandName: selectedFood.brand || undefined,
      mealSource: selectedFood.type === 'Brand' ? 'restaurant' : 'packaged',
    });
    setSelectedFood(null);
  }, [selectedFood, onAddFood]);

  const handleLoadMore = useCallback(() => {
    search(query.trim(), page + 1);
  }, [query, page, search]);

  // Show "not configured" state gracefully
  const showNotConfigured = configured === false;

  const brandResults = useMemo(() => results.filter(r => r.brand), [results]);
  const genericResults = useMemo(() => results.filter(r => !r.brand), [results]);

  return (
    <Wrapper>
      <Header>
        <Building2 size={24} color="var(--accent-primary, #60C0F0)" />
        <div>
          <Title>Restaurant & Brand Foods</Title>
          <Subtitle>Search nutrition facts for restaurant menus and brand products</Subtitle>
        </div>
      </Header>

      <form onSubmit={handleSearch}>
        <SearchRow>
          <SearchInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, menus, brands..."
            minLength={2}
          />
          <SearchBtn type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
          </SearchBtn>
        </SearchRow>
      </form>

      {/* Popular searches */}
      {results.length === 0 && !loading && !error && (
        <QuickSection>
          <SectionLabel>Popular Searches</SectionLabel>
          <ChipRow>
            {POPULAR_SEARCHES.map(term => (
              <Chip key={term} type="button" onClick={() => handleQuickSearch(term)}>
                {term}
              </Chip>
            ))}
          </ChipRow>
        </QuickSection>
      )}

      {/* Attribution (required by FatSecret free tier) */}
      {results.length > 0 && (
        <Attribution>
          Powered by <a href="https://www.fatsecret.com" target="_blank" rel="noopener noreferrer">FatSecret</a>
        </Attribution>
      )}

      {/* Not configured fallback */}
      {showNotConfigured && (
        <InfoBox>
          <AlertCircle size={16} />
          <span>Restaurant search requires FatSecret API credentials. Add <code>FATSECRET_CLIENT_ID</code> and <code>FATSECRET_CLIENT_SECRET</code> to your environment variables.</span>
        </InfoBox>
      )}

      {error && !showNotConfigured && (
        <ErrorBox><AlertCircle size={16} /> {error}</ErrorBox>
      )}

      {/* Detail view */}
      {selectedFood && (
        <DetailCard>
          <DetailHeader>
            <div>
              <DetailName>
                {selectedFood.brand && <Brand>{selectedFood.brand}</Brand>}
                {selectedFood.name}
              </DetailName>
              <DetailServing>{selectedFood.primaryServing.description}</DetailServing>
            </div>
          </DetailHeader>

          <MacroGrid>
            <MacroCell $accent="var(--accent-primary, #60C0F0)">
              <MacroVal>{selectedFood.primaryServing.calories}</MacroVal>
              <MacroLbl>Calories</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-primary, #60C0F0)">
              <MacroVal>{selectedFood.primaryServing.protein}g</MacroVal>
              <MacroLbl>Protein</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-secondary, #8B5CF6)">
              <MacroVal>{selectedFood.primaryServing.carbs}g</MacroVal>
              <MacroLbl>Carbs</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-gold, #C6A84B)">
              <MacroVal>{selectedFood.primaryServing.fat}g</MacroVal>
              <MacroLbl>Fat</MacroLbl>
            </MacroCell>
          </MacroGrid>

          {/* Extra nutrition details */}
          <MicroRow>
            <MicroItem>Fiber: {selectedFood.primaryServing.fiber}g</MicroItem>
            <MicroItem>Sugar: {selectedFood.primaryServing.sugar}g</MicroItem>
            <MicroItem>Sodium: {selectedFood.primaryServing.sodium}mg</MicroItem>
            <MicroItem>Sat Fat: {selectedFood.primaryServing.saturatedFat}g</MicroItem>
          </MicroRow>

          {/* Serving options */}
          {selectedFood.servings.length > 1 && (
            <ServingList>
              <SectionLabel>Other Serving Sizes</SectionLabel>
              {selectedFood.servings.slice(1, 5).map(s => (
                <ServingItem key={s.id}>
                  <span>{s.description}</span>
                  <ServingMacros>{s.calories} cal · {s.protein}g P · {s.carbs}g C · {s.fat}g F</ServingMacros>
                </ServingItem>
              ))}
            </ServingList>
          )}

          {onAddFood && (
            <AddBtn type="button" onClick={handleAddToLog}>
              <Plus size={18} /> Add to Food Log
            </AddBtn>
          )}
        </DetailCard>
      )}

      {/* Loading detail */}
      {detailLoading && (
        <LoadingBox><Loader2 size={20} className="spin" /> Loading nutrition details...</LoadingBox>
      )}

      {/* Results list */}
      {!selectedFood && results.length > 0 && (
        <>
          {brandResults.length > 0 && (
            <ResultSection>
              <SectionLabel>
                <Building2 size={14} /> Restaurant & Brand ({brandResults.length})
              </SectionLabel>
              {brandResults.map(food => (
                <ResultCard key={food.id} onClick={() => handleSelectFood(food)}>
                  <ResultInfo>
                    <ResultName>
                      {food.brand && <Brand>{food.brand}</Brand>}
                      {food.name}
                    </ResultName>
                    <ResultMeta>{food.servingSize} · {food.calories} cal</ResultMeta>
                  </ResultInfo>
                  <ResultMacros>
                    <span>{food.protein}g P</span>
                    <span>{food.carbs}g C</span>
                    <span>{food.fat}g F</span>
                  </ResultMacros>
                  <ChevronRight size={16} color="var(--text-muted, rgba(224,236,244,0.4))" />
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {genericResults.length > 0 && (
            <ResultSection>
              <SectionLabel>
                <UtensilsCrossed size={14} /> Generic Foods ({genericResults.length})
              </SectionLabel>
              {genericResults.map(food => (
                <ResultCard key={food.id} onClick={() => handleSelectFood(food)}>
                  <ResultInfo>
                    <ResultName>{food.name}</ResultName>
                    <ResultMeta>{food.servingSize} · {food.calories} cal</ResultMeta>
                  </ResultInfo>
                  <ResultMacros>
                    <span>{food.protein}g P</span>
                    <span>{food.carbs}g C</span>
                    <span>{food.fat}g F</span>
                  </ResultMacros>
                  <ChevronRight size={16} color="var(--text-muted, rgba(224,236,244,0.4))" />
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {totalResults > results.length && (
            <LoadMoreBtn type="button" onClick={handleLoadMore} disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : null}
              Load More ({totalResults - results.length} remaining)
            </LoadMoreBtn>
          )}
        </>
      )}
    </Wrapper>
  );
};

export default RestaurantTab;

// ── Styled Components ──

const spin = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .spin { animation: spin 0.8s linear infinite; }
`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  ${spin}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Title = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const Subtitle = styled.p`
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin: 2px 0 0;
`;

const SearchRow = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.input`
  flex: 1;
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, rgba(255,255,255,0.05));
  color: var(--text-primary, #E0ECF4);
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 1px var(--accent-primary, #60C0F0);
  }
  &::placeholder { color: var(--text-muted, rgba(224,236,244,0.4)); }
`;

const SearchBtn = styled.button`
  min-width: 48px;
  min-height: 48px;
  border: none;
  border-radius: 12px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);

  &:hover:not(:disabled) {
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const QuickSection = styled.div``;
const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Chip = styled.button`
  padding: 8px 14px;
  min-height: 36px;
  border-radius: 20px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }
`;

const SectionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin-bottom: 8px;
`;

const InfoBox = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
  line-height: 1.5;
  code { background: rgba(0,0,0,0.3); padding: 2px 5px; border-radius: 4px; font-size: 0.8em; }
`;

const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  background: rgba(201,42,84,0.1);
  border: 1px solid rgba(201,42,84,0.25);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.85rem;
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px;
  justify-content: center;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.9rem;
`;

const ResultSection = styled.div`
  display: flex;
  flex-direction: column;
`;

const ResultCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  margin-bottom: 6px;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
`;

const ResultInfo = styled.div`flex: 1; min-width: 0;`;
const ResultName = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const ResultMeta = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224,236,244,0.4));
  margin-top: 2px;
`;
const ResultMacros = styled.div`
  display: flex;
  gap: 8px;
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  flex-shrink: 0;
`;

const Brand = styled.span`
  color: var(--accent-primary, #60C0F0);
  margin-right: 6px;
`;

const DetailCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  border-radius: 14px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
`;

const DetailHeader = styled.div`
  margin-bottom: 16px;
`;
const DetailName = styled.h4`
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;
const DetailServing = styled.p`
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin: 4px 0 0;
`;

const MacroGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
`;

const MacroCell = styled.div<{ $accent: string }>`
  text-align: center;
  padding: 10px 6px;
  border-radius: 10px;
  background: color-mix(in srgb, ${({ $accent }) => $accent} 8%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $accent }) => $accent} 15%, transparent);
`;

const MacroVal = styled.div`
  font-size: 1rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #E0ECF4);
`;
const MacroLbl = styled.div`
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224,236,244,0.4));
  margin-top: 2px;
`;

const MicroRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
`;
const MicroItem = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-family: 'Fira Code', monospace;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--bg-surface, #1A1A24);
`;

const ServingList = styled.div`
  margin-bottom: 14px;
`;
const ServingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
  font-size: 0.8rem;
  color: var(--text-primary, #E0ECF4);
  &:last-child { border-bottom: none; }
`;
const ServingMacros = styled.span`
  font-size: 0.75rem;
  font-family: 'Fira Code', monospace;
  color: var(--text-muted, rgba(224,236,244,0.4));
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: none;
  border-radius: 12px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);

  &:hover {
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }
`;

const LoadMoreBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 10px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Attribution = styled.div`
  text-align: center;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224,236,244,0.3));
  a {
    color: var(--text-secondary, rgba(224,236,244,0.5));
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }
`;
