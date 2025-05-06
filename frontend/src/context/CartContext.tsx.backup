// /frontend/src/context/CartContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
// Removed direct axios import, using authAxios from AuthContext
import { useAuth } from './AuthContext'; // Verify path

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
  fetchCart: async () => {}
});

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { user, token, authAxios } = useAuth(); // Use authAxios from AuthContext
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Define fetchCart with useCallback directly
  const fetchCart = useCallback(async (): Promise<void> => {
    if (!user || !token) return;

    try {
      setLoading(true);
      setError(null);
      // Use authAxios instance which handles tokens and proxy
      const response = await authAxios.get('/api/cart'); // Relative path for proxy
      // Add basic validation for the response structure
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(response.data);
      } else {
          console.warn("Invalid cart data received from API:", response.data);
          setCart(null); // Reset cart if data is invalid
          setError("Failed to load cart: Invalid data format.");
      }
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      const message = err.response?.data?.message || "Failed to load your cart";
      setError(message);
      setCart(null); // Reset cart on error
    } finally {
      setLoading(false);
    }
  }, [user, token, authAxios]); // Include authAxios

  // Fetch cart when component loads and token/user.id changes
  useEffect(() => {
    if (user && token) {
      fetchCart();
    } else if (cart !== null) { // Only reset if cart existed
      setCart(null);
    }
    // Dependencies ensure this runs on login/logout and fetchCart definition change (stable due to useCallback)
  }, [user?.id, token, fetchCart]); // fetchCart included as dependency

  // Add item to cart - Updated signature
  const addToCart = useCallback(async (itemData: AddToCartPayload): Promise<void> => {
    if (!user || !token) {
      setError("Please login to add items to cart");
      return Promise.reject(new Error("User not logged in"));
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
      // Use authAxios instance
      const response = await authAxios.post('/api/cart/add', { storefrontItemId, quantity }); // Relative path
       if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
           setCart(response.data);
           setShowCart(true); // Show cart after adding an item
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
  }, [user, token, authAxios]); // Added authAxios

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!user || !token || quantity < 1) return;

    setLoading(true);
    setError(null);
    try {
      // Use authAxios instance
      const response = await authAxios.put(`/api/cart/update/${itemId}`, { quantity }); // Relative path
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
  }, [user, token, authAxios]); // Added authAxios

  // Remove item from cart
  const removeItem = useCallback(async (itemId: number): Promise<void> => {
    if (!user || !token) return;

    setLoading(true);
    setError(null);
    try {
      // Use authAxios instance
      const response = await authAxios.delete(`/api/cart/remove/${itemId}`); // Relative path
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
  }, [user, token, authAxios]); // Added authAxios

  // Clear entire cart
  const clearCart = useCallback(async (): Promise<void> => {
    if (!user || !token) return;

    setLoading(true);
    setError(null);
    try {
      // Use authAxios instance
      await authAxios.delete('/api/cart/clear'); // Relative path
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
  }, [user, token, authAxios]); // Added authAxios

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
      fetchCart
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