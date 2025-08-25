// EMERGENCY REACT RUNTIME FIX - Minimal working version to restore homepage
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from './redux/store';

// Add the theme provider that HomePage needs
import { UniversalThemeProvider } from './context/ThemeContext';

// Add essential context providers for header functionality
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

// EMERGENCY ICON FIX - Import icon fixes to resolve FaArrowLeft error
import './utils/iconFix';

// Import your original HomePage - this is your FULL SwanStudios homepage
import HomePage from './pages/HomePage/components/HomePage.component';

// Import the PROPER Layout component that includes header
import Layout from './components/Layout/layout';

// Minimal App component that WILL load your homepage WITH HEADER
const App = () => {
  console.log('✅ Loading your ORIGINAL SwanStudios homepage with HEADER and full functionality...');
  
  return (
    <Provider store={store}>
      <HelmetProvider>
        <UniversalThemeProvider defaultTheme="swan-galaxy">
          <AuthProvider>
            <CartProvider>
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </CartProvider>
          </AuthProvider>
        </UniversalThemeProvider>
      </HelmetProvider>
    </Provider>
  );
};

export default App;