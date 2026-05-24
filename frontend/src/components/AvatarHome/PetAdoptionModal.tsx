/**
 * ┌─── COMPONENT: PetAdoptionModal ────��──────────────────────────┐
 * │ PURPOSE: Species selection modal for companion pet adoption.  │
 * │ Shows 5 species with affinities and visual preview.           │
 * │ BACKEND: GET /api/gamification/pet/config + POST adopt        │
 * └──��─────────────────���─────────────────────────────────���────────┘
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Sparkles, Check, PawPrint } from 'lucide-react';
import apiService from '../../services/api.service';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(24px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${fadeIn} 0.2s;
  padding: 16px;
`;

const Modal = styled.div`
  background: var(--bg-elevated, #141419);
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  max-width: 560px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: ${slideUp} 0.3s ease;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
`;

const ModalTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  cursor: pointer;
  &:hover { color: var(--text-primary, #E0ECF4); }
`;

const SpeciesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 16px 24px;
`;

const SpeciesCard = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  border: 2px solid ${({ $selected }) => $selected ? 'var(--accent-primary, #60C0F0)' : 'rgba(96, 192, 240, 0.1)'};
  background: ${({ $selected }) => $selected ? 'rgba(96, 192, 240, 0.08)' : 'rgba(10, 10, 15, 0.5)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  width: 100%;
  min-height: 44px;
  transition: all 0.15s;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const SpeciesEmoji = styled.div`
  font-size: 36px;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.4);
`;

const SpeciesInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SpeciesName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 3px;
`;

const SpeciesAffinity = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--accent-primary, #60C0F0);
`;

const SpeciesDesc = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin-top: 2px;
`;

const NameInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.2);
  background: rgba(10, 10, 15, 0.6);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  outline: none;
  min-height: 44px;
  margin: 0 24px 16px;
  box-sizing: border-box;

  &:focus { border-color: var(--accent-primary, #60C0F0); }
  &::placeholder { color: rgba(224, 236, 244, 0.3); }
`;

const Footer = styled.div`
  padding: 16px 24px 20px;
  border-top: 1px solid rgba(96, 192, 240, 0.1);
  display: flex;
  justify-content: flex-end;
`;

const AdoptButton = styled.button`
  min-height: 44px;
  padding: 12px 28px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #002060, #8B5CF6);
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: opacity 0.15s;

  &:hover { opacity: 0.9; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const SPECIES_DATA = [
  { id: 'crystal_dragon', emoji: '🐉', name: 'Crystal Dragon', affinity: 'Athletic Power', desc: 'Ice-colored, grows fastest from workouts' },
  { id: 'iron_wolf', emoji: '🐺', name: 'Iron Wolf', affinity: 'Discipline', desc: 'Gray-toned, rewards consistency and routine' },
  { id: 'ember_phoenix', emoji: '🦅', name: 'Ember Phoenix', affinity: 'Vitality', desc: 'Fire-colored, thrives on self-care' },
  { id: 'frost_swan', emoji: '🦢', name: 'Frost Swan', affinity: 'Recovery', desc: 'White-feathered, grows from rest and stretching' },
  { id: 'shadow_panther', emoji: '🐆', name: 'Shadow Panther', affinity: 'Social Energy', desc: 'Purple-gold, community-powered growth' },
];

interface PetAdoptionModalProps {
  userId: number;
  onClose: () => void;
  onAdopted: () => void;
}

const PetAdoptionModal: React.FC<PetAdoptionModalProps> = ({ userId, onClose, onAdopted }) => {
  const [selected, setSelected] = useState<string>('');
  const [petName, setPetName] = useState('');
  const [adopting, setAdopting] = useState(false);

  const handleAdopt = async () => {
    if (!selected || !petName.trim()) return;
    setAdopting(true);
    try {
      const res = await apiService.post<{ success: boolean }>(`/api/gamification/users/${userId}/pet/adopt`, {
        species: selected,
        petName: petName.trim(),
      });
      const d = res.data;
      if (d.success) {
        onAdopted();
        onClose();
      }
    } catch { /* best-effort */ }
    setAdopting(false);
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <Backdrop onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Modal role="dialog" aria-label="Adopt a companion">
        <ModalHeader>
          <ModalTitle><PawPrint size={20} /> Adopt a Companion</ModalTitle>
          <CloseBtn onClick={onClose} aria-label="Close"><X size={20} /></CloseBtn>
        </ModalHeader>

        <SpeciesGrid>
          {SPECIES_DATA.map((sp) => (
            <SpeciesCard
              key={sp.id}
              $selected={selected === sp.id}
              onClick={() => setSelected(sp.id)}
              aria-pressed={selected === sp.id}
            >
              <SpeciesEmoji>{sp.emoji}</SpeciesEmoji>
              <SpeciesInfo>
                <SpeciesName>
                  {sp.name}
                  {selected === sp.id && <Check size={14} style={{ marginLeft: 6, color: '#60C0F0' }} />}
                </SpeciesName>
                <SpeciesAffinity>Affinity: {sp.affinity}</SpeciesAffinity>
                <SpeciesDesc>{sp.desc}</SpeciesDesc>
              </SpeciesInfo>
            </SpeciesCard>
          ))}
        </SpeciesGrid>

        <NameInput
          placeholder="Name your companion..."
          value={petName}
          onChange={(e) => setPetName(e.target.value.slice(0, 50))}
          maxLength={50}
          aria-label="Pet name"
        />

        <Footer>
          <AdoptButton
            onClick={handleAdopt}
            disabled={!selected || !petName.trim() || adopting}
          >
            <Sparkles size={16} />
            {adopting ? 'Adopting...' : 'Adopt'}
          </AdoptButton>
        </Footer>
      </Modal>
    </Backdrop>
  );
};

export default PetAdoptionModal;
