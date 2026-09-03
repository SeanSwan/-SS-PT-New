# Swan Style Atlas — vision capture (Sean, 2026-09-03)

- **Status:** vision captured, NOT specced yet · **Author:** Opus 5 recording Sean's directive verbatim-in-substance
- **Next:** GLM 5.3 + Flash hostile review of this vision → blueprint (wireframe, mermaid, flowchart, tests) → build
- **Home:** the **Swan Taste Brain** app (`Desktop/swan-taste-brain`), NOT SS-PT. Sean: "the swan taste is what is going to have to have this UI/UX… because for creating the prompts there."
- **Reference:** midlibrary.io/art-styles (screenshot supplied). Sean likes: grid of style thumbnails → hover reveals four images of that artist → click opens the artist/photographer by name.

## What Sean asked for

1. **A visual browser for every artist / photographer / theme / style** — buttons with pictures, not a text list. "I want this design brain to have visual buttons for every single artist, for every single style."
2. **Hover = four images** of that style; **click = the named artist page**, exactly like Midlibrary's interaction.
3. **A queue.** Click styles into a working set that "can show the colors and the styles" — a staging area the prompt is built from.
4. **Richer data than Midlibrary.** "These sites are kinda generic… I would like more information so I can have a better idea of deciding what I wanna use."
5. **Random mode** — a randomiser that pulls styles/themes/names and composes a complete prompt. Two flavours: **one visual prompt** (picture) and **one movie prompt** (film). "Completely wild different scenarios, but structured and smart, though — not just complete random words. I would like something smart."
6. **AI inside the Taste app.** Sean: take Swan Coach from SwanStudios and "completely configure it so that it's just for the Swan Taste app so that it does every single thing we could possibly want it to do to help us build prompts and pictures."
7. **Visually beautiful.** Three.js, modern technique, best practice. This is an awe surface, not a working surface.
8. Tied into the **Swan Design Brain** — the Atlas is where the design brain's style vocabulary becomes something you can *see and pick*, instead of a taxonomy you read.

## Ground truth found before speccing (this changes the plan)

The data Sean wants **already exists locally**, harvested. This is an assembly job far more than a scraping job.

| Asset | Where | What it holds |
|---|---|---|
| `sources/midlibrary/catalog/all_styles.json` | taste-brain | **9,521 styles** — `name, slug, type, sref, url, countries, global_tags, created_at, updated_at, views_count` |
| `sources/midlibrary/catalog/artistic_details.json` | taste-brain | **5,505 artists** keyed by slug — `name, type, slug, description_complete (biography prose), optimal_prompt, seo_description, countries, lifetimeBirth, lifetimeDeath, views_count, in_collections_count` |
| `sources/midlibrary/distilled/prompt-corpus.json` | taste-brain | **4,272 real prompts** the author actually ran (4,044 with parameters), each with `source_doc` + `source_url` |
| Type split | — | `artistic-style` 5,505 · `sref-style` 4,016 |

So requirement 4 ("more data about the artist") is **already satisfiable offline**: biography, lifetime, country, an optimal prompt, popularity, collection membership, and real example prompts per style. No new scraping is needed for v1.

## The constraint that shapes the whole design

**Midlibrary images are third-party copyrighted.** That is precisely why the taste brain lives outside SS-PT with no git remote, and why `OWN-MATERIAL LAW` already exists in that repo. Therefore:

- The Atlas may **reference** midlibrary image URLs for Sean's own loopback viewing. It must **not** copy them into the repo, must not redistribute, must not ship them to any client but `127.0.0.1`, and must never let a partner/client memory generate from that corpus (the existing own-material law already forbids the latter and it leaked once — "rick and morty").
- Any "four images on hover" therefore comes from the live URL, cached at most ephemerally, never committed.
- This is a Sean-only surface. It cannot become a SwanStudios product surface without a licensing answer.

## Sean's image-sourcing decision (2026-09-03, mid-session)

> "I'm probably gonna have to have Qwen on my Hermes go ahead and scrape the photos and stuff off the site itself so we can take that information and use that… and this is gonna be for my own private use."

Recorded as the owner's decision. It resolves open question 1 in a specific direction, and that changes the architecture for the better:

- **Local images beat hot-linking** on every axis that matters here — a 9.5k-cell grid scrolls without 9.5k third-party requests, hover-reveals four frames instantly, and the Atlas works with the laptop offline. Hot-linking would have made the surface's responsiveness hostage to someone else's CDN.
- The posture is unchanged from the corpus already in the repo: **Sean-only, loopback-only, never redistributed, never committed to a synced remote, and never reachable by a partner/client memory** (the existing OWN-MATERIAL LAW already forbids the last one and it leaked once before the fix).
- Practical asks for whoever runs the scrape: rate-limit and identify the agent politely; store under `sources/midlibrary/images/<slug>/` keyed by the slug already in `all_styles.json` so the Atlas joins on it with no new index; keep the source URL alongside each file so every tile can still credit and link back; add the image directory to that repo's ignore rules so a future `git add -A` cannot publish it.
- The Atlas should degrade to the remote URL (or a placeholder tile) for any slug whose local image is missing, so a partial scrape still renders.

Note this is a private research/reference archive on Sean's own machine — the same footing as the text corpus already there. Nothing in the Atlas design distributes it, and the surface must not become a SwanStudios product feature without a separate licensing answer.

## Open questions for the hostile review to attack

1. ~~Hot-link vs offline~~ — RESOLVED by the owner above (local scrape, private use). Residual for the review: what does the Atlas render for a slug whose image is missing, and how is the image directory kept out of any future sync?
2. Three.js on a 9,521-cell grid: does it earn its place, or is it decoration that costs scroll performance? What exactly is the 3D *for*?
3. Random mode must be "smart, not word salad." What is the actual generative contract — does it draw from Sean's evidence-tier taste, from the style catalog, or both, and what forbids an incoherent pairing?
4. Does the Taste app's AI belong as an adapted Swan Coach, or is that the wrong parent (Coach is a fitness-domain agent with its own command surface and permissions)?
5. The queue: is it a new store, or does it reuse the existing `kept`/`picks` machinery so it inherits never-show-twice and undo?
6. What breaks the existing Make → ComfyUI → Judge loop if a new surface starts writing prompts?

## Pointers

- Taste brain surfaces already present: `app-shell, app-make, app-judge, app-directions, app-kept, app-gallery, app-favourites, app-studio, app-studio-brain, app-ai, app-design, app-status` — the Atlas must be shown NOT to duplicate `app-gallery`/`app-studio-brain` before a line is written.
- Swan Design Brain Step 3.5 (`docs/ai-workflow/design-brain/style-intelligence.md`, this repo) is the consumer that would read Atlas picks as style anchors.
- `project_swan_taste_brain_and_prompter` memory carries the app's laws (own-material, never-show-twice, one memory = profile × project).
