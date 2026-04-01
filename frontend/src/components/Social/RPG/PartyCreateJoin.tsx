/**
 * ┌─── SUB-COMPONENT: PartyCreateJoin ─────────────────────────┐
 * │ PARENT: SocialFeed sidebar                                  │
 * │ PURPOSE: Create or join a party via invite code             │
 * │ Props: { onCreate, onJoin }                                 │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Create] → POST /api/social/parties → shows party           │
 * │ [Join] → POST /api/social/parties/join/:code → shows party  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { Plus, LogIn } from 'lucide-react';

interface PartyCreateJoinProps {
  onCreate: (name: string) => Promise<any>;
  onJoin: (code: string) => Promise<boolean>;
}

const PartyCreateJoin: React.FC<PartyCreateJoinProps> = memo(({ onCreate, onJoin }) => {
  const [mode, setMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (name.trim().length < 2) return setError('Name must be at least 2 characters');
    setLoading(true);
    try {
      await onCreate(name.trim());
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (code.trim().length < 4) return setError('Enter a valid invite code');
    setLoading(true);
    try {
      await onJoin(code.trim());
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (mode === 'idle') {
    return (
      <IdleWrap>
        <IdleBtn onClick={() => setMode('create')}>
          <Plus size={14} /> Create Party
        </IdleBtn>
        <IdleBtn onClick={() => setMode('join')}>
          <LogIn size={14} /> Join Party
        </IdleBtn>
      </IdleWrap>
    );
  }

  return (
    <FormWrap>
      {mode === 'create' ? (
        <>
          <FormInput
            placeholder="Party name..."
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            maxLength={60}
          />
          <FormBtn onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create'}
          </FormBtn>
        </>
      ) : (
        <>
          <FormInput
            placeholder="Invite code..."
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            maxLength={8}
          />
          <FormBtn onClick={handleJoin} disabled={loading}>
            {loading ? 'Joining...' : 'Join'}
          </FormBtn>
        </>
      )}
      {error && <ErrorText>{error}</ErrorText>}
      <CancelBtn onClick={() => { setMode('idle'); setError(''); }}>Cancel</CancelBtn>
    </FormWrap>
  );
});

PartyCreateJoin.displayName = 'PartyCreateJoin';
export default PartyCreateJoin;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const IdleWrap = styled.div`
  display: flex;
  gap: 8px;
  margin: 12px 0;
`;

const IdleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  padding: 10px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  justify-content: center;
  transition: border-color 0.2s ease;

  &:hover { border-color: var(--accent-primary, #60C0F0); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const FormWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
`;

const FormInput = styled.input`
  padding: 10px 12px;
  min-height: 40px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 8px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  outline: none;

  &:focus { border-color: var(--accent-primary, #60C0F0); }
  &::placeholder { color: var(--text-muted, rgba(224, 236, 244, 0.35)); }
`;

const FormBtn = styled.button`
  padding: 10px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) { opacity: 0.9; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #ef4444;
`;

const CancelBtn = styled.button`
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
`;
