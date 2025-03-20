// /frontend/src/context/CartContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
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

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  showCart: boolean;
  addToCart: (storefrontItemId: number, quantity?: number) => Promise<void>;
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
  const { user, token } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState<boolean>(false);

  // Fetch cart on auth state change
  useEffect(() => {
    if (user && token) {
      fetchCart();
    } else {
      setCart(null);
    }
  }, [user, token]);

  // Fetch the user's cart
  const fetchCart = async (): Promise<void> => {
    if (!user || !token) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCart(response.data);
    } catch (err: any) {
      console.error('Error fetching cart:', err);
      setError(err.response?.data?.message || "Failed to load your cart");
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const addToCart = async (storefrontItemId: number, quantity: number = 1): Promise<void> => {
    if (!user || !token) {
      setError("Please login to add items to cart");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post('/api/cart/add', 
        { storefrontItemId, quantity },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCart(response.data);
      setShowCart(true); // Show cart after adding an item
    } catch (err: any) {
      console.error('Error adding to cart:', err);
      setError(err.response?.data?.message || "Failed to add item to cart");
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: number, quantity: number): Promise<void> => {
    if (!user || !token || quantity < 1) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.put(`/api/cart/update/${itemId}`, 
        { quantity },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return {
          ...prevCart,
          items: response.data.items,
          total: response.data.total,
          itemCount: response.data.itemCount
        };
      });
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      setError(err.response?.data?.message || "Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: number): Promise<void> => {
    if (!user || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.delete(`/api/cart/remove/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return {
          ...prevCart,
          items: response.data.items,
          total: response.data.total,
          itemCount: response.data.itemCount
        };
      });
    } catch (err: any) {
      console.error('Error removing item:', err);
      setError(err.response?.data?.message || "Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  // Clear entire cart
  const clearCart = async (): Promise<void> => {
    if (!user || !token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await axios.delete('/api/cart/clear', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCart(prevCart => {
        if (!prevCart) return null;
        return {
          ...prevCart,
          items: [],
          total: 0,
          itemCount: 0
        };
      });
    } catch (err: any) {
      console.error('Error clearing cart:', err);
      setError(err.response?.data?.message || "Failed to clear cart");
    } finally {
      setLoading(false);
    }
  };

  // Toggle cart visibility
  const toggleCart = (): void => setShowCart(prev => !prev);
  
  // Hide cart
  const hideCart = (): void => setShowCart(false);

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