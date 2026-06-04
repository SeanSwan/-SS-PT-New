import { useCallback, useEffect, useState } from 'react';
import { generateUUID, usePaymentIdempotency } from '../../hooks/usePaymentIdempotency';
import {
  applyManualSessionPayment,
  applyPackagePayment,
  attachStripeTestCard,
  chargeSavedCard,
  fetchActiveStorefrontPackages,
  fetchClientLastPackage,
  fetchPaymentRecoveryClients,
  fetchSavedCardsForClient,
  processSessionDeductions,
} from './ApplyPaymentModal.api';
import { PAYMENT_METHOD_CONFIG, getApiErrorMessage } from './ApplyPaymentModal.config';
import type {
  ClientNeedingPayment,
  DuplicateInfo,
  ForceOverrideInput,
  LastPackageInfo,
  ModalMode,
  PaymentMethod,
  SavedCard,
  StorefrontPackage,
} from './ApplyPaymentModal.types';

interface ControllerProps {
  open: boolean;
  onApplied?: () => void;
  preselectedClientId?: number;
}

export const useApplyPaymentModalController = ({ open, onApplied, preselectedClientId }: ControllerProps) => {
  const [clients, setClients] = useState<ClientNeedingPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientNeedingPayment | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { token: idempotencyToken, reset: resetIdempotencyToken } = usePaymentIdempotency();
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);
  const [showForceOverride, setShowForceOverride] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [duplicateWindowMessage, setDuplicateWindowMessage] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>('package');
  const [sessionsToAdd, setSessionsToAdd] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [packages, setPackages] = useState<StorefrontPackage[]>([]);
  const [lastPackage, setLastPackage] = useState<LastPackageInfo | null>(null);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [attachingTestCard, setAttachingTestCard] = useState(false);
  const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);

  const selectedPkg = packages.find((packageItem) => packageItem.id === selectedPackageId);
  const pkgSessions = selectedPkg ? selectedPkg.sessions || selectedPkg.totalSessions || 0 : 0;
  const pkgPrice = selectedPkg ? parseFloat(String(selectedPkg.totalCost || selectedPkg.price || 0)) : 0;

  const resetForm = useCallback(() => {
    setSelectedClient(null); setSessionsToAdd(''); setPaymentNote(''); setSelectedPackageId(null);
    setLastPackage(null); setPaymentReference(''); setAdminNotes(''); setDuplicateInfo(null);
    setShowForceOverride(false); setForceReason(''); setDuplicateWindowMessage('');
    setSelectedCardId(null); setSavedCards([]); setShowPaymentConfirmation(false); resetIdempotencyToken();
  }, [resetIdempotencyToken]);

  const refreshPaymentClients = useCallback(async () => {
    setLoading(true); setError(null);
    try { setClients(await fetchPaymentRecoveryClients()); }
    catch (err) { console.error('Error fetching clients:', err); setError(getApiErrorMessage(err, 'Failed to fetch clients needing payment.')); }
    finally { setLoading(false); }
  }, []);

  const refreshPackages = useCallback(async () => {
    setPackagesLoading(true);
    try { setPackages(await fetchActiveStorefrontPackages()); }
    catch (err) { console.error('Error fetching packages:', err); }
    finally { setPackagesLoading(false); }
  }, []);

  const refreshLastPackage = useCallback(async (clientId: number, activePackages?: StorefrontPackage[]) => {
    try {
      const data = await fetchClientLastPackage(clientId);
      setLastPackage(data);
      const available = activePackages || packages;
      if (data && available.some((packageItem) => packageItem.id === data.packageId)) setSelectedPackageId(data.packageId);
    } catch (err) { console.error('Error fetching last package:', err); setLastPackage(null); }
  }, [packages]);

  const refreshSavedCards = useCallback(async (clientId: number) => {
    setCardsLoading(true); setSavedCards([]); setSelectedCardId(null);
    try { setSavedCards(await fetchSavedCardsForClient(clientId)); }
    catch (err) { console.error('Error fetching saved cards:', err); }
    finally { setCardsLoading(false); }
  }, []);

  useEffect(() => {
    if (!open) return;
    refreshPaymentClients(); refreshPackages(); resetForm(); setSuccess(null); setModalMode('package'); setPaymentMethod('stripe');
  }, [open, refreshPaymentClients, refreshPackages, resetForm]);

  useEffect(() => {
    if (!preselectedClientId || clients.length === 0 || packages.length === 0) return;
    const match = clients.find((client) => client.id === preselectedClientId);
    if (match) { setSelectedClient(match); refreshLastPackage(match.id, packages); refreshSavedCards(match.id); }
  }, [preselectedClientId, clients, packages, refreshLastPackage, refreshSavedCards]);

  const handleSelectClient = (client: ClientNeedingPayment) => {
    setSelectedClient(client); setSelectedPackageId(null); setLastPackage(null); setShowPaymentConfirmation(false);
    refreshLastPackage(client.id, packages); refreshSavedCards(client.id);
  };

  const finishSuccessfulPayment = useCallback(() => {
    resetForm(); refreshPaymentClients(); onApplied?.();
  }, [onApplied, refreshPaymentClients, resetForm]);

  const handleApplyManual = async () => {
    if (!selectedClient) { setError('Please select a client.'); return; }
    const sessions = Number(sessionsToAdd);
    if (!Number.isInteger(sessions) || sessions < 1) { setError('Please enter a valid number of sessions (at least 1).'); return; }
    setApplying(true); setError(null); setSuccess(null);
    try {
      const result = (await applyManualSessionPayment({ clientId: selectedClient.id, sessionsToAdd: sessions, paymentNote: paymentNote.trim() || undefined })).data;
      if (result?.success === false) { setError(result?.message || 'Failed to apply payment.'); return; }
      setSuccess(`Added ${sessions} credits to ${selectedClient.name}. New balance: ${result.data?.newBalance}`); finishSuccessfulPayment();
    } catch (err) { console.error('Error applying payment:', err); setError(getApiErrorMessage(err, 'Failed to apply payment. Please try again.')); }
    finally { setApplying(false); }
  };

  const handleApplyPackage = async (forceOverride?: ForceOverrideInput) => {
    if (!selectedClient) { setError('Please select a client.'); return; }
    if (!selectedPackageId) { setError('Please select a package.'); return; }
    setApplying(true); setError(null); setSuccess(null); setDuplicateInfo(null);
    try {
      const response = await applyPackagePayment({ clientId: selectedClient.id, storefrontItemId: selectedPackageId, paymentMethod, paymentReference: paymentReference.trim() || '', adminNotes: adminNotes.trim() || '', idempotencyToken: forceOverride?.force ? generateUUID() : idempotencyToken, ...forceOverride });
      const result = response.data;
      if (response.status === 409) {
        if (result?.errorCode === 'DUPLICATE_IDEMPOTENCY_KEY' && result?.data?.orderId && result?.data?.newBalance != null) setDuplicateInfo({ orderId: result.data.orderId, orderNumber: result.data.orderNumber, newBalance: result.data.newBalance });
        else if (result?.errorCode === 'DUPLICATE_PAYMENT_WINDOW') { setDuplicateWindowMessage(result?.message || 'A similar payment was recently applied for this client and package.'); setShowForceOverride(true); }
        else setError(result?.message || 'A similar payment was recently applied. Please wait before retrying.');
        return;
      }
      if (result?.success === false) { setError(result?.message || 'Failed to apply package payment.'); return; }
      setSuccess(`Applied ${result.data.packageName}: ${result.data.sessionsAdded} sessions to ${selectedClient.name}. New balance: ${result.data.newBalance}`); finishSuccessfulPayment();
    } catch (err) { console.error('Error applying package payment:', err); setError(getApiErrorMessage(err, 'Failed to apply package payment. Please try again.')); }
    finally { setApplying(false); }
  };

  const handleChargeCard = async (forceOverride?: ForceOverrideInput) => {
    if (!selectedClient) { setError('Please select a client.'); return; }
    if (!selectedPackageId) { setError('Please select a package.'); return; }
    if (!selectedCardId) { setError('Please select a card.'); return; }
    setApplying(true); setError(null); setSuccess(null); setDuplicateInfo(null);
    try {
      const response = await chargeSavedCard({ clientId: selectedClient.id, storefrontItemId: selectedPackageId, paymentMethodId: selectedCardId, idempotencyToken: forceOverride?.force ? generateUUID() : idempotencyToken, ...forceOverride });
      const result = response.data;
      if (response.status === 409) {
        if (result?.code === 'DUPLICATE_PAYMENT_WINDOW') { setDuplicateWindowMessage(result?.error || 'A similar payment was recently applied for this client and package.'); setShowForceOverride(true); }
        else setError(result?.error || 'A duplicate payment was detected.');
        return;
      }
      if (!result?.success) { setError(result?.error || 'Card charge failed.'); return; }
      setSuccess(`Charged $${result.chargedAmount?.toFixed(2)} to ${result.paymentMethodBrand} ****${result.paymentMethodLast4}. Added ${result.sessionsAdded} sessions to ${selectedClient.name}. New balance: ${result.newBalance}`); finishSuccessfulPayment();
    } catch (err) { console.error('Error charging card:', err); setError(getApiErrorMessage(err, 'Failed to charge card. Please try again.')); }
    finally { setApplying(false); }
  };

  const handleForceOverride = () => {
    if (forceReason.trim().length < 10) { setError('Force reason must be at least 10 characters.'); return; }
    setShowForceOverride(false); setDuplicateWindowMessage('');
    const override = { force: true, forceReason: forceReason.trim() };
    if (paymentMethod === 'stripe') handleChargeCard(override); else handleApplyPackage(override);
  };

  const handleAttachTestCard = async () => {
    if (!selectedClient) return;
    setAttachingTestCard(true); setError(null);
    try {
      const result = (await attachStripeTestCard(selectedClient.id)).data;
      if (!result?.success) { setError(result?.error || 'Failed to attach test card.'); return; }
      await refreshSavedCards(selectedClient.id);
    } catch (err) { console.error('Error attaching test card:', err); setError(getApiErrorMessage(err, 'Failed to attach test card.')); }
    finally { setAttachingTestCard(false); }
  };

  const handleProcessDeductions = async () => {
    setApplying(true); setError(null); setSuccess(null);
    try {
      const result = (await processSessionDeductions()).data;
      if (result?.success === false) { setError(result?.message || 'Failed to process deductions.'); return; }
      setSuccess(result.message || 'Deductions processed successfully.'); refreshPaymentClients(); onApplied?.();
    } catch (err) { console.error('Error processing deductions:', err); setError(getApiErrorMessage(err, 'Failed to process deductions.')); }
    finally { setApplying(false); }
  };

  const handleConfirmPaymentReceived = () => {
    const config = PAYMENT_METHOD_CONFIG[paymentMethod];
    if (config?.validation && !config.validation.test(paymentReference.trim())) { setError(config.validationMsg || 'Invalid payment reference'); return; }
    if (!paymentReference.trim()) { setError(`${config?.label || 'Payment reference'} is required for ${paymentMethod} payments.`); return; }
    setShowPaymentConfirmation(true);
  };

  const handleDismissDuplicateInfo = () => { setDuplicateInfo(null); resetIdempotencyToken(); finishSuccessfulPayment(); };
  const handleCancelForceOverride = () => { setShowForceOverride(false); setForceReason(''); setDuplicateWindowMessage(''); };
  const handlePaymentMethodChange = (method: PaymentMethod) => { setPaymentMethod(method); setShowPaymentConfirmation(false); setPaymentReference(''); };

  return {
    clients, loading, applying, error, selectedClient, success, duplicateInfo, showForceOverride,
    forceReason, duplicateWindowMessage, modalMode, sessionsToAdd, paymentNote, packages,
    lastPackage, selectedPackageId, paymentMethod, paymentReference, adminNotes, packagesLoading,
    savedCards, selectedCardId, cardsLoading, attachingTestCard, showPaymentConfirmation,
    selectedPkg, pkgSessions, pkgPrice, setModalMode, setSessionsToAdd, setPaymentNote,
    setSelectedPackageId, setPaymentReference, setAdminNotes, setSelectedCardId,
    setShowPaymentConfirmation, setForceReason, handleSelectClient, handleApplyManual,
    handleApplyPackage, handleChargeCard, handleForceOverride, handleAttachTestCard,
    handleProcessDeductions, handleConfirmPaymentReceived, handleDismissDuplicateInfo,
    handleCancelForceOverride, handlePaymentMethodChange,
  };
};
