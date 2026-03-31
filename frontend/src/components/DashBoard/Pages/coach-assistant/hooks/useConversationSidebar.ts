/**
 * ============================================================================
 * FILE: useConversationSidebar.ts
 * PURPOSE: State management for conversation history sidebar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-30
 * ============================================================================
 */

import { useState, useCallback, useMemo } from 'react';
import type { ConversationSummary } from '../../../../../hooks/useAIChat';

interface UseConversationSidebarOptions {
  conversations: ConversationSummary[];
}

export function useConversationSidebar({ conversations }: UseConversationSidebarOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Filter conversations by search query (client-side)
  const filteredConversations = useMemo(() => {
    const list = Array.isArray(conversations) ? conversations : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(c =>
      (c.title?.toLowerCase().includes(q)) ||
      (c.context?.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  // Group conversations by date for display
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: ConversationSummary[] }[] = [
      { label: 'Today', items: [] },
      { label: 'Yesterday', items: [] },
      { label: 'This Week', items: [] },
      { label: 'Older', items: [] },
    ];

    for (const conv of filteredConversations) {
      const date = new Date(conv.lastMessageAt || conv.createdAt);
      if (date >= today) {
        groups[0].items.push(conv);
      } else if (date >= yesterday) {
        groups[1].items.push(conv);
      } else if (date >= weekAgo) {
        groups[2].items.push(conv);
      } else {
        groups[3].items.push(conv);
      }
    }

    // Only return groups that have items
    return groups.filter(g => g.items.length > 0);
  }, [filteredConversations]);

  return useMemo(() => ({
    isOpen,
    searchQuery,
    filteredConversations,
    groupedConversations,
    toggle,
    open,
    close,
    setSearchQuery,
  }), [isOpen, searchQuery, filteredConversations, groupedConversations, toggle, open, close]);
}
