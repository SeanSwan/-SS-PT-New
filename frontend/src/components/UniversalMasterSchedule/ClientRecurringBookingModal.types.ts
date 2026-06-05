import type { SelectOption } from './ui';

export interface ClientRecurringSession {
  id: number;
  sessionDate: string;
  duration: number;
  location: string;
  status: string;
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface ClientRecurringBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableSessions: ClientRecurringSession[];
  userCredits: number;
}

export type ClientRecurringStep = 'filter' | 'select' | 'confirm';

export type RecurringSelectOption = SelectOption;
