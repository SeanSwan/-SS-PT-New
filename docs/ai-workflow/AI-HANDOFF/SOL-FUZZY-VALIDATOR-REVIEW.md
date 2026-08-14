# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol` (effort: high)
**Document:** C:/Users/BIGOTS~1/AppData/Local/Temp/claude/c--Users-BigotSmasher-Desktop-quick-pt-SS-PT/8faee779-c082-4553-9098-cc960574edf0/scratchpad/pkt/packet.md
**Seed:** (none)
**Tokens:** 9263 in / 23281 out · **Cost:** ~$0.7447 · **Wall:** 490.8s

---

# Hostile-gate review

## Bottom line

The validator is materially better than the original, but it does **not** establish the claimed invariant that contact details, URLs, claims, malformed rendering, or garbage cannot reach the prospect.

The most important remaining problems are:

1. A real ordering bug makes part of `CONTROL_RE` unreachable.
2. The length limit is too late to bound normalization, replacement, regex scans, and `split`.
3. URL, internationalized email, local-phone, currency, and percentage guards are readily bypassed.
4. HTML entity decoding can recreate contact details and bidi controls after validation unless the sink HTML-escapes the returned value.
5. The hand-written Unicode heuristics are both incomplete and strongly biased against legitimate Arabic and multilingual text.
6. `deterministicGenerator` does not have the substring property claimed for it and can create materially false fragments.
7. “Never blocks” and “never throws” are both false for concrete generator behaviors.
8. Treating a generator function as hostile while invoking it in-process is not a security boundary.

---

# 1. Ordering and unreachable guards

## FVS-01 — VT and FF can never be rejected by their `CONTROL_RE` branches

**File:** `services/marketing/fuzzyVariableService.mjs`  
**Anchors:** `CONTROL_RE`, `validateClause()`

`CONTROL_RE` explicitly includes U+000B VERTICAL TAB and U+000C FORM FEED:

```js
+ '\u000B\u000C'
```

But the validator first runs:

```js
const value = normalized.replace(/\s+/g, ' ').trim();
```

JavaScript `\s` includes both VT and FF. They are therefore removed before `CONTROL_RE.test(value)` can see them.

### Exact inputs

```js
validateClause('the upstairs\u000Bstays hot')
validateClause('the upstairs\u000Cstays hot')
```

Both return:

```js
{ ok: true, value: 'the upstairs stays hot' }
```

### What reaches the prospect

```text
the upstairs stays hot
```

### Impact

This is not an injection because the controls are collapsed, but it directly contradicts both:

- “C0/C1 control rejection”
- “rejected, never repaired”

These inputs are repaired, and the corresponding control guard is unreachable.

**Severity: Low security, Medium correctness/specification**

**Fix:** Either reject all disallowed controls before whitespace collapse, or remove VT/FF from `CONTROL_RE` and explicitly document that they are normalized as whitespace.

---

## FVS-02 — The character limit does not bound the expensive pre-limit work

**Anchors:** `validateClause()`, `wordCount()`, `MAX_CHARS`

The first actual size check occurs only after:

1. `raw.normalize('NFKC')`
2. `INVISIBLE_RE.test(normalized)`
3. `normalized.replace(/\s+/g, ' ')`
4. `trim()`
5. `CONTROL_RE.test(value)`
6. `COMBINING_STACK_RE.test(value)`
7. `wordCount(value)`, including another `trim`, a full `split`, and an array allocation

### Exact pathological input

```js
validateClause('a'.repeat(50_000_000))
```

This is only one “word,” so the validator performs every operation above before reaching:

```js
if (value.length > MAX_CHARS)
```

A many-word input is also expensive because `split(/\s+/)` builds a potentially enormous array before returning `too_long`.

### Impact

This is not catastrophic-regex ReDoS, but it is straightforward CPU and memory amplification at the hostile-generator seam. NFKC can also allocate an expanded string.

**Severity: High availability risk if generator output is genuinely hostile**

**Fix:** Add a coarse UTF-16 input ceiling before normalization, for example 1–4 KiB, then retain the normalized 120-code-unit limit:

