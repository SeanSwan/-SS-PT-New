export interface AdminSessionsNewSessionPayloadInput {
  startIso: string;
  duration: number;
  location: string;
  notes: string;
  clientId: string;
  trainerId: string;
}

interface AdminSessionsNewSessionSlot {
  start: string;
  duration: number;
  location?: string;
  notes?: string;
  userId?: string;
  trainerId?: string;
}

export interface AdminSessionsNewSessionPayload {
  sessions: AdminSessionsNewSessionSlot[];
}

const normalizeOptionalText = (value: string) => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

export const buildAdminSessionsNewSessionPayload = ({
  startIso,
  duration,
  location,
  notes,
  clientId,
  trainerId,
}: AdminSessionsNewSessionPayloadInput): AdminSessionsNewSessionPayload => {
  const session: AdminSessionsNewSessionSlot = {
    start: startIso,
    duration,
  };

  const normalizedLocation = normalizeOptionalText(location);
  const normalizedNotes = normalizeOptionalText(notes);
  const normalizedClientId = normalizeOptionalText(clientId);
  const normalizedTrainerId = normalizeOptionalText(trainerId);

  if (normalizedLocation) session.location = normalizedLocation;
  if (normalizedNotes) session.notes = normalizedNotes;
  if (normalizedClientId) session.userId = normalizedClientId;
  if (normalizedTrainerId) session.trainerId = normalizedTrainerId;

  return { sessions: [session] };
};
