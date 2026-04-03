---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.1.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines and core accessibility standards.

## How It Works

1. Fetch the latest guidelines from the source URL below.
2. Read the specified files.
3. Audit the code against the fetched rules AND the **Mandatory Accessibility Requirements** listed below.
4. Output findings in the terse `file:line` format.

## Mandatory Accessibility Requirements

You must explicitly verify and report on the following during every audit:

- **Contrast:** Ensure all text maintains a minimum 4.5:1 contrast ratio against its background.
- **Keyboard & Focus:** Ensure all interactive elements have visible `:focus-visible` states and functional keyboard navigation.
- **Semantics:** Reject "div soup"; enforce usage of semantic HTML (`<nav>`, `<main>`, `<article>`, `<section>`, `<header>`, `<footer>`).
- **ARIA:** Require `aria-label` for icon-only buttons, modals, and form inputs lacking visible labels.
- **Images:** Enforce `alt` text for all images and verify responsive attributes (`srcset`, `sizes`) and `loading="lazy"`.
- **Forms:** Ensure error messages are programmatically linked to inputs using `aria-describedby` and `aria-invalid`.
- **Motion:** Wrap all animations in `@media (prefers-reduced-motion: reduce)` to disable or simplify movement.

## Guidelines Source

Fetch fresh guidelines before each review:

https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above.
2. Read the specified files.
3. Audit against the fetched guidelines AND the Mandatory Accessibility Requirements.
4. Output findings using the format specified in the guidelines.

If no files are specified, ask the user which files to review.
```