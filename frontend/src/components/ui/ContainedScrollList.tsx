/**
 * ┌─── SHARED COMPONENT: ContainedScrollList ─────────────────┐
 * │ PURPOSE: Reusable constrained scroll container for         │
 * │          exercise lists, coverage trackers, template        │
 * │          browsers, and any dense list UI.                   │
 * │ DESKTOP: Fixed-height scroll panel with custom scrollbar   │
 * │ MOBILE:  Bottom-sheet pattern (85vh max, drag handle)      │
 * │ TOKENS:  Uses Crystalline Swan CSS custom properties       │
 * └────────────────────────────────────────────────────────────┘
 */

import React, { useState, useCallback, useRef, useMemo, memo } from 'react';
import styled from 'styled-components';
import { Search, X } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface ContainedScrollListProps<T> {
  /** Items to render */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Unique key extractor */
  keyExtractor: (item: T, index: number) => string | number;
  /** Optional search filter function (uncontrolled mode) */
  searchFilter?: (item: T, query: string) => boolean;
  /** Show search bar */
  searchable?: boolean;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Controlled search value (parent owns query state) */
  searchValue?: string;
  /** Controlled search change handler */
  onSearchChange?: (query: string) => void;
  /** Content to show when list is empty */
  emptyState?: React.ReactNode;
  /** Show loading skeleton */
  loading?: boolean;
  /** Number of skeleton rows to show (default: 6) */
  skeletonCount?: number;
  /** Max height on desktop (default: 480px) */
  maxHeight?: string;
  /** Optional header content (above search) */
  header?: React.ReactNode;
  /** Optional footer content (below list) */
  footer?: React.ReactNode;
  /** Grid columns (default: 1) */
  columns?: 1 | 2 | 3;
  /** Gap between items (default: 4px) */
  gap?: string;
  /** Accessible label for the search input */
  searchAriaLabel?: string;
  /** className for styled-components extension */
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Container = styled.div<{ $maxHeight: string }>`
  display: flex;
  flex-direction: column;
  max-height: ${({ $maxHeight }) => $maxHeight};
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: var(--radius-lg, 12px);
  overflow: hidden;

  @media (max-width: 768px) {
    max-height: 85vh;
    border-radius: var(--radius-xl, 16px) var(--radius-xl, 16px) 0 0;
  }
`;

const DragHandle = styled.div`
  display: none;
  @media (max-width: 768px) {
    display: flex;
    justify-content: center;
    padding: 8px 0 4px;
    &::after {
      content: '';
      width: 36px;
      height: 4px;
      border-radius: 2px;
      background: var(--frost-white-25, rgba(224, 236, 244, 0.25));
    }
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin: 4px 12px 8px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  background: var(--bg-base, #0A0A0F);
  flex-shrink: 0;

  svg { color: var(--text-muted-icon, rgba(224, 236, 244, 0.5)); flex-shrink: 0; }
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-heading, 'Sora', sans-serif);
  font-size: 13px;
  &::placeholder { color: var(--text-placeholder, rgba(224, 236, 244, 0.5)); }
`;

const ClearBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-muted-icon, rgba(224, 236, 244, 0.5));
  display: flex;
  align-items: center;
  min-width: 44px;
  min-height: 44px;
  justify-content: center;
  &:hover { color: var(--text-primary, #E0ECF4); }
`;

const ScrollViewport = styled.div<{ $columns: number; $gap: string }>`
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(${({ $columns }) => $columns}, 1fr);
  gap: ${({ $gap }) => $gap};
  padding: 4px 8px 8px;
  align-content: start;

  /* Crystalline Swan scrollbar */
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.15);
    border-radius: 2px;
  }
  &::-webkit-scrollbar-thumb:hover {
    background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.3);
  }
  scrollbar-width: thin;
  scrollbar-color: rgba(96, 192, 240, 0.15) transparent;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EmptyContainer = styled.div`
  grid-column: 1 / -1;
  padding: 32px 16px;
  text-align: center;
  color: var(--text-muted, rgba(230, 237, 243, 0.6));
  font-family: var(--font-heading, 'Sora', sans-serif);
  font-size: 13px;
`;

const SkeletonRow = styled.div`
  height: 52px;
  border-radius: var(--radius-md, 8px);
  background: rgba(var(--ice-wing-rgb, 96, 192, 240), 0.04);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
function ContainedScrollListInner<T>(
  {
    items,
    renderItem,
    keyExtractor,
    searchFilter,
    searchable = false,
    searchPlaceholder = 'Search...',
    searchValue,
    onSearchChange,
    emptyState,
    loading = false,
    skeletonCount = 6,
    maxHeight = '480px',
    header,
    footer,
    columns = 1,
    gap = '4px',
    searchAriaLabel = 'Search items',
    className,
  }: ContainedScrollListProps<T>,
  ref: React.Ref<HTMLDivElement>
) {
  const [internalQuery, setInternalQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Support both controlled (parent owns state) and uncontrolled (internal state) search
  const isControlled = searchValue !== undefined;
  const query = isControlled ? searchValue : internalQuery;
  const setQuery = useCallback((nextQuery: string) => {
    if (isControlled) {
      onSearchChange?.(nextQuery);
      return;
    }
    setInternalQuery(nextQuery);
  }, [isControlled, onSearchChange]);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchFilter) return items;
    return items.filter(item => searchFilter(item, query));
  }, [items, query, searchFilter]);

  const handleClear = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, [setQuery]);

  return (
    <Container $maxHeight={maxHeight} className={className} ref={ref}>
      <DragHandle />
      {header}
      {searchable && (
        <SearchBox>
          <Search size={14} />
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
          />
          {query && (
            <ClearBtn type="button" onClick={handleClear} aria-label="Clear search">
              <X size={14} />
            </ClearBtn>
          )}
        </SearchBox>
      )}
      <ScrollViewport $columns={columns} $gap={gap}>
        {loading
          ? Array.from({ length: skeletonCount }, (_, i) => <SkeletonRow key={`skel-${i}`} />)
          : filtered.length > 0
            ? filtered.map((item, i) => (
                <React.Fragment key={keyExtractor(item, i)}>
                  {renderItem(item, i)}
                </React.Fragment>
              ))
            : (
              <EmptyContainer>
                {emptyState || 'No items found'}
              </EmptyContainer>
            )
        }
      </ScrollViewport>
      {footer}
    </Container>
  );
}

export const ContainedScrollList = memo(React.forwardRef(ContainedScrollListInner)) as <T>(
  props: ContainedScrollListProps<T> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement | null;

export default ContainedScrollList;
