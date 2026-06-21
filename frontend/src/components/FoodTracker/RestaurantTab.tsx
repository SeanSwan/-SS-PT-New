/**
 * ============================================================================
 * FILE: RestaurantTab.tsx
 * PURPOSE: Mounted restaurant and brand-food search tab for NutritionWorkspace.
 * DATA FLOW: useRestaurantSearch -> result/detail state -> optional onAddFood.
 * API FLOW: useRestaurantSearch owns /api/restaurant/search and /food/:id.
 * ARCHITECTURE: Shell keeps state/events; helpers and styles are split out.
 * ============================================================================
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronRight,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  UtensilsCrossed,
} from 'lucide-react';
import { FoodDetail, FoodResult, useRestaurantSearch } from '../../hooks/useRestaurantSearch';
import { useNutritionCoach } from '../../hooks/useNutritionCoach';
import {
  POPULAR_SEARCHES,
  RestaurantAddFoodPayload,
  buildRestaurantLogPayload,
  formatRestaurantMacro,
  formatRestaurantServing,
  splitRestaurantResults,
} from './RestaurantTab.logic';
import {
  AddBtn,
  AskCoachBtn,
  Attribution,
  Brand,
  Chip,
  ChipRow,
  DetailActions,
  DetailCard,
  DetailHeader,
  DetailName,
  DetailServing,
  ErrorBox,
  Header,
  InfoBox,
  LoadMoreBtn,
  LoadingBox,
  MacroCell,
  MacroGrid,
  MacroLbl,
  MacroVal,
  MicroItem,
  MicroRow,
  NotConfiguredHeading,
  NotConfiguredSub,
  QuickSection,
  ResultCard,
  ResultInfo,
  ResultMacros,
  ResultMeta,
  ResultName,
  ResultSection,
  SearchBtn,
  SearchInput,
  SearchRow,
  SectionLabel,
  ServingItem,
  ServingList,
  ServingMacros,
  Subtitle,
  Title,
  Wrapper,
} from './RestaurantTab.styles';

interface RestaurantTabProps {
  onAddFood?: (food: RestaurantAddFoodPayload) => void;
}

const formatResultMeta = (food: FoodResult): string => {
  const calories = formatRestaurantMacro(food.calories, ' cal') ?? 'N/A';
  const serving = formatRestaurantServing(food.servingSize);
  return serving ? `${serving} - ${calories}` : calories;
};

const RestaurantTab: React.FC<RestaurantTabProps> = ({ onAddFood }) => {
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodDetail | null>(null);
  const { results, totalResults, loading, error, search, getDetails, detailLoading, configured, page } =
    useRestaurantSearch();
  const { askCoach } = useNutritionCoach();

  const handleSearch = useCallback((event: React.FormEvent) => {
    event.preventDefault();
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
    setSelectedFood(await getDetails(food.id));
  }, [getDetails]);

  const handleAddToLog = useCallback(() => {
    if (!selectedFood || !onAddFood) return;
    onAddFood(buildRestaurantLogPayload(selectedFood));
    setSelectedFood(null);
  }, [selectedFood, onAddFood]);

  const handleLoadMore = useCallback(() => {
    search(query.trim(), page + 1);
  }, [query, page, search]);

  const { brandResults, genericResults } = useMemo(() => splitRestaurantResults(results), [results]);
  const showNotConfigured = configured === false;

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
            aria-label="Search restaurants, menus, and brands"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search restaurants, menus, brands..."
            minLength={2}
          />
          <SearchBtn
            aria-busy={loading}
            aria-label="Search restaurant and brand foods"
            type="submit"
            disabled={loading || query.trim().length < 2}
          >
            {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
          </SearchBtn>
        </SearchRow>
      </form>

      {results.length === 0 && !loading && !error && (
        <QuickSection>
          <SectionLabel>Popular Searches</SectionLabel>
          <ChipRow>
            {POPULAR_SEARCHES.map((term) => (
              <Chip key={term} type="button" onClick={() => handleQuickSearch(term)}>
                {term}
              </Chip>
            ))}
          </ChipRow>
        </QuickSection>
      )}

      {results.length > 0 && (
        <Attribution>
          Powered by <a href="https://www.fatsecret.com" target="_blank" rel="noopener noreferrer">FatSecret</a>
        </Attribution>
      )}

      {showNotConfigured && (
        <>
          <NotConfiguredHeading>Awaiting Culinary Target</NotConfiguredHeading>
          <NotConfiguredSub>Connect FatSecret API to unlock restaurant search</NotConfiguredSub>
          <InfoBox>
            <AlertCircle size={16} />
            <span>
              Restaurant search requires FatSecret API credentials. Add <code>FATSECRET_CLIENT_ID</code> and{' '}
              <code>FATSECRET_CLIENT_SECRET</code> to your environment variables.
            </span>
          </InfoBox>
        </>
      )}

      {error && !showNotConfigured && <ErrorBox role="alert"><AlertCircle size={16} /> {error}</ErrorBox>}

      {selectedFood && (
        <DetailCard>
          <DetailHeader>
            <DetailName>
              {selectedFood.brand && <Brand>{selectedFood.brand}</Brand>}
              {selectedFood.name}
            </DetailName>
            <DetailServing>
              {formatRestaurantServing(selectedFood.primaryServing.description) ?? 'Serving details unavailable'}
            </DetailServing>
          </DetailHeader>

          <MacroGrid>
            <MacroCell $accent="var(--accent-primary, #60C0F0)">
              <MacroVal>{formatRestaurantMacro(selectedFood.primaryServing.calories) ?? 'N/A'}</MacroVal>
              <MacroLbl>Calories</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-primary, #60C0F0)">
              <MacroVal>{formatRestaurantMacro(selectedFood.primaryServing.protein, 'g') ?? 'N/A'}</MacroVal>
              <MacroLbl>Protein</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-secondary, #8B5CF6)">
              <MacroVal>{formatRestaurantMacro(selectedFood.primaryServing.carbs, 'g') ?? 'N/A'}</MacroVal>
              <MacroLbl>Carbs</MacroLbl>
            </MacroCell>
            <MacroCell $accent="var(--accent-gold, #C6A84B)">
              <MacroVal>{formatRestaurantMacro(selectedFood.primaryServing.fat, 'g') ?? 'N/A'}</MacroVal>
              <MacroLbl>Fat</MacroLbl>
            </MacroCell>
          </MacroGrid>

          <MicroRow>
            <MicroItem>Fiber: {formatRestaurantMacro(selectedFood.primaryServing.fiber, 'g') ?? 'N/A'}</MicroItem>
            <MicroItem>Sugar: {formatRestaurantMacro(selectedFood.primaryServing.sugar, 'g') ?? 'N/A'}</MicroItem>
            <MicroItem>Sodium: {formatRestaurantMacro(selectedFood.primaryServing.sodium, 'mg') ?? 'N/A'}</MicroItem>
            <MicroItem>Sat Fat: {formatRestaurantMacro(selectedFood.primaryServing.saturatedFat, 'g') ?? 'N/A'}</MicroItem>
          </MicroRow>

          {selectedFood.servings.length > 1 && (
            <ServingList>
              <SectionLabel>Other Serving Sizes</SectionLabel>
              {selectedFood.servings.slice(1, 5).map((serving) => (
                <ServingItem key={serving.id}>
                  <span>{formatRestaurantServing(serving.description) ?? 'Serving details unavailable'}</span>
                  <ServingMacros>
                    {formatRestaurantMacro(serving.calories, ' cal') ?? 'N/A'} - {formatRestaurantMacro(serving.protein, 'g P') ?? 'N/A'} - {formatRestaurantMacro(serving.carbs, 'g C') ?? 'N/A'} - {formatRestaurantMacro(serving.fat, 'g F') ?? 'N/A'}
                  </ServingMacros>
                </ServingItem>
              ))}
            </ServingList>
          )}

          <DetailActions>
            {onAddFood && <AddBtn type="button" onClick={handleAddToLog}><Plus size={18} /> Add to Food Log</AddBtn>}
            <AskCoachBtn type="button" onClick={() => askCoach(selectedFood)}>
              <MessageCircle size={18} /> Ask Swan Coach
            </AskCoachBtn>
          </DetailActions>
        </DetailCard>
      )}

      {detailLoading && <LoadingBox role="status"><Loader2 size={20} className="spin" /> Loading nutrition details...</LoadingBox>}

      {!selectedFood && results.length > 0 && (
        <>
          {brandResults.length > 0 && (
            <ResultSection>
              <SectionLabel><Building2 size={14} /> Restaurant & Brand ({brandResults.length})</SectionLabel>
              {brandResults.map((food) => (
                <ResultCard key={food.id} type="button" onClick={() => handleSelectFood(food)}>
                  <ResultInfo>
                    <ResultName>{food.brand && <Brand>{food.brand}</Brand>}{food.name}</ResultName>
                    <ResultMeta>{formatResultMeta(food)}</ResultMeta>
                  </ResultInfo>
                  <ResultMacros><span>{formatRestaurantMacro(food.protein, 'g P') ?? 'N/A'}</span><span>{formatRestaurantMacro(food.carbs, 'g C') ?? 'N/A'}</span><span>{formatRestaurantMacro(food.fat, 'g F') ?? 'N/A'}</span></ResultMacros>
                  <ChevronRight size={16} color="var(--text-muted, rgba(224,236,244,0.4))" />
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {genericResults.length > 0 && (
            <ResultSection>
              <SectionLabel><UtensilsCrossed size={14} /> Generic Foods ({genericResults.length})</SectionLabel>
              {genericResults.map((food) => (
                <ResultCard key={food.id} type="button" onClick={() => handleSelectFood(food)}>
                  <ResultInfo>
                    <ResultName>{food.name}</ResultName>
                    <ResultMeta>{formatResultMeta(food)}</ResultMeta>
                  </ResultInfo>
                  <ResultMacros><span>{formatRestaurantMacro(food.protein, 'g P') ?? 'N/A'}</span><span>{formatRestaurantMacro(food.carbs, 'g C') ?? 'N/A'}</span><span>{formatRestaurantMacro(food.fat, 'g F') ?? 'N/A'}</span></ResultMacros>
                  <ChevronRight size={16} color="var(--text-muted, rgba(224,236,244,0.4))" />
                </ResultCard>
              ))}
            </ResultSection>
          )}

          {totalResults > results.length && (
            <LoadMoreBtn type="button" onClick={handleLoadMore} disabled={loading} aria-busy={loading}>
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
