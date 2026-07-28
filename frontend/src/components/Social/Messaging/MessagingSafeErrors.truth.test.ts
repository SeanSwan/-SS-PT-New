import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('Messaging safe-error source contract', () => {
  it('keeps dashboard messaging from promoting raw transport/server errors to UI state', () => {
    const hookSource = source('./useMessaging.ts');
    const apiFetchSource = source('./messagingApiFetch.ts');

    expect(hookSource).toContain("import {");
    expect(hookSource).toContain('encodeMessagingPathSegment');
    expect(hookSource).toContain('createMessagingErrorState');
    expect(hookSource).toContain("from './messagingApiFetch'");
    expect(apiFetchSource).toContain("from '../../../services/api.service'");
    expect(apiFetchSource).toContain('MESSAGING_ERROR_MESSAGES.request');
    expect(apiFetchSource).not.toContain('localStorage.getItem');
    expect(apiFetchSource).not.toContain('Authorization');
    expect(apiFetchSource).not.toContain('Bearer ');
    expect(apiFetchSource).not.toContain('fetch(');
    expect(hookSource).not.toContain('`/conversations/${convId}/messages');
    expect(hookSource).not.toContain('`/conversations/${activeConversationId}/messages');
    expect(hookSource).not.toContain('err.message');
    expect(hookSource).not.toContain('API error');
    expect(hookSource).not.toContain('res.statusText');
    expect(apiFetchSource).not.toContain('res.statusText');
    expect(hookSource).not.toContain('throw new Error(err.message');
  });

  it('keeps the thread renderer behind the safe display helper', () => {
    const threadSource = source('./MessageThread.tsx');

    expect(threadSource).toContain('getSafeMessagingErrorMessage');
    expect(threadSource).toContain('{safeErrorMessage}');
    expect(threadSource).toContain('ErrorMessageText');
    expect(threadSource).toContain('LoadingMessageList');
    expect(threadSource).toContain('ReadReceiptWrap');
    expect(threadSource).toContain('PendingSpinnerIcon');
    expect(threadSource).not.toContain('style={{');
    expect(threadSource).not.toContain('style=');
    expect(threadSource).not.toContain('{error.message}');
  });

  it('centralizes approved user-facing messaging error copy', () => {
    const helperSource = source('./messagingSafeErrors.ts');

    expect(helperSource).toContain('MESSAGING_ERROR_MESSAGES');
    expect(helperSource).toContain('SAFE_MESSAGING_ERROR_MESSAGES');
    expect(helperSource).toContain('createMessagingErrorState');
    expect(helperSource).toContain('getSafeMessagingErrorMessage');
  });

  it('keeps attachment controls on 44px touch targets', () => {
    const styles = source('./MessageThread.styles.ts');
    const removeButtonBlock = styles.match(/export const AttachmentRemoveButton = styled\.button`([\s\S]*?)`;/)?.[1] || '';

    expect(removeButtonBlock).toContain('min-width: 44px;');
    expect(removeButtonBlock).toContain('min-height: 44px;');
  });
  it('keeps the extracted messaging files under the line cap', () => {
    [
      './useMessaging.ts',
      './useMessagingSocketEffects.ts',
      './useMessaging.helpers.ts',
      './useMessagingLifecycleEffects.ts',
      './messagingApiFetch.ts',
      './MessageThread.styles.ts',
      './MessageAttachmentList.tsx',
      './ConversationListPanel.tsx',
      './ConversationListPanel.styles.ts',
      './ConversationListPanel.groupThread.test.tsx',
      './GroupMessageBubble.tsx',
      './GroupMessageBubble.styles.ts',
      './MessageThread.groupIdentity.test.tsx',
    ].forEach((file) => {
      const lines = source(file).split(/\r?\n/).filter(Boolean).length;
      expect(lines, file).toBeLessThanOrEqual(300);
    });
  });
});
