# Brainstorm: Swan Support Voice-First Issue Reporting

**Date:** 2026-07-16  ·  **Status:** in-progress  ·  **For:** Swan Coach client support, public help, and the admin Issue Command Center

## Summary
SwanStudios needs a first-party, voice-first support system that lets clients, trainers, customers, and people locked out of their account report bugs, errors, access trouble, confusing workflows, billing concerns, accessibility problems, and general product issues. The primary interaction is microphone dictation on desktop or phone; typing and structured manual form entry remain available as secondary paths. Swan Coach helps the reporter explain the problem, saves the original report before any AI work, and creates a privacy-redacted, agent-ready repair brief for Sean's admin dashboard.

This is not a generic AI chat feature. It is a durable request-and-work-item system with customer-visible status, an internal operational queue, safe diagnostics, attachments, audit history, duplicate/incident grouping, and an explicit human review boundary before any prompt is handed to an engineering agent.

## Key Decisions
- Voice is the primary capture method; text and manual structured entry are always available.
- The reporter must work on desktop and mobile and remain usable for non-technical users.
- Support access is available regardless of Swan Coach subscription tier.
- The system uses several easy entry points that converge on one issue domain; it is not hidden inside one page.
- Swan Coach may clarify, summarize, categorize, and draft an engineering prompt, but it may not invent reproduction steps or root cause.
- The raw report is saved first; AI transformation is asynchronous and failure-tolerant.
- Sean receives reports in a dedicated admin Issue Command Center with a copy-ready repair prompt.
- No automatic code changes, external ticket creation, deployment, or customer-facing action follows submission.

## Q&A Log
### Q1: What is the primary job and interaction model?
- **Recommended:** Make reporting feel like leaving a clear voice message for a trusted support coordinator: one tap to record, review the transcript, answer only necessary follow-ups, and submit.
- **Sean's answer:** People should be encouraged to report bugs and any other problems. Microphone dictation is primary, including from phones; text and manual form fill-in are secondary. The result must reach Sean's main dashboard and become a prompt he can give to an AI agent.
- **Implication:** The design cannot begin with a long form or a generic chat window. Voice capture, visible recording state, transcript review, and a durable submission receipt are the first-class flow.

### Q2: Where should it live?
- **Recommended:** Use a global Swan Support layer: persistent Help & Support entries in authenticated shells, a Report mode inside Swan Coach, contextual actions on error states, and a real public support route for login trouble.
- **Sean's answer:** It must be easy for anybody on the site to reach and may appear contextually when an issue occurs.
- **Implication:** Both active client shells and public/auth surfaces need entry points; no intrusive unsolicited popup during normal use.

## Key Highlights
- The experience should reduce anxiety and effort, not make the user diagnose software.
- The reporter speaks naturally; Swan Coach converts the narrative into structured facts without changing meaning.
- The user sees what will be submitted and can edit the transcript and structured summary.
- The submitted report receives a stable ID and visible status.
- The admin experience separates customer language, safe diagnostics, internal notes, and the agent-ready brief.

## Architecture Notes (parent / children / whole)
- **Parent surfaces:** canonical `/user-dashboard`; active `/dashboard/client/*` shell; Swan Coach at `/dashboard/:role/coach-assistant`; login/public shell; application error boundaries; admin dashboard.
- **Children / composed parts:** support launcher, voice recorder, transcript review, targeted follow-up questions, manual details form, attachment uploader, consented diagnostic bundle, submission receipt, customer report history, admin queue, issue detail, incident grouping, agent-brief generator.
- **Fit with the product:** Reporting protects trust in the workout-progress loop by giving users a low-friction recovery path when logging, payments, scheduling, Coach, social, or progress views fail.

## Suggestions & Enhancements
- Separate a customer-facing `IssueReport` from the internal work item view so customer language/status stays understandable while Sean gets engineering detail.
- Add `IssueEvent`, `IssueAttachment`, versioned `IssueAgentDraft`, and optional `Incident` records instead of overloading Coach conversations or Coach Intake.
- Automatically capture a privacy-safe route, build identifier, correlation/error ID, browser family, device class, role, local time, and recent failed operation category—with consent and strict deny-lists.
- Add a one-tap `Report this problem` action to real error boundaries and repeated failed operations, prefilled with the correlation ID.
- Provide `My Reports` so users can see status, answer requests for information, and avoid duplicate submissions.
- Group multiple reports against one incident and notify affected reporters when the incident is resolved.
- Treat billing, privacy/security, access, and safety categories as restricted/escalated lanes.
- Preserve raw audio only with explicit consent; default to deletion after successful transcription.
- Use a short known-issue suggestion only after capturing the report draft, so self-service never blocks submission.

## Minimal-Click Opportunities
- Authenticated report: Help entry → Record → Review → Submit (four primary actions).
- Error-state report: Report this problem → Record optional explanation → Review → Submit, with route/error context already attached.
- Manual alternative: Help entry → Type or fill details → Review → Submit.
- Sean: Admin signal/count → issue detail → Copy agent brief, with no separate prompt-writing step.

## Open Flags for Fable
- [ ] Lock the final client-facing name and signature visual direction.
- [ ] Decide whether the persistent entry is a shell-integrated Help control, a restrained floating beacon, or a responsive combination.
- [ ] Lock the minimum viable enterprise lifecycle and which advanced capabilities belong in later slices.
- [ ] Decide whether the public unauthenticated reporter supports attachments at launch or only after identity verification.
- [ ] Lock the first-party observability boundary versus an optional later privacy-configured third-party tool.

## Phase 2 Advisory Position Before Fable
The recommended product shape is a global Swan Support system with a voice-first Swan Coach intake and a separate admin Issue Command Center. The highest-risk mistake would be building a beautiful dictation widget without the durable issue lifecycle, privacy boundary, user status loop, and first-party operational queue that make reports actionable.

