# Swan Video Studio Codex Prompts

## Install Or Reconnect

```text
Set up https://github.com/browser-use/video-use for this Codex environment.

Read install.md first. Register the skill for Codex, verify ffmpeg/ffprobe, and do not run a paid transcription during setup. Use HyperFrames as the preferred animation engine for SwanStudios videos unless Remotion is clearly simpler for a specific slot.

After install, read this style guide:
%USERPROFILE%\Videos\SwanStudios-Video-Studio\03-style-guides\SWAN_VIDEO_STYLE.md

Then wait for raw footage. Do not upload anything to YouTube without explicit approval.
```

## New Exercise Video

```text
We are creating a SwanStudios exercise demonstration video for YouTube and the Swan app video catalog.

Read:
%USERPROFILE%\Videos\SwanStudios-Video-Studio\03-style-guides\SWAN_VIDEO_STYLE.md

Use video-use for the trim/transcript/edit pass and HyperFrames for Swan-branded motion graphics. First inventory the raw footage in this folder, identify the best take, and propose a cut plan with timecodes. Do not render yet. Do not use client names or PII.
```

## Trim-Only Pass

```text
Use video-use for a trim-only pass.

Goal:
- Remove false starts, long dead space, filler words, and obvious retakes.
- Keep coaching instructions natural and not over-cut.
- Preserve all reps needed to understand form.
- Produce an edited draft, word-level transcript, and a short cut-decision summary.

Do not add motion graphics yet. Ask me to approve the cut plan before the final edit render if there are ambiguous choices.
```

## Motion Graphics Plan

```text
Now plan HyperFrames motion graphics for the edited draft.

Use the transcript to anchor each graphic to exact words and timecodes. Keep the body movement visible. Add only graphics that improve instruction:
- exercise title
- setup checklist
- tempo or range cue
- common mistake callout
- progression or regression card
- final Swan CTA

Return a beat table with start time, end time, transcript anchor, visual treatment, and why the graphic helps.
Do not build until I approve the plan.
```

## Build HyperFrames Overlay

```text
Build the approved HyperFrames overlay.

Requirements:
- Use the SwanStudios style guide.
- Use HTML/CSS/GSAP unless a different HyperFrames-supported runtime is clearly justified.
- Keep all form-critical body regions visible.
- Render preview screenshots at each major beat.
- Run HyperFrames lint/validate/render checks when available.
- Put outputs in this project's edit/renders folders, not in the tool repo.
```

## Render And QA

```text
Render the final YouTube-ready MP4.

Before calling it done:
- Watch or inspect the full render.
- Check cut boundaries.
- Check captions.
- Check graphics do not cover the exercise.
- Capture or inspect screenshots for each major beat.
- Write a final QA note with exact files produced.

Also create or update the YouTube metadata JSON using the Swan template.
```

## YouTube Upload Handoff

```text
Prepare the YouTube upload package.

Create:
- title
- description
- tags
- thumbnail recommendation
- chapters if the video is longer than 60 seconds
- pinned comment
- Swan app catalog import values

Do not upload. Give me the final MP4 path and metadata path.
```

## Swan App Import Handoff

```text
I have uploaded the video to YouTube.

Use the YouTube URL or video ID I provide and the metadata JSON in this project to prepare the Swan Admin Video Studio import values.

The backend import endpoint expects:
- youtubeVideoId
- title
- thumbnailUrl
- durationSeconds
- youtubeChannelId
- visibility
- youtubeCTAStrategy
- contentType

Visibility must be public or unlisted for YouTube entries, not members_only.
```
