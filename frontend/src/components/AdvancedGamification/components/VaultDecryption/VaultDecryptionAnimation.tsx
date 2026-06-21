/**
 * FILE: VaultDecryptionAnimation.tsx
 * PURPOSE: Dormant loot-drop reveal animation for future vault rewards.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gift, Lock, Sparkles, Zap } from 'lucide-react';
import type { VaultDecryptionAnimationProps } from './VaultDecryptionTypes';
import {
  CloseBtn,
  DecryptBar,
  DecryptFill,
  DecryptProgress,
  HexStream,
  LockIcon,
  Particle,
  ProgressLabel,
  RarityBadge,
  RewardCard,
  RewardDescription,
  RewardName,
  VaultContainer,
  VaultLock,
  VaultOverlay,
  XpBonusTag,
} from './VaultDecryptionStyles';

function generateHexData(): string {
  const chars = '0123456789ABCDEF';
  let hex = '';

  for (let i = 0; i < 400; i += 1) {
    hex += chars[Math.floor(Math.random() * 16)];
    if (i % 2 === 1) hex += ' ';
    if (i % 32 === 31) hex += '\n';
  }

  return hex + hex;
}

function generateParticles(count: number): Array<{ x: number; y: number; delay: number }> {
  return Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 300,
    y: (Math.random() - 0.5) * 300,
    delay: Math.random() * 0.3,
  }));
}

const VaultDecryptionAnimation: React.FC<VaultDecryptionAnimationProps> = ({
  drop,
  isVisible,
  onComplete,
  onClose,
}) => {
  const [phase, setPhase] = useState<'decrypting' | 'revealed'>('decrypting');
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hexData = useMemo(() => generateHexData(), []);
  const particles = useMemo(() => generateParticles(16), []);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isVisible) {
      clearTimer();
      completedRef.current = false;
      setPhase('decrypting');
      setProgress(0);
      return undefined;
    }

    const duration = Math.max(drop.decryptionTime * 1000, 250);
    const step = 50;
    const increment = (step / duration) * 100;
    completedRef.current = false;

    intervalRef.current = setInterval(() => {
      setProgress((previous) => {
        const next = previous + increment;

        if (next >= 100) {
          clearTimer();
          setPhase('revealed');

          if (!completedRef.current) {
            completedRef.current = true;
            onComplete();
          }

          return 100;
        }

        return next;
      });
    }, step);

    return clearTimer;
  }, [clearTimer, drop.decryptionTime, isVisible, onComplete]);

  useEffect(() => {
    if (!isVisible || phase !== 'revealed') return undefined;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isVisible, onClose, phase]);

  const handleCollect = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isVisible) return null;

  return (
    <VaultOverlay $visible={isVisible} role="dialog" aria-modal="true" aria-label="Vault reward decryption">
      <VaultContainer>
        <VaultLock $phase={phase} $color={drop.rarityColor}>
          {phase === 'decrypting' && (
            <HexStream $color={drop.rarityColor} data-hex={hexData} />
          )}

          <LockIcon $decrypting={phase === 'decrypting'} $color={drop.rarityColor}>
            {phase === 'decrypting' ? <Lock aria-hidden /> : <Gift aria-hidden />}
          </LockIcon>

          {phase === 'revealed' && particles.map((particle, index) => (
            <Particle
              key={`${particle.x}-${particle.y}-${index}`}
              $color={drop.glowColor}
              $x={particle.x}
              $y={particle.y}
              $delay={particle.delay}
            />
          ))}
        </VaultLock>

        {phase === 'decrypting' && (
          <DecryptProgress>
            <ProgressLabel $color={drop.rarityColor} aria-live="polite">
              DECRYPTING... {Math.floor(progress)}%
            </ProgressLabel>
            <DecryptBar>
              <DecryptFill $progress={progress} $color={drop.rarityColor} />
            </DecryptBar>
          </DecryptProgress>
        )}

        {phase === 'revealed' && (
          <>
            <RewardCard $rarity={drop.rarity} $color={drop.rarityColor}>
              <RarityBadge $color={drop.rarityColor}>{drop.rarityLabel}</RarityBadge>
              <RewardName>{drop.item.name}</RewardName>
              <RewardDescription>{drop.item.description}</RewardDescription>

              {drop.xpBonus > 0 && (
                <XpBonusTag $color={drop.rarityColor}>
                  <Zap size={16} aria-hidden />
                  +{drop.xpBonus} XP Bonus
                </XpBonusTag>
              )}
            </RewardCard>

            <CloseBtn type="button" onClick={handleCollect}>
              <Sparkles size={16} aria-hidden />
              Collect
            </CloseBtn>
          </>
        )}
      </VaultContainer>
    </VaultOverlay>
  );
};

VaultDecryptionAnimation.displayName = 'VaultDecryptionAnimation';

export default VaultDecryptionAnimation;
