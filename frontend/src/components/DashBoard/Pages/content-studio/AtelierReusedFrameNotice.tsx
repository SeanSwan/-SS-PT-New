/**
 * What you carried in — shown, not implied.
 *
 * A Motion button bound to an asset you cannot see is a button claiming to know which
 * picture you meant. This strip is the answer to "which frame is this about to animate",
 * and it says out loud that composing a new brief replaces it, because that is the one
 * surprise this handoff could otherwise spring.
 */

import React from 'react';
import type { ReusedFrame } from './AtelierCompose.types';
import { Notice } from './AtelierCompose.styles';

const ReusedFrameNotice: React.FC<{ frame: ReusedFrame }> = ({ frame }) => (
  <Notice $tone="unproven" role="status">
    {frame.previewUrl && (
      <img
        src={frame.previewUrl}
        alt={frame.prompt || 'Frame carried in from your assets'}
        style={{ width: 64, height: 36, objectFit: 'cover', borderRadius: 4, marginRight: 8, verticalAlign: 'middle' }}
      />
    )}
    Reusing a saved frame{frame.prompt ? ` — “${frame.prompt}”` : ''}. Motion will animate these exact bytes;
    composing a new brief replaces it.
  </Notice>
);

export default ReusedFrameNotice;
