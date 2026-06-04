/**
 * BookingDrawer — "Swan Glide" Quick-Book Flow
 * Side drawer on desktop (1024px+), bottom sheet on mobile.
 * 3-click booking: slot -> client -> confirm.
 * Per Gemini 3.1 Pro design authority.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { X, Search, Clock, MapPin, User, Check } from 'lucide-react';
import { BOOKING_DRAWER_THEME } from './BookingDrawer.theme';
import {
  ChangeClientBtn,
  ClientAvatar,
  ClientEmail,
  ClientInfo,
  ClientItem,
  ClientName,
  ConfirmButton,
  ConfirmClient,
  ConfirmEmail,
  ConfirmLabel,
  ConfirmName,
  ConfirmSection,
  DrawerFooter,
  EmptySearch,
  HintText,
} from './BookingDrawer.client.styles';
import {
  Backdrop,
  ClientList,
  CloseButton,
  DrawerBody,
  DrawerContainer,
  DrawerHeader,
  DrawerTitle,
  DurationSelect,
  SearchInput,
  SearchWrapper,
  SlotDate,
  SlotMeta,
  SlotSummary,
  SlotTime,
  SlotTrainer,
  Step,
  StepDivider,
  StepIndicator,
} from './BookingDrawer.styles';

interface Client {
  id: number | string;
  firstName: string;
  lastName: string;
  email?: string;
}

interface BookingDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (clientId: string | number) => Promise<void>;
  slotDate: Date | null;
  slotDuration: number;
  onDurationChange?: (duration: number) => void;
  slotLocation: string;
  trainerName?: string;
  clients: Client[];
  loading?: boolean;
}

const BookingDrawer: React.FC<BookingDrawerProps> = ({
  isOpen,
  onClose,
  onConfirm,
  slotDate,
  slotDuration,
  onDurationChange,
  slotLocation,
  trainerName,
  clients,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [confirming, setConfirming] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Reset when opened with new slot
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedClient(null);
      setSearchTerm('');
      setConfirming(false);
      // Auto-focus search on open (step 2 = client select)
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [isOpen, slotDate]);

  const filteredClients = clients.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    return fullName.includes(term) || (c.email && c.email.toLowerCase().includes(term));
  });

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!selectedClient) return;
    setConfirming(true);
    try {
      await onConfirm(selectedClient.id);
      onClose();
    } catch {
      setConfirming(false);
    }
  };

  const timeStr = slotDate
    ? slotDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';
  const dateStr = slotDate
    ? slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Backdrop
            type="button"
            aria-label="Close booking drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <DrawerContainer
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <DrawerHeader>
              <DrawerTitle>Quick Book</DrawerTitle>
              <CloseButton onClick={onClose} aria-label="Close booking drawer">
                <X size={20} />
              </CloseButton>
            </DrawerHeader>

            {/* Step Indicator */}
            <StepIndicator>
              <Step $active={step >= 1} $complete={step > 1}>1. Slot</Step>
              <StepDivider $active={step >= 2} />
              <Step $active={step >= 2} $complete={step > 2}>2. Client</Step>
              <StepDivider $active={step >= 3} />
              <Step $active={step >= 3}>3. Confirm</Step>
            </StepIndicator>

            {/* Slot Summary (always visible) */}
            <SlotSummary>
              <SlotTime>{timeStr}</SlotTime>
              <SlotDate>{dateStr}</SlotDate>
              <SlotMeta>
                <Clock size={12} />
                <DurationSelect
                  value={slotDuration}
                  onChange={(e) => onDurationChange?.(Number(e.target.value))}
                  aria-label="Session duration"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                  <option value={90}>90 min</option>
                </DurationSelect>
                {slotLocation && <><MapPin size={12} /> {slotLocation}</>}
              </SlotMeta>
              {trainerName && (
                <SlotTrainer><User size={12} /> {trainerName}</SlotTrainer>
              )}
            </SlotSummary>

            {/* Step 2: Client Selection */}
            <DrawerBody>
              {step < 3 && (
                <>
                  <SearchWrapper>
                    <Search size={16} color={BOOKING_DRAWER_THEME.textMuted} />
                    <SearchInput
                      ref={searchRef}
                      type="text"
                      placeholder="Search clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </SearchWrapper>

                  <ClientList>
                    {filteredClients.map(client => (
                      <ClientItem
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        $selected={selectedClient?.id === client.id}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ClientAvatar>
                          {client.firstName[0]}{client.lastName[0]}
                        </ClientAvatar>
                        <ClientInfo>
                          <ClientName>{client.firstName} {client.lastName}</ClientName>
                          {client.email && <ClientEmail>{client.email}</ClientEmail>}
                        </ClientInfo>
                        {selectedClient?.id === client.id && (
                          <Check size={16} color={BOOKING_DRAWER_THEME.success} />
                        )}
                      </ClientItem>
                    ))}
                    {filteredClients.length === 0 && (
                      <EmptySearch>No clients match {searchTerm}</EmptySearch>
                    )}
                  </ClientList>
                </>
              )}

              {/* Step 3: Confirmation */}
              {step === 3 && selectedClient && (
                <ConfirmSection
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ConfirmLabel>Booking for:</ConfirmLabel>
                  <ConfirmClient>
                    <ClientAvatar $large>
                      {selectedClient.firstName[0]}{selectedClient.lastName[0]}
                    </ClientAvatar>
                    <div>
                      <ConfirmName>{selectedClient.firstName} {selectedClient.lastName}</ConfirmName>
                      {selectedClient.email && <ConfirmEmail>{selectedClient.email}</ConfirmEmail>}
                    </div>
                  </ConfirmClient>

                  <ChangeClientBtn onClick={() => setStep(2)}>
                    Change Client
                  </ChangeClientBtn>
                </ConfirmSection>
              )}
            </DrawerBody>

            {/* Footer Action */}
            <DrawerFooter>
              {step === 3 && selectedClient ? (
                <ConfirmButton
                  onClick={handleConfirm}
                  disabled={confirming || loading}
                  whileHover={{ boxShadow: BOOKING_DRAWER_THEME.confirmGlow }}
                  whileTap={{ scale: 0.97 }}
                >
                  {confirming ? 'Booking...' : 'Confirm & Ignite'}
                </ConfirmButton>
              ) : (
                <HintText>Select a client to continue</HintText>
              )}
            </DrawerFooter>
          </DrawerContainer>
        </>
      )}
    </AnimatePresence>
  );
};

export default BookingDrawer;
