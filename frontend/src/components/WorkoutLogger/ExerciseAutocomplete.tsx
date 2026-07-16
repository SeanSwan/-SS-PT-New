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
import { ApiService } from '../../services/api.service';
import {
  Dropdown,
  DropdownItem,
  ExMeta,
  ExName,
  InputRow,
  SearchIconStyled,
  StyledInput,
  TypeBadge,
  Wrapper,
} from './ExerciseAutocomplete.styles';

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
  const [, setLoading] = useState(false);
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
