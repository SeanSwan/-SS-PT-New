export interface AdminSessionRowIdentitySession {
  id?: string | number | null;
  sessionDate?: string | null;
  userId?: string | number | null;
  trainerId?: string | number | null;
  location?: string | null;
  duration?: string | number | null;
  status?: string | null;
}

export interface AdminSessionRowItem<TSession extends AdminSessionRowIdentitySession> {
  key: string;
  session: TSession;
  index: number;
}

const keyPart = (value: string | number | null | undefined, fallback: string): string => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  if (!text) return fallback;

  return text
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;
};

export const adminSessionRowKey = (session: AdminSessionRowIdentitySession): string => {
  const id = keyPart(session.id, '');
  if (id) return `admin-session-${id}`;

  const derivedParts = [
    keyPart(session.sessionDate, 'no-date'),
    keyPart(session.userId, 'no-client'),
    keyPart(session.trainerId, 'no-trainer'),
    keyPart(session.location, 'no-location'),
    keyPart(session.duration, 'no-duration'),
    keyPart(session.status, 'no-status')
  ];

  return `admin-session-${derivedParts.join('-')}`;
};

export const adminSessionRowItems = <TSession extends AdminSessionRowIdentitySession>(
  sessions: TSession[]
): AdminSessionRowItem<TSession>[] => {
  const seenKeys = new Map<string, number>();

  return sessions.map((session, index) => {
    const baseKey = adminSessionRowKey(session);
    const occurrence = (seenKeys.get(baseKey) ?? 0) + 1;
    seenKeys.set(baseKey, occurrence);

    return {
      key: occurrence === 1 ? baseKey : `${baseKey}-${occurrence}`,
      session,
      index
    };
  });
};
