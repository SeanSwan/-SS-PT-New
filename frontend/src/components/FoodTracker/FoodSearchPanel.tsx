import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Search, Filter, Plus, Loader2 } from 'lucide-react';
import { theme } from '../../theme/tokens';

interface FoodResult {
  id: string | number; name: string; brand?: string; category?: string;
  calories: number; protein: number; carbs: number; fat: number;
  servingSize?: string; healthRating?: string; organic?: boolean;
}

const CATEGORIES = ['All', 'Protein', 'Vegetables', 'Fruits', 'Grains', 'Dairy', 'Snacks'] as const;
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

const spin = keyframes`from{transform:rotate(0deg)}to{transform:rotate(360deg)}`;
const fadeUp = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;

const Wrap = styled.div`
  width: 100%; max-width: 1200px; margin: 0 auto; padding: ${theme.spacing.lg};
  @media (max-width: 430px) { padding: ${theme.spacing.md}; }
`;
const SearchBar = styled.div`position: relative; margin-bottom: ${theme.spacing.lg};`;
const SIcon = styled(Search)`
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: ${theme.colors.text.secondary}; pointer-events: none;
`;
const SInput = styled.input`
  width: 100%; height: 48px; padding: 0 ${theme.spacing.md} 0 44px;
  background: rgba(0,32,96,0.5); border: 1px solid rgba(96,192,240,0.15);
  border-radius: 12px; color: ${theme.colors.text.primary};
  font-family: 'Sora', sans-serif; font-size: ${theme.typography.scale.base}; outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: ${theme.colors.text.disabled}; }
  &:focus { border-color: ${theme.colors.brand.purple}; box-shadow: 0 0 0 3px rgba(139,92,246,0.25); }
`;
const Filters = styled.div`
  display: flex; gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.lg};
  overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(96,192,240,0.2); border-radius: 2px; }
`;
const Chip = styled.button<{ $on: boolean }>`
  min-height: 44px; padding: 0 ${theme.spacing.md}; border-radius: 22px;
  border: 1px solid ${({ $on }) => $on ? theme.colors.brand.purple : 'rgba(96,192,240,0.15)'};
  background: ${({ $on }) => $on ? 'rgba(139,92,246,0.25)' : 'rgba(0,32,96,0.4)'};
  color: ${({ $on }) => $on ? theme.colors.text.frost : theme.colors.text.secondary};
  font: ${theme.typography.weight.medium} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: all 0.2s;
  &:hover { border-color: ${theme.colors.brand.purple}; }
`;
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${theme.spacing.md};
  @media (max-width: 375px) { grid-template-columns: 1fr; }
`;
const Card = styled.div`
  background: rgba(0,32,96,0.6); backdrop-filter: blur(16px);
  border: 1px solid rgba(96,192,240,0.12); border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4); padding: ${theme.spacing.lg};
  animation: ${fadeUp} 0.3s ease-out both; transition: transform 0.2s, border-color 0.2s;
  &:hover { transform: translateY(-2px); border-color: rgba(139,92,246,0.4); }
