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

// Container
const SelectContainer = styled.div`
  position: relative;
  width: 100%;
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

// Dropdown menu
const DropdownMenu = styled.ul<{ isOpen: boolean }>`
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  right: 0;
  max-height: 300px;
  background: #1e293b; /* Solid background */
  background-color: #1e293b;
  backdrop-filter: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  overflow-y: auto;
  z-index: 9999;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.2s ease;
  isolation: isolate;
  
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

// Option item
const OptionItem = styled.li<{ isSelected: boolean; isFocused: boolean }>`
  padding: 0.75rem 1rem;
  color: #ffffff;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${props => {
    if (props.isSelected) return '#2563eb';
    if (props.isFocused) return '#334155';
    return '#1e293b'; /* Ensure solid background for items */
  }};
  
  &:hover {
    background-color: #334155;
  }
  
  svg {
    color: #3b82f6;
    opacity: ${props => props.isSelected ? 1 : 0};
  }
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
              {option.label}
              <Check size={16} />
            </OptionItem>
          ))
        )}
      </DropdownMenu>
    </SelectContainer>
  );
};

export default CustomSelect;
