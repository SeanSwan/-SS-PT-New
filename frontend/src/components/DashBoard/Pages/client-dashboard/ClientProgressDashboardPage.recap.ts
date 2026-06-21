import type { WeeklyRecap } from './ClientProgressDashboardPage.metrics';

type WeeklyRecapHttpClient = {
  get: (url: string) => Promise<{ data?: unknown }>;
};

type RecapPayload = Record<string, unknown>;

const isPayloadObject = (payload: unknown): payload is RecapPayload => (
  typeof payload === 'object' &&
  payload !== null &&
  !Array.isArray(payload)
);

const hasRecapShape = (payload: RecapPayload) => (
  'thisWeek' in payload ||
  'current' in payload ||
  'lastWeek' in payload ||
  'trends' in payload ||
  'weekStarting' in payload
);

const extractRecapObject = (payload: unknown, allowEmpty = false): WeeklyRecap | null => {
  if (!isPayloadObject(payload) || payload.success === false) return null;
  if (allowEmpty && Object.keys(payload).length === 0) return payload as WeeklyRecap;
  return hasRecapShape(payload) ? payload as WeeklyRecap : null;
};

export const extractWeeklyRecapPayload = (payload: unknown): WeeklyRecap | null => {
  if (!isPayloadObject(payload)) return null;
  if (payload.success === false) return null;

  if ('data' in payload) {
    return extractRecapObject(payload.data, true);
  }

  if ('success' in payload) return null;

  return extractRecapObject(payload);
};

export const loadClientWeeklyRecap = async (
  authAxios: WeeklyRecapHttpClient,
  weeklyRecapUserIdSegment: string,
): Promise<WeeklyRecap | null> => {
  const response = await authAxios.get(
    `/api/gamification/users/${weeklyRecapUserIdSegment}/weekly-recap`,
  );
  return extractWeeklyRecapPayload(response.data);
};
