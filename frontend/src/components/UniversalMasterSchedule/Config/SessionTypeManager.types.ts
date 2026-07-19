import type { SessionType } from '../hooks/useSessionTypes';

export interface SessionTypeFormState {
  name: string;
  description: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  creditsRequired: number;
  color: string;
  price: string;
  isActive: boolean;
}

export type FormPatch = Partial<SessionTypeFormState>;

export type SessionTypePayload = Partial<SessionType> & {
  name: string;
  duration: number;
  bufferBefore: number;
  bufferAfter: number;
  creditsRequired: number;
  color: string;
  isActive: boolean;
};

export interface SessionTypeEditorProps {
  isOpen: boolean;
  editing: SessionType | null;
  form: SessionTypeFormState;
  formError: string | null;
  onFormChange: (patch: FormPatch) => void;
  onClose: () => void;
  onSave: () => void;
}
