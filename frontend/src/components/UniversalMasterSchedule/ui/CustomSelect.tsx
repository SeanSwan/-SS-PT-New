/**
 * Custom Select Component - React Portal Edition
 * ===============================================
 * Fully accessible dropdown with React Portal for proper z-index handling
 *
 * Features:
 * - React Portal to escape modal overflow clipping
 * - Keyboard navigation (Arrow keys, Enter, ESC)
 * - Click to open/close
 * - Search/filter options
 * - ARIA attributes
 * - Full accessibility
 * - Proper positioning relative to trigger
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  min-height: 44px; /* Mobile touch target */
  touch-action: manipulation; /* Prevent 300ms tap delay */

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

// Portal-rendered dropdown container - uses fixed positioning
const PortalDropdown = styled.div<{
  isOpen: boolean;
  top: number;
  left: number;
  width: number;
  openDirection: 'down' | 'up';
}>`
  position: fixed;
  top: ${props => props.top}px;
  left: ${props => props.left}px;
  width: ${props => props.width}px;
  z-index: 999999;
  pointer-events: ${props => props.isOpen ? 'auto' : 'none'};
`;

// Dropdown menu - rendered inside portal
const DropdownMenu = styled.ul<{ isOpen: boolean; openDirection: 'down' | 'up' }>`
  max-height: 240px;
  background: #0f172a;
  background-color: #0f172a;
  backdrop-filter: none;
  border: 2px solid #00d4ff;
  border-radius: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  margin: 0;
  padding: 0.5rem 0;
  list-style: none;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 15px rgba(0, 212, 255, 0.3);
  opacity: ${props => props.isOpen ? 1 : 0};
  visibility: ${props => props.isOpen ? 'visible' : 'hidden'};
  transform: ${props => props.isOpen ? 'scale(1)' : 'scale(0.95)'};
  transform-origin: ${props => props.openDirection === 'up' ? 'bottom center' : 'top center'};
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

// Option item - fully opaque and clickable with proper touch target
const OptionItem = styled.li<{ isSelected: boolean; isFocused: boolean }>`
  padding: 0.875rem 1rem;
  min-height: 44px; /* Mobile touch target */
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
  min-height: 44px; /* Mobile touch target */
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: #ffffff;
  font-size: 1rem; /* Prevent iOS zoom */
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [openDirection, setOpenDirection] = useState<'down' | 'up'>('down');

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Calculate dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = Math.min(240, filteredOptions.length * 44 + 16); // Estimated height

      // Determine if dropdown should open upward
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setOpenDirection('up');
        setDropdownPosition({
          top: rect.top - dropdownHeight - 4,
          left: rect.left,
          width: rect.width
        });
      } else {
        setOpenDirection('down');
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    }
  }, [filteredOptions.length]);

  // Update position when opening or on scroll/resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();

      const handleScroll = () => updateDropdownPosition();
      const handleResize = () => updateDropdownPosition();

      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideDropdown = dropdownRef.current?.contains(target);

      if (!isInsideContainer && !isInsideDropdown) {
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
      // Small delay to ensure portal is rendered
      setTimeout(() => searchRef.current?.focus(), 10);
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

  // Render dropdown via portal
  const renderDropdown = () => {
    const dropdown = (
      <PortalDropdown
        ref={dropdownRef}
        isOpen={isOpen}
        top={dropdownPosition.top}
        left={dropdownPosition.left}
        width={dropdownPosition.width}
        openDirection={openDirection}
      >
        <DropdownMenu
          isOpen={isOpen}
          openDirection={openDirection}
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
              onKeyDown={handleKeyDown}
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
      </PortalDropdown>
    );

    // Use portal to render dropdown at document body level
    return createPortal(dropdown, document.body);
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

      {renderDropdown()}
    </SelectContainer>
  );
};

export default CustomSelect;
