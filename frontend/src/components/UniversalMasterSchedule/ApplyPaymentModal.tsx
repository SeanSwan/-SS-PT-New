/**
 * Apply Payment Modal
 * ===================
 * Admin modal for applying session credits to clients.
 * Supports two modes:
 *   1. Manual credit entry (legacy)
 *   2. Package-based payment with Order/Transaction audit trail (Phase 2)
 *
 * When preselectedClientId is provided (from SessionDetailModal),
 * auto-selects that client and fetches their last purchased package.
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  SmallText,
  BodyText,
  Caption,
  FlexBox,
  Spinner
} from './ui';
import GlowButton from '../ui/buttons/GlowButton';
import DuplicatePaymentWarning from './DuplicatePaymentWarning';
import { usePaymentIdempotency, generateUUID } from '../../hooks/usePaymentIdempotency';
import { AlertTriangle, CreditCard, User, Calendar, Package, DollarSign } from 'lucide-react';

interface ClientNeedingPayment {
  id: number;
  name: string;
  email: string;
  phone?: string;
  availableSessions: number;
  upcomingSessions: number;
  nextSession?: string;
}

interface StorefrontPackage {
  id: number;
  name: string;
  sessions: number;
  totalSessions?: number;
  price: string | number;
  totalCost: string | number;
  pricePerSession: string | number;
  packageType: string;
}

interface LastPackageInfo {
  packageId: number;
  packageName: string;
  sessions: number;
  price: number;
  pricePerSession: number;
  packageType: string;
  orderId: number;
}

type PaymentMethod = 'stripe' | 'cash' | 'venmo' | 'zelle' | 'check';
type ModalMode = 'manual' | 'package';

interface ApplyPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onApplied?: () => void;
  preselectedClientId?: number;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'stripe', label: 'Card on File' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
];

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

const PAYMENT_METHOD_CONFIG: Record<string, {
  placeholder: string;
  label: string;
  validation?: RegExp;
  validationMsg?: string;
  instructions?: string;
}> = {
  venmo: {
    placeholder: '@username',
    label: 'Venmo Handle',
    validation: /^@\w{1,50}$/,
    validationMsg: 'Venmo handle must start with @ (e.g., @username)',
    instructions: 'Confirm you have received the Venmo payment before applying.'
  },
  zelle: {
    placeholder: 'email@example.com or phone number',
    label: 'Zelle Email/Phone',
    validation: /^([^\s@]+@[^\s@]+\.[^\s@]+|\+?\d{10,15})$/,
    validationMsg: 'Enter a valid email address or phone number',
    instructions: 'Confirm you have received the Zelle payment before applying.'
  },
  check: {
    placeholder: 'Check #1234',
    label: 'Check Number',
    instructions: 'Enter the check number for record-keeping.'
  }
};

const ApplyPaymentModal: React.FC<ApplyPaymentModalProps> = ({
  open,
  onClose,
  onApplied,
  preselectedClientId
}) => {
  const [clients, setClients] = useState<ClientNeedingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientNeedingPayment | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Idempotency & duplicate detection
  const { token: idempotencyToken, reset: resetIdempotencyToken } = usePaymentIdempotency();
  const [duplicateInfo, setDuplicateInfo] = useState<{
    orderId: number;
    orderNumber?: string;
    newBalance: number;
  } | null>(null);

  // Force override (shown when DUPLICATE_PAYMENT_WINDOW 409 is received)
  const [showForceOverride, setShowForceOverride] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [duplicateWindowMessage, setDuplicateWindowMessage] = useState('');

  // Mode toggle
  const [modalMode, setModalMode] = useState<ModalMode>('package');

  // Manual mode state
  const [sessionsToAdd, setSessionsToAdd] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Package mode state
  const [packages, setPackages] = useState<StorefrontPackage[]>([]);
  const [lastPackage, setLastPackage] = useState<LastPackageInfo | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Stripe card-on-file state
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [attachingTestCard, setAttachingTestCard] = useState(false);

  // Venmo/Zelle confirmation gate
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);

  const getToken = () => localStorage.getItem('token');

  const fetchClientsNeedingPayment = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) { setError('Please log in.'); return; }

      const response = await fetch('/api/sessions/deductions/clients-needing-payment', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch clients.');
        return;
      }

      setClients(result.data || []);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to fetch clients needing payment.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/storefront', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (response.ok) {
        const items = result.items || result.data?.packages || [];
        const active = (items as StorefrontPackage[]).filter(
          (p: any) => p.isActive !== false
        );
        setPackages(active);
      }
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const fetchLastPackage = useCallback(async (clientId: number, activePackages?: StorefrontPackage[]) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/sessions/deductions/client-last-package/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (response.ok && result?.success && result.data) {
        setLastPackage(result.data);
        // Only auto-select if the package is in the active packages list
        const available = activePackages || packages;
        const isActive = available.some((p: any) => p.id === result.data.packageId);
        if (isActive) {
          setSelectedPackageId(result.data.packageId);
        }
      } else {
        setLastPackage(null);
      }
    } catch (err) {
      console.error('Error fetching last package:', err);
      setLastPackage(null);
    }
  }, [packages]);

  const fetchSavedCards = useCallback(async (clientId: number) => {
    setCardsLoading(true);
    setSavedCards([]);
    setSelectedCardId(null);
    setHasStripeCustomer(false);
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`/api/admin/charge-card/payment-methods/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setSavedCards(result.paymentMethods || []);
        setHasStripeCustomer(result.hasStripeCustomer || false);
      }
    } catch (err) {
      console.error('Error fetching saved cards:', err);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  // Initialize on open
  useEffect(() => {
    if (open) {
      fetchClientsNeedingPayment();
      fetchPackages();
      setSelectedClient(null);
      setSessionsToAdd('');
      setPaymentNote('');
      setSuccess(null);
      setDuplicateInfo(null);
      setShowForceOverride(false);
      setForceReason('');
      setDuplicateWindowMessage('');
      setSelectedPackageId(null);
      setLastPackage(null);
      setPaymentMethod('stripe');
      setPaymentReference('');
      setAdminNotes('');
      setModalMode('package');
      setSavedCards([]);
      setSelectedCardId(null);
      setHasStripeCustomer(false);
      setShowPaymentConfirmation(false);
      resetIdempotencyToken();
    }
  }, [open, fetchClientsNeedingPayment, fetchPackages]);

  // Auto-select preselected client when client list AND packages are loaded
  useEffect(() => {
    if (preselectedClientId && clients.length > 0 && packages.length > 0) {
      const match = clients.find(c => c.id === preselectedClientId);
      if (match) {
        setSelectedClient(match);
        fetchLastPackage(match.id, packages);
        fetchSavedCards(match.id);
      }
    }
  }, [preselectedClientId, clients, packages, fetchLastPackage]);

  // Fetch last package and saved cards when client is manually selected
  const handleSelectClient = (client: ClientNeedingPayment) => {
    setSelectedClient(client);
    setSelectedPackageId(null);
    setLastPackage(null);
    setShowPaymentConfirmation(false);
    fetchLastPackage(client.id, packages);
    fetchSavedCards(client.id);
  };

  // Manual credit apply (legacy mode)
  const handleApplyManual = async () => {
    if (!selectedClient) { setError('Please select a client.'); return; }

    const sessions = Number(sessionsToAdd);
    if (!Number.isInteger(sessions) || sessions < 1) {
      setError('Please enter a valid number of sessions (at least 1).');
      return;
    }

    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) { setError('Please log in.'); return; }

      const response = await fetch('/api/sessions/deductions/apply-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId: selectedClient.id,
          sessionsToAdd: sessions,
          paymentNote: paymentNote.trim() || undefined
        })
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to apply payment.');
        return;
      }

      setSuccess(`Added ${sessions} credits to ${selectedClient.name}. New balance: ${result.data?.newBalance}`);
      resetForm();
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error applying payment:', err);
      setError('Failed to apply payment. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // Package-based payment (Phase 2) with idempotency + 409 handling
  const handleApplyPackage = async (forceOverride?: { force: boolean; forceReason: string }) => {
    if (!selectedClient) { setError('Please select a client.'); return; }
    if (!selectedPackageId) { setError('Please select a package.'); return; }

    setApplying(true);
    setError(null);
    setSuccess(null);
    setDuplicateInfo(null);

    try {
      const authToken = getToken();
      if (!authToken) { setError('Please log in.'); return; }

      // For force overrides, generate a fresh token synchronously
      // (resetIdempotencyToken is async via setState, so we can't rely on it here)
      const effectiveToken = forceOverride?.force ? generateUUID() : idempotencyToken;

      const payload: Record<string, unknown> = {
        clientId: selectedClient.id,
        storefrontItemId: selectedPackageId,
        paymentMethod,
        paymentReference: paymentReference.trim() || '',
        adminNotes: adminNotes.trim() || '',
        idempotencyToken: effectiveToken
      };

      // Attach force override if provided
      if (forceOverride?.force) {
        payload.force = true;
        payload.forceReason = forceOverride.forceReason;
      }

      const response = await fetch('/api/sessions/deductions/apply-package-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      // Handle 409 — duplicate detection
      if (response.status === 409) {
        const code = result?.errorCode;

        if (code === 'DUPLICATE_IDEMPOTENCY_KEY' && result?.data?.orderId && result?.data?.newBalance != null) {
          // Exact retry: show existing order info, no harm done
          setDuplicateInfo({
            orderId: result.data.orderId,
            orderNumber: result.data.orderNumber,
            newBalance: result.data.newBalance
          });
        } else if (code === 'DUPLICATE_PAYMENT_WINDOW') {
          // Show force-override prompt so admin can intentionally proceed
          setDuplicateWindowMessage(result?.message || 'A similar payment was recently applied for this client and package.');
          setShowForceOverride(true);
        } else {
          setError(result?.message || 'A similar payment was recently applied. Please wait before retrying.');
        }
        return;
      }

      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to apply package payment.');
        return;
      }

      const d = result.data;
      setSuccess(`Applied ${d.packageName}: ${d.sessionsAdded} sessions to ${selectedClient.name}. New balance: ${d.newBalance}`);
      resetForm();
      resetIdempotencyToken();
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error applying package payment:', err);
      setError('Failed to apply package payment. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // Force override handler — called from the override prompt (works for all methods)
  const handleForceOverride = () => {
    if (forceReason.trim().length < 10) {
      setError('Force reason must be at least 10 characters.');
      return;
    }
    setShowForceOverride(false);
    setDuplicateWindowMessage('');
    if (paymentMethod === 'stripe') {
      handleChargeCard({ force: true, forceReason: forceReason.trim() });
    } else {
      handleApplyPackage({ force: true, forceReason: forceReason.trim() });
    }
  };

  // Stripe card-on-file charge handler
  const handleChargeCard = async (forceOverride?: { force: boolean; forceReason: string }) => {
    if (!selectedClient) { setError('Please select a client.'); return; }
    if (!selectedPackageId) { setError('Please select a package.'); return; }
    if (!selectedCardId) { setError('Please select a card.'); return; }

    setApplying(true);
    setError(null);
    setSuccess(null);
    setDuplicateInfo(null);

    try {
      const authToken = getToken();
      if (!authToken) { setError('Please log in.'); return; }

      const effectiveToken = forceOverride?.force ? generateUUID() : idempotencyToken;

      const payload: Record<string, unknown> = {
        clientId: selectedClient.id,
        storefrontItemId: selectedPackageId,
        paymentMethodId: selectedCardId,
        idempotencyToken: effectiveToken
      };

      if (forceOverride?.force) {
        payload.force = true;
        payload.forceReason = forceOverride.forceReason;
      }

      const response = await fetch('/api/admin/charge-card/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      // Handle 409 — duplicate detection (same flow as other methods)
      if (response.status === 409) {
        const code = result?.code;
        if (code === 'DUPLICATE_PAYMENT_WINDOW') {
          setDuplicateWindowMessage(result?.error || 'A similar payment was recently applied for this client and package.');
          setShowForceOverride(true);
        } else {
          setError(result?.error || 'A duplicate payment was detected.');
        }
        return;
      }

      if (!response.ok || !result?.success) {
        setError(result?.error || 'Card charge failed.');
        return;
      }

      setSuccess(
        `Charged $${result.chargedAmount?.toFixed(2)} to ${result.paymentMethodBrand} ****${result.paymentMethodLast4}. ` +
        `Added ${result.sessionsAdded} sessions to ${selectedClient.name}. New balance: ${result.newBalance}`
      );
      resetForm();
      resetIdempotencyToken();
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error charging card:', err);
      setError('Failed to charge card. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // Attach test card handler
  const handleAttachTestCard = async () => {
    if (!selectedClient) return;
    setAttachingTestCard(true);
    setError(null);

    try {
      const authToken = getToken();
      if (!authToken) { setError('Please log in.'); return; }

      const response = await fetch('/api/admin/charge-card/test-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ clientId: selectedClient.id })
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        setError(result?.error || 'Failed to attach test card.');
        return;
      }

      // Refetch saved cards
      await fetchSavedCards(selectedClient.id);
    } catch (err) {
      console.error('Error attaching test card:', err);
      setError('Failed to attach test card.');
    } finally {
      setAttachingTestCard(false);
    }
  };

  const handleProcessDeductions = async () => {
    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      if (!token) { setError('Please log in.'); return; }

      const response = await fetch('/api/sessions/deductions/process', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      const result = await response.json();
      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to process deductions.');
        return;
      }

      setSuccess(result.message || 'Deductions processed successfully.');
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error processing deductions:', err);
      setError('Failed to process deductions.');
    } finally {
      setApplying(false);
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setSessionsToAdd('');
    setPaymentNote('');
    setSelectedPackageId(null);
    setLastPackage(null);
    setPaymentReference('');
    setAdminNotes('');
    setDuplicateInfo(null);
    setShowForceOverride(false);
    setForceReason('');
    setDuplicateWindowMessage('');
    setSelectedCardId(null);
    setSavedCards([]);
    setHasStripeCustomer(false);
    setShowPaymentConfirmation(false);
    resetIdempotencyToken();
  };

  const selectedPkg = packages.find(p => p.id === selectedPackageId);
  const pkgSessions = selectedPkg
    ? (selectedPkg.sessions || selectedPkg.totalSessions || 0)
    : 0;
  const pkgPrice = selectedPkg
    ? parseFloat(String(selectedPkg.totalCost || selectedPkg.price || 0))
    : 0;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Apply Payment / Manage Credits"
      size="lg"
      footer={(
        <>
          <OutlinedButton onClick={onClose} disabled={applying}>
            Close
          </OutlinedButton>
          <OutlinedButton onClick={handleProcessDeductions} disabled={applying || loading}>
            {applying ? <Spinner size={16} /> : null}
            Process Auto-Deductions
          </OutlinedButton>
          {selectedClient && (
            modalMode === 'package' ? (
              paymentMethod === 'stripe' ? (
                <GlowButton
                  variant="primary"
                  size="medium"
                  onClick={() => handleChargeCard()}
                  disabled={applying || !selectedPackageId || !selectedCardId || showForceOverride}
                  isLoading={applying}
                >
                  Charge Card
                </GlowButton>
              ) : ['venmo', 'zelle'].includes(paymentMethod) && !showPaymentConfirmation ? (
                <GlowButton
                  variant="primary"
                  size="medium"
                  onClick={() => {
                    // Validate reference before showing confirmation
                    const config = PAYMENT_METHOD_CONFIG[paymentMethod];
                    if (config?.validation && !config.validation.test(paymentReference.trim())) {
                      setError(config.validationMsg || 'Invalid payment reference');
                      return;
                    }
                    if (!paymentReference.trim()) {
                      setError(`${config?.label || 'Payment reference'} is required for ${paymentMethod} payments.`);
                      return;
                    }
                    setShowPaymentConfirmation(true);
                  }}
                  disabled={applying || !selectedPackageId || showForceOverride}
                  isLoading={applying}
                >
                  Confirm Payment
                </GlowButton>
              ) : (
                <GlowButton
                  variant="primary"
                  size="medium"
                  onClick={() => handleApplyPackage()}
                  disabled={applying || !selectedPackageId || showForceOverride || showPaymentConfirmation}
                  isLoading={applying}
                >
                  Apply Package
                </GlowButton>
              )
            ) : (
              <PrimaryButton onClick={handleApplyManual} disabled={applying || !sessionsToAdd}>
                {applying ? <Spinner size={16} /> : <CreditCard size={16} />}
                Apply Credits
              </PrimaryButton>
            )
          )}
        </>
      )}
    >
      {error && (
        <ErrorText style={{ marginBottom: '1rem' }}>{error}</ErrorText>
      )}

      {success && (
        <SuccessMessage>{success}</SuccessMessage>
      )}

      {duplicateInfo && (
        <DuplicatePaymentWarning
          orderId={duplicateInfo.orderId}
          orderNumber={duplicateInfo.orderNumber}
          newBalance={duplicateInfo.newBalance}
          clientName={selectedClient?.name}
          onDismiss={() => {
            setDuplicateInfo(null);
            resetIdempotencyToken();
            resetForm();
            fetchClientsNeedingPayment();
            onApplied?.();
          }}
        />
      )}

      {/* Force Override Prompt — shown on DUPLICATE_PAYMENT_WINDOW */}
      {showForceOverride && (
        <ForceOverrideContainer>
          <ForceOverrideHeader>
            <AlertTriangle size={18} />
            <span>Duplicate Payment Detected</span>
          </ForceOverrideHeader>
          <ForceOverrideBody>{duplicateWindowMessage}</ForceOverrideBody>
          <FormField>
            <Label htmlFor="force-reason">
              Reason for override (min 10 characters)
            </Label>
            <StyledTextarea
              id="force-reason"
              value={forceReason}
              onChange={(e) => setForceReason(e.target.value)}
              rows={2}
              placeholder="e.g., Client intentionally purchasing a second package today"
            />
            <Caption secondary>{forceReason.trim().length}/10 min characters</Caption>
          </FormField>
          <FlexBox gap="0.5rem" style={{ marginTop: '0.5rem' }}>
            <OutlinedButton
              onClick={() => {
                setShowForceOverride(false);
                setForceReason('');
                setDuplicateWindowMessage('');
              }}
            >
              Cancel
            </OutlinedButton>
            <ForceOverrideButton
              onClick={handleForceOverride}
              disabled={applying || forceReason.trim().length < 10}
              type="button"
            >
              {applying ? <Spinner size={16} /> : <AlertTriangle size={16} />}
              Confirm Override
            </ForceOverrideButton>
          </FlexBox>
        </ForceOverrideContainer>
      )}

      {/* Client List */}
      <SectionHeader>
        <AlertTriangle size={18} />
        <SmallText>Clients Needing Payment ({clients.length})</SmallText>
      </SectionHeader>

      {loading ? (
        <FlexBox justify="center" style={{ padding: '2rem' }}>
          <Spinner size={32} />
        </FlexBox>
      ) : clients.length === 0 ? (
        <EmptyState>
          <Caption secondary>No clients with exhausted credits have upcoming sessions.</Caption>
        </EmptyState>
      ) : (
        <ClientList>
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              $selected={selectedClient?.id === client.id}
              onClick={() => handleSelectClient(client)}
            >
              <FlexBox align="center" gap="0.75rem">
                <ClientAvatar><User size={20} /></ClientAvatar>
                <div>
                  <BodyText>{client.name}</BodyText>
                  <Caption secondary>{client.email}</Caption>
                </div>
              </FlexBox>
              <FlexBox gap="1rem" align="center">
                <CreditBadge $negative>
                  {client.availableSessions} credits
                </CreditBadge>
                <SessionBadge>
                  <Calendar size={14} />
                  {client.upcomingSessions} upcoming
                </SessionBadge>
              </FlexBox>
            </ClientCard>
          ))}
        </ClientList>
      )}

      {/* Apply Section - shown when client is selected */}
      {selectedClient && (
        <ApplySection>
          <FlexBox justify="space-between" align="center" style={{ marginBottom: '1rem' }}>
            <SectionHeader style={{ marginBottom: 0 }}>
              <CreditCard size={18} />
              <SmallText>Apply Credits to {selectedClient.name}</SmallText>
            </SectionHeader>
            <ModeToggle>
              <ModeButton
                $active={modalMode === 'package'}
                onClick={() => setModalMode('package')}
                type="button"
              >
                <Package size={14} /> Package
              </ModeButton>
              <ModeButton
                $active={modalMode === 'manual'}
                onClick={() => setModalMode('manual')}
                type="button"
              >
                <DollarSign size={14} /> Manual
              </ModeButton>
            </ModeToggle>
          </FlexBox>

          {modalMode === 'package' ? (
            <>
              {/* Last Package Indicator */}
              {lastPackage && (
                <LastPackageBanner>
                  <Caption secondary>Last purchased:</Caption>
                  <SmallText>{lastPackage.packageName} ({lastPackage.sessions} sessions - ${lastPackage.price})</SmallText>
                </LastPackageBanner>
              )}

              {/* Package Selection Grid */}
              <Label>Select Package</Label>
              {packagesLoading ? (
                <FlexBox justify="center" style={{ padding: '1rem' }}>
                  <Spinner size={24} />
                </FlexBox>
              ) : packages.length === 0 ? (
                <EmptyState>
                  <Caption secondary>No packages found in storefront.</Caption>
                </EmptyState>
              ) : (
                <PackageGrid>
                  {packages.map((pkg) => {
                    const sessions = pkg.sessions || pkg.totalSessions || 0;
                    const price = parseFloat(String(pkg.totalCost || pkg.price || 0));
                    const isLast = lastPackage?.packageId === pkg.id;
                    return (
                      <PackageCard
                        key={pkg.id}
                        $selected={selectedPackageId === pkg.id}
                        $isLast={isLast}
                        onClick={() => setSelectedPackageId(pkg.id)}
                      >
                        {isLast && <LastBadge>Last Purchased</LastBadge>}
                        <PackageName>{pkg.name}</PackageName>
                        <PackageSessions>{sessions} sessions</PackageSessions>
                        <PackagePrice>${price.toFixed(2)}</PackagePrice>
                        <Caption secondary>
                          ${parseFloat(String(pkg.pricePerSession || 0)).toFixed(2)}/session
                        </Caption>
                      </PackageCard>
                    );
                  })}
                </PackageGrid>
              )}

              {/* Payment Method */}
              <FormField style={{ marginTop: '1rem' }}>
                <Label>Payment Method</Label>
                <PaymentMethodGrid>
                  {PAYMENT_METHODS.map((m) => (
                    <PaymentMethodButton
                      key={m.value}
                      $selected={paymentMethod === m.value}
                      onClick={() => {
                        setPaymentMethod(m.value);
                        setShowPaymentConfirmation(false);
                        setPaymentReference('');
                      }}
                      type="button"
                    >
                      {m.label}
                    </PaymentMethodButton>
                  ))}
                </PaymentMethodGrid>
              </FormField>

              {/* Stripe Card-on-File Section */}
              {paymentMethod === 'stripe' && selectedClient && (
                <StripeCardSection>
                  {cardsLoading ? (
                    <FlexBox justify="center" style={{ padding: '1rem' }}>
                      <Spinner size={24} />
                    </FlexBox>
                  ) : savedCards.length > 0 ? (
                    <>
                      <Label>Select Card</Label>
                      <CardGrid>
                        {savedCards.map((card) => (
                          <CardOption
                            key={card.id}
                            $selected={selectedCardId === card.id}
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <CreditCard size={16} />
                            <span style={{ textTransform: 'capitalize' }}>{card.brand}</span>
                            <span>****{card.last4}</span>
                            <Caption secondary>{card.expMonth}/{card.expYear}</Caption>
                          </CardOption>
                        ))}
                      </CardGrid>
                    </>
                  ) : (
                    <NoCardsMessage>
                      <Caption secondary>No cards on file for this client.</Caption>
                    </NoCardsMessage>
                  )}
                  <TestCardButton
                    type="button"
                    onClick={handleAttachTestCard}
                    disabled={attachingTestCard}
                  >
                    {attachingTestCard ? <Spinner size={14} /> : <CreditCard size={14} />}
                    Attach Test Card (Visa ****4242)
                  </TestCardButton>
                </StripeCardSection>
              )}

              {/* Payment Reference — method-specific validation */}
              {paymentMethod !== 'stripe' && (
                <FormField>
                  <Label htmlFor="payment-ref">
                    {PAYMENT_METHOD_CONFIG[paymentMethod]?.label || 'Payment Reference'}{' '}
                    {['venmo', 'zelle', 'check'].includes(paymentMethod) ? '(required)' : '(optional)'}
                  </Label>
                  <StyledInput
                    id="payment-ref"
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder={PAYMENT_METHOD_CONFIG[paymentMethod]?.placeholder || 'Payment reference'}
                  />
                  {PAYMENT_METHOD_CONFIG[paymentMethod]?.validationMsg && paymentReference && (
                    (() => {
                      const config = PAYMENT_METHOD_CONFIG[paymentMethod];
                      const isValid = !config?.validation || config.validation.test(paymentReference.trim());
                      return !isValid ? (
                        <Caption style={{ color: '#ef4444', marginTop: '0.25rem' }}>
                          {config?.validationMsg}
                        </Caption>
                      ) : null;
                    })()
                  )}
                  {PAYMENT_METHOD_CONFIG[paymentMethod]?.instructions && (
                    <Caption secondary style={{ marginTop: '0.25rem' }}>
                      {PAYMENT_METHOD_CONFIG[paymentMethod].instructions}
                    </Caption>
                  )}
                </FormField>
              )}

              {/* Venmo/Zelle Confirmation Gate */}
              {showPaymentConfirmation && ['venmo', 'zelle'].includes(paymentMethod) && (
                <ConfirmationBanner>
                  <ConfirmationHeader>
                    <AlertTriangle size={16} />
                    Confirm Payment Received
                  </ConfirmationHeader>
                  <Caption secondary>
                    Please confirm you have received the {paymentMethod === 'venmo' ? 'Venmo' : 'Zelle'} payment
                    from {selectedClient.name} before applying credits.
                  </Caption>
                  <FlexBox gap="0.5rem" style={{ marginTop: '0.75rem' }}>
                    <OutlinedButton onClick={() => setShowPaymentConfirmation(false)}>
                      Cancel
                    </OutlinedButton>
                    <GlowButton
                      variant="primary"
                      size="small"
                      onClick={() => {
                        setShowPaymentConfirmation(false);
                        handleApplyPackage();
                      }}
                    >
                      Confirm & Apply
                    </GlowButton>
                  </FlexBox>
                </ConfirmationBanner>
              )}

              {/* Admin Notes */}
              <FormField>
                <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                <StyledTextarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder="Internal notes about this payment"
                />
              </FormField>

              {/* Summary */}
              {selectedPackageId && (
                <SummaryCard>
                  <SummaryRow>
                    <Caption secondary>Package</Caption>
                    <BodyText>{selectedPkg?.name}</BodyText>
                  </SummaryRow>
                  <SummaryRow>
                    <Caption secondary>Sessions</Caption>
                    <BodyText>{pkgSessions}</BodyText>
                  </SummaryRow>
                  <SummaryRow>
                    <Caption secondary>Amount</Caption>
                    <BodyText>${pkgPrice.toFixed(2)}</BodyText>
                  </SummaryRow>
                  <SummaryRow>
                    <Caption secondary>Payment</Caption>
                    <BodyText style={{ textTransform: 'capitalize' }}>{paymentMethod}</BodyText>
                  </SummaryRow>
                  <SummaryRow>
                    <Caption secondary>New Balance</Caption>
                    <BodyText style={{ color: '#00FF88', fontWeight: 700 }}>
                      {(selectedClient.availableSessions || 0) + pkgSessions} credits
                    </BodyText>
                  </SummaryRow>
                </SummaryCard>
              )}
            </>
          ) : (
            /* Manual Mode (legacy) */
            <>
              <FormField>
                <Label htmlFor="sessions-to-add">Sessions to Add</Label>
                <StyledInput
                  id="sessions-to-add"
                  type="number"
                  min={1}
                  value={sessionsToAdd}
                  onChange={(e) => setSessionsToAdd(e.target.value)}
                  placeholder="Number of sessions to credit"
                />
              </FormField>

              <FormField>
                <Label htmlFor="payment-note">Payment Note (optional)</Label>
                <StyledTextarea
                  id="payment-note"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  rows={2}
                  placeholder="e.g., 10-pack purchased via Stripe"
                />
              </FormField>
            </>
          )}
        </ApplySection>
      )}
    </Modal>
  );
};

