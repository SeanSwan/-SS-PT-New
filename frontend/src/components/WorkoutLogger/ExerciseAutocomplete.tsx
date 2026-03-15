/**
 * ExerciseAutocomplete
 * ====================
 * Searchable autocomplete for NASM exercise database.
 * Calls GET /api/exercises/search?q=... with debounce.
 *
 * Theme: Crystalline Swan (Wing Purple accents)
 * Touch targets: 44px minimum
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Search } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

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

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  color: #64748b;
  pointer-events: none;
`;

const StyledInput = styled.input<{ $error?: boolean }>`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px 10px 38px;
  border-radius: 8px;
  border: 1px solid ${({ $error }) => ($error ? '#ff6b6b' : 'rgba(255, 255, 255, 0.12)')};
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const Dropdown = styled.ul`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 240px;
  overflow-y: auto;
  margin: 4px 0 0;
  padding: 4px 0;
  border-radius: 8px;
  background: rgba(29, 31, 43, 0.98);
  border: 1px solid rgba(139, 92, 246, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  list-style: none;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 3px;
  }
`;

const DropdownItem = styled.li<{ $highlighted: boolean }>`
  padding: 10px 14px;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  transition: background 0.15s;
  background: ${({ $highlighted }) => ($highlighted ? 'rgba(139, 92, 246, 0.12)' : 'transparent')};

  &:hover {
    background: rgba(139, 92, 246, 0.12);
  }
`;

const ExName = styled.span`
  color: #e2e8f0;
  font-size: 0.9rem;
  font-weight: 500;
`;

const ExMeta = styled.span`
  color: #64748b;
  font-size: 0.75rem;
  font-family: 'Sora', sans-serif;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(139, 92, 246, 0.15);
  color: #8B5CF6;
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

  const search = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/exercises/search`, {
        params: { q: query, limit: 15 },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success && res.data.exercises) {
        setResults(res.data.exercises);
        setIsOpen(true);
        setHighlightIndex(-1);
      }
    } catch {
      // Silently fail — user can still type freely
    } finally {
      setLoading(false);
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

  // Close on outside click
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
    };
  }, []);

  return (
    <Wrapper ref={wrapperRef}>
      <InputRow>
        <SearchIcon size={16} />
        <StyledInput
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          $error={error}
          disabled={disabled}
          autoComplete="off"
          data-testid={rest['data-testid']}
        />
      </InputRow>

      {isOpen && results.length > 0 && (
        <Dropdown role="listbox">
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
