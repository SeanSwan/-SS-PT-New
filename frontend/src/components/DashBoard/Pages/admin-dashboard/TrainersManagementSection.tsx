import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import apiService from '../../../../services/api.service';
import {
  LoadingState,
  TrainerActionBar,
  TrainerCards,
  TrainerDeactivationConfirmDialog,
  TrainerStatsOverview,
} from './TrainersManagementSection.sections';
import { ErrorBanner, ManagementContainer } from './TrainersManagementSection.styles';
import type { Trainer, TrainerStats } from './TrainersManagementSection.types';
import {
  calculateStats,
  filterTrainers,
  getSpecialties,
  mapBackendTrainerData,
} from './TrainersManagementSection.utils';

const EMPTY_STATS: TrainerStats = {
  totalTrainers: 0,
  activeTrainers: 0,
  pendingTrainers: 0,
  avgRating: 0,
  totalRevenue: 0,
};

const TrainersManagementSection: React.FC = () => {
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [stats, setStats] = useState<TrainerStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [pendingDeactivationTrainer, setPendingDeactivationTrainer] = useState<Trainer | null>(null);
  const [deactivationBusy, setDeactivationBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchTrainers = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await apiService.get('/api/auth/users/trainers?includeAdmin=true&limit=100');
      const data = response.data;

      if (data?.success === false) {
        throw new Error(data?.message || 'Trainer list request failed');
      }

      const trainersArray = data?.trainers || data?.data?.trainers || [];
      const mappedTrainers = mapBackendTrainerData(Array.isArray(trainersArray) ? trainersArray : []);
      setTrainers(mappedTrainers);
      setStats(calculateStats(mappedTrainers));
    } catch (error) {
      console.error('Error fetching trainers:', error);
      setTrainers([]);
      setStats(calculateStats([]));
      setLoadError('Trainer data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  const filteredTrainers = useMemo(
    () => filterTrainers(trainers, searchTerm, statusFilter, specialtyFilter),
    [trainers, searchTerm, statusFilter, specialtyFilter]
  );

  const allSpecialties = useMemo(() => getSpecialties(trainers), [trainers]);

  const handleVerifyTrainer = async (trainerId: string) => {
    try {
      const response = await apiService.put(`/api/auth/user/${trainerId}`, {});

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to verify trainer');
      }

      await fetchTrainers();
      setActiveActionMenu(null);
    } catch (error) {
      console.error('Error verifying trainer:', error);
    }
  };

  const handleEditTrainer = (trainerId: string) => {
    logger.log('Edit trainer:', trainerId);
    setActiveActionMenu(null);
  };

  const handleViewTrainer = (trainerId: string) => {
    logger.log('View trainer:', trainerId);
    setActiveActionMenu(null);
  };

  const handleRequestDeactivateTrainer = useCallback((trainerId: string) => {
    const trainer = trainers.find((item) => item.id === trainerId) || null;
    setPendingDeactivationTrainer(trainer);
    setActiveActionMenu(null);
  }, [trainers]);

  const handleCloseDeactivateTrainer = useCallback(() => {
    if (!deactivationBusy) {
      setPendingDeactivationTrainer(null);
    }
  }, [deactivationBusy]);

  const handleConfirmDeactivateTrainer = async () => {
    if (!pendingDeactivationTrainer) return;

    try {
      setDeactivationBusy(true);
      const trainerId = pendingDeactivationTrainer.id;
      const response = await apiService.delete(`/api/auth/user/${trainerId}`);

      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Failed to deactivate trainer');
      }

      await fetchTrainers();
      setPendingDeactivationTrainer(null);
      setActiveActionMenu(null);
    } catch (error) {
      console.error('Error deactivating trainer:', error);
    } finally {
      setDeactivationBusy(false);
    }
  };

  if (loading) {
    return (
      <ManagementContainer>
        <LoadingState />
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      <TrainerStatsOverview stats={stats} />
      <TrainerActionBar
        allSpecialties={allSpecialties}
        searchTerm={searchTerm}
        specialtyFilter={specialtyFilter}
        statusFilter={statusFilter}
        onAssignments={() => navigate('/dashboard/client-trainer-assignments')}
        onManagePermissions={() => navigate('/dashboard/admin/trainer-permissions')}
        onRefresh={fetchTrainers}
        onSearchChange={setSearchTerm}
        onSpecialtyFilterChange={setSpecialtyFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {loadError && <ErrorBanner role="alert">{loadError}</ErrorBanner>}

      <TrainerCards
        activeActionMenu={activeActionMenu}
        trainers={filteredTrainers}
        onActionMenuToggle={setActiveActionMenu}
        onDeactivate={handleRequestDeactivateTrainer}
        onEdit={handleEditTrainer}
        onVerify={handleVerifyTrainer}
        onView={handleViewTrainer}
      />

      {pendingDeactivationTrainer && (
        <TrainerDeactivationConfirmDialog
          busy={deactivationBusy}
          trainer={pendingDeactivationTrainer}
          onCancel={handleCloseDeactivateTrainer}
          onConfirm={handleConfirmDeactivateTrainer}
        />
      )}
    </ManagementContainer>
  );
};

export default TrainersManagementSection;
