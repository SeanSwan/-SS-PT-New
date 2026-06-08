import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionService from '../../services/sessionService';
import { useToast } from '../../hooks/use-toast';
import type { Toast } from '../../hooks/use-toast';
import {
  buildClientWithSessionSummary,
  buildManualSessionAllocationRequest,
  buildSessionAllocationCsv,
  calculateSessionAllocationStats,
  filterSessionClients,
  getErrorMessage,
  getManualSessionAllocationBlockReason,
} from './SessionAllocationManager.logic';
import type { ManualSessionAllocationRequest } from './SessionAllocationManager.logic';
import type {
  Client,
  SessionAllocationManagerProps,
  SessionClientResponse,
  SessionSummary,
} from './SessionAllocationManager.types';

type ToastDispatcher = (toast: Omit<Toast, 'id'>) => void;

interface SubmitManualSessionAllocationOptions {
  loadClientSessionData: () => Promise<void>;
  onSessionCountChange?: () => void;
  request: ManualSessionAllocationRequest;
  resetAddModal: () => void;
  toast: ToastDispatcher;
}

interface ManualSessionAllocationServiceResult {
  success?: boolean;
  message?: string;
}

const isFailedManualSessionAllocationResult = (
  result: ManualSessionAllocationServiceResult | null | undefined,
): boolean => Boolean(result) && result?.success === false;

const getManualSessionAllocationFailureMessage = (
  result: ManualSessionAllocationServiceResult | null | undefined,
): string => result?.message || 'Failed to add sessions';

const assertManualSessionAllocationSucceeded = (
  result: ManualSessionAllocationServiceResult | null | undefined,
): void => {
  if (isFailedManualSessionAllocationResult(result)) {
    throw new Error(getManualSessionAllocationFailureMessage(result));
  }
};

const toastManualAllocationBlocked = (
  toast: ToastDispatcher,
  description: string,
): void => {
  toast({
    title: 'Free tracking client',
    description,
    variant: 'default',
  });
};

const toastManualAllocationSuccess = (
  toast: ToastDispatcher,
  request: ManualSessionAllocationRequest,
): void => {
  toast({
    title: 'Success',
    description: `Added ${request.sessionCount} sessions to ${request.clientDisplayName}`,
    variant: 'default',
  });
};

const toastManualAllocationError = (
  toast: ToastDispatcher,
  error: unknown,
): void => {
  console.error('Error adding sessions:', error);
  toast({
    title: 'Error',
    description: getErrorMessage(error, 'Failed to add sessions'),
    variant: 'destructive',
  });
};

const submitManualSessionAllocation = async ({
  loadClientSessionData,
  onSessionCountChange,
  request,
  resetAddModal,
  toast,
}: SubmitManualSessionAllocationOptions): Promise<void> => {
  try {
    const result = await sessionService.addSessionsToClient(
      request.userId,
      request.sessionCount,
      request.reason,
    );
    assertManualSessionAllocationSucceeded(result);
    toastManualAllocationSuccess(toast, request);
    await loadClientSessionData();
    onSessionCountChange?.();
    resetAddModal();
  } catch (error: unknown) {
    toastManualAllocationError(toast, error);
  }
};

export const useSessionAllocationManagerController = ({
  onSessionCountChange,
}: SessionAllocationManagerProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [addSessionCount, setAddSessionCount] = useState(1);
  const [addSessionReason, setAddSessionReason] = useState('');

  const loadClientSessionData = useCallback(async () => {
    try {
      setLoading(true);
      const clientsResponse = await sessionService.getClients() as SessionClientResponse[];
      const clientsWithSessions = await Promise.all(
        clientsResponse.map(async (client) => {
          try {
            const sessionSummary = await sessionService.getUserSessionSummary(client.id);
            return buildClientWithSessionSummary(client, sessionSummary as SessionSummary | null);
          } catch (error) {
            console.error(`Error fetching sessions for client ${client.id}:`, error);
            return buildClientWithSessionSummary(client, null);
          }
        }),
      );

      setClients(clientsWithSessions);
    } catch (error) {
      console.error('Error loading client session data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client session data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadClientSessionData();
  }, [loadClientSessionData]);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setSelectedClient(null);
  }, []);

  const resetAddModal = useCallback(() => {
    closeAddModal();
    setAddSessionCount(1);
    setAddSessionReason('');
  }, [closeAddModal]);

  const handleOpenAddSessions = useCallback((client: Client) => {
    if (getManualSessionAllocationBlockReason(client)) return;
    setSelectedClient(client);
    setShowAddModal(true);
  }, []);

  const handleAddSessions = useCallback(async () => {
    const allocation = buildManualSessionAllocationRequest(
      selectedClient,
      addSessionCount,
      addSessionReason,
    );

    if (allocation.blockedReason) {
      toastManualAllocationBlocked(toast, allocation.blockedReason);
      resetAddModal();
      return;
    }

    if (!allocation.request) return;

    await submitManualSessionAllocation({
      loadClientSessionData,
      onSessionCountChange,
      request: allocation.request,
      resetAddModal,
      toast,
    });
  }, [addSessionCount, addSessionReason, loadClientSessionData, onSessionCountChange, resetAddModal, selectedClient, toast]);

  const filteredClients = useMemo(
    () => filterSessionClients(clients, searchQuery),
    [clients, searchQuery],
  );

  const stats = useMemo(
    () => calculateSessionAllocationStats(clients),
    [clients],
  );

  const handleFilterButton = useCallback(() => {
    if (searchQuery.trim()) {
      setSearchQuery('');
      searchInputRef.current?.focus();
      return;
    }

    searchInputRef.current?.focus();
  }, [searchQuery]);

  const handleExport = useCallback(() => {
    if (filteredClients.length === 0) {
      toast({
        title: 'Nothing to export',
        description: 'No clients match the current allocation filter.',
        variant: 'default',
      });
      return;
    }

    const blob = new Blob([buildSessionAllocationCsv(filteredClients)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `session-allocation-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [filteredClients, toast]);

  const handleViewClient = useCallback((client: Client) => {
    navigate(`/dashboard/admin/client-management?clientId=${client.id}`);
  }, [navigate]);

  return {
    addSessionCount,
    addSessionReason,
    filteredClients,
    handleAddSessions,
    handleExport,
    handleFilterButton,
    handleOpenAddSessions,
    handleViewClient,
    loadClientSessionData,
    loading,
    searchInputRef,
    searchQuery,
    selectedClient,
    setAddSessionCount,
    setAddSessionReason,
    setSearchQuery,
    showAddModal,
    stats,
    closeAddModal,
  };
};
