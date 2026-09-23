/**
 * "Make me a PDF of …" typed in the one composer is answered on the device: the
 * text — and the client name in it — is never sent to Swan Coach.
 */
import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceComposer from './WorkspaceComposer';
import { buildSlashItems } from './slashCommands';

vi.mock('../coach-assistant/CoachCommandCatalogSheet', () => ({ default: () => null }));
vi.mock('../coach-assistant/VoiceRecordingOverlay', () => ({ default: () => null }));

function mount(text: string, { made = true, noteMode = false } = {}) {
  const controller = {
    commandText: text, commandTextRef: createRef<HTMLTextAreaElement>(), commandFormRef: createRef<HTMLFormElement>(),
    commandBusy: false, selectedStatus: '', notebook: noteMode ? { active: true, saving: false, onToggle: vi.fn() } : null,
    clientPin: { clients: [], selectedClientId: null, loadingClients: false, onSelectClient: vi.fn() },
    setCommandText: vi.fn(), handleSubmit: vi.fn(), handleIntentSubmit: vi.fn(),
  };
  const model = {
    controller, catalog: { commands: [] }, isClientMode: false, runAction: vi.fn(), prefill: vi.fn(),
    requestPdf: vi.fn(() => made),
  };
  render(<MemoryRouter><WorkspaceComposer model={model as never} /></MemoryRouter>);
  const input = screen.getByRole('combobox', { name: noteMode ? 'Client note' : 'Message Swan Coach' });
  fireEvent.submit(input.closest('form')!);
  return { controller, model };
}

describe('a PDF ask stays on the device', () => {
  it('builds locally and clears the composer; nothing is sent to the coach', () => {
    const { controller, model } = mount("Make a PDF of Jesse Moreno's plan and progress");
    expect(model.requestPdf).toHaveBeenCalledWith("Make a PDF of Jesse Moreno's plan and progress");
    expect(controller.handleSubmit).not.toHaveBeenCalled();
    expect(controller.setCommandText).toHaveBeenCalledWith('');
  });

  it('when no client can be resolved the draft is kept so the coach can pick one and resend', () => {
    const { controller, model } = mount('make a pdf of her progress', { made: false });
    expect(model.requestPdf).toHaveBeenCalled();
    expect(controller.handleSubmit).not.toHaveBeenCalled();
    expect(controller.setCommandText).not.toHaveBeenCalled();
  });

  it('CONTROL: an ordinary message and a client note still go through the normal send', () => {
    expect(mount('Log bench 4x8 at 185').controller.handleSubmit).toHaveBeenCalledTimes(1);
    const note = mount('make a pdf of her progress', { noteMode: true });
    expect(note.controller.handleSubmit).toHaveBeenCalledTimes(1);
    expect(note.model.requestPdf).not.toHaveBeenCalled();
  });

  it('"/pdf" is in the command menu for staff and clients', () => {
    for (const staff of [true, false]) {
      const items = buildSlashItems('pdf', [], { staff, notebookAvailable: false });
      expect(items[0]).toMatchObject({ kind: 'action', id: 'pdf' });
    }
  });
});
