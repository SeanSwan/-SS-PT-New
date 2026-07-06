/**
 * CreateEventForm — new passcode gallery
 * ======================================
 * Collapsible form to create an event/gallery. name + passcode required.
 * The passcode is shown as plain text (it is a shareable access code the admin
 * hands to clients, not a private secret) so the operator can verify it.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, Lock, Plus } from 'lucide-react';
import { EMPTY_EVENT_DRAFT, type GalleryEvent, type NewEventDraft } from '../types';
import {
  ErrorText, Field, FieldRow, GhostButton, HelperText, Input, Panel, PrimaryButton, SectionTitle, Textarea,
} from '../styles';
import ToggleField from './ToggleField';

interface Props {
  onCreate: (draft: NewEventDraft) => Promise<GalleryEvent>;
  onCreated?: (event: GalleryEvent) => void;
}

const CreateEventForm: React.FC<Props> = ({ onCreate, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NewEventDraft>(EMPTY_EVENT_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof NewEventDraft>(key: K, value: NewEventDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!draft.name.trim() || !draft.password.trim()) {
      setError('Gallery name and passcode are both required.');
      return;
    }
    setSaving(true);
    try {
      const created = await onCreate(draft);
      setDraft(EMPTY_EVENT_DRAFT);
      setOpen(false);
      onCreated?.(created);
    } catch (err) {
      setError((err as { message?: string })?.message || 'Failed to create gallery.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel>
      <Header type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <SectionTitle style={{ margin: 0 }}>
          <Plus size={18} aria-hidden="true" /> New Gallery
        </SectionTitle>
        <Chevron $open={open} size={18} aria-hidden="true" />
      </Header>

      {open && (
        <Form onSubmit={submit}>
          <Field>
            Gallery name *
            <Input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Anaheim Cup — U14 Finals" required />
          </Field>
          <FieldRow>
            <Field>
              Sport / type
              <Input value={draft.sport} onChange={(e) => set('sport', e.target.value)} placeholder="Basketball" />
            </Field>
            <Field>
              Event date
              <Input type="date" value={draft.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
            </Field>
          </FieldRow>
          <Field>
            Location
            <Input value={draft.location} onChange={(e) => set('location', e.target.value)} placeholder="Anaheim, CA" />
          </Field>
          <Field>
            Passcode *
            <Input value={draft.password} onChange={(e) => set('password', e.target.value)} placeholder="Shareable access code" required />
          </Field>
          <HelperText>
            <Lock size={12} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Clients enter this passcode (plus their email) to unlock the gallery.
          </HelperText>
          <Field>
            Description
            <Textarea value={draft.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional note shown on the gallery." />
          </Field>
          <ToggleField
            label="Publish immediately"
            hint="Off = save as a draft only you can see."
            checked={draft.isPublished}
            onChange={(v) => set('isPublished', v)}
          />
          {error && <ErrorText role="alert">{error}</ErrorText>}
          <Actions>
            <GhostButton type="button" onClick={() => setOpen(false)} disabled={saving}>Cancel</GhostButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create Gallery'}</PrimaryButton>
          </Actions>
        </Form>
      )}
    </Panel>
  );
};

const Header = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);
`;

const Chevron = styled(ChevronDown)<{ $open: boolean }>`
  transition: transform 0.2s ease;
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  color: var(--text-muted, #8fa3b8);
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 1rem;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.25rem;
`;

export default CreateEventForm;
