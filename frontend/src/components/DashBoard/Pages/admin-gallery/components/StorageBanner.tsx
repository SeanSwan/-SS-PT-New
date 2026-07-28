/**
 * StorageBanner — R2 vs base64 storage health indicator
 * =====================================================
 * Surfaces the backend's storageType so the operator knows whether photos are
 * going to Cloudflare R2 (healthy) or the inline base64 fallback (needs config).
 */

import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Banner } from '../styles';
import type { GalleryStats } from '../types';

interface Props {
  storageType?: GalleryStats['storageType'];
}

const StorageBanner: React.FC<Props> = ({ storageType }) => {
  if (!storageType) return null;

  if (storageType === 'base64-fallback') {
    return (
      <Banner $tone="warn" role="status">
        <AlertTriangle size={18} aria-hidden="true" />
        <span>
          Cloud storage isn&apos;t configured — photos are stored inline (base64), which is slow and size-limited.
          Configure Cloudflare R2 before large shoots.
        </span>
      </Banner>
    );
  }

  return (
    <Banner $tone="ok" role="status">
      <ShieldCheck size={18} aria-hidden="true" />
      <span>Cloud storage healthy — photos are uploading to Cloudflare R2.</span>
    </Banner>
  );
};

export default StorageBanner;
