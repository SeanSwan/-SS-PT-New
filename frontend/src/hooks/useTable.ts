/**
 * useTable Hook
 * ==============
 * Reusable hook for table state management with sorting, filtering, and pagination
 * 
 * Usage:
 * const {
 *   paginatedData,
 *   currentPage,
 *   totalPages,
 *   handlePageChange,
 *   handleSearch,
 *   handleSort,
 *   searchTerm,
 *   sortBy,
 *   sortOrder
 * } = useTable<DataType>({
 *   data: myData,
 *   initialRowsPerPage: 10,
 *   searchFields: ['name', 'email']
 * });
 */

import { useState, useMemo, useCallback } from 'react';

// ==========================================
// TYPES
// ==========================================

export type SortOrder = 'asc' | 'desc';

export interface UseTableConfig<T> {
  /** The data array to manage */
  data: T[];
  
  /** Initial number of rows per page */
  initialRowsPerPage?: number;
  
  /** Initial field to sort by */
  initialSortBy?: keyof T | string;
  
  /** Initial sort order */
  initialSortOrder?: SortOrder;
  
  /** Fields to search through (for text search) */
  searchFields?: (keyof T | string)[];
  
  /** Custom filter function (called after search filtering) */
  customFilter?: (item: T) => boolean;
  
  /** Custom sort comparator function */
  customSortComparator?: (a: T, b: T, sortBy: string, sortOrder: SortOrder) => number;
}

export interface UseTableReturn<T> {
  // Data
  /** Current page data after filtering, sorting, and pagination */
  paginatedData: T[];
  
  /** All filtered data (before pagination) */
  filteredData: T[];
  
  /** All sorted data (before pagination) */
  sortedData: T[];
  
  // Pagination
  /** Current page number (1-indexed) */
  currentPage: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Number of rows per page */
  rowsPerPage: number;
  
  /** Whether there is a next page */
  hasNextPage: boolean;
  
  /** Whether there is a previous page */
  hasPrevPage: boolean;
  
  /** Start index of current page (0-indexed) */
  startIndex: number;
  
  /** End index of current page (0-indexed, exclusive) */
  endIndex: number;
  
  /** Total number of items after filtering */
  totalItems: number;
  
  // Search & Filter
  /** Current search term */
  searchTerm: string;
  
  /** Custom filter function (if provided) */
  activeFilter: ((item: T) => boolean) | null;
  
  // Sorting
  /** Current field being sorted by */
  sortBy: string | null;
  
  /** Current sort order */
  sortOrder: SortOrder;
  
  // Actions
  /** Change to a specific page */
  handlePageChange: (page: number) => void;
  
  /** Change rows per page */
  handleRowsPerPageChange: (rowsPerPage: number) => void;
  
  /** Update search term */
  handleSearch: (term: string) => void;
  
  /** Sort by a field */
  handleSort: (field: keyof T | string) => void;
  
  /** Set custom filter */
  setCustomFilter: (filter: ((item: T) => boolean) | null) => void;
  
  /** Reset all filters and search */
  resetFilters: () => void;
  
  /** Go to next page */
  goToNextPage: () => void;
  
  /** Go to previous page */
  goToPrevPage: () => void;
  
  /** Go to first page */
  goToFirstPage: () => void;
  
  /** Go to last page */
  goToLastPage: () => void;
}

// ==========================================
// HOOK IMPLEMENTATION
// ==========================================

export function useTable<T extends Record<string, any>>(
  config: UseTableConfig<T>
): UseTableReturn<T> {
  const {
    data,
    initialRowsPerPage = 10,
    initialSortBy = null,
    initialSortOrder = 'asc',
    searchFields = [],
    customFilter,
    customSortComparator
  } = config;

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(initialSortBy as string);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [activeFilter, setActiveFilter] = useState<((item: T) => boolean) | null>(
    customFilter || null
  );

  // Reset to first page when data changes
  useMemo(() => {
    setCurrentPage(1);
  }, [data, searchTerm, activeFilter, sortBy, sortOrder]);

  // Filter data by search term
  const searchFilteredData = useMemo(() => {
    if (!searchTerm || searchFields.length === 0) {
      return data;
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return data.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field as string);
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(lowerSearchTerm);
      });
    });
  }, [data, searchTerm, searchFields]);

  // Apply custom filter
  const filteredData = useMemo(() => {
    if (!activeFilter) {
      return searchFilteredData;
    }
    return searchFilteredData.filter(activeFilter);
  }, [searchFilteredData, activeFilter]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortBy) {
      return filteredData;
    }

    const sorted = [...filteredData];
    
    sorted.sort((a, b) => {
      // Use custom comparator if provided
      if (customSortComparator) {
        return customSortComparator(a, b, sortBy, sortOrder);
      }

      // Default comparison
      const aValue = getNestedValue(a, sortBy);
      const bValue = getNestedValue(b, sortBy);

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }

      // Fallback to string comparison
      return sortOrder === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    return sorted;
  }, [filteredData, sortBy, sortOrder, customSortComparator]);

  // Calculate pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Get current page data
  const paginatedData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  // Action handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
  }, [totalPages]);

  const handleRowsPerPageChange = useCallback((newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleSort = useCallback((field: keyof T | string) => {
    const fieldStr = String(field);
    
    if (sortBy === fieldStr) {
      // Toggle sort order
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to ascending
      setSortBy(fieldStr);
      setSortOrder('asc');
    }
    
    setCurrentPage(1);
  }, [sortBy]);

  const setCustomFilter = useCallback((filter: ((item: T) => boolean) | null) => {
    setActiveFilter(filter);
    setCurrentPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm('');
    setSortBy(initialSortBy as string);
    setSortOrder(initialSortOrder);
    setActiveFilter(customFilter || null);
    setCurrentPage(1);
  }, [initialSortBy, initialSortOrder, customFilter]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const goToPrevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages || 1);
  }, [totalPages]);

  return {
    // Data
    paginatedData,
    filteredData,
    sortedData,
    
    // Pagination
    currentPage,
    totalPages,
    rowsPerPage,
    hasNextPage,
    hasPrevPage,
    startIndex,
    endIndex,
    totalItems,
    
    // Search & Filter
    searchTerm,
    activeFilter,
    
    // Sorting
    sortBy,
    sortOrder,
    
    // Actions
    handlePageChange,
    handleRowsPerPageChange,
    handleSearch,
    handleSort,
    setCustomFilter,
    resetFilters,
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Gets a nested value from an object using dot notation
 * Example: getNestedValue(obj, 'user.name') returns obj.user.name
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

export default useTable;
