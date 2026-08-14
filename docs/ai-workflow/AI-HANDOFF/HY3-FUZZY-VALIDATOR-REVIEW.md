# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/8faee779-c082-4553-9098-cc960574edf0/scratchpad/pkt/packet.md
**Seed:** (none)
**Tokens:** 9378 in / 15311 out | **Cost:** ~$0.0094 | **Wall:** 273.2s | **finish_reason:** stop

---

**Tencent HY3 — Rendering‑systems review of `fuzzyVariableService`**

The validator is now solid against *character‑shape* attacks (fullwidth, homoglyph, ZWSP, RLO, etc.). But the brief explicitly asks for a **rendering lens**: what passes the validator yet still paints a different picture in a real mail client? Below are concrete bypasses and mis‑statements. I do **not** agree with several claims in the packet.

---

## 1. Bidi attack that still passes: U+061C (ARABIC LETTER MARK)

* **Exact input** (use literal `‭` = U+061C):
  ```
  "the upstairs ‭ is not cooling"
  ```
  (19 chars, 5 words, no `<`, no `>`, no forbidden shape)
* **Guard defeated**: `INVISIBLE_RE`. The regex covers U+200B‑U+200F, U+202A‑U+202E, U+2060‑U+2064, U+2066‑U+2069, U+FEFF — but **omits U+061C**, a Unicode bidi format character. NFKC leaves it untouched.
* **What the prospect sees**: In Gmail/Apple Mail/Outlook, U+061C is a zero‑width *strong RTL* mark. Inserted mid‑sentence, it flips the directionality of the surrounding English text (or at least the tail of the email) exactly like the RLO case the packet claims to have closed. The human‑written “We’ll call you in the next 5 minutes” can render reversed or scrambled.
* **Severity**: **High** — same brand‑incident class as the RLO bug, but the fix did not catch it.
* **Verdict on packet**: The claim *“invisible and bidirectional format characters … Rejected outright”* is **overstated**.

---

## 2. Markup guard misses unclosed tags and HTML comments

* **Exact inputs**:
  ```
  "<!--"
  "<!-- hidden"
  "<script"
  "<b"
  ```
  (all ≤10 words, ≤120 chars, no `>` present)
* **Guard defeated**: `FORBIDDEN_SHAPES` markup regex `/<[^>]*>/`. It requires a closing `>`; an unclosed `<` or a comment opener `<!--` (no `>` yet) matches **nothing**.
* **What the prospect sees** (assuming the template concatenates the clause into an HTML email without re‑escaping, which the packet never proves otherwise):
  * `<!--` starts an HTML comment. The remainder of the human‑written sentence (“. We’ll call you in the next 5 minutes…”) is swallowed until a later `-->` (which may never appear). The prospect receives a truncated email.
  * `<b` or `<script` (no `>`) is parsed by many clients as a bogus start tag; subsequent text is consumed as tag content and disappears from view.
* **Severity**: **Critical** if the email is HTML‑interpolated raw; at minimum **High** because the “no markup” promise is broken.

---

## 3. HTML‑entity encoded markup passes the shape check

* **Exact input**:
  ```
  "&lt;b&gt;urgent&lt;/b&gt;"
  ```
  (one token, 22 chars, no literal `<` or `>`)
* **Guard defeated**: `forbidden_shape` (markup) — the string contains `&lt;` not `<`.
* **What the prospect sees**: If the clause is dropped into an HTML body without *double*‑escaping, the mail client decodes entities. The text renders as **bold “urgent”** (or, with `&lt;style&gt;…` / `&lt;script&gt;`, as a style/script block). The validator validated a string that visually becomes markup.
* **Severity**: **High** in any non‑escaping template; medium because most ESPs sanitize scripts but still allow `<b>`, `<span style>`, etc.

---

## 4. Bare‑domain TLD list is incomplete → mail‑client auto‑linking

* **Exact input**:
  ```
  "visit example.cloud today"
  ```
  (4 words, 22 chars; `.cloud` not in `BARE_DOMAIN_RE` list; no `www.`, no `http`)
* **Guard defeated**: `BARE_DOMAIN_RE` (curated TLDs) and `FORBIDDEN_SHAPES` (no scheme).
* **What the prospect sees**: Gmail, Outlook, and Apple Mail maintain their **own** far larger auto‑link TLD tables. `example.cloud` (or `.ai`, `.tech`, `.store`, `.live`) is rendered as a **clickable hyperlink** to an external site. The validator assumed “no link”, but the client creates one.
* **Severity**: **Medium‑High** — phishing/brand surface that the LLM seam can exploit.

---

## 5. NFKC return value changes legitimate text (not just “canonicalization”)

The module returns `normalized` (NFKC + whitespace collapse). The packet asserts this is purely beneficial. It is not always:

