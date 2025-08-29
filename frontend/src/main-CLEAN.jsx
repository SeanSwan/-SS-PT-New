import React from 'react';
import ReactDOM from 'react-dom/client';

const App = () => {
  return (
    <div style={{
      background: '#000',
      color: '#fff',
      padding: '50px',
      fontSize: '24px',
      fontFamily: 'Arial',
      minHeight: '100vh'
    }}>
      <h1>SUCCESS: Clean React Build</h1>
      <p>This confirms React and Vite are working correctly</p>
      <p>Build timestamp: {new Date().toISOString()}</p>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
