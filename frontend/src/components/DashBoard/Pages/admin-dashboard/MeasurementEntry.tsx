import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Copy, TrendingUp, TrendingDown, UploadCloud, X } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';

// ─── Interfaces (unchanged from blueprint) ─────────────────────────────────────
interface Client { id: string; name: string; }
interface BodyMeasurement {
  id?: string;
  userId: string;
  measurementDate: string;
  weight?: number;
  weightUnit?: 'lbs' | 'kg';
  bodyFatPercentage?: number;
  muscleMassPercentage?: number;
  bmi?: number;
  circumferenceUnit?: 'inches' | 'cm';
  neck?: number;
  shoulders?: number;
  chest?: number;
  rightBicep?: number;
  leftBicep?: number;
  naturalWaist?: number;
  hips?: number;
  rightThigh?: number;
  leftThigh?: number;
  rightCalf?: number;
  leftCalf?: number;
  notes?: string;
  photoUrls?: string[];
}
interface RecentMeasurement {
  id: string;
  measurementDate: string;
  weight?: number;
  bodyFatPercentage?: number;
  naturalWaist?: number;
}

// ─── Framer Motion Variants ─────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ─── Measurement Field Definitions ──────────────────────────────────────────────
const measurementFields: { key: keyof BodyMeasurement; label: string }[] = [
  { key: 'weight', label: 'Weight' },
  { key: 'bodyFatPercentage', label: 'Body Fat %' },
  { key: 'muscleMassPercentage', label: 'Muscle Mass %' },
  { key: 'neck', label: 'Neck' },
  { key: 'chest', label: 'Chest' },
  { key: 'naturalWaist', label: 'Natural Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'rightBicep', label: 'Right Bicep' },
  { key: 'leftBicep', label: 'Left Bicep' },
  { key: 'rightThigh', label: 'Right Thigh' },
  { key: 'leftThigh', label: 'Left Thigh' },
];

const negativeIsBetter = ['weight', 'bodyFatPercentage', 'naturalWaist', 'hips', 'neck'];

// ─── Keyframe Animations ────────────────────────────────────────────────────────
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// ─── Styled Components ──────────────────────────────────────────────────────────

const PageWrapper = styled(motion.div)`
  padding: 16px;
  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const GlassPanel = styled(motion.div)`
  padding: 16px;
  margin-bottom: 24px;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const DarkPanel = styled.div`
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const SectionTitle = styled.h2`
  font-size: 1.4rem;
  font-weight: 700;
  color: #00FFFF;
  margin: 0 0 16px 0;
`;

const SubsectionTitle = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: rgba(130, 200, 255, 0.9);
  margin: 0 0 12px 0;
`;

const FieldLabel = styled.span`
  font-size: 0.95rem;
  text-transform: capitalize;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  margin-bottom: 4px;
`;

const BodyText = styled.p`
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: 0.9rem;
`;

const ResponsiveGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const MeasurementGrid = styled.div`
  display: grid;
  gap: 24px;
  grid-template-columns: 1fr;
  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 1024px) {
    grid-template-columns: 1fr 1fr 1fr;
  }
`;

const PhotoGrid = styled.div`
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr 1fr;
  @media (min-width: 430px) {
    grid-template-columns: 1fr 1fr;
  }
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const FlexRow = styled.div<{ $gap?: number }>`
  display: flex;
  gap: ${({ $gap }) => $gap ?? 8}px;
  align-items: center;
`;

const FlexStack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 8}px;
`;

const HeaderRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

// ─── Input / Form Components ────────────────────────────────────────────────────

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const StyledLabel = styled.label`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.55);
  padding-left: 2px;
`;

const StyledInput = styled.input<{ $hasAdornment?: boolean }>`
  width: 100%;
  padding: 10px 12px;
  padding-right: ${({ $hasAdornment }) => ($hasAdornment ? '60px' : '12px')};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #00FFFF;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  /* Remove number spinners */
  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const InputAdornmentSpan = styled.span`
  position: absolute;
  right: 12px;
  bottom: 10px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8rem;
  pointer-events: none;
`;

// ─── Autocomplete / Searchable Select ───────────────────────────────────────────

const AutocompleteWrapper = styled.div`
  position: relative;
  width: 100%;
`;

const DropdownList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 200px;
  overflow-y: auto;
  background: rgba(20, 27, 40, 0.98);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 0 0 8px 8px;
  z-index: 50;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const DropdownItem = styled.div<{ $highlighted?: boolean }>`
  padding: 10px 14px;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  background: ${({ $highlighted }) =>
    $highlighted ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  transition: background 0.15s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

// ─── Button Components ──────────────────────────────────────────────────────────

const OutlinedButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  min-height: 44px;
  background: transparent;
  color: #00FFFF;
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: rgba(0, 255, 255, 0.08);
    border-color: #00FFFF;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const RemovePhotoButton = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
  padding: 0;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const UploadZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 120px;
  height: 100%;
  border: 2px dashed rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: rgba(0, 255, 255, 0.7);
  background: transparent;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:hover {
    border-color: #00FFFF;
    background: rgba(0, 255, 255, 0.04);
  }
`;

// ─── Chip Components ────────────────────────────────────────────────────────────

const ChangeChip = styled.span<{ $variant?: 'success' | 'error' | 'default' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'success'
        ? '#4caf50'
        : $variant === 'error'
          ? '#f44336'
          : 'rgba(255, 255, 255, 0.3)'};
  color: ${({ $variant }) =>
    $variant === 'success'
      ? '#4caf50'
      : $variant === 'error'
        ? '#f44336'
        : 'rgba(255, 255, 255, 0.7)'};
`;

// ─── List Components ────────────────────────────────────────────────────────────

const MeasurementList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const MeasurementListItem = styled.li`
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;

const ListPrimary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  font-weight: 500;
`;

const ListSecondary = styled.span`
  display: block;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
  margin-top: 2px;
`;

// ─── Spinner Component ──────────────────────────────────────────────────────────

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 255, 255, 0.15);
  border-top-color: #00FFFF;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin: 24px auto;
`;

// ─── Photo Preview ──────────────────────────────────────────────────────────────

const PhotoPreviewWrapper = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 8px;
  }
`;

const SaveWrapper = styled.div`
  margin-top: 24px;
  text-align: right;
`;

const ChangeCenter = styled.div`
  text-align: center;
  padding-top: 8px;
`;

// ═════════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════════

const MeasurementEntry: React.FC = () => {
  const { clientId: routeClientId } = useParams<{ clientId?: string }>();
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

  // Autocomplete state
  const [clientSearch, setClientSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

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
        const mapped = (Array.isArray(rawClients) ? rawClients : []).map((c: any) => ({
          id: String(c.id),
          name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email || `Client ${c.id}`,
        }));
        setClients(mapped);
        // Auto-select client from route param
        if (routeClientId) {
          const match = mapped.find((c: Client) => c.id === routeClientId);
          if (match) {
            setSelectedClient(match);
            setClientSearch(match.name);
          }
        }
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load clients.', variant: 'destructive' });
      }
    };
    fetchClients();
  }, [toast, routeClientId]);

  useEffect(() => {
    if (selectedClient) {
      const fetchLatest = async () => {
        setIsLoading(true);
        try {
          const response = await apiService.get(`/api/measurements/${selectedClient.id}/latest`);
          setLatestMeasurement(response.data);
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
          const response = await apiService.get(`/api/measurements/${selectedClient.id}?limit=3`);
          setRecentMeasurements(response.data?.measurements || []);
        } catch (error) {
          console.error('Failed to load recent measurements', error);
          setRecentMeasurements([]);
        } finally {
          setLoadingRecent(false);
        }
      };

      fetchLatest();
      fetchRecent();
    } else {
      setLatestMeasurement(null);
      setNewMeasurement({});
      setRecentMeasurements([]);
      setPhotoFiles([]);
      setPhotoPreviews([]);
    }
  }, [selectedClient, toast]);

  const handleCopyLast = () => {
    if (!latestMeasurement) return;
    setNewMeasurement({
      ...latestMeasurement,
      id: undefined,
      measurementDate: new Date().toISOString().split('T')[0],
      notes: '',
      photoUrls: latestMeasurement.photoUrls || [],
    });
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

  const handleSave = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    try {
      let uploadedPhotoUrls: string[] = newMeasurement.photoUrls || [];

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
      if (response.data?.milestonesAchieved?.length > 0) {
        response.data.milestonesAchieved.forEach((milestone: any) => {
          toast({ title: 'Milestone!', description: milestone.celebrationMessage, variant: 'success' });
        });
      }
      setSelectedClient(null);
      setClientSearch('');
      setPhotoFiles([]);
      setPhotoPreviews([]);
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
          {/* Searchable Client Select */}
          <AutocompleteWrapper ref={autocompleteRef}>
            <InputWrapper>
              <StyledLabel>Select Client</StyledLabel>
              <FlexRow $gap={0} style={{ position: 'relative' }}>
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
                  <InputAdornmentSpan
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={handleClearClient}
                  >
                    <X size={16} />
                  </InputAdornmentSpan>
                )}
              </FlexRow>
            </InputWrapper>
            {showDropdown && clientSearch.length > 0 && (
              <DropdownList>
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <DropdownItem
                      key={client.id}
                      $highlighted={selectedClient?.id === client.id}
                      onClick={() => handleSelectClient(client)}
                    >
                      {client.name}
                    </DropdownItem>
                  ))
                ) : (
                  <DropdownItem>No clients found</DropdownItem>
                )}
              </DropdownList>
            )}
          </AutocompleteWrapper>

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
                  <MeasurementListItem key={measurement.id}>
                    <ListPrimary>
                      Date: {new Date(measurement.measurementDate).toLocaleDateString()}
                    </ListPrimary>
                    <ListSecondary>
                      Weight: {measurement.weight || 'N/A'} lbs, Waist:{' '}
                      {measurement.naturalWaist || 'N/A'}&quot;, Body Fat:{' '}
                      {measurement.bodyFatPercentage || 'N/A'}%
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

      {/* ── Measurement Entry Form ── */}
      {selectedClient &&
        (isLoading ? (
          <Spinner />
        ) : (
          <motion.div variants={itemVariants}>
            {/* Measurement Fields */}
            <GlassPanel>
              <HeaderRow>
                <SubsectionTitle style={{ margin: 0 }}>
                  New Measurements for {selectedClient.name}
                </SubsectionTitle>
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
                    <FlexStack $gap={12} style={{ marginTop: 12, flex: 1 }}>
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
                {photoPreviews.map((previewUrl, index) => (
                  <PhotoPreviewWrapper key={index}>
                    <img src={previewUrl} alt={`Preview ${index + 1}`} />
                    <RemovePhotoButton onClick={() => removePhoto(index)}>
                      <X size={16} color="white" />
                    </RemovePhotoButton>
                  </PhotoPreviewWrapper>
                ))}
                <UploadZone>
                  <UploadCloud size={24} />
                  Upload
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
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
    </PageWrapper>
  );
};

export default MeasurementEntry;
