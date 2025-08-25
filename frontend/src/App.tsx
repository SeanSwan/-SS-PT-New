// EMERGENCY REACT RUNTIME FIX - Minimal working version to restore homepage + header
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from './redux/store';

// Add the theme provider that HomePage needs
import { UniversalThemeProvider } from './context/ThemeContext';

// EMERGENCY ICON FIX - Import icon fixes to resolve FaArrowLeft error
import './utils/iconFix';

// Import your original HomePage - this is your FULL SwanStudios homepage
import HomePage from './pages/HomePage/components/HomePage.component';

// Import SIMPLE header that won't break React
import SimpleHeader from './components/SimpleHeader';

// Simple layout with header
const SimpleLayout = ({ children }) => (
  <div style={{ minHeight: '100vh', width: '100%' }}>
    <SimpleHeader />
    <div style={{ marginTop: '60px', width: '100%' }}>
      {children}
    </div>
  </div>
);

// Minimal App component that WILL load your homepage WITH SIMPLE HEADER
const App = () => {
  console.log('✅ Loading SwanStudios with SIMPLE HEADER that works...');
  
  return (
    <Provider store={store}>
      <HelmetProvider>
        <UniversalThemeProvider defaultTheme="swan-galaxy">
          <BrowserRouter>
            <SimpleLayout>
              <Routes>
                <Route path="*" element={<HomePage />} />
              </Routes>
            </SimpleLayout>
          </BrowserRouter>
        </UniversalThemeProvider>
      </HelmetProvider>
    </Provider>
  );
};

export default App;