// /frontend/src/context/CartContext.PRODUCTION.tsx
// PRODUCTION-ONLY Cart Context - NO MOCK SYSTEMS OR BYPASSES
// This version ensures only real authenticated users can purchase

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { logger } from '@/utils/logger';
import apiService from '../services/api.service';

// Define types for TypeScript
interface CartItem {
  id: number;
  name?: string;
  packageName?: string;
  quantity: number;
  price: number;
  storefrontItemId: number;
  productVariantId?: number | null;
  productVariant?: {
    id: number;
    label: string;
    sku?: string | null;
    price?: number | null;
    stockQuantity?: number | null;
    attributes?: Record<string, unknown> | null;
  } | null;
  storefrontItem?: {
    name: string;
    description: string;
    imageUrl?: string;
    type: string;
    sessions?: number;
    totalSessions?: number;
    packageType?: string;
    itemKind?: string;
    isTaxable?: boolean;
    fulfillmentType?: string;
  };
}

interface Cart {
  id: number;
  status: string;
  items: CartItem[];
  total: number;
  totalSessions: number;
  itemCount: number;
}

interface AddToCartPayload {
    id: number | string;
    name?: string;
    price?: number;
    quantity?: number;
    productVariantId?: number | string | null;
    sessionCount?: number;
    packageType?: string;
    totalSessions?: number;
    timestamp?: number;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCart: boolean;
  addToCart: (itemData: AddToCartPayload) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  hideCart: () => void;
  fetchCart: () => Promise<void>;
  refreshCart: () => void;
}