```js
if (raw.length > 1024) return { ok: false, reason: 'too_long_raw' };
```

The coarse ceiling must be before `normalize`, regexes, `replace`, and `split`.

---

# 2. Regex cost and ReDoS assessment

There is no obvious unbounded catastrophic backtracking after `MAX_CHARS`, because all `FORBIDDEN_SHAPES`, `BARE_DOMAIN_RE`, and `META_PHRASES` execute only after the value is limited to 120 UTF-16 code units.

However:

- `/<[^>]*>/` can exhibit quadratic retry behavior on many `<` characters with no `>`.
- `BARE_DOMAIN_RE` can retry its greedy hostname prefix from multiple starting positions.
- The email and phone expressions can perform substantial backtracking on near-matches.

At 120 code units, none is a practical ReDoS vulnerability.

The regexes that execute before the limit are linear:

- `INVISIBLE_RE`
- `/\s+/g`
- `CONTROL_RE`
- `COMBINING_STACK_RE`
- `/\s+/` in `wordCount`

The problem is therefore **unbounded linear work plus allocation**, not classic exponential ReDoS. The packet should not describe the validator as input-size bounded when the bound comes after these operations.

Also, the test suite’s 3,000- and 5,009-character cases do not meaningfully test pathological cost. Inputs of that size are trivial; they only test the returned reason.

---

# 3. Concrete forbidden-content bypasses

## FVS-03 — The curated bare-domain list is not a URL security guard

**Anchor:** `BARE_DOMAIN_RE`

### Exact input

```text
see coach-offer.fitness for details
```

or:

```text
find details at evil.ai today
```

Both are accepted. `.fitness` and `.ai` are absent from the TLD list.

### What reaches the prospect

The domain appears verbatim and may be auto-linked by Outlook, Apple Mail, Gmail, or mobile data detectors.

### Impact

This defeats the stated “bare domain” protection. A curated list of a few TLDs cannot enforce “no URL.”

**Severity: High**

Other immediate misses include hundreds of gTLDs and ccTLDs such as `.es`, `.de`, `.fr`, `.gr`, `.mx`, `.cloud`, `.agency`, `.coach`, and `.training`.

---

## FVS-04 — Internationalized domains and email addresses bypass all three backstops

**Anchors:** email `FORBIDDEN_SHAPES`, `hasMixedScriptToken()`, `BARE_DOMAIN_RE`

### Arabic EAI address

```text
راسل مستخدم@مثال.إختبار الآن
```

Accepted because:

- the email regex is ASCII-oriented;
- no ASCII Latin letter exists, so `hasMixedScriptToken` is false;
- the bare-domain regex only recognizes ASCII hostnames and listed ASCII TLDs.

### Spanish EAI address

```text
escribe a josé@ejemplo.es hoy
```

Accepted because:

- `é` immediately before `@` prevents the ASCII local-part regex from matching;
- `.es` is not in the TLD list;
- there is no Greek/Cyrillic mixture.

### Greek IDN

```text
δείτε παράδειγμα.ελ τώρα
```

Accepted because it is entirely Greek, so the “mixed script” heuristic does nothing.

### What reaches the prospect

The complete contact detail or domain, potentially as a valid EAI address or IDN and potentially auto-linked.

**Severity: High**

A mixed-script detector is not a replacement for internationalized email/URL recognition. Pure single-script IDNs are normal and can also be malicious.

---

## FVS-05 — Short and punctuated phone numbers bypass the phone expression

**Anchor:** `/\+?\d[\d\s().-]{7,}\d/`

The expression requires at least nine total matched characters: an initial digit, at least seven interior characters, and a final digit.

### Exact local-number bypass

```text
call me at 5551234 today
```

Accepted. Seven-digit local numbers are still contact details.

### Exact separator bypass

```text
call 555/867/5309 today
```

Accepted because `/` is not in the permitted interior class.

### Exact Unicode separator bypass

```text
call 555–867–5309 today
```

The en dash U+2013 survives NFKC and breaks the regex.

### What reaches the prospect

A recognizable phone number, potentially auto-detected by the mail client.

