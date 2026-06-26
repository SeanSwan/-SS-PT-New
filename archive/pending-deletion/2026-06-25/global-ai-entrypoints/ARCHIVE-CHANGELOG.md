# Global AI Entrypoints Archive

Archived on 2026-06-25. Updated on 2026-06-26 to include the inline `AICommandBar` retirement.

## Why

The global bottom-right AI launcher is retired. Swan Coach Command Center is the active AI surface for dashboard roles, so the separate floating OmniTerminal/AIAssistant drawer path should not mount in the app.

## Runtime Disconnect

- Removed the shared dashboard shell import/render path for `OmniTerminal` and `OmniTerminalFAB`.
- Removed the dashboard-shell `OmniTerminalFAB` styled control from the active controls file.
- Routed `DashboardTeachMeGuide` prompts to `/dashboard/{role}/coach-assistant?teachPrompt=...` instead of the retired drawer.
- Removed inline `AICommandBar` mounts from Workouts workspace, trainer overview, Content Studio, and the dormant trainer dock component.

## Kept Active

- `frontend/src/components/DashBoard/Pages/coach-assistant/`
- `frontend/src/hooks/useAIChat.ts`
- backend `/api/ai-chat` routes
- `frontend/src/components/AIAssistant/ClientPicker.tsx`
- `frontend/src/components/AIAssistant/DictationOrb.tsx`

Those are still used by Coach Command Center or current logging flows.

## Archived Files

- `frontend/src/components/Shared/OmniTerminal.tsx`
- `frontend/src/components/Shared/OmniTerminal.styles.ts`
- `frontend/src/components/Shared/AIPersistentPanel/`
- `frontend/src/components/Shared/AICommandBar/`
- `frontend/src/components/AIAssistant/AIAssistantFAB.tsx`
- `frontend/src/components/AIAssistant/AIAssistantDrawer.tsx`
- `frontend/src/components/AIAssistant/AIDrawerStyles.ts`
- `frontend/src/components/AIAssistant/AIContextOptions.ts`
- `frontend/src/components/AIAssistant/AIContextSelector.tsx`
- `frontend/src/components/AIAssistant/ChatMessage.tsx`
- `frontend/src/components/AIAssistant/QuickActions.tsx`
- `frontend/src/components/AIAssistant/VoiceUpload.tsx`
- `frontend/src/components/AIAssistant/OnboardClientCard.tsx`
- `frontend/src/components/AIAssistant/OnboardClientCard.clientSource.test.ts`
- `frontend/src/components/AIAssistant/OnboardClientCard.responseContract.test.tsx`
