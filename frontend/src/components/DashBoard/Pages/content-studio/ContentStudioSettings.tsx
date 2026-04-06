/**
 * ============================================================================
 * FILE: ContentStudioSettings.tsx
 * PURPOSE: API key configuration panel for Content Studio services
 * AUTHOR: Claude Opus 4.6 | CREATED: 2026-04-06
 * PHASE: 10 — Extracted from ContentStudioHub.tsx to meet 300-line max
 * ============================================================================
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const SettingsPage = styled.div`
  padding: 24px;
  max-width: 640px;
`;

const SettingsTitle = styled.h2`
  margin: 0 0 8px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-heading, #E0ECF4);
`;

const SettingsDesc = styled.p`
  margin: 0 0 24px;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.6);
  line-height: 1.5;
`;

const FieldGroup = styled.div`
  margin-bottom: 20px;
`;

const FieldLabel = styled.label`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 6px;
`;

const FieldHint = styled.div`
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 8px;
`;

const ApiKeyInput = styled.input`
  width: 100%;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 10px;
  padding: 0.65rem 1rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  min-height: 44px;
  transition: border-color 0.3s ease;

  &::placeholder { color: rgba(224, 236, 244, 0.3); }

  &:focus {
    outline: none;
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
  }
`;

const SaveButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 14px;
  height: 44px;
  padding: 0 24px;
  border-radius: 8px;
  background: var(--bg-primary, #002060);
  color: #E0ECF4;
  border: 1px solid rgba(139, 92, 246, 0.3);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  &:hover {
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.5);
    transform: translateY(-1px);
  }

  &:active { transform: translateY(0); }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  font-size: 0.8rem;
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  background: ${({ $type }) =>
    $type === 'success' ? 'rgba(96, 192, 240, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
  border-left: 3px solid ${({ $type }) =>
    $type === 'success' ? '#60C0F0' : '#8B5CF6'};
  color: var(--text-primary, #E0ECF4);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
interface ContentStudioSettingsProps {
  serviceConfig: Record<string, boolean>;
  onRefresh: () => Promise<void>;
}

const ContentStudioSettings: React.FC<ContentStudioSettingsProps> = ({ serviceConfig, onRefresh }) => {
  const { authAxios } = useAuth();
  const [seedanceKey, setSeedanceKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [blotatoKey, setBlotatoKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const keys: Record<string, string> = {};
      if (seedanceKey.trim()) keys.seedance = seedanceKey.trim();
      if (elevenLabsKey.trim()) keys.elevenlabs = elevenLabsKey.trim();
      if (blotatoKey.trim()) keys.blotato = blotatoKey.trim();

      if (Object.keys(keys).length === 0) {
        setStatus({ type: 'error', msg: 'Enter at least one API key to save.' });
        setSaving(false);
        return;
      }

      await authAxios.put('/api/content-studio/api-keys', { keys });
      setStatus({ type: 'success', msg: 'API keys saved. Services are now unlocking.' });
      setSeedanceKey('');
      setElevenLabsKey('');
      setBlotatoKey('');
      await onRefresh();
    } catch {
      setStatus({ type: 'error', msg: 'Failed to save API keys. Check your connection.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPage>
      <SettingsTitle>Content Studio Configuration</SettingsTitle>
      <SettingsDesc>
        Add API keys to unlock premium services. Each service activates
        independently — you don't need all keys at once.
      </SettingsDesc>

      <FieldGroup>
        <FieldLabel>Seedance 2.0 / Higgsfield API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.seedance ? '✓ Configured' : 'Get your key from higgsfield.ai'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={seedanceKey}
          onChange={(e) => setSeedanceKey(e.target.value)}
          placeholder={serviceConfig.seedance ? '••••••••••••••••' : 'hf-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>ElevenLabs API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.elevenlabs ? '✓ Configured' : 'Get your key from elevenlabs.io'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={elevenLabsKey}
          onChange={(e) => setElevenLabsKey(e.target.value)}
          placeholder={serviceConfig.elevenlabs ? '••••••••••••••••' : 'xi-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <FieldGroup>
        <FieldLabel>Blotato API Key</FieldLabel>
        <FieldHint>
          {serviceConfig.blotato ? '✓ Configured' : 'Get your key from blotato.com'}
        </FieldHint>
        <ApiKeyInput
          type="password"
          value={blotatoKey}
          onChange={(e) => setBlotatoKey(e.target.value)}
          placeholder={serviceConfig.blotato ? '••••••••••••••••' : 'blt-...'}
          autoComplete="off"
        />
      </FieldGroup>

      <SaveButton onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save API Keys'}
      </SaveButton>

      {status && <StatusMsg $type={status.type}>{status.msg}</StatusMsg>}
    </SettingsPage>
  );
};

export default ContentStudioSettings;
