/**
 * Debug version of StoreFront to test basic rendering
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const DebugStoreFront = () => {
  const { user, authAxios } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        console.log('🔍 Fetching packages...');
        const response = await (authAxios || (await import('axios')).default).get('/api/storefront');
        console.log('📦 Response:', response.data);
        
        if (response.data?.success && response.data?.items) {
          setPackages(response.data.items);
        } else {
          setError('No packages found');
        }
      } catch (err) {
        console.error('❌ Error:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackages();
  }, [authAxios]);

  console.log('🚀 Debug StoreFront rendering - User:', user, 'Loading:', isLoading, 'Packages:', packages.length);

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      color: 'white',
      backgroundColor: '#1a1a2e',
      minHeight: '100vh'
    }}>
      <h1 style={{ marginBottom: '2rem', color: '#00ffff' }}>
        🛍️ StoreFront Debug
      </h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>User Status:</strong> {user ? `Logged in as ${user.role}` : 'Not logged in'}
      </div>
      
      {isLoading && (
        <div style={{ marginBottom: '2rem' }}>
          <p>⏳ Loading packages...</p>
        </div>
      )}
      
      {error && (
        <div style={{ marginBottom: '2rem', color: '#ff6b6b' }}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}
      
      {!isLoading && packages.length === 0 && !error && (
        <div style={{ marginBottom: '2rem', color: '#ffa726' }}>
          <p>⚠️ No packages found</p>
        </div>
      )}
      
      {packages.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '1rem', color: '#4caf50' }}>
            ✅ Found {packages.length} packages:
          </h2>
          <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            {packages.map((pkg, index) => (
              <div 
                key={pkg.id || index}
                style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(30, 30, 60, 0.4)',
                  borderRadius: '8px',
                  border: '1px solid rgba(0, 255, 255, 0.2)'
                }}
              >
                <h3 style={{ color: '#00ffff', marginBottom: '0.5rem' }}>
                  {pkg.name}
                </h3>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Type: {pkg.packageType}
                </p>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  Price: ${pkg.displayPrice || pkg.price}
                </p>
                {pkg.description && (
                  <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                    {pkg.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div style={{ marginTop: '2rem', fontSize: '0.85rem', opacity: 0.7 }}>
        <p>🔧 This is a debug version of the StoreFront component</p>
        <p>📍 Location: /store, /shop/training-packages</p>
      </div>
    </div>
  );
};

export default DebugStoreFront;