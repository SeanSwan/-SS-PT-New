import { readFileSync } from 'fs';
import { resolve } from 'path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('CartContext auth pipeline', () => {
  it('is mounted globally and consumed by store, checkout, and cart surfaces', () => {
    const appSource = readSource('src/App.tsx');
    const storeSource = readSource('src/pages/shop/StoreV3.tsx');
    const checkoutSource = readSource('src/components/NewCheckout/CheckoutView.tsx');
    const cartSurfaceSource = readSource('src/components/ShoppingCart/ShoppingCart.tsx');

    expect(appSource).toContain("import { CartProvider } from './context/CartContext';");
    expect(appSource).toContain('<CartProvider>');
    expect(storeSource).toContain('useCart()');
    expect(checkoutSource).toContain('useCart()');
    expect(cartSurfaceSource).toContain('useCart()');
  });

  it('is backed by the mounted backend cart routes', () => {
    const routeMountSource = readSource('../backend/core/routes.mjs');
    const cartRoutesSource = readSource('../backend/routes/cartRoutes.mjs');

    expect(routeMountSource).toContain("app.use('/api/cart', cartRoutes)");
    expect(cartRoutesSource).toContain("router.get('/', protect, ensureNumericCartUser");
    expect(cartRoutesSource).toContain("router.post('/add', protect, ensureNumericCartUser");
    expect(cartRoutesSource).toContain("router.put('/update/:itemId', protect, ensureNumericCartUser");
    expect(cartRoutesSource).toContain("router.delete('/remove/:itemId', protect, ensureNumericCartUser");
    expect(cartRoutesSource).toContain("router.delete('/clear', protect, ensureNumericCartUser");
  });

  it('keeps cart reads and mutations on the shared API service', () => {
    const cartContextSource = readSource('src/context/CartContext.tsx');

    expect(cartContextSource).toContain("import apiService from '../services/api.service';");
    expect(cartContextSource).toContain("apiService.get('/api/cart')");
    expect(cartContextSource).toContain("apiService.post('/api/cart/add'");
    expect(cartContextSource).toContain('productVariantId');
    expect(cartContextSource).toContain('apiService.put(`/api/cart/update/${itemId}`');
    expect(cartContextSource).toContain('apiService.delete(`/api/cart/remove/${itemId}`)');
    expect(cartContextSource).toContain("apiService.delete('/api/cart/clear')");
    expect(cartContextSource).not.toContain('authAxios');
    expect(cartContextSource).not.toContain('Authorization');
  });
});
