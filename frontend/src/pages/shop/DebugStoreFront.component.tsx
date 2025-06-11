/**
 * DebugStoreFront.component.tsx
 * Debug version of the StoreFront for troubleshooting
 */

import React from 'react';
import StoreFront from './StoreFront.component';

const DebugStoreFront: React.FC = () => {
  return (
    <div>
      {/* Debug banner */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        background: 'rgba(255, 165, 0, 0.9)',
        color: 'black',
        textAlign: 'center',
        padding: '10px',
        zIndex: 9999,
        fontWeight: 'bold'
      }}>
        🐛 DEBUG MODE: StoreFront Component 🐛
      </div>
      
      {/* Add top margin to account for debug banner */}
      <div style={{ marginTop: '50px' }}>
        <StoreFront />
      </div>
    </div>
  );
};

export default DebugStoreFront;
