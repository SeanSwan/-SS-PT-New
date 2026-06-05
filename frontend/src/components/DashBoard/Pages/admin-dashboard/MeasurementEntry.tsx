import React, { Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { containerVariants, itemVariants } from './MeasurementEntry.config';
import type {
  BodyMeasurement,
  MeasurementEntryProps,
} from './MeasurementEntry.types';
import {
  BodyText,
  PageWrapper,
  Spinner,
} from './MeasurementEntry.baseStyles';
import { ChangeChip } from './MeasurementEntry.formStyles';
import { getMeasurementChange } from './MeasurementEntry.changeUtils';
import { useMeasurementEntryController } from './MeasurementEntry.controller';
import MeasurementEntryProgressCharts from './MeasurementEntryProgressCharts';
import MeasurementEntryFormPanel from './MeasurementEntryFormPanel';
import MeasurementEntryRecentPanel from './MeasurementEntryRecentPanel';
import MeasurementEntryDetailModal from './MeasurementEntryDetailModal';
import MeasurementEntryClientPanel from './MeasurementEntryClientPanel';

const BodyMap = React.lazy(() => import('../../../BodyMap'));

const MeasurementEntry: React.FC<MeasurementEntryProps> = ({
  embeddedClientId,
  embeddedClientName,
}) => {
  const {
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
  } = useMeasurementEntryController({ embeddedClientId, embeddedClientName });

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

  return (
    <PageWrapper variants={containerVariants} initial="hidden" animate="visible">
      <MeasurementEntryClientPanel
        embeddedClientId={embeddedClientId}
        embeddedClientName={embeddedClientName}
        selectedClient={selectedClient}
        clientSearch={clientSearch}
        showDropdown={showDropdown}
        filteredClients={filteredClients}
        newMeasurement={newMeasurement}
        autocompleteRef={autocompleteRef}
        onClientSearchChange={handleClientSearchChange}
        onClientFocus={() => setShowDropdown(true)}
        onClientSelect={handleSelectClient}
        onClientClear={handleClearClient}
        onMeasurementDateChange={handleMeasurementDateChange}
      />

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

      <AnimatePresence>
        {selectedClient && (
          <MeasurementEntryProgressCharts
            stats={stats}
            trendData={trendData}
            radarData={radarData}
          />
        )}
      </AnimatePresence>

      {selectedClient && (
        <motion.div variants={itemVariants}>
          <Suspense fallback={<BodyText>Loading body map...</BodyText>}>
            <BodyMap userId={Number(selectedClient.id)} />
          </Suspense>
        </motion.div>
      )}

      <MeasurementEntryDetailModal
        detailMeasurement={detailMeasurement}
        onClose={() => setDetailMeasurement(null)}
      />
    </PageWrapper>
  );
};

export default MeasurementEntry;