**Severity: High**

A phone detector should normalize or ignore relevant punctuation and format controls before counting digits. That will introduce false positives for serial numbers, so this remains a policy problem rather than a regex-only problem.

---

## FVS-06 — An omitted bidi control can also split a phone number

**Anchors:** `INVISIBLE_RE`, phone expression

U+061C ARABIC LETTER MARK is a bidi format control but is absent from `INVISIBLE_RE`.

### Exact input

```js
'call 555\u061C867\u061C5309 today'
```

It is accepted.

### What reaches the prospect

The prospect sees an effectively contiguous phone number, with invisible bidi controls embedded in it.

### Impact

This defeats both the phone guard and the claimed invisible/bidi-control closure.

**Severity: High**

Other omitted format controls include deprecated bidi controls U+206A–U+206F, U+180E, interlinear annotation controls, and supplementary tag characters. Hand-maintaining a few code-point ranges is not a complete format-control policy.

---

## FVS-07 — Combining Grapheme Joiner is an invisible phone separator

**Anchors:** `INVISIBLE_RE`, `COMBINING_STACK_RE`

U+034F COMBINING GRAPHEME JOINER is invisible, category `Mn`, and not listed in `INVISIBLE_RE`. One at a time does not trigger the three-mark stack detector.

### Exact input

```js
'call 555\u034F867\u034F5309 today'
```

Accepted.

### What reaches the prospect

A visually continuous phone number.

**Severity: High**

This demonstrates why “reject three consecutive `Mn` marks” cannot substitute for rejecting disallowed default-ignorable characters.

---

## FVS-08 — The currency rule only catches symbol-before-digit formatting

**Anchor:** `/\p{Sc}\s?\d/u`

### Exact inputs

```text
the quote was 1200€ last time
the quote was USD 1200 last time
the quote was 1200 dollars last time
```

All are accepted.

### What reaches the prospect

A price claim.

**Severity: Medium to High, depending on whether “any price claim” is truly prohibited**

The current comment claims “price / money claim,” but the implementation means “currency symbol followed almost immediately by a digit.”

---

## FVS-09 — Percentage claims have trivial lexical bypasses

**Anchor:** `/\d{1,3}\s?%/`

### Exact inputs

```text
we cut it 40 percent last year
we cut it forty percent last year
we cut it 40٪ last year
```

The final example uses U+066A ARABIC PERCENT SIGN and ASCII digits. All are accepted.

### What reaches the prospect

A percentage claim.

**Severity: Medium**

This cannot be comprehensively solved with a narrow shape regex. Detecting claims is semantic.

---

# 4. HTML, mail rendering, and downstream normalization

## FVS-10 — HTML entity decoding can recreate forbidden content after validation

**Anchor:** `validateClause()` return value and the downstream interpolation seam

The module does not prove that the clause is escaped at the HTML sink. If it is inserted into a `text/html` body without HTML escaping, entities are decoded after validation.

### Exact contact-detail input

```text
email dana&#64;example&#46;com today
```

The validator accepts this literal value. An HTML parser renders:

```text
email dana@example.com today
```

A client may then auto-link it.

### Exact bidi input

```text
the upstairs &#x202E;sloohcs rieht llac
```

The validator sees no U+202E. In an unescaped HTML body, the parser creates U+202E after validation.

### What reaches the prospect

A decoded email address or bidi override.

**Severity: High until sink-level escaping is demonstrated**

If the caller correctly HTML-escapes `&`, these particular inputs render literally and do not decode. That must be tested end-to-end. A regex against `<...>` is not output encoding.

Quoted-printable and encoded-word concerns are different: a correct MIME library does not reinterpret a literal `=0A` in application text merely because it later chooses quoted-printable transport. Encoded words normally apply to headers, not HTML body text. Those risks are overstated unless the application manually supplies pre-encoded MIME content.

---

## FVS-11 — Returning NFKC can itself create an HTML entity introducer

**Anchor:** `const normalized = raw.normalize('NFKC')`

### Exact input

```text
the upstairs ＆#x202E;sloohcs rieht llac
```

