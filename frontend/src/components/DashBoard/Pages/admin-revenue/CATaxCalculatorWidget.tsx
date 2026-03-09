/**
 * CATaxCalculatorWidget.tsx - California Tax Calculator (Gemini 3.1 Pro Design)
 * ==============================================================================
 * Revenue widget showing tax liability on package sales.
 * Layout: KPI row (4-col) -> Middle row (Calculator 2/3 + Last Order 1/3) -> Disclaimer
 * Fetches real data from /api/financial/tax/calculator
 *
 * Design Authority: Gemini 3.1 Pro
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';
import {
  Calculator, Receipt, RefreshCw,
  AlertTriangle, Clock, ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';

import {
  GlassCardStatic,
  KPIGrid,
  KPICard,
  KPIValue,
  KPILabel,
  DashboardMiddleRow,
  TableContainer,
  DataTable,
  Th,
  Td,
  Tr,
  SectionHeader,
  SectionTitle,
  SubSectionTitle,
  StoreButton,
  ErrorBanner,
  DisclaimerBox,
  ShimmerBlock,
  formatCurrency,
  STORE_TOKENS,
} from '../store-shared/StoreDesignSystem';

// ── Page-specific styled components ─────────────────────

const CalculatorWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const MiddleCardContent = styled(GlassCardStatic)`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const LastOrderDetail = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  &:last-child { border-bottom: none; }
`;

const LastOrderLabel = styled.span`
  font-size: 0.75rem;
  color: ${STORE_TOKENS.color.muted};
  text-transform: uppercase;
  min-width: 80px;
`;

const LastOrderValue = styled.span`
  font-size: 1rem;
  color: white;
  font-weight: 600;
`;

const TaxAmount = styled.span`
  color: ${STORE_TOKENS.color.tax};
  font-weight: 600;
`;

const TotalWithTax = styled.span`
  color: ${STORE_TOKENS.color.completed};
  font-weight: 600;
`;

const PackageType = styled.span`
  color: ${STORE_TOKENS.color.muted};
  font-size: 0.75rem;
  margin-left: 0.5rem;
`;

const ToggleRow = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: ${STORE_TOKENS.color.muted};
  font-size: 0.875rem;
  min-height: 44px;
  padding: 0;
  background: none;
  border: none;

  &:hover { color: ${STORE_TOKENS.color.cyan}; }
`;

const LoadingGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 2rem 0;
`;

// ── Types ───────────────────────────────────────────────

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

// ── Component ───────────────────────────────────────────

const CATaxCalculatorWidget: React.FC = () => {
  const { authAxios } = useAuth();
  const [taxData, setTaxData] = useState<TaxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(true);

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

  useEffect(() => { fetchTaxData(); }, [fetchTaxData]);

  // ── Loading State (Deep Space Shimmer) ──
  if (loading && !taxData) {
    return (
      <CalculatorWrapper>
        <SectionHeader>
          <SectionTitle><Calculator size={24} /> California Tax Calculator</SectionTitle>
        </SectionHeader>
        <LoadingGrid>
          <KPIGrid>
            {[1,2,3,4].map(i => (
              <KPICard key={i}><ShimmerBlock $height="60px" /></KPICard>
            ))}
          </KPIGrid>
          <ShimmerBlock $height="200px" />
        </LoadingGrid>
      </CalculatorWrapper>
    );
  }

  // ── Error State ──
  if (error) {
    return (
      <CalculatorWrapper>
        <SectionHeader>
          <SectionTitle><Calculator size={24} /> California Tax Calculator</SectionTitle>
          <StoreButton onClick={fetchTaxData}><RefreshCw size={16} /> Retry</StoreButton>
        </SectionHeader>
        <ErrorBanner><AlertTriangle size={18} /> {error}</ErrorBanner>
      </CalculatorWrapper>
    );
  }

  if (!taxData) return null;

  const { revenue, packages: pkgs } = taxData;

  return (
    <CalculatorWrapper>
      {/* Header */}
      <SectionHeader>
        <SectionTitle><Calculator size={24} /> California Tax Calculator</SectionTitle>
        <StoreButton onClick={fetchTaxData} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </StoreButton>
      </SectionHeader>

      {/* KPI Row (4 columns) */}
      <KPIGrid>
        <KPICard $accent="rgba(139, 92, 246,0.15)">
          <KPILabel>CA State Tax Rate</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.cyan}>{taxData.taxPercentage}</KPIValue>
        </KPICard>
        <KPICard $accent="rgba(0,255,136,0.15)">
          <KPILabel>Total Revenue</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.revenue}>{formatCurrency(revenue.totalRevenue)}</KPIValue>
        </KPICard>
        <KPICard $accent="rgba(255,107,107,0.15)">
          <KPILabel>Tax Liability (Set Aside)</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.tax}>{formatCurrency(revenue.totalTaxLiability)}</KPIValue>
        </KPICard>
        <KPICard $accent="rgba(139,92,246,0.15)">
          <KPILabel>Completed Orders</KPILabel>
          <KPIValue $color={STORE_TOKENS.color.purple}>{revenue.orderCount}</KPIValue>
        </KPICard>
      </KPIGrid>

      {/* Middle Row: Tax Breakdown (2/3) + Last Order (1/3) */}
      <DashboardMiddleRow>
        <MiddleCardContent>
          <ToggleRow onClick={() => setShowBreakdown(!showBreakdown)}>
            <Receipt size={18} />
            <span style={{ fontWeight: 600, color: STORE_TOKENS.color.cyan }}>
              Per-Package Tax Breakdown
            </span>
            {showBreakdown ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </ToggleRow>

          {showBreakdown && (
            <TableContainer style={{ marginTop: '1rem', border: 'none' }}>
              <DataTable>
                <thead>
                  <tr>
                    <Th>Package</Th>
                    <Th>Price</Th>
                    <Th>Tax ({taxData.taxPercentage})</Th>
                    <Th>Total w/ Tax</Th>
                  </tr>
                </thead>
                <tbody>
                  {pkgs.map(pkg => (
                    <Tr key={pkg.id}>
                      <Td data-label="Package">
                        {pkg.name}
                        <PackageType>
                          {pkg.sessions ? `${pkg.sessions} sessions` : pkg.packageType}
                        </PackageType>
                      </Td>
                      <Td data-label="Price">{formatCurrency(pkg.price)}</Td>
                      <Td data-label="Tax"><TaxAmount>{formatCurrency(pkg.taxAmount)}</TaxAmount></Td>
                      <Td data-label="Total"><TotalWithTax>{formatCurrency(pkg.totalWithTax)}</TotalWithTax></Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </TableContainer>
          )}
        </MiddleCardContent>

        {/* Last Order Card (1/3) */}
        <MiddleCardContent>
          <SubSectionTitle>
            <Clock size={18} /> Latest Purchase
          </SubSectionTitle>
          {revenue.lastOrder ? (
            <div>
              <LastOrderDetail>
                <LastOrderLabel>Amount</LastOrderLabel>
                <LastOrderValue>{formatCurrency(revenue.lastOrder.amount)}</LastOrderValue>
              </LastOrderDetail>
              <LastOrderDetail>
                <LastOrderLabel>Tax</LastOrderLabel>
                <LastOrderValue style={{ color: STORE_TOKENS.color.tax }}>
                  {formatCurrency(revenue.lastOrder.taxOnOrder)}
                </LastOrderValue>
              </LastOrderDetail>
              <LastOrderDetail>
                <LastOrderLabel>Date</LastOrderLabel>
                <LastOrderValue style={{ fontSize: '0.875rem', fontWeight: 400 }}>
                  {new Date(revenue.lastOrder.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </LastOrderValue>
              </LastOrderDetail>
              <LastOrderDetail>
                <LastOrderLabel>Net</LastOrderLabel>
                <LastOrderValue style={{ color: STORE_TOKENS.color.completed }}>
                  {formatCurrency(revenue.lastOrder.amount - revenue.lastOrder.taxOnOrder)}
                </LastOrderValue>
              </LastOrderDetail>
            </div>
          ) : (
            <div style={{ color: STORE_TOKENS.color.muted, padding: '2rem 0', textAlign: 'center' }}>
              <TrendingUp size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div>No orders yet</div>
            </div>
          )}
        </MiddleCardContent>
      </DashboardMiddleRow>

      {/* Disclaimer */}
      <DisclaimerBox>
        <strong>Disclaimer:</strong> This calculator uses the California
        state sales tax rate ({taxData.taxPercentage}). Local tax rates may vary. Personal training services
        classification may affect tax applicability. Consult a tax professional for official guidance.
      </DisclaimerBox>
    </CalculatorWrapper>
  );
};

export default CATaxCalculatorWidget;
