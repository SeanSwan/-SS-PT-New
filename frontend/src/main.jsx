// PHASE 4: REDUX STORE - Adding Redux systematically
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';

// Import your Redux store
import { store } from './redux/store';

// Minimal styles only
import './index.css';

console.log('🚀 PHASE 4: Adding Redux store to SwanStudios...');

// Test Redux component
const ReduxTest = () => {
  const dispatch = useDispatch();
  
  // Try to access different parts of your Redux store safely
  const authState = useSelector((state) => state.auth || null);
  const uiState = useSelector((state) => state.ui || null);
  const appState = useSelector((state) => state.app || null);
  
  return (
    <div style={{
      background: 'rgba(16, 185, 129, 0.1)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid rgba(16, 185, 129, 0.3)',
      marginTop: '1rem'
    }}>
      <h3 style={{ color: '#10b981', marginBottom: '1rem' }}>🔄 Redux Store Test</h3>
      
      <div style={{ color: '#e2e8f0', fontSize: '0.875rem' }}>
        <p><strong>Auth State:</strong> {authState ? '✅ Connected' : '❌ Missing'}</p>
        <p><strong>UI State:</strong> {uiState ? '✅ Connected' : '❌ Missing'}</p>
        <p><strong>App State:</strong> {appState ? '✅ Connected' : '❌ Missing'}</p>
        
        <div style={{ marginTop: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
          <p style={{ margin: 0, fontSize: '0.75rem' }}>
            <strong>Store Keys:</strong> {Object.keys(store.getState()).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );
};

// Simple components for testing routing + Redux
const HomePage = () => (
  <div style={{ padding: '2rem' }}>
    <h2 style={{ color: '#00ffff', marginBottom: '1rem' }}>🏠 Home Page</h2>
    <p style={{ color: '#e2e8f0', marginBottom: '1rem' }}>
      Welcome to SwanStudios! Testing React Router + Redux integration.
    </p>
    
    <ReduxTest />
    
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
      <Link 
        to="/about" 
        style={{ 
          color: '#3b82f6', 
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #3b82f6',
          borderRadius: '6px'
        }}
      >
        → About
      </Link>
      <Link 
        to="/store" 
        style={{ 
          color: '#10b981', 
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #10b981',
          borderRadius: '6px'
        }}
      >
        → Store
      </Link>
    </div>
  </div>
);

const AboutPage = () => (
  <div style={{ padding: '2rem' }}>
    <h2 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>📖 About SwanStudios</h2>
    <p style={{ color: '#e2e8f0', marginBottom: '1rem' }}>
      Revolutionary gamified fitness social ecosystem with AI-powered personal training.
    </p>
    
    <ReduxTest />
    
    <div style={{ marginTop: '1rem' }}>
      <Link 
        to="/" 
        style={{ 
          color: '#3b82f6', 
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #3b82f6',
          borderRadius: '6px'
        }}
      >
        ← Back Home
      </Link>
    </div>
  </div>
);

const StorePage = () => (
  <div style={{ padding: '2rem' }}>
    <h2 style={{ color: '#f59e0b', marginBottom: '1rem' }}>🛍️ SwanStudios Store</h2>
    <p style={{ color: '#e2e8f0', marginBottom: '1rem' }}>
      Training packages, supplements, and fitness gear coming soon!
    </p>
    
    <ReduxTest />
    
    <div style={{ marginTop: '1rem' }}>
      <Link 
        to="/" 
        style={{ 
          color: '#3b82f6', 
          textDecoration: 'none',
          padding: '0.5rem 1rem',
          border: '1px solid #3b82f6',
          borderRadius: '6px'
        }}
      >
        ← Back Home
      </Link>
    </div>
  </div>
);

const SwanStudiosWithRedux = () => {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #333',
        padding: '2rem',
        marginBottom: '0'
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <h1 style={{
            fontSize: '2.5rem',
            background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            🦢 SwanStudios
          </h1>
        </Link>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', margin: 0 }}>
          Personal Training & Fitness Revolution
        </p>
      </header>

      {/* Navigation */}
      <nav style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <Link 
            to="/" 
            style={{ 
              color: '#00ffff', 
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            style={{ 
              color: '#8b5cf6', 
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            About
          </Link>
          <Link 
            to="/store" 
            style={{ 
              color: '#f59e0b', 
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Store
          </Link>
          
          {/* Redux Status Indicator */}
          <div style={{
            marginLeft: 'auto',
            padding: '0.25rem 0.75rem',
            background: 'rgba(16, 185, 129, 0.2)',
            borderRadius: '12px',
            fontSize: '0.75rem',
            color: '#10b981'
          }}>
            🔄 Redux Active
          </div>
        </div>
      </nav>

      {/* Main Content with Routes */}
      <main style={{ padding: '0 2rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="*" element={
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <h2 style={{ color: '#ef4444' }}>404 - Page Not Found</h2>
              <Link to="/" style={{ color: '#3b82f6' }}>← Back Home</Link>
            </div>
          } />
        </Routes>
      </main>

      {/* Status Footer */}
      <footer style={{
        borderTop: '1px solid #333',
        padding: '1rem 2rem',
        marginTop: '3rem',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#64748b', margin: 0 }}>
            SwanStudios Platform - Phase 4: Redux Integration ✅
          </p>
          <div style={{ color: '#10b981', fontSize: '0.875rem' }}>
            ✅ React Router + Redux Working
          </div>
        </div>
      </footer>
    </div>
  );
};

// Main App with Redux Provider
const App = () => (
  <Provider store={store}>
    <BrowserRouter>
      <SwanStudiosWithRedux />
    </BrowserRouter>
  </Provider>
);

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  console.log('✅ PHASE 4: SwanStudios with Redux rendered successfully');
} else {
  console.error('❌ Root element not found');
}
