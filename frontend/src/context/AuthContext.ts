/**
 * Stable public authentication surface.
 *
 * Runtime provider and hook implementations stay in separate modules so
 * React Fast Refresh can preserve the provider component boundary.
 */
export { AuthProvider } from './AuthContextProvider';
export { useAuth } from './authContextState';
export type { User } from './AuthContextProvider';
