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
import {
  Modal,
  FormField,
  Label,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  SmallText,
  BodyText,
  Caption,
  FlexBox,
  Spinner
} from './ui';
import GlowButton from '../ui/buttons/GlowButton';
import DuplicatePaymentWarning from './DuplicatePaymentWarning';
import { usePaymentIdempotency, generateUUID } from '../../hooks/usePaymentIdempotency';
import apiService from '../../services/api.service';
import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import { AlertTriangle, CreditCard, User, Calendar, Package, DollarSign } from 'lucide-react';
import {
  ApplyHeaderRow,
  ApplySection,
  CenteredPad,
  ClientAvatar,
  ClientCard,
  ClientList,
  CreditBadge,
  EmptyState,
  ErrorBlock,
  ForceOverrideActions,
  InlineSectionHeader,
  ModeButton,
  ModeToggle,
  SectionHeader,
  SessionBadge,
  SuccessMessage
} from './ApplyPaymentModal.baseStyles';
import {
  CapitalizedBodyText,
  InstructionCaption,
  LastBadge,
  LastPackageBanner,
  PackageCard,
  PackageGrid,
  PackageName,
  PackagePrice,
  PackageSessions,
  PaymentMethodButton,
  PaymentMethodGrid,
  PositiveBodyText,
  SpacedFormField,
  SummaryCard,
  SummaryRow,
  ValidationCaption
} from './ApplyPaymentModal.packageStyles';
import {
  CardGrid,
  CardOption,
  ConfirmationBanner,
  ConfirmationHeader,
  ForceOverrideBody,
  ForceOverrideButton,
  ForceOverrideContainer,
  ForceOverrideHeader,
  NoCardsMessage,
  StripeCardSection,
  TestCardButton
} from './ApplyPaymentModal.paymentStyles';

interface ClientNeedingPayment {
  id: number;
  name: string;
  email: string;
  phone?: string;
  availableSessions: number;
  clientSource?: string;
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

type StorefrontPackageWithStatus = StorefrontPackage & {
  isActive?: boolean;
};

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

const getApiErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

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
  const [attachingTestCard, setAttachingTestCard] = useState(false);

