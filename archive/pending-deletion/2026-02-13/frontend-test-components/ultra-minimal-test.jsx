/**
 * ULTRA MINIMAL TEST - Strip everything down to bare React
 * This will identify which specific component is causing the React error
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🔬 ULTRA MINIMAL TEST: Testing basic React only...');

// Super simple component with no dependencies
const UltraMinimalTest = () => {
  console.log('✅ UltraMinimalTest component rendering...');
  
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 50%, #334155 100%)',
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '4rem',
        fontWeight: '700',
        color: '#00ffff',
        marginBottom: '1.5rem',
        textShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
      }}>
        SwanStudios
      </h1>
      
      <div style={{
        padding: '2rem',
        background: 'rgba(0, 255, 0, 0.1)',
        borderRadius: '12px',
        border: '1px solid #00ff00',
        marginBottom: '2rem'
      }}>
        <h2 style={{ color: '#00ff00', marginBottom: '1rem' }}>
          🔬 ULTRA MINIMAL TEST SUCCESS!
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', lineHeight: '1.6' }}>
          If you can see this, basic React rendering works!
          <br />
          The error is in a specific component or provider.
        </p>
      </div>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '600px',
        border: '1px solid rgba(0, 255, 255, 0.2)'
      }}>
        <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>
          📊 Test Results
        </h3>
        <ul style={{ 
          color: 'rgba(255, 255, 255, 0.8)', 
          lineHeight: '1.8',
          textAlign: 'left',
          listStyle: 'none',
          padding: 0
        }}>
          <li>✅ React is working</li>
          <li>✅ JSX rendering works</li>
          <li>✅ Basic styling works</li>
          <li>✅ DOM mounting works</li>
          <li>❌ Issue is in specific component/provider</li>
        </ul>
      </div>
      
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(255, 255, 0, 0.1)',
        borderRadius: '8px',
        border: '1px solid #ffff00'
      }}>
        <p style={{ color: '#ffff00', margin: 0, fontWeight: 'bold' }}>
          🎯 NEXT: Test individual components to find the exact problem
        </p>
      </div>
    </div>
  );
};

console.log('🔬 Mounting ultra minimal test...');

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<UltraMinimalTest />);
    console.log('✅ ULTRA MINIMAL TEST: SUCCESS - React core is working!');
    
    window.__ULTRA_TEST_SUCCESS__ = true;
    window.__NEXT_STEP__ = 'Test individual components to find the React error source';
    
  } catch (error) {
    console.error('❌ ULTRA MINIMAL TEST: FAILED - React core issue:', error);
    window.__ULTRA_TEST_SUCCESS__ = false;
    window.__ULTRA_TEST_ERROR__ = error;
  }
} else {
  console.error('❌ Root element not found');
}
