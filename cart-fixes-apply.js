/**
 * Cart Fixes Implementation Script
 * 
 * Automatically applies all fixes for cart functionality issues:
 * 1. Authentication issue in cart API calls (401 Unauthorized)
 * 2. Updates "View Plan" text to "Add to Cart"
 * 3. Synchronizes cart displays across components
 * 4. Implements follow behavior for cart button
 */

const fs = require('fs');
const path = require('path');

// Paths to the files we need to modify
const BASE_PATH = __dirname;
const CART_CONTEXT_PATH = path.join(BASE_PATH, 'frontend/src/context/CartContext.tsx');
const HEADER_PATH = path.join(BASE_PATH, 'frontend/src/components/Header/header.tsx');
const STOREFRONT_PATH = path.join(BASE_PATH, 'frontend/src/pages/shop/StoreFront.component.tsx');

// Our fixed files content
const CART_CONTEXT_FIXED = `// /frontend/src/context/CartContext.tsx
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
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching cart with auth token:', token ? 'Token exists' : 'No token');
      
      // Ensure authorization header is set
      const headers = { Authorization: \`Bearer \${token}\` };
      
      // Use authAxios instance which handles tokens and proxy
      const response = await authAxios.get('/api/cart', { headers }); // Explicit headers
      
      console.log('Cart response:', response.status, response.statusText);
      
      // Add basic validation for the response structure
      if (response.data && typeof response.data === 'object' && Array.isArray(response.data.items)) {
          setCart(response.data);
          console.log('Cart data loaded successfully:', response.data.items.length, 'items');
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

  // Fetch cart when component loads and auth state changes
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('Auth state changed, fetching cart...');
      fetchCart();
    } else if (cart !== null) { // Only reset if cart existed
      console.log('Not authenticated, clearing cart');
      setCart(null);
    }
    // Dependencies ensure this runs on login/logout and fetchCart definition change
  }, [isAuthenticated, token, fetchCart]); // Use isAuthenticated instead of user?.id

  // Add item to cart - Updated signature
  const addToCart = useCallback(async (itemData: AddToCartPayload): Promise<void> => {
    if (!isAuthenticated || !token) {
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
      // Ensure authorization header is set
      const headers = { Authorization: \`Bearer \${token}\` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.post('/api/cart/add', { storefrontItemId, quantity }, { headers }); // Explicit headers
      
      console.log('Add to cart response:', response.status, response.statusText);
      
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
  }, [isAuthenticated, token, authAxios]); // Use isAuthenticated instead of user

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: number, quantity: number): Promise<void> => {
    if (!isAuthenticated || !token || quantity < 1) return;

    setLoading(true);
    setError(null);
    try {
      // Ensure authorization header is set
      const headers = { Authorization: \`Bearer \${token}\` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.put(\`/api/cart/update/\${itemId}\`, { quantity }, { headers }); // Explicit headers
      
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
      const headers = { Authorization: \`Bearer \${token}\` };
      
      // Use authAxios instance with explicit headers
      const response = await authAxios.delete(\`/api/cart/remove/\${itemId}\`, { headers }); // Explicit headers
      
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
      const headers = { Authorization: \`Bearer \${token}\` };
      
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
};`;

// Main function to apply the fixes
async function applyFixes() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  try {
    console.log('💼 SwanStudios Cart Fixing Utility');
    console.log('------------------------------------');
    console.log('Creating backups of original files...');
    
    // Backup original files
    backupFile(CART_CONTEXT_PATH, timestamp);
    backupFile(HEADER_PATH, timestamp);
    backupFile(STOREFRONT_PATH, timestamp);
    
    console.log('✅ Backups created successfully');
    
    // Apply fixes
    console.log('\nApplying cart fixes...');
    
    // 1. Fix CartContext.tsx
    console.log('🔧 Fixing CartContext.tsx - Adding auth headers and improved error handling');
    await fs.promises.writeFile(CART_CONTEXT_PATH, CART_CONTEXT_FIXED);
    
    // 2. Fix Header.tsx
    console.log('🔧 Fixing Header component - Syncing cart count with context');
    const headerContent = await fs.promises.readFile(HEADER_PATH, 'utf8');
    const updatedHeaderContent = headerContent
      .replace(
        'import { useAuth } from "../../context/AuthContext";', 
        'import { useAuth } from "../../context/AuthContext";\nimport { useCart } from "../../context/CartContext";'
      )
      .replace(
        /const \[cartItems, setCartItems\] = useState\(3\); \/\/ Sample cart items count/g,
        '// Get cart from context instead of using static state\n  const { cart } = useCart();'
      )
      .replace(
        /{cartItems > 0 && <CartBadge>{cartItems}<\/CartBadge>}/g,
        '{cart && cart.itemCount > 0 && <CartBadge>{cart.itemCount}</CartBadge>}'
      );
    await fs.promises.writeFile(HEADER_PATH, updatedHeaderContent);
    
    // 3. Fix StoreFront.component.tsx
    console.log('🔧 Fixing StoreFront component - Button text and floating cart');
    const storefrontContent = await fs.promises.readFile(STOREFRONT_PATH, 'utf8');
    const updatedStorefrontContent = storefrontContent
      // Change button text
      .replace(
        /text=\{isLoadingItem \? "Adding\.\.\." : \(isSubscription \? "View Plan" : "Add to Cart"\)\}/g,
        'text={isLoadingItem ? "Adding..." : "Add to Cart"}'
      )
      // Simplify click handler
      .replace(
        /if \(!isSubscription\) \{\s*handleAddToCart\(item\);\s*\} else \{\s*toast\(\{ title: "Info", description: "Subscription details coming soon!" \}\); \/\/ Placeholder\s*\}/g,
        'handleAddToCart(item);'
      )
      // Fix aria-label
      .replace(
        /aria-label=\{\`\$\{isSubscription \? 'View' : 'Add'\} \$\{item\.name\} \$\{isSubscription \? 'plan' : 'to cart'\}\`\}/g,
        'aria-label={`Add ${item.name} to cart`}'
      )
      // Add cart follow behavior code
      .replace(
        /useEffect\(\(\) => \{\s*const handleScroll = \(\) => setAnimateScrollIndicator\(window\.scrollY < 200\);\s*window\.addEventListener\("scroll", handleScroll\);\s*return \(\) => window\.removeEventListener\("scroll", handleScroll\);\s*\}, \[\]\);/,
        `// Enhanced scroll effects for cart button and scroll indicator
  useEffect(() => {
    const handleScroll = () => {
      // Control scroll indicator animation
      setAnimateScrollIndicator(window.scrollY < 200);
      
      // If we have cart items, ensure cart button follows scroll
      const cartButton = document.querySelector('.cart-follow-button');
      if (cartButton) {
        // Add smooth transition based on scroll position
        if (window.scrollY > 300) {
          cartButton.classList.add('cart-elevated');
        } else {
          cartButton.classList.remove('cart-elevated');
        }
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  
  // Add global styles for cart button transitions
  useEffect(() => {
    // Create style element for cart button transitions
    const styleEl = document.createElement('style');
    styleEl.innerHTML = \`
      .cart-follow-button {
        transition: transform 0.3s ease, box-shadow 0.3s ease, bottom 0.3s ease;
      }
      .cart-elevated {
        bottom: 2.5rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 255, 255, 0.4);
      }
    \`;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);`
      )
      // Add class to cart buttons
      .replace(
        /<PulsingCartButton key="pulsing-cart" onClick=\{handleToggleCart\}/g,
        '<PulsingCartButton className="cart-follow-button" key="pulsing-cart" onClick={handleToggleCart}'
      )
      .replace(
        /<CartButton key="static-cart" onClick=\{handleToggleCart\}/g,
        '<CartButton className="cart-follow-button" key="static-cart" onClick={handleToggleCart}'
      )
      // Enhance button styling
      .replace(
        /const CartButton = styled\(motion\.button\)`[^`]*`;/,
        `const CartButton = styled(motion.button)\` position: fixed; bottom: 2rem; right: 2rem; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #7851a9, #00ffff); border: none; color: white; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.3); z-index: 1000; transition: transform 0.3s ease, box-shadow 0.3s ease; &:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.5); } \`;`
      )
      .replace(
        /const PulsingCartButton = styled\(CartButton\)`[^`]*`;/,
        `const PulsingCartButton = styled(CartButton)\` animation: \${pulseAnimation} 1.5s infinite; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.6); \`;`
      );

    await fs.promises.writeFile(STOREFRONT_PATH, updatedStorefrontContent);
    
    console.log('\n✅ All fixes applied successfully!\n');
    console.log('🎉 Your cart functionality should now work correctly:');
    console.log('   - Fixed authentication issue in cart API calls');
    console.log('   - Changed "View Plan" buttons to "Add to Cart"');
    console.log('   - Synchronized cart displays across components');
    console.log('   - Added "follow" behavior to cart button');
    console.log('\nPlease restart your development server for changes to take effect.');
    
  } catch (error) {
    console.error('\n❌ Error applying fixes:', error);
    console.log('\nPlease restore your backups from the ._backup folder if needed.');
  }
}

// Helper function to backup a file
function backupFile(filePath, timestamp) {
  const dirName = path.dirname(filePath);
  const fileName = path.basename(filePath);
  const backupDir = path.join(dirName, '._backup');
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Create backup file
  const backupFile = path.join(backupDir, `${fileName}.${timestamp}.bak`);
  fs.copyFileSync(filePath, backupFile);
  
  return backupFile;
}

// Run the fix script
applyFixes();