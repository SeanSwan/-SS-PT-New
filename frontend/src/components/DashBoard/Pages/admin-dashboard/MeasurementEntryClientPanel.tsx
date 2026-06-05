/**
 * ============================================================================
 * FILE: MeasurementEntryClientPanel.tsx
 * PURPOSE: Client selection and measurement date controls for biometrics.
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders the embedded-client badge or searchable client selector plus the
 * measurement date input.
 *
 * HOW IT FITS IN THE APP:
 * MeasurementEntry owns the selected client and date state. This component
 * keeps the top-of-flow UI isolated from the biometrics orchestration shell.
 */

import type { RefObject } from 'react';
import { motion } from 'framer-motion';
import { Ruler, X } from 'lucide-react';
import { itemVariants } from './MeasurementEntry.config';
import type { BodyMeasurement, Client } from './MeasurementEntry.types';
import {
  FlexRow,
  GlassPanel,
  ResponsiveGrid,
  SectionTitle,
} from './MeasurementEntry.baseStyles';
import {
  AutocompleteWrapper,
  ClearClientButton,
  DropdownItem,
  DropdownList,
  EmbeddedClientBadge,
  InputWrapper,
  StyledInput,
  StyledLabel,
} from './MeasurementEntry.formStyles';

interface MeasurementEntryClientPanelProps {
  embeddedClientId?: string;
  embeddedClientName?: string;
  selectedClient: Client | null;
  clientSearch: string;
  showDropdown: boolean;
  filteredClients: Client[];
  newMeasurement: Partial<BodyMeasurement>;
  autocompleteRef: RefObject<HTMLDivElement>;
  onClientSearchChange: (value: string) => void;
  onClientFocus: () => void;
  onClientSelect: (client: Client) => void;
  onClientClear: () => void;
  onMeasurementDateChange: (value: string) => void;
}

const MeasurementEntryClientPanel = ({
  embeddedClientId,
  embeddedClientName,
  selectedClient,
  clientSearch,
  showDropdown,
  filteredClients,
  newMeasurement,
  autocompleteRef,
  onClientSearchChange,
  onClientFocus,
  onClientSelect,
  onClientClear,
  onMeasurementDateChange,
}: MeasurementEntryClientPanelProps) => (
  <GlassPanel as={motion.div} variants={itemVariants}>
    <SectionTitle>Body Measurements Entry</SectionTitle>
    <ResponsiveGrid>
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
                onChange={(event) => onClientSearchChange(event.target.value)}
                onFocus={onClientFocus}
                $hasAdornment={!!selectedClient}
              />
              {selectedClient && (
                <ClearClientButton
                  type="button"
                  onClick={onClientClear}
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
                    onClick={() => onClientSelect(client)}
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

      <InputWrapper>
        <StyledLabel>Measurement Date</StyledLabel>
        <StyledInput
          type="date"
          value={newMeasurement.measurementDate || ''}
          onChange={(event) => onMeasurementDateChange(event.target.value)}
          disabled={!selectedClient}
        />
      </InputWrapper>
    </ResponsiveGrid>
  </GlassPanel>
);

export default MeasurementEntryClientPanel;
