/**
 * Smart label and hashtag assist for the SocialFeed composer.
 * Keeps the main composer fast while surfacing discovery tags users can tap.
 */

import React from 'react';
import { Hash, Sparkles } from 'lucide-react';
import type { SmartPostIntent } from '../utils/postIntentInference';
import {
  SmartAssistRow,
  SmartIntentPill,
  HashtagAssistGroup,
  HashtagAssistChip,
} from '../styles/CreatePostStyles';

interface CreatePostHashtagAssistProps {
  intent: SmartPostIntent;
  onAddHashtag: (hashtag: string) => void;
}

const CreatePostHashtagAssist: React.FC<CreatePostHashtagAssistProps> = ({
  intent,
  onAddHashtag,
}) => {
  if (!intent.displayLabel && intent.hashtags.length === 0) return null;

  return (
    <SmartAssistRow aria-label="Smart post labels and discovery tags">
      {intent.displayLabel && (
        <SmartIntentPill title={intent.reason}>
          <Sparkles size={14} />
          {intent.displayLabel}
        </SmartIntentPill>
      )}
      <HashtagAssistGroup>
        {intent.hashtags.map(hashtag => (
          <HashtagAssistChip
            key={hashtag}
            type="button"
            onClick={() => onAddHashtag(hashtag)}
            aria-label={`Add ${hashtag} hashtag`}
          >
            <Hash size={13} />
            {hashtag.slice(1)}
          </HashtagAssistChip>
        ))}
      </HashtagAssistGroup>
    </SmartAssistRow>
  );
};

export default React.memo(CreatePostHashtagAssist);