export default ApplyPaymentModal;

/* ─── Styled Components ─── */

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

const ClientCard = styled.div<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const ClientAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #00ffff;
`;

const CreditBadge = styled.span<{ $negative?: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'};
  color: ${({ $negative }) => $negative ? '#ef4444' : '#10b981'};
  border: 1px solid ${({ $negative }) => $negative ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'};
`;

const SessionBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

const ApplySection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
  margin-bottom: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #10b981;
  font-size: 0.9rem;
`;

const ModeToggle = styled.div`
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  min-height: 44px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 150ms ease;
  background: ${({ $active }) => $active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $active }) => $active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
`;

const LastPackageBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(120, 81, 169, 0.12);
  border: 1px solid rgba(120, 81, 169, 0.3);
  margin-bottom: 0.75rem;
`;

const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

const PackageCard = styled.div<{ $selected: boolean; $isLast?: boolean }>`
  position: relative;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 150ms ease;
  text-align: center;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  border: 2px solid ${({ $selected, $isLast }) =>
    $selected ? '#00ffff'
    : $isLast ? 'rgba(120, 81, 169, 0.5)'
    : 'rgba(255, 255, 255, 0.08)'};

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const LastBadge = styled.span`
  position: absolute;
  top: -8px;
  right: 8px;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: rgba(120, 81, 169, 0.8);
  color: white;
