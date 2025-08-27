/**
 * HOMEPAGE ISOLATION TEST - Test HomePage component specifically
 * This will help identify if HomePage component is causing the React error
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🏠 HOMEPAGE ISOLATION: Testing HomePage component specifically...');

// Test HomePage in complete isolation
const TestHomePage = () => {
  console.log('🏠 TestHomePage: Starting HomePage isolation test...');
  
  // First test: Can we import the HomePage component?
  let HomePage;
  let importError = null;
  
  try {
    // Try to render a mock version first
    console.log('🏠 Creating mock HomePage component...');
    
    const MockHomePage = () => {
      console.log('🏠 MockHomePage: Rendering...');
      
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
            background: 'rgba(0, 255, 0, 0.1)',
            padding: '2rem',
            borderRadius: '12px',
            border: '1px solid #00ff00',
            marginBottom: '2rem'
          }}>
            <h2 style={{ color: '#00ff00' }}>🏠 HOMEPAGE MOCK TEST</h2>
            <p>This is a simplified version of your HomePage content.</p>
            <p>If this loads, the issue is in your actual HomePage component.</p>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
            maxWidth: '1000px',
            margin: '2rem 0'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Personal Training</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Expert NASM-certified trainers provide personalized workout programs.
              </p>
            </div>
            
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              padding: '2rem',
              border: '1px solid rgba(0, 255, 255, 0.2)'
            }}>
              <h3 style={{ color: '#00ffff', marginBottom: '1rem' }}>Premium Equipment</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                High-quality fitness equipment and professional-grade supplements.
              </p>
            </div>
          </div>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            background: 'rgba(255, 255, 0, 0.1)',
            borderRadius: '8px',
            border: '1px solid #ffff00'
          }}>
            <p style={{ color: '#ffff00', margin: 0 }}>
              🎯 If you see this, your HomePage structure can work!
              <br />
              The error is likely in specific HomePage dependencies.
            </p>
          </div>
        </div>
      );
    };
    
    return <MockHomePage />;
    
  } catch (error) {
    console.error('❌ HomePage Mock Test Failed:', error);
    
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#1a0000', 
        color: 'white',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{ color: '#ff4444' }}>❌ HomePage Mock Test Failed</h1>
        <div style={{ 
          background: 'rgba(255, 0, 0, 0.1)',
          padding: '2rem',
          borderRadius: '8px',
          border: '1px solid #ff4444'
        }}>
          <h3>Error Details:</h3>
          <p>{error.message}</p>
          <pre style={{ 
            background: '#000', 
            padding: '1rem', 
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {error.stack}
          </pre>
        </div>
      </div>
    );
  }
};

console.log('🏠 Rendering HomePage isolation test...');

const rootElement = document.getElementById('root');

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<TestHomePage />);
    console.log('✅ HOMEPAGE ISOLATION: Test started successfully');
    
    window.__HOMEPAGE_TEST_STARTED__ = true;
    
  } catch (error) {
    console.error('❌ HOMEPAGE ISOLATION: Failed to start test:', error);
    window.__HOMEPAGE_TEST_STARTED__ = false;
    window.__HOMEPAGE_TEST_ERROR__ = error;
  }
} else {
  console.error('❌ Root element not found');
}
