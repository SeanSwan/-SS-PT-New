/**
 * Marketing calendar API helpers.
 */

import type { CalendarChannel, SocialPlatform } from './marketing.types';
import apiService from '../../../../services/api.service';

export type MarketingCalendarStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled';

export interface MarketingCalendarAdvisory {
  calendar: 'personal_training' | string;
  externalId: string;
  title: string;
  start: string;
  end: string;
  status: string;
  severity: 'advisory' | string;
  blocksScheduling: boolean;
}

export interface MarketingCalendarItem {
  id: string;
  title: string;
  content?: string | null;
  channel: CalendarChannel;
  platform?: SocialPlatform | string | null;
  campaignName?: string | null;
  status: MarketingCalendarStatus;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
  advisories: MarketingCalendarAdvisory[];
}

export interface MarketingCalendarPayload {
  title: string;
  content?: string;
  channel: CalendarChannel;
  platform?: string;
  campaignName?: string;
  status?: MarketingCalendarStatus;
  scheduledAt: string;
  durationMinutes: number;
  timezone: string;
}

const API_PATH = '/api/admin/marketing-calendar';

export async function fetchMarketingCalendar(start: string, end: string) {
  const params = new URLSearchParams({ start, end });
  const response = await apiService.get(`${API_PATH}?${params.toString()}`);
  const data = response.data;
  if (!data.success) throw new Error(data.message || 'Failed to load marketing calendar');
  return data.data as MarketingCalendarItem[];
}

export async function createMarketingCalendarItem(payload: MarketingCalendarPayload) {
  const response = await apiService.post(API_PATH, payload);
  const data = response.data;
  if (!data.success) throw new Error(data.message || 'Failed to schedule marketing item');
  return {
    item: data.data as MarketingCalendarItem,
    advisories: (data.advisories || []) as MarketingCalendarAdvisory[],
  };
}

export async function updateMarketingCalendarItem(id: string, payload: MarketingCalendarPayload) {
  const response = await apiService.put(`${API_PATH}/${id}`, payload);
  const data = response.data;
  if (!data.success) throw new Error(data.message || 'Failed to update marketing item');
  return {
    item: data.data as MarketingCalendarItem,
    advisories: (data.advisories || []) as MarketingCalendarAdvisory[],
  };
}
