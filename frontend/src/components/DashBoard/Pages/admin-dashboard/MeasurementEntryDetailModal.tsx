/**
 * ============================================================================
 * FILE: MeasurementEntryDetailModal.tsx
 * PURPOSE: Body measurement detail modal for recent biometrics entries.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a selected recent measurement with measurements, notes, and photos.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry owns which measurement is selected. This component owns the
 * modal presentation so the active shell stays focused on workflow state.
 */

import { AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { measurementFields } from './MeasurementEntry.config';
import type { RecentMeasurement } from './MeasurementEntry.types';
import { BodyText, SubsectionTitle } from './MeasurementEntry.baseStyles';
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

interface MeasurementEntryDetailModalProps {
  detailMeasurement: RecentMeasurement | null;
  onClose: () => void;
}

const getDetailUnit = (
  key: keyof RecentMeasurement,
  detailMeasurement: RecentMeasurement,
) => {
  if (key === 'weight') return detailMeasurement.weightUnit || 'lbs';
  if (key === 'bodyFatPercentage' || key === 'muscleMassPercentage') return '%';
  return detailMeasurement.circumferenceUnit || 'in';
};

const MeasurementEntryDetailModal = ({
  detailMeasurement,
  onClose,
}: MeasurementEntryDetailModalProps) => (
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
            <ModalCloseButton onClick={onClose}>
              <X size={18} />
            </ModalCloseButton>
          </ModalHeader>

          <DetailGrid>
            {measurementFields.map(({ key, label }) => {
              const value = detailMeasurement[key];
              if (value === undefined || value === null) return null;
              return (
                <DetailCell key={key}>
                  <DetailLabel>{label}</DetailLabel>
                  <DetailValue>
                    {typeof value === 'number' ? value.toFixed(1) : value}
                    <DetailUnit>{getDetailUnit(key, detailMeasurement)}</DetailUnit>
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
                {detailMeasurement.photoUrls.map((url, index) => (
                  <PhotoPreviewWrapper key={url || index}>
                    <img src={url} alt={`Progress ${index + 1}`} />
                  </PhotoPreviewWrapper>
                ))}
              </DetailPhotoGrid>
            </ModalSection>
          )}
        </ModalContent>
      </ModalOverlay>
    )}
  </AnimatePresence>
);

export default MeasurementEntryDetailModal;