U+FF06 FULLWIDTH AMPERSAND normalizes to ASCII `&`. The returned value becomes:

```text
the upstairs &#x202E;sloohcs rieht llac
```

It passes the validator and can become an actual RLO in an unescaped HTML sink.

### Impact

Returning the normalized string is safer than checking normalized text and returning raw text, but it makes sink encoding even more important. NFKC can create ASCII sink metacharacters such as `&` and quotes.

**Severity: High conditionally on an unescaped sink**

---

## FVS-12 — Lone UTF-16 surrogates are accepted but commonly change during transport

### Exact input

```js
validateClause('the upstairs \uD800 stays hot')
```

This is likely accepted with the unpaired surrogate preserved in the returned JS string.

UTF-8 encoders commonly replace it with U+FFFD, while some serializers or mail libraries may reject it.

### What reaches the prospect

Potentially:

```text
the upstairs � stays hot
```

or no personalization/send if a downstream encoder throws.

### Impact

The value rendered is not necessarily the value validated, and the stated threat model explicitly includes garbled clauses.

**Severity: Medium**

**Fix:** Reject ill-formed UTF-16 before normalization, using `String.prototype.isWellFormed()` where available or an explicit unpaired-surrogate test.

---

# 5. Combining-mark heuristic

## FVS-13 — Stacked rendering noise is still accepted through `Me` marks

**Anchor:** `COMBINING_STACK_RE = /\p{Mn}{3,}/u`

The detector covers only nonspacing marks, not enclosing combining marks.

### Exact input

```js
'the u\u20DD\u20DE\u20DF\u20E0pstairs stays hot'
```

U+20DD, U+20DE, U+20DF, and U+20E0 are combining enclosing marks. The string is accepted.

### What reaches the prospect

A multiply circled/squared/diamonded/crossed character sequence that can render as stacked visual noise.

**Severity: Medium**

Alternating `Mn` and `Me` also prevents any run of three `Mn` while permitting an arbitrarily noisy stack within the 120-code-unit limit.

The comment that ordinary accented text reaches the check “with none at all” is overstated. NFKC composes many common Latin, Vietnamese, and polytonic Greek combinations, but not every valid base-plus-mark sequence has a precomposed equivalent. Fully marked Arabic and scholarly text can legitimately retain multiple combining marks.

---

# 6. Mixed-script, digit, punctuation, and domain correctness

## FVS-14 — Native Arabic digits are rejected in ordinary, non-contact text

**Anchor:** `hasNonAsciiDigit()`

### Exact legitimate Arabic input

```text
المكيف في الطابق ٢ لا يعمل
```

Meaning: “The air conditioner on floor 2 does not work.”

It is rejected as:

```js
{ ok: false, reason: 'non_ascii_digit' }
```

### Impact

This is a concrete false rejection of normal Arabic prospect text. It also behaves inconsistently with fullwidth `２`, which NFKC converts to ASCII `2` and permits.

**Severity: Medium correctness/localization**

Rejecting every non-ASCII decimal digit is not a phone-number heuristic; it is an ASCII-only language policy.

---

## FVS-15 — The mixed-script rule rejects normal multilingual/product notation

**Anchor:** `hasMixedScriptToken()`

### Exact legitimate Greek input

```text
το A/C-κλιματιστικό δεν λειτουργεί
```

Meaning approximately: “The A/C air conditioner does not work.”

The token `A/C-κλιματιστικό` contains ASCII Latin and Greek, so it is rejected as `mixed_script`.

Other legitimate examples include:

```text
η αντλία inverter/κλιματιστικό χάλασε
la bomba α-series no funciona
máy Daikin-α không chạy
```

### Impact

Punctuation does not delimit the detector; the entire whitespace token is treated as a homoglyph attack.

**Severity: Medium correctness**

Conversely, the detector is incomplete:

- `LATIN_RE` recognizes only ASCII Latin.
- The Greek/Cyrillic range omits Greek Extended, Cyrillic Supplement, Cyrillic Extended blocks, and other script characters.
- Entirely Greek, Cyrillic, or Arabic IDNs are not “mixed” and pass.

