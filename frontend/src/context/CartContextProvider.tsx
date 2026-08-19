/**
 * COMPONENT: CartProvider
 * PURPOSE: Own the authenticated storefront cart and expose typed mutations to the app.
 * OWNER: Codex pre-launch audit
 * LAST VALIDATED: 2026-07-16
 *
 * WIREFRAME:
 * [AuthProvider] -> [CartProvider] -> [application children]
 *
 * DATA FLOW:
 * Props In: children
 * State: cart, loading, error, showCart
 * API Calls: GET /api/cart; POST /add; PUT /update; DELETE /remove and /clear
 * Events: cart state updates and accessible status notifications
 * Children: the mounted application tree
 *
 * ARCHITECTURE:
 * graph TD
 *   AuthProvider --> CartProvider
 *   CartProvider --> CartContext
 *   CartContext --> StoreAndCheckoutConsumers
 */
import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import apiService from '../services/api.service';
import { logger } from '@/utils/logger';
import { logApiError } from '@/utils/logApiError';
import {
  getCartErrorMessage,
  getCartErrorStatus,
  normalizeCartResponse,
  parsePositiveCartInteger,
  type AddToCartPayload,
  type Cart,
  type CartContextType,
} from './cartContextContracts';
import { CartContext } from './cartContextState';
import { showCartNotification } from './cartNotification';

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const userId = user?.id;
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const fetchGeneration = useRef(0);
  const initializedUserId = useRef<string | null>(null);
  const activeUserId = useRef(userId);
  activeUserId.current = userId;

  const fetchCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !userId || !token) {
      setCart(null);
      return;
    }
    const requestedUserId = userId;
    const requestGeneration = ++fetchGeneration.current;
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<unknown>('/api/cart');
      if (requestGeneration !== fetchGeneration.current || activeUserId.current !== requestedUserId) return;
      const nextCart = normalizeCartResponse(response.data);
      if (!nextCart) throw new Error('Invalid cart data received from the server.');
      setCart(nextCart);
    } catch (caught: unknown) {
      if (requestGeneration !== fetchGeneration.current || activeUserId.current !== requestedUserId) return;
      logApiError('Failed to fetch cart', caught);
      setError(getCartErrorMessage(caught, 'Failed to load your cart'));
      setCart(null);
      if (getCartErrorStatus(caught) === 401) {
        logger.warn('Cart request rejected because authentication is no longer valid');
      }
    } finally {
      if (requestGeneration === fetchGeneration.current && activeUserId.current === requestedUserId) {
        setLoading(false);
      }
    }
  }, [isAuthenticated, token, userId]);

  useEffect(() => {
    if (isAuthenticated && userId && token && initializedUserId.current !== userId) {
      initializedUserId.current = userId;
      setCart(null);
      setError(null);
      void fetchCart();
    } else if (!isAuthenticated) {
      fetchGeneration.current += 1;
      initializedUserId.current = null;
      setCart(null);
      setError(null);
      setLoading(false);
    }
  }, [fetchCart, isAuthenticated, token, userId]);

  const refreshCart = useCallback((): void => {
    if (isAuthenticated && userId && token) void fetchCart();
  }, [fetchCart, isAuthenticated, token, userId]);

  const addToCart = useCallback(async (itemData: AddToCartPayload): Promise<void> => {
    if (!isAuthenticated || !userId || !token) {
      const message = 'Please login to add items to cart';
      setError(message);
      throw new Error(message);
    }

    const storefrontItemId = parsePositiveCartInteger(itemData.storefrontItemId ?? itemData.id);
    const quantity = parsePositiveCartInteger(itemData.quantity ?? 1);
    const rawProductVariantId = itemData.productVariantId;
    const productVariantId = rawProductVariantId == null || rawProductVariantId === ''
      ? null
      : parsePositiveCartInteger(rawProductVariantId);

    if (!storefrontItemId || !quantity) {
      const message = !storefrontItemId ? 'Invalid item selected.' : 'Quantity must be a positive whole number.';
      setError(message);
      throw new Error(message);
    }
    if (rawProductVariantId != null && rawProductVariantId !== '' && !productVariantId) {
      const message = 'Invalid product variant selected.';
      setError(message);
      throw new Error(message);
    }

    const addPayload = productVariantId
      ? { storefrontItemId, productVariantId, quantity }
      : { storefrontItemId, quantity };
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.post<unknown>('/api/cart/add', addPayload);
      const nextCart = normalizeCartResponse(response.data);
      if (!nextCart) throw new Error('Invalid cart data received after adding the item.');
      setCart(nextCart);
      setShowCart(true);

      const sessionText = nextCart.totalSessions > 0 ? ` (${nextCart.totalSessions} sessions)` : '';
      showCartNotification(`${itemData.name || 'Item'} added to cart successfully!${sessionText}`);
      // No client-upgrade toast here: adding to a cart no longer promotes the
      // account (GLM audit 2026-08-15 F2). Promotion happens on payment success.
    } catch (caught: unknown) {
      logApiError('Failed to add cart item', caught);
      const message = getCartErrorMessage(caught, 'Failed to add item to cart');
      setError(message);
      showCartNotification(message, 'error');
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user, userId]);

  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated || !user || !token) return;
    const normalizedItemId = parsePositiveCartInteger(itemId);
    const normalizedQuantity = parsePositiveCartInteger(quantity);
    if (!normalizedItemId || !normalizedQuantity) {
      setError('Quantity must be a positive whole number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.put<unknown>(`/api/cart/update/${normalizedItemId}`, {
        quantity: normalizedQuantity,
      });
      const nextCart = normalizeCartResponse(response.data, cart);
      if (!nextCart) throw new Error('Invalid cart data received after updating quantity.');
      setCart(nextCart);
    } catch (caught: unknown) {
      logApiError('Failed to update cart quantity', caught);
      setError(getCartErrorMessage(caught, 'Failed to update quantity'));
    } finally {
      setLoading(false);
    }
  }, [cart, isAuthenticated, token, user]);

  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    if (!isAuthenticated || !user || !token) return;
    const normalizedItemId = parsePositiveCartInteger(itemId);
    if (!normalizedItemId) {
      setError('Invalid cart item selected.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await apiService.delete<unknown>(`/api/cart/remove/${normalizedItemId}`);
      const nextCart = normalizeCartResponse(response.data, cart);
      if (!nextCart) throw new Error('Invalid cart data received after removing the item.');
      setCart(nextCart);
    } catch (caught: unknown) {
      logApiError('Failed to remove cart item', caught);
      setError(getCartErrorMessage(caught, 'Failed to remove item'));
    } finally {
      setLoading(false);
    }
  }, [cart, isAuthenticated, token, user]);

  const clearCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user || !token || !cart?.items.length) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.delete<unknown>('/api/cart/clear');
      const nextCart = normalizeCartResponse(response.data, cart);
      if (!nextCart) throw new Error('Invalid cart data received after clearing the cart.');
      setCart(nextCart);
    } catch (caught: unknown) {
      logApiError('Failed to clear cart', caught);
      setError(getCartErrorMessage(caught, 'Failed to clear cart'));
    } finally {
      setLoading(false);
    }
  }, [cart, isAuthenticated, token, user]);

  const toggleCart = useCallback((): void => setShowCart((visible) => !visible), []);
  const hideCart = useCallback((): void => setShowCart(false), []);
  const value = useMemo<CartContextType>(() => ({
    cart, loading, error, showCart, addToCart, updateQuantity, removeItem, clearCart,
    toggleCart, hideCart, fetchCart, refreshCart,
  }), [addToCart, cart, clearCart, error, fetchCart, hideCart, loading, refreshCart, removeItem, showCart, toggleCart, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
