/**
 * ┌─── TYPES: Marketing Dashboard ──────────────────────────────┐
 * │ PARENT: MarketingWorkspace                                   │
 * │ PURPOSE: Shared TypeScript interfaces for all marketing      │
 * │          panels — SEO, keywords, blog, social, email,        │
 * │          calendar, and competitor analysis.                   │
 * └──────────────────────────────────────────────────────────────┘
 */

// ─── SEO Audit ─────────────────────────────────────────────────
export type SEOIssueType = 'error' | 'warning' | 'info';

export interface SEOIssue {
  type: SEOIssueType;
  message: string;
  page: string;
}

export interface SEOAuditResult {
  healthScore: number;
  issues: SEOIssue[];
  categories: {
    metaTags: { score: number; issues: number };
    pageSpeed: { score: number; issues: number };
    mobileFriendly: { score: number; issues: number };
    contentQuality: { score: number; issues: number };
  };
  lastAuditDate: string;
}

// ─── Keyword Research ──────────────────────────────────────────
export type KeywordIntent = 'informational' | 'transactional' | 'local';
export type CompetitionLevel = 'low' | 'medium' | 'high';
export type KeywordCategory = 'personal-training' | 'golf-fitness' | 'local-seo';

export interface KeywordEntry {
  id: string;
  keyword: string;
  volume: number;
  competition: CompetitionLevel;
  difficulty: number;
  intent: KeywordIntent;
  category: KeywordCategory;
  tracked?: boolean;
  rankTrend?: number[];
}

// ─── Blog Writer ───────────────────────────────────────────────
export type ApprovalStatus = 'draft' | 'pending_review' | 'approved' | 'published';
export type BlogWizardStep = 'topic' | 'outline' | 'draft';

export interface BlogDraft {
  id: string;
  title: string;
  outline: string[];
  body: string;
  status: ApprovalStatus;
  createdAt: string;
  wordCount: number;
}

// ─── Social Post ───────────────────────────────────────────────
export type SocialPlatform = 'instagram' | 'facebook' | 'youtube' | 'bluesky' | 'tiktok' | 'nextdoor';

export interface SocialPost {
  id: string;
  platform: SocialPlatform;
  caption: string;
  hashtags: string[];
  suggestedTime: string;
  status: ApprovalStatus;
}

export interface PlatformConfig {
  name: string;
  maxChars: number;
  color: string;
  bestTimes: string;
}

// ─── Email Digest ──────────────────────────────────────────────
export type EmailBlockType = 'heading' | 'paragraph' | 'cta' | 'testimonial';

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: string;
}

export interface EmailDigest {
  id: string;
  subject: string;
  preheader: string;
  templateId: string;
  blocks: EmailBlock[];
  status: ApprovalStatus;
  scheduledFor?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  defaultBlocks: EmailBlock[];
}

// ─── Content Calendar ──────────────────────────────────────────
export type CalendarChannel = 'blog' | 'social' | 'email' | 'video' | 'local';

export interface CalendarEvent {
  id: string;
  date: string;
  channel: CalendarChannel;
  title: string;
  status: ApprovalStatus;
}

// ─── Competitor Analysis ───────────────────────────────────────
export interface CompetitorProfile {
  id: string;
  name: string;
  website: string;
  socialFollowers: Partial<Record<SocialPlatform, number>>;
  reviewScore: number;
  reviewCount: number;
  topKeywords: string[];
  estimatedPricing: string;
  followerTrend: number[];
}

// ─── Cadence Config ────────────────────────────────────────────
export const CADENCE_CONFIG = {
  blogMaxPerWeek: 1,
  emailMaxPerMonth: 2,
} as const;

// ─── Marketing Campaign (spine) ────────────────────────────────
export type CampaignObjective =
  | 'lead_generation' | 'booking_assessments' | 'newsletter_growth'
  | 'local_seo' | 'product_sale' | 'retention';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface MarketingCampaign {
  id: string;
  name: string;
  objective: CampaignObjective;
  offer?: string | null;
  audience?: string | null;
  status: CampaignStatus;
  startAt?: string | null;
  endAt?: string | null;
  budget?: string | number | null; // Sequelize DECIMAL serializes as a string
  primaryChannel?: string | null;
  utmCampaign?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const CAMPAIGN_OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: 'lead_generation', label: 'Lead Generation' },
  { value: 'booking_assessments', label: 'Book Assessments' },
  { value: 'newsletter_growth', label: 'Newsletter Growth' },
  { value: 'local_seo', label: 'Local SEO' },
  { value: 'product_sale', label: 'Product Sale' },
  { value: 'retention', label: 'Retention' },
];
export const CAMPAIGN_STATUSES: CampaignStatus[] = ['draft', 'active', 'paused', 'completed', 'archived'];
