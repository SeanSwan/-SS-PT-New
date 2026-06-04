import type {
  ClientRecurringSession,
  RecurringSelectOption,
} from './ClientRecurringBookingModal.types';

export const daysOfWeekOptions: RecurringSelectOption[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export const weeksAheadOptions: RecurringSelectOption[] = [
  { value: 2, label: '2 weeks' },
  { value: 4, label: '4 weeks' },
  { value: 6, label: '6 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
];

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  const candidate = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };

  if (typeof candidate.response?.data?.message === 'string') {
    return candidate.response.data.message;
  }

  return typeof candidate.message === 'string' ? candidate.message : fallback;
};

export const buildTimeSlotOptions = (
  availableSessions: ClientRecurringSession[]
): RecurringSelectOption[] => {
  const slots = new Set<string>();

  availableSessions.forEach((session) => {
    const date = new Date(session.sessionDate);
    slots.add(date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }));
  });

  return Array.from(slots).sort().map((time) => ({
    value: time,
    label: new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  }));
};

export const filterRecurringSessions = ({
  availableSessions,
  selectedDay,
  selectedTimeSlot,
  weeksAhead,
  now = new Date(),
}: {
  availableSessions: ClientRecurringSession[];
  selectedDay: number | '';
  selectedTimeSlot: string;
  weeksAhead: number;
  now?: Date;
}) => {
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + (weeksAhead * 7));

  return availableSessions
    .filter((session) => {
      const sessionDate = new Date(session.sessionDate);
      const sessionTime = sessionDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      return session.status === 'available'
        && sessionDate > now
        && sessionDate <= endDate
        && (selectedDay === '' || sessionDate.getDay() === selectedDay)
        && (!selectedTimeSlot || sessionTime === selectedTimeSlot);
    })
    .sort((a, b) =>
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
};
