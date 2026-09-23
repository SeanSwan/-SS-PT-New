/**
 * STORE INDEX - PRODUCTION SIMPLIFIED
 * Main Redux store configuration file with simplified setup for reliable builds
 * Redux Persist temporarily removed for production stability
 */
import { store } from '../redux/store';
import type { RootState, AppDispatch } from '../redux/store';

// This module remains the compatibility import path used by older consumers.
// The application has one Redux store; reducer customization lives in redux/store.

/**
 * TYPE DEFINITIONS
 * Export TypeScript types for the store state and dispatch function
 */
export type { RootState, AppDispatch };

/**
 * TYPED HOOKS
 * Pre-typed versions of useDispatch and useSelector for TypeScript
 */
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

/**
 * EXPORTS
 * - Named export for the store to use with useSelector/useDispatch
 * - Dummy persister for compatibility with existing components
 */
export { store };

// Dummy persister for compatibility (until redux-persist is properly added)
export const persister = {
  purge: () => Promise.resolve(),
  flush: () => Promise.resolve(),
  pause: () => {},
  persist: () => {},
};

// Default export is the store (for backward compatibility)
export default store;
