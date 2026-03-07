/**
 * BookingDrawer — "Swan Glide" Quick-Book Flow
 * Side drawer on desktop (1024px+), bottom sheet on mobile.
 * 3-click booking: slot -> client -> confirm.
 * Per Gemini 3.1 Pro design authority.
 */

import React, { useState, useEffect, useRef } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Clock, MapPin, User, Check, ChevronDown } from 'lucide-react';

const TOKENS = {
  surfaceGlass: 'rgba(10, 10, 26, 0.6)',
  elevatedGlass: 'rgba(30, 30, 50, 0.7)',
  swanCyan: '#00FFFF',
  cosmicPurple: '#7851A9',
  deepSpace: '#0A0A1A',
  stellarWhite: '#f0f0ff',
  mutedText: '#8892b0',
  successGreen: '#10b981',
  dangerRed: '#ef4444',
  glassStroke: 'rgba(0, 255, 255, 0.1)',
  purpleStroke: 'rgba(120, 81, 169, 0.3)',
};

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
                <Clock size={12} /> {slotDuration} min
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
                    <Search size={16} color={TOKENS.mutedText} />
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
                          <Check size={16} color={TOKENS.successGreen} />
                        )}
                      </ClientItem>
                    ))}
                    {filteredClients.length === 0 && (
                      <EmptySearch>No clients match "{searchTerm}"</EmptySearch>
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
                  whileHover={{ boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)' }}
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

// ---- Styled Components ----

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
`;

const DrawerContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 100vw;
  background: ${TOKENS.elevatedGlass};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid ${TOKENS.purpleStroke};
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  @media (max-width: 768px) {
    top: auto;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 85vh;
    border-left: none;
    border-top: 1px solid ${TOKENS.purpleStroke};
    border-radius: 24px 24px 0 0;
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const DrawerTitle = styled.h2`
  font-size: 18px;
  font-weight: 700;
  color: ${TOKENS.stellarWhite};
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${TOKENS.mutedText};
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(255, 255, 255, 0.05); color: ${TOKENS.stellarWhite}; }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
`;

const Step = styled.span<{ $active: boolean; $complete?: boolean }>`
  font-size: 12px;
  font-weight: 600;
  color: ${p => p.$active ? TOKENS.swanCyan : TOKENS.mutedText};
  opacity: ${p => p.$active ? 1 : 0.5};
  transition: all 0.2s;
`;

const StepDivider = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 1px;
  background: ${p => p.$active ? TOKENS.swanCyan : 'rgba(255,255,255,0.1)'};
  transition: background 0.3s;
`;

const SlotSummary = styled.div`
  padding: 16px 24px;
  background: rgba(0, 255, 255, 0.04);
  border-top: 1px solid rgba(0, 255, 255, 0.06);
  border-bottom: 1px solid rgba(0, 255, 255, 0.06);
`;

const SlotTime = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${TOKENS.stellarWhite};
  font-variant-numeric: tabular-nums;
`;

const SlotDate = styled.div`
  font-size: 14px;
  color: ${TOKENS.mutedText};
  margin-top: 2px;
`;

const SlotMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  color: ${TOKENS.mutedText};
`;

const SlotTrainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: ${TOKENS.swanCyan};
`;

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
`;

const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 12px;

  &:focus-within {
    border-color: ${TOKENS.swanCyan};
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.1);
  }
`;

const SearchInput = styled.input`
  background: none;
  border: none;
  outline: none;
  color: ${TOKENS.stellarWhite};
  font-size: 14px;
  flex: 1;
  min-height: 24px;

  &::placeholder { color: ${TOKENS.mutedText}; }
`;

const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ClientItem = styled(motion.button)<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid ${p => p.$selected ? `${TOKENS.successGreen}40` : 'transparent'};
  border-radius: 10px;
  background: ${p => p.$selected ? 'rgba(16, 185, 129, 0.08)' : 'transparent'};
  cursor: pointer;
  text-align: left;
  min-height: 48px;
  transition: all 0.15s;
  color: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const ClientAvatar = styled.div<{ $large?: boolean }>`
  width: ${p => p.$large ? '48px' : '36px'};
  height: ${p => p.$large ? '48px' : '36px'};
  border-radius: 50%;
  background: linear-gradient(135deg, ${TOKENS.cosmicPurple}, ${TOKENS.swanCyan});
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${p => p.$large ? '16px' : '12px'};
  font-weight: 700;
  color: ${TOKENS.deepSpace};
  flex-shrink: 0;
`;

const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ClientName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${TOKENS.stellarWhite};
`;

const ClientEmail = styled.div`
  font-size: 12px;
  color: ${TOKENS.mutedText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EmptySearch = styled.div`
  text-align: center;
  padding: 24px;
  font-size: 14px;
  color: ${TOKENS.mutedText};
`;

const ConfirmSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
`;

const ConfirmLabel = styled.span`
  font-size: 13px;
  color: ${TOKENS.mutedText};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ConfirmClient = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ConfirmName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${TOKENS.stellarWhite};
`;

const ConfirmEmail = styled.div`
  font-size: 13px;
  color: ${TOKENS.mutedText};
`;

const ChangeClientBtn = styled.button`
  background: none;
  border: none;
  color: ${TOKENS.swanCyan};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 6px;
  min-height: 44px;

  &:hover { background: rgba(0, 255, 255, 0.06); }
`;

const DrawerFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ConfirmButton = styled(motion.button)`
  width: 100%;
  padding: 14px 32px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #00FFFF 0%, #0088FF 100%);
  color: ${TOKENS.deepSpace};
  font-weight: 700;
  font-size: 16px;
  cursor: pointer;
  min-height: 48px;
  letter-spacing: 0.5px;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const HintText = styled.span`
  font-size: 14px;
  color: ${TOKENS.mutedText};
`;