// Create context with a default value
export const CartContext = createContext<CartContextType>({
  cart: null,
  loading: false,
  error: null,
  showCart: false,
  addToCart: async () => {},
  updateQuantity: async () => {},
  removeItem: async () => {},
  clearCart: async () => {},
  toggleCart: () => {},
  hideCart: () => {},
  fetchCart: async () => {},
  refreshCart: () => {}
});

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, token, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Prevent multiple fetch operations and track initialization
  const fetchInProgress = useRef<boolean>(false);
  const hasInitialized = useRef<boolean>(false);
  
  const fetchCart = useCallback(async (): Promise<void> => {
    // PRODUCTION: Only fetch cart if user is authenticated
    if (!isAuthenticated || !user || !token) {
      logger.log('User not authenticated, cannot fetch cart');
      setCart(null);
      return;
    }
    
    // Prevent multiple simultaneous fetch operations
    if (fetchInProgress.current) {
      logger.log('Cart fetch already in progress, skipping');
      return;
    }
    
    fetchInProgress.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      logger.log('Fetching cart for authenticated user:', user.username);
      
      const response = await apiService.get('/api/cart');
      
      logger.log('Cart response:', response.status, response.statusText);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
        const cartData = {
          ...response.data,
          totalSessions: response.data.totalSessions || 0
        };
        setCart(cartData);
        logger.log('Cart data loaded successfully:', response.data.items.length, 'items,', cartData.totalSessions, 'total sessions');
      } else {
        logger.warn("Invalid cart data received from API:", response.data?.message || 'Unexpected response format');
        setCart(null);
        setError("Failed to load cart: Invalid data format.");
      }
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      const message = err.response?.data?.message || "Failed to load your cart";
      setError(message);
      setCart(null);
      
      if (err.response?.status === 401) {
        console.error('Authentication token may be invalid or expired');
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [isAuthenticated, token, user?.username]); // CRITICAL: Only depend on user.username, not entire user object

  // Fetch cart on authentication - CRITICAL FIX: Removed fetchCart dependency to break infinite loop
  useEffect(() => {
    // Only fetch if authenticated and haven't initialized yet
    if (isAuthenticated && user && token && !hasInitialized.current) {
      logger.log('User authenticated, initializing cart');
      hasInitialized.current = true;
      fetchCart();
    } else if (!isAuthenticated) {
      // Clear cart when user logs out and reset initialization flag
      setCart(null);
      setError(null);
      hasInitialized.current = false;
    }
  }, [isAuthenticated, user?.id, token]); // CRITICAL: Depend on primitive values only, not functions
  
  const refreshCart = useCallback(() => {
    if (isAuthenticated && user && token) {
      logger.log('Manual cart refresh requested');
      fetchCart();
    }
  }, [isAuthenticated, user?.id, token, fetchCart]); // Stable dependencies
  
  // Success notification
  const showCartNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.setAttribute('role', 'status');
    notification.setAttribute('aria-live', 'polite');
    notification.style.cssText = `
      position: fixed;
      top: max(76px, calc(env(safe-area-inset-top) + 12px));
      right: max(12px, env(safe-area-inset-right));
      width: max-content;
      max-width: min(360px, calc(100vw - 24px));
      box-sizing: border-box;
      background: ${type === 'success'
        ? 'linear-gradient(135deg, var(--midnight-sapphire, #002060), var(--accent-primary, #60C0F0))'
        : 'linear-gradient(135deg, var(--danger, #EF4444), var(--wing-purple, #8B5CF6))'};
      color: var(--text-primary, #E0ECF4);
      border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
      padding: 0.75rem 0.875rem;
      border-radius: 10px;
      font: 600 0.9rem/1.35 "Sora", "Plus Jakarta Sans", sans-serif;
      z-index: var(--z-toast, 1300);
      box-shadow: 0 12px 30px color-mix(in srgb, var(--wing-purple, #8B5CF6) 24%, transparent);
      transform: translateY(-12px);
      opacity: 0;
      transition: opacity 0.22s ease, transform 0.22s ease;
      overflow-wrap: anywhere;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
      notification.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateY(-12px)';
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }, []);

  // Add item to cart - PRODUCTION ONLY
  const addToCart = useCallback(async (itemData: AddToCartPayload): Promise<void> => {
    // PRODUCTION: Require real authentication
    if (!isAuthenticated || !user || !token) {
      setError("Please login to add items to cart");
      return Promise.reject(new Error("User not logged in"));
    }
    
    logger.log('Adding to cart:', itemData);
    
    // 🔧 ROBUST FIX: Handle both 'id' and 'storefrontItemId' property names
    const itemId = (itemData as any).storefrontItemId || itemData.id;
    const storefrontItemId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    const rawProductVariantId = itemData.productVariantId;
    const productVariantId = typeof rawProductVariantId === 'string'
      ? parseInt(rawProductVariantId, 10)
      : rawProductVariantId;
    
    logger.log('🔍 DEBUG: itemData.id =', itemData.id, '| storefrontItemId from data =', (itemData as any).storefrontItemId, '| final itemId =', itemId);
    
    if (!itemId || isNaN(storefrontItemId)) {
        console.error("Invalid storefrontItemId provided to addToCart. itemData.id:", itemData.id, "| storefrontItemId:", (itemData as any).storefrontItemId);
        setError("Invalid item selected.");
        return Promise.reject(new Error("Invalid item ID"));
    }

    if (rawProductVariantId != null && rawProductVariantId !== '' && (!productVariantId || isNaN(Number(productVariantId)))) {
        console.error("Invalid productVariantId provided to addToCart:", rawProductVariantId);
        setError("Invalid product variant selected.");
        return Promise.reject(new Error("Invalid product variant ID"));
    }

    const quantity = itemData.quantity || 1;
    const addPayload = productVariantId
      ? { storefrontItemId, productVariantId, quantity }
      : { storefrontItemId, quantity };

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.post('/api/cart/add', addPayload);
      
      logger.log('Add to cart response:', response.status, response.statusText);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          const cartData = {
            ...response.data,
            totalSessions: response.data.totalSessions || 0
          };
          setCart(cartData);
          setShowCart(true);
          
          const sessionText = cartData.totalSessions > 0 ? ` (${cartData.totalSessions} sessions)` : '';
          showCartNotification(`${itemData.name || 'Item'} added to cart successfully!${sessionText}`);
          
          // Check for role upgrade notification
          if (user?.role === 'user' && response.data.userRoleUpgrade) {
            logger.log('User role upgraded to client after adding training sessions');
            showCartNotification('Your account has been upgraded to client status!', 'success');
          }
          
          return Promise.resolve();
      } else {
          logger.warn("Invalid cart data received after add:", response.data);
          throw new Error("Failed to update cart after adding item.");
      }
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      const message = err.response?.data?.message || "Failed to add item to cart";
      setError(message);
      showCartNotification(message, 'error');
      return Promise.reject(new Error(message));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user, showCartNotification]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated || !user || !token || quantity < 1) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.put(`/api/cart/update/${itemId}`, { quantity });
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
         setCart(prevCart => {
             if (!prevCart) return null;
             return { 
               ...prevCart, 
               ...response.data, 
               totalSessions: response.data.totalSessions || 0 
             };
         });
      } else {
          logger.warn("Invalid cart data received after update:", response.data);
          throw new Error("Failed to update cart quantity.");
      }
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      const message = err.response?.data?.message || "Failed to update quantity";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    if (!isAuthenticated || !user || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.delete(`/api/cart/remove/${itemId}`);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(prevCart => {
              if (!prevCart) return null;
              return { 
                ...prevCart, 
                ...response.data,
                totalSessions: response.data.totalSessions || 0
              };
          });
      } else {
          logger.warn("Invalid cart data received after remove:", response.data);
          throw new Error("Failed to update cart after removing item.");
      }
    } catch (err: any) {
      console.error('Error removing item:', err);
      const message = err.response?.data?.message || "Failed to remove item";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user]);

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user || !token) return Promise.resolve();
    
    // Skip clearing if cart is already empty
    if (!cart || !cart.items || cart.items.length === 0) {
      logger.log('Cart is already empty, skipping clear operation');
      return Promise.resolve();
    }

    setLoading(true);
    setError(null);
    
    try {
      await apiService.delete('/api/cart/clear');
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return { ...prevCart, items: [], total: 0, totalSessions: 0, itemCount: 0 };
      });
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      const message = err.response?.data?.message || "Failed to clear cart";
      setError(message);
      return Promise.resolve();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, user, cart]);

  // Toggle cart visibility
  const toggleCart = useCallback((): void => setShowCart(prev => !prev), []);

  // Hide cart
  const hideCart = useCallback((): void => setShowCart(false), []);

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      error,
      showCart,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      toggleCart,
      hideCart,
      fetchCart,
      refreshCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

// Custom hook to use cart context
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
