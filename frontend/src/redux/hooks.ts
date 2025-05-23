/**
 * Redux Hooks
 * 
 * Custom typed hooks for using Redux in functional components.
 * These hooks provide type safety when dispatching actions and 
 * selecting state from the Redux store.
 */

import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
