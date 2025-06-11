/**
 * SimplifiedStoreFront.component.tsx
 * Simplified version of the StoreFront for basic functionality
 */

import React from 'react';
import StoreFront from './StoreFront.component';

const SimplifiedStoreFront: React.FC = () => {
  return (
    <div>
      {/* Simplified banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        background: 'rgba(0, 128, 255, 0.9)',
        color: 'white',
        textAlign: 'center',
        padding: '8px',
        zIndex: 9999,
        fontSize: '0.9rem'
      }}>
        ⚡ SIMPLIFIED VIEW: Basic StoreFront ⚡
      </div>
      
      {/* Add top margin to account for simplified banner */}
      <div style={{ marginTop: '40px' }}>
        <StoreFront />
      </div>
    </div>
  );
};

export default SimplifiedStoreFront;
