/**
 * ExerciseAutocomplete
 * ====================
 * Searchable autocomplete for NASM exercise database.
 * Calls GET /api/exercises/search?q=... with debounce.
 *
 * Theme: Crystalline Swan — Cinematic glassmorphism
 * Touch targets: 44px minimum
 * WCAG AA contrast compliant
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { Search } from 'lucide-react';
import { ApiService } from '../../services/api.service';

/* ─── Crystalline Swan Palette ─── */
const CS = {
  bg: '#141419',
  surface: '#1A1A24',
  card: 'rgba(20, 20, 25, 0.85)',
  gaming: '#60C0F0',
  glow: '#50A0F0',            // Arctic Cyan — GLOW ACCENT
  glowLight: '#7CB8F4',       // Arctic Cyan Light (WCAG AA)
  secondary: '#8B5CF6',       // Wing Purple — secondary
  secondaryLight: '#A78BFA',
  text: '#E0ECF4',
  textSecondary: '#b8c9db',
  glassBorder: 'rgba(80, 160, 240, 0.15)',
  accent: '#C6A84B',
};

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ─── Styled Components ─── */

const Wrapper = styled.div`
  position: relative;
  width: 100%;
`;

const InputRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchIconStyled = styled(Search)`
  position: absolute;
  left: 14px;
  color: ${CS.gaming};
  pointer-events: none;
  z-index: 1;
`;

const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 12px 16px 12px 42px;
  border-radius: 0.75rem;
  border: 1.5px solid ${({ $error }) => ($error ? '#ef4444' : CS.glassBorder)};
  background: rgba(20, 20, 25, 0.6);
  backdrop-filter: blur(12px);
  color: ${CS.text};
  font-size: 0.95rem;
  font-family: 'Sora', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px rgba(80, 160, 240, 0.15), 0 0 20px rgba(80, 160, 240, 0.08);
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 280px;
  overflow-y: auto;
  margin: 0;
  padding: 6px 0;
  border-radius: 1rem;
  background: rgba(20, 20, 25, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(80, 160, 240, 0.2);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px rgba(80, 160, 240, 0.06);
  list-style: none;
  animation: ${slideDown} 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(80, 160, 240, 0.25);
    border-radius: 3px;
  }
`;

const DropdownItem = styled.li<{ $highlighted: boolean }>`
  padding: 12px 16px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  cursor: pointer;
  transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  background: ${({ $highlighted }) => ($highlighted ? 'rgba(80, 160, 240, 0.12)' : 'transparent')};
  border-left: 3px solid ${({ $highlighted }) => ($highlighted ? CS.glow : 'transparent')};

  &:hover {
    background: rgba(80, 160, 240, 0.1);
    border-left-color: rgba(80, 160, 240, 0.4);
  }
`;

const ExName = styled.span`
  color: ${CS.text};
  font-size: 0.9rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const ExMeta = styled.span`
  color: ${CS.textSecondary};
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: linear-gradient(135deg, rgba(80, 160, 240, 0.15), rgba(96, 192, 240, 0.1));
  color: ${CS.glowLight};
  border: 1px solid rgba(80, 160, 240, 0.2);
  margin-right: 6px;
`;

/* ─── Types ─── */

interface ExerciseResult {
  id: string;
  name: string;
  exerciseType: string;
  primaryMuscles: string[];
  difficulty: number;
}

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (name: string) => void;
  onSelect?: (exercise: ExerciseResult) => void;
  placeholder?: string;
  error?: boolean;
  disabled?: boolean;
  'data-testid'?: string;
}

/* ─── Component ─── */

const ExerciseAutocomplete: React.FC<ExerciseAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Search exercises...',
  error,
  disabled,
  ...rest
}) => {
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const api = new ApiService();
      const res = await api.get(`/api/exercises/search`, {
        params: { q: query, limit: 15 },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.data.success && res.data.exercises) {
        setResults(res.data.exercises);
        setIsOpen(true);
        setHighlightIndex(-1);
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
      console.error('Exercise search failed:', err);
      setResults([]);
      setIsOpen(false);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  };

  const selectExercise = (exercise: ExerciseResult) => {
    onChange(exercise.name);
    onSelect?.(exercise);
    setIsOpen(false);
    setResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectExercise(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return (
    <Wrapper ref={wrapperRef}>
      <InputRow>
        <SearchIconStyled size={16} />
        <StyledInput
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          $error={error}
          disabled={disabled}
          autoComplete="off"
          aria-label="Search exercises"
          data-testid={rest['data-testid']}
        />
      </InputRow>

      {isOpen && results.length > 0 && (
        <Dropdown role="listbox" aria-label="Exercise search results">
          {results.map((ex, i) => (
            <DropdownItem
              key={ex.id}
              $highlighted={i === highlightIndex}
              onClick={() => selectExercise(ex)}
              role="option"
              aria-selected={i === highlightIndex}
            >
              <ExName>{ex.name}</ExName>
              <ExMeta>
                <TypeBadge>{ex.exerciseType}</TypeBadge>
                {ex.primaryMuscles?.join(', ')}
              </ExMeta>
            </DropdownItem>
          ))}
        </Dropdown>
      )}
    </Wrapper>
  );
};

export default ExerciseAutocomplete;
