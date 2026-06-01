import React from 'react';
import styled from 'styled-components';
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
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox,
  CustomSelect,
} from '../UniversalMasterSchedule/ui';
import type { ClientPhoto } from '../../hooks/useClientPhotos';
import { photoTypeOptions, visibilityOptions } from './PhotoManager.options';

interface BeforeAfterPair {
  before: ClientPhoto;
  after: ClientPhoto;
}

interface PhotoManagerViewProps {
  clientIdInput: string;
  hasValidClientId: boolean;
  filterType: string;
  photos: ClientPhoto[];
  isLoading: boolean;
  loadError: string | null;
  beforeAfter: BeforeAfterPair | null;
  photoUrl: string;
  storageKey: string;
  photoType: string;
  visibility: string;
  takenAt: string;
  formError: string | null;
  successMessage: string | null;
  isSubmitting: boolean;
  setClientIdInput: (value: string) => void;
  setFilterType: (value: string) => void;
  setPhotoUrl: (value: string) => void;
  setStorageKey: (value: string) => void;
  setPhotoType: (value: string) => void;
  setVisibility: (value: string) => void;
  setTakenAt: (value: string) => void;
  formatDate: (value?: string) => string;
  handleUpload: () => void | Promise<void>;
  handleDelete: (photoId: number) => void | Promise<void>;
  refetch: () => void | Promise<void>;
}

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
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 64%, transparent);
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
  color: var(--success, #10B981);
`;

const PhotoManagerView: React.FC<PhotoManagerViewProps> = ({
  clientIdInput,
  hasValidClientId,
  filterType,
  photos,
  isLoading,
  loadError,
  beforeAfter,
  photoUrl,
  storageKey,
  photoType,
  visibility,
  takenAt,
  formError,
  successMessage,
  isSubmitting,
  setClientIdInput,
  setFilterType,
  setPhotoUrl,
  setStorageKey,
  setPhotoType,
  setVisibility,
  setTakenAt,
  formatDate,
  handleUpload,
  handleDelete,
  refetch,
}) => (
  <PageWrapper>
    <HeaderRow>
      <div>
        <PageTitle>Photo Manager</PageTitle>
        <BodyText secondary>Upload and organize progress photos with visibility controls.</BodyText>
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
            hasError={!hasValidClientId && clientIdInput.length > 0}
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
            <StyledInput id="photo-url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://cdn.swanstudios.com/photos/..." />
          </FormField>
          <FormField>
            <Label htmlFor="photo-storage-key" required>Storage Key</Label>
            <StyledInput id="photo-storage-key" value={storageKey} onChange={(event) => setStorageKey(event.target.value)} placeholder="s3://bucket/key-or-storage-id" />
          </FormField>
          <FormField>
            <Label htmlFor="photo-type">Photo Type</Label>
            <CustomSelect value={photoType} onChange={(value) => setPhotoType(String(value))} options={photoTypeOptions} />
          </FormField>
          <FormField>
            <Label htmlFor="photo-visibility">Visibility</Label>
            <CustomSelect value={visibility} onChange={(value) => setVisibility(String(value))} options={visibilityOptions} />
          </FormField>
          <FormField>
            <Label htmlFor="photo-taken-at">Taken Date</Label>
            <StyledInput id="photo-taken-at" type="date" value={takenAt} onChange={(event) => setTakenAt(event.target.value)} />
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
          <CustomSelect value={filterType} onChange={(value) => setFilterType(String(value))} options={[{ value: 'all', label: 'All' }, ...photoTypeOptions]} />
          <OutlinedButton type="button" onClick={refetch}>Refresh</OutlinedButton>
        </FilterRow>
      </CardHeader>
      <CardBody>
        {isLoading && <SmallText secondary>Loading photos...</SmallText>}
        {!isLoading && photos.length === 0 && <SmallText secondary>No photos available for this client.</SmallText>}
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

export default PhotoManagerView;