A UTS #39-style identifier check applied specifically to URL/email candidates would be more defensible than rejecting arbitrary multilingual prose tokens.

---

## FVS-16 — Two-comma list detection falsely rejects normal subordinate clauses

**Anchor:** `value.match(/[,、]/g)`

### Spanish false rejection

```text
el piso, aunque es pequeño, nunca se enfría
```

A normal subordinate clause, not a list. Rejected as `list_like`.

### Vietnamese false rejection

```text
tầng trên, dù máy chạy, vẫn không mát
```

Meaning approximately: “Upstairs, although the unit runs, it still is not cool.” Rejected as `list_like`.

### Greek false rejection

```text
ο πάνω όροφος, παρότι μικρός, δεν κρυώνει
```

Also rejected as `list_like`.

**Severity: Medium correctness**

Meanwhile, Arabic commas are not counted:

```text
تدفئة، تبريد، قنوات، فتحات
```

This is an Arabic enumeration using U+060C and is accepted.

The heuristic is therefore both over-rejecting and under-rejecting depending on writing system.

---

## FVS-17 — Terminal-punctuation detection is not multilingual

**Anchor:** `/[.!?。]$/`

### Arabic question accepted

```text
المكيف لا يعمل؟
```

The terminal character is U+061F ARABIC QUESTION MARK. The full sentence is accepted.

### Greek question accepted

```text
το κλιματιστικό δεν λειτουργεί;
```

Greek question mark U+037E canonically normalizes to a semicolon in common Unicode implementations. Semicolon is not in the terminal-punctuation expression, so the question remains accepted.

### Impact

The “must read as a clause, not a sentence” invariant is only partially implemented.

**Severity: Low to Medium correctness**

---

## FVS-18 — Bare-domain matching can reject legitimate filename or identifier text

### Exact Spanish example

```text
la app falla al abrir config.test
```

This can legitimately refer to a file or test profile named `config.test`, but it is rejected as `bare_domain`.

**Severity: Low to Medium correctness**

This is the inevitable downside of using a domain-shape heuristic. More importantly, it still misses most real domains, so the false-positive cost does not buy a strong security property.

---

# 7. NFKC behavior and the returned value

Returning the exact normalized value that was checked is the correct choice **if normalization is retained**. Returning raw text after checking normalized text would reopen a validation/rendering gap.

However, the packet overstates what NFKC is:

- NFKC is compatibility normalization and is deliberately lossy.
- It is not merely “canonicalization” in the narrow Unicode sense.
- It does rewrite accepted user content, so “rejects, never repairs” is false.

### Exact accepted rewrites

```js
validateClause('the ① floor unit is noisy')
// { ok: true, value: 'the 1 floor unit is noisy' }

validateClause('needs ½-inch tubing upstairs')
// value contains "1⁄2-inch"
```

NFKC can alter typography and semantic distinctions involving enclosed characters, fractions, unit symbols, Roman numerals, ordinal indicators, and compatibility ideographs.

This is mainly a provenance and brand-correctness issue, not a new validation bypass, because the transformed value is checked. The main security exception is when transformed ASCII metacharacters are subsequently interpreted by an unescaped HTML or attribute sink.

Also, `MAX_CHARS` is not actually a character limit. `value.length` counts UTF-16 code units, not Unicode scalar values or grapheme clusters.

---

# 8. Deterministic generator problems

## FVS-19 — The claimed substring invariant is false

**Anchor:** `deterministicGenerator()`

The generator lowercases and rejoins whitespace:

```js
return words.slice(0, MAX_WORDS).join(' ').toLowerCase();
```

### Exact input

```text
I NEED AC HELP NOW
```

Output:

```text
i need ac help now
```

That output is not a substring of the prospect’s raw text.

The claim also fails when whitespace is collapsed or Unicode lowercasing expands a character. For example, uppercase Turkish `İ` lowercases to `i` plus COMBINING DOT ABOVE in JavaScript.

This does not fabricate a factual concept by itself, but the asserted property and its test are false.

**Severity: Medium assurance failure**

---

## FVS-20 — Splitting on periods can create a materially false statement

