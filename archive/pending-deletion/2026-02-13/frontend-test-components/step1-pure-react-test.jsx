/**
 * STEP BY STEP TEST - Test components individually 
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

// Import what we need to test step by step
import { BrowserRouter } from 'react-router-dom';

console.log('🔬 STEP BY STEP TEST: Testing each piece individually...');

// Step 1: Absolute minimal test
const Step1_PureReact = () => {
  console.log('✅ Step 1: Pure React component rendering');
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)', 
      color: 'white',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <h1 style={{ color: '#00ffff', fontSize: '3rem', marginBottom: '2rem' }}>
        SwanStudios
      </h1>
      <div style={{ 
        background: 'rgba(0, 255, 0, 0.1)', 
        padding: '2rem', 
        borderRadius: '12px',
        border: '1px solid #00ff00',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#00ff00' }}>🔬 STEP 1 SUCCESS!</h2>
        <p>Pure React rendering works perfectly!</p>
        <p style={{ color: '#ffff00' }}>
          This means the React error is in a specific component or context provider.
        </p>
      </div>
      
      <div style={{
        marginTop: '2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '1.5rem',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h3 style={{ color: '#ff4081', marginBottom: '1rem' }}>📊 Diagnosis</h3>
        <p>✅ React core: Working</p>
        <p>✅ JSX rendering: Working</p>
        <p>✅ Styling: Working</p>
        <p>❌ Issue: Specific component causing React error</p>
        
        <div style={{ 
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(0, 255, 255, 0.1)',
          borderRadius: '6px'
        }}>
          <strong style={{ color: '#00ffff' }}>🎯 SOLUTION:</strong>
          <p>We need to test your HomePage component in isolation.</p>
        </div>
      </div>
    </div>
  );
};

console.log('🔬 Rendering Step 1: Pure React test...');

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<Step1_PureReact />);
    console.log('✅ STEP 1 COMPLETE: Pure React works!');
    
    // Add debug info to window
    window.__STEP1_SUCCESS__ = true;
    window.__DIAGNOSIS__ = 'Pure React works - issue is in specific component';
    
  } catch (error) {
    console.error('❌ STEP 1 FAILED: Even pure React has issues:', error);
    window.__STEP1_SUCCESS__ = false;
    window.__STEP1_ERROR__ = error;
  }
} else {
  console.error('❌ Root element not found');
}
