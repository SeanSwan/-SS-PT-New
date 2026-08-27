/**
 * ShareProofButton.tsx — Zone 3 "echo" of the Post-Save Handoff (share stub, Slice 1).
 * v1: navigator.share → clipboard fallback + analytics event. Owner-only (client-self / admin-self):
 * no client data leaves through a trainer's device. Pro-branded export is the next-slice seam.
 */
import React, { useState } from 'react';
import { ShareButton, ShareMicrocopy, ShareNote } from './PostSaveHandoff.styles';
import type { ShareEligibility } from './workoutHandoff.types';

interface ShareProofButtonProps {
  share: ShareEligibility;
  exerciseName: string;
  todayE1rm: number | null;
  pr: boolean;
  onEvent?: (event: string, payload?: Record<string, unknown>) => void;
}

const ShareProofButton: React.FC<ShareProofButtonProps> = ({ share, exerciseName, todayE1rm, pr, onEvent }) => {
  const [copied, setCopied] = useState(false);

  // Fail-CLOSED double-guard (defense-in-depth): share only when the server says eligible AND
  // the reason is identity-backed ownership. A miswired flag alone can't leak a client's data
  // off a trainer's device. Mirrors the NBA card's double-guard.
  if (!(share?.eligible && share?.reason === 'owner')) {
    return <ShareNote>Sharing is available to the client.</ShareNote>;
  }

  // "New best" (not "personal best"): the pr flag is windowed to recent sessions, not all-time.
  const shareText = pr && todayE1rm
    ? `New best on ${exerciseName}: ${todayE1rm} lb estimated 1-rep max. Logged on SwanStudios.`
    : `Logged a ${exerciseName} session on SwanStudios.`;

  // Acquisition: the link carries the owner's signed referral code so a friend who signs up from
  // it is attributed to them. No code (secret unset) → plain homepage link; the share still works.
  const shareUrl = (() => {
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      if (!origin) return undefined;
      return share.referralCode ? `${origin}/?ref=${encodeURIComponent(share.referralCode)}` : `${origin}/`;
    } catch { return undefined; }
  })();

  const handleShare = async () => {
    onEvent?.('proof_share_tapped', { pr, referral: !!share.referralCode });
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share(shareUrl ? { text: shareText, url: shareUrl } : { text: shareText });
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to clipboard */
    }
    try {
      await navigator.clipboard?.writeText(shareUrl ? `${shareText} ${shareUrl}` : shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — no-op; the button simply does nothing harmful */
    }
  };

  return (
    <>
      <ShareButton type="button" onClick={handleShare}>
        {copied ? 'Copied to clipboard' : 'Share this win'}
      </ShareButton>
      <ShareMicrocopy>Branded proof cards — coming soon for Pro.</ShareMicrocopy>
    </>
  );
};

export default ShareProofButton;
