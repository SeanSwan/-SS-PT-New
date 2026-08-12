/**
 * The provider matrix: which platforms this system can publish to natively, and
 * what each one still needs before it can. Split out of
 * nativeSocialPublishingService to keep that file under the 300-line rule.
 *
 * Re-exported from the service so existing importers are unaffected.
 *
 * @module socialProviderCapabilities
 */

export const PROVIDER_CAPABILITIES = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    native: true,
    implementationStatus: 'available',
    connectionType: 'app_password',
    notes: 'Uses AT Protocol app-password login and com.atproto.repo.createRecord.',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'google_oauth',
    notes: 'Requires Google OAuth client and YouTube Data API quota.',
  },
  {
    id: 'facebook',
    name: 'Facebook',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'meta_oauth',
    notes: 'Requires Meta app review and Page publishing permissions.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    native: true,
    implementationStatus: 'oauth_required',
    connectionType: 'meta_oauth',
    notes: 'Requires Instagram professional account and Meta publishing permissions.',
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    native: true,
    implementationStatus: 'approval_required',
    connectionType: 'tiktok_oauth',
    notes: 'Direct Post requires TikTok Content Posting API approval.',
  },
  {
    id: 'nextdoor',
    name: 'Nextdoor',
    native: true,
    implementationStatus: 'partner_required',
    connectionType: 'partner_api',
    notes: 'Publish API requires Nextdoor developer/partner approval.',
  },
];