  // Venmo/Zelle confirmation gate
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);

  const fetchClientsNeedingPayment = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get('/api/sessions/deductions/clients-needing-payment');

      const result = response.data;
      if (result?.success === false) {
        setError(result?.message || 'Failed to fetch clients.');
        return;
      }

      const paymentEligibleClients = (result.data || []).filter(
        (client: ClientNeedingPayment) => !isNonDeductingClientSource(client.clientSource)
      );
      setClients(paymentEligibleClients);
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError(getApiErrorMessage(err, 'Failed to fetch clients needing payment.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPackages = useCallback(async () => {
    setPackagesLoading(true);
    try {
      const response = await apiService.get('/api/storefront');
      const result = response.data as {
        items?: StorefrontPackageWithStatus[];
        data?: { packages?: StorefrontPackageWithStatus[] };
      };
      const items = result.items || result.data?.packages || [];
      const active = items.filter((p) => p.isActive !== false);
      setPackages(active);
    } catch (err) {
      console.error('Error fetching packages:', err);
    } finally {
      setPackagesLoading(false);
    }
  }, []);

  const fetchLastPackage = useCallback(async (clientId: number, activePackages?: StorefrontPackage[]) => {
    try {
      const response = await apiService.get(`/api/sessions/deductions/client-last-package/${clientId}`);
      const result = response.data;
      if (result?.success && result.data) {
        setLastPackage(result.data);
        // Only auto-select if the package is in the active packages list
        const available = activePackages || packages;
        const isActive = available.some((p) => p.id === result.data.packageId);
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
    try {
      const response = await apiService.get(`/api/admin/charge-card/payment-methods/${clientId}`);
      const result = response.data;
      if (result.success) {
        setSavedCards(result.paymentMethods || []);
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
      setShowPaymentConfirmation(false);
      resetIdempotencyToken();
    }
  }, [open, fetchClientsNeedingPayment, fetchPackages, resetIdempotencyToken]);

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
  }, [preselectedClientId, clients, packages, fetchLastPackage, fetchSavedCards]);

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
      const response = await apiService.post('/api/sessions/deductions/apply-payment', {
        clientId: selectedClient.id,
        sessionsToAdd: sessions,
        paymentNote: paymentNote.trim() || undefined
      });

      const result = response.data;
      if (result?.success === false) {
        setError(result?.message || 'Failed to apply payment.');
        return;
      }

      setSuccess(`Added ${sessions} credits to ${selectedClient.name}. New balance: ${result.data?.newBalance}`);
      resetForm();
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error applying payment:', err);
      setError(getApiErrorMessage(err, 'Failed to apply payment. Please try again.'));
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

      const response = await apiService.post('/api/sessions/deductions/apply-package-payment', payload, {
        validateStatus: (status) => status < 500
      });

      const result = response.data;

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

      if (result?.success === false) {
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
      setError(getApiErrorMessage(err, 'Failed to apply package payment. Please try again.'));
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

      const response = await apiService.post('/api/admin/charge-card/charge', payload, {
        validateStatus: (status) => status < 500
      });

      const result = response.data;

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

      if (!result?.success) {
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
      setError(getApiErrorMessage(err, 'Failed to charge card. Please try again.'));
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
      const response = await apiService.post('/api/admin/charge-card/test-card', {
        clientId: selectedClient.id
      });

      const result = response.data;
      if (!result?.success) {
        setError(result?.error || 'Failed to attach test card.');
        return;
      }

      // Refetch saved cards
      await fetchSavedCards(selectedClient.id);
    } catch (err) {
      console.error('Error attaching test card:', err);
      setError(getApiErrorMessage(err, 'Failed to attach test card.'));
    } finally {
      setAttachingTestCard(false);
    }
  };

  const handleProcessDeductions = async () => {
    setApplying(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiService.post('/api/sessions/deductions/process');

      const result = response.data;
      if (result?.success === false) {
        setError(result?.message || 'Failed to process deductions.');
        return;
      }

      setSuccess(result.message || 'Deductions processed successfully.');
      fetchClientsNeedingPayment();
      onApplied?.();
    } catch (err) {
      console.error('Error processing deductions:', err);
      setError(getApiErrorMessage(err, 'Failed to process deductions.'));
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
        <ErrorBlock>{error}</ErrorBlock>
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
          <ForceOverrideActions>
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
          </ForceOverrideActions>
        </ForceOverrideContainer>
      )}

      {/* Client List */}
      <SectionHeader>
        <AlertTriangle size={18} />
        <SmallText>Clients Needing Payment ({clients.length})</SmallText>
      </SectionHeader>

      {loading ? (
        <CenteredPad $pad="2rem">
          <Spinner size={32} />
        </CenteredPad>
      ) : clients.length === 0 ? (
        <EmptyState>
          <Caption secondary>No clients with exhausted credits have upcoming sessions.</Caption>
        </EmptyState>
      ) : (
        <ClientList>
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              type="button"
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
          <ApplyHeaderRow>
            <InlineSectionHeader>
              <CreditCard size={18} />
              <SmallText>Apply Credits to {selectedClient.name}</SmallText>
            </InlineSectionHeader>
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
          </ApplyHeaderRow>

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
                <CenteredPad>
                  <Spinner size={24} />
                </CenteredPad>
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
                        type="button"
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
              <SpacedFormField>
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
              </SpacedFormField>

              {/* Stripe Card-on-File Section */}
              {paymentMethod === 'stripe' && selectedClient && (
                <StripeCardSection>
                  {cardsLoading ? (
                    <CenteredPad>
                      <Spinner size={24} />
                    </CenteredPad>
                  ) : savedCards.length > 0 ? (
                    <>
                      <Label>Select Card</Label>
                      <CardGrid>
                        {savedCards.map((card) => (
                          <CardOption
                            key={card.id}
                            type="button"
                            $selected={selectedCardId === card.id}
                            onClick={() => setSelectedCardId(card.id)}
                          >
                            <CreditCard size={16} />
                            <CapitalizedBodyText as="span">{card.brand}</CapitalizedBodyText>
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
                        <ValidationCaption>
                          {config?.validationMsg}
                        </ValidationCaption>
                      ) : null;
                    })()
                  )}
                  {PAYMENT_METHOD_CONFIG[paymentMethod]?.instructions && (
                    <InstructionCaption secondary>
                      {PAYMENT_METHOD_CONFIG[paymentMethod].instructions}
                    </InstructionCaption>
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
                  <ForceOverrideActions>
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
                  </ForceOverrideActions>
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
                    <CapitalizedBodyText>{paymentMethod === 'stripe' ? 'Card on File' : paymentMethod}</CapitalizedBodyText>
                  </SummaryRow>
                  <SummaryRow>
                    <Caption secondary>New Balance</Caption>
                    <PositiveBodyText>
                      {(selectedClient.availableSessions || 0) + pkgSessions} credits
                    </PositiveBodyText>
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
