/**
 * Custom Select Component - React Portal Edition
 * ===============================================
 * Accessible schedule dropdown with portal positioning, keyboard navigation,
 * search/filter support, and ARIA listbox semantics.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import type { CustomSelectProps, OpenDirection, SelectOption } from './CustomSelect.types';
import {
  DropdownMenu,
  OptionItem,
  OptionLabel,
  OptionRight,
  PortalDropdown,
  SearchInput,
  SelectButton,
  SelectContainer,
} from './CustomSelect.styles';
import { StyledBox } from '@/components/ui/StyledBox';
export type { CustomSelectProps, OpenDirection, SelectOption } from './CustomSelect.types';

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
  const [openDirection, setOpenDirection] = useState<OpenDirection>('down');

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedOption = options.find(opt => opt.value === value);

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
        $isOpen={isOpen}
        $top={dropdownPosition.top}
        $left={dropdownPosition.left}
        $width={dropdownPosition.width}
        $openDirection={openDirection}
      >
        <DropdownMenu
          $isOpen={isOpen}
          $openDirection={openDirection}
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
            <StyledBox as={OptionItem} $isSelected={false} $isFocused={false} $style={{ cursor: 'default' }}>
              No options found
            </StyledBox>
          ) : (
            filteredOptions.map((option, index) => (
              <OptionItem
                key={option.value}
                $isSelected={option.value === value}
                $isFocused={index === focusedIndex}
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
        $isOpen={isOpen}
        $hasError={hasError}
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
