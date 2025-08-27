/**
 * COMPONENT ISOLATION TEST - Step by step component testing
 * This will help identify which specific component is causing the React error
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🔬 COMPONENT ISOLATION: Testing components step by step...');

// Test 1: Pure React with no imports
const PureReactTest = () => {
  return (
    <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
      <h1 style={{ color: '#00ffff' }}>✅ Test 1: Pure React - SUCCESS</h1>
      <p>Basic React rendering works without any imports.</p>
    </div>
  );
};

// Test 2: React with React Router (but no context)
let Step2Component = PureReactTest;
try {
  const { BrowserRouter } = await import('react-router-dom');
  Step2Component = () => (
    <BrowserRouter>
      <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: '#00ffff' }}>✅ Test 2: React Router - SUCCESS</h1>
        <p>React Router works without errors.</p>
      </div>
    </BrowserRouter>
  );
  console.log('✅ React Router import - SUCCESS');
} catch (error) {
  console.log('❌ React Router import - FAILED:', error);
}

// Test 3: Redux Provider (minimal)
let Step3Component = Step2Component;
try {
  const { Provider } = await import('react-redux');
  const { store } = await import('./redux/store');
  
  Step3Component = () => (
    <Provider store={store}>
      <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: '#00ffff' }}>✅ Test 3: Redux Store - SUCCESS</h1>
        <p>Redux Provider works without errors.</p>
      </div>
    </Provider>
  );
  console.log('✅ Redux Store import - SUCCESS');
} catch (error) {
  console.log('❌ Redux Store import - FAILED:', error);
}

// Test 4: AuthContext
let Step4Component = Step3Component;
try {
  const { AuthProvider } = await import('./context/AuthContext');
  
  Step4Component = () => (
    <Provider store={store}>
      <AuthProvider>
        <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
          <h1 style={{ color: '#00ffff' }}>✅ Test 4: AuthContext - SUCCESS</h1>
          <p>AuthProvider works without errors.</p>
        </div>
      </AuthProvider>
    </Provider>
  );
  console.log('✅ AuthContext import - SUCCESS');
} catch (error) {
  console.log('❌ AuthContext import - FAILED:', error);
}

// Test 5: HomePage Component
let Step5Component = Step4Component;
try {
  const HomePage = await import('./pages/HomePage/components/HomePage.component');
  
  Step5Component = () => (
    <Provider store={store}>
      <AuthProvider>
        <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
          <h1 style={{ color: '#00ffff' }}>✅ Test 5: HomePage Component - SUCCESS</h1>
          <HomePage.default />
        </div>
      </AuthProvider>
    </Provider>
  );
  console.log('✅ HomePage Component import - SUCCESS');
} catch (error) {
  console.log('❌ HomePage Component import - FAILED:', error);
}

// Determine which test to run based on what succeeded
const FinalComponent = Step5Component || Step4Component || Step3Component || Step2Component || PureReactTest;

console.log('🔬 Running component isolation test...');

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<FinalComponent />);
    console.log('✅ COMPONENT ISOLATION: Some level successful');
  } catch (error) {
    console.error('❌ COMPONENT ISOLATION: Failed at render:', error);
    
    // Fallback to absolute minimal
    root.render(
      <div style={{ padding: '20px', background: '#1a1a2e', color: 'white', minHeight: '100vh' }}>
        <h1 style={{ color: '#ff4444' }}>❌ Component Isolation Failed</h1>
        <p>Error: {error.message}</p>
        <pre style={{ background: '#000', padding: '10px', overflow: 'auto' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
} else {
  console.error('❌ Root element not found');
}
