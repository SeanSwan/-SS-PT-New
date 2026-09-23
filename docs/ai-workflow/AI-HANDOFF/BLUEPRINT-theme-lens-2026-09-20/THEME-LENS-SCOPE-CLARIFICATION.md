# Theme-lens scope clarification — resolves Astra A1-07

**Author:** the WorkBuddy seat (Sable), 2026-09-20
**Closes:** Astra hostile review R5, finding **A1-07** (MEDIUM) — *"The packet leaves conflicting
scope instructions for a builder to resolve."*
**Applies to:** the Swan theme lens and its header integration. Nothing else.

---

## The conflict Astra found

The R5 packet says two things that a builder cannot both satisfy as written:

| where | what it says |
|---|---|
| §4 "Constraints — non-negotiable" | **"Design language — Crystalline Swan, closed token set"**, then six colours: midnight-sapphire `#002060`, ice-wing `#60C0F0`, gilded-fern `#C6A84B`, frost-white `#E0ECF4`, wing-purple `#8B5CF6`, obsidian-black `#0A0A0F` |
| §2 (and the evidence table, line 39) | **28 registered themes**, with **130** emitted CSS custom properties, an identical name set across all 28 |

Read literally, "closed token set" plus six colours says *six colours are the whole palette* — which
would require deleting or recolouring the other 22 themes. Read against §2 it says something
completely different. Astra was right to refuse to guess: a builder that picks the first reading
destroys the theme system, and one that picks the second silently ignores a "non-negotiable".

## The ruling

**The six colours are the BRAND AND FALLBACK set. They are not a palette licence.**

1. **All 28 registered themes keep their values.** No palette value is changed by this work. The
   theme lens changes *which* theme is active, never what a theme contains.
2. **The emitted-token contract is preserved exactly.** 130 custom properties, identical name set
   across every theme, as gated by `themeTokens.test.ts`. A lens change that alters the emitted
   name set is out of scope and is a defect, not a design decision.
3. **The six Crystalline Swan colours are used for:** brand surfaces, the lens's own chrome, the
   pre-paint fallback that paints before a theme is known, and any *new* surface this work
   introduces. A new surface uses the brand set or an existing token — never a new raw hex.
4. **"Tokens only — no raw hex in components" still holds** (§4, unchanged). That rule is about how
   a colour reaches the DOM, and it is independent of the palette question above.
5. **The banned list is unchanged and absolute:** `#0a0a1a`, `#00FFFF`, `#7851A9`.

If a builder believes the brand set and a registered theme genuinely collide, that is a question for
Sean — not a judgement call to make in the lane.

## Out of scope — explicitly

Astra also flagged that the packet pulled a **transcript-engine / console** boundary into what is a
header-theme task, without defining a console deliverable. Agreed. Therefore:

- **The transcript engine is out of scope.** No engine file, no engine contract, no engine test.
- **The console is out of scope.** No console enhancement is requested or implied, and none is a
  deliverable of this work.
- The reason the boundary appeared at all is a standing repo rule — the console is **additive** to
  the engine, never a rewrite of it. That rule governs *if* console work happens; it does not
  authorise any here.
- **This work touches the application header lens only.** Concretely: the theme provider, the lens
  components and their stylesheets, the persistence/sync utilities, and the pre-paint bootstrap in
  `frontend/index.html`. Nothing else.

## Why this is a written ruling and not a code change

There is nothing to implement. The conflict was between two sentences in a packet, and the fix is to
say which one governs. Recording it here means the next builder does not re-derive it, and Astra's
next pass can check a stated scope instead of an ambiguous one.
