/**
 * ============================================================================
 * FILE: MessagingPage.tsx
 * PURPOSE: Page wrapper for the Direct Messaging interface
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the full DM interface (conversation list +
 * message thread) using Crystalline Swan themed components.
 * HOW IT FITS IN THE APP: Lazy-loaded via UniversalDashboardLayout at /messages
 */
import React from 'react';
import { MessagingView } from '../components/Social/Messaging';

const MessagingPage: React.FC = () => <MessagingView />;

export default MessagingPage;