`;
const Header = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: ${theme.spacing.sm}; margin-bottom: ${theme.spacing.md};
`;
const Name = styled.h3`
  margin: 0; font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: ${theme.typography.scale.lg}; font-weight: ${theme.typography.weight.semibold};
  color: ${theme.colors.text.frost}; line-height: 1.3;
`;
const Meta = styled.span`
  font-size: ${theme.typography.scale.xs}; color: ${theme.colors.text.secondary};
  font-family: 'Sora', sans-serif;
`;
const Kcal = styled.div`
  font-family: 'Fira Code', monospace; font-size: ${theme.typography.scale.xl};
  font-weight: ${theme.typography.weight.bold}; color: ${theme.colors.text.frost};
  margin-bottom: ${theme.spacing.md};
  span { font-size: ${theme.typography.scale.sm}; color: ${theme.colors.text.secondary}; }
`;
const Macros = styled.div`display: flex; gap: ${theme.spacing.md}; margin-bottom: ${theme.spacing.md};`;
const Macro = styled.div<{ $c: string }>`
  flex: 1; text-align: center; padding: ${theme.spacing.sm}; border-radius: 8px;
  background: rgba(0,24,64,0.5);
  .v { font: ${theme.typography.weight.semibold} ${theme.typography.scale.base} 'Fira Code', monospace; color: ${({ $c }) => $c}; }
  .l { font-size: ${theme.typography.scale.xs}; color: ${theme.colors.text.secondary}; margin-top: 2px; }
`;
const AddBtn = styled.button`
  width: 100%; min-height: 44px; display: flex; align-items: center; justify-content: center;
  gap: ${theme.spacing.sm}; background: ${theme.buttons.accent.bg}; border: none; border-radius: 10px;
  color: #fff; font: ${theme.typography.weight.semibold} ${theme.typography.scale.sm} 'Sora', sans-serif;
  cursor: pointer; transition: box-shadow 0.2s, transform 0.15s;
  &:hover { box-shadow: 0 0 16px rgba(96,192,240,0.4); transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;
const Spin = styled(Loader2)`animation: ${spin} 0.8s linear infinite;`;
const Empty = styled.div`
  text-align: center; padding: ${theme.spacing['2xl']} ${theme.spacing.lg};
  color: ${theme.colors.text.secondary}; font-family: 'Sora', sans-serif;
`;

const FoodSearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string, cat: string) => {
    const t = q.trim();
    if (!t) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const token = localStorage.getItem('token');
      const p = new URLSearchParams({ query: t });
      if (cat !== 'All') p.set('category', cat);
      const res = await fetch(`${API_BASE}/api/food-scanner/search?${p}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setResults(Array.isArray(data) ? data : data.results ?? data.foods ?? []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => doSearch(query, category), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query, category, doSearch]);

  const addToLog = (food: FoodResult) => {
    window.dispatchEvent(new CustomEvent('food-search:add', { detail: food }));
  };

  return (
    <Wrap>
      <SearchBar>
        <SIcon size={18} />
        <SInput
          type="text" placeholder="Search foods... (e.g. chicken breast, oatmeal)"
          value={query} onChange={(e) => setQuery(e.target.value)} autoFocus
        />
      </SearchBar>

      <Filters>
        <Filter size={16} style={{ flexShrink: 0, alignSelf: 'center', color: theme.colors.text.secondary }} />
        {CATEGORIES.map((c) => (
          <Chip key={c} $on={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
      </Filters>

      {loading && <Empty><Spin size={28} /></Empty>}
      {!loading && searched && results.length === 0 && (
        <Empty>No foods found. Try a different search term.</Empty>
      )}

      {!loading && results.length > 0 && (
        <Grid>
          {results.map((f, i) => (
            <Card key={f.id ?? i} style={{ animationDelay: `${i * 50}ms` }}>
              <Header>
                <div>
                  <Name>{f.name}</Name>
                  {(f.brand || f.servingSize) && (
                    <Meta>{[f.brand, f.servingSize].filter(Boolean).join(' · ')}</Meta>
                  )}
                </div>
                {f.category && <Meta>{f.category}</Meta>}
              </Header>
              <Kcal>{f.calories} <span>kcal</span></Kcal>
              <Macros>
                <Macro $c="#60C0F0"><div className="v">{f.protein}g</div><div className="l">Protein</div></Macro>
                <Macro $c="#8B5CF6"><div className="v">{f.carbs}g</div><div className="l">Carbs</div></Macro>
                <Macro $c="#C6A84B"><div className="v">{f.fat}g</div><div className="l">Fat</div></Macro>
              </Macros>
              <AddBtn onClick={() => addToLog(f)}><Plus size={18} /> Add to Log</AddBtn>
            </Card>
          ))}
        </Grid>
      )}
    </Wrap>
  );
};

export default FoodSearchPanel;
