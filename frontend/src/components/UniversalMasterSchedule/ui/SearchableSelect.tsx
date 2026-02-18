/**
 * SearchableSelect Component
 * ==========================
 * Galaxy-Swan themed searchable dropdown with keyboard accessibility.
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
 * Theme: Galaxy-Swan (#0a0a1a background, #00CED1 cyan accents, glass borders)
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { Search, ChevronDown, X } from 'lucide-react';

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

  const listboxId = useMemo(() => `searchable-select-listbox-${Math.random().toString(36).slice(2, 9)}`, []);

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

// ─── Styled Components — Galaxy-Swan Theme ───────────────────────────────────

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #cbd5e1;
  margin-bottom: 6px;
`;

const InputWrapper = styled.div<{ $isOpen: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  background: rgba(10, 10, 26, 0.8);
  border: 1px solid ${({ $isOpen }) => ($isOpen ? 'rgba(0, 206, 209, 0.6)' : 'rgba(0, 206, 209, 0.3)')};
  border-radius: 12px;
  min-height: 44px;
  padding: 0 12px;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  transition: border-color 200ms ease, box-shadow 200ms ease;

  &:hover {
    border-color: ${({ $disabled }) => ($disabled ? 'rgba(0, 206, 209, 0.3)' : 'rgba(0, 206, 209, 0.5)')};
  }

  ${({ $isOpen }) =>
    $isOpen &&
    `
    box-shadow: 0 0 0 3px rgba(0, 206, 209, 0.15);
  `}
`;

const SearchIcon = styled.span<{ $disabled: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $disabled }) => ($disabled ? '#475569' : '#00CED1')};
  flex-shrink: 0;
  margin-right: 8px;
`;

const StyledInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #e2e8f0;
  font-size: 0.9rem;
  font-family: inherit;
  padding: 10px 0;
  min-width: 0;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  transition: color 150ms ease, background 150ms ease;

  &:hover {
    color: #e2e8f0;
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus-visible {
    outline: 2px solid #00CED1;
    outline-offset: 2px;
  }
`;

const ChevronIcon = styled.span<{ $isOpen: boolean; $disabled: boolean }>`
  display: flex;
  align-items: center;
  color: ${({ $disabled }) => ($disabled ? '#475569' : '#94a3b8')};
  flex-shrink: 0;
  margin-left: 4px;
  transition: transform 200ms ease;
  transform: ${({ $isOpen }) => ($isOpen ? 'rotate(180deg)' : 'rotate(0)')};
`;

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid rgba(0, 206, 209, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
`;

const Listbox = styled.ul`
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 240px;
  overflow-y: auto;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.5);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(100, 116, 139, 0.4);
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(148, 163, 184, 0.5);
  }
`;

const Option = styled.li<{ $highlighted: boolean; $selected: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 44px;
  cursor: pointer;
  transition: background 100ms ease;
  border-left: 3px solid transparent;

  ${({ $highlighted }) =>
    $highlighted &&
    `
    background: rgba(0, 206, 209, 0.15);
    border-left: 3px solid #00CED1;
  `}

  ${({ $selected, $highlighted }) =>
    $selected &&
    !$highlighted &&
    `
    background: rgba(0, 206, 209, 0.08);
  `}

  &:hover {
    background: rgba(0, 206, 209, 0.1);
  }
`;

const OptionLabel = styled.span`
  color: #e2e8f0;
  font-size: 0.9rem;
`;

const OptionSubLabel = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin-left: 8px;
`;

const NoResults = styled.li`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  min-height: 44px;
  color: #94a3b8;
  font-size: 0.85rem;
  font-style: italic;
`;
