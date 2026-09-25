/**
 * serverBoot — how the console is started: port parsing, the startup banner, signal handling.
 * @module scripts/swan-brain-console/serverBoot
 *
 * WHY THIS IS SEPARATE FROM `server.mjs`
 * "What this surface serves" and "how it is started" are different subjects. The boot block
 * was also the last thing pushing `server.mjs` past Rule 4's 300 lines, and it is the one
 * part of the server that no request can exercise — keeping it out of the request handler
 * keeps that file about requests.
 *
 * THE BANNER IS DERIVED, NOT COPIED (round 7, 2026-09-20)
 * The startup line used to be a literal reading "GET only" while the server's own gate
 * allowed HEAD, and HEAD returns 200. Round 5 corrected that same claim in `server.mjs`'s
 * module header and missed this one, so the false statement survived in the only place an
 * operator actually reads it, on every start. `bannerLines` takes the method list as an
 * argument, so the banner holds no copy of the fact and cannot disagree with the gate.
 *
 * BOUNDS: no I/O of its own beyond `console.log` and the `listen` it is handed. `argv`,
 * `process.on` and the exit call are all injectable, so this is testable without a socket.
 */

/** Parse `--port` from an argv array. Returns null when the value is unusable. */
export function parsePort(argv = [], fallback = '4599') {
  const i = argv.indexOf('--port');
  const raw = i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
  const port = Number(raw);
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

/**
 * The two lines printed when the console comes up.
 *
 * `methods` is the SERVER's allowed-method list, passed in rather than restated — that is
 * the whole point of this function existing.
 */
export function bannerLines(url, methods) {
  return [
    `[console] Swan Brain Console running at ${url}`,
    `[console] read-only · localhost only · ${methods.join(' and ')} only · no engine writes`,
  ];
}

/**
 * Start the server. Returns the port it listened on, or null when the port was invalid.
 *
 * `process` is not touched directly: `onSignal` and `onExit` are injectable so a test can
 * assert the shutdown wiring without sending itself SIGINT.
 */
export function bootServer({
  server,
  host,
  methods,
  argv = process.argv,
  log = console.log,
  error = console.error,
  onSignal = (sig, fn) => process.on(sig, fn),
  onExit = (code) => process.exit(code),
}) {
  const port = parsePort(argv);
  if (port === null) {
    error('[console] invalid --port; expected 1024-65535');
    return null;
  }

  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    for (const line of bannerLines(url, methods)) log(line);
    if (argv.includes('--open')) log(`[console] open this URL in a browser: ${url}`);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    onSignal(sig, () => {
      log(`\n[console] ${sig} — shutting down.`);
      server.close(() => onExit(0));
    });
  }
  return port;
}
