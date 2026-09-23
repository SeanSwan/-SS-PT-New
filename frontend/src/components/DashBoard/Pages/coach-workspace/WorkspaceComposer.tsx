/**
 * Blueprint: WorkspaceComposer
 * Parent: ConversationColumn. ONE input for everything (the legacy page had two:
 * an intent bar and a dock). Enter sends, Shift+Enter breaks a line, "/" opens
 * the command menu, the chip scopes the chat to a client BY ID, the mic dictates
 * or records, the speaker toggles spoken replies. Client-note mode (the
 * notebook) reuses the same field and says so. Nothing here writes data: sends
 * go through the controller, and any write still stops at the approval sheet.
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, AtSign, Mic, ClipboardList, Slash, Volume2, VolumeX } from 'lucide-react';
import VoiceRecordingOverlay from '../coach-assistant/VoiceRecordingOverlay';
import CoachCommandCatalogSheet from '../coach-assistant/CoachCommandCatalogSheet';
import SlashMenu, { slashOptionId } from './SlashMenu';
import { ComposerDock } from './CoachWorkspace.conversation.styles';
import { buildSlashItems, slashQuery, type SlashItem } from './slashCommands';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

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
  const text = controller.commandText;
  // The exact registry type the operator picked, kept only while the text still
  // begins with what was picked — rewriting the message drops back to the classifier.
  const [picked, setPicked] = useState<{ type: string; prefix: string } | null>(null);
  const pickedType = picked && text.trimStart().startsWith(picked.prefix) ? picked.type : null;
  const setPickedType = (type: string | null, prompt = '') => setPicked(type ? { type, prefix: prompt.trim().slice(0, 16) } : null);
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
  useEffect(() => { if (!text.trim()) setPicked(null); }, [text]);
  useEffect(() => { autogrow(controller.commandTextRef.current, Boolean(text)); }, [controller.commandTextRef, text]);

  const pick = (item: SlashItem) => {
    if (item.kind === 'action') { setPickedType(null); model.runAction(item.id); return; }
    if (item.instant) { setPickedType(null); model.sendCommand(item.prompt, item.commandType); return; }
    setPickedType(item.commandType, item.prompt);
    model.prefill(item.prompt);
  };

  const submit = (event: React.FormEvent) => {
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
    if (menuOpen && items.length) {
      if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((i) => (i + 1) % items.length); return; }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((i) => (i - 1 + items.length) % items.length); return; }
      if (event.key === 'Tab') { event.preventDefault(); pick(items[activeIndex]); return; }
    }
    if (menuOpen && event.key === 'Escape') { event.preventDefault(); setMenuDismissed(true); return; }
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    if (event.shiftKey && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  const openSlash = () => {
    if (!text.startsWith('/')) controller.setCommandText(`/${text}`);
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
      <p className="ws-hint" id="ws-composer-hint">
        Enter to send · Shift+Enter for a new line · / for commands · Nothing saves until you approve it.
      </p>
      <CoachCommandCatalogSheet
        open={model.catalogOpen}
        onClose={() => {
          model.setCatalogOpen(false);
          window.setTimeout(() => controller.commandTextRef.current?.focus({ preventScroll: true }), 0);
        }}
        onUsePrompt={(prompt) => model.prefill(prompt)}
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
