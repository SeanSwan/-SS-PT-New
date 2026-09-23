/**
 * Blueprint: WorkspaceComposer
 * Parent: ConversationColumn. ONE input for everything (the legacy page had two:
 * an intent bar and a dock). Enter sends, Shift+Enter breaks a line, "/" opens
 * the command menu, the chip scopes the chat to a client BY ID, the mic dictates
 * or records, the speaker toggles spoken replies. Client-note mode (the
 * notebook) reuses the same field and says so. Sends go through the controller:
 * chats are saved to the thread, a note saves to the client profile, and a
 * command that needs approval stops at the approval sheet. One live status line
 * carries what the controller reports (note saved / not saved, voice, busy).
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, AtSign, Mic, ClipboardList, Slash, Volume2, VolumeX } from 'lucide-react';
import VoiceRecordingOverlay from '../coach-assistant/VoiceRecordingOverlay';
import CoachCommandCatalogSheet from '../coach-assistant/CoachCommandCatalogSheet';
import SlashMenu, { slashOptionId } from './SlashMenu';
import { ComposerDock } from './CoachWorkspace.conversation.styles';
import { buildSlashItems, pickableExample, slashQuery, type SlashItem } from './slashCommands';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';
import { workspaceStatus } from './workspaceStatus';

type Props = { model: CoachWorkspaceModel };

function autogrow(el: HTMLTextAreaElement | null, hasText: boolean) {
  if (!el) return;
  el.style.height = '';
  if (!hasText) return;
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

const WorkspaceComposer: React.FC<Props> = ({ model }) => {
  const { controller, catalog, isClientMode } = model;
  const menuId = useId();
  const notebook = controller.notebook;
  const noteMode = Boolean(notebook?.active);
  const busy = controller.commandBusy || Boolean(notebook?.saving);
  const status = workspaceStatus(controller.selectedStatus);
  const text = controller.commandText;
  // The exact registry type the operator picked travels ONLY with the unedited,
  // slot-free example; any edit drops the pick for good (pickableExample).
  const [picked, setPicked] = useState<{ type: string; exact: string } | null>(null);
  const pickedType = picked && text.trim() === picked.exact ? picked.type : null;
  const setPickedType = (type: string | null, prompt = '') => {
    const exact = type ? pickableExample(prompt) : null;
    setPicked(type && exact ? { type, exact } : null);
  };
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);

  const query = noteMode ? null : slashQuery(text);
  const items = useMemo(
    () => (query === null ? [] : buildSlashItems(query, catalog.commands, { staff: !isClientMode, notebookAvailable: Boolean(notebook?.clientPinned) })),
    [catalog.commands, isClientMode, notebook?.clientPinned, query],
  );
  const menuOpen = query !== null && !menuDismissed;

  useEffect(() => { setActiveIndex(0); }, [query]);
  useEffect(() => { if (query === null) setMenuDismissed(false); }, [query]);
  useEffect(() => { if (picked && text.trim() !== picked.exact) setPicked(null); }, [picked, text]);
  useEffect(() => { autogrow(controller.commandTextRef.current, Boolean(text)); }, [controller.commandTextRef, text]);

  const pick = (item: SlashItem) => {
    if (item.kind === 'action') { setPickedType(null); model.runAction(item.id); return; }
    // The composer holds only the "/query" here, so it is cleared before the instant send.
    if (item.instant) { setPickedType(null); controller.setCommandText(''); model.sendCommand(item.prompt, item.commandType); return; }
    setPickedType(item.commandType, item.prompt);
    model.prefill(item.prompt);
  };

  const submit = (event: React.FormEvent) => {
    // requestSubmit() ignores the disabled send button: a second send while one is in
    // flight would abort the first inside useAIChat (review #15).
    if (busy) { event.preventDefault(); return; }
    if (menuOpen && items[activeIndex]) { event.preventDefault(); pick(items[activeIndex]); return; }
    if (pickedType && !noteMode) {
      event.preventDefault();
      const type = pickedType;
      setPickedType(null);
      void controller.handleIntentSubmit(text, type);
      return;
    }
    void controller.handleSubmit(event);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // An IME is choosing text: its arrows and Enter are not ours (review #10). Safari's
    // final composition Enter arrives with isComposing=false but keyCode 229 (F-18/F-19).
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;
    if (menuOpen && items.length) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((i) => (i + 1) % items.length); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((i) => (i - 1 + items.length) % items.length); return; }
      // Tab and Shift+Tab retain native focus navigation; Enter explicitly picks.
    }
    if (menuOpen && event.key === 'Escape') { event.preventDefault(); setMenuDismissed(true); return; }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (event.shiftKey && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const openSlash = () => {
    // A draft is never turned into "/draft text" (which also closed the menu).
    if (text.trim() && !text.startsWith('/')) { model.setCatalogOpen(true); return; }
    if (!text.startsWith('/')) controller.setCommandText('/');
    setMenuDismissed(false);
    window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
  };

  const pin = controller.clientPin;
  const voiceLabel = controller.voiceActive
    ? (controller.voiceCaptureMode === 'recorder' ? 'Voice recorder open' : 'Listening — tap to stop')
    : (controller.voiceCaptureMode === 'recorder' ? 'Record and transcribe' : 'Dictate');

  return (
    <ComposerDock>
      {controller.workflowReturnTo && controller.workflowReturnLabel ? (
        <Link className="ws-return" to={controller.workflowReturnTo}>
          <ArrowLeft size={15} aria-hidden="true" /> {controller.workflowReturnLabel}
        </Link>
      ) : null}
      <form className="ws-composer-card" ref={controller.commandFormRef} onSubmit={submit} aria-label="Talk to Swan Coach">
        {menuOpen ? (
          <SlashMenu id={menuId} items={items} activeIndex={activeIndex} onPick={pick} onHover={setActiveIndex} />
        ) : null}
        <textarea
          ref={controller.commandTextRef}
          value={text}
          rows={1}
          onChange={(event) => controller.setCommandText(event.target.value)}
          onKeyDown={onKeyDown}
          readOnly={Boolean(notebook?.saving)}
          placeholder={noteMode ? 'Dictate or type a client note…' : isClientMode ? 'Ask your coach…' : 'Ask, log, or plan…'}
          aria-label={noteMode ? 'Client note' : 'Message Swan Coach'}
          role="combobox"
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? menuId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={menuOpen && items.length ? slashOptionId(menuId, activeIndex) : undefined}
        />
        <div className="ws-toolbar">
          {!isClientMode ? (
            <label className="ws-scope" data-locked={pin.selectedClientId ? 'true' : 'false'}>
              <AtSign size={14} aria-hidden="true" />
              <select
                aria-label="Client this chat is about"
                value={pin.selectedClientId ?? ''}
                disabled={pin.loadingClients}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  pin.onSelectClient(Number.isSafeInteger(next) && next > 0 ? next : null);
                }}
              >
                <option value="">{pin.loadingClients ? 'Loading clients…' : 'No client (general)'}</option>
                {pin.clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
              </select>
            </label>
          ) : null}
          {noteMode && notebook ? (
            <button type="button" className="ws-mode" onClick={notebook.onToggle} aria-label="Leave client-note mode">
              <ClipboardList size={14} aria-hidden="true" /> Client note · saves to profile
            </button>
          ) : null}
          <span className="ws-grow" />
          <button type="button" className="ws-tool" aria-label="Commands" onClick={openSlash} disabled={noteMode}>
            <Slash size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="ws-tool"
            aria-label={controller.voiceReplyEnabled ? 'Spoken replies on' : 'Spoken replies off'}
            aria-pressed={Boolean(controller.voiceReplyEnabled)}
            onClick={controller.toggleVoiceReplies}
          >
            {controller.voiceReplyEnabled ? <Volume2 size={17} aria-hidden="true" /> : <VolumeX size={17} aria-hidden="true" />}
          </button>
          <button
            type="button"
            className="ws-tool"
            aria-label={voiceLabel}
            aria-pressed={controller.voiceActive}
            data-live={controller.voiceActive ? 'true' : undefined}
            disabled={!controller.voiceSupported || busy}
            title={controller.voiceSupported ? voiceLabel : 'Voice is not available in this browser'}
            onClick={controller.handleVoice}
          >
            <Mic size={18} aria-hidden="true" />
          </button>
          <button
            type="submit"
            className="ws-send"
            disabled={busy || !text.trim()}
            aria-label={noteMode ? 'Save client note' : busy ? 'Sending to Swan Coach' : 'Send to Swan Coach'}
          >
            <ArrowUp size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
      <p className="ws-status" role="status" aria-live="polite" data-tone={status?.tone}>{model.scheduleAskStatus ?? status?.text ?? ''}</p>
      <p className="ws-hint" id="ws-composer-hint">
        {noteMode
          ? 'Enter saves this note to the client profile · Shift+Enter for a new line'
          : 'Enter to send · Shift+Enter for a new line · / for commands · Chats are saved; some actions ask you to approve first'}
      </p>
      <CoachCommandCatalogSheet
        open={model.catalogOpen}
        onClose={() => {
          model.setCatalogOpen(false);
          window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
        }}
        onUsePrompt={(prompt) => model.writeUnderDraft(prompt)}
      />
      {controller.voiceOverlay?.isOpen ? (
        <VoiceRecordingOverlay
          isOpen={controller.voiceOverlay.isOpen}
          onClose={controller.voiceOverlay.onClose}
          onEditTranscript={controller.voiceOverlay.onEditTranscript}
          onTranscribed={controller.voiceOverlay.onTranscribed}
        />
      ) : null}
    </ComposerDock>
  );
};

export default WorkspaceComposer;
