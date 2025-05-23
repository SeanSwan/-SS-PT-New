// Simplified StoreFront component for debugging
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';

// Minimal styling to ensure visibility
const containerStyle = {
  minHeight: '100vh',
  backgroundColor: '#1a1a2e',
  color: 'white',
  padding: '2rem'
};

const headerStyle = {
  textAlign: 'center',
  marginBottom: '2rem',
  fontSize: '2rem',
  color: '#00ffff'
};

const packageCardStyle = {
  backgroundColor: 'rgba(30, 30, 60, 0.4)',
  padding: '1.5rem',
  borderRadius: '8px',
  border: '1px solid rgba(0, 255, 255, 0.2)',
  marginBottom: '1rem'
};

const SimplifiedStoreFront = () => {
  console.log('🚀 SimplifiedStoreFront component rendering...');
  
  const { user, authAxios } = useAuth();
  const { cart } = useCart();
  const [packages, setPackages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('📄 Component mounted, fetching packages...');
    
    const fetchPackages = async () => {
      try {
        const httpClient = authAxios || (await import('axios')).default;
        console.log('📡 Making API request to /api/storefront...');
        
        const response = await httpClient.get('/api/storefront');
        console.log('📦 API Response:', response.data);
        
        if (response.data?.success && response.data?.items) {
          setPackages(response.data.items);
          console.log(`✅ Loaded ${response.data.items.length} packages`);
        } else {
          setError('No packages found in response');
          console.log('⚠️ No packages in response');
        }
      } catch (err) {
        console.error('❌ API Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [authAxios]);

  console.log('📊 Render state:', { 
    user: !!user, 
    isLoading, 
    packagesCount: packages.length, 
    error 
  });

  return (
    <div style={containerStyle}>
      <div className="storefront-debug-wrapper">
        <h1 style={headerStyle}>🏪 StoreFront</h1>
        
        <div style={{ marginBottom: '1rem' }}>
          <p>👤 User: {user ? `${user.role} (${user.email})` : 'Not logged in'}</p>
          <p>🛒 Cart: {cart?.itemCount || 0} items</p>
        </div>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>⏳ Loading packages...</p>
          </div>
        )}

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 0, 0, 0.1)', 
            border: '1px solid #ff0000',
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <p><strong>❌ Error:</strong> {error}</p>
          </div>
        )}

        {!isLoading && packages.length === 0 && !error && (
          <div style={{ 
            backgroundColor: 'rgba(255, 165, 0, 0.1)', 
            border: '1px solid #ffa500',
            padding: '1rem',
            borderRadius: '8px'
          }}>
            <p>⚠️ No packages found. Database might not be seeded.</p>
          </div>
        )}

        {packages.length > 0 && (
          <div>
            <h2 style={{ color: '#4caf50', marginBottom: '1rem' }}>
              ✅ {packages.length} Training Packages Available
            </h2>
            
            {packages.map((pkg, index) => (
              <div key={pkg.id || index} style={packageCardStyle}>
                <h3 style={{ color: '#00ffff', marginBottom: '0.5rem' }}>
                  {pkg.name}
                </h3>
                <p>Type: {pkg.packageType}</p>
                <p>Price: ${pkg.displayPrice || pkg.price}</p>
                {pkg.description && <p>{pkg.description}</p>}
                
                <button
                  style={{
                    backgroundColor: '#00ffff',
                    color: '#1a1a2e',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '0.5rem'
                  }}
                  onClick={() => {
                    console.log('🛒 Add to cart clicked for:', pkg.name);
                    alert(`Would add ${pkg.name} to cart (simplified version)`);
                  }}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem',
          backgroundColor: 'rgba(100, 100, 100, 0.1)',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }}>
          <p><strong>🔧 Debug Info:</strong></p>
          <p>• Component: SimplifiedStoreFront</p>
          <p>• Route: /store or /shop/training-packages</p>
          <p>• API: {isLoading ? 'Loading...' : (error ? 'Error' : 'Success')}</p>
          <p>• Render time: {new Date().toLocaleTimeString()}</p>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedStoreFront;