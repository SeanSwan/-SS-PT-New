/**
 * CATaxCalculatorWidget.tsx - California Tax Calculator
 * =====================================================
 * Revenue widget showing tax liability on package sales
 * Fetches real data from /api/financial/tax/calculator
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import {
  Calculator, DollarSign, Receipt, TrendingUp, RefreshCw,
  Package, AlertTriangle, Clock, ChevronDown, ChevronUp
} from 'lucide-react';

// ── Styled Components ──

const WidgetContainer = styled(motion.div)`
  background: linear-gradient(135deg, rgba(10, 10, 26, 0.95) 0%, rgba(30, 20, 60, 0.9) 100%);
  border-radius: 20px;
  padding: 2rem;
  border: 1px solid rgba(120, 81, 169, 0.3);
  backdrop-filter: blur(20px);
`;

const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const WidgetTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const RefreshButton = styled.button`
  background: rgba(120, 81, 169, 0.2);
  border: 1px solid rgba(120, 81, 169, 0.3);
  border-radius: 8px;
  color: white;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  min-height: 44px;

  &:hover {
    background: rgba(120, 81, 169, 0.3);
    border-color: rgba(120, 81, 169, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const KPICard = styled.div<{ $accent?: string }>`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${({ $accent }) => $accent || 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
`;

const KPIValue = styled.div<{ $color?: string }>`
  font-size: 1.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color || '#00ffff'};
  margin-bottom: 0.25rem;
`;

const KPILabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #00ffff;
  margin: 1.5rem 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PackageRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
  font-size: 0.875rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  &:last-child {
    border-bottom: none;
  }
`;

const PackageRowHeader = styled(PackageRow)`
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(120, 81, 169, 0.3);
`;

const PackageName = styled.span`
  color: white;
  font-weight: 500;
`;

const TaxAmount = styled.span`
  color: #ff6b6b;
  font-weight: 600;
`;

const TotalWithTax = styled.span`
  color: #10b981;
  font-weight: 600;
`;

const TableWrapper = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  padding: 0.5rem 0;
  min-height: 44px;

  &:hover {
    color: #00ffff;
  }
`;

const LastOrderCard = styled.div`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const LastOrderLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
`;

const LastOrderValue = styled.span`
  font-size: 1rem;
  color: white;
  font-weight: 600;
`;

const ErrorBanner = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  color: #ef4444;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

const LoadingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #00ffff;
  animation: pulse 1.5s infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
`;

// ── Types ──

interface PackageTax {
  id: number;
  name: string;
  packageType: string;
  sessions: number | null;
  price: number;
  taxAmount: number;
  totalWithTax: number;
}

interface TaxData {
  stateCode: string;
  taxRate: number;
  taxPercentage: string;
  packages: PackageTax[];
  revenue: {
    totalRevenue: number;
    totalTaxLiability: number;
    orderCount: number;
    lastOrder: {
      id: number;
      amount: number;
      taxOnOrder: number;
      date: string;
    } | null;
  };
}

// ── Component ──

const CATaxCalculatorWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPackageBreakdown, setShowPackageBreakdown] = useState(true);

  const fetchTaxData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authAxios.get('/api/financial/tax/calculator?state=CA');
      if (response.data.success) {
        setTaxData(response.data.data);
      } else {
        setError(response.data.message || 'Failed to load tax data');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to connect to tax calculator');
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchTaxData();
  }, [fetchTaxData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (loading && !taxData) {
    return (
      <WidgetContainer>
        <WidgetHeader>
          <WidgetTitle>
            <Calculator size={24} />
            California Tax Calculator
          </WidgetTitle>
        </WidgetHeader>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '2rem' }}>
          <LoadingDot style={{ animationDelay: '0s' }} />
          <LoadingDot style={{ animationDelay: '0.3s' }} />
          <LoadingDot style={{ animationDelay: '0.6s' }} />
        </div>
      </WidgetContainer>
    );
  }

  if (error) {
    return (
      <WidgetContainer>
        <WidgetHeader>
          <WidgetTitle>
            <Calculator size={24} />
            California Tax Calculator
          </WidgetTitle>
          <RefreshButton onClick={fetchTaxData}>
            <RefreshCw size={16} />
            Retry
          </RefreshButton>
        </WidgetHeader>
        <ErrorBanner>
          <AlertTriangle size={18} />
          {error}
        </ErrorBanner>
      </WidgetContainer>
    );
  }

  if (!taxData) return null;

  const { revenue, packages: pkgs } = taxData;

  return (
    <WidgetContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <WidgetHeader>
        <WidgetTitle>
          <Calculator size={24} />
          California Tax Calculator
        </WidgetTitle>
        <RefreshButton onClick={fetchTaxData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </RefreshButton>
      </WidgetHeader>

      {/* KPI Cards */}
      <KPIGrid>
        <KPICard $accent="rgba(0, 255, 255, 0.2)">
          <KPIValue $color="#00ffff">{taxData.taxPercentage}</KPIValue>
          <KPILabel>CA State Tax Rate</KPILabel>
        </KPICard>
        <KPICard $accent="rgba(16, 185, 129, 0.2)">
          <KPIValue $color="#10b981">{formatCurrency(revenue.totalRevenue)}</KPIValue>
          <KPILabel>Total Revenue</KPILabel>
        </KPICard>
        <KPICard $accent="rgba(255, 107, 107, 0.2)">
          <KPIValue $color="#ff6b6b">{formatCurrency(revenue.totalTaxLiability)}</KPIValue>
          <KPILabel>Tax Liability (Set Aside)</KPILabel>
        </KPICard>
        <KPICard $accent="rgba(120, 81, 169, 0.2)">
          <KPIValue $color="#9b6fcf">{revenue.orderCount}</KPIValue>
          <KPILabel>Completed Orders</KPILabel>
        </KPICard>
      </KPIGrid>

      {/* Last Order Info */}
      {revenue.lastOrder && (
        <LastOrderCard>
          <Clock size={18} style={{ color: '#00ffff', flexShrink: 0 }} />
          <div>
            <LastOrderLabel>Last Purchase</LastOrderLabel>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <LastOrderValue>{formatCurrency(revenue.lastOrder.amount)}</LastOrderValue>
              <span style={{ color: '#ff6b6b', fontWeight: 600 }}>
                Tax: {formatCurrency(revenue.lastOrder.taxOnOrder)}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>
                {new Date(revenue.lastOrder.date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </LastOrderCard>
      )}

      {/* Package Tax Breakdown */}
      <SectionTitle>
        <Receipt size={18} />
        Per-Package Tax Breakdown
        <ToggleButton onClick={() => setShowPackageBreakdown(!showPackageBreakdown)}>
          {showPackageBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </ToggleButton>
      </SectionTitle>

      {showPackageBreakdown && (
        <TableWrapper>
          <PackageRowHeader>
            <span>Package</span>
            <span>Price</span>
            <span>Tax ({taxData.taxPercentage})</span>
            <span>Total w/ Tax</span>
          </PackageRowHeader>
          {pkgs.map(pkg => (
            <PackageRow key={pkg.id}>
              <PackageName>
                {pkg.name}
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>
                  {pkg.sessions ? `${pkg.sessions} sessions` : pkg.packageType}
                </span>
              </PackageName>
              <span style={{ color: 'white' }}>{formatCurrency(pkg.price)}</span>
              <TaxAmount>{formatCurrency(pkg.taxAmount)}</TaxAmount>
              <TotalWithTax>{formatCurrency(pkg.totalWithTax)}</TotalWithTax>
            </PackageRow>
          ))}
        </TableWrapper>
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.75rem 1rem',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: 'rgba(255, 255, 255, 0.5)',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: '#f59e0b' }}>Disclaimer:</strong> This calculator uses the California
        state sales tax rate ({taxData.taxPercentage}). Local tax rates may vary. Personal training services
        classification may affect tax applicability. Consult a tax professional for official guidance.
      </div>
    </WidgetContainer>
  );
};

export default CATaxCalculatorWidget;
