/**
 * DataVerificationPanel.tsx - Admin Data Accuracy Verification
 * =============================================================
 * 
 * Simple panel for admins to verify that dashboard data matches real sources
 * Helps ensure confidence in business analytics and reporting
 * 
 * Features:
 * - Compare dashboard data with Stripe dashboard
 * - View data sources and calculation methods  
 * - Test specific calculations step-by-step
 * - Force refresh cached data
 * - Export verification reports
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../../context/AuthContext';
import {
  Shield, Search, RefreshCw, Download, CheckCircle, AlertTriangle,
  Database, CreditCard, BarChart3, Settings, ExternalLink,
  Eye, Calculator, Zap, Clock, TrendingUp
} from 'lucide-react';

// Styled Components
const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 255, 255, 0.6); }
  100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.3); }
`;

const VerificationContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(10, 10, 26, 0.9) 0%, rgba(30, 58, 138, 0.1) 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(59, 130, 246, 0.3);
  backdrop-filter: blur(20px);
  position: relative;
  overflow: hidden;
  margin-bottom: 2rem;
`;

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const PanelTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const VerificationGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const VerificationCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 16px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(59, 130, 246, 0.6);
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

const CardIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color || 'rgba(59, 130, 246, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
  color: ${props => props.iconColor || '#3b82f6'};
`;

const CardTitle = styled.h3`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
`;

const CardDescription = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  line-height: 1.4;
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 255, 255, 0.1));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  width: 100%;
  justify-content: center;
  
  &:hover {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(0, 255, 255, 0.2));
    border-color: rgba(59, 130, 246, 0.6);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ResultsPanel = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 1rem;
  max-height: 400px;
  overflow-y: auto;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  background: ${props => {
    switch (props.status) {
      case 'success': return 'rgba(16, 185, 129, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.status) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#3b82f6';
    }
  }};
  border: 1px solid ${props => {
    switch (props.status) {
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(59, 130, 246, 0.3)';
    }
  }};
`;

const CodeBlock = styled.pre`
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  font-size: 0.8rem;
  color: #00ffff;
  margin: 1rem 0;
  border: 1px solid rgba(59, 130, 246, 0.2);
`;

interface VerificationResult {
  success: boolean;
  data?: any;
  message?: string;
  error?: string;
}

const DataVerificationPanel: React.FC = () => {
  const { authAxios } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: string]: VerificationResult}>({});

  const runVerification = async (type: string, endpoint: string, description: string) => {
    try {
      setLoading(type);
      console.log(`🔍 Running ${description}...`);
      
      const response = await authAxios.get(endpoint);
      
      setResults(prev => ({
        ...prev,
        [type]: {
          success: true,
          data: response.data,
          message: description + ' completed successfully'
        }
      }));
      
      console.log(`✅ ${description} completed:`, response.data);
      
    } catch (error: any) {
      console.error(`❌ ${description} failed:`, error);
      
      setResults(prev => ({
        ...prev,
        [type]: {
          success: false,
          error: error.response?.data?.message || error.message,
          message: description + ' failed'
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const verificationTests = [
    {
      id: 'stripe-comparison',
      title: 'Stripe Data Comparison',
      description: 'Compare your dashboard revenue with raw Stripe API data to verify accuracy',
      icon: <CreditCard size={24} />,
      color: 'rgba(16, 185, 129, 0.2)',
      iconColor: '#10b981',
      endpoint: '/api/admin/verify/stripe-comparison?timeRange=30d',
      action: 'Compare with Stripe'
    },
    {
      id: 'data-sources',
      title: 'Data Sources Map',
      description: 'View exactly where each metric comes from (Stripe API, PostgreSQL, calculations)',
      icon: <Database size={24} />,
      color: 'rgba(59, 130, 246, 0.2)',
      iconColor: '#3b82f6',
      endpoint: '/api/admin/verify/data-sources',
      action: 'Show Data Sources'
    },
    {
      id: 'test-calculations',
      title: 'Calculation Verification',
      description: 'Step-by-step breakdown of how revenue and other metrics are calculated',
      icon: <Calculator size={24} />,
      color: 'rgba(245, 158, 11, 0.2)',
      iconColor: '#f59e0b',
      endpoint: '/api/admin/verify/test-calculations?metric=revenue&timeRange=7d',
      action: 'Test Calculations'
    },
    {
      id: 'refresh-all',
      title: 'Force Data Refresh',
      description: 'Clear all caches and fetch fresh data, comparing before/after values',
      icon: <RefreshCw size={24} />,
      color: 'rgba(139, 92, 246, 0.2)',
      iconColor: '#8b5cf6',
      endpoint: '/api/admin/verify/refresh-all',
      action: 'Refresh All Data',
      method: 'POST'
    }
  ];

  const openStripeComparison = () => {
    window.open('https://dashboard.stripe.com/payments', '_blank');
  };

  return (
    <VerificationContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <PanelHeader>
        <PanelTitle>
          <Shield size={24} />
          Data Verification Center
        </PanelTitle>
        
        <ActionButton
          onClick={openStripeComparison}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <ExternalLink size={16} />
          Open Stripe Dashboard
        </ActionButton>
      </PanelHeader>

      <StatusIndicator status="info">
        <Eye size={16} />
        Use these tools to verify your admin dashboard shows accurate data from real sources
      </StatusIndicator>

      <VerificationGrid>
        {verificationTests.map((test) => (
          <VerificationCard
            key={test.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -4 }}
          >
            <CardIcon color={test.color} iconColor={test.iconColor}>
              {test.icon}
            </CardIcon>
            
            <CardTitle>{test.title}</CardTitle>
            <CardDescription>{test.description}</CardDescription>
            
            <ActionButton
              onClick={() => runVerification(
                test.id, 
                test.endpoint, 
                test.title
              )}
              disabled={loading === test.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading === test.id ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  {test.icon}
                  {test.action}
                </>
              )}
            </ActionButton>

            {results[test.id] && (
              <ResultsPanel>
                <StatusIndicator status={results[test.id].success ? 'success' : 'error'}>
                  {results[test.id].success ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                  {results[test.id].message}
                </StatusIndicator>

                {results[test.id].success && results[test.id].data && (
                  <CodeBlock>
                    {JSON.stringify(results[test.id].data, null, 2)}
                  </CodeBlock>
                )}

                {!results[test.id].success && results[test.id].error && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                    Error: {results[test.id].error}
                  </div>
                )}
              </ResultsPanel>
            )}
          </VerificationCard>
        ))}
      </VerificationGrid>

      <StatusIndicator status="info">
        <TrendingUp size={16} />
        <div>
          <strong>How to verify data accuracy:</strong>
          <br />
          1. Run "Stripe Data Comparison" and check that revenue matches your Stripe Dashboard
          <br />
          2. Use "Data Sources Map" to understand where each number comes from
          <br />
          3. Test specific calculations to verify the math is correct
          <br />
          4. If data seems stale, use "Force Data Refresh" to get the latest numbers
        </div>
      </StatusIndicator>
    </VerificationContainer>
  );
};

export default DataVerificationPanel;
