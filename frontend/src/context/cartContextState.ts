/** Shared runtime for the cart provider and consumer hook. */
import { createContext, useContext } from 'react';
import type { CartContextType } from './cartContextContracts';

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
