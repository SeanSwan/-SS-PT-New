/**
 * ============================================================================
 * FILE: MeasurementEntryRecentPanel.tsx
 * PURPOSE: Recent body measurement list for the biometrics workflow.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the loading, empty, and populated recent-measurements states.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry owns the fetched records and passes selection callbacks here
 * so the active shell keeps the modal state while this file owns list rendering.
 */

import { motion } from 'framer-motion';
import { itemVariants } from './MeasurementEntry.config';
import type { Client, RecentMeasurement } from './MeasurementEntry.types';
import {
  BodyText,
  GlassPanel,
  SubsectionTitle,
} from './MeasurementEntry.baseStyles';
import {
  ListPrimary,
  ListSecondary,
  MeasurementList,
  MeasurementListItem,
} from './MeasurementEntry.formStyles';

interface MeasurementEntryRecentPanelProps {
  selectedClient: Client;
  loadingRecent: boolean;
  recentMeasurements: RecentMeasurement[];
  onSelectMeasurement: (measurement: RecentMeasurement) => void;
}

const buildMeasurementSummary = (measurement: RecentMeasurement) => (
  [
    measurement.bodyFatPercentage && `Body Fat: ${measurement.bodyFatPercentage}%`,
    measurement.chest && `Chest: ${measurement.chest}"`,
    measurement.naturalWaist && `Waist: ${measurement.naturalWaist}"`,
    measurement.hips && `Hips: ${measurement.hips}"`,
  ].filter(Boolean).join(' · ') || 'Click to view details'
);

const MeasurementEntryRecentPanel = ({
  selectedClient,
  loadingRecent,
  recentMeasurements,
  onSelectMeasurement,
}: MeasurementEntryRecentPanelProps) => (
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
            onClick={() => onSelectMeasurement(measurement)}
          >
            <ListPrimary>
              {new Date(measurement.measurementDate).toLocaleDateString()}
              {measurement.weight ? ` — ${measurement.weight} lbs` : ''}
            </ListPrimary>
            <ListSecondary>
              {buildMeasurementSummary(measurement)}
            </ListSecondary>
          </MeasurementListItem>
        ))}
      </MeasurementList>
    ) : (
      <BodyText>No recent measurements found for this client.</BodyText>
    )}
  </GlassPanel>
);

export default MeasurementEntryRecentPanel;
