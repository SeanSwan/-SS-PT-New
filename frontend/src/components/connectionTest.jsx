import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';

const TestContainer = styled.div`
  max-width: 800px;
  margin: 100px auto 0;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
`;

const StatusCard = styled.div`
  margin-top: 20px;
  padding: 15px;
  border-radius: 4px;
  background-color: ${props => props.success ? '#e6f7e6' : '#ffecec'};
  border: 1px solid ${props => props.success ? '#a8d9a8' : '#ffbaba'};
`;

const StatusHeader = styled.h3`
  color: ${props => props.success ? '#2e7d32' : '#c62828'};
  margin-top: 0;
`;

const DetailsList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const DetailItem = styled.li`
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
`;

const Button = styled.button`
  background-color: #4a4a4a;
  color: white;
  border: none;
  padding: 10px 15px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 15px;
  
  &:hover {
    background-color: #333;
  }
`;

const ConnectionTest = () => {
  const [apiStatus, setApiStatus] = useState({ loading: true });
  const [socketStatus, setSocketStatus] = useState({ loading: true });

  const testApiConnection = async () => {
    setApiStatus({ loading: true });
    try {
      // Test the health endpoint
      const response = await axios.get('/api/health');
      setApiStatus({
        loading: false,
        success: true,
        data: response.data,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('API connection error:', error);
      setApiStatus({
        loading: false,
        success: false,
        error: error.message || 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const testJwtEndpoint = async () => {
    try {
      const response = await axios.get('/api/test-jwt');
      console.log('JWT test response:', response.data);
      alert(JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error('JWT test error:', error);
      alert(`JWT test failed: ${error.message}`);
    }
  };

  useEffect(() => {
    // Test API connection on component mount
    testApiConnection();
    
    // No need to test socket connection for now
    setSocketStatus({
      loading: false,
      message: 'Socket connection test not implemented yet'
    });
  }, []);

  return (
    <TestContainer>
      <h2>Backend Connection Test</h2>
      
      <div>
        <h3>API Connection</h3>
        {apiStatus.loading ? (
          <p>Testing API connection...</p>
        ) : (
          <StatusCard success={apiStatus.success}>
            <StatusHeader success={apiStatus.success}>
              {apiStatus.success ? 'API Connected Successfully' : 'API Connection Failed'}
            </StatusHeader>
            <DetailsList>
              <DetailItem><strong>Time:</strong> {apiStatus.timestamp}</DetailItem>
              {apiStatus.success ? (
                <DetailItem>
                  <strong>Response:</strong> {JSON.stringify(apiStatus.data)}
                </DetailItem>
              ) : (
                <DetailItem>
                  <strong>Error:</strong> {apiStatus.error}
                </DetailItem>
              )}
              <DetailItem>
                <strong>Endpoint:</strong> /api/health
              </DetailItem>
            </DetailsList>
          </StatusCard>
        )}
        <Button onClick={testApiConnection}>
          Test API Connection Again
        </Button>
        <Button onClick={testJwtEndpoint} style={{ marginLeft: '10px' }}>
          Test JWT Endpoint
        </Button>
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>Application Setup</h3>
        <DetailsList>
          <DetailItem>
            <strong>Frontend URL:</strong> {window.location.origin}
          </DetailItem>
          <DetailItem>
            <strong>Expected API URL:</strong> {window.location.origin}/api
          </DetailItem>
          <DetailItem>
            <strong>Backend Port:</strong> 5000 (expected)
          </DetailItem>
          <DetailItem>
            <strong>Environment:</strong> {process.env.NODE_ENV || 'development'}
          </DetailItem>
        </DetailsList>
      </div>
    </TestContainer>
  );
};

export default ConnectionTest;