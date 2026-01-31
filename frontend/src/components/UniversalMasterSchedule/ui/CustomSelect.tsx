/**
 * Custom Select Component
 * =======================
 * Fully accessible dropdown to replace MUI Select
 * 
 * Features:
 * - Keyboard navigation (Arrow keys, Enter, ESC)
 * - Click to open/close
 * - Search/filter options
 * - ARIA attributes
 * - Full accessibility
 */

import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { ChevronDown, Check } from 'lucide-react';

// Container - establishes positioning context for dropdown
const SelectContainer = styled.div`
  position: relative;
  width: 100%;
  z-index: 1;
`;

// Select button (trigger)
const SelectButton = styled.button<{ isOpen: boolean; hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${props => props.hasError ? '#ef4444' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-align: left;
  outline: none;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
    background: rgba(255, 255, 255, 0.08);
  }
  
  &:focus-visible {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
    transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0)'};
  }
  
  .placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

// Dropdown menu - uses position:fixed to escape modal stacking context
const DropdownMenu = styled.ul<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 200px;
  background: #0f172a;
  background-color: #0f172a;
  backdrop-filter: none;
  border: 2px solid #00d4ff;
  border-radius: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 99999;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 212, 255, 0.3);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  pointer-events: ${props => props.isOpen ? 'auto' : 'none'};
  transform: ${props => props.isOpen ? 'scale(1)' : 'scale(0.95)'};
  transform-origin: top center;
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

// Option item - fully opaque and clickable
const OptionItem = styled.li<{ isSelected: boolean; isFocused: boolean }>`
  padding: 0.875rem 1rem;
  color: #ffffff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.1s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: ${props => {
    if (props.isSelected) return '#2563eb';
    if (props.isFocused) return '#1e3a5f';
    return '#0f172a';
  }};
  user-select: none;

  &:hover {
    background: #1e3a5f;
  }

  &:active {
    background: #2563eb;
  }

  svg {
    color: #00d4ff;
    opacity: ${props => props.isSelected ? 1 : 0};
    flex-shrink: 0;
  }
`;

const OptionLabel = styled.span`
  flex: 1;
`;

const OptionRight = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

// Search input
const SearchInput = styled.input`
  width: calc(100% - 1rem);
  margin: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #ffffff;
  font-size: 0.875rem;
  outline: none;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  &:focus {
    border-color: #3b82f6;
  }
`;

// Option interface
export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

// Props interface
export interface CustomSelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  hasError?: boolean;
  renderOptionTrailing?: (option: SelectOption) => React.ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  hasError = false,
  renderOptionTrailing,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => 
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        } else if (focusedIndex >= 0) {
          e.preventDefault();
          const option = filteredOptions[focusedIndex];
          if (option && !option.disabled) {
            onChange(option.value);
            setIsOpen(false);
            setSearchQuery('');
            buttonRef.current?.focus();
          }
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        }
        break;

      case 'Home':
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        break;

      case 'End':
        if (isOpen) {
          e.preventDefault();
          setFocusedIndex(filteredOptions.length - 1);
        }
        break;
    }
  };

  // Handle option click
  const handleOptionClick = (option: SelectOption) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
      setSearchQuery('');
      buttonRef.current?.focus();
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (isOpen) {
        setSearchQuery('');
      }
    }
  };

  return (
    <SelectContainer ref={containerRef} onKeyDown={handleKeyDown}>
      <SelectButton
        ref={buttonRef}
        isOpen={isOpen}
        hasError={hasError}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        role="combobox"
      >
        <span className={selectedOption ? '' : 'placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} />
      </SelectButton>

      <DropdownMenu
        isOpen={isOpen}
        role="listbox"
        aria-label={ariaLabel || 'Options'}
      >
        {searchable && (
          <SearchInput
            ref={searchRef}
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setFocusedIndex(-1);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {filteredOptions.length === 0 ? (
          <OptionItem isSelected={false} isFocused={false} style={{ cursor: 'default' }}>
            No options found
          </OptionItem>
        ) : (
          filteredOptions.map((option, index) => (
            <OptionItem
              key={option.value}
              isSelected={option.value === value}
              isFocused={index === focusedIndex}
              onClick={() => handleOptionClick(option)}
              role="option"
              aria-selected={option.value === value}
            >
              <OptionLabel>{option.label}</OptionLabel>
              <OptionRight>
                {renderOptionTrailing ? renderOptionTrailing(option) : null}
                <Check size={16} />
              </OptionRight>
            </OptionItem>
          ))
        )}
      </DropdownMenu>
    </SelectContainer>
  );
};

export default CustomSelect;