### Exact input

```text
The unit is 2.5 years old and already failing
```

Output:

```text
the unit is 2
```

The prospect receives:

```text
I hear the unit is 2.
```

The generator has converted “2.5 years old” into an incorrect assertion.

### Contact-fragment example

```text
Email me at dana@example.com instead
```

The first period split can produce:

```text
email me at dana@example
```

That incomplete contact fragment passes `validateClause()` because the email regex requires a dot after the `@` hostname and the bare-domain detector sees no domain.

### Impact

The generator does not invent new tokens, but truncation can absolutely invent a new meaning. “Cannot fabricate a fact” is overstated.

**Severity: High brand/correctness**

---

## FVS-21 — Deterministic extraction safely echoes neither tone nor speaker

### Exact input

```text
I need help with the upstairs cooling
```

Output:

```text
i need help with the upstairs cooling
```

Inserted into the given template:

```text
I hear i need help with the upstairs cooling.
```

The speaker is wrong.

A hostile prospect can also submit:

```text
you idiots never fix the fucking air conditioning
```

Nothing in this validator rejects abuse, slurs, sexual content, threats, competitor promotion, or other brand-damaging semantic content.

“Substring of the prospect note” is not a safety property for an outbound marketing message.

**Severity: High brand risk**

---

# 9. “Never blocks” and “never throws” are false

## FVS-22 — A pending generator blocks indefinitely

**Anchor:** `resolveFuzzyVariables()`

### Exact generator

```js
const generator = () => new Promise(() => {});
```

`resolveFuzzyVariables()` awaits it forever. There is no timeout or abort signal.

A synchronous generator can be worse:

```js
const generator = () => { while (true) {} };
```

No timeout inside the same event loop can recover from this.

**Severity: High availability**

The statement “NEVER blocks a send” is incorrect.

---

## FVS-23 — Error logging can throw from inside the catch block

### Exact generator

```js
const thrown = {};
Object.defineProperty(thrown, 'message', {
  get() { throw new Error('second failure'); },
});

const generator = () => { throw thrown; };
```

The catch block evaluates:

```js
err?.message
```

That invokes the hostile getter and throws. Because this occurs inside the catch block, the async function rejects instead of returning `null`.

`logger.info()` or `logger.warn()` throwing would have the same effect.

**Severity: Medium**

If “always returns null” is load-bearing, logging and error formatting must be wrapped or use safe primitive conversion.

---

# 10. Test-suite assurance gaps

## FVS-24 — The substring test does not test a substring

The test:

```js
for (const word of out.split(' ')) {
  expect(note.toLowerCase()).toContain(word);
}
```

does not prove:

- contiguity;
- order;
- multiplicity;
- preservation of whitespace;
- preservation of raw case;
- that the complete output is a substring.

A bogus generator returning reordered or repeated source words can satisfy this loop.

The correct invariant test would be something like:

```js
expect(note).toContain(out)
```

but the current implementation would fail it because the implementation does not preserve a raw substring.

---

## FVS-25 — The identity test proves object shape, not absence of identity

The test verifies only:

```js
Object.keys(args) === ['noteText', 'source']
```

It does not prove that `noteText` lacks a name, email, phone number, address, medical detail, or other identity. Prospects routinely place identity and contact details in free text.

For example:

```text
I'm Dana Morales; call my work number instead
```

The packet’s strong statement that the generator “NEVER receives identity” is unsupported. The accurate statement is that separately collected identity fields are not deliberately attached to the generator request.

Also, the generator literally receives `source` in addition to note text, so “only the note text” is not exact.

---

## FVS-26 — End-to-end null tests do not establish which guard worked

Tests such as:

```js
expect(await resolveFuzzyVariables(...)).toBeNull()
```

can pass because:

- `sanitizeClientText` returned null;
- the deterministic splitter truncated the payload;
- a different validator guard rejected it;
- the generator returned null;
- an exception was caught.

They do not prove the named validator invariant unless they spy on the generator input and assert the exact validator reason or validated output.

The packet correctly acknowledges this problem for one earlier zalgo probe, but many current tests still assert only `.ok === false` or end-to-end `null`, permitting the same failure mode.

