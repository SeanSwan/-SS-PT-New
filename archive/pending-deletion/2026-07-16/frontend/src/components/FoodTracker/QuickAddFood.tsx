/**
 * QuickAddFood — Natural language food input with debounced search
 *
 * Architecture: NLP-style input ("chicken breast 200g") → backend search → results dropdown → parent callback
 * Theme: Enchanted Apex Crystalline Swan with Gemini-directed cosmic glow focus state
 * API: GET /api/food-scanner/search?query=...
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { Search, Plus, Loader2, UtensilsCrossed } from 'lucide-react';
import { theme } from '../../theme/tokens';

/* ── Types ─────────────────────────────────────────────────────────── */

interface FoodResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
}

export interface QuickAddFoodProps {
  onAddFood: (food: FoodResult) => void;
}

/* ── Styled Components ─────────────────────────────────────────────── */

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const InputRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 16px;
  color: ${theme.colors.brand.cyan};
  pointer-events: none;
  z-index: 1;
`;

const Input = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 12px 16px 12px 44px;
  border-radius: 24px;
  font-size: 16px; /* prevent iOS zoom */
  font-family: 'Sora', sans-serif;
  color: #e0ecf4;
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.12);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }

  &:focus {
    border-color: ${theme.colors.brand.cyan};
    box-shadow: 0 0 0 1px ${theme.colors.brand.cyan}, 0 0 20px rgba(139, 92, 246, 0.4);
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  max-height: 320px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: ${theme.spacing.sm};
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 50;
`;

const ResultCard = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.md};
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s, background 0.15s;
  border: 1px solid transparent;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(139, 92, 246, 0.4);
    background: rgba(0, 48, 128, 0.4);
  }

  & + & {
    margin-top: ${theme.spacing.xs};
  }
`;

const FoodInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FoodName = styled.span`
  display: block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: ${theme.typography.weight.semibold};
  font-size: ${theme.typography.scale.base};
  color: #e0ecf4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MacroRow = styled.div`
  display: flex;
  gap: ${theme.spacing.md};
  margin-top: 4px;
  font-family: 'Fira Code', monospace;
  font-size: ${theme.typography.scale.xs};
`;

const Macro = styled.span<{ $color: string }>`
  color: ${({ $color }) => $color};
`;

const CalBadge = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: ${theme.typography.scale.sm};
  color: #e0ecf4;
  white-space: nowrap;
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  border: none;
  background: ${theme.colors.brand.purple};
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: box-shadow 0.2s, transform 0.15s;

  &:hover {
    box-shadow: 0 0 14px rgba(96, 192, 240, 0.5);
    transform: scale(1.05);
  }
`;

const EmptyState = styled.li`
  text-align: center;
  padding: ${theme.spacing.lg};
  color: rgba(224, 236, 244, 0.5);
  font-size: ${theme.typography.scale.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.sm};
`;

const SpinnerWrap = styled.div`
  display: flex;
  justify-content: center;
  padding: ${theme.spacing.lg};

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  svg { animation: spin 0.8s linear infinite; }
`;

/* ── Component ─────────────────────────────────────────────────────── */

const MACRO_COLORS = {
  protein: '#60C0F0',  // Ice Wing Cyan
  carbs: '#8B5CF6',    // Wing Purple
  fat: '#C6A84B',      // Gilded Fern
} as const;

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:10000');

const QuickAddFood: React.FC<QuickAddFoodProps> = ({ onAddFood }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/food-scanner/search?query=${encodeURIComponent(q)}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      if (!res.ok) throw new Error('search failed');
      const data = await res.json();
      const items: FoodResult[] = (data.results ?? data ?? []).slice(0, 8).map((r: any) => ({
        name: r.name ?? r.food_name ?? 'Unknown',
        calories: Number(r.calories ?? r.nf_calories ?? 0),
        protein: Number(r.protein ?? r.nf_protein ?? 0),
        carbs: Number(r.carbs ?? r.nf_total_carbohydrate ?? 0),
        fat: Number(r.fat ?? r.nf_total_fat ?? 0),
        portion: r.portion ?? r.serving_unit ?? '1 serving',
      }));
      setResults(items);
      setOpen(items.length > 0);
    } catch {
      setResults([]);
      setOpen(true); // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleAdd = (food: FoodResult) => {
    onAddFood(food);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <Wrapper ref={wrapperRef}>
      <InputRow>
        <SearchIcon size={18} />
        <Input
          value={query}
          onChange={handleChange}
          placeholder='Type a food… "chicken breast 200g"'
          aria-label="Search food"
          autoComplete="off"
        />
      </InputRow>

      {open && (
        <Dropdown role="listbox">
          {loading ? (
            <SpinnerWrap><Loader2 size={24} color={theme.colors.brand.cyan} /></SpinnerWrap>
          ) : results.length === 0 ? (
            <EmptyState>
              <UtensilsCrossed size={28} color="rgba(224,236,244,0.3)" />
              No results found
            </EmptyState>
          ) : (
            results.map((food, i) => (
              <ResultCard key={`${food.name}-${i}`} role="option" onClick={() => handleAdd(food)}>
                <FoodInfo>
                  <FoodName>{food.name}</FoodName>
                  <MacroRow>
                    <Macro $color={MACRO_COLORS.protein}>P {food.protein}g</Macro>
                    <Macro $color={MACRO_COLORS.carbs}>C {food.carbs}g</Macro>
                    <Macro $color={MACRO_COLORS.fat}>F {food.fat}g</Macro>
                  </MacroRow>
                </FoodInfo>
                <CalBadge>{food.calories} kcal</CalBadge>
                <AddBtn aria-label={`Add ${food.name} to meal`} onClick={(e) => { e.stopPropagation(); handleAdd(food); }}>
                  <Plus size={20} />
                </AddBtn>
              </ResultCard>
            ))
          )}
        </Dropdown>
      )}
    </Wrapper>
  );
};

export default React.memo(QuickAddFood);
