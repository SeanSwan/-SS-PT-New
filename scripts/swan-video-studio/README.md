# Swan Video Studio Launcher Kit

## Purpose

This folder contains the local launcher kit for creating SwanStudios YouTube exercise videos with Codex.

The workflow is intentionally split into two layers:

- `video-use` handles raw-footage intake, transcription, filler-word removal, retake cuts, subtitles, color, and edit artifacts.
- HyperFrames handles polished HTML/CSS/GSAP motion overlays and final visual render passes.

Remotion remains optional. Use it when a React component tree is clearly simpler, but the Swan default is HyperFrames because it matches the polished HTML-native style Sean preferred from the second transcript.

## What This Automates

The launcher creates a stable Windows video workspace at:

```text
%USERPROFILE%\Videos\SwanStudios-Video-Studio
```

It creates these folders:

```text
00-inbox-raw
01-active-projects
02-brand-assets
03-style-guides
04-renders-ready-for-youtube
05-youtube-metadata
06-app-import-records
99-archive
logs
```

It can also:

- Clone or update `browser-use/video-use`.
- Register `video-use` as a Codex skill under `%CODEX_HOME%\skills` or `%USERPROFILE%\.codex\skills`.
- Install or update video-use Python dependencies.
- Prompt for an ElevenLabs API key without echoing it back to chat or terminal output.
- Install the documented HyperFrames skills with `npx skills add heygen-com/hyperframes`.
- Create a new exercise-video project folder with `raw`, `assets`, `edit`, `compositions`, `renders`, `transcripts`, and `youtube` subfolders.
- Open Explorer, VS Code when present, and an optional Codex terminal pointed at the video workspace.

## What Sean Still Controls

The launcher does not upload to YouTube automatically. Upload remains manual or handled later through a dedicated YouTube API integration, because OAuth, channel permissions, thumbnails, titles, descriptions, and monetization settings should stay explicit.

The launcher also does not commit raw media to this repo. Raw files, transcripts, rendered MP4s, screenshots, and YouTube metadata live outside Git unless Sean explicitly chooses otherwise.

## First Run

From PowerShell:

```powershell
.\scripts\swan-video-studio\launch-swan-video-studio.ps1
```

Validation-only run:

```powershell
.\scripts\swan-video-studio\launch-swan-video-studio.ps1 -SetupOnly -NoToolInstall -SkipToolSetup -NoOpen
```

For a true desktop double-click flow, use the copied desktop launcher:

```text
Swan Video Studio.cmd
```

Windows often opens `.ps1` files in an editor on double click depending on local file association. The `.ps1` launcher exists, but the `.cmd` wrapper is the more reliable double-click entry.

## Daily Use

1. Double-click the launcher.
2. Drop raw footage into `00-inbox-raw` or create a named project in `01-active-projects`.
3. Start Codex in the project folder.
4. Paste the prompt from `03-style-guides\WORKFLOW_PROMPTS.md`.
5. Ask for a trim-only pass first.
6. Review the proposed cut plan.
7. Ask for HyperFrames motion graphics.
8. Review preview screenshots and playback.
9. Render final MP4.
10. Upload to YouTube.
11. Import the YouTube video into Swan's Admin Video Studio.

## Swan App Integration

The production app already has an Admin Video Studio and YouTube import path:

- Admin UI imports YouTube videos into the video catalog.
- Backend endpoint: `POST /api/v2/admin/youtube/import`.
- YouTube catalog entries are public or unlisted, not members-only.
- The generated metadata template in this folder uses the backend field name `youtubeCTAStrategy`.

Current scope is production workflow setup. App UI changes, YouTube API upload automation, and catalog-field cleanup are separate production slices.

## Source References

- HyperFrames: `https://github.com/heygen-com/hyperframes`
- HyperFrames docs: `https://hyperframes.heygen.com/introduction`
- video-use: `https://github.com/browser-use/video-use`
