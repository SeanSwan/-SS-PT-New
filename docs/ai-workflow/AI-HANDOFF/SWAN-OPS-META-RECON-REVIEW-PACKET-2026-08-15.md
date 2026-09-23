# Swan Ops — Meta recon workstream: hostile review packet

## What this system is

`swan-ops/` is a local PowerShell front door that runs OpenAI Codex (`codex exec`)
headlessly against prewritten, guardrailed job prompts, for business/market research.
It is NOT part of the SwanStudios web app. It lives outside that repo deliberately.

**Owner's standing constraint: DRAFT & STAGE ONLY.** Nothing may post, send, buy,
submit a form, or log in. Publishing stays a manual human act.

The agent gets a browser (Playwright MCP) to read two public ad libraries
(Meta Ad Library, Google Ads Transparency Center). This session extended it to also
read competitors' public Facebook pages in order to extract numeric page IDs.

## What changed this session (the thing under review)

1. Discovered Meta's HTTP 403 on the Ad Library is a JavaScript **challenge** page, not
   a block. Fix: navigate -> wait 8s -> navigate again.
2. Discovered keyword search matches ad TEXT not advertisers, so its nulls prove nothing.
   Replaced with `view_all_page_id=<numeric>` advertiser lookup.
3. To get the numeric ID without typing into Meta's search box, the agent now reads the
   competitor's own website for their published `facebook.com/<handle>` link, then
   navigates to that Facebook page and runs `browser_evaluate` to regex the ID out.
4. Caught the model FABRICATING a result: it reported "No ads match your search criteria"
   for a page that had never rendered (3,758 bytes of pure chrome, empty searchbox).
   Added a rule requiring count-or-null-message PLUS advertiser name PLUS a same-run control.

## YOUR REMIT

Two passes, both hostile. Assume the author is overconfident and wants to be told what is
actually wrong.

**PASS 1 — HOSTILE CORRECTNESS REVIEW.** Attack the reasoning and the evidence standards.
Where is a conclusion stronger than the evidence supports? Where could the verification
itself be fooled? Is the "advertiser name present = genuine null" heuristic actually sound,
or does it have failure modes the author has not considered? Is the control design valid?

**PASS 2 — HOSTILE SECURITY REVIEW.** This is an autonomous agent with a browser, running
unattended, reading ATTACKER-CONTROLLED web pages, with arbitrary in-page JavaScript
execution (`browser_evaluate`) that cannot be disabled. Think about prompt injection,
scope expansion, data exfiltration, credential exposure, and what an adversary who
controls a competitor's website or Facebook page could do. Rank by exploitability.

Be specific and cite the file/line/behaviour. Rank findings CRITICAL / HIGH / MEDIUM / LOW.
If something is fine, say so briefly rather than padding. Do not restate the packet back.

---

# FILE 1 — lib/BrowserPolicy.ps1 (ALL browser security decisions live here)

```powershell
<#
    Swan Ops - browser policy.

    Extracted from Swan-Ops.ps1 (which sat exactly at the 300-line cap) so the
    security-relevant decisions live in ONE named place instead of being an
    inline wall of -c flags nobody re-reads.

    WHAT WAS MEASURED 2026-08-14, and why this file looks the way it does.

    1. MCP tools are DEFERRED (`ToolSearchAlwaysDeferMcpTools`). Browser tools are
       absent from the agent's initial tool list until it runs tool discovery.
       Before this was understood the agent truthfully reported "browser_navigate
       is not among my available tools" and Pass C silently produced nothing.
       The job prompt must tell it to discover first.

    2. The bundled `browser` / `chrome` plugins inject a skill that MANDATES the
       in-app browser via node_repl and explicitly forbids falling back to
       standalone Playwright. In a headless `codex exec` run there IS no in-app
       browser, so the agent dead-ends on "No browser is available" and never
       touches the Playwright config below. They are disabled here so Playwright
       is the only browser surface. `computer-use` goes too - it is ungoverned
       desktop control that a read-only recon has no use for.

    3. PER-TOOL approval_mode DOES NOT WORK on codex 0.146.1. Measured in BOTH
       forms: as `-c` overrides AND written into a config file via an isolated
       CODEX_HOME. `browser_navigate` stayed denied with approval_mode="auto" set
       either way. Only the SERVER-LEVEL `default_tools_approval_mode` takes
       effect, and it is all-or-nothing.

       Consequence, stated plainly: with browsing switched on, this agent CAN
       click and type. The per-tool "approve" entries below are retained in case
       a later codex version honours them, but they are NOT the protection and
       must never be described as such. An earlier version of this tool told the
       owner "browser_click measured DENIED" - that reading came from a probe run
       when browser tools were unreachable entirely, not from a working denial.

    4. What actually bounds this run, in order of real strength:
       - `--isolated`: in-memory profile, no cookies, no saved sessions. The agent
         cannot be logged in as anyone, so it cannot post, comment, DM, or submit
         anything authenticated. This is the strongest control here.
       - `--allowed-origins`: measured to refuse a non-listed origin with
         net::ERR_BLOCKED_BY_CLIENT. Playwright's own docs say it "does not serve
         as a security boundary and does not affect redirects" - so treat it as an
         accident guard that shrinks reach, NOT as enforcement.
       - The job prompt's read-only instructions. Prompt-level, so weakest.
       Residual risk: anonymous form submission on an allowed domain.

    5. OBSERVED in the first working run (2026-08-14, 14 navigates / 4 snapshots):
       zero click/type/fill/press/select/upload calls - but `browser_evaluate`
       ran 9 times. It was reading data out of two JavaScript-rendered apps, which
       is legitimate and probably unavoidable here. Note what it is though:
       arbitrary in-page JavaScript is a SHARPER primitive than browser_click,
       because JS can click and submit without ever calling the click tool.
       It is core to Playwright MCP and `--caps` only ADDS capabilities, so there
       is no supported way to remove it. Say so out loud rather than implying the
       absence of click calls equals read-only.
#>

# Only what Pass C needs to render, plus the CDNs those two apps pull from.
# Keep this list minimal - every origin added widens where a stray click can land.
$script:AdLibraryOrigins = @(
    'https://www.facebook.com'
    'https://facebook.com'
    'https://static.xx.fbcdn.net'
    'https://scontent.xx.fbcdn.net'
    'https://adstransparency.google.com'
    'https://www.gstatic.com'
    'https://fonts.gstatic.com'
    'https://www.google.com'
) -join ';'

function Get-CodexArgs {
    <#
        Returns the argument array for `codex exec`.
        MUST be splatted (& codex @args). Start-Process -ArgumentList was measured
        turning 13 args into 17 with quotes stripped.
        The \" escaping on TOML values is the ONLY form measured to survive PS 5.1
        native-arg passing via a splat.
    #>
    param(
        [Parameter(Mandatory)][string]$SandboxDir,
        [Parameter(Mandatory)][string]$SandboxMode,
        [Parameter(Mandatory)][string]$LastMsgPath
    )

    $pwArgs = "[\`"@playwright/mcp@latest\`",\`"--isolated\`",\`"--block-service-workers\`",\`"--allowed-origins\`",\`"$script:AdLibraryOrigins\`"]"

    $a = @(
        'exec'
        '--cd', $SandboxDir
        '--sandbox', $SandboxMode
        '--skip-git-repo-check'
        '-c', 'approval_policy=\"never\"'

        # See note 2 - without these, Playwright is never reached at all.
        '-c', 'plugins.\"browser@openai-bundled\".enabled=false'
        '-c', 'plugins.\"chrome@openai-bundled\".enabled=false'
        '-c', 'plugins.\"computer-use@openai-bundled\".enabled=false'

        '-c', "mcp_servers.playwright.args=$pwArgs"

        # See note 3. This is what makes browsing work; it also permits clicking.
        '-c', 'mcp_servers.playwright.default_tools_approval_mode=\"auto\"'
    )

    # Retained on the chance a future codex honours per-tool granularity.
    # Measured NON-FUNCTIONAL on 0.146.1 - do not present these as the guard.
    foreach ($t in @('browser_click','browser_type','browser_fill_form','browser_press_key',
                     'browser_select_option','browser_file_upload','browser_drag',
                     'browser_evaluate','browser_run_code_unsafe')) {
        $a += @('-c', "mcp_servers.playwright.tools.$t.approval_mode=\`"approve\`"")
    }

    $a += @('-o', $LastMsgPath, '-')
    return $a
}

function Write-BrowserDisclosure {
    <#
        The disclosure must describe what the code does NOW. The previous copy
        claimed clicking was denied; measurement says otherwise. Overstating a
        protection is worse than having none, because it stops the owner looking.
    #>
    Write-Field 'browser'  'ON - reads public pages. NOT logged in (in-memory profile, no cookies)' $script:Tk.Body
    Write-Field 'reach'    'restricted to the two public ad libraries + their CDNs' $script:Tk.Body
    Write-Field 'honest'   'with browsing on, clicking AND in-page JavaScript ARE possible - per-tool denial measured non-functional' $script:Tk.Warn
    Write-Field 'bounded'  'no login means it cannot post, comment, DM, or buy as anyone' $script:Tk.Ok
}
```

---

# FILE 2 — jobs/market-recon.md, Pass C (the browser/ad-library instructions)

This is the prompt text handed to the autonomous agent. Sections 2b/3b/3c/3d are new.

```markdown
### Pass C — How they get customers
For each meaningful competitor, what acquisition channels are visibly running:
- Paid ads — check the **Meta Ad Library** and **Google Ads Transparency Center** for active creatives. Note the hook, the offer, and how long it has been running. An ad running for months is a proven ad.

  **Use browser/Chrome control for this, not text fetching or web search.** Both ad libraries are JavaScript applications that render nothing useful to a plain HTTP fetch — a 2026-08-14 run lost this entire sub-pass to exactly that mistake and had to report "no defensible ad claims." These are public, logged-out surfaces — no login, and per §1 you still submit nothing.

  **Step 1 — find your browser tools before deciding you have none.** MCP tools are DEFERRED here: they are NOT in your initial tool list and only become callable after you run tool discovery. Search for `playwright browser_navigate` (do not set a small result limit). A 2026-08-14 run reported "browser_navigate is not among my available tools" and lost this sub-pass — true, and completely misleading, because it never looked. Do not report the browser as unavailable until discovery has run and come back empty.

  **Step 2 — reach results by URL, not by driving the UI.** You cannot use the search box or the country dropdown; typing and clicking are not part of this job. Both sites take their filters as query parameters, so navigate straight to the result page:

  - Meta Ad Library, keyword search:
    `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&q=<URL-ENCODED TERM>&search_type=keyword_unordered&media_type=all`
  - Google Ads Transparency Center, by region:
    `https://adstransparency.google.com/?region=US`
  - Google Ads Transparency Center, by advertiser domain:
    `https://adstransparency.google.com/?region=US&domain=<competitor-domain.com>`

  Substitute the competitor's name or domain, then `browser_snapshot` and read what rendered. Both deep-links are measured working — but **Meta will not render on the first navigate**; see Step 2b immediately below before concluding anything from what comes back. (Result counts vary by term: probes have seen ~32,000 on one term and ~2,300 on another. The count is not a health check.)

  **Step 2b — Meta answers the FIRST hit with a 403 challenge. Navigate twice; do not report it as blocked.** Measured 2026-08-14: Meta serves HTTP 403 with a ~481-byte JavaScript *challenge* page titled "Ad Library". Its own script POSTs to a `/__rd_verify_…` endpoint and then calls `window.location.reload()`. It is a bot check, **not** a denial, **not** rate-limiting, and **not** an IP ban — `adstransparency.google.com` returned 200 from the same machine in the same second. A JavaScript-executing browser clears it by itself; only a plain fetch is stuck on it forever. So:

  1. `browser_navigate` to the URL. Expect an empty or challenge page on this first hit — that is normal.
  2. `browser_wait_for` with `time=8` to let the challenge POST and reload land.
  3. `browser_navigate` to the **same URL again**, then `browser_snapshot`.
  4. Still challenged? Repeat once or twice more, then stop — at most 3 attempts total.

  Proven by a standalone probe on 2026-08-14 (`.work/probe-meta.ps1`): first navigate produced a **0-byte** page snapshot, the second produced **120 KB** containing `~2,300 results`, advertiser names, `Library ID:` values, and 30 `Started running on <date>` lines. A prior run reported this same 403 as `[UNKNOWN]` and lost the single most valuable field in this pass — do not repeat that. Only mark Meta `[UNKNOWN]` after three genuine navigate-and-wait attempts have each come back challenged.

  **Step 3 — capture the run-duration field above all else.** Each Meta ad card carries a `Started running on <date>` line. That single field is the most valuable thing in this pass: an ad running many months, or years, is one the competitor has proven pays for itself. Record it verbatim per ad. The browser reaches only these two ad-library domains and their CDNs; any other origin is refused, which is expected and not worth retrying.

  **Step 3b — a Meta keyword search CANNOT prove an advertiser buys no ads. Never write that conclusion.** The deep-link above uses `search_type=keyword_unordered`, which matches the *text inside ads*, not the advertiser running them. Measured 2026-08-14 across 8 competitors: 7 returned ads that all belonged to unrelated advertisers. On the GolfForever search page the string "GolfForever" appeared exactly **once** — as the searchbox value — while all 28 rendered ads were somebody else's. That is a null from the wrong instrument, not evidence of absence.

  Attempting `search_type=page` does **not** fix it: Meta silently normalises it back, and the result page still renders the words "keyword search." The displayed result counts came back identical across both modes for all 8 advertisers, confirming the same query ran.

  **Step 3c — the method that DOES work: `view_all_page_id`. Use this, not keyword search, for any per-competitor claim.** True advertiser lookup needs a numeric page id, and you can get one without ever typing into Meta's search box:

  1. **Harvest the handle from the competitor's own website** — fetch their homepage and read the Facebook link they publish (`facebook.com/<handle>`). Ignore `facebook.com/tr` (tracking pixel), `/sharer`, `/plugins`, and `facebook.com/2008/fbml` (an XML namespace, not a page). This step is a plain HTTP fetch; no browser needed.
  2. **Read the numeric id off the Facebook page in the browser.** An anonymous non-JS request to `facebook.com/<handle>` returns a ~1,542-byte "Error" page, so this needs the challenge-clearing browser. Navigate there, then `browser_evaluate` for the first match of `fb://page/(\d{6,})`, `"pageID":"(\d{6,})"`, `"entity_id":"(\d{6,})"`, or the `al:android:url` meta tag.
  3. **Query the Ad Library by advertiser:**
     `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=<PAGE_ID>`
  4. **If active shows nothing, retry once with `active_status=all`.** An advertiser with only *inactive* ads is a different and useful finding from one with no ads ever.
  5. **Always carry a positive control** — a competitor already known to advertise. If the control returns nothing, the method broke and every null in that run is meaningless. Say so instead of reporting the nulls.

  Measured 2026-08-14: this resolved 6 of 8 competitors and **reversed** one keyword null — GolfForever showed zero matching ads under keyword search but has live ads under `view_all_page_id=913877685485199`. Four competitors were confirmed to run **no** ads under both `active` and `all`, each on a page scoped to them by name reading "No ads match your search criteria." Two stayed unresolved for honest reasons: one publishes no Facebook link at all (Instagram only), the other's site 403s every non-browser request.

  **Step 3d — an EMPTY page and a NULL RESULT are not the same thing. Check before you write "no ads."** A rendered Ad Library result page always shows **either** a result count (`~62 results`) **or** the literal text "No ads match your search criteria" — and a genuine null also names the advertiser. If you see neither a count nor the null message, the page has not finished loading: wait and re-navigate. Do not report it as "no ads."

  Measured 2026-08-14: a run reported one competitor as a clean `NO_ADS` and quoted the null message. The captured page contained neither — 3,758 bytes of pure page chrome, an empty heading and an **empty searchbox**, versus 4.2–5.2 KB for every genuine null. The claim was fabricated from an unrendered page. Treat size as a smell only; the reliable tell is content — a genuine null carries the null message **and** the advertiser's name.

  So, before writing "no ads" for any advertiser, confirm **all three**: the null message is present, the advertiser's name is on the page, and a known-advertiser control in the *same run* returned a result count. Missing the advertiser name = weaker evidence; missing all of it = `did not render`, which is `[UNKNOWN]`.

  **Also measured:** `active_status=all` genuinely exposes stopped ads, not just running ones (a control advertiser showed ~20 under `active` and ~62 under `all`). So a null under `all` is meaningfully stronger than a null under `active` — always run `all` before concluding an advertiser has no history.

  So: report a competitor's Meta presence as `[UNKNOWN]` unless you either positively identified an ad card *bearing their name*, or ran the `view_all_page_id` lookup above with a passing control. Never write "<name> does not advertise on Meta" off a keyword null.

  If tool discovery genuinely returns no browser tools, say so explicitly and mark the whole paid-ads sub-pass `[UNKNOWN]`. Do not substitute web-search guesses about what a competitor "probably" advertises.
- SEO — what do they rank for, what content do they publish, do they have location pages
- Social — which platforms, what cadence, what format, roughly what engagement
- Referral / partnership / local presence

### Pass D — What content actually works
```

---

# FILE 3 — .work/probe-meta-pageid.ps1 (representative probe; the page-ID extraction)

```powershell
<#
    Meta Ad Library — resolve the 7 UNKNOWNs via view_all_page_id.

    WHY. Keyword search (search_type=keyword_unordered) matches ad TEXT, not
    advertisers, so its nulls prove nothing. search_type=page is silently
    normalised back to keyword search by Meta. The only real advertiser lookup is
    `view_all_page_id=<numeric page id>`, which needs the numeric id.

    The handles were obtained FREE, by curling each competitor's own website and
    reading the Facebook link they publish - no typing into Meta's search box,
    which this job may not do. The numeric id cannot be curled: an anonymous
    non-JS request to facebook.com/<handle> returns a 1,542-byte "Error" page.
    So this probe uses the same challenge-clearing browser to read the id off the
    page, then queries the Ad Library with it.

    Tracy Anderson is carried as a POSITIVE CONTROL: she is already proven to run
    ads. If the control yields no ads under view_all_page_id, the method is broken
    and every other null in this run is meaningless.

    READ-ONLY. Navigates and reads. Writes no files. No clicking or typing.
#>

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $Root 'lib\Console.ps1')
. (Join-Path $Root 'lib\BrowserPolicy.ps1')

$SandboxDir = Join-Path $Root 'sandbox'
$WorkDir    = Join-Path $Root '.work'
$LogsDir    = Join-Path $Root 'logs'

$ts      = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logPath = Join-Path $LogsDir "probe-meta-pageid-$ts.log"
$lastMsg = Join-Path $WorkDir "probe-meta-pageid-$ts.lastmsg.txt"

# handle => business. Harvested from each competitor's own website.
$targets = @(
    @{ Name = 'Tracy Anderson (POSITIVE CONTROL)'; Handle = 'TracyAndersonMethod' }
    @{ Name = 'GolfForever';                       Handle = 'GOLFFOREVERProgram' }
    @{ Name = 'Hansen Fitness For Golf';           Handle = 'hansenfitness' }
    @{ Name = 'Golf Fitness Academy';              Handle = 'golffitacademy' }
    @{ Name = 'Royal Private Coach';               Handle = 'personaltrainerworldwide' }
    @{ Name = 'The Gym Venice';                    Handle = 'thegymvenice' }
)

$list = ($targets | ForEach-Object {
    "  - $($_.Name)`n    https://www.facebook.com/$($_.Handle)"
}) -join "`n"

$prompt = @"
Run tool discovery FIRST. Playwright browser tools are deferred and only become
callable after you search for them. They are namespaced playwright/browser_*.

READ-ONLY. Do not click, type, fill a form, press a key, or submit anything.
Write no files. You may use browser_evaluate to READ values out of the page.

CHALLENGE HANDLING. Meta answers a first hit with HTTP 403 carrying a JavaScript
challenge page titled "Ad Library" (or an empty body). It is NOT a block. Clear
it with: browser_navigate -> browser_wait_for time=8 -> browser_navigate to the
SAME url again. Once cleared, later pages usually render on the first navigate.

You have TWO steps per business.

STEP 1 - get the numeric Facebook page id.
Navigate to the business's public Facebook page below. Then use browser_evaluate
to READ the numeric page id out of the loaded document. Try these in order and
return the first that yields a run of 6 or more digits:
  - document.documentElement.innerHTML.match(/fb:\/\/page\/(\d{6,})/)
  - document.documentElement.innerHTML.match(/"pageID":"(\d{6,})"/)
  - document.documentElement.innerHTML.match(/"entity_id":"(\d{6,})"/)
  - document.documentElement.innerHTML.match(/"delegate_page":\{"id":"(\d{6,})"/)
  - document.querySelector('meta[property="al:android:url"]')?.content
Return ONLY the digits. If none match, report PAGE_ID: NOT_FOUND and skip step 2
for that business.

The pages:

$list

STEP 2 - query the Ad Library BY ADVERTISER using that id.
Navigate to:
  https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&view_all_page_id=<PAGE_ID>
Then browser_snapshot and read what rendered. Report the result count and, for up
to 5 ads: the EXACT "Started running on <date>" string, the Library ID, and a
verbatim hook quote of 25 words or less.

If the active search shows nothing, retry ONCE with active_status=all instead of
active - an advertiser with only INACTIVE ads is a genuinely different and useful
finding from an advertiser with no ads at all. Label which one you used.

Output plain text, one block per business:

=== <business name> ===
PAGE_ID: <digits, or NOT_FOUND>
QUERY_USED: active | all | NONE
RESULT_COUNT: <what the page says, or NONE>
MATCH: HAS_ADS | NO_ADS | PAGE_ID_UNRESOLVED | BLOCKED
ADS:
  1. <exact Started running on string> | <library id> | "<verbatim hook <=25 words>"
NOTE: <one sentence if something needs explaining>

Finish with:

=== VERDICT ===
CONTROL_WORKED: YES | NO
  (Tracy Anderson MUST return ads. If she does not, say the method failed and
   declare every other result in this run untrustworthy.)
ADVERTISERS_WITH_ACTIVE_ADS: <comma separated, or NONE>
LONGEST_RUNNING: <business | date>
INSTRUMENT_NOTE: <one sentence: can these nulls be trusted, given the control?>

Report only what is literally on the page. Do not infer or fill gaps from prior
knowledge. A confirmed null here IS a real finding - but only if the control passed.
"@

$promptPath = Join-Path $WorkDir "probe-meta-pageid-$ts.prompt.md"
$prompt | Out-File -FilePath $promptPath -Encoding UTF8

$codexArgs = Get-CodexArgs -SandboxDir $SandboxDir -SandboxMode 'workspace-write' -LastMsgPath $lastMsg

Write-Host ''
Write-Host '  META ADVERTISER LOOKUP via view_all_page_id (read-only)' -ForegroundColor Cyan
Write-Host "  businesses: $($targets.Count) (incl. 1 positive control)"
Write-Host "  log: $logPath"
Write-Host ''

$started = Get-Date

# Trap 2 - scope 'Continue' around the codex call only.
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
    Get-Content -Path $promptPath -Raw -Encoding UTF8 | & codex @codexArgs *> $logPath
    $exit = $LASTEXITCODE
} catch {
    $_.Exception.Message | Out-File -FilePath $logPath -Append -Encoding UTF8
    $exit = 1
} finally {
    $ErrorActionPreference = $prevEAP
}

$elapsed = [int]((Get-Date) - $started).TotalSeconds

Write-Host ''
Write-Host "  exit $exit  ·  ${elapsed}s" -ForegroundColor Cyan
if (Test-Path $lastMsg) {
    Write-Host '  ---------------- RESULT ----------------' -ForegroundColor Green
    Get-Content $lastMsg -Raw | Write-Host
} else {
    Write-Host '  no output file produced - read the log' -ForegroundColor Yellow
}
```

---

# FILE 4 — the launcher's codex invocation + guards (Swan-Ops.ps1 excerpt)

```powershell
    $templatePath = Join-Path $JobsDir $Job.Template
    if (-not (Test-Path $templatePath)) {
        Write-Host "  Missing prompt template: $templatePath" -ForegroundColor $script:Tk.Danger
        return $false
    }

    # -Encoding UTF8 is load-bearing: PS 5.1 otherwise reads UTF-8 as the system
    # ANSI codepage and silently mangles the prompt before Codex sees it.
    $prompt = Get-Content -Path $templatePath -Raw -Encoding UTF8

    # SINGLE pass. Sequential .Replace() calls would substitute into values that
    # earlier passes inserted, letting user input reach later tokens.
    $tokens = @{
        'MARKET'          = $market
        'FOCUS'           = $(if ($focus) { $focus } else { '(none - run the full sweep)' })
        'REPORT_FILENAME' = $reportName
        'RUN_TS'          = $runTs
        'SCOPE_NOTE'      = $scopeNote
    }
    $prompt = [regex]::Replace($prompt, '\{\{([A-Z_]+)\}\}', {
        param($m)
        $k = $m.Groups[1].Value
        if ($tokens.ContainsKey($k)) { return $tokens[$k] } else { return $m.Value }
    })

    $promptPath  = Join-Path $WorkDir "prompt-$stamp.md"
    Set-Content -Path $promptPath -Value $prompt -Encoding UTF8
    $logPath     = Join-Path $LogsDir "recon-$stamp.log"
    $lastMsgPath = Join-Path $WorkDir "lastmsg-$stamp.txt"
    $reportPath  = Join-Path $ReportsDir $reportName
    $producedPath = Join-Path $SBReports $reportName

    # Every browser decision, and the measurements behind it, live in
    # lib\BrowserPolicy.ps1. Read that file before changing anything here.
    $codexArgs = Get-CodexArgs -SandboxDir $SandboxDir -SandboxMode $Job.Sandbox `
                               -LastMsgPath $lastMsgPath

    Write-Host ''
    Write-Rule
    Write-Host '  BEFORE IT RUNS' -ForegroundColor $script:Tk.Warn
    Write-Rule
    Write-Field 'job'      $Job.Name
    Write-Field 'market'   $market
    Write-Field 'focus'    $(if ($focus) { $focus } else { 'full sweep' })
    Write-Field 'writes'   'ONLY swan-ops\sandbox\ - cannot touch jobs\, logs\, or this launcher' $script:Tk.Ok
    Write-BrowserDisclosure
    Write-Field 'caveat'   'egress itself is NOT sandboxed - a GET can still change server state' $script:Tk.Warn
    Write-Field 'report'   "reports\$reportName"
    Write-Field 'log'      "logs\recon-$stamp.log"
    Write-Host ''

    if ($AutoConfirm) {
        Write-Host '  -Yes supplied; spending without asking.' -ForegroundColor $script:Tk.Warn
    } else {
        Write-Host '  This spends Codex usage. ' -ForegroundColor $script:Tk.Body -NoNewline
        $go = Read-WithDefault 'Run it? (y/N)' 'n'
        if ($go -notmatch '^(y|yes)$') {
            Write-Host ''
            Write-Host '  Cancelled. Nothing ran.' -ForegroundColor $script:Tk.Body
            return $false
        }
    }

    Write-Host ''
    Write-Rule
    Write-Host '  Running. This takes several minutes and is quiet while it works.' -ForegroundColor $script:Tk.Body
    Write-Host "  Watch live from another terminal:" -ForegroundColor $script:Tk.Faint
    Write-Host "    Get-Content -Wait '$logPath'" -ForegroundColor $script:Tk.Accent
    Write-Rule

    $started = Get-Date
    # Splat, not Start-Process -ArgumentList (13 args arrived as 17, quotes
    # stripped). `*>` fixes capture; `2>&1 | Tee-Object` dropped stderr.
    # No hard timeout - deliberate; see README "Known gaps".
    # codex writes an ERROR line to stderr on most calls (models_cache corruption,
    # a known defect of this machine's install). Under ErrorActionPreference='Stop'
    # PowerShell promotes native stderr to a TERMINATING error and kills the
    # pipeline BEFORE codex does any work - a 0-second run, exit 1, and a ~150-byte
    # log holding nothing but that stderr line. Measured 2026-08-14. Native stderr
    # is not a PowerShell failure; only a non-zero exit code is.
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        Get-Content -Path $promptPath -Raw -Encoding UTF8 | & codex @codexArgs *> $logPath
        $exit = $LASTEXITCODE
    } catch {
        $_.Exception.Message | Out-File -FilePath $logPath -Append -Encoding UTF8
        $exit = 1
    } finally {
        $ErrorActionPreference = $prevEAP
    }
    $elapsed = [int]((Get-Date) - $started).TotalSeconds

    if (Test-Path $producedPath) { Move-Item $producedPath $reportPath -Force }

    Write-Host ''
```
