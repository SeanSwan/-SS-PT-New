import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../../hooks/use-toast';
import { useSocket } from '../../../../context/SocketContext';
import services from '../../../../services/index';
import apiService from '../../../../services/api.service';
import { logger } from '@/utils/logger';
import type { Client, Trainer, Session } from './ViewSessionModal.types';
import { getAdminSessionsErrorMessage } from './AdminSessionsErrors.logic';

type PurchaseSocketPayload = {
  type?: string;
  userName?: string;
  sessions?: number | string;
  sessionsPurchased?: number | string;
};

const useAdminSessionsData = () => {
  const { toast } = useToast();
  const { socket } = useSocket();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingTrainers, setLoadingTrainers] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await services.sessionService.getSessions();

      if (result.success && result.data && Array.isArray(result.data)) {
        setSessions(result.data as unknown as Session[]);
        toast({
          title: 'Success',
          description: 'Sessions loaded successfully',
        });
        return;
      }

      logger.warn('Received unexpected data structure for sessions:', result.data);
      setError('Failed to fetch sessions data: ' + (result.message || 'Invalid format'));
      toast({
        title: 'Error',
        description: 'Failed to load sessions (invalid format)',
        variant: 'destructive',
      });
    } catch (error: unknown) {
      console.error('Error fetching sessions:', error);
      const errorMsg = getAdminSessionsErrorMessage(error, 'Error connecting to the server');
      setError(errorMsg);
      toast({
        title: 'Error',
        description: `Could not load sessions: ${errorMsg}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchClients = useCallback(async () => {
    setLoadingClients(true);

    try {
      const response = await apiService.get('/api/auth/clients');

      if (response.data && Array.isArray(response.data)) {
        setClients(response.data);
        return;
      }

      logger.warn('Received unexpected data structure for clients:', response.data);
      toast({
        title: 'Warning',
        description: 'Failed to load clients (invalid format)',
        variant: 'destructive',
      });
    } catch (error: unknown) {
      console.error('Error fetching clients:', error);
      const errorMsg = getAdminSessionsErrorMessage(error, 'Could not load clients');
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoadingClients(false);
    }
  }, [toast]);

  const fetchTrainers = useCallback(async () => {
    setLoadingTrainers(true);

    try {
      const response = await apiService.get('/api/auth/trainers');

      if (response.data && Array.isArray(response.data)) {
        setTrainers(response.data);
        return;
      }

      logger.warn('Received unexpected data structure for trainers:', response.data);
      toast({
        title: 'Warning',
        description: 'Failed to load trainers (invalid format)',
        variant: 'destructive',
      });
    } catch (error: unknown) {
      console.error('Error fetching trainers:', error);
      const errorMsg = getAdminSessionsErrorMessage(error, 'Could not load trainers');
      toast({
        title: 'Error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setLoadingTrainers(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions();
    fetchClients();
    fetchTrainers();
  }, [fetchClients, fetchSessions, fetchTrainers]);

  useEffect(() => {
    if (!socket) return;

    const refreshSessionsSurface = () => {
      fetchClients();
      fetchSessions();
    };

    const handleUserPurchasedSessions = (payload: PurchaseSocketPayload) => {
      logger.log('Received purchase socket event in sessions view:', payload);
      toast({
        title: 'New Sessions',
        description: `${payload.userName || 'A client'} purchased ${payload.sessionsPurchased ?? payload.sessions ?? ''} sessions`,
      });
      refreshSessionsSurface();
    };

    const handleDashboardUpdate = (payload: PurchaseSocketPayload & { data?: PurchaseSocketPayload }) => {
      if (payload?.type !== 'purchase' && payload?.data?.type !== 'purchase') return;
      const purchasePayload = payload.data ?? payload;
      handleUserPurchasedSessions({
        userName: purchasePayload.userName,
        sessions: purchasePayload.sessions,
        sessionsPurchased: purchasePayload.sessionsPurchased,
      });
    };

    const handleScheduleUpdate = () => {
      logger.log('Received schedule socket event in sessions view');
      refreshSessionsSurface();
    };

    socket.on('user_purchased_sessions', handleUserPurchasedSessions);
    socket.on('dashboard:update', handleDashboardUpdate);
    socket.on('schedule:update', handleScheduleUpdate);
    socket.on('schedule:sync_required', handleScheduleUpdate);

    return () => {
      socket.off('user_purchased_sessions', handleUserPurchasedSessions);
      socket.off('dashboard:update', handleDashboardUpdate);
      socket.off('schedule:update', handleScheduleUpdate);
      socket.off('schedule:sync_required', handleScheduleUpdate);
    };
  }, [socket, toast, fetchClients, fetchSessions]);

  return {
    sessions,
    loading,
    error,
    clients,
    trainers,
    loadingClients,
    loadingTrainers,
    fetchSessions,
    fetchClients,
    fetchTrainers,
  };
};

export default useAdminSessionsData;
