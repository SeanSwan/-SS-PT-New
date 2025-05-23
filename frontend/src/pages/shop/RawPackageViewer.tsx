// Raw Package Viewer Component - Shows all packages from the API with no filtering
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const Container = styled.div`
  padding: 2rem;
  background: #1a1a2e;
  color: white;
  min-height: 100vh;
`;

const Header = styled.h1`
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #00ffff;
`;

const RefreshButton = styled.button`
  background: rgba(0, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 4px;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: rgba(0, 255, 255, 0.3);
    transform: translateY(-2px);
  }
`;

const PackageList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
`;

const PackageCard = styled.div`
  background: rgba(30, 30, 60, 0.4);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
`;

const PackageTitle = styled.h3`
  color: white;
  font-size: 1.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
`;

const PackageInfo = styled.div`
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
`;

const SectionHeader = styled.h2`
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: #00ddff;
  border-bottom: 1px solid rgba(0, 255, 255, 0.2);
  padding-bottom: 0.5rem;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 40px;
  height: 40px;
  margin: 2rem auto;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const Error = styled.div`
  color: #ff6b6b;
  padding: 1rem;
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 8px;
  margin: 2rem 0;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 2rem;
  
  th, td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  th {
    background: rgba(0, 0, 0, 0.2);
    color: #00ffff;
    font-weight: 500;
  }
  
  tr:nth-child(even) {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-family: monospace;
  margin-bottom: 2rem;
`;

// Helper function to format price
const formatPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '$0';
  return price.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
};

const RawPackageViewer = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timestamp, setTimestamp] = useState(new Date().toLocaleTimeString());
  
  // Expected package names for validation
  const expectedPackages = [
    'Single Session',
    'Silver Package',
    'Gold Package',
    'Platinum Package',
    '3-Month Excellence',
    '6-Month Mastery',
    '9-Month Transformation',
    '12-Month Elite Program'
  ];
  
  const fetchPackages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Add cache-busting parameter
      const cacheBuster = new Date().getTime();
      const response = await axios.get(`/api/storefront?_=${cacheBuster}`);
      
      if (response.data && response.data.success && Array.isArray(response.data.items)) {
        // Sort by display order
        const sortedPackages = [...response.data.items].sort((a, b) => 
          (a.displayOrder || 0) - (b.displayOrder || 0)
        );
        setPackages(sortedPackages);
        setTimestamp(new Date().toLocaleTimeString());
      } else {
        setError('Invalid API response format');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch packages');
    } finally {
      setLoading(false);
    }
  };
  
  // Load packages on mount
  useEffect(() => {
    fetchPackages();
  }, []);
  
  // Group packages by type
  const fixedPackages = packages.filter(pkg => pkg.packageType === 'fixed');
  const monthlyPackages = packages.filter(pkg => pkg.packageType === 'monthly');
  
  // Analyze expected packages
  const missingPackages = expectedPackages.filter(name => 
    !packages.some(pkg => pkg.name === name)
  );
  
  const extraPackages = packages.filter(pkg => 
    !expectedPackages.includes(pkg.name)
  );
  
  return (
    <Container>
      <Header>Raw Package Viewer (Diagnostic)</Header>
      
      <RefreshButton onClick={fetchPackages}>
        🔄 Force Refresh Packages (No Cache)
      </RefreshButton>
      
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <Error>
          <strong>Error:</strong> {error}
        </Error>
      ) : (
        <>
          <div>
            <p>Last updated: {timestamp}</p>
            <p>Total packages: {packages.length}</p>
          </div>
          
          <SectionHeader>Package Analysis</SectionHeader>
          
          <div>
            <h3>Expected Packages Status:</h3>
            <Table>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Status</th>
                  <th>ID</th>
                  <th>Price/Session</th>
                </tr>
              </thead>
              <tbody>
                {expectedPackages.map(name => {
                  const pkg = packages.find(p => p.name === name);
                  return (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{pkg ? '✅ Found' : '❌ Missing'}</td>
                      <td>{pkg?.id || '-'}</td>
                      <td>{pkg ? formatPrice(pkg.pricePerSession) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            
            {missingPackages.length > 0 && (
              <div>
                <h3>Missing Packages ({missingPackages.length}):</h3>
                <ul>
                  {missingPackages.map(name => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {extraPackages.length > 0 && (
              <div>
                <h3>Unexpected Packages ({extraPackages.length}):</h3>
                <Table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Display Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraPackages.map(pkg => (
                      <tr key={pkg.id}>
                        <td>{pkg.id}</td>
                        <td>{pkg.name}</td>
                        <td>{pkg.packageType}</td>
                        <td>{pkg.displayOrder}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
          
          <SectionHeader>Fixed Packages ({fixedPackages.length})</SectionHeader>
          <PackageList>
            {fixedPackages.map(pkg => (
              <PackageCard key={pkg.id}>
                <PackageTitle>{pkg.name}</PackageTitle>
                <PackageInfo><strong>ID:</strong> {pkg.id}</PackageInfo>
                <PackageInfo><strong>Type:</strong> {pkg.packageType}</PackageInfo>
                <PackageInfo><strong>Sessions:</strong> {pkg.sessions}</PackageInfo>
                <PackageInfo><strong>Price/Session:</strong> {formatPrice(pkg.pricePerSession)}</PackageInfo>
                <PackageInfo><strong>Total Price:</strong> {formatPrice(pkg.price || pkg.totalCost)}</PackageInfo>
                <PackageInfo><strong>Display Order:</strong> {pkg.displayOrder}</PackageInfo>
                <PackageInfo><strong>Theme:</strong> {pkg.theme}</PackageInfo>
              </PackageCard>
            ))}
          </PackageList>
          
          <SectionHeader>Monthly Packages ({monthlyPackages.length})</SectionHeader>
          <PackageList>
            {monthlyPackages.map(pkg => (
              <PackageCard key={pkg.id}>
                <PackageTitle>{pkg.name}</PackageTitle>
                <PackageInfo><strong>ID:</strong> {pkg.id}</PackageInfo>
                <PackageInfo><strong>Type:</strong> {pkg.packageType}</PackageInfo>
                <PackageInfo><strong>Months:</strong> {pkg.months}</PackageInfo>
                <PackageInfo><strong>Sessions/Week:</strong> {pkg.sessionsPerWeek}</PackageInfo>
                <PackageInfo><strong>Total Sessions:</strong> {pkg.totalSessions}</PackageInfo>
                <PackageInfo><strong>Price/Session:</strong> {formatPrice(pkg.pricePerSession)}</PackageInfo>
                <PackageInfo><strong>Total Price:</strong> {formatPrice(pkg.price || pkg.totalCost)}</PackageInfo>
                <PackageInfo><strong>Display Order:</strong> {pkg.displayOrder}</PackageInfo>
                <PackageInfo><strong>Theme:</strong> {pkg.theme}</PackageInfo>
              </PackageCard>
            ))}
          </PackageList>
          
          <SectionHeader>Raw Package Data</SectionHeader>
          <CodeBlock>
            {JSON.stringify(packages, null, 2)}
          </CodeBlock>
        </>
      )}
    </Container>
  );
};

export default RawPackageViewer;
