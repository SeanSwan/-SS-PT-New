# SwanStudios Video Style Guide

## Mission

Create a repeatable video system for SwanStudios exercise education:

- Film real exercise demonstrations.
- Trim mistakes, dead space, filler words, and retakes.
- Add precise captions and form cues.
- Add Swan-branded motion graphics only where they clarify technique.
- Upload finished videos to YouTube.
- Import YouTube links into the SwanStudios video catalog for clients.

## Video Types

### Exercise Demo

Target length: 30 to 90 seconds.

Structure:

1. Exercise name.
2. Setup and equipment.
3. Execution cues.
4. Common mistakes.
5. Regression or progression.
6. Swan CTA.

### Short Form Cue

Target length: 15 to 45 seconds.

Use for one coaching point, form mistake, or quick client education clip. Render both 9:16 and 16:9 only when the source footage supports both crops.

### Program Explainer

Target length: 60 to 180 seconds.

Use for workout blocks, progression logic, app walkthroughs, or trainer education. Motion graphics can be heavier here than in exercise demos.

## Visual System

Use the Crystalline Swan brand:

- Obsidian black: `#0A0A0F`
- Midnight sapphire: `#002060`
- Royal depth: `#003080`
- Ice wing: `#60C0F0`
- Swan lavender: `#4070C0`
- Wing purple: `#8B5CF6`
- Gilded fern: `#C6A84B`
- Frost white: `#E0ECF4`

Default background language: dark, premium, precise, cool-toned, glass-like, and athletic. Avoid generic neon gym overlays and retired Galaxy-Swan colors.

Typography:

- Headings: Plus Jakarta Sans.
- UI and coaching labels: Sora.
- Data/timecode: Fira Code.
- Occasional premium title accent: Cormorant Garamond Italic.

## Motion Rules

- Prefer HyperFrames for HTML/CSS/GSAP overlays, kinetic labels, caption beats, progress bars, and YouTube-ready title cards.
- Use Remotion only when React primitives or an existing Remotion composition would be simpler.
- Motion must never cover the movement pattern being taught.
- Keep form-critical joints, hands, feet, load path, and torso visible.
- Captions should avoid covering the feet during lower-body lifts and hands during upper-body lifts.
- Use motion graphics for understanding, not decoration.

## Coaching Voice

Use confident trainer language:

- "Set your ribs down."
- "Drive through the midfoot."
- "Keep the shoulder blade controlled."
- "Stop if you feel sharp pain."
- "Scale the range before adding load."

Avoid medical promises, diagnosis language, and yoga or meditation wording. Use "stretching" or "flexibility" when relevant.

## Privacy

Do not send client PII into prompts, transcripts, captions, or filenames.

Allowed:

- Exercise names.
- Public SwanStudios brand copy.
- Coach-facing technique notes.
- Non-identifying project IDs.

Avoid:

- Client names.
- Emails.
- Phone numbers.
- Health histories.
- Private progress notes.

## YouTube Metadata

Every finished video needs:

- YouTube URL or video ID.
- Title.
- Description.
- Thumbnail URL.
- Duration in seconds.
- Visibility: `public` or `unlisted`.
- CTA strategy: `book_session`, `subscribe`, `visit_site`, or `none`.
- Content type: usually `tutorial`, `workout`, or `educational`.
- Exercise name.
- Muscle groups.
- Equipment.
- Difficulty.
- Contraindication note when relevant.

## Quality Gate

Before render approval:

- Watch the full edit once.
- Check every cut boundary for audio pops or awkward body-position jumps.
- Check captions for spelling and timing.
- Check that graphics do not cover technique.
- Check one screenshot per major motion beat.
- Confirm the output aspect ratio matches the upload target.
- Confirm the final file and metadata live in the project `renders` and `youtube` folders.
