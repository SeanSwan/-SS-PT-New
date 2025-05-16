// /frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// Using authAxios from AuthContext for consistent authentication
import { useAuth } from './AuthContext';

// Define types for TypeScript
interface CartItem {
  id: number;
  quantity: number;
  price: number;
  storefrontItemId: number;
  storefrontItem?: { // Optional based on backend include
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

// Define the structure for the argument passed to addToCart
// Reflecting the change in StoreFront component
interface AddToCartPayload {
    id: number | string; // The storefront item ID (can be string initially)
    name?: string;
    price?: number;
    quantity?: number;
}


interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCart: boolean;
  addToCart: (itemData: AddToCartPayload) => Promise<void>; // Signature matches StoreFront
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  hideCart: () => void;
  fetchCart: () => Promise<void>;
  refreshCart: () => void; // Added manual refresh function
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
  const { user, token, authAxios, isAuthenticated } = useAuth(); // Also get isAuthenticated
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Define fetchCart with useCallback directly
  const fetchCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !token) {
      // Don't attempt to fetch if not authenticated
      console.log('Not authenticated, skipping cart fetch');
      setCart(null);
      return;
    }

    // Allow all authenticated users to have a cart, but restrict purchasing based on role
    if (!user) {
      console.log('User data not available yet, waiting...');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching cart with auth token:', token ? 'Token exists' : 'No token');
      
      // Ensure authorization header is set
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use authAxios instance which handles tokens and proxy
      const response = await authAxios.get('/api/cart', { headers }); // Explicit headers
      
      console.log('Cart response:', response.status, response.statusText);
      
      // Add basic validation for the response structure
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          // RESET CART FOR NEW LOGIN: Only set cart data if not from initial login
          const skipInitialCart = localStorage.getItem('skipInitialCart');
          if (!skipInitialCart) {
            // This is initial login - set an empty cart
            console.log('First login, creating empty cart instead of loading existing items');
            setCart({
              ...response.data,
              items: [],
              total: 0,
              itemCount: 0
            });
            // Set flag so we don't reset on subsequent fetches
            localStorage.setItem('skipInitialCart', 'true');
          } else {
            // Normal fetch - use server data
            setCart(response.data);
            console.log('Cart data loaded successfully:', response.data.items.length, 'items');
          }
      } else {
          console.warn("Invalid cart data received from API:", response.data?.message || 'Unexpected response format');
          setCart(null); // Reset cart if data is invalid
          setError("Failed to load cart: Invalid data format.");
      }
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      const message = err.response?.data?.message || "Failed to load your cart";
      setError(message);
      setCart(null); // Reset cart on error
      
      // Add more detailed error logging
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        
        // If 401, suggest token may be invalid
        if (err.response.status === 401) {
          console.error('Authentication token may be invalid or expired');
          // Force token refresh or re-login could be implemented here
        }
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios]); // Include isAuthenticated in dependencies

  // Fetch cart when component loads and auth state changes - with loop prevention
  useEffect(() => {
    // Use static flag to prevent repeated calls within the same session
    // This is a more extreme solution that ensures the loop is broken
    const fetchedKey = 'cart_already_fetched';
    const alreadyFetched = sessionStorage.getItem(fetchedKey);
    
    // Only do the initial fetch once per session
    if (!alreadyFetched && isAuthenticated && token) {
      console.log('First cart fetch for this session');
      sessionStorage.setItem(fetchedKey, 'true');
      
      // Small timeout to ensure auth is stable
      setTimeout(() => {
        fetchCart();
      }, 500);
      
      return;
    }
    
    // Handle logout case only
    if (!isAuthenticated && !token && cart !== null) {
      console.log('User logged out, clearing cart');
      setCart(null);
      sessionStorage.removeItem(fetchedKey); // Reset for next login
    }
  }, [isAuthenticated, token, fetchCart, cart]);
  
  // Separate manual cart refresh function
  const refreshCart = useCallback(() => {
    if (isAuthenticated && token) {
      console.log('Manual cart refresh requested');
      fetchCart();
    }
  }, [isAuthenticated, token, fetchCart]);
  
  // Cleanup hook with minimal dependencies to avoid loops
  useEffect(() => {
    // This effect only runs on auth state changes
    if (!isAuthenticated && !token) {
      // Clear cart-related localStorage items on logout
      localStorage.removeItem('skipInitialCart');
      localStorage.removeItem('lastCheckoutData');
      sessionStorage.removeItem('cart_already_fetched');
    }
  }, [isAuthenticated, token]);

  // Add item to cart - Enhanced with role upgrade logic
  const addToCart = useCallback(async (itemData: AddToCartPayload): Promise<void> => {
    if (!isAuthenticated || !token) {
      setError("Please login to add items to cart");
      return Promise.reject(new Error("User not logged in"));
    }

    // Check if user has permission to purchase
    const canPurchase = user && (user.role === 'admin' || user.role === 'client' || user.role === 'trainer');
    if (!canPurchase) {
      setError("You need appropriate permissions to purchase items.");
      return Promise.reject(new Error("Insufficient permissions"));
    }

    const storefrontItemId = typeof itemData.id === 'string' ? parseInt(itemData.id, 10) : itemData.id;
    if (isNaN(storefrontItemId)) {
        console.error("Invalid storefrontItemId provided to addToCart:", itemData.id);
        setError("Invalid item selected.");
        return Promise.reject(new Error("Invalid item ID"));
    }

    const quantity = itemData.quantity || 1;

    setLoading(true);
    setError(null);
    try {
      // Ensure authorization header is set
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.post('/api/cart/add', { storefrontItemId, quantity }, { headers });
      
      console.log('Add to cart response:', response.status, response.statusText);
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(response.data);
          setShowCart(true); // Show cart after adding an item
          
          // Check if user role should be upgraded
          // If user is 'user' role and they add training sessions, upgrade to 'client'
          if (user?.role === 'user' && response.data.userRoleUpgrade) {
            console.log('User role upgraded to client after adding training sessions');
            // Note: The actual role update should be handled by the backend during checkout
            // This is just a UI notification
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
      return Promise.reject(new Error(message));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios, user]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated || !token || quantity < 1) return;

    setLoading(true);
    setError(null);
    try {
      // Ensure authorization header is set
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.put(`/api/cart/update/${itemId}`, { quantity }, { headers }); // Explicit headers
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
           setCart(prevCart => {
               if (!prevCart) return null;
               return { ...prevCart, ...response.data }; // Merge response data
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
  }, [isAuthenticated, token, authAxios]); // Use isAuthenticated instead of user

  // Remove item from cart
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    if (!isAuthenticated || !token) return;

    setLoading(true);
    setError(null);
    try {
      // Ensure authorization header is set
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.delete(`/api/cart/remove/${itemId}`, { headers }); // Explicit headers
      
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
           setCart(prevCart => {
               if (!prevCart) return null;
               return { ...prevCart, ...response.data }; // Merge response data
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
  }, [isAuthenticated, token, authAxios]); // Use isAuthenticated instead of user

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<void> => {
    if (!isAuthenticated || !token) return;

    setLoading(true);
    setError(null);
    try {
      // Ensure authorization header is set
      const headers = { Authorization: `Bearer ${token}` };
      
      // Use authAxios instance with explicit headers
      await authAxios.delete('/api/cart/clear', { headers }); // Explicit headers
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return { ...prevCart, items: [], total: 0, itemCount: 0 };
      });
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      const message = err.response?.data?.message || "Failed to clear cart";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, authAxios]); // Use isAuthenticated instead of user

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