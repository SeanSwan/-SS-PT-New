/**
 * Controller hook for the biometrics entry workflow.
 * Keeps client lookup, measurement loading, photo state, saving, and chart data
 * outside the visible MeasurementEntry shell.
 */

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import type {
  BodyMeasurement,
  Client,
  MeasurementEntryProps,
  MeasurementMilestone,
  MeasurementStats,
  RecentMeasurement,
} from './MeasurementEntry.types';
import {
  buildRadarData,
  buildTrendData,
  filterClients,
  mapRawClients,
} from './MeasurementEntry.dataUtils';

export const useMeasurementEntryController = ({
  embeddedClientId,
  embeddedClientName,
}: MeasurementEntryProps) => {
  const { clientId: routeClientId } = useParams<{ clientId?: string }>();
  const effectiveClientId = embeddedClientId || routeClientId;
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [latestMeasurement, setLatestMeasurement] = useState<BodyMeasurement | null>(null);
  const [newMeasurement, setNewMeasurement] = useState<Partial<BodyMeasurement>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentMeasurements, setRecentMeasurements] = useState<RecentMeasurement[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [savedPhotoUrls, setSavedPhotoUrls] = useState<string[]>([]);
  const [detailMeasurement, setDetailMeasurement] = useState<RecentMeasurement | null>(null);
  const [stats, setStats] = useState<MeasurementStats | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const filteredClients = filterClients(clients, clientSearch);
  const trendData = useMemo(() => buildTrendData(recentMeasurements), [recentMeasurements]);
  const radarData = useMemo(() => buildRadarData(recentMeasurements), [recentMeasurements]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsRes = await apiService.get('/api/admin/clients');
        const rawClients = clientsRes.data?.data?.clients || clientsRes.data?.clients || clientsRes.data || [];
        const mapped = mapRawClients(rawClients);
        setClients(mapped);
        if (effectiveClientId) {
          const match = mapped.find((client: Client) => client.id === effectiveClientId);
          if (match) {
            setSelectedClient(match);
            setClientSearch(match.name);
          } else if (embeddedClientName) {
            const placeholder = { id: effectiveClientId, name: embeddedClientName };
            setSelectedClient(placeholder);
            setClientSearch(embeddedClientName);
          }
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    fetchClients();
  }, [toast, effectiveClientId, embeddedClientName]);

  useEffect(() => {
    if (!selectedClient) {
      setLatestMeasurement(null);
      setNewMeasurement({});
      setRecentMeasurements([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
      setStats(null);
      return;
    }

    const fetchLatest = async () => {
      setIsLoading(true);
      try {
        const response = await apiService.get(`/api/measurements/user/${selectedClient.id}/latest`);
        const measurement = response.data?.data || response.data;
        setLatestMeasurement(measurement);
        setNewMeasurement({
          userId: selectedClient.id,
          measurementDate: new Date().toISOString().split('T')[0],
          weightUnit: response.data?.weightUnit || 'lbs',
          circumferenceUnit: response.data?.circumferenceUnit || 'inches',
        });
      } catch {
        setLatestMeasurement(null);
        setNewMeasurement({
          userId: selectedClient.id,
          measurementDate: new Date().toISOString().split('T')[0],
          weightUnit: 'lbs',
          circumferenceUnit: 'inches',
        });
        toast({ title: 'Info', description: 'No previous measurements found for this client.', variant: 'default' });
      } finally {
        setIsLoading(false);
      }
    };

    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const response = await apiService.get(`/api/measurements/user/${selectedClient.id}?limit=100`);
        const recentData = response.data?.data?.measurements || response.data?.measurements || [];
        setRecentMeasurements(recentData);
      } catch (error) {
        console.error('Failed to load recent measurements', error);
        setRecentMeasurements([]);
      } finally {
        setLoadingRecent(false);
      }
    };

    const fetchStats = async () => {
      try {
        const response = await apiService.get(`/api/measurements/user/${selectedClient.id}/stats`);
        setStats(response.data?.data || response.data);
      } catch {
        setStats(null);
      }
    };

    fetchLatest();
    fetchRecent();
    fetchStats();
  }, [selectedClient, toast]);

  const handleCopyLast = () => {
    if (!latestMeasurement) return;
    setNewMeasurement({
      ...latestMeasurement,
      id: undefined,
      measurementDate: new Date().toISOString().split('T')[0],
      notes: '',
      photoUrls: [],
    });
    if (latestMeasurement.photoUrls && latestMeasurement.photoUrls.length > 0) {
      setSavedPhotoUrls(latestMeasurement.photoUrls);
    }
    toast({ title: 'Copied', description: 'Previous measurements copied. Update any changes.' });
  };

  const handleInputChange = (field: keyof BodyMeasurement, value: string) => {
    setNewMeasurement((previous) => ({
      ...previous,
      [field]: value === '' ? undefined : Number(value),
    }));
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const files = Array.from(event.target.files);
    setPhotoFiles((previous) => [...previous, ...files]);
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviews((previous) => [...previous, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setPhotoPreviews((previous) => {
      const urlToRemove = previous[index];
      URL.revokeObjectURL(urlToRemove);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const removeSavedPhoto = (index: number) => {
    setSavedPhotoUrls((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSave = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      let uploadedPhotoUrls: string[] = [...savedPhotoUrls];
      if (photoFiles.length > 0) {
        const formData = new FormData();
        photoFiles.forEach((file) => {
          formData.append('photos', file);
        });
        const uploadResponse = await apiService.post('/api/measurements/upload-photos', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedPhotoUrls = [...uploadedPhotoUrls, ...uploadResponse.data.photoUrls];
      }

      const payload = { ...newMeasurement, userId: selectedClient.id, photoUrls: uploadedPhotoUrls };
      const response = await apiService.post('/api/measurements', payload);
      toast({ title: 'Success', description: 'Measurements saved successfully!' });
      const saveData = response.data?.data || response.data;
      const milestones = saveData?.milestones || saveData?.milestonesAchieved || [];
      milestones.forEach((milestone: MeasurementMilestone) => {
        toast({
          title: 'Milestone!',
          description: milestone.celebrationMessage || 'A measurement milestone was reached.',
          variant: 'success',
        });
      });
      setSelectedClient(null);
      setClientSearch('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
    } catch {
      toast({ title: 'Save Error', description: 'Failed to save measurements.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClientSearchChange = (value: string) => {
    setClientSearch(value);
    setShowDropdown(true);
    if (selectedClient && value !== selectedClient.name) {
      setSelectedClient(null);
    }
  };

  const handleMeasurementDateChange = (value: string) => {
    setNewMeasurement((previous) => ({ ...previous, measurementDate: value }));
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowDropdown(false);
  };

  const handleClearClient = () => {
    setSelectedClient(null);
    setClientSearch('');
    setShowDropdown(false);
  };

  return {
    selectedClient,
    latestMeasurement,
    newMeasurement,
    isSaving,
    isLoading,
    recentMeasurements,
    loadingRecent,
    photoPreviews,
    savedPhotoUrls,
    detailMeasurement,
    stats,
    clientSearch,
    showDropdown,
    autocompleteRef,
    filteredClients,
    trendData,
    radarData,
    setShowDropdown,
    setDetailMeasurement,
    handleCopyLast,
    handleInputChange,
    handlePhotoChange,
    removePhoto,
    removeSavedPhoto,
    handleSave,
    handleClientSearchChange,
    handleMeasurementDateChange,
    handleSelectClient,
    handleClearClient,
  };
};
