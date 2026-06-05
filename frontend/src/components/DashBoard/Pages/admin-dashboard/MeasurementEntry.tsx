import React, { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Copy, TrendingUp, TrendingDown, UploadCloud, X, Scale, Ruler, Activity } from 'lucide-react';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryLegend,
  VictoryPolarAxis,
} from 'victory';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';
import {
  BODY_FAT_LINE_STYLE,
  CHART_ANIMATION,
  CHART_AXIS_STYLE,
  DEPENDENT_AXIS_STYLE,
  LEGEND_STYLE,
  RADAR_AXIS_STYLE,
  RADAR_CURRENT_AREA_STYLE,
  RADAR_DEPENDENT_AXIS_STYLE,
  RADAR_FIRST_AREA_STYLE,
  RADAR_LABEL_MAP,
  TREND_CHART_PADDING,
  VICTORY_TOOLTIP_FLYOUT_STYLE,
  VICTORY_TOOLTIP_STYLE,
  WAIST_LINE_STYLE,
  WEIGHT_AREA_STYLE,
  containerVariants,
  itemVariants,
  measurementFields,
  negativeIsBetter,
  victoryElement,
} from './MeasurementEntry.config';
import type {
  BodyMeasurement,
  Client,
  MeasurementEntryProps,
  MeasurementMilestone,
  MeasurementStats,
  RadarDatum,
  RadarMeasurementKey,
  RawClient,
  RecentMeasurement,
} from './MeasurementEntry.types';
import {
  AccentStat,
  BodyText,
  CenteredStatsRow,
  ChangeCenter,
  DarkPanel,
  FieldLabel,
  FlexRow,
  FlexStack,
  GlassPanel,
  HeaderRow,
  MeasurementGrid,
  PageWrapper,
  PhotoGrid,
  ResponsiveGrid,
  SaveWrapper,
  SectionTitle,
  Spinner,
  SubsectionTitle,
} from './MeasurementEntry.baseStyles';
import {
  AutocompleteWrapper,
  ChangeChip,
  ClearClientButton,
  DropdownItem,
  DropdownList,
  EmbeddedClientBadge,
  InputAdornmentSpan,
  InputWrapper,
  ListPrimary,
  ListSecondary,
  MeasurementList,
  MeasurementListItem,
  OutlinedButton,
  RemovePhotoButton,
  StyledInput,
  StyledLabel,
  TightSubsectionTitle,
  UploadZone,
} from './MeasurementEntry.formStyles';
import {
  DetailCell,
  DetailGrid,
  DetailLabel,
  DetailPhotoGrid,
  DetailUnit,
  DetailValue,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  ModalSection,
  PhotoPreviewWrapper,
  TightSectionTitle,
} from './MeasurementEntry.modalStyles';

const BodyMap = React.lazy(() => import('../../../BodyMap'));

// ─── Styled Components ──────────────────────────────────────────────────────────

// ─── Input / Form Components ────────────────────────────────────────────────────

// ─── Autocomplete / Searchable Select ───────────────────────────────────────────

// ─── Button Components ──────────────────────────────────────────────────────────

// ─── Chip Components ────────────────────────────────────────────────────────────

// ─── Photo Preview ──────────────────────────────────────────────────────────────

// ─── 3D Progress Graph Styled Components ────────────────────────────────────────

const ProgressGraphSection = styled(motion.div)`
  margin-bottom: 24px;
`;

const HeroMetricGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  margin-bottom: 24px;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const HeroMetricCard = styled(motion.div)<{ $positive?: boolean }>`
  padding: 20px;
  background: rgba(30, 41, 59, 0.7);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.3)' : 'rgba(139, 92, 246, 0.15)'};
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${({ $positive }) =>
      $positive
        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, transparent 60%)'
        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, transparent 60%)'};
    pointer-events: none;
  }
`;

const HeroMetricLabel = styled.div`
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

const HeroMetricValue = styled.div<{ $positive?: boolean }>`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  line-height: 1.2;

  @media (min-width: 768px) {
    font-size: 2.2rem;
  }
