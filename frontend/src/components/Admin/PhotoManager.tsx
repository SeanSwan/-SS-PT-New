/**
 * PhotoManager
 * ============
 * Crystalline Swan themed admin UI for managing client progress photos.
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClientPhotos } from '../../hooks/useClientPhotos';
import apiService from '../../services/api.service';
import AdminPhotoConfirmDialog, { type AdminPhotoConfirmRequest } from './AdminPhotoConfirmDialog';
import PhotoManagerView from './PhotoManagerView';

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
  const [confirmRequest, setConfirmRequest] = useState<AdminPhotoConfirmRequest | null>(null);

  const beforeAfter = useMemo(() => {
    const candidates = filterType === 'all'
      ? photos.filter((photo) => photo.type === 'front')
      : photos;

    if (candidates.length < 2) return null;

    const sorted = [...candidates].sort((a, b) => {
      const aTime = new Date(a.takenAt || a.uploadedAt).getTime();
      const bTime = new Date(b.takenAt || b.uploadedAt).getTime();
      return aTime - bTime;
    });

    return {
      before: sorted[0],
      after: sorted[sorted.length - 1],
    };
  }, [filterType, photos]);

  const formatDate = (value?: string) => {
    if (!value) return 'Unknown';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
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
      const payload = {
        url: photoUrl.trim(),
        storageKey: storageKey.trim(),
        photoType,
        takenAt: takenAt || undefined,
        visibility,
      };

      const response = await apiService.post(`/api/photos/${numericClientId}`, payload);
      const result = response.data;

      if (result?.success === false) {
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

  const deletePhoto = async (clientId: number, photoId: number) => {
    setFormError(null);
    setSuccessMessage(null);

    try {
      const response = await apiService.delete(`/api/photos/${clientId}/${photoId}`);
      const result = response.data;

      if (result?.success === false) {
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

  const handleDelete = (photoId: number) => {
    if (!numericClientId) return;
    const clientId = numericClientId;

    setConfirmRequest({
      title: 'Delete progress photo?',
      message: 'This removes the selected client progress photo from the admin library.',
      confirmLabel: 'Delete progress photo',
      cancelLabel: 'Keep photo',
      tone: 'danger',
      onConfirm: () => deletePhoto(clientId, photoId),
    });
  };

  return (
    <>
      <PhotoManagerView
        clientIdInput={clientIdInput}
        hasValidClientId={Boolean(numericClientId)}
        filterType={filterType}
        photos={photos}
        isLoading={isLoading}
        loadError={loadError}
        beforeAfter={beforeAfter}
        photoUrl={photoUrl}
        storageKey={storageKey}
        photoType={photoType}
        visibility={visibility}
        takenAt={takenAt}
        formError={formError}
        successMessage={successMessage}
        isSubmitting={isSubmitting}
        setClientIdInput={setClientIdInput}
        setFilterType={setFilterType}
        setPhotoUrl={setPhotoUrl}
        setStorageKey={setStorageKey}
        setPhotoType={setPhotoType}
        setVisibility={setVisibility}
        setTakenAt={setTakenAt}
        formatDate={formatDate}
        handleUpload={handleUpload}
        handleDelete={handleDelete}
        refetch={refetch}
      />
      <AdminPhotoConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
  );
};

export default PhotoManager;
