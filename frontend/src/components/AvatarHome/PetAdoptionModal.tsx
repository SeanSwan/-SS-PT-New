import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, PawPrint, Sparkles, X } from 'lucide-react';
import apiService from '../../services/api.service';
import { SPECIES_DATA } from './PetAdoptionModal.data';
import {
  AdoptButton,
  Backdrop,
  CloseBtn,
  Footer,
  Modal,
  ModalHeader,
  ModalTitle,
  NameInput,
  SelectedCheck,
  SpeciesAffinity,
  SpeciesCard,
  SpeciesDesc,
  SpeciesEmoji,
  SpeciesGrid,
  SpeciesInfo,
  SpeciesName,
  StatusMsg,
} from './PetAdoptionModal.styles';

interface PetAdoptionModalProps {
  userIdSegment: string;
  onClose: () => void;
  onAdopted: () => void;
}

const PET_ADOPTION_ERROR = 'Unable to adopt companion. Please try again.';

const PetAdoptionModal: React.FC<PetAdoptionModalProps> = ({ userIdSegment, onClose, onAdopted }) => {
  const [selected, setSelected] = useState<string>('');
  const [petName, setPetName] = useState('');
  const [adopting, setAdopting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const adoptingRef = useRef(false);

  const handleAdopt = async () => {
    if (!selected || !petName.trim() || adoptingRef.current) return;
    adoptingRef.current = true;
    setAdopting(true);
    setStatus(null);
    try {
      const res = await apiService.post<{ success: boolean }>(`/api/gamification/users/${userIdSegment}/pet/adopt`, {
        species: selected,
        petName: petName.trim(),
      });
      if (res.data.success) {
        onAdopted();
        onClose();
      } else {
        setStatus(PET_ADOPTION_ERROR);
      }
    } catch {
      setStatus(PET_ADOPTION_ERROR);
    } finally {
      adoptingRef.current = false;
      setAdopting(false);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <Backdrop onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <Modal role="dialog" aria-label="Adopt a companion">
        <ModalHeader>
          <ModalTitle><PawPrint size={20} aria-hidden="true" /> Adopt a Companion</ModalTitle>
          <CloseBtn type="button" onClick={onClose} aria-label="Close"><X size={20} /></CloseBtn>
        </ModalHeader>

        <SpeciesGrid>
          {SPECIES_DATA.map((sp) => (
            <SpeciesCard
              key={sp.id}
              type="button"
              $selected={selected === sp.id}
              disabled={adopting}
              onClick={() => setSelected(sp.id)}
              aria-pressed={selected === sp.id}
            >
              <SpeciesEmoji>{sp.emoji}</SpeciesEmoji>
              <SpeciesInfo>
                <SpeciesName>
                  {sp.name}
                  {selected === sp.id && (
                    <SelectedCheck size={14} aria-hidden="true" />
                  )}
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

        {status && (
          <StatusMsg role="status" aria-live="polite">
            <AlertTriangle size={14} aria-hidden="true" />
            {status}
          </StatusMsg>
        )}

        <Footer>
          <AdoptButton
            type="button"
            onClick={handleAdopt}
            disabled={!selected || !petName.trim() || adopting}
            aria-busy={adopting}
          >
            <Sparkles size={16} aria-hidden="true" />
            {adopting ? 'Adopting...' : 'Adopt'}
          </AdoptButton>
        </Footer>
      </Modal>
    </Backdrop>
  );
};

export default PetAdoptionModal;