`;

const PackageName = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: white;
`;

const PackageSessions = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #00ffff;
`;

const PackagePrice = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #10b981;
`;

const PaymentMethodGrid = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PaymentMethodButton = styled.button<{ $selected: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 150ms ease;
  border: 2px solid ${({ $selected }) => $selected ? '#00ffff' : 'rgba(255, 255, 255, 0.15)'};
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.04)'};
  color: ${({ $selected }) => $selected ? '#00ffff' : 'rgba(255, 255, 255, 0.7)'};

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    background: rgba(0, 255, 255, 0.08);
  }
`;

const SummaryCard = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.2);
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;

  & + & {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
`;

const ForceOverrideContainer = styled.div`
  padding: 1.25rem;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  margin-bottom: 1rem;
`;

const ForceOverrideHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  color: #ef4444;
  margin-bottom: 0.5rem;
`;

const ForceOverrideBody = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

const StripeCardSection = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const CardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
`;

const CardOption = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ $selected }) => $selected ? '#00ffff' : 'rgba(255, 255, 255, 0.8)'};
  background: ${({ $selected }) => $selected ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.04)'};
  border: 2px solid ${({ $selected }) => $selected ? '#00ffff' : 'rgba(255, 255, 255, 0.1)'};

  &:hover {
    background: rgba(0, 255, 255, 0.08);
    border-color: rgba(0, 255, 255, 0.3);
  }
`;

const NoCardsMessage = styled.div`
  padding: 1rem;
  text-align: center;
  margin-bottom: 0.5rem;
`;

const TestCardButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px dashed rgba(120, 81, 169, 0.5);
  background: rgba(120, 81, 169, 0.08);
  color: rgba(120, 81, 169, 0.9);
  font-weight: 600;
  font-size: 0.8rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;
  width: 100%;
  justify-content: center;

  &:hover:not(:disabled) {
    background: rgba(120, 81, 169, 0.15);
    border-color: rgba(120, 81, 169, 0.7);
  }
`;

const ConfirmationBanner = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.3);
`;

const ConfirmationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fbbf24;
  margin-bottom: 0.5rem;
`;

const ForceOverrideButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;

  &:hover:not(:disabled) {
    background: rgba(239, 68, 68, 0.25);
    border-color: rgba(239, 68, 68, 0.7);
  }
`;
