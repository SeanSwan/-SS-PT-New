/**
 * MyClientsView.tsx - Enhanced Trainer Client Management
 * =====================================================
 *
 * Revolutionary My Clients Interface for SwanStudios Trainer Dashboard
 * Implements the complete NASM workflow management system with real-time data
 *
 * CORE FEATURES:
 * ✅ Real-time client-trainer assignments from API
 * ✅ Client session count tracking and management
 * ✅ Quick workout logging access
 * ✅ Client progress overview and analytics
 * ✅ Session history and upcoming appointments
 * ✅ Direct communication interface
 * ✅ Mobile-responsive stellar command center design
 * ✅ WCAG AA accessibility compliance
 *
 * INTEGRATIONS:
 * - ClientTrainerAssignment API service
 * - Session management system
 * - NASM progress tracking
 * - Universal scheduling system
 * - Real-time WebSocket updates
 *
 * TRAINER WORKFLOW:
 * 1. View assigned clients with session counts
 * 2. Quick access to log workouts for each client
 * 3. Monitor client progress and goals
 * 4. Schedule and manage upcoming sessions
 * 5. Communicate with clients directly
 */

import React, { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  AlertCircle,
  RefreshCw,
  UserPlus,
} from 'lucide-react';

import { useToast } from '../../../hooks/use-toast';

// Components
import GlowButton from '../../ui/buttons/GlowButton';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import WorkoutCopilotPanel from '../../DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel';
import { downloadTrainerClientReport } from './trainerClientReportExport';
import {
  ClientsContainer,
  ClientsGrid,
  EmptyState,
  LoadingContainer,
} from './MyClientsView.layoutStyles';
import {
  getTrainerClientIntent,
  parseTrainerClientManagementId,
} from './MyClientsView.logic';
import {
  TrainerClientsFilters,
  TrainerClientsHeader,
  TrainerClientsStats,
} from './MyClientsView.sections';
import { TrainerClientCard } from './MyClientsView.clientCard';
import { useTrainerClients } from './useTrainerClients';

// === MAIN COMPONENT ===
const MyClientsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const trainerClientIntent = getTrainerClientIntent(searchParams);
  const [copilotClient, setCopilotClient] = useState<{ id: number; name: string } | null>(null);
  const {
    error,
    filteredClients,
    handleRefresh,
    loadClients,
    loading,
    refreshing,
    searchTerm,
    setSearchTerm,
    setStatusFilter,
    stats,
    statusFilter,
  } = useTrainerClients();
  const handleExportReport = useCallback(() => {
    if (filteredClients.length === 0) {
      toast({
        title: 'No clients to export',
        description: 'Adjust filters or refresh clients before exporting.',
      });
      return;
    }

    downloadTrainerClientReport(filteredClients);
    toast({
      title: 'Client report exported',
      description: `Exported ${filteredClients.length} visible client${filteredClients.length === 1 ? '' : 's'}.`,
    });
  }, [filteredClients, toast]);

  const handleLogWorkout = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/log-workout?clientId=${clientId}`);
  }, [navigate]);

  const handleViewProgress = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/client-progress?clientId=${clientId}`);
  }, [navigate]);

  const handleOpenClient = useCallback((clientId: string) => {
    if (trainerClientIntent === 'log_workout') {
      handleLogWorkout(clientId);
      return;
    }

    handleViewProgress(clientId);
  }, [handleLogWorkout, handleViewProgress, trainerClientIntent]);

  const handleScheduleSession = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/schedule?clientId=${clientId}`);
  }, [navigate]);

  const handleMessageClient = useCallback((clientId: string) => {
    navigate(`/dashboard/trainer/messages?clientId=${clientId}`);
  }, [navigate]);

  const handleOpenCopilot = useCallback((clientId: string, clientName: string) => {
    const parsedClientId = parseTrainerClientManagementId(clientId);

    if (parsedClientId === null) {
      toast({
        title: 'Client identity unavailable',
        description: 'Refresh your client list before launching Workout Intelligence.',
      });
      return;
    }

    setCopilotClient({
      id: parsedClientId,
      name: clientName,
    });
  }, [toast]);

  // Render loading state
  if (loading) {
    return (
      <LoadingContainer>
        <LoadingSpinner size="large" />
        <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
          Loading Your Clients...
        </h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0 }}>
          Fetching client assignments and session data
        </p>
      </LoadingContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <EmptyState>
        <AlertCircle size={64} className="empty-icon" />
        <h3>Error Loading Clients</h3>
        <p>{error}</p>
        <GlowButton
          text="Try Again"
          theme="ruby"
          onClick={handleRefresh}
          leftIcon={<RefreshCw size={18} />}
        />
      </EmptyState>
    );
  }

  return (
    <ClientsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <TrainerClientsHeader
        totalClients={stats.totalClients}
        refreshing={refreshing}
        onExportReport={handleExportReport}
        onRefresh={handleRefresh}
      />

      <TrainerClientsStats stats={stats} />

      <TrainerClientsFilters
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onSearchTermChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Clients Grid */}
      {filteredClients.length > 0 ? (
        <ClientsGrid
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <AnimatePresence mode="popLayout">
            {filteredClients.map((assignment, index) => (
              <TrainerClientCard
                key={assignment.client.id}
                assignment={assignment}
                index={index}
                onOpenClient={handleOpenClient}
                onLogWorkout={handleLogWorkout}
                onScheduleSession={handleScheduleSession}
                onMessageClient={handleMessageClient}
                onViewProgress={handleViewProgress}
                onOpenCopilot={handleOpenCopilot}
              />
            ))}
          </AnimatePresence>
        </ClientsGrid>
      ) : (
        <EmptyState>
          <Users size={64} className="empty-icon" />
          <h3>
            {searchTerm || statusFilter !== 'all' ? 'No clients found' : 'No clients assigned'}
          </h3>
          <p>
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'You don\'t have any clients assigned yet. Contact your administrator to get started.'
            }
          </p>
          {(!searchTerm && statusFilter === 'all') && (
            <GlowButton
              text="Contact Admin"
              theme="purple"
              onClick={() => toast({
                title: 'Contact Admin',
                description: 'Please reach out to your administrator for client assignments'
              })}
              leftIcon={<UserPlus size={18} />}
            />
          )}
        </EmptyState>
      )}

      {copilotClient && (
        <WorkoutCopilotPanel
          open={!!copilotClient}
          onClose={() => setCopilotClient(null)}
          clientId={copilotClient.id}
          clientName={copilotClient.name}
          onSuccess={() => loadClients()}
          autoGenerate
        />
      )}
    </ClientsContainer>
  );
};

export default MyClientsView;
