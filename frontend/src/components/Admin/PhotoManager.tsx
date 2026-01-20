/**
 * PhotoManager
 * ============
 * Galaxy-Swan themed admin UI for managing client progress photos.
 */

import React, { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { ImagePlus, Trash2 } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  ErrorText,
  HelperText,
  Label,
  FormField,
  StyledInput,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  CustomSelect
} from '../UniversalMasterSchedule/ui';
import { useClientPhotos } from '../../hooks/useClientPhotos';

const photoTypeOptions = [
  { value: 'front', label: 'Front' },
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
  { value: 'other', label: 'Other' }
];

const visibilityOptions = [
  { value: 'private', label: 'Private (client only)' },
  { value: 'public', label: 'Public (client + trainer)' },
  { value: 'trainer_only', label: 'Trainer Only' },
  { value: 'admin_only', label: 'Admin Only' }
];

const PhotoManager: React.FC = () => {
  const { clientId: clientIdParam } = useParams();
  const [clientIdInput, setClientIdInput] = useState(clientIdParam || '');
  const numericClientId = useMemo(() => {
    const parsed = Number(clientIdInput);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [clientIdInput]);

  const [filterType, setFilterType] = useState('all');
  const { data: photos, isLoading, error: loadError, refetch } = useClientPhotos(
    numericClientId,
    filterType === 'all' ? undefined : filterType
  );

  const [photoUrl, setPhotoUrl] = useState('');
  const [storageKey, setStorageKey] = useState('');
  const [photoType, setPhotoType] = useState('front');
  const [visibility, setVisibility] = useState('private');
  const [takenAt, setTakenAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const beforeAfter = useMemo(() => {
    const candidates = filterType === 'all'
      ? photos.filter((photo) => photo.type === 'front')
      : photos;

    if (candidates.length < 2) {
      return null;
    }

    const sorted = [...candidates].sort((a, b) => {
      const aTime = new Date(a.takenAt || a.uploadedAt).getTime();
      const bTime = new Date(b.takenAt || b.uploadedAt).getTime();
      return aTime - bTime;
    });

    return {
      before: sorted[0],
      after: sorted[sorted.length - 1]
    };
  }, [filterType, photos]);

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString();
  };

  const handleUpload = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!numericClientId) {
      setFormError('Valid client ID is required.');
      return;
    }

    if (!photoUrl.trim() || !storageKey.trim()) {
      setFormError('Photo URL and storage key are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to upload photos.');
        return;
      }

      const payload = {
        url: photoUrl.trim(),
        storageKey: storageKey.trim(),
        photoType,
        takenAt: takenAt || undefined,
        visibility
      };

      const response = await fetch(`/api/photos/${numericClientId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to upload photo.');
        return;
      }

      setPhotoUrl('');
      setStorageKey('');
      setTakenAt('');
      setSuccessMessage('Photo uploaded successfully.');
      await refetch();
    } catch (error) {
      console.error('Error uploading photo:', error);
      setFormError('Network error uploading photo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    if (!numericClientId) return;
    if (!window.confirm('Delete this photo?')) return;

    setFormError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to delete photos.');
        return;
      }

      const response = await fetch(`/api/photos/${numericClientId}/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to delete photo.');
        return;
      }

      setSuccessMessage('Photo deleted successfully.');
      await refetch();
    } catch (error) {
      console.error('Error deleting photo:', error);
      setFormError('Network error deleting photo.');
    }
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Photo Manager</PageTitle>
          <BodyText secondary>
            Upload and organize progress photos with visibility controls.
          </BodyText>
        </div>
      </HeaderRow>

      <Card>
        <CardHeader>
          <SectionTitle>Client Selection</SectionTitle>
        </CardHeader>
        <CardBody>
          <FormField>
            <Label htmlFor="photos-client-id" required>Client ID</Label>
            <StyledInput
              id="photos-client-id"
              type="number"
              value={clientIdInput}
              onChange={(event) => setClientIdInput(event.target.value)}
              placeholder="Enter client user ID"
              hasError={!numericClientId && clientIdInput.length > 0}
            />
            <HelperText>Use the numeric user ID from the client profile.</HelperText>
          </FormField>
          {loadError && <ErrorText>{loadError}</ErrorText>}
          {isLoading && <SmallText secondary>Loading photos...</SmallText>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Upload Photo</SectionTitle>
          <SecondaryButton type="button" onClick={handleUpload} disabled={isSubmitting}>
            <ImagePlus size={16} />
            {isSubmitting ? 'Uploading...' : 'Upload Photo'}
          </SecondaryButton>
        </CardHeader>
        <CardBody>
          <GridContainer columns={2} gap="1.5rem">
            <FormField>
              <Label htmlFor="photo-url" required>Photo URL</Label>
              <StyledInput
                id="photo-url"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder="https://cdn.swanstudios.com/photos/..."
              />
            </FormField>
            <FormField>
              <Label htmlFor="photo-storage-key" required>Storage Key</Label>
              <StyledInput
                id="photo-storage-key"
                value={storageKey}
                onChange={(event) => setStorageKey(event.target.value)}
                placeholder="s3://bucket/key-or-storage-id"
              />
            </FormField>
            <FormField>
              <Label htmlFor="photo-type">Photo Type</Label>
              <CustomSelect
                value={photoType}
                onChange={(value) => setPhotoType(String(value))}
                options={photoTypeOptions}
              />
            </FormField>
            <FormField>
              <Label htmlFor="photo-visibility">Visibility</Label>
              <CustomSelect
                value={visibility}
                onChange={(value) => setVisibility(String(value))}
                options={visibilityOptions}
              />
            </FormField>
            <FormField>
              <Label htmlFor="photo-taken-at">Taken Date</Label>
              <StyledInput
                id="photo-taken-at"
                type="date"
                value={takenAt}
                onChange={(event) => setTakenAt(event.target.value)}
              />
            </FormField>
          </GridContainer>
          <HelperText>Photo uploads should include a storage key for audit tracking.</HelperText>
        </CardBody>
      </Card>

      {beforeAfter && (
        <Card>
          <CardHeader>
            <SectionTitle>Before / After</SectionTitle>
          </CardHeader>
          <CardBody>
            <BeforeAfterGrid>
              <BeforeAfterCard>
                <SmallText secondary>Before</SmallText>
                <PhotoPreview src={beforeAfter.before.url} alt="Before progress" />
                <SmallText secondary>{formatDate(beforeAfter.before.takenAt)}</SmallText>
              </BeforeAfterCard>
              <BeforeAfterCard>
                <SmallText secondary>After</SmallText>
                <PhotoPreview src={beforeAfter.after.url} alt="After progress" />
                <SmallText secondary>{formatDate(beforeAfter.after.takenAt)}</SmallText>
              </BeforeAfterCard>
            </BeforeAfterGrid>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <SectionTitle>Photo Library</SectionTitle>
          <FilterRow>
            <SmallText secondary>Filter</SmallText>
            <CustomSelect
              value={filterType}
              onChange={(value) => setFilterType(String(value))}
              options={[{ value: 'all', label: 'All' }, ...photoTypeOptions]}
            />
            <OutlinedButton type="button" onClick={refetch}>
              Refresh
            </OutlinedButton>
          </FilterRow>
        </CardHeader>
        <CardBody>
          {isLoading && <SmallText secondary>Loading photos...</SmallText>}
          {!isLoading && photos.length === 0 && (
            <SmallText secondary>No photos available for this client.</SmallText>
          )}
          {photos.length > 0 && (
            <PhotoGrid>
              {photos.map((photo) => (
                <PhotoCard key={photo.id}>
                  <PhotoPreview src={photo.url} alt={`${photo.type} progress`} />
                  <PhotoMeta>
                    <div>
                      <SmallText secondary>{photo.type.toUpperCase()}</SmallText>
                      <SmallText secondary>{formatDate(photo.takenAt)}</SmallText>
                    </div>
                    <SmallText secondary>{photo.visibility}</SmallText>
                  </PhotoMeta>
                  <FlexBox justify="flex-end">
                    <OutlinedButton type="button" onClick={() => handleDelete(photo.id)}>
                      <Trash2 size={14} /> Delete
                    </OutlinedButton>
                  </FlexBox>
                </PhotoCard>
              ))}
            </PhotoGrid>
          )}
        </CardBody>
      </Card>

      {formError && <ErrorText>{formError}</ErrorText>}
      {successMessage && <SuccessText>{successMessage}</SuccessText>}
    </PageWrapper>
  );
};

export default PhotoManager;

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const FilterRow = styled(FlexBox)`
  align-items: center;
  gap: 0.75rem;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
`;

const PhotoCard = styled(Card)`
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PhotoPreview = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(0, 255, 255, 0.15);
  background: rgba(10, 10, 15, 0.6);
`;

const PhotoMeta = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const BeforeAfterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
`;

const BeforeAfterCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: #10b981;
`;
