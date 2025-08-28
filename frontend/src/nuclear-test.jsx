import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('🔥 NUCLEAR TEST: Ultra-minimal React app');

const UltraMinimalApp = () => {
  return (
    <div style={{
      background: 'white',
      color: 'black', 
      padding: '50px',
      fontSize: '24px',
      fontFamily: 'Arial'
    }}>
      <h1>🔥 NUCLEAR TEST SUCCESS</h1>
      <p>If you see this, React is working!</p>
      <p>SwanStudios is loading...</p>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<UltraMinimalApp />);
  console.log('✅ NUCLEAR TEST: Minimal app rendered');
} else {
  console.error('❌ NUCLEAR TEST: Root element not found');
}