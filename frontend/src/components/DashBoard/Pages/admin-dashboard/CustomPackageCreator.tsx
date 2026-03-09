/**
 * CustomPackageCreator.tsx — "SwanStudios Special" VIP Package Builder
 *
 * Designed by Gemini 3.1 Pro (Lead Design Authority)
 * Implemented by Claude (Lead Software Engineer)
 *
 * Split-screen layout on desktop:
 * - Left: Input controls (client selector, package tier, bonus slider, price)
 * - Right: Real-time VIP card preview with slot-machine number animation
 *
 * Pricing guardrails:
 * - $175/session recommended minimum
 * - $120/hr warning threshold (gold border + approval checkbox)
 * - $100/hr absolute floor (blocked)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../../../hooks/useAuth';
import {
  Package, DollarSign, Users, AlertTriangle, CheckCircle,
  Sparkles, Shield, ChevronDown, Gift, Zap, Crown, Lock
} from 'lucide-react';

// ═══════════════════════════════════════
// DESIGN TOKENS (Gemini 3.1 Pro Spec)
// ═══════════════════════════════════════

const tokens = {
  galaxyCore: '#0a0a1a',
  galaxySurface: '#14142b',
  swanCyan: '#8B5CF6',
  cosmicPurple: '#7851A9',
  nebulaPink: '#FF2A85',
  warningGold: '#FFD700',
  successGreen: '#00ff80',
  glassBg: 'rgba(20, 20, 43, 0.6)',
  glassBorder: '1px solid rgba(139, 92, 246, 0.15)',
  glassShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
};

const RECOMMENDED_MIN = 175;
const WARNING_THRESHOLD = 120;
const ABSOLUTE_MIN = 100;

const BASE_PACKAGES: Record<string, { sessions: number; label: string; duration: string }> = {
  '10-pack': { sessions: 10, label: '10-Pack', duration: '60 min' },
  '24-pack': { sessions: 24, label: '24-Pack', duration: '60 min' },
  '3-month': { sessions: 52, label: '3 Month', duration: '60 min' },
  '6-month': { sessions: 108, label: '6 Month', duration: '60 min' },
  '12-month': { sessions: 208, label: '12 Month', duration: '60 min' },
  'express': { sessions: 10, label: 'Express', duration: '30 min' },
};

// ═══════════════════════════════════════
// STYLED COMPONENTS
// ═══════════════════════════════════════

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  padding: 1.5rem;

  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
  }
`;

const GlassPanel = styled(motion.div)`
  background: ${tokens.glassBg};
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: ${tokens.glassBorder};
  border-radius: 16px;
  box-shadow: ${tokens.glassShadow};
  color: #ffffff;
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: #fff;
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  min-height: 44px;
  cursor: pointer;
  appearance: none;

  &:focus {
    outline: none;
    border-color: ${tokens.swanCyan};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  option {
    background: ${tokens.galaxySurface};
    color: #fff;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: ${tokens.swanCyan};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const SliderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SliderInput = styled.input`
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(90deg, ${tokens.swanCyan}, ${tokens.cosmicPurple});
  outline: none;
  min-height: 44px;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(139, 92, 246, 0.4);
  }
`;

const SliderValue = styled.span`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${tokens.swanCyan};
  min-width: 40px;
  text-align: center;
`;

// VIP Card Preview (Gemini Spec: holographic/iridescent dark-purple gradient)
const VIPCard = styled(motion.div)<{ $warning: boolean; $danger: boolean }>`
  background: linear-gradient(135deg, #14142b 0%, #0a0a1a 100%);
  border: 1px solid ${({ $warning, $danger }) =>
    $danger ? `${tokens.nebulaPink}` :
    $warning ? `${tokens.warningGold}80` :
    `rgba(120, 81, 169, 0.5)`};
  border-radius: 20px;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: ${({ $warning, $danger }) =>
    $danger ? `0 0 20px rgba(255, 42, 133, 0.3)` :
    $warning ? `0 0 20px rgba(255, 215, 0, 0.2)` :
    `0 0 20px rgba(120, 81, 169, 0.2)`};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      transparent 0%,
      rgba(120, 81, 169, 0.05) 30%,
      rgba(139, 92, 246, 0.03) 60%,
      transparent 100%
    );
    background-size: 200% 200%;
    animation: ${shimmer} 6s linear infinite;
  }
`;

const VIPBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 1rem;
  background: linear-gradient(135deg, ${tokens.cosmicPurple}40, ${tokens.swanCyan}20);
  border: 1px solid ${tokens.cosmicPurple}60;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: ${tokens.swanCyan};
  margin-bottom: 1.5rem;
`;

const VIPTitle = styled.h3`
  font-size: 1.75rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #fff, ${tokens.swanCyan});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const PriceDisplay = styled.div`
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
  margin: 1.5rem 0;

  span {
    font-size: 1rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const EffectiveRate = styled.div<{ $warning: boolean; $danger: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  background: ${({ $danger, $warning }) =>
    $danger ? 'rgba(255, 42, 133, 0.15)' :
    $warning ? 'rgba(255, 215, 0, 0.1)' :
    'rgba(0, 255, 128, 0.1)'};
  color: ${({ $danger, $warning }) =>
    $danger ? tokens.nebulaPink :
    $warning ? tokens.warningGold :
    tokens.successGreen};
  margin-bottom: 1rem;
`;

const SessionBreakdown = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
`;

const BreakdownItem = styled.div`
  text-align: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: ${tokens.swanCyan};
  }
  .label {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const WarningBox = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.25);
  border-radius: 12px;
  margin-bottom: 1.5rem;
  color: ${tokens.warningGold};
  font-size: 0.9rem;
`;

const ApprovalCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  cursor: pointer;
  min-height: 44px;
  margin-bottom: 1.5rem;
  color: ${tokens.warningGold};
  font-weight: 600;
  font-size: 0.9rem;

  input {
    width: 20px;
    height: 20px;
    accent-color: ${tokens.warningGold};
  }
`;

const CreateButton = styled(motion.button)<{ $disabled: boolean }>`
  width: 100%;
  padding: 1rem 2rem;
  min-height: 52px;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: ${({ $disabled }) => $disabled ? 'not-allowed' : 'pointer'};
  background: ${({ $disabled }) => $disabled
    ? 'rgba(255, 255, 255, 0.1)'
    : `linear-gradient(135deg, ${tokens.cosmicPurple}, ${tokens.swanCyan})`};
  color: ${({ $disabled }) => $disabled ? 'rgba(255, 255, 255, 0.3)' : '#fff'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ClientSearchInput = styled(Input)`
  margin-bottom: 0.5rem;
`;

const ClientDropdown = styled.div`
  max-height: 200px;
  overflow-y: auto;
  background: ${tokens.galaxySurface};
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
`;

const ClientOption = styled.div`
  padding: 0.75rem 1rem;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:hover {
    background: rgba(139, 92, 246, 0.08);
  }

  .name { font-weight: 600; }
  .email { font-size: 0.8rem; color: rgba(255, 255, 255, 0.5); }
`;

const RoleBadge = styled.span<{ $role: string }>`
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid;
  backdrop-filter: blur(4px);
  ${({ $role }) => {
    switch ($role) {
      case 'admin': return `color: ${tokens.nebulaPink}; border-color: ${tokens.nebulaPink}40; background: ${tokens.nebulaPink}15;`;
      case 'trainer': return `color: ${tokens.cosmicPurple}; border-color: ${tokens.cosmicPurple}40; background: ${tokens.cosmicPurple}15;`;
      case 'client': return `color: ${tokens.swanCyan}; border-color: ${tokens.swanCyan}40; background: ${tokens.swanCyan}15;`;
      default: return `color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05);`;
    }
  }}
`;

const SuccessMessage = styled(motion.div)`
  text-align: center;
  padding: 2rem;

  .icon { color: ${tokens.successGreen}; margin-bottom: 1rem; }
  h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: rgba(255, 255, 255, 0.6); }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.875rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  min-height: 80px;
  resize: vertical;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${tokens.swanCyan};
  }
`;

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════

const CustomPackageCreator: React.FC = () => {
  const { authAxios } = useAuth();

  // Client selection
  const [clients, setClients] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Package config
  const [baseType, setBaseType] = useState('10-pack');
  const [pricePerSession, setPricePerSession] = useState(175);
  const [bonusSessions, setBonusSessions] = useState(0);
  const [adminNote, setAdminNote] = useState('');
  const [approved, setApproved] = useState(false);

  // UI state
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Load clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const resp = await authAxios.get('/api/auth/users?role=client&limit=100');
        const data = resp.data;
        setClients(Array.isArray(data) ? data : data?.users || []);
      } catch (err) {
        console.error('Failed to load clients:', err);
      }
    };
    fetchClients();
  }, [authAxios]);

  // Pricing calculations
  const pricing = useMemo(() => {
    const base = BASE_PACKAGES[baseType];
    if (!base) return null;

    const paidSessions = base.sessions;
    const totalSessions = paidSessions + bonusSessions;
    const totalPrice = paidSessions * pricePerSession;
    const effectiveRate = totalSessions > 0 ? totalPrice / totalSessions : 0;
    const belowWarning = effectiveRate < WARNING_THRESHOLD;
    const belowAbsolute = effectiveRate < ABSOLUTE_MIN;
    const savingsPerSession = RECOMMENDED_MIN - effectiveRate;

    return {
      paidSessions,
      totalSessions,
      totalPrice,
      effectiveRate: Math.round(effectiveRate * 100) / 100,
      belowWarning,
      belowAbsolute,
      savingsPerSession: Math.round(savingsPerSession * 100) / 100,
      duration: base.duration,
    };
  }, [baseType, pricePerSession, bonusSessions]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 20);
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [clients, clientSearch]);

  // Max bonus sessions based on package
  const maxBonus = useMemo(() => {
    if (!pricing) return 0;
    // Calculate max bonus where effective rate stays >= $100
    const paidTotal = pricing.paidSessions * pricePerSession;
    if (paidTotal <= 0) return 0;
    return Math.max(0, Math.floor(paidTotal / ABSOLUTE_MIN) - pricing.paidSessions);
  }, [pricing, pricePerSession]);

  // Can create?
  const canCreate = selectedClient && pricing && !pricing.belowAbsolute &&
    (!pricing.belowWarning || approved) && !creating;

  const handleCreate = async () => {
    if (!canCreate || !selectedClient || !pricing) return;

    setCreating(true);
    try {
      await authAxios.post('/api/custom-packages', {
        clientId: selectedClient.id,
        basePackageType: baseType,
        bonusSessions,
        pricePerSession,
        adminNote: adminNote || undefined,
        belowThresholdApproved: approved,
      });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create package';
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  if (success) {
    return (
      <Container>
        <GlassPanel
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ gridColumn: '1 / -1' }}
        >
          <SuccessMessage
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="icon"><CheckCircle size={56} /></div>
            <h3>SwanStudios Special Created!</h3>
            <p>
              Custom package for {selectedClient?.firstName} {selectedClient?.lastName} is now
              visible in their store page.
            </p>
            <CreateButton
              $disabled={false}
              onClick={() => {
                setSuccess(false);
                setSelectedClient(null);
                setBonusSessions(0);
                setAdminNote('');
                setApproved(false);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: '2rem', maxWidth: '300px', margin: '2rem auto 0' }}
            >
              <Sparkles size={20} /> Create Another
            </CreateButton>
          </SuccessMessage>
        </GlassPanel>
      </Container>
    );
  }

  return (
    <Container>
      {/* LEFT: Input Controls */}
      <GlassPanel
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <SectionTitle>
          <Crown size={24} color={tokens.cosmicPurple} />
          SwanStudios Special Creator
        </SectionTitle>

        {/* Client Selector */}
        <FormGroup>
          <Label>Select Client</Label>
          <ClientSearchInput
            type="text"
            placeholder="Search clients by name or email..."
            value={selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : clientSearch}
            onChange={(e) => {
              setClientSearch(e.target.value);
              setSelectedClient(null);
              setShowClientDropdown(true);
            }}
            onFocus={() => setShowClientDropdown(true)}
          />
          <AnimatePresence>
            {showClientDropdown && !selectedClient && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                <ClientDropdown>
                  {filteredClients.map(c => (
                    <ClientOption
                      key={c.id}
                      onClick={() => {
                        setSelectedClient(c);
                        setShowClientDropdown(false);
                        setClientSearch('');
                      }}
                    >
                      <div>
                        <div className="name">{c.firstName} {c.lastName}</div>
                        <div className="email">{c.email}</div>
                      </div>
                      <RoleBadge $role={c.role || 'client'}>{c.role || 'client'}</RoleBadge>
                    </ClientOption>
                  ))}
                  {filteredClients.length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                      No clients found
                    </div>
                  )}
                </ClientDropdown>
              </motion.div>
            )}
          </AnimatePresence>
        </FormGroup>

        {/* Package Tier */}
        <FormGroup>
          <Label>Base Package Tier</Label>
          <Select value={baseType} onChange={(e) => { setBaseType(e.target.value); setBonusSessions(0); }}>
            {Object.entries(BASE_PACKAGES).map(([key, pkg]) => (
              <option key={key} value={key}>{pkg.label} — {pkg.sessions} sessions ({pkg.duration})</option>
            ))}
          </Select>
        </FormGroup>

        {/* Price Per Session */}
        <FormGroup>
          <Label>Price Per Session ($)</Label>
          <Input
            type="number"
            min={100}
            max={300}
            step={5}
            value={pricePerSession}
            onChange={(e) => setPricePerSession(Math.max(100, Number(e.target.value)))}
          />
        </FormGroup>

        {/* Bonus Sessions Slider */}
        <FormGroup>
          <Label>Bonus Free Sessions</Label>
          <SliderContainer>
            <Gift size={20} color={tokens.swanCyan} />
            <SliderInput
              type="range"
              min={0}
              max={Math.min(maxBonus, 50)}
              value={bonusSessions}
              onChange={(e) => setBonusSessions(Number(e.target.value))}
            />
            <SliderValue>{bonusSessions}</SliderValue>
          </SliderContainer>
        </FormGroup>

        {/* Warning if below threshold */}
        <AnimatePresence>
          {pricing?.belowWarning && !pricing.belowAbsolute && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <WarningBox>
                <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>Below recommended rate!</strong><br />
                  Effective rate ${pricing.effectiveRate}/hr is below the ${WARNING_THRESHOLD}/hr threshold.
                  You&apos;re giving ${pricing.savingsPerSession.toFixed(0)} discount per session.
                </div>
              </WarningBox>
              <ApprovalCheckbox>
                <input
                  type="checkbox"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                />
                I authorize this rate override
              </ApprovalCheckbox>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin Note */}
        <FormGroup>
          <Label>Admin Note (optional)</Label>
          <TextArea
            placeholder="Deal context, negotiation notes..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
        </FormGroup>

        {/* Create Button */}
        <CreateButton
          $disabled={!canCreate}
          onClick={handleCreate}
          whileHover={canCreate ? { scale: 1.02 } : {}}
          whileTap={canCreate ? { scale: 0.98 } : {}}
        >
          {creating ? (
            <><Zap size={20} /> Creating...</>
          ) : pricing?.belowAbsolute ? (
            <><Lock size={20} /> Rate Too Low</>
          ) : (
            <><Sparkles size={20} /> Create SwanStudios Special</>
          )}
        </CreateButton>
      </GlassPanel>

      {/* RIGHT: VIP Card Preview */}
      <div style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}>
        <GlassPanel
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SectionTitle>
            <Package size={24} color={tokens.swanCyan} />
            Client Preview
          </SectionTitle>

          <VIPCard
            $warning={!!pricing?.belowWarning}
            $danger={!!pricing?.belowAbsolute}
            layout
          >
            <VIPBadge>
              <Crown size={14} />
              Exclusive Offer
            </VIPBadge>

            <VIPTitle>SwanStudios Special</VIPTitle>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              {BASE_PACKAGES[baseType]?.label} • {BASE_PACKAGES[baseType]?.duration} sessions
              {bonusSessions > 0 && ` + ${bonusSessions} bonus`}
            </p>

            <PriceDisplay>
              ${pricing?.totalPrice.toLocaleString() || '0'}
              <span> total</span>
            </PriceDisplay>

            <SessionBreakdown>
              <BreakdownItem>
                <div className="value">{pricing?.paidSessions || 0}</div>
                <div className="label">Paid Sessions</div>
              </BreakdownItem>
              <BreakdownItem>
                <div className="value" style={{ color: bonusSessions > 0 ? tokens.successGreen : tokens.swanCyan }}>
                  {bonusSessions}
                </div>
                <div className="label">Bonus Free</div>
              </BreakdownItem>
              <BreakdownItem>
                <div className="value">{pricing?.totalSessions || 0}</div>
                <div className="label">Total Sessions</div>
              </BreakdownItem>
              <BreakdownItem>
                <div className="value">${pricePerSession}</div>
                <div className="label">Per Session</div>
              </BreakdownItem>
            </SessionBreakdown>

            <EffectiveRate
              $warning={!!pricing?.belowWarning}
              $danger={!!pricing?.belowAbsolute}
            >
              <DollarSign size={18} />
              Effective Rate: ${pricing?.effectiveRate || 0}/session
              {pricing?.belowAbsolute && ' — BELOW MINIMUM'}
              {pricing?.belowWarning && !pricing.belowAbsolute && ' — Below Recommended'}
            </EffectiveRate>

            {selectedClient ? (
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                For: {selectedClient.firstName} {selectedClient.lastName}
              </div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                Select a client to personalize
              </div>
            )}
          </VIPCard>
        </GlassPanel>
      </div>
    </Container>
  );
};

export default CustomPackageCreator;
