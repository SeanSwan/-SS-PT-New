/**
 * 📋 CHALLENGE LIST - GRID LAYOUT COMPONENT
 * ========================================
 * Grid layout component for displaying multiple challenges with filtering,
 * sorting, pagination, and responsive design
 */

import React, { useState, useEffect, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Zap,
  Trophy,
  Calendar,
  Users
} from 'lucide-react';
import type { 
  Challenge, 
  ChallengeListFilter,
  ChallengeType,
  ChallengeDifficulty,
  ChallengeCategory 
} from '../../types/challenge.types';
import { ChallengeCard } from './ChallengeCard';
import { AnimatedButton } from '../../shared/AnimatedButton';
import { TabNavigation, TabItem } from '../../shared/TabNavigation';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface ChallengeListProps {
  challenges: Challenge[];
  loading?: boolean;
  error?: string | null;
  
  // User interaction
  onChallengeJoin?: (challengeId: string) => Promise<void>;
  onChallengeLeave?: (challengeId: string) => Promise<void>;
  onChallengeView?: (challengeId: string) => void;
  onChallengeShare?: (challengeId: string) => void;
  
  // List controls
  onSearch?: (query: string) => void;
  onFilter?: (filters: Partial<ChallengeListFilter>) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onRefresh?: () => void;
  
  // Pagination
  currentPage?: number;
  totalPages?: number;
  totalChallenges?: number;
  onPageChange?: (page: number) => void;
  
  // Display options
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  showFilters?: boolean;
  showSearch?: boolean;
  showPagination?: boolean;
  emptyStateMessage?: string;
  
  // User participation data
  userChallenges?: Challenge[];
  userProgress?: Record<string, any>;
  
  className?: string;
}

interface FilterOptions {
  type: ChallengeType[];
  difficulty: ChallengeDifficulty[];
  category: ChallengeCategory[];
  status: string[];
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const ListContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ListHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const SearchSection = styled.div`
  display: flex;
  flex: 1;
  gap: 1rem;
  align-items: center;
  
  @media (max-width: 767px) {
    flex-direction: column;
    width: 100%;
  }
`;

const SearchInput = styled.div`
  position: relative;
  flex: 1;
  max-width: 400px;
  
  @media (max-width: 767px) {
    max-width: none;
    width: 100%;
  }
`;

const SearchField = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #ffffff;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 3px rgba(0, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.12);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
`;

const ControlsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
  
  @media (max-width: 767px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ViewModeToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.12);
`;

const ViewModeButton = styled.button<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: ${({ $isActive }) => $isActive ? '#00ffff' : 'transparent'};
  color: ${({ $isActive }) => $isActive ? '#000' : 'rgba(255, 255, 255, 0.7)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${({ $isActive }) => $isActive ? '#00ffff' : 'rgba(255, 255, 255, 0.1)'};
    color: ${({ $isActive }) => $isActive ? '#000' : '#ffffff'};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const FiltersBar = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
`;

const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 120px;
`;

const FilterLabel = styled.label`
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ResultsInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const ResultsCount = styled.span`
  font-weight: 500;
`;

const SortControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ChallengeGrid = styled(motion.div)<{ $viewMode: 'grid' | 'list' }>`
  display: grid;
  gap: 1.5rem;
  
  ${({ $viewMode }) => $viewMode === 'grid' ? css`
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  ` : css`
    grid-template-columns: 1fr;
  `}
`;

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LoadingCard = styled(motion.div)`
  height: 300px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

const EmptyState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  
  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.3);
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
  }
  
  p {
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
    max-width: 400px;
  }
`;

const ErrorState = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  background: rgba(255, 71, 87, 0.05);
  border: 1px solid rgba(255, 71, 87, 0.2);
  border-radius: 16px;
  color: #ff4757;
  
  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 1rem;
  }
  
  h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  p {
    margin: 0 0 1.5rem 0;
    font-size: 0.95rem;
    opacity: 0.8;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem 0;
`;

const PageButton = styled.button<{ $isActive?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  ${({ $isActive }) => $isActive ? css`
    background: #00ffff;
    color: #000;
  ` : css`
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    
    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
    }
  `}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    
    &:hover {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.7);
    }
  }
`;

const PageInfo = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 1rem;
`;

// ================================================================
// FILTER OPTIONS
// ================================================================

