import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceComposer from './WorkspaceComposer';
vi.mock('../coach-assistant/CoachCommandCatalogSheet', () => ({ default: () => null }));
function mount() {
  const controller = {
    commandText: '/', commandTextRef: createRef<HTMLTextAreaElement>(), commandFormRef: createRef<HTMLFormElement>(),
    commandBusy: false, selectedStatus: '', clientPin: { clients: [], selectedClientId: null, loadingClients: false, onSelectClient: vi.fn() },
    setCommandText: vi.fn(), handleSubmit: vi.fn(), handleIntentSubmit: vi.fn(),
  };
  const model = { controller, catalog: { commands: [] }, isClientMode: false, runAction: vi.fn(), prefill: vi.fn() };
  render(<MemoryRouter><button>Before composer</button><WorkspaceComposer model={model as never} /></MemoryRouter>);
  return { controller, model, input: screen.getByRole('combobox', { name: 'Message Swan Coach' }) };
}
describe('R5 slash menu preserves native keyboard navigation', () => {
  it('Tab leaves the textarea without changing or running a command', async () => {
    const { input, controller, model } = mount();
    input.focus();
    await userEvent.tab();
    expect(screen.getByRole('combobox', { name: 'Client this chat is about' })).toHaveFocus();
    expect(controller.setCommandText).not.toHaveBeenCalled();
    expect(model.runAction).not.toHaveBeenCalled();
  });
  it('Shift+Tab leaves backwards and Enter remains the explicit pick', async () => {
    const { input, model } = mount();
    input.focus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Before composer' })).toHaveFocus();
    input.focus();
    fireEvent.submit(input.closest('form')!);
    expect(model.runAction).toHaveBeenCalledTimes(1);
  });
  it('composition Enter is not intercepted, including Safari keyCode 229', () => {
    const { input, controller, model } = mount();
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 });
    expect(model.runAction).not.toHaveBeenCalled();
    expect(controller.handleSubmit).not.toHaveBeenCalled();
  });
});
