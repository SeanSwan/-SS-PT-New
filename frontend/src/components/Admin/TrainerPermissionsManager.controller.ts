import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  trainerPermissionService
} from '../../services/nasmApiService';
import {
  buildTrainer,
  buildTrainerPermissionCsv,
  getErrorMessage,
  PERMISSION_TYPES
} from './TrainerPermissionsManager.logic';
import {
  applyPermissionTemplate,
  performPermissionBulkOperation
} from './TrainerPermissionsManager.operations';
import type {
  BulkPermissionOperation,
  PermissionRequest,
  PermissionStats,
  TrainerPermissionsManagerProps,
  TrainerWithPermissions
} from './TrainerPermissionsManager.types';

export const useTrainerPermissionsManagerController = ({
  trainerId,
  onPermissionChange
}: TrainerPermissionsManagerProps) => {
  const [trainers, setTrainers] = useState<TrainerWithPermissions[]>([]);
  const [stats, setStats] = useState<PermissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingPermissions, setProcessingPermissions] = useState<Set<string>>(new Set());
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedTrainers, setSelectedTrainers] = useState<Set<number>>(new Set());
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [permissionLoadErrorCount, setPermissionLoadErrorCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredTrainers = useMemo(() => {
    return trainers.filter((trainer) => {
      const fullName = `${trainer.firstName} ${trainer.lastName}`.toLowerCase();
      const normalizedQuery = searchQuery.toLowerCase();
      return searchQuery === '' ||
        fullName.includes(normalizedQuery) ||
        trainer.email.toLowerCase().includes(normalizedQuery);
    });
  }, [trainers, searchQuery]);

  const loadSingleTrainer = useCallback(async (id: number) => {
    try {
      const trainersResponse = await trainerPermissionService.getTrainers({ includeAdmin: true, limit: 100 });
      const trainer = trainersResponse.data?.find((item) => Number(item.id) === id) || {
        id,
        firstName: 'Trainer',
        lastName: `#${id}`,
        email: 'Email unavailable',
        role: 'trainer' as const
      };

      try {
        const permissionsResponse = await trainerPermissionService.getTrainerPermissions(id);
        if (!permissionsResponse.success || !permissionsResponse.data) {
          setTrainers([buildTrainer(trainer, undefined, true)]);
          setPermissionLoadErrorCount(1);
          return;
        }
        setTrainers([buildTrainer(trainer, permissionsResponse.data)]);
        setPermissionLoadErrorCount(0);
      } catch (error) {
        console.error('Failed to load trainer permissions:', error);
        setTrainers([buildTrainer(trainer, undefined, true)]);
        setPermissionLoadErrorCount(1);
      }
    } catch (error) {
      console.error('Failed to load trainer permissions:', error);
      setPermissionLoadErrorCount(0);
    }
  }, []);

  const loadAllTrainers = useCallback(async () => {
    try {
      const trainersResponse = await trainerPermissionService.getTrainers({ includeAdmin: true, limit: 100 });
      const liveTrainers = trainersResponse.data || [];
      const trainersWithPermissions = await Promise.all(
        liveTrainers.map(async (trainer) => {
          try {
            const response = await trainerPermissionService.getTrainerPermissions(trainer.id);
            if (!response.success || !response.data) return buildTrainer(trainer, undefined, true);
            return buildTrainer(trainer, response.data);
          } catch (error) {
            console.error('Failed to load trainer permissions:', error);
            return buildTrainer(trainer, undefined, true);
          }
        })
      );

      setTrainers(trainersWithPermissions);
      setPermissionLoadErrorCount(trainersWithPermissions.filter((trainer) => trainer.permissionLoadFailed).length);
      setSelectedTrainers((prev) => new Set(Array.from(prev).filter((selectedTrainerId) => {
        const trainer = trainersWithPermissions.find((item) => item.id === selectedTrainerId);
        return trainer && !trainer.permissionLoadFailed;
      })));
    } catch (error) {
      console.error('Failed to load trainers:', error);
      setPermissionLoadErrorCount(0);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (trainerId) await loadSingleTrainer(trainerId);
      else await loadAllTrainers();

      const statsResponse = await trainerPermissionService.getPermissionStats();
      if (statsResponse.success && statsResponse.data) setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load permission data:', error);
      toast.error('Failed to load permission data');
    } finally {
      setLoading(false);
    }
  }, [loadAllTrainers, loadSingleTrainer, trainerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const togglePermission = async (targetTrainerId: number, permissionType: string, currentlyHas: boolean) => {
    const permissionKey = `${targetTrainerId}-${permissionType}`;
    const trainer = trainers.find((item) => item.id === targetTrainerId);
    if (processingPermissions.has(permissionKey)) return;
    if (trainer?.permissionLoadFailed) {
      toast.error('Permission data unavailable. Refresh before changing permissions.');
      return;
    }

    setProcessingPermissions((prev) => new Set(prev).add(permissionKey));
    try {
      if (currentlyHas) {
        const permission = trainer?.permissions.find((item) => item.permissionType === permissionType && item.isActive);
        if (permission) {
          const response = await trainerPermissionService.revokePermission(permission.id);
          if (response.success) toast.success('Permission revoked successfully');
        }
      } else {
        const response = await trainerPermissionService.grantPermission({ trainerId: targetTrainerId, permissionType });
        if (response.success) toast.success('Permission granted successfully');
      }

      await loadData();
      onPermissionChange?.();
    } catch (error: unknown) {
      console.error('Failed to toggle permission:', error);
      toast.error(getErrorMessage(error, 'Failed to update permission'));
    } finally {
      setProcessingPermissions((prev) => {
        const next = new Set(prev);
        next.delete(permissionKey);
        return next;
      });
    }
  };

  const applyTemplate = (templateKey: string, trainerIds: number[]) => applyPermissionTemplate({
    loadData,
    onPermissionChange,
    setBulkProcessing,
    setSelectedTemplate,
    setSelectedTrainers,
    templateKey,
    trainerIds,
    trainers
  });

  const performBulkOperation = (operation: BulkPermissionOperation) => performPermissionBulkOperation({
    loadData,
    onPermissionChange,
    operation,
    setBulkProcessing,
    setSelectedTrainers,
    trainers
  });

  const loadPermissionRequests = useCallback(async () => {
    setPermissionRequests([]);
  }, []);

  useEffect(() => {
    loadPermissionRequests();
  }, [loadPermissionRequests]);

  const handlePermissionRequest = async (requestId: string, action: 'approve' | 'deny') => {
    const request = permissionRequests.find((item) => item.id === requestId);
    if (!request) return;
    try {
      if (action === 'approve') {
        await trainerPermissionService.grantPermission({
          trainerId: request.trainerId,
          permissionType: request.permissionType,
          notes: `Approved request: ${request.reason.substring(0, 100)}...`
        });
        toast.success(`Permission request approved for ${request.trainerName}`);
      } else {
        toast.success(`Permission request denied for ${request.trainerName}`);
      }
      setPermissionRequests((prev) => prev.filter((item) => item.id !== requestId));
      if (action === 'approve') {
        await loadData();
        onPermissionChange?.();
      }
    } catch (error: unknown) {
      console.error('Failed to handle request:', error);
      toast.error('Failed to process request');
    }
  };

  const toggleTrainerSelection = (id: number) => {
    const trainer = trainers.find((item) => item.id === id);
    if (trainer?.permissionLoadFailed) return;
    setSelectedTrainers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllTrainers = () => {
    setSelectedTrainers(new Set(filteredTrainers.filter((trainer) => !trainer.permissionLoadFailed).map((trainer) => trainer.id)));
  };

  const clearAllSelection = () => {
    setSelectedTrainers(new Set());
  };

  const handleFilterButton = () => {
    if (searchQuery) {
      setSearchQuery('');
      return;
    }
    searchInputRef.current?.focus();
  };

  const handleExportReport = () => {
    if (filteredTrainers.length === 0) {
      toast.info('No trainers to export');
      return;
    }

    const blob = new Blob([buildTrainerPermissionCsv(filteredTrainers)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trainer-permissions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return {
    applyTemplate,
    bulkProcessing,
    clearAllSelection,
    filteredTrainers,
    handleExportReport,
    handleFilterButton,
    handlePermissionRequest,
    loadData,
    loading,
    performBulkOperation,
    permissionLoadErrorCount,
    permissionLoadWarningText: `${permissionLoadErrorCount} trainer permission set${permissionLoadErrorCount === 1 ? '' : 's'} could not be loaded.`,
    permissionRequests,
    processingPermissions,
    searchInputRef,
    searchQuery,
    selectedTemplate,
    selectedTrainers,
    selectAllTrainers,
    setSearchQuery,
    setSelectedTemplate,
    setShowRequests,
    showRequests,
    stats,
    togglePermission,
    toggleTrainerSelection,
    trainerId
  };
};
