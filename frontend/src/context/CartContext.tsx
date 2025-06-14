// /frontend/src/context/CartContext.PRODUCTION.tsx
// PRODUCTION-ONLY Cart Context - NO MOCK SYSTEMS OR BYPASSES
// This version ensures only real authenticated users can purchase

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';

// Define types for TypeScript
interface CartItem {
  id: number;
  quantity: number;
  price: number;
  storefrontItemId: number;
  storefrontItem?: {
    name: string;
    description: string;
    imageUrl?: string;
    type: string;
  };
}

interface Cart {
  id: number;
  status: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

interface AddToCartPayload {
    id: number | string;
    name?: string;
    price?: number;
    quantity?: number;
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
  const { user, token, authAxios, isAuthenticated } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Prevent multiple fetch operations
  const fetchInProgress = useRef<boolean>(false);
  
  const fetchCart = useCallback(async (): Promise<void> => {
    // PRODUCTION: Only fetch cart if user is authenticated
    if (!isAuthenticated || !user || !token) {
      console.log('User not authenticated, cannot fetch cart');
      setCart(null);
      return;
    }
    
    // Prevent multiple simultaneous fetch operations
    if (fetchInProgress.current) {
      console.log('Cart fetch already in progress, skipping');
      return;
    }
    
    fetchInProgress.current = true;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching cart for authenticated user:', user.username);
      
      const response = await authAxios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Cart response:', response.status, response.statusText);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
        setCart(response.data);
        console.log('Cart data loaded successfully:', response.data.items.length, 'items');
      } else {
        console.warn("Invalid cart data received from API:", response.data?.message || 'Unexpected response format');
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
  }, [isAuthenticated, token, authAxios, user]);

  // Fetch cart on authentication
  useEffect(() => {
    if (isAuthenticated && user && token && !cart) {
      console.log('User authenticated, fetching cart');
      fetchCart();
    } else if (!isAuthenticated) {
      // Clear cart when user logs out
      setCart(null);
      setError(null);
    }
  }, [isAuthenticated, user, token, fetchCart]);
  
  const refreshCart = useCallback(() => {
    if (isAuthenticated && user && token) {
      console.log('Manual cart refresh requested');
      fetchCart();
    }
  }, [isAuthenticated, user, token, fetchCart]);
  
  // Success notification
  const showCartNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #00ffff, #0080ff)' : 'linear-gradient(135deg, #ff6b9d, #ff4d6d)'};
      color: ${type === 'success' ? '#000' : '#fff'};
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: 500;
      z-index: 10000;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
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
    
    console.log('Adding to cart:', itemData);
    
    // 🔧 ROBUST FIX: Handle both 'id' and 'storefrontItemId' property names
    const itemId = (itemData as any).storefrontItemId || itemData.id;
    const storefrontItemId = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    
    console.log('🔍 DEBUG: itemData.id =', itemData.id, '| storefrontItemId from data =', (itemData as any).storefrontItemId, '| final itemId =', itemId);
    
    if (!itemId || isNaN(storefrontItemId)) {
        console.error("Invalid storefrontItemId provided to addToCart. itemData.id:", itemData.id, "| storefrontItemId:", (itemData as any).storefrontItemId);
        setError("Invalid item selected.");
        return Promise.reject(new Error("Invalid item ID"));
    }

    const quantity = itemData.quantity || 1;

    setLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.post('/api/cart/add', 
        { storefrontItemId, quantity }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Add to cart response:', response.status, response.statusText);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(response.data);
          setShowCart(true);
          
          showCartNotification(`${itemData.name || 'Item'} added to cart successfully!`);
          
          // Check for role upgrade notification
          if (user?.role === 'user' && response.data.userRoleUpgrade) {
            console.log('User role upgraded to client after adding training sessions');
            showCartNotification('Your account has been upgraded to client status!', 'success');
          }
          
          return Promise.resolve();
      } else {
          console.warn("Invalid cart data received after add:", response.data);
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
  }, [isAuthenticated, token, authAxios, user, showCartNotification]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated || !user || !token || quantity < 1) return;

    setLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.put(`/api/cart/update/${itemId}`, 
        { quantity }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
         setCart(prevCart => {
             if (!prevCart) return null;
             return { ...prevCart, ...response.data };
         });
      } else {
          console.warn("Invalid cart data received after update:", response.data);
          throw new Error("Failed to update cart quantity.");
      }
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      const message = err.response?.data?.message || "Failed to update quantity";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios, user]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    if (!isAuthenticated || !user || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await authAxios.delete(`/api/cart/remove/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(prevCart => {
              if (!prevCart) return null;
              return { ...prevCart, ...response.data };
          });
      } else {
          console.warn("Invalid cart data received after remove:", response.data);
          throw new Error("Failed to update cart after removing item.");
      }
    } catch (err: any) {
      console.error('Error removing item:', err);
      const message = err.response?.data?.message || "Failed to remove item";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios, user]);

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !user || !token) return Promise.resolve();
    
    // Skip clearing if cart is already empty
    if (!cart || !cart.items || cart.items.length === 0) {
      console.log('Cart is already empty, skipping clear operation');
      return Promise.resolve();
    }

    setLoading(true);
    setError(null);
    
    try {
      await authAxios.delete('/api/cart/clear', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return { ...prevCart, items: [], total: 0, itemCount: 0 };
      });
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      const message = err.response?.data?.message || "Failed to clear cart";
      setError(message);
      return Promise.resolve();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios, user, cart]);

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