# Swan Brain Query — searching the Karpathy Wiki from this repo

**Tool:** `node scripts/swan-brain.mjs`
**Vault:** `~/hermes2/brain-vault` in WSL — **outside this repo, not under git**
**Added:** 2026-08-21 (SWA-186)

One search surface over everything Sean has put into his brain. Hermes reaches it through its MCP
tools; this gives **Codex and Claude the same reach** from a terminal, so all three agents work from
the same knowledge instead of three private ones.

## What is in it

| Collection | Docs | What it is |
|---|--:|---|
| `books` | 3,094 | Sean's book library |
| `repo-docs` | 633 | documentation ingested from repos |
| `desktop-c-pdfs` | 441 | PDFs from his machine |
| `swan-midlibrary` | 116 | **Midjourney reference archive** — 78 guides, 223 SREF style codes, 3,932 real prompts, parameter + style-vocabulary tables |
| `music-nirvana-misc` | 90 | music reference |
| `bible` | 33 | |
| `design-claims` | 6 | adjudicated Swan design claims |
| `swan-visual-taste` | 5 | **Sean's own visual taste** — identity, refusals, rated styles, kept prompts |
| `clients-private` | — | **segregated, never in the public index** |

## Usage

```bash
node scripts/swan-brain.mjs "chaos parameter"                        # search everything
node scripts/swan-brain.mjs -c swan-midlibrary "sref cinematic"      # one collection
node scripts/swan-brain.mjs -c swan-visual-taste "wildlife"          # what Sean likes
node scripts/swan-brain.mjs --open 4314                              # read a hit in full
node scripts/swan-brain.mjs --open 4314 -n 8000                      # longer excerpt
node scripts/swan-brain.mjs --collections                            # what is in the brain
```

## When to use it

- **Before designing any visual/generative surface** — `swan-visual-taste` says what Sean actually
  wants, in his own words. Cheaper and more accurate than guessing from the palette rules.
- **Any Midjourney / image-prompt work** — `swan-midlibrary` holds the parameter semantics, the
  style codes, and thousands of prompts a professional actually ran.
- **"Have we decided this before?"** — `repo-docs` and `design-claims` often answer it.
- **Anything Sean has read** — `books` and `desktop-c-pdfs` are his reference shelf.

Complements, does not replace, `docs/ai-workflow/CATALOG.md` (Rule 72). The catalog indexes *this
repo's* documents; the brain indexes *everything Sean has ingested*, most of which is not in any repo.

## Hard rules

1. **Read-only.** This tool never writes to the vault. Writing is done by the owning system
   (`swan-taste-brain/prompter/*.mjs`), never ad hoc from here.
2. **The corpus never enters git.** The vault holds third-party copyrighted material — books, PDFs,
   a subscription archive Sean pays for. **Cite what you find; never paste it into this repo**, a
   commit message, a doc, or a PR. A short quote to make a point is fine; reproducing the source is
   not. This is the whole reason the vault lives outside the tree.
3. **`clients-private` is segregated** and excluded from the index this tool reads. Do not try to
   reach it, and never pass `--include-private` to the underlying vault tooling.
4. **Zero PII outward (Rule 8).** Vault content may be read locally; it must not be pasted into an
   external model consult without the usual sanitisation.

## Gotchas

- **FTS5 ANDs your terms.** `"chaos parameter"` requires both words in one document. Two or three
  specific terms beat a sentence, and a broad `"a OR b OR c"` probe **under**-returns rather than
  widening — it reads as missing data when the documents are there. (This trap has bitten repeatedly;
  see the comment at the call site in `verify-mcp-path.py`.)
- **Empty result ≠ absent.** Re-query with different terms before concluding something is not in the
  brain.
- **Needs WSL.** The vault lives in the WSL filesystem. If the tool cannot reach it, check
  `wsl.exe -- ls ~/hermes2/brain-vault`.
- **New content needs a reindex** before it is searchable:
  `cd ~/hermes2/brain-vault && python3 tools/hermes2_brain_search.py build`

## Adding knowledge to the brain

Write a native collection — `collections/<name>/<UTC-ts>/extracted/<bucket>_batches/` with an
`extraction-ledger.csv` (`status,output_text_path,source_relative_path,source_absolute_path,title,author,char_count,page_count,truncated`;
status must be `extracted`) plus `texts/*.txt` — then reindex. Working examples:
`swan-taste-brain/prompter/export-to-hermes.mjs` (small, current-state) and
`ingest-corpus-to-vault.mjs` (bulk, chunked for retrieval).

**Chunk large material.** A 223-row table as one document retrieves poorly; the SREF index is split
into 25-code chunks so a query lands on the code rather than the table.
