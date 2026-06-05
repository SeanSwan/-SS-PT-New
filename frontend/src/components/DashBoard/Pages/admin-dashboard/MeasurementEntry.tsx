import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Ruler } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import {
  containerVariants,
  itemVariants,
} from './MeasurementEntry.config';
import type {
  BodyMeasurement,
  Client,
  MeasurementEntryProps,
  MeasurementMilestone,
  MeasurementStats,
  RecentMeasurement,
} from './MeasurementEntry.types';
import {
  BodyText,
  FlexRow,
  GlassPanel,
  PageWrapper,
  ResponsiveGrid,
  SectionTitle,
  Spinner,
} from './MeasurementEntry.baseStyles';
import {
  AutocompleteWrapper,
  ChangeChip,
  ClearClientButton,
  DropdownItem,
  DropdownList,
  EmbeddedClientBadge,
  InputWrapper,
  StyledInput,
  StyledLabel,
} from './MeasurementEntry.formStyles';
import {
  buildRadarData,
  buildTrendData,
  filterClients,
  mapRawClients,
} from './MeasurementEntry.dataUtils';
import { getMeasurementChange } from './MeasurementEntry.changeUtils';
import MeasurementEntryProgressCharts from './MeasurementEntryProgressCharts';
import MeasurementEntryFormPanel from './MeasurementEntryFormPanel';
import MeasurementEntryRecentPanel from './MeasurementEntryRecentPanel';
import MeasurementEntryDetailModal from './MeasurementEntryDetailModal';

const BodyMap = React.lazy(() => import('../../../BodyMap'));

// ─── Styled Components ──────────────────────────────────────────────────────────

// ─── Input / Form Components ────────────────────────────────────────────────────

// ─── Autocomplete / Searchable Select ───────────────────────────────────────────

// ─── Button Components ──────────────────────────────────────────────────────────

// ─── Chip Components ────────────────────────────────────────────────────────────

// ─── Photo Preview ──────────────────────────────────────────────────────────────

// ─── 3D Progress Graph Styled Components ────────────────────────────────────────

// ═════════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════════

const MeasurementEntry: React.FC<MeasurementEntryProps> = ({
  embeddedClientId,
  embeddedClientName,
}) => {
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

  // Autocomplete state
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const filteredClients = filterClients(clients, clientSearch);

  // ─── Chart Data Memos ──────────────────────────────────────────────────────
  const trendData = useMemo(() => buildTrendData(recentMeasurements), [recentMeasurements]);

  const radarData = useMemo(() => buildRadarData(recentMeasurements), [recentMeasurements]);

  // Close dropdown on outside click
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
        // Auto-select client from embedded prop or route param
        if (effectiveClientId) {
          const match = mapped.find((c: Client) => c.id === effectiveClientId);
          if (match) {
            setSelectedClient(match);
            setClientSearch(match.name);
          } else if (embeddedClientName) {
            // Client not in list yet — create a placeholder
            const placeholder = { id: effectiveClientId, name: embeddedClientName };
            setSelectedClient(placeholder);
            setClientSearch(embeddedClientName);
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    fetchClients();
  }, [toast, effectiveClientId, embeddedClientName]);

  useEffect(() => {
    if (selectedClient) {
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
        } catch (error) {
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
    } else {
      setLatestMeasurement(null);
      setNewMeasurement({});
      setRecentMeasurements([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
      setStats(null);
    }
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
    // Show saved photos from previous measurement
    if (latestMeasurement.photoUrls && latestMeasurement.photoUrls.length > 0) {
      setSavedPhotoUrls(latestMeasurement.photoUrls);
    }
    toast({ title: 'Copied', description: 'Previous measurements copied. Update any changes.' });
  };

  const handleInputChange = (field: keyof BodyMeasurement, value: string) => {
    setNewMeasurement((prev) => ({
      ...prev,
      [field]: value === '' ? undefined : Number(value),
    }));
  };

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setPhotoFiles((prev) => [...prev, ...files]);

      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => {
      const urlToRemove = prev[index];
      URL.revokeObjectURL(urlToRemove);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeSavedPhoto = (index: number) => {
    setSavedPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      // Start with any saved photos the user kept from previous measurement
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
      if (milestones.length > 0) {
        milestones.forEach((milestone: MeasurementMilestone) => {
          toast({
            title: 'Milestone!',
            description: milestone.celebrationMessage || 'A measurement milestone was reached.',
            variant: 'success',
          });
        });
      }
      setSelectedClient(null);
      setClientSearch('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
      setSavedPhotoUrls([]);
    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save measurements.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
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

  const renderChange = (field: keyof BodyMeasurement) => {
    const change = getMeasurementChange(field, latestMeasurement, newMeasurement);
    if (change.kind === 'empty') {
      return <ChangeChip>N/A</ChangeChip>;
    }

    if (change.kind === 'neutral') {
      return <ChangeChip>&rarr; {change.label}</ChangeChip>;
    }

    return (
      <ChangeChip $variant={change.variant}>
        {change.variant === 'success' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        {change.label}
      </ChangeChip>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageWrapper variants={containerVariants} initial="hidden" animate="visible">
      {/* ── Client Selection Panel ── */}
      <GlassPanel as={motion.div} variants={itemVariants}>
        <SectionTitle>Body Measurements Entry</SectionTitle>
        <ResponsiveGrid>
          {/* Client Select — read-only badge when embedded, autocomplete otherwise */}
          {embeddedClientId ? (
            <InputWrapper>
              <StyledLabel>Client</StyledLabel>
              <EmbeddedClientBadge>
                <Ruler size={16} />
                {selectedClient?.name || embeddedClientName || `Client #${embeddedClientId}`}
              </EmbeddedClientBadge>
            </InputWrapper>
          ) : (
            <AutocompleteWrapper ref={autocompleteRef}>
              <InputWrapper>
                <StyledLabel>Select Client</StyledLabel>
                <FlexRow $gap={0} $relative>
                  <StyledInput
                    type="text"
                    placeholder="Search clients..."
                    value={clientSearch}
                    onChange={(e) => {
                      setClientSearch(e.target.value);
                      setShowDropdown(true);
                      if (selectedClient && e.target.value !== selectedClient.name) {
                        setSelectedClient(null);
                      }
                    }}
                    onFocus={() => setShowDropdown(true)}
                    $hasAdornment={!!selectedClient}
                  />
                  {selectedClient && (
                    <ClearClientButton
                      type="button"
                      onClick={handleClearClient}
                      aria-label="Clear selected client"
                    >
                      <X size={16} />
                    </ClearClientButton>
                  )}
                </FlexRow>
              </InputWrapper>
              {showDropdown && clientSearch.length > 0 && (
                <DropdownList>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <DropdownItem
                        key={client.id}
                        type="button"
                        $highlighted={selectedClient?.id === client.id}
                        onClick={() => handleSelectClient(client)}
                      >
                        {client.name}
                      </DropdownItem>
                    ))
                  ) : (
                    <DropdownItem type="button" disabled>No clients found</DropdownItem>
                  )}
                </DropdownList>
              )}
            </AutocompleteWrapper>
          )}

          {/* Measurement Date */}
          <InputWrapper>
            <StyledLabel>Measurement Date</StyledLabel>
            <StyledInput
              type="date"
              value={newMeasurement.measurementDate || ''}
              onChange={(e) =>
                setNewMeasurement((p) => ({ ...p, measurementDate: e.target.value }))
              }
              disabled={!selectedClient}
            />
          </InputWrapper>
        </ResponsiveGrid>
      </GlassPanel>

      {/* ── Measurement Entry Form ── */}
      {selectedClient &&
        (isLoading ? (
          <Spinner />
        ) : (
          <MeasurementEntryFormPanel
            selectedClient={selectedClient}
            latestMeasurement={latestMeasurement}
            newMeasurement={newMeasurement}
            savedPhotoUrls={savedPhotoUrls}
            photoPreviews={photoPreviews}
            isSaving={isSaving}
            onCopyLast={handleCopyLast}
            onInputChange={handleInputChange}
            onPhotoChange={handlePhotoChange}
            onRemovePhoto={removePhoto}
            onRemoveSavedPhoto={removeSavedPhoto}
            onSave={handleSave}
            renderChange={renderChange}
          />
        ))}

      {/* ── Recent Measurements Panel ── */}
      <AnimatePresence>
        {selectedClient && (
          <MeasurementEntryRecentPanel
            selectedClient={selectedClient}
            loadingRecent={loadingRecent}
            recentMeasurements={recentMeasurements}
            onSelectMeasurement={setDetailMeasurement}
          />
        )}
      </AnimatePresence>

      {/* ── 3D Progress Graph Section ── */}
      <AnimatePresence>
        {selectedClient && (
          <MeasurementEntryProgressCharts
            stats={stats}
            trendData={trendData}
            radarData={radarData}
          />
        )}
      </AnimatePresence>

      {/* ── Pain & Injury Body Map ── */}
      {selectedClient && (
        <motion.div variants={itemVariants}>
          <Suspense fallback={<BodyText>Loading body map...</BodyText>}>
            <BodyMap userId={Number(selectedClient.id)} />
          </Suspense>
        </motion.div>
      )}

      {/* ── Measurement Detail Modal ── */}
      <MeasurementEntryDetailModal
        detailMeasurement={detailMeasurement}
        onClose={() => setDetailMeasurement(null)}
      />

    </PageWrapper>
  );
};

export default MeasurementEntry;
