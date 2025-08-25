// EMERGENCY REACT RUNTIME FIX - Minimal working version to restore homepage
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { store } from './redux/store';

// Add the theme provider that HomePage needs
import { UniversalThemeProvider } from './context/ThemeContext';

// Import your original HomePage - this is your FULL SwanStudios homepage
import HomePage from './pages/HomePage/components/HomePage.component';

// Emergency minimal layout
const MinimalLayout = ({ children }) => (
  <div style={{ minHeight: '100vh', width: '100%' }}>
    {children}
  </div>
);

// Minimal App component that WILL load your homepage
const App = () => {
  console.log('✅ Loading your ORIGINAL SwanStudios homepage...');
  
  return (
    <Provider store={store}>
      <HelmetProvider>
        <UniversalThemeProvider defaultTheme="swan-galaxy">
          <BrowserRouter>
            <MinimalLayout>
              <Routes>
                <Route path="*" element={<HomePage />} />
              </Routes>
            </MinimalLayout>
          </BrowserRouter>
        </UniversalThemeProvider>
      </HelmetProvider>
    </Provider>
  );
};

export default App;