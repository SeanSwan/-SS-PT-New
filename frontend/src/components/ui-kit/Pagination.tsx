/**
 * Pagination Compound Component
 * ==============================
 * Professional compound component pattern for flexible pagination
 * 
 * Usage:
 * <Pagination>
 *   <Pagination.PrevButton onClick={handlePrev} disabled={currentPage === 1} />
 *   <Pagination.PageNumber>Page {currentPage} of {totalPages}</Pagination.PageNumber>
 *   <Pagination.NextButton onClick={handleNext} disabled={currentPage === totalPages} />
 * </Pagination>
 * 
 * Or with more control:
 * <Pagination>
 *   <Pagination.Button onClick={goToFirst}>First</Pagination.Button>
 *   <Pagination.PrevButton onClick={handlePrev} />
 *   <Pagination.PageInput value={currentPage} onChange={handlePageChange} max={totalPages} />
 *   <Pagination.NextButton onClick={handleNext} />
 *   <Pagination.Button onClick={goToLast}>Last</Pagination.Button>
 * </Pagination>
 */

import React, { createContext, useContext } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ==========================================
// CONTEXT FOR PAGINATION STATE
// ==========================================

interface PaginationContextValue {
  size?: 'sm' | 'md' | 'lg';
}

const PaginationContext = createContext<PaginationContextValue>({
  size: 'md'
});

// ==========================================
// STYLED COMPONENTS
// ==========================================

const StyledPaginationContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
`;

const StyledPaginationButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.6);
  color: ${props => props.disabled ? '#64748b' : '#e2e8f0'};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:hover:not(:disabled) {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.4);
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const StyledIconButton = styled(StyledPaginationButton)`
  min-width: 40px;
  width: 40px;
  padding: 0.5rem;
`;

const StyledPageNumber = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: #cbd5e1;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
`;

const StyledPageInput = styled.input`
  width: 60px;
  height: 40px;
  padding: 0.5rem;
  text-align: center;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &::placeholder {
    color: #64748b;
  }

  /* Remove number input arrows */
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type=number] {
    -moz-appearance: textfield;
  }
`;

const StyledPageSizeSelector = styled.select`
  height: 40px;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(30, 41, 59, 0.6);
  color: #e2e8f0;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e2e8f0' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;

  &:hover {
    border-color: rgba(59, 130, 246, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.6);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  option {
    background: #1e293b;
    color: #e2e8f0;
  }
`;

// ==========================================
// COMPOUND COMPONENTS
// ==========================================

interface PaginationProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

interface PaginationSubComponents {
  PrevButton: typeof PrevButton;
  NextButton: typeof NextButton;
  Button: typeof PaginationButton;
  PageNumber: typeof PageNumber;
  PageInput: typeof PageInput;
  PageSizeSelector: typeof PageSizeSelector;
}

const Pagination: React.FC<PaginationProps> & PaginationSubComponents = ({ 
  children, 
  size = 'md',
  className 
}) => {
  return (
    <PaginationContext.Provider value={{ size }}>
      <StyledPaginationContainer className={className}>
        {children}
      </StyledPaginationContainer>
    </PaginationContext.Provider>
  );
};

// Previous Button Component
interface PrevButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

function PrevButton({ onClick, disabled, children }: PrevButtonProps) {
  return (
    <StyledIconButton onClick={onClick} disabled={disabled} aria-label="Previous page">
      {children || <ChevronLeft />}
    </StyledIconButton>
  );
}

// Next Button Component
interface NextButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

function NextButton({ onClick, disabled, children }: NextButtonProps) {
  return (
    <StyledIconButton onClick={onClick} disabled={disabled} aria-label="Next page">
      {children || <ChevronRight />}
    </StyledIconButton>
  );
}

// Generic Button Component
interface PaginationButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  active?: boolean;
}

function PaginationButton({ onClick, disabled, children, active }: PaginationButtonProps) {
  return (
    <StyledPaginationButton 
      onClick={onClick} 
      disabled={disabled}
      style={active ? {
        background: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 0.6)',
        color: '#60a5fa'
      } : undefined}
    >
      {children}
    </StyledPaginationButton>
  );
}

// Page Number Display Component
interface PageNumberProps {
  children: React.ReactNode;
}

function PageNumber({ children }: PageNumberProps) {
  return <StyledPageNumber>{children}</StyledPageNumber>;
}

// Page Input Component
interface PageInputProps {
  value: number;
  onChange: (page: number) => void;
  max: number;
  min?: number;
  placeholder?: string;
}

function PageInput({ value, onChange, max, min = 1, placeholder = 'Page' }: PageInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <StyledPageInput
      type="number"
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      placeholder={placeholder}
      aria-label="Page number"
    />
  );
}

// Page Size Selector Component
interface PageSizeSelectorProps {
  value: number;
  onChange: (size: number) => void;
  options?: number[];
}

function PageSizeSelector({ value, onChange, options = [10, 25, 50, 100] }: PageSizeSelectorProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <StyledPageSizeSelector 
      value={value} 
      onChange={handleChange}
      aria-label="Items per page"
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option} per page
        </option>
      ))}
    </StyledPageSizeSelector>
  );
}

// Attach sub-components
Pagination.PrevButton = PrevButton;
Pagination.NextButton = NextButton;
Pagination.Button = PaginationButton;
Pagination.PageNumber = PageNumber;
Pagination.PageInput = PageInput;
Pagination.PageSizeSelector = PageSizeSelector;

export default Pagination;