`;

const HeroMetricUnit = styled.span`
  font-size: 0.85rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  margin-left: 4px;

  @media (max-width: 430px) { font-size: 0.875rem; }
`;

const HeroMetricIcon = styled.div<{ $positive?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $positive }) =>
    $positive ? 'rgba(76, 175, 80, 0.15)' : 'rgba(139, 92, 246, 0.1)'};
  color: ${({ $positive }) => ($positive ? '#4caf50' : '#8B5CF6')};
  margin-bottom: 8px;
`;

const ChartWrapper3D = styled(motion.div)`
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  margin-bottom: 24px;
  perspective: 1200px;

  & > div {
    transform: rotateX(5deg);
    transform-origin: center bottom;
    transition: transform 0.4s ease;
  }

  &:hover > div {
    transform: rotateX(0deg);
  }
`;

const ChartTitle3D = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChartRow = styled.div`
  display: grid;
  gap: clamp(12px, 3vw, 24px);
  grid-template-columns: 1fr;
  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
`;

const _CustomTooltipBox = styled.div`
  background: rgba(0, 32, 96, 0.95);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 10px;
  padding: 12px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.05);

  .tooltip-label {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.5);
    margin-bottom: 8px;
    font-weight: 500;
  }

  .tooltip-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #fff;
    padding: 2px 0;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
  }
`;

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

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  // ─── Chart Data Memos ──────────────────────────────────────────────────────
  const trendData = useMemo(() => {
    if (recentMeasurements.length < 2) return [];
    return [...recentMeasurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .map(m => ({
        date: new Date(m.measurementDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight || null,
        bodyFat: m.bodyFatPercentage || null,
        waist: m.naturalWaist || null,
      }));
  }, [recentMeasurements]);

  const radarData = useMemo<RadarDatum[]>(() => {
    if (recentMeasurements.length < 2) return [];
    const sorted = [...recentMeasurements]
      .sort((a, b) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime());
    const first = sorted[0];
    const latest = sorted[sorted.length - 1];
    const fields: readonly RadarMeasurementKey[] = ['neck', 'shoulders', 'chest', 'rightBicep', 'naturalWaist', 'hips', 'rightThigh', 'rightCalf'];
    return fields
      .map(f => ({
        metric: RADAR_LABEL_MAP[f],
        first: first[f] || 0,
        current: latest[f] || 0,
      }))
      .filter(d => d.first > 0 || d.current > 0);
  }, [recentMeasurements]);

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
        const mapped = (Array.isArray(rawClients) ? rawClients : []).map((c: RawClient) => ({
          id: String(c.id),
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || `Client ${c.id}`,
        }));
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
    const prevValue = latestMeasurement?.[field] as number | undefined;
    const newValue = newMeasurement?.[field] as number | undefined;

    if (prevValue === undefined || newValue === undefined || isNaN(prevValue) || isNaN(newValue)) {
      return <ChangeChip>N/A</ChangeChip>;
    }

    const change = newValue - prevValue;
    const isGood = negativeIsBetter.includes(field) ? change < 0 : change > 0;

    if (change === 0) {
      return <ChangeChip>&rarr; 0.0</ChangeChip>;
    }

    return (
      <ChangeChip $variant={isGood ? 'success' : 'error'}>
        {isGood ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
        {change > 0 ? '+' : ''}
        {change.toFixed(2)}
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
          <motion.div variants={itemVariants}>
            {/* Measurement Fields */}
            <GlassPanel>
              <HeaderRow>
                <TightSubsectionTitle>
                  New Measurements for {selectedClient.name}
                </TightSubsectionTitle>
                <OutlinedButton
                  onClick={handleCopyLast}
                  disabled={!latestMeasurement}
                >
                  <Copy size={16} />
                  Copy from Last
                </OutlinedButton>
              </HeaderRow>

              <MeasurementGrid>
                {measurementFields.map(({ key, label }) => (
                  <DarkPanel key={key}>
                    <FieldLabel>{label}</FieldLabel>
                    <FlexStack $gap={12} $field>
                      {/* Previous value */}
                      <InputWrapper>
                        <StyledLabel>Previous</StyledLabel>
                        <StyledInput
                          type="text"
                          value={latestMeasurement?.[key] ?? 'N/A'}
                          disabled
                        />
                      </InputWrapper>

                      {/* New value */}
                      <InputWrapper>
                        <StyledLabel>New</StyledLabel>
                        <StyledInput
                          type="number"
                          value={newMeasurement[key] ?? ''}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          $hasAdornment
                        />
                        <InputAdornmentSpan>
                          {key === 'weight'
                            ? newMeasurement.weightUnit
                            : key === 'bodyFatPercentage' || key === 'muscleMassPercentage'
                              ? '%'
                              : newMeasurement.circumferenceUnit}
                        </InputAdornmentSpan>
                      </InputWrapper>

                      {/* Change indicator */}
                      <ChangeCenter>{renderChange(key)}</ChangeCenter>
                    </FlexStack>
                  </DarkPanel>
                ))}
              </MeasurementGrid>
            </GlassPanel>

            {/* Progress Photos */}
            <GlassPanel>
              <SubsectionTitle>Progress Photos</SubsectionTitle>
              <PhotoGrid>
                {savedPhotoUrls.map((url, index) => (
                  <PhotoPreviewWrapper key={`saved-${index}`}>
                    <img src={url} alt={`Saved ${index + 1}`} />
                    <RemovePhotoButton onClick={() => removeSavedPhoto(index)}>
                      <X size={16} color="white" />
                    </RemovePhotoButton>
                  </PhotoPreviewWrapper>
                ))}
                {photoPreviews.map((previewUrl, index) => (
                  <PhotoPreviewWrapper key={`new-${index}`}>
                    <img src={previewUrl} alt={`Preview ${index + 1}`} />
                    <RemovePhotoButton onClick={() => removePhoto(index)}>
                      <X size={16} color="white" />
                    </RemovePhotoButton>
                  </PhotoPreviewWrapper>
                ))}
                <UploadZone>
                  <UploadCloud size={24} />
                  Upload JPEG
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/jpeg,.jpg,.jpeg"
                    onChange={handlePhotoChange}
                  />
                </UploadZone>
              </PhotoGrid>
            </GlassPanel>

            {/* Save Button */}
            <SaveWrapper>
              <GlowButton
                text="Save Measurements"
                theme="emerald"
                leftIcon={<Save />}
                onClick={handleSave}
                isLoading={isSaving}
              />
            </SaveWrapper>
          </motion.div>
        ))}

      {/* ── Recent Measurements Panel ── */}
      <AnimatePresence>
        {selectedClient && (
          <GlassPanel
            as={motion.div}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <SubsectionTitle>
              Recent Measurements for {selectedClient.name}
            </SubsectionTitle>
            {loadingRecent ? (
              <BodyText>Loading recent measurements...</BodyText>
            ) : recentMeasurements.length > 0 ? (
              <MeasurementList>
                {recentMeasurements.map((measurement) => (
                  <MeasurementListItem
                    key={measurement.id}
                    type="button"
                    onClick={() => setDetailMeasurement(measurement)}
                  >
                    <ListPrimary>
                      {new Date(measurement.measurementDate).toLocaleDateString()}
                      {measurement.weight ? ` — ${measurement.weight} lbs` : ''}
                    </ListPrimary>
                    <ListSecondary>
                      {[
                        measurement.bodyFatPercentage && `Body Fat: ${measurement.bodyFatPercentage}%`,
                        measurement.chest && `Chest: ${measurement.chest}"`,
                        measurement.naturalWaist && `Waist: ${measurement.naturalWaist}"`,
                        measurement.hips && `Hips: ${measurement.hips}"`,
                      ].filter(Boolean).join(' · ') || 'Click to view details'}
                    </ListSecondary>
                  </MeasurementListItem>
                ))}
              </MeasurementList>
            ) : (
              <BodyText>No recent measurements found for this client.</BodyText>
            )}
          </GlassPanel>
        )}
      </AnimatePresence>

      {/* ── 3D Progress Graph Section ── */}
      <AnimatePresence>
        {selectedClient && trendData.length >= 2 && (
          <ProgressGraphSection
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <GlassPanel>
              <SectionTitle>Progress at a Glance</SectionTitle>

              {/* Hero Metric Cards */}
              {stats?.totalChange && (
                <HeroMetricGrid>
                  {[
                    { label: 'Weight Change', value: stats.totalChange.weight, unit: 'lbs', Icon: Scale },
                    { label: 'Body Fat Change', value: stats.totalChange.bodyFat, unit: '%', Icon: Activity },
                    { label: 'Waist Change', value: stats.totalChange.waist, unit: 'in', Icon: Ruler },
                  ].map(({ label, value, unit, Icon }) => {
                    const numVal = value !== null && value !== undefined ? Number(value) : null;
                    const isPositiveChange = numVal !== null && numVal < 0;
                    return (
                      <HeroMetricCard
                        key={label}
                        $positive={isPositiveChange}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <HeroMetricIcon $positive={isPositiveChange}>
                          <Icon size={18} />
                        </HeroMetricIcon>
                        <HeroMetricLabel>{label}</HeroMetricLabel>
                        <HeroMetricValue $positive={isPositiveChange}>
                          {numVal !== null ? (
                            <>
                              {numVal > 0 ? '+' : ''}{numVal.toFixed(1)}
                              <HeroMetricUnit>{unit}</HeroMetricUnit>
                            </>
                          ) : '—'}
                        </HeroMetricValue>
                      </HeroMetricCard>
                    );
                  })}
                </HeroMetricGrid>
              )}

              {/* Charts Row: Area + Radar side by side on desktop */}
              <ChartRow>
                {/* 3D Area Chart — Trend Over Time */}
                <ChartWrapper3D>
                  <div>
                    <ChartTitle3D>Trend Over Time</ChartTitle3D>
                    <VictoryChart
                      height={300}
                      padding={TREND_CHART_PADDING}
                      animate={CHART_ANIMATION}
                      containerComponent={
                        <VictoryVoronoiContainer
                          labels={({ datum }) => `${datum.date}\nWeight: ${datum.weight?.toFixed(1) ?? '—'} lbs\nBody Fat: ${datum.bodyFat?.toFixed(1) ?? '—'}%\nWaist: ${datum.waist?.toFixed(1) ?? '—'} in`}
                          labelComponent={
                            victoryElement(VictoryTooltip, {
                              flyoutStyle: VICTORY_TOOLTIP_FLYOUT_STYLE,
                              style: VICTORY_TOOLTIP_STYLE,
                              cornerRadius: 8,
                            })
                          }
                        />
                      }
                    >
                      {victoryElement(VictoryAxis, { style: CHART_AXIS_STYLE })}
                      {victoryElement(VictoryAxis, { dependentAxis: true, label: 'lbs / in', style: DEPENDENT_AXIS_STYLE })}
                      {victoryElement(VictoryArea, { data: trendData, x: 'date', y: 'weight', style: WEIGHT_AREA_STYLE })}
                      {victoryElement(VictoryLine, { data: trendData, x: 'date', y: 'bodyFat', style: BODY_FAT_LINE_STYLE })}
                      {victoryElement(VictoryLine, { data: trendData, x: 'date', y: 'waist', style: WAIST_LINE_STYLE })}
                    </VictoryChart>
                    {victoryElement(VictoryLegend, {
                      orientation: 'horizontal',
                      gutter: 20,
                      height: 30,
                      style: LEGEND_STYLE,
                      colorScale: ['#8B5CF6', '#8B5CF6', '#4ECDC4'],
                      data: [
                        { name: 'Weight (lbs)' },
                        { name: 'Body Fat (%)' },
                        { name: 'Waist (in)' },
                      ],
                    })}
                  </div>
                </ChartWrapper3D>

                {/* Radar Chart — Body Shape Comparison */}
                {radarData.length >= 3 && (
                  <ChartWrapper3D>
                    <div>
                      <ChartTitle3D>Body Shape: First vs Now</ChartTitle3D>
                      <VictoryChart
                        polar
                        height={300}
                        animate={CHART_ANIMATION}
                      >
                        {victoryElement(VictoryPolarAxis, {
                          tickValues: radarData.map((_, i) => i),
                          tickFormat: radarData.map((d) => d.metric),
                          style: RADAR_AXIS_STYLE,
                        })}
                        {victoryElement(VictoryPolarAxis, {
                          dependentAxis: true,
                          style: RADAR_DEPENDENT_AXIS_STYLE,
                        })}
                        {victoryElement(VictoryArea, {
                          data: radarData.map((d, i) => ({ x: i, y: d.first })),
                          style: RADAR_FIRST_AREA_STYLE,
                        })}
                        {victoryElement(VictoryArea, {
                          data: radarData.map((d, i) => ({ x: i, y: d.current })),
                          style: RADAR_CURRENT_AREA_STYLE,
                        })}
                      </VictoryChart>
                      {victoryElement(VictoryLegend, {
                        orientation: 'horizontal',
                        gutter: 20,
                        height: 30,
                        style: LEGEND_STYLE,
                        colorScale: ['#8B5CF6', '#50A0F0'],
                        data: [{ name: 'First' }, { name: 'Current' }],
                      })}
                    </div>
                  </ChartWrapper3D>
                )}
              </ChartRow>

              {/* Summary stats */}
              {stats && (
                <CenteredStatsRow $gap={24} $centerWrap>
                  <BodyText>
                    <AccentStat>{stats.totalMeasurements}</AccentStat> measurements over{' '}
                    <AccentStat>{stats.daysSinceStart}</AccentStat> days
                  </BodyText>
                </CenteredStatsRow>
              )}
            </GlassPanel>
          </ProgressGraphSection>
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
      <AnimatePresence>
        {detailMeasurement && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ModalContent
              role="dialog"
              aria-modal="true"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <ModalHeader>
                <div>
                  <TightSectionTitle>
                    {new Date(detailMeasurement.measurementDate).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </TightSectionTitle>
                  {detailMeasurement.recorder && (
                    <BodyText>
                      Recorded by {detailMeasurement.recorder.firstName || detailMeasurement.recorder.username || 'Trainer'}
                    </BodyText>
                  )}
                </div>
                <ModalCloseButton onClick={() => setDetailMeasurement(null)}>
                  <X size={18} />
                </ModalCloseButton>
              </ModalHeader>

              <DetailGrid>
                {measurementFields.map(({ key, label }) => {
                  const value = detailMeasurement[key];
                  if (value === undefined || value === null) return null;
                  const unit = key === 'weight'
                    ? detailMeasurement.weightUnit || 'lbs'
                    : key === 'bodyFatPercentage' || key === 'muscleMassPercentage'
                      ? '%'
                      : detailMeasurement.circumferenceUnit || 'in';
                  return (
                    <DetailCell key={key}>
                      <DetailLabel>{label}</DetailLabel>
                      <DetailValue>
                        {typeof value === 'number' ? value.toFixed(1) : value}
                        <DetailUnit>{unit}</DetailUnit>
                      </DetailValue>
                    </DetailCell>
                  );
                })}
              </DetailGrid>

              {detailMeasurement.notes && (
                <ModalSection>
                  <SubsectionTitle>Notes</SubsectionTitle>
                  <BodyText>{detailMeasurement.notes}</BodyText>
                </ModalSection>
              )}

              {detailMeasurement.photoUrls && detailMeasurement.photoUrls.length > 0 && (
                <ModalSection>
                  <SubsectionTitle>Progress Photos</SubsectionTitle>
                  <DetailPhotoGrid>
                    {detailMeasurement.photoUrls.map((url, i) => (
                      <PhotoPreviewWrapper key={i}>
                        <img src={url} alt={`Progress ${i + 1}`} />
                      </PhotoPreviewWrapper>
                    ))}
                  </DetailPhotoGrid>
                </ModalSection>
              )}
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default MeasurementEntry;
