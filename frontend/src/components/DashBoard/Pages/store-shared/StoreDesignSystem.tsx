/**
 * StoreDesignSystem.tsx - Gemini 3.1 Pro Authoritative Design Spec
 * ================================================================
 * Shared styled-components for the Store & Revenue workspace.
 * "Command Center" aesthetic: deep space glassmorphism, high-contrast
 * neon data visualization, frictionless micro-interactions.
 *
 * Design Authority: Gemini 3.1 Pro (Lead Design Authority)
 * Implementation: Claude (Lead Software Engineer)
 */

import styled, { keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';

// ── Animations ──────────────────────────────────────────

export const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ── Design Tokens ───────────────────────────────────────

export const STORE_TOKENS = {
  bg: {
    app: 'radial-gradient(circle at top right, #120d26 0%, #0a0a1a 100%)',
    glass: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
    glassHover: 'rgba(255,255,255,0.05)',
    dark: 'rgba(0,0,0,0.2)',
  },
  border: {
    subtle: 'rgba(255,255,255,0.08)',
    glass: 'rgba(255,255,255,0.08)',
    purple: 'rgba(120,81,169,0.3)',
    cyan: 'rgba(139, 92, 246,0.2)',
  },
  color: {
    cyan: '#8B5CF6',
    purple: '#7851A9',
    white: '#FFFFFF',
    muted: '#A0A0B0',
    completed: '#00FF88',
    pending: '#FFB800',
    inactive: '#FF3366',
    revenue: '#10b981',
    tax: '#ff6b6b',
  },
  radius: {
    card: '16px',
    button: '8px',
    badge: '20px',
    table: '12px',
  },
} as const;

// ── Layout Containers ───────────────────────────────────

export const GlassCard = styled(motion.div)`
  background: ${STORE_TOKENS.bg.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 24px;
  transition: all 300ms cubic-bezier(0.25, 0.8, 0.25, 1);
  animation: ${fadeIn} 0.5s ease-out forwards;

  &:hover {
    transform: translateY(-2px);
    border-color: ${STORE_TOKENS.border.purple};
    box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(120,81,169,0.1);
  }
`;

export const GlassCardStatic = styled.div`
  background: ${STORE_TOKENS.bg.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 24px;
`;

// ── KPI Grid ────────────────────────────────────────────

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

export const KPICard = styled.div<{ $accent?: string }>`
  background: ${STORE_TOKENS.bg.glass};
  border: 1px solid ${({ $accent }) => $accent || STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.card};
  padding: 1.25rem;
  text-align: center;
  transition: all 300ms ease;

  &:hover {
    border-color: ${({ $accent }) => $accent || STORE_TOKENS.border.purple};
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
  }
`;

export const KPIValue = styled.div<{ $color?: string }>`
  font-size: 36px;
  font-weight: 600;
  color: ${({ $color }) => $color || STORE_TOKENS.color.cyan};
  text-shadow: 0 0 20px ${({ $color }) => {
    const c = $color || STORE_TOKENS.color.cyan;
    return c + '4D'; // ~30% opacity
  }};
  margin-top: 8px;
  letter-spacing: -1px;
`;

export const KPILabel = styled.div`
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${STORE_TOKENS.color.muted};
  font-weight: 600;
`;

// ── Middle Row Layout (Tax Calculator) ──────────────────

export const DashboardMiddleRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-top: 24px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

// ── Data Tables ─────────────────────────────────────────

export const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: ${STORE_TOKENS.radius.table};
  border: 1px solid ${STORE_TOKENS.border.glass};
  background: ${STORE_TOKENS.bg.dark};
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
`;

export const Th = styled.th`
  padding: 16px 24px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${STORE_TOKENS.color.muted};
  border-bottom: 1px solid ${STORE_TOKENS.border.glass};
  background: rgba(255,255,255,0.02);
`;

export const Td = styled.td`
  padding: 16px 24px;
  font-size: 14px;
  color: ${STORE_TOKENS.color.white};
  border-bottom: 1px solid rgba(255,255,255,0.04);
  min-height: 44px;

  @media (max-width: 768px) {
    display: block;
    padding: 8px 16px;
    border: none;

    &::before {
      content: attr(data-label);
      display: block;
      font-size: 11px;
      color: ${STORE_TOKENS.color.muted};
      text-transform: uppercase;
      margin-bottom: 4px;
    }
  }
`;

export const Tr = styled.tr`
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255,255,255,0.03);
  }

  @media (max-width: 768px) {
    display: block;
    border-bottom: 1px solid ${STORE_TOKENS.border.glass};
    padding: 16px 0;
  }
