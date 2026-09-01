import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The Fryling GLB is imported BY URL from the repo-root asset directory — the single source of
// truth the manifest's sha256 describes. That directory is outside this package, and Vite refuses
// to serve files outside its root unless told otherwise (a 403, not an error in the console you
// are looking at). Allowing the repo root is the honest fix; copying the GLB into public/ would be
// a second copy to keep in sync, silently diverging from the manifest.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// Port 5299, and strictPort. Both matter, and the first choice was WRONG in a way worth recording:
// 5199 was already the SwanStudios frontend dev server. The boot test reused it (see
// playwright.config.js) and spent a run asserting things about a DIFFERENT APPLICATION.
// strictPort makes vite FAIL on a busy port instead of quietly hopping to the next one — a server
// that silently moves is a test that silently tests nothing.
export default defineConfig({
  plugins: [react()],
  // host is pinned to 127.0.0.1 on purpose. Vite's default binds `localhost`, which on Windows
  // resolves to IPv6 ::1 — so http://localhost:5299 answered 200 while http://127.0.0.1:5299
  // answered nothing, and the Playwright webServer (polling the IPv4 address) timed out for two
  // full runs against a server that was up the whole time. Pin the family; do not guess it.
  server: { host: '127.0.0.1', port: 5299, strictPort: true, fs: { allow: [repoRoot] } },
});
