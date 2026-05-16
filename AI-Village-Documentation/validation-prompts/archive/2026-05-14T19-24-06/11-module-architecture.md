# Module Architecture & File Budget — Validation Report

> **Status:** PASS | **Model:** nvidia/nemotron-3-super-120b-a12b-20230311:free | **Duration:** 189.6s
> **Files:** docs/ai-workflow/AI-HANDOFF/COACH-COMMAND-PLAUD-UNIFIED-WORKFLOW-AI-VILLAGE-PROMPT-2026-05-14.md
> **Generated:** 5/14/2026, 12:24:06 PM

---

We are given a plan to review. We must output structured markdown with a proposed file tree and line budget.

Constraints:
- No file may exceed 300 lines (excluding comments and blank lines).
- We are to review the plan's file organization and provide feedback.

We are to consider:
1. 22 new files: Is the decomposition right? Any files to merge or too thin?
2. styles/ directory: 5 existing style files from split + 4 new = 9 total. Too many? Consolidation?
3. hooks/ directory: 5 hooks (useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment). Proper separation?
4. 300-line budget: Which files are at risk? Specifically:
   - ConversationSidebar.tsx (est. 250) -> safe
   - MarkdownRenderer.tsx (est. 180) -> safe
   - CoachInputBar.tsx (est. 295) -> at risk (close to 300)
5. Import graph: Draw dependency tree, check for circular risks and deep chains.
6. Barrel exports: Should we have index.ts barrels for hooks/, styles/?
7. Shared vs local: useAIChat is in shared hooks. New hooks are local to coach-assistant. Is this boundary right?

We are also to output a proposed file tree and line budget.

Let's break down the plan:

The plan describes 22 new files. We don't have the exact list, but we can infer from the context.

From the plan, we know about:
- CoachCommandCenterPage.tsx (existing, but we are modifying it)
- We are adding new components and hooks.

The plan mentions:
- ConversationSidebar.tsx
- MarkdownRenderer.tsx
- CoachInputBar.tsx
- And we have hooks: useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment

Also, note that the plan says: "SwanCoachStyles.ts becomes a barrel". So we have a styles file that is being turned into a barrel.

We are to propose a file tree and line budget.

Given the constraints, we must ensure no file exceeds 300 lines.

Let's assume the 22 new files are distributed as follows (based on typical structure):

We are working in the frontend, likely in:
frontend/src/components/DashBoard/Pages/coach-assistant/

We might have:

Components:
- CoachCommandCenterPage.tsx (existing, but we are modifying it - so not new)
- ConversationSidebar.tsx (new)
- MarkdownRenderer.tsx (new)
- CoachInputBar.tsx (new)
- PlaudMergeWorkspace.tsx (existing, but we might be modifying it? The plan says we are keeping it visible)
- ... and others.

But the plan says 22 new files. We don't have the exact list, so we have to make reasonable assumptions.

Alternatively, the plan might be referring to the files mentioned in the plan document. However, we don't have the full plan document.

Given the ambiguity, we will focus on the feedback and then propose a file tree that adheres to the constraints.

Let's address each point:

1. 22 new files:
   - We are adding several components and hooks. 22 might be too many if some are very small. We should look for opportunities to merge.
   - For example, the hooks:
        useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment
     Some of these might be combined if they are closely related. However, they seem to have distinct responsibilities:
        - useCoachAssistant: likely for managing the coach assistant state (conversations, intake queue, etc.)
        - useConversationSidebar: for the sidebar that lists conversations
        - useVoiceRecorder: for recording voice
        - useGeminiTranscription: for transcribing voice (using Gemini)
        - useFileAttachment: for handling file attachments
     These are separate concerns, so keeping them as separate hooks is reasonable.

   - However, we might consider if any of these hooks are too thin (e.g., if they are just a few lines). We don't have the exact code, but we can assume they are of moderate size.

   - Similarly, for styles: 9 style files might be acceptable if each is for a specific component and they are small. But we can consider consolidating if there are shared styles.

