/**
 * FoodIntelligenceDashboard — Unified Food Intelligence Hub
 * ==========================================================
 * Aggregates all food/nutrition tools into one dashboard with tabs:
 *   - Macro Logger (existing FoodIntakeForm)
 *   - Quick Nutrition (CalorieNinjas natural language)
 *   - Food Search (USDA database)
 *   - Produce Safety Guide
 *   - Fast Food Analyzer
 *   - Motivation (ZenQuotes)
 *
 * Uses GlassCard for Gemini 3.1 Pro glassmorphism specs.
 * Galaxy-Swan themed, 44px touch targets, responsive grid.
 */
import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Apple, Search, Utensils, Leaf, Zap, Quote,
  ChevronRight, Loader2, AlertTriangle, Info,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

// ── Theme ──
const SWAN_CYAN = '#60C0F0';
const COSMIC_PURPLE = '#7851A9';
const GALAXY_CORE = '#0a0a1a';
const NEON_CORAL = '#FF3366';
const TEXT_PRIMARY = '#E0ECF4';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Layout ──
const Dashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  animation: ${fadeIn} 0.4s ease-out;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 8px;
`;

const Title = styled.h2`
  color: ${TEXT_PRIMARY};
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  background: linear-gradient(135deg, ${SWAN_CYAN}, ${COSMIC_PURPLE});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  color: rgba(224, 236, 244, 0.6);
  font-size: 14px;
  margin: 0;
`;

const TabRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(96, 192, 240, 0.3); border-radius: 3px; }
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  min-height: 44px;
  border: 1px solid ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.4)' : 'rgba(96, 192, 240, 0.12)'};
  border-radius: 12px;
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.12)' : 'rgba(10, 10, 26, 0.4)'};
  color: ${({ $active }) => $active ? SWAN_CYAN : 'rgba(224, 236, 244, 0.6)'};
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    border-color: rgba(96, 192, 240, 0.35);
    color: ${TEXT_PRIMARY};
  }
`;

const GlassPanel = styled.div`
  background: rgba(10, 10, 26, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: 24px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const SearchBox = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 480px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  min-height: 44px;
  background: rgba(0, 32, 96, 0.4);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 12px;
  color: ${TEXT_PRIMARY};
  font-size: 15px;

  &::placeholder { color: rgba(224, 236, 244, 0.4); }
  &:focus {
    outline: none;
    border-color: ${SWAN_CYAN};
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.2);
  }
`;

const SearchBtn = styled.button`
  padding: 12px 24px;
  min-height: 44px;
  background: linear-gradient(135deg, ${SWAN_CYAN}, #50A0F0);
  border: none;
  border-radius: 12px;
  color: ${GALAXY_CORE};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.2s;

  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const ResultGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 768px) { grid-template-columns: repeat(2, 1fr); }
  @media (min-width: 1280px) { grid-template-columns: repeat(3, 1fr); }
`;

const ResultCard = styled.div<{ $variant?: 'cyan' | 'purple' | 'alert' }>`
  background: rgba(10, 10, 26, 0.5);
  border: 1px solid ${({ $variant }) =>
    $variant === 'alert' ? 'rgba(255, 51, 102, 0.25)' :
    $variant === 'purple' ? 'rgba(120, 81, 169, 0.2)' :
    'rgba(96, 192, 240, 0.15)'};
  border-radius: 16px;
  padding: 16px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const CardTitle = styled.h4`
  color: ${TEXT_PRIMARY};
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 8px;
`;

const CardText = styled.p`
  color: rgba(224, 236, 244, 0.7);
  font-size: 13px;
  line-height: 1.5;
  margin: 0;
`;

const MacroRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
`;

const MacroPill = styled.span<{ $color: string }>`
  padding: 4px 10px;
  border-radius: 8px;
  background: ${({ $color }) => `${$color}20`};
  border: 1px solid ${({ $color }) => `${$color}40`};
  color: ${({ $color }) => $color};
  font-size: 12px;
  font-weight: 600;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: rgba(224, 236, 244, 0.4);
`;

const Spinner = styled(Loader2)`
  animation: spin 1s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// ── Helpers ──
function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type TabId = 'nutrition' | 'food-search' | 'produce' | 'fast-food' | 'motivation';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'nutrition', label: 'Quick Nutrition', icon: <Utensils size={15} /> },
  { id: 'food-search', label: 'Food Database', icon: <Search size={15} /> },
  { id: 'produce', label: 'Produce Guide', icon: <Leaf size={15} /> },
  { id: 'fast-food', label: 'Fast Food', icon: <Zap size={15} /> },
  { id: 'motivation', label: 'Motivation', icon: <Quote size={15} /> },
];

// ── Produce Safety Data ──
const PRODUCE_DATA = [
  { name: 'Strawberries', risk: 'high', tip: 'Always buy organic. #1 on Dirty Dozen list. Wash thoroughly under running water.' },
  { name: 'Spinach', risk: 'high', tip: 'High pesticide residue. Choose organic when possible. Triple-wash before consuming.' },
  { name: 'Kale', risk: 'high', tip: 'Increasing pesticide contamination. Organic recommended for daily smoothies.' },
  { name: 'Apples', risk: 'high', tip: 'Wax coating traps pesticides. Peel non-organic or buy organic.' },
  { name: 'Grapes', risk: 'high', tip: 'Thin skin absorbs chemicals easily. Wash with baking soda solution.' },
  { name: 'Avocados', risk: 'low', tip: 'Thick skin protects fruit. #1 on Clean Fifteen — conventional is fine.' },
  { name: 'Sweet Corn', risk: 'low', tip: 'Husk protects kernels. Very low pesticide residue.' },
  { name: 'Pineapple', risk: 'low', tip: 'Thick rind means minimal pesticide exposure. Conventional is safe.' },
  { name: 'Onions', risk: 'low', tip: 'Outer layers are removed before eating. Very clean produce choice.' },
  { name: 'Sweet Potatoes', risk: 'low', tip: 'Underground growth reduces exposure. Great nutrient-dense carb source.' },
  { name: 'Bananas', risk: 'low', tip: 'Peel before eating eliminates most residue. Great pre-workout snack.' },
  { name: 'Broccoli', risk: 'medium', tip: 'Moderate pesticide levels. Wash well and steam to reduce residue.' },
];

// ── Fast Food Data ──
const FAST_FOOD_ITEMS = [
  { name: 'Grilled Chicken Sandwich', restaurant: 'Most chains', cal: 380, protein: 32, carbs: 38, fat: 10, verdict: 'Good choice for protein. Skip the mayo for fewer calories.' },
  { name: 'Double Cheeseburger', restaurant: 'Most chains', cal: 740, protein: 42, carbs: 48, fat: 42, verdict: 'High calorie/fat. Okay for a bulk — not ideal for cutting.' },
  { name: 'Caesar Salad (with dressing)', restaurant: 'Most chains', cal: 470, protein: 18, carbs: 22, fat: 35, verdict: 'Sneaky high-cal from dressing + croutons. Ask for dressing on the side.' },
  { name: 'Egg McMuffin', restaurant: 'McDonald\'s', cal: 300, protein: 17, carbs: 30, fat: 12, verdict: 'Solid breakfast option — good protein-to-calorie ratio.' },
  { name: 'Protein Bowl (no rice)', restaurant: 'Chipotle', cal: 420, protein: 46, carbs: 14, fat: 22, verdict: 'Excellent macro profile. Add double protein for a serious bulk meal.' },
  { name: 'Large Fries', restaurant: 'Most chains', cal: 490, protein: 7, carbs: 63, fat: 24, verdict: 'Pure carbs and fat with minimal protein. Occasional treat only.' },
];

// ── Component ──
const FoodIntelligenceDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('nutrition');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchNutrition = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/free/nutrition?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.ok) setResults(data.data?.items || []);
      else setError(data.error || 'Search failed');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [query]);

  const searchFood = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null); setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/free/food-search?q=${encodeURIComponent(query)}`, { headers: getHeaders() });
      const data = await res.json();
      if (data.ok) setResults(data.data?.foods || []);
      else setError(data.error || 'Search failed');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, [query]);

  const fetchQuote = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/free/quote`);
      const data = await res.json();
      if (data.ok) setQuote({ text: data.data.quote, author: data.data.author });
      else setError(data.error || 'Failed to fetch quote');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }, []);

  const handleSearch = () => {
    if (activeTab === 'nutrition') searchNutrition();
    else if (activeTab === 'food-search') searchFood();
  };

  return (
    <Dashboard>
      <Header>
        <Title>Food Intelligence</Title>
        <Subtitle>AI-powered nutrition analysis, food safety, and smart eating guidance</Subtitle>
      </Header>

      <TabRow>
        {TABS.map(tab => (
          <Tab key={tab.id} $active={activeTab === tab.id} onClick={() => { setActiveTab(tab.id); setResults([]); setError(null); }}>
            {tab.icon} {tab.label}
          </Tab>
        ))}
      </TabRow>

      {/* Quick Nutrition + Food Search */}
      {(activeTab === 'nutrition' || activeTab === 'food-search') && (
        <GlassPanel>
          <SearchBox>
            <SearchInput
              placeholder={activeTab === 'nutrition' ? 'Describe what you ate... (e.g., "2 eggs, toast with butter")' : 'Search foods... (e.g., "chicken breast")'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <SearchBtn onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? <Spinner size={16} /> : <Search size={16} />}
              {activeTab === 'nutrition' ? 'Analyze' : 'Search'}
            </SearchBtn>
          </SearchBox>

          {error && (
            <ResultCard $variant="alert">
              <CardText><AlertTriangle size={14} style={{ verticalAlign: 'middle' }} /> {error}</CardText>
            </ResultCard>
          )}

          {results.length > 0 && (
            <ResultGrid>
              {results.map((item: any, i: number) => (
                <ResultCard key={i} $variant="cyan">
                  <CardTitle>{item.name || item.description || 'Food Item'}</CardTitle>
                  <MacroRow>
                    {item.calories != null && <MacroPill $color="#FFB800">{Math.round(item.calories)} cal</MacroPill>}
                    {item.protein_g != null && <MacroPill $color={SWAN_CYAN}>{item.protein_g}g protein</MacroPill>}
                    {item.carbohydrates_total_g != null && <MacroPill $color={COSMIC_PURPLE}>{item.carbohydrates_total_g}g carbs</MacroPill>}
                    {item.fat_total_g != null && <MacroPill $color="#E0ECF4">{item.fat_total_g}g fat</MacroPill>}
                    {item.fiber_g != null && <MacroPill $color="#00E8B0">{item.fiber_g}g fiber</MacroPill>}
                  </MacroRow>
                  {item.serving_size_g && <CardText style={{ marginTop: 8 }}>Serving: {item.serving_size_g}g</CardText>}
                </ResultCard>
              ))}
            </ResultGrid>
          )}

          {!loading && results.length === 0 && !error && (
            <EmptyState>
              <Apple size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>
                {activeTab === 'nutrition' ? 'Describe your meal in natural language to get instant macro breakdown' : 'Search the USDA food database for detailed nutrition data'}
              </p>
            </EmptyState>
          )}
        </GlassPanel>
      )}

      {/* Produce Safety Guide */}
      {activeTab === 'produce' && (
        <GlassPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Leaf size={20} color={SWAN_CYAN} />
            <CardTitle style={{ margin: 0, fontSize: 18 }}>Produce Safety Guide</CardTitle>
          </div>
          <CardText style={{ marginBottom: 20 }}>
            Based on the Environmental Working Group's Dirty Dozen and Clean Fifteen lists.
            Prioritize organic for high-risk items when budget allows.
          </CardText>
          <ResultGrid>
            {PRODUCE_DATA.map((item, i) => (
              <ResultCard key={i} $variant={item.risk === 'high' ? 'alert' : item.risk === 'low' ? 'cyan' : 'purple'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <CardTitle>{item.name}</CardTitle>
                  <MacroPill $color={item.risk === 'high' ? NEON_CORAL : item.risk === 'low' ? '#00E8B0' : '#FFB800'}>
                    {item.risk === 'high' ? 'High Risk' : item.risk === 'low' ? 'Low Risk' : 'Moderate'}
                  </MacroPill>
                </div>
                <CardText style={{ marginTop: 8 }}>{item.tip}</CardText>
              </ResultCard>
            ))}
          </ResultGrid>
        </GlassPanel>
      )}

      {/* Fast Food Analyzer */}
      {activeTab === 'fast-food' && (
        <GlassPanel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Zap size={20} color={SWAN_CYAN} />
            <CardTitle style={{ margin: 0, fontSize: 18 }}>Fast Food Smart Picks</CardTitle>
          </div>
          <CardText style={{ marginBottom: 20 }}>
            Not all fast food is created equal. Here are common items ranked by their macro profiles
            to help you make smarter choices when eating out.
          </CardText>
          <ResultGrid>
            {FAST_FOOD_ITEMS.map((item, i) => (
              <ResultCard key={i} $variant={item.protein / item.cal > 0.08 ? 'cyan' : 'purple'}>
                <CardTitle>{item.name}</CardTitle>
                <CardText style={{ fontSize: 12, opacity: 0.6 }}>{item.restaurant}</CardText>
                <MacroRow>
                  <MacroPill $color="#FFB800">{item.cal} cal</MacroPill>
                  <MacroPill $color={SWAN_CYAN}>{item.protein}g protein</MacroPill>
                  <MacroPill $color={COSMIC_PURPLE}>{item.carbs}g carbs</MacroPill>
                  <MacroPill $color="#E0ECF4">{item.fat}g fat</MacroPill>
                </MacroRow>
                <CardText style={{ marginTop: 12 }}>
                  <Info size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {item.verdict}
                </CardText>
              </ResultCard>
            ))}
          </ResultGrid>
        </GlassPanel>
      )}

      {/* Motivation */}
      {activeTab === 'motivation' && (
        <GlassPanel>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Quote size={40} color={SWAN_CYAN} style={{ opacity: 0.4, marginBottom: 16 }} />
            {quote ? (
              <>
                <CardTitle style={{ fontSize: 22, lineHeight: 1.5, maxWidth: 600, margin: '0 auto 12px' }}>
                  "{quote.text}"
                </CardTitle>
                <CardText style={{ fontSize: 15, color: SWAN_CYAN }}>— {quote.author}</CardText>
              </>
            ) : (
              <CardText>Click below for daily motivation</CardText>
            )}
            <SearchBtn
              onClick={fetchQuote}
              disabled={loading}
              style={{ margin: '24px auto 0', background: `linear-gradient(135deg, ${COSMIC_PURPLE}, ${SWAN_CYAN})`, color: '#fff' }}
            >
              {loading ? <Spinner size={16} /> : <Zap size={16} />}
              Get Inspired
            </SearchBtn>
          </div>
        </GlassPanel>
      )}
    </Dashboard>
  );
};

export default FoodIntelligenceDashboard;