`;

// ── Status Badges ───────────────────────────────────────

export const StatusBadge = styled.span<{ $status: 'completed' | 'pending' | 'inactive' | 'active' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: ${STORE_TOKENS.radius.badge};
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  ${({ $status }) => {
    switch ($status) {
      case 'completed':
      case 'active':
        return css`
          background: rgba(0,255,136,0.1);
          color: #00FF88;
          border: 1px solid rgba(0,255,136,0.2);
        `;
      case 'pending':
        return css`
          background: rgba(255,184,0,0.1);
          color: #FFB800;
          border: 1px solid rgba(255,184,0,0.2);
        `;
      case 'inactive':
        return css`
          background: rgba(255,51,102,0.1);
          color: #FF3366;
          border: 1px solid rgba(255,51,102,0.2);
        `;
    }
  }}
`;

// ── Revenue Summary Bar ─────────────────────────────────

export const RevenueSummaryBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(90deg, rgba(120,81,169,0.1) 0%, rgba(139, 92, 246,0.1) 100%);
  border-radius: ${STORE_TOKENS.radius.table};
  border: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 24px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

export const RevenueStat = styled.div`
  text-align: center;
  flex: 1;
`;

export const RevenueStatValue = styled.div<{ $color?: string }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${({ $color }) => $color || STORE_TOKENS.color.cyan};
`;

export const RevenueStatLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  margin-top: 0.25rem;
  letter-spacing: 0.5px;
`;

// ── SwanToggle (Custom Toggle Switch) ───────────────────

export const SwanToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
`;

export const SwanToggleTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  background: ${({ $checked }) => $checked ? 'rgba(139, 92, 246,0.2)' : 'rgba(255,255,255,0.1)'};
  border: 1px solid ${({ $checked }) => $checked ? '#8B5CF6' : 'rgba(255,255,255,0.2)'};
  border-radius: 24px;
  transition: all 0.3s ease;
  flex-shrink: 0;

  &::before {
    content: '';
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    left: 2px;
    bottom: 2px;
    background: ${({ $checked }) => $checked ? '#8B5CF6' : '#A0A0B0'};
    box-shadow: ${({ $checked }) => $checked ? '0 0 10px #8B5CF6' : 'none'};
    transform: translateX(${({ $checked }) => $checked ? '20px' : '0'});
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  &:focus-within {
    outline: 2px solid #8B5CF6;
    outline-offset: 2px;
  }
`;

export const SwanToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
`;

// ── Section Titles ──────────────────────────────────────

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 1rem;
`;