* **Input**: `"the straße is not cooling"` (German ß)
* **Returned value**: `"the strasse is not cooling"` (NFKC decomposes ß→ss).
* **Prospect sees**: A misspelled English word. Same for `ﬁ`→`fi`, `①`→`1`, etc.
* **Guard defeated**: none (accepted), but the claim *“returns the normalized form it actually checked, never the raw input”* is presented as a security win; it is also a **legitimacy regression** for non‑ASCII but perfectly valid prospect text.
* **Severity**: **Low** (cosmetic), but worth noting architecturally.

---

## 6. Combining‑mark guard only catches *consecutive* stacks

* **Input** (each letter followed by one nonspacing mark, marks separated by base letters):
  ```
  "à b́ ĉ d̃ ē f̅ ğ ḣ i̋ j̊"
  ```
  (using U+0300‑U+036F individually; 10 words, <120 chars, no 3 consecutive `\p{Mn}`)
* **Guard defeated**: `COMBINING_STACK_RE` (`\p{Mn}{3,}`).
* **What the prospect sees**: Ten letters each wearing a different diacritic — visually noisy, font‑fallback dependent, but not vertical zalgo. The intent “no combining‑mark noise” is partially defeated.
* **Severity**: **Low**.

---

## 7. Ordering bug: VT / FF are collapsed before CONTROL_RE sees them

* **Input**: `"the upstairs \u000B stays hot"` (vertical tab) or `\u000C` (form feed).
* **What the code does**: `normalized.replace(/\s+/g, ' ')` runs **before** `CONTROL_RE`. In ECMAScript, `\s` **includes** U+000B and U+000C. They are turned into a space and never reach `CONTROL_RE`.
* **Guard defeated**: The `\u000B\u000C` branch of `CONTROL_RE` is **dead code**; the packet’s comment says it excludes only TAB/LF/CR, forgetting VT/FF are also `\s`.
* **What reaches prospect**: `"the upstairs stays hot"` (harmless space). No exploit, but the claim that those controls are “rejected” is **wrong**.
* **Severity**: **Informational / Low**.

---

## 8. False rejections that needlessly kill personalization

These are not bypasses but contradict the packet’s “legitimate text accepted” claim:

* **Two‑comma parenthetical** (English, not a list):
  ```
  "the unit, which is old, failed"
  ```
  (6 words, 2 commas → `list_like` rejection). A subordinate clause with paired commas is normal English. It falls back to static copy.
* **Non‑ASCII digits** (Arabic, Devanagari, etc.):
  ```
  "call ٠١٢٣٤٥٦٧٨٩٠"
  ```
  `hasNonAsciiDigit` rejects it. A Hindi/Arabic prospect writing native digits gets **null** even though the text is benign. The test suite only proves Latin‑1 accents (`café`) pass.
* **Severity**: **Low‑Medium** (excludes non‑English prospects, silently degrading the product).

---

## 9. Preview‑pane truncation of a single 120‑char token

`MAX_CHARS=120` permits a single 120‑character word. Many mail clients do not break long unbroken tokens; preview panes clip or horizontally scroll. The deterministic generator won’t do this, but the LLM seam can. Not a validator bypass, but a rendering blast‑radius the packet under‑weights.

---

## Disagreements with the packet’s specific claims

1. **“0 of 21 round‑1 inputs bypass”** — False once U+061C is added to the round‑1 bidi family. The bidi class is **not** fully closed.
2. **“Rejected outright rather than stripped” for invisible/bidi** — True except U+061C, and except that VT/FF are *stripped* (collapsed) not rejected.
3. **“NFKC preserves precomposed accented letters”** — True for `café`, false for `ß`, `ﬁ`, `①`, etc. Returning the normalized string **does** introduce a new problem: altered spelling/meaning.
4. **“Markup guard `/<[^>]*>/`”** — The packet calls it a markup block. It is a *closed‑tag* block only. Unclosed tags, comments, and HTML entities defeat it.
5. **Measurements**: The round‑1 “8 of 9 reached prospect‑facing output” figure is plausible, but the follow‑up claim that the *hardened* validator catches “every forbidden shape” is contradicted by the `.cloud` bare‑domain and entity cases above.

---

## Architecture‑level correction

The validator is necessary but **not sufficient**. The real defect is that the design treats “no forbidden characters” as equivalent to “safe to interpolate”. In an HTML email:

* Output encoding (HTML‑escape `&`, `<`, `>`, `"`) must happen **at the template**, not in the clause validator.
* Link‑auto‑detection is a property of the *rendering client*, not the string; blocking only a curated TLD list is whack‑a‑mole. If the product truly cannot tolerate a clickable link, the clause should be inserted into a context where auto‑linking is disabled (e.g., a `data-` attribute or a `<span>` with `x-apple-data-detectors` disabled) — not merely regex‑filtered.
* Bidi safety should use a vetted Unicode security profile (UTS‑39 / UTS‑55), not a hand‑rolled range that forgot U+061C.

**Bottom line**: The fixed validator stops the *obvious* shape attacks, but a clause that passes it can still arrive as a reversed sentence (U+061C), a hidden email body (`<!--`), bold/italic text (`&lt;b&gt;`), or a phishing link (`example.cloud`) in a real inbox. Those are rendering‑layer incidents, and the packet’s claims of closure are overstated.