---

## FVS-27 — Several claimed cases are absent from the supplied suite

The packet says it tested, among other things:

- rejecting generators;
- String objects;
- arrays;
- exact 120/121-character boundaries;
- exact one/two-comma boundaries.

Those tests are not present in the supplied suite.

The suite has a synchronous throwing generator, but no generator returning `Promise.reject(...)` and no never-settling generator.

By static count, the pasted `it`/`it.each` cases appear to expand to **71**, not the claimed 72. A test may have been omitted from the packet, but as supplied, the count does not match.

---

## FVS-28 — Some packet reasoning about JavaScript regexes is factually wrong

The packet repeatedly says `\w` and `\d` are ASCII-only “without the `u` flag.”

In JavaScript, adding `/u` does **not** make `\d` Unicode-decimal-aware, and it does not turn `\w` into a general Unicode word-character class. Unicode property escapes such as `\p{Nd}` and script properties are needed.

Also, Arabic-Indic digits are not NFKC-folded to ASCII digits. The test title:

```text
NFKC folds it onto the ASCII guard
```

is wrong for the Arabic-Indic-phone row. That row is rejected by `hasNonAsciiDigit`, not by NFKC making the ASCII phone expression work.

“0 of 21 bypass” proves only that the 21-item corpus is now rejected. It does not establish closure of the confusable, invisible, contact-detail, or URL classes.

---

# 11. Architecture-level finding

## FVS-29 — A hostile generator function cannot be made safe by validating its return value

The design conflates two different things:

1. untrusted generated **text**;
2. an untrusted executable **generator function**.

The validator can constrain only the returned text. Before returning, an in-process generator can:

- read `process.env`;
- access filesystem or network capabilities;
- exfiltrate the note;
- mutate global state;
- consume unbounded CPU or memory;
- never resolve;
- throw adversarial objects.

If an LLM adapter is plugged in, the adapter code must be trusted infrastructure. Only the model response should be considered hostile data. If the adapter itself is hostile, it requires worker/process isolation, restricted capabilities, network policy, and an external deadline.

More fundamentally, a denylist validator cannot determine whether a generated clause is:

- truthful;
- contextually grammatical;
- non-abusive;
- non-discriminatory;
- free of sensitive personal data;
- a legal, health, price, or performance claim;
- appropriate to repeat to the prospect.

The safest architecture for this use case is not free-text generation followed by regex filtering. Prefer:

1. classify the note into a small, server-defined intent taxonomy;
2. choose a human-written clause from that taxonomy;
3. avoid repeating free text;
4. HTML-escape at the actual sink;
5. use an external generator deadline and circuit breaker;
6. test the fully rendered MIME message, not only the service return object.

If free-text clauses remain, this service should be described as a **shape filter**, not as proof that the output is safe or non-fabricated.

---

# Recommended remediation order

1. **Prove sink encoding** with an integration test over the actual HTML/MIME message; reject or escape entity introducers if the sink cannot guarantee it.
2. Add a **pre-normalization raw-size ceiling** and reject ill-formed UTF-16.
3. Add **generator timeout/abort behavior**; isolate any genuinely untrusted executable adapter.
4. Replace hand-curated domain/email handling with a deliberate internationalized-contact policy. At minimum, cover EAI, IDNs, all TLDs, Unicode dot equivalents, and mail-client linkification.
5. Replace invisible ranges with a property-based policy for bidi/default-ignorable characters, with explicit language exceptions if required.
6. Fix control-check ordering.
7. Remove or redesign `deterministicGenerator`’s punctuation truncation; decimal and contact-fragment corruption is unacceptable.
8. Treat comma, digit, and mixed-script rules as localization policies and add real Spanish, Vietnamese, Arabic, and Greek acceptance tests.
9. Rewrite tests to assert the exact load-bearing invariant and guard reason, not merely `null` or `.ok === false`.

The historical hardening found real defects, but the packet’s conclusion is stronger than the implementation supports. The validator now blocks its regression corpus; it does not yet constitute a hostile-output security gate.
