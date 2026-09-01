import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  server: { host: '127.0.0.1', port: 5299, strictPort: true },
});
