/**
 * FILE: ProofFeedCard.tsx
 * PURPOSE: Rich social feed card for milestone posts generated from Progress Proof.
 * OWNER: Social Feed / Progress Proof
 * CONTRACT: Uses safe post content or optional progressProofData; no PII is sent out.
 */

import React from 'react';
import { BarChart3, ShieldCheck, Sparkles } from 'lucide-react';
import type { Post } from '../types/PostCardTypes';
import { CANONICAL_CHART_IDS } from '../../../../hooks/analytics/useClientProgressCharts.types';
import {
  ProofCaption,
  ProofCardShell,
  ProofFootnote,
  ProofHeader,
  ProofKicker,
  ProofLevelBadge,
  ProofMeterFill,
  ProofMeterTrack,
  ProofStat,
  ProofStatsGrid,
  ProofTitle,
} from './ProofFeedCard.styles';

interface ProofFeedData {
  level: string;
  populated: number;
  total: number;
  nextUnlock: string;
  caption: string;
}

const clampChartCount = (value: number, total: number) => (
  Math.max(0, Math.min(Number.isFinite(value) ? Math.round(value) : 0, total))
);

const deriveProofFeedData = (post: Post): ProofFeedData => {
  const content = post.content || '';
  const explicit = post.progressProofData;
  const level = explicit?.proofLevel
    || content.match(/progress proof level:\s*([a-z]+)/i)?.[1]
    || 'Milestone';
  const total = explicit?.totalCharts
    || Number(content.match(/(\d+)\s*\/\s*(\d+)\s*SwanStudios charts/i)?.[2])
    || CANONICAL_CHART_IDS.length; // single-sourced deck size (15), not a hardcoded 12 (G5)
  const populated = explicit?.populatedCharts
    || Number(content.match(/(\d+)\s*\/\s*\d+\s*SwanStudios charts/i)?.[1])
    || 0;
  const nextUnlock = explicit?.nextUnlock
    || content.match(/next unlock:\s*([^.#]+)/i)?.[1]?.trim()
    || (content.match(/full proof deck unlocked/i) ? 'Full deck unlocked' : 'Keep logging to unlock more proof');

  return {
    level,
    populated: clampChartCount(populated, total),
    total,
    nextUnlock,
    caption: explicit?.headline || content.split('\n').find(Boolean) || 'Verified SwanStudios milestone.',
  };
};

const ProofFeedCard: React.FC<{ post: Post }> = ({ post }) => {
  const proof = deriveProofFeedData(post);
  const percent = proof.total > 0 ? Math.round((proof.populated / proof.total) * 100) : 0;

  return (
    <ProofCardShell
      role="group"
      aria-label={`${proof.level} progress proof milestone`}
    >
      <ProofHeader>
        <div>
          <ProofKicker>
            <ShieldCheck size={14} aria-hidden="true" />
            Progress Proof
          </ProofKicker>
          <ProofTitle>{proof.caption}</ProofTitle>
        </div>
        <ProofLevelBadge>
          <Sparkles size={14} aria-hidden="true" />
          {proof.level}
        </ProofLevelBadge>
      </ProofHeader>

      <ProofMeterTrack aria-hidden="true">
        <ProofMeterFill $percent={percent} />
      </ProofMeterTrack>

      <ProofStatsGrid>
        <ProofStat>
          <dt>Verified charts</dt>
          <dd>{proof.populated} of {proof.total}</dd>
        </ProofStat>
        <ProofStat>
          <dt>Deck strength</dt>
          <dd>{percent}%</dd>
        </ProofStat>
      </ProofStatsGrid>

      <ProofCaption>
        <BarChart3 size={15} aria-hidden="true" /> {proof.nextUnlock}
      </ProofCaption>
      <ProofFootnote>
        Counted from saved SwanStudios workout and progress logs.
      </ProofFootnote>
    </ProofCardShell>
  );
};

export default ProofFeedCard;
