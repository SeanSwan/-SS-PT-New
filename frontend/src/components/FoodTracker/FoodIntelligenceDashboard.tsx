/**
 * COMPONENT: FoodIntelligenceDashboard
 * PURPOSE: Unified nutrition intelligence tab for quick food lookups, produce guidance, and motivation.
 * OWNER: Codex
 * LAST VALIDATED: 2026-06-21
 *
 * WIREFRAME:
 * [Title]
 * [Mode tabs]
 * [Search panel or static guidance grid]
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { activeTab, query, loading, results, quote, error }
 * API Calls: GET /api/free/nutrition, GET /api/free/food-search, GET /api/free/quote
 * Events:    tab click clears stale result/error state; search button runs active lookup
 * Children:  styled primitives from FoodIntelligenceDashboard.styles
 *
 * ARCHITECTURE:
 * graph TD
 *   NutritionWorkspace --> FoodIntelligenceDashboard
 *   FoodIntelligenceDashboard --> FoodIntelligenceDashboardLogic
 *   FoodIntelligenceDashboard --> FoodIntelligenceDashboardStyles
 */
import React, { useCallback, useState } from 'react';
import { Leaf, Quote, Search, Utensils, Zap } from 'lucide-react';
import apiService from '../../services/api.service';
import {
  FAST_FOOD_ITEMS, PRODUCE_DATA, SAFE_INTELLIGENCE_ERROR, type FoodIntelligenceTabId, type FoodResult,
  macroToneForRisk, resultVariantForFastFood, resultVariantForRisk, riskLabel, type MacroTone,
} from './FoodIntelligenceDashboard.logic';
import { cleanMacro } from './mealPhotoLog';
import {
  CardText, CardTitle, CardTopRow, CenteredMotivation, Dashboard, EmptyAppleIcon, EmptyState,
  EmptyStatePrompt, GlassPanel, Header, InlineAlertIcon, InlineInfoIcon, InspiredButton, MacroPill,
  MacroRow, PanelHeadingRow, PanelIntro, PanelTitle, QuoteAuthor, QuoteIcon, QuoteText,
  RestaurantText, ResultCard, ResultGrid, SearchBox, SearchBtn, SearchInput, ServingText, Spinner,
  Subtitle, Tab, TabRow, TipText, Title, VerdictText, intelligenceTheme,
} from './FoodIntelligenceDashboard.styles';

const TABS: { id: FoodIntelligenceTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'nutrition', label: 'Quick Nutrition', icon: <Utensils size={15} /> },
  { id: 'food-search', label: 'Food Database', icon: <Search size={15} /> },
  { id: 'produce', label: 'Produce Guide', icon: <Leaf size={15} /> },
  { id: 'fast-food', label: 'Fast Food', icon: <Zap size={15} /> },
  { id: 'motivation', label: 'Motivation', icon: <Quote size={15} /> },
];

const formatProviderMacro = (value: unknown, suffix: string, round = false): string | null => {
  const cleaned = cleanMacro(value);
  return cleaned === null ? null : `${round ? Math.round(cleaned) : cleaned}${suffix}`;
};

const formatProviderServing = (value: unknown): string | null => {
  const cleaned = cleanMacro(value);
  return cleaned === null || cleaned <= 0 ? null : `${cleaned}g`;
};

const MacroValuePill = ({ value, tone, suffix, round }: { value: unknown; tone: MacroTone; suffix: string; round?: boolean }) => {
  const text = formatProviderMacro(value, suffix, round);
  return text ? <MacroPill $tone={tone}>{text}</MacroPill> : null;
};

const FoodIntelligenceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FoodIntelligenceTabId>('nutrition');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoodResult[]>([]);
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchNutrition = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await apiService.get(`/api/free/nutrition?q=${encodeURIComponent(query)}`);
      const data = response.data;
      setResults(data.ok ? (data.data?.items || []) : []);
      if (!data.ok) setError(SAFE_INTELLIGENCE_ERROR);
    } catch {
      setError(SAFE_INTELLIGENCE_ERROR);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const searchFood = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const response = await apiService.get(`/api/free/food-search?q=${encodeURIComponent(query)}`);
      const data = response.data;
      setResults(data.ok ? (data.data?.foods || []) : []);
      if (!data.ok) setError(SAFE_INTELLIGENCE_ERROR);
    } catch {
      setError(SAFE_INTELLIGENCE_ERROR);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.get('/api/free/quote');
      const data = response.data;
      if (data.ok && data.data?.quote) {
        setQuote({ text: data.data.quote, author: data.data.author || 'Swan Coach' });
      } else {
        setError(SAFE_INTELLIGENCE_ERROR);
      }
    } catch {
      setError(SAFE_INTELLIGENCE_ERROR);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    if (activeTab === 'nutrition') searchNutrition();
    if (activeTab === 'food-search') searchFood();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  };

  return (
    <Dashboard>
      <Header>
        <Title>Food Intelligence</Title>
        <Subtitle>AI-powered nutrition analysis, food safety, and smart eating guidance</Subtitle>
      </Header>

      <TabRow role="tablist" aria-label="Food intelligence tools">
        {TABS.map((tab) => (
          <Tab
            key={tab.id}
            $active={activeTab === tab.id}
            aria-selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id); setResults([]); setError(null); }}
            role="tab"
            type="button"
          >
            {tab.icon} {tab.label}
          </Tab>
        ))}
      </TabRow>

      {(activeTab === 'nutrition' || activeTab === 'food-search') && (
        <GlassPanel>
          <SearchBox>
            <SearchInput
              aria-label={activeTab === 'nutrition' ? 'Describe meal for nutrition analysis' : 'Search food database'}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={activeTab === 'nutrition' ? 'Describe what you ate... (e.g., "2 eggs, toast with butter")' : 'Search foods... (e.g., "chicken breast")'}
              value={query}
            />
            <SearchBtn aria-busy={loading} disabled={loading || !query.trim()} onClick={handleSearch} type="button">
              {loading ? <Spinner size={16} /> : <Search size={16} />}
              {activeTab === 'nutrition' ? 'Analyze' : 'Search'}
            </SearchBtn>
          </SearchBox>

          {error && (
            <ResultCard $variant="alert" role="alert">
              <CardText><InlineAlertIcon size={14} /> {error}</CardText>
            </ResultCard>
          )}

          {results.length > 0 && (
            <ResultGrid>
              {results.map((item, index) => (
                <ResultCard key={`${item.name || item.description || 'food'}-${index}`} $variant="cyan">
                  <CardTitle>{item.name || item.description || 'Food Item'}</CardTitle>
                  <MacroRow>
                    <MacroValuePill value={item.calories} tone="warning" suffix=" cal" round />
                    <MacroValuePill value={item.protein_g} tone="accent" suffix="g protein" />
                    <MacroValuePill value={item.carbohydrates_total_g} tone="secondary" suffix="g carbs" />
                    <MacroValuePill value={item.fat_total_g} tone="text" suffix="g fat" />
                    <MacroValuePill value={item.fiber_g} tone="success" suffix="g fiber" />
                  </MacroRow>
                  {formatProviderServing(item.serving_size_g) && <ServingText>Serving: {formatProviderServing(item.serving_size_g)}</ServingText>}
                </ResultCard>
              ))}
            </ResultGrid>
          )}

          {!loading && results.length === 0 && !error && (
            <EmptyState>
              <EmptyAppleIcon size={32} />
              <EmptyStatePrompt>
                {activeTab === 'nutrition' ? 'Describe your meal in natural language to get instant macro breakdown' : 'Search the USDA food database for detailed nutrition data'}
              </EmptyStatePrompt>
            </EmptyState>
          )}
        </GlassPanel>
      )}

      {activeTab === 'produce' && (
        <GlassPanel>
          <PanelHeadingRow>
            <Leaf size={20} color={intelligenceTheme.accent} />
            <PanelTitle>Produce Safety Guide</PanelTitle>
          </PanelHeadingRow>
          <PanelIntro>
            Based on the Environmental Working Group&apos;s Dirty Dozen and Clean Fifteen lists.
            Prioritize organic for high-risk items when budget allows.
          </PanelIntro>
          <ResultGrid>
            {PRODUCE_DATA.map((item) => (
              <ResultCard key={item.name} $variant={resultVariantForRisk(item.risk)}>
                <CardTopRow>
                  <CardTitle>{item.name}</CardTitle>
                  <MacroPill $tone={macroToneForRisk(item.risk)}>{riskLabel(item.risk)}</MacroPill>
                </CardTopRow>
                <TipText>{item.tip}</TipText>
              </ResultCard>
            ))}
          </ResultGrid>
        </GlassPanel>
      )}

      {activeTab === 'fast-food' && (
        <GlassPanel>
          <PanelHeadingRow>
            <Zap size={20} color={intelligenceTheme.accent} />
            <PanelTitle>Fast Food Smart Picks</PanelTitle>
          </PanelHeadingRow>
          <PanelIntro>
            Not all fast food is created equal. These common items are ranked by macro profile
            to help you make smarter choices when eating out.
          </PanelIntro>
          <ResultGrid>
            {FAST_FOOD_ITEMS.map((item) => (
              <ResultCard key={item.name} $variant={resultVariantForFastFood(item)}>
                <CardTitle>{item.name}</CardTitle>
                <RestaurantText>{item.restaurant}</RestaurantText>
                <MacroRow>
                  <MacroPill $tone="warning">{item.cal} cal</MacroPill>
                  <MacroPill $tone="accent">{item.protein}g protein</MacroPill>
                  <MacroPill $tone="secondary">{item.carbs}g carbs</MacroPill>
                  <MacroPill $tone="text">{item.fat}g fat</MacroPill>
                </MacroRow>
                <VerdictText><InlineInfoIcon size={13} />{item.verdict}</VerdictText>
              </ResultCard>
            ))}
          </ResultGrid>
        </GlassPanel>
      )}

      {activeTab === 'motivation' && (
        <GlassPanel>
          <CenteredMotivation>
            <QuoteIcon size={40} color={intelligenceTheme.accent} />
            {quote ? (
              <>
                <QuoteText>&quot;{quote.text}&quot;</QuoteText>
                <QuoteAuthor>- {quote.author}</QuoteAuthor>
              </>
            ) : (
              <CardText>Click below for daily motivation</CardText>
            )}
            {error && <CardText role="alert">{error}</CardText>}
            <InspiredButton aria-busy={loading} disabled={loading} onClick={fetchQuote} type="button">
              {loading ? <Spinner size={16} /> : <Zap size={16} />}
              Get Inspired
            </InspiredButton>
          </CenteredMotivation>
        </GlassPanel>
      )}
    </Dashboard>
  );
};

export default FoodIntelligenceDashboard;