2. styles/ directory: 9 files.
   - We have 5 existing from a split and 4 new.
   - If each style file is for a specific component (e.g., ConversationSidebar.styles.ts, CoachInputBar.styles.ts, etc.), then 9 is acceptable.
   - However, if there are many shared styles (like variables, mixins) then we might have a base style file and then component-specific ones.
   - We are told that SwanCoachStyles.ts becomes a barrel. This suggests that we are exporting multiple style files from one index. So we might have:
        styles/
          index.ts (barrel exporting all)
          ConversationSidebar.styles.ts
          CoachInputBar.styles.ts
          MarkdownRenderer.styles.ts
          ... and so on.

   - Having 9 style files is not too many if each is used by one component and they are small. But we should check if any are very small (e.g., less than 20 lines) and consider merging them into a common file or into the component file (if using styled-components, we can put styles in the same file as the component to reduce file count). However, the plan says we are splitting styles, so we are following a pattern of separating styles.

   - Given the 300-line limit per file, if a component file is getting too big because of styles, then separating styles is good. But if the style file is tiny, we might inline it.

   - Since we don't have the exact line counts, we'll assume that the style files are of reasonable size (each under 100 lines) and that 9 is acceptable.

3. hooks/ directory: 5 hooks.
   - Each hook seems to have a distinct responsibility.
   - We should check if any hook is doing too much or too little. Without the code, we assume they are well-scoped.

4. 300-line budget:
   - ConversationSidebar.tsx: est. 250 -> safe (under 300)
   - MarkdownRenderer.tsx: est. 180 -> safe
   - CoachInputBar.tsx: est. 295 -> at risk (if it goes over 300, we need to split)
   - We should also consider other files that might be large, such as CoachCommandCenterPage.tsx (which we are modifying) and any new components.

   - For CoachInputBar.tsx, we might consider splitting out the voice recorder and file attachment parts into separate components to reduce the size.

5. Import graph:
   - We don't have the exact files, but we can infer:
        CoachCommandCenterPage.tsx
          -> uses ConversationSidebar, MarkdownRenderer, CoachInputBar, etc.
          -> uses hooks: useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment
        ConversationSidebar.tsx
          -> might use useConversationSidebar hook
          -> might use MarkdownRenderer for displaying conversation messages?
        CoachInputBar.tsx
          -> might use useVoiceRecorder, useGeminiTranscription, useFileAttachment
          -> might use useCoachAssistant to send messages

   - We must check for circular dependencies. For example, if a hook imports a component that imports the hook, that would be circular. But hooks are usually in a separate directory and components import hooks, not the other way around.

   - Deep import chains: We should avoid having a component import another component that imports another, etc., more than 3 levels deep. We can try to keep the component tree flat.

6. Barrel exports:
   - We are already making SwanCoachStyles.ts a barrel (so it exports multiple style files).
   - We should consider having index.ts barrels for:
        hooks/ directory: to export all hooks from one place (e.g., import { useCoachAssistant } from '@/hooks')
        styles/ directory: we already have SwanCoachStyles.ts as a barrel? Or we are making it a barrel? The plan says "SwanCoachStyles.ts becomes a barrel", so we might have:
            styles/
              SwanCoachStyles.ts   (which is the barrel, exporting other style files)
        But note: the plan says 5 existing style files from the split + 4 new = 9 total. So SwanCoachStyles.ts might be one of them? Or it is a new barrel?

   - Alternatively, we might have:
        styles/
          index.ts   (barrel exporting all style files)
          ConversationSidebar.styles.ts
          ... etc.

   - Having barrels for hooks and styles is a good practice to avoid long import paths.

7. Shared vs local:
   - useAIChat is in shared hooks (likely frontend/src/hooks/useAIChat.ts) and is used by multiple features.
   - The new hooks (useCoachAssistant, etc.) are local to the coach-assistant feature (in frontend/src/components/DashBoard/Pages/coach-assistant/hooks/ or similar).
   - This is appropriate because useAIChat is a general hook for AI chat conversations, while the new hooks are specific to the coach assistant workflow.

Now, let's propose a file tree and line budget.

