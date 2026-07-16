# Legacy Messaging Island Archive - 2026-07-16

## Purpose

This companion manifest records the closed seven-file legacy Messaging implementation moved during the pre-launch audit. Original paths remain recoverable; no source file was permanently deleted.

## Evidence

- Every role dashboard mounts `MessagingPage` at its `/messages` child route through `UniversalDashboardLayout.routes.tsx`.
- `MessagingPage.tsx` renders `components/Social/Messaging/MessagingView.tsx`.
- Exact path, symbol, and import searches found no runtime consumer for `components/Messaging/`.
- The only external references were two source-reading tests; those lists were narrowed with the archive.

## Exact file inventory

| Original path | Archived path | Classification |
| --- | --- | --- |
| `frontend/src/components/Messaging/ChatHeader.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/ChatHeader.tsx` | dependency used only by the legacy ChatWindow |
| `frontend/src/components/Messaging/ChatWindow.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/ChatWindow.tsx` | unmounted legacy messaging root |
| `frontend/src/components/Messaging/ConversationList.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/ConversationList.tsx` | unmounted legacy conversation list |
| `frontend/src/components/Messaging/Message.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/Message.tsx` | dependency used only by the legacy ChatWindow |
| `frontend/src/components/Messaging/MessageInput.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/MessageInput.tsx` | dependency used only by the legacy ChatWindow |
| `frontend/src/components/Messaging/MessageSkeleton.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/MessageSkeleton.tsx` | dependency used only by the legacy ChatWindow |
| `frontend/src/components/Messaging/NewConversationModal.tsx` | `archive/pending-deletion/2026-07-16/frontend/src/components/Messaging/NewConversationModal.tsx` | dependency used only by the legacy ConversationList |

## Canonical surface retained

`frontend/src/pages/MessagingPage.tsx` and the complete `frontend/src/components/Social/Messaging/` implementation remain in place.

## Restore procedure

Restore only after proving a distinct mounted product need and reconnecting the complete legacy component chain, then rerun messaging route contracts, typecheck, build, full frontend tests, lint, and browser smoke.

Permanent deletion requires a separate fresh reference check and Sean's explicit approval.
