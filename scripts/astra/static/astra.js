/*
 * astra.js — THE ENTRY. Wire the actions, then set the motion flag. Nothing else.
 *
 * Loaded by the shell as `<script type="module" src="/static/astra.js">`, which is
 * what lets the client be three real modules instead of one file plus a global
 * namespace. The tag sits at the end of `<body>`, so the DOM is parsed either way —
 * a module script is deferred, which is the same effective timing here.
 *
 * THE SPLIT IS `Rule 4` (300 lines), at the seam `smokeHarness.mjs` uses on the
 * server side: PLUMBING (`astra-core.js`) vs ACTIONS (`astra-actions.js`) vs ENTRY.
 * The entry is this file's whole job: bind, then initialise.
 */

import { reduce } from './astra-core.js';
import { bindActions } from './astra-actions.js';

bindActions();

// Motion is read from the same query the stylesheet uses, so the two agree.
document.documentElement.setAttribute('data-reduced-motion', reduce ? 'reduce' : 'no-preference');