We are to output structured markdown.

We'll propose:

- A file tree showing the new and modified files (we focus on the new ones and the ones we are changing).
- We'll estimate line counts for each file (excluding comments and blank lines) and ensure none exceed 300.

We are given estimates for three files. We'll use those and estimate others.

Let's assume the 22 new files are:

We are adding:
- Components (in coach-assistant directory):
    ConversationSidebar.tsx
    MarkdownRenderer.tsx
    CoachInputBar.tsx
    ... and maybe 19 more? That seems too many.

Alternatively, the 22 might include:
- New components, new hooks, new style files, new utils, etc.

But we don't have the exact list. So we will focus on the ones we know and then make reasonable assumptions for the rest.

We know about:
- 3 components: ConversationSidebar, MarkdownRenderer, CoachInputBar
- 5 hooks: useCoachAssistant, useConversationSidebar, useVoiceRecorder, useGeminiTranscription, useFileAttachment
- Style files: we are told there are 9 total in styles/ (5 existing from split + 4 new). But note: the existing 5 might be from a previous split, so we are adding 4 new style files.

So that accounts for 3 + 5 + 4 = 12 files. We are missing 10.

The remaining 10 might be:
- Other components (e.g., for the intake queue items, proposal cards, etc.)
- Utils or constants
- Tests? But the plan doesn't mention tests.

Given the uncertainty, we will propose a file tree for the coach-assistant feature and then note that we are only responsible for the files we are changing.

But the instruction says: "Review this plan's file organization" and the plan mentions 22 new files.

We will assume that the 22 new files are all under the coach-assistant feature and we are to review their organization.

Let's propose a structure:

frontend/
  src/
    components/
      DashBoard/
        Pages/
          coach-assistant/
            components/
              ConversationSidebar/
                ConversationSidebar.tsx
                ConversationSidebar.styles.ts   (if we split styles)
                index.ts   (barrel for this component? optional)
              MarkdownRenderer/
                MarkdownRenderer.tsx
                MarkdownRenderer.styles.ts
                index.ts
              CoachInputBar/
                CoachInputBar.tsx
                CoachInputBar.styles.ts
                index.ts
              ... and other components (e.g., IntakeQueue, ProposalCard, etc.)
            hooks/
              useCoachAssistant.ts
              useConversationSidebar.ts
              useVoiceRecorder.ts
              useGeminiTranscription.ts
              useFileAttachment.ts
              index.ts   (barrel for hooks)
            styles/
              SwanCoachStyles.ts   (barrel exporting all style files for this feature)
              ... and the individual style files? Or we are using the barrel to export the individual ones?
            utils/
              ... (if any)
            coach-assistant.types.ts   (if we have types specific to this feature)
            CoachCommandCenterPage.tsx   (the main page, which we are modifying)

But note: the plan says we are keeping the existing CoachCommandCenterPage and modifying it.

We are to avoid exceeding 300 lines per file.

Let's estimate line counts for the files we know:

- ConversationSidebar.tsx: 250 -> safe
- MarkdownRenderer.tsx: 180 -> safe
- CoachInputBar.tsx: 295 -> at risk. We should split it.

How to split CoachInputBar?
  We can break it into:
    - VoiceRecorderButton.tsx (handles voice recording and transcription)
    - FileAttachmentButton.tsx (handles file uploads)
    - TextInputBox.tsx (the text input and send button)
    - CoachInputBar.tsx (now just composes these three)

Then each of these would be smaller.

Similarly, we might split other large components.

Now, let's propose a file tree for the coach-assistant feature that adheres to the 300-line limit.

We'll focus on the new files we are adding and the existing ones we are modifying.

Proposed file tree:

frontend/src/components/DashBoard/Pages/coach-assistant/
├── CoachCommandCenterPage.tsx          (existing, modified: est. 300? We must check)
├── types.ts                            (new: for types specific to this feature, est. 50)
├── components/
│   ├── IntakeQueue/                    (new: for the unified intake inbox)
│   │   ├── IntakeQueue.tsx             (est. 200)
│   │   ├── IntakeQueue.styles.ts       (est. 50)
│   │   ├── IntakeItem.tsx              (est. 150)
│   │   ├── IntakeItem.styles.ts        (est. 50)
│   │   └── index.ts                    (barrel: est. 10)
│   ├── ConversationSidebar/
│   │   ├── ConversationSidebar.tsx     (est. 250)
│   │   ├── ConversationSidebar.styles.ts (est. 80)
│   │   └── index.ts                    (est. 10)
│   ├── MarkdownRenderer/
│   │   ├── MarkdownRenderer.tsx        (est. 180)
│   │   ├── MarkdownRenderer.styles.ts  (est. 60)
│   │   └── index.ts                    (est. 10)
│   ├── CoachInputBar/
│   │   ├── CoachInputBar.tsx           (now just the container: est. 100)
│   │   ├── VoiceRecorderButton.tsx     (est. 100)
│   │   ├── VoiceRecorderButton.styles.ts (est. 40)
│   │   ├── FileAttachmentButton.tsx    (est. 100)
│   │   ├── FileAttachmentButton.styles.ts (est. 40)
│   │   ├── TextInputBox.tsx            (est. 100)
│   │   ├── TextInputBox.styles.ts      (est. 40)
│   │   └── index.ts                    (est. 10)
│   ├── ProposalCard/                   (new: for displaying coach action proposals)
│   │   ├── ProposalCard.tsx            (est. 200)
│   │   ├── ProposalCard.styles.ts      (est. 60)
│   │   └── index.ts                    (est. 10)
│   └── ... (other components as needed)
├── hooks/
│   ├── useCoachAssistant.ts            (est. 200)
│   ├── useConversationSidebar.ts       (est. 150)
│   ├── useVoiceRecorder.ts             (est. 150)
│   ├── useGeminiTranscription.ts       (est. 150)
│   ├── useFileAttachment.ts            (est. 150)
│   └── index.ts                        (barrel: est. 20)
├── styles/
│   ├── SwanCoachStyles.ts              (barrel: exports all style files, est. 20)
│   ├── base.ts                         (shared styles: est. 50)
│   ├── variables.ts                    (design tokens: est. 30)
│   └── ... (we already have style files in the component directories, so this might be for shared styles only)
└── utils/
    ├── intakeUtils.ts                  (est. 100)
    └── proposalUtils.ts                (est. 100)

Now, let's count the new files we are adding (excluding the existing CoachCommandCenterPage and types.ts which we are adding):

We are adding:
- types.ts: 1
- components/IntakeQueue/: 4 files (IntakeQueue.tsx, IntakeQueue.styles.ts, IntakeItem.tsx, IntakeItem.styles.ts, index.ts) -> 5
- components/ConversationSidebar/: 3 files
- components/MarkdownRenderer/: 3 files
- components/CoachInputBar/: 7 files (CoachInputBar.tsx, VoiceRecorderButton.tsx, VoiceRecorderButton.styles.ts, FileAttachmentButton.tsx, FileAttachmentButton.styles.ts, TextInputBox.tsx, TextInputBox.styles.ts, index.ts) -> 8? Wait, let's list:
      CoachInputBar.tsx
      VoiceRecorderButton.tsx
      VoiceRecorderButton.styles.ts
      FileAttachmentButton.tsx
      FileAttachmentButton.styles.ts
      TextInputBox.tsx
      TextInputBox.styles.ts
      index.ts
    -> 8
- components/ProposalCard/: 3 files
- hooks/: 6 files (5 hooks + index.ts)
- styles/: 3 files (SwanCoachStyles.ts, base.ts, variables.ts) [assuming we move shared styles here]
- utils/: 2 files

Total new files:
  1 (types)
  + 5 (IntakeQueue)
  + 3 (ConversationSidebar)
  + 3 (MarkdownRenderer)
  + 8 (CoachInputBar)
  + 3 (ProposalCard)
  + 6 (hooks)
  + 3 (styles)
  + 2 (utils)
  = 34

---

*Part of SwanStudios 15-Brain Recursive Consensus System*
