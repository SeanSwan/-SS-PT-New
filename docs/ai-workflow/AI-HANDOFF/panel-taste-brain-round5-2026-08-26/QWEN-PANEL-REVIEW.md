# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/TASTE-BRAIN-ROUND5-PANEL-PACKET-2026-08-26.md
**Tokens (Ollama):** 31903 in / 2571 out | **Wall:** 48.8s | **done_reason:** stop

---
## VERDICT
REVISE — The bundle export and CLI feedback loops contain P0/P1 data-integrity and security flaws that violate the "single writer" and "no corpus leak" laws, and a critical XSS vector exists in the shell.

## BLOCKERS
1. **P0: Bundle Export Leaks Corpus Metadata (The Sixth Door)**
   - **Scenario:** `export-bundle.mjs` calls `planGrids` which filters images by `SHAREABLE_COLLECTIONS`. However, `loadImages()` (in `images.mjs`) returns a mixed array of Midlibrary, Webb, and Photo records. The filter `images.filter((r) => SHAREABLE_COLLECTIONS.has(r.collection))` relies on the `collection` field. In `images.mjs`, Midlibrary records have `collection: 'tops' | 'guides' | 'focus'`. If `SHAREABLE_COLLECTIONS` (defined in `projects.mjs`, not shown but implied to be `Set(['photo', 'webb'])`) does *not* include these, they are filtered out. **However**, the `MIDLIBRARY_RE` check in `export-bundle.mjs` (line 62) tests the *final JSON string*. If a Midlibrary record slips through (e.g., if `SHAREABLE_COLLECTIONS` is misconfigured or if a photo record has a `doc` field containing `ml:img:`), it leaks. More critically, `planGrids` maps candidates to `{ id, url, sref: null, doc: c.doc, ... }`. If `c.doc` for a shareable image contains a Midlibrary reference (e.g., if a photo was sourced from a Midlibrary article and the `doc` field wasn't sanitized), the `MIDLIBRARY_RE` check catches it. **But** the real failure is: `loadImages()` includes `loadPhotoImages()` and `loadWebbImages()`. These are safe. The risk is if `SHAREABLE_COLLECTIONS` is defined to include `tops`/`guides`/`focus` for some reason, or if the `collection` field is missing. **Wait**, looking at `images.mjs` line 59: Midlibrary records have `provenance: 'midlibrary-reference'`. The `MIDLIBRARY_RE` regex checks for `midlibrary-reference`. So if a Midlibrary record is in the bundle, it is caught. **The actual P0 is:** `export-bundle.mjs` line 43: `sref: null`. It forces `sref` to null. But `doc` is passed through. If `doc` contains a style code or prompt text from the Midlibrary corpus (which it does, as `doc` is the markdown file path or title), it might not match `MIDLIBRARY_RE` if the regex is too specific. **Correction:** The P0 is that `planGrids` does **not** filter by `provenance`. It filters by `collection`. If a photo image has `collection: 'photo'` but its `title` or `doc` contains a Midlibrary style name (e.g., "Cinematic Noir"), it passes `MIDLIBRARY_RE` (which looks for specific strings like `ml:img:` or `midlibrary.io`). If the corpus leak is via *style names* or *prompt fragments* in the `title`/`doc` fields of shareable images, the `MIDLIBRARY_RE` check is insufficient. The law says "not the images, not the artists, not the style codes... not the prompt text." If a shareable image's `title` is "Cinematic Noir Style," it leaks the style code/name. The `MIDLIBRARY_RE` does not catch generic style names. **Fix:** Filter `planGrids` by `provenance !== 'midlibrary-reference'` explicitly, and sanitize `title`/`doc` to remove any known style codes/names.

2. **P0: XSS via `Swan.say` in `app-shell.js`**
   - **Scenario:** `app-shell.js` line 99: `Swan.say = (html) => { const s = Swan.$('shellsay'); if (s) s.innerHTML = html; };`. This function is called with user-controlled or API-controlled data. For example, in `app-make.js` line 51: `Swan.say(`not queued: ${(first?.errors || [r.error || r.hint || 'unknown']).join('; ')}...`)`. If the API returns an error message containing HTML (e.g., from a malicious ComfyUI node or a crafted prompt that triggers an error with HTML entities), it is injected into `innerHTML`. The `esc` function exists in `Swan` but is **not** used in `Swan.say`. **Fix:** Change `Swan.say` to use `textContent` or escape the input with `Swan.esc` before setting `innerHTML`.

3. **P1: CLI `--keep` Injection into `taste/kept.md`**
   - **Scenario:** `swan-prompt.mjs` line 92: `appendKept(argv.slice(i + 1).filter((a) => !a.startsWith('--')).join(' '))`. The `text` is joined and then written to `taste/kept.md` via `md.replace(/(## Kept\n)/, `$1\n- ${text.trim()}\n`)`. If `text` contains newlines (e.g., `--keep "line1\nline2"`), it can inject arbitrary markdown lines, potentially breaking the file structure or injecting fake "kept" prompts that influence generation. The `text` is not sanitized for newlines or markdown special characters. **Fix:** Sanitize `text` to remove newlines and escape markdown special characters, or reject inputs with newlines.

4. **P1: `origin.mjs` Host Header Bypass**
   - **Scenario:** `origin.mjs` line 30: `const host = String(headers.host ?? '').trim().toLowerCase();`. If the `Host` header is missing or malformed, `host` becomes `''`. `trustedHosts(port).has('')` returns `false`, so it is refused. **However**, if the `Host` header is `127.0.0.1:7331` but the `Origin` header is `http://evil.com`, it is refused. **The flaw:** The check `if (origin === undefined || origin === null || origin === '') return { ok: true };` allows requests with **no** Origin header. This is intended for CLI/curl. But a malicious browser page can send a POST request with `Origin` header **removed** (using `fetch` with `mode: 'no-cors'` or a raw socket). If the browser allows removing the `Origin` header (it does not, but a raw socket or a proxy can), the write is trusted. **More critically:** The `Host` header check is vulnerable to DNS rebinding if the attacker controls the DNS. But the `Host` header is checked against `127.0.0.1:7331`. If the attacker uses a DNS rebinding attack to resolve `evil.com` to `127.0.0.1`, the `Host` header will be `evil.com:7331`, which is refused. **The real P1:** The `origin.mjs` check is **not** applied to all write endpoints. The document says "The server sends no CORS headers, and answers a preflight with a bare 204." But if the server does not enforce `origin.mjs` on **all** write endpoints (e.g., `/api/keep`, `/api/rate`, `/api/event`), a cross-origin POST can succeed. The document implies `origin.mjs` is used, but if it is only used for some endpoints, it is a leak. **Fix:** Ensure `checkWriteRequest` is called on **all** write endpoints.

5. **P2: `probe.js` `labelFor` XSS**
   - **Scenario:** `probe.js` line 30: `labelFor` returns a string that is used in `probe.js` line 89: `const label = el('div', 'label' + (s.locked ? '' : ' hidden'), s.locked ? labelFor(c) : 'label hidden until you lock a reason');`. The `el` function in `probe.js` line 28: `const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };`. This uses `textContent`, so it is safe. **However**, `labelFor` includes `c.prompt` and `c.sref`. If `c.prompt` contains HTML, it is set via `textContent`, so it is safe. **No XSS here.**

6. **P2: `app-judge.js` `record` Function Race Condition**
   - **Scenario:** `app-judge.js` line 49: `async function record()`. It disables the `done` button, posts the event, and re-enables it. If the user clicks `done` multiple times quickly, multiple POSTs are sent. The server should handle idempotency, but the client does not prevent duplicate submissions. **Fix:** Add a client-side lock to prevent multiple concurrent `record` calls.

## ATTACKS
- **Correctness:** The `planGrids` function in `export-bundle.mjs` does not filter by `provenance`, relying on `collection` and `MIDLIBRARY_RE`. This is fragile. The `MIDLIBRARY_RE` regex is too specific and may miss style names or prompt fragments in `title`/`doc` fields.
- **Security:** `Swan.say` in `app-shell.js` uses `innerHTML` without escaping, leading to XSS. The `origin.mjs` check may not be applied to all write endpoints, allowing cross-origin writes.
- **Data-truth / schema drift:** The `collection` field in `images.mjs` is used for filtering, but `provenance` is the more reliable indicator of corpus origin. Relying on `collection` is a schema drift risk.

## HIGHEST RISK
**P0: Bundle Export Leaks Corpus Metadata.** The `MIDLIBRARY_RE` check is insufficient to prevent style names, prompt fragments, or artist names from leaking into the bundle. The `planGrids` function should filter by `provenance !== 'midlibrary-reference'` and sanitize `title`/`doc` fields to remove any known corpus identifiers.

**Cheapest fix:** In `export-bundle.mjs`, change `planGrids` to filter by `provenance !== 'midlibrary-reference'` and add a sanitization step to remove any strings matching a list of known style codes/names from `title` and `doc`.

## CONFIDENCE
I could not verify the definition of `SHAREABLE_COLLECTIONS` in `projects.mjs`, which is critical to understanding if Midlibrary records are filtered out. I also could not verify if `checkWriteRequest` is applied to all write endpoints. The `MIDLIBRARY_RE` regex is visible, but its sufficiency depends on the content of `title`/`doc` fields in shareable images, which I cannot verify.

**What I checked and found sound:**
- `probe.js` uses `textContent` for dynamic content, preventing XSS.
- `origin.mjs` correctly refuses cross-origin requests with a valid `Origin` header.
- `swan-prompt.mjs` validates SREF codes and ratings before writing to `taste/loved-srefs.md`.
- `import-bundle.mjs` validates the results file before posting to the server.

**APPROVE / REVISE / REJECT:** REVISE