export const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  letter-spacing: -1px;
`;

export const SubSectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${STORE_TOKENS.color.cyan};
  margin: 1.5rem 0 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

// ── Action Buttons ──────────────────────────────────────

export const StoreButton = styled.button<{ $variant?: 'primary' | 'danger' | 'ghost' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: ${STORE_TOKENS.radius.button};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  ${({ $variant }) => {
    switch ($variant) {
      case 'danger':
        return css`
          background: rgba(255,51,102,0.1);
          border: 1px solid rgba(255,51,102,0.3);
          color: #FF3366;
          &:hover { background: rgba(255,51,102,0.2); border-color: rgba(255,51,102,0.5); }
        `;
      case 'ghost':
        return css`
          background: transparent;
          border: 1px solid transparent;
          color: ${STORE_TOKENS.color.muted};
          &:hover { color: #FFFFFF; background: rgba(255,255,255,0.05); }
        `;
      default:
        return css`
          background: linear-gradient(135deg, rgba(120,81,169,0.2), rgba(139, 92, 246,0.1));
          border: 1px solid rgba(120,81,169,0.3);
          color: white;
          &:hover {
            background: linear-gradient(135deg, rgba(120,81,169,0.3), rgba(139, 92, 246,0.2));
            border-color: rgba(120,81,169,0.5);
            transform: translateY(-1px);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  &:focus-visible {
    outline: 2px solid ${STORE_TOKENS.color.cyan};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

// ── Package Grid ────────────────────────────────────────

export const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

// ── Search Bar ──────────────────────────────────────────

export const SearchBar = styled.div`
  position: relative;
  flex: 1;
  min-width: 240px;

  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${STORE_TOKENS.color.muted};
    pointer-events: none;
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  background: rgba(255,255,255,0.03);
  border: 1px solid ${STORE_TOKENS.border.glass};
  border-radius: ${STORE_TOKENS.radius.button};
  color: white;
  font-size: 0.875rem;
  min-height: 44px;
  transition: border-color 0.2s;

  &::placeholder { color: rgba(255,255,255,0.4); }
  &:focus {
    outline: none;
    border-color: ${STORE_TOKENS.color.cyan};
    box-shadow: 0 0 0 3px rgba(139, 92, 246,0.1);
  }
`;

// ── View Mode Tabs ──────────────────────────────────────

export const ViewModeTabs = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-radius: ${STORE_TOKENS.radius.button};
  overflow: hidden;
  border: 1px solid ${STORE_TOKENS.border.glass};
`;

export const ViewModeTab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 0.75rem 1rem;
  min-height: 44px;
  border: none;
  background: ${({ $active }) => $active
    ? 'linear-gradient(135deg, rgba(120,81,169,0.3), rgba(139, 92, 246,0.15))'
    : 'rgba(255,255,255,0.02)'};
  color: ${({ $active }) => $active ? '#00ffff' : 'rgba(255,255,255,0.5)'};
  font-weight: ${({ $active }) => $active ? 600 : 400};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:not(:last-child) {
    border-right: 1px solid ${STORE_TOKENS.border.glass};
  }

  &:hover {
    background: rgba(120,81,169,0.15);
    color: white;
  }

  ${({ $active }) => $active && css`
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 2px;
      background: ${STORE_TOKENS.color.cyan};
      box-shadow: 0 -2px 10px rgba(139, 92, 246,0.5);
    }
  `}
`;

// ── Filter Pill ─────────────────────────────────────────

export const FilterPill = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: 44px;
  border: 1px solid ${({ $active }) => $active ? STORE_TOKENS.color.cyan : STORE_TOKENS.border.glass};
  background: ${({ $active }) => $active ? 'rgba(139, 92, 246,0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? STORE_TOKENS.color.cyan : STORE_TOKENS.color.muted};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${STORE_TOKENS.color.cyan};
    color: white;
  }
`;

// ── Shimmer Loader ──────────────────────────────────────

export const ShimmerBlock = styled.div<{ $width?: string; $height?: string }>`
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '20px'};
  border-radius: 8px;
  background: linear-gradient(
    -45deg,
    rgba(255,255,255,0.02) 40%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.02) 60%
  );
  background-size: 400% 100%;
  animation: ${shimmer} 2s infinite;
`;

// ── Error Banner ────────────────────────────────────────

export const ErrorBanner = styled.div`
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: ${STORE_TOKENS.radius.button};
  padding: 1rem;
  color: #ef4444;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

// ── Disclaimer ──────────────────────────────────────────

export const DisclaimerBox = styled.div`
  margin-top: 1.5rem;
  padding: 0.75rem 1rem;
  background: rgba(245,158,11,0.08);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: ${STORE_TOKENS.radius.button};
  font-size: 0.75rem;
  color: rgba(255,255,255,0.5);
  line-height: 1.5;

  strong {
    color: #f59e0b;
  }
`;

// ── Utility ─────────────────────────────────────────────

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const formatCurrencyCompact = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