const filterOptions: FilterOptions = {
  type: ['daily', 'weekly', 'monthly', 'special', 'community'],
  difficulty: ['beginner', 'intermediate', 'advanced', 'expert'],
  category: ['cardio', 'strength', 'flexibility', 'nutrition', 'mindfulness', 'social', 'hybrid'],
  status: ['active', 'upcoming', 'completed']
};

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const listVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const cardVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

const filtersVariants = {
  initial: { height: 0, opacity: 0 },
  animate: { 
    height: 'auto', 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: { 
    height: 0, 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const ChallengeList: React.FC<ChallengeListProps> = ({
  challenges = [],
  loading = false,
  error = null,
  onChallengeJoin,
  onChallengeLeave,
  onChallengeView,
  onChallengeShare,
  onSearch,
  onFilter,
  onSort,
  onRefresh,
  currentPage = 0,
  totalPages = 1,
  totalChallenges = 0,
  onPageChange,
  viewMode = 'grid',
  onViewModeChange,
  showFilters = true,
  showSearch = true,
  showPagination = true,
  emptyStateMessage = "No challenges found. Check back later for new challenges!",
  userChallenges = [],
  userProgress = {},
  className
}) => {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Partial<ChallengeListFilter>>({});
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'difficulty' | 'ending_soon'>('newest');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filter tabs
  const filterTabs: TabItem[] = [
    { id: 'all', label: 'All', icon: <Grid size={16} /> },
    { id: 'active', label: 'Active', icon: <Zap size={16} /> },
    { id: 'my-challenges', label: 'My Challenges', icon: <Trophy size={16} /> },
    { id: 'upcoming', label: 'Upcoming', icon: <Calendar size={16} /> }
  ];
  
  const [activeTab, setActiveTab] = useState('all');
  
  // Handle search
  useEffect(() => {
    if (onSearch) {
      const timeoutId = setTimeout(() => {
        onSearch(searchQuery);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, onSearch]);
  
  // Handle filtering
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    const filters: Partial<ChallengeListFilter> = {};
    
    switch (tabId) {
      case 'active':
        filters.status = ['active'];
        break;
      case 'my-challenges':
        // Filter to user's challenges
        break;
      case 'upcoming':
        filters.status = ['draft']; // Assuming upcoming challenges are drafts
        break;
      default:
        // Show all
        break;
    }
    
    setActiveFilters(filters);
    if (onFilter) {
      onFilter(filters);
    }
  };
  
  // Handle sorting
  const handleSort = (newSortBy: typeof sortBy) => {
    const newSortOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    
    if (onSort) {
      onSort(newSortBy, newSortOrder);
    }
  };
  
  // Filter challenges based on active tab
  const filteredChallenges = useMemo(() => {
    if (activeTab === 'my-challenges') {
      return userChallenges;
    }
    return challenges;
  }, [challenges, userChallenges, activeTab]);
  
  // Generate pagination buttons
  const generatePaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(0, endPage - maxVisiblePages + 1);
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 0) {
      buttons.push(
        <PageButton key={0} onClick={() => onPageChange?.(0)}>
          1
        </PageButton>
      );
      
      if (startPage > 1) {
        buttons.push(<span key="start-ellipsis">...</span>);
      }
    }
    
    // Add visible page buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <PageButton
          key={i}
          $isActive={i === currentPage}
          onClick={() => onPageChange?.(i)}
        >
          {i + 1}
        </PageButton>
      );
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) {
        buttons.push(<span key="end-ellipsis">...</span>);
      }
      
      buttons.push(
        <PageButton key={totalPages - 1} onClick={() => onPageChange?.(totalPages - 1)}>
          {totalPages}
        </PageButton>
      );
    }
    
    return buttons;
  };
  
  return (
    <ListContainer className={className}>
      {/* Header with search and controls */}
      <ListHeader>
        <SearchSection>
          {showSearch && (
            <SearchInput>
              <SearchIcon />
              <SearchField
                type="text"
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchInput>
          )}
        </SearchSection>
        
        <ControlsSection>
          {showFilters && (
            <AnimatedButton
              variant="secondary"
              size="small"
              leftIcon={<Filter size={16} />}
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              isSelected={showFiltersPanel}
            >
              Filter
            </AnimatedButton>
          )}
          
          {onRefresh && (
            <AnimatedButton
              variant="ghost"
              size="small"
              leftIcon={<RefreshCw size={16} />}
              onClick={onRefresh}
              isLoading={loading}
            >
              Refresh
            </AnimatedButton>
          )}
          
          {onViewModeChange && (
            <ViewModeToggle>
              <ViewModeButton
                $isActive={viewMode === 'grid'}
                onClick={() => onViewModeChange('grid')}
                title="Grid view"
              >
                <Grid />
              </ViewModeButton>
              <ViewModeButton
                $isActive={viewMode === 'list'}
                onClick={() => onViewModeChange('list')}
                title="List view"
              >
                <List />
              </ViewModeButton>
            </ViewModeToggle>
          )}
        </ControlsSection>
      </ListHeader>
      
      {/* Filter tabs */}
      <TabNavigation
        tabs={filterTabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        variant="pills"
        size="medium"
        showIndicator={true}
      />
      
      {/* Advanced filters panel */}
      <AnimatePresence>
        {showFiltersPanel && (
          <FiltersBar
            variants={filtersVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <FilterRow>
              <FilterGroup>
                <FilterLabel>Sort By</FilterLabel>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {['newest', 'popular', 'difficulty', 'ending_soon'].map((option) => (
                    <AnimatedButton
                      key={option}
                      variant={sortBy === option ? 'primary' : 'ghost'}
                      size="small"
                      onClick={() => handleSort(option as typeof sortBy)}
                      rightIcon={
                        sortBy === option ? (
                          sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                        ) : undefined
                      }
                    >
                      {option.replace('_', ' ')}
                    </AnimatedButton>
                  ))}
                </div>
              </FilterGroup>
            </FilterRow>
          </FiltersBar>
        )}
      </AnimatePresence>
      
      {/* Results info */}
      <ResultsInfo>
        <ResultsCount>
          {loading ? 'Loading...' : `${filteredChallenges.length} of ${totalChallenges} challenges`}
        </ResultsCount>
        
        <SortControls>
          <span>Sort: {sortBy.replace('_', ' ')}</span>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          </button>
        </SortControls>
      </ResultsInfo>
      
      {/* Error state */}
      {error && (
        <ErrorState
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle />
          <h3>Something went wrong</h3>
          <p>{error}</p>
          {onRefresh && (
            <AnimatedButton
              variant="danger"
              leftIcon={<RefreshCw size={16} />}
              onClick={onRefresh}
            >
              Try Again
            </AnimatedButton>
          )}
        </ErrorState>
      )}
      
      {/* Loading state */}
      {loading && !error && (
        <LoadingGrid>
          {Array.from({ length: 6 }, (_, index) => (
            <LoadingCard
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            />
          ))}
        </LoadingGrid>
      )}
      
      {/* Challenge grid */}
      {!loading && !error && filteredChallenges.length > 0 && (
        <ChallengeGrid
          $viewMode={viewMode}
          variants={listVariants}
          initial="initial"
          animate="animate"
        >
          {filteredChallenges.map((challenge, index) => (
            <motion.div
              key={challenge.id}
              variants={cardVariants}
              transition={{ delay: index * 0.05 }}
            >
              <ChallengeCard
                challenge={challenge}
                userProgress={userProgress[challenge.id]}
                isParticipating={userChallenges.some(uc => uc.id === challenge.id)}
                onJoin={onChallengeJoin}
                onLeave={onChallengeLeave}
                onViewDetails={onChallengeView}
                onShare={onChallengeShare}
                size={viewMode === 'list' ? 'large' : 'medium'}
                variant={viewMode === 'list' ? 'detailed' : 'card'}
              />
            </motion.div>
          ))}
        </ChallengeGrid>
      )}
      
      {/* Empty state */}
      {!loading && !error && filteredChallenges.length === 0 && (
        <EmptyState
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Trophy />
          <h3>No Challenges Found</h3>
          <p>{emptyStateMessage}</p>
        </EmptyState>
      )}
      
      {/* Pagination */}
      {showPagination && totalPages > 1 && !loading && (
        <Pagination>
          <PageButton
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 0}
            title="Previous page"
          >
            <ChevronLeft size={18} />
          </PageButton>
          
          {generatePaginationButtons()}
          
          <PageButton
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            title="Next page"
          >
            <ChevronRight size={18} />
          </PageButton>
          
          <PageInfo>
            Page {currentPage + 1} of {totalPages}
          </PageInfo>
        </Pagination>
      )}
    </ListContainer>
  );
};

export default ChallengeList;
