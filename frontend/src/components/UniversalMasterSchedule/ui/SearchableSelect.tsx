/**
 * SearchableSelect Component
 * ==========================
 * Crystalline Swan themed searchable dropdown with keyboard accessibility.
 *
 * Architecture:
 *   [Text Input + Search Icon] --> [Filtered Dropdown List]
 *       |                              |
 *       +-- typing filters options     +-- ArrowUp/Down highlights
 *       +-- Escape closes              +-- Enter selects
 *       +-- X button clears            +-- Click outside closes
 *
 * ARIA: role="combobox", aria-expanded, aria-activedescendant
 * Touch targets: 44px minimum on all interactive elements
 * Theme: Crystalline Swan CSS variables with dark-first fallbacks
 */

import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import {
  ChevronIcon,
  ClearButton,
  Container,
  Dropdown,
  InputWrapper,
  Label,
  Listbox,
  NoResults,
  Option,
  OptionLabel,
  OptionSubLabel,
  SearchIcon,
  StyledInput,
} from './SearchableSelect.styles';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string; // e.g., "(5 sessions)"
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  label,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const stableId = useId().replace(/:/g, '');
  const listboxId = `searchable-select-listbox-${stableId}`;

  // Derive selected option label
  const selectedOption = useMemo(
    () => options.find(o => o.value === value) || null,
    [options, value],
  );

  // Filter options based on search text
  const filteredOptions = useMemo(() => {
    if (!searchText.trim()) return options;
    const lower = searchText.toLowerCase();
    return options.filter(
      o =>
        o.label.toLowerCase().includes(lower) ||
        (o.subLabel && o.subLabel.toLowerCase().includes(lower)),
    );
  }, [options, searchText]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchText('');
        setHighlightIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightIndex >= 0 && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll('[role="option"]');
      if (items[highlightIndex]) {
        items[highlightIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    setHighlightIndex(-1);
  }, [disabled]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchText('');
    setHighlightIndex(-1);
  }, []);

  const selectOption = useCallback(
    (optionValue: string) => {
      onChange(optionValue);
      closeDropdown();
      // Return focus to input
      inputRef.current?.focus();
    },
    [onChange, closeDropdown],
  );

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSearchText('');
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value);
      setHighlightIndex(-1);
      if (!isOpen) setIsOpen(true);
    },
    [isOpen],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!isOpen) {
            openDropdown();
          } else {
            setHighlightIndex(prev =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0,
            );
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (isOpen) {
            setHighlightIndex(prev =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1,
            );
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (isOpen && highlightIndex >= 0 && filteredOptions[highlightIndex]) {
            selectOption(filteredOptions[highlightIndex].value);
          } else if (!isOpen) {
            openDropdown();
          }
          break;

        case 'Escape':
          e.preventDefault();
          closeDropdown();
          inputRef.current?.focus();
          break;

        case 'Tab':
          closeDropdown();
          break;
      }
    },
    [disabled, isOpen, highlightIndex, filteredOptions, openDropdown, closeDropdown, selectOption],
  );

  const activeDescendantId =
    isOpen && highlightIndex >= 0
      ? `${listboxId}-option-${highlightIndex}`
      : undefined;

  return (
    <Container ref={containerRef}>
      {label && <Label>{label}</Label>}
      <InputWrapper
        $isOpen={isOpen}
        $disabled={disabled}
        onClick={() => !disabled && (isOpen ? inputRef.current?.focus() : openDropdown())}
      >
        <SearchIcon $disabled={disabled}>
          <Search size={16} />
        </SearchIcon>
        <StyledInput
          ref={inputRef}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendantId}
          aria-autocomplete="list"
          aria-label={label || placeholder}
          type="text"
          placeholder={selectedOption ? selectedOption.label : placeholder}
          value={searchText}
          onChange={handleInputChange}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          autoComplete="off"
        />
        {value && !disabled && (
          <ClearButton
            type="button"
            onClick={clearSelection}
            aria-label="Clear selection"
            tabIndex={-1}
          >
            <X size={16} />
          </ClearButton>
        )}
        <ChevronIcon $isOpen={isOpen} $disabled={disabled}>
          <ChevronDown size={16} />
        </ChevronIcon>
      </InputWrapper>

      {isOpen && (
        <Dropdown>
          <Listbox
            ref={listboxRef}
            role="listbox"
            id={listboxId}
            aria-label={label || 'Options'}
          >
            {filteredOptions.length === 0 ? (
              <NoResults>No matches found</NoResults>
            ) : (
              filteredOptions.map((option, index) => {
                const isHighlighted = index === highlightIndex;
                const isSelected = option.value === value;
                return (
                  <Option
                    key={option.value}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    $highlighted={isHighlighted}
                    $selected={isSelected}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onMouseDown={(e) => {
                      // Prevent input blur before selection
                      e.preventDefault();
                    }}
                    onClick={() => selectOption(option.value)}
                  >
                    <OptionLabel>{option.label}</OptionLabel>
                    {option.subLabel && (
                      <OptionSubLabel>{option.subLabel}</OptionSubLabel>
                    )}
                  </Option>
                );
              })
            )}
          </Listbox>
        </Dropdown>
      )}
    </Container>
  );
};

export default SearchableSelect;
