# Review packet — Swan Ops console (launcher + recon job prompt)

**Remit: hostile review. Try to break this. Find what will bite the owner later.**

## What this is

A local, single-operator console that fires the Codex CLI (`codex exec`, headless)
at business jobs for a personal-training business. Job 1 of a planned catalogue is
market/competitor recon. It is a personal ops tool, NOT application code — it does
not ship to customers and is not part of the production web app.

Owner-chosen scope constraint: **draft & stage only.** No job may post, send, buy,
submit a form, log in, or take any outward action. Publishing stays a manual
decision in a separate admin UI.

## Design intent

- `Swan-Ops.cmd` double-click -> `Swan-Ops.ps1` menu -> pick job -> answer two
  questions -> disclosure block showing the exact command -> explicit y/N -> run.
- Also runnable non-interactively: `-Market ... -Focus ... -Yes` (for scheduling).
- The safety boundary is the sandbox, not the prompt text: Codex runs with
  `--sandbox workspace-write --cd <console folder>`, so it can write only there.
- Prompt templates live in `jobs/*.md` with `{{TOKEN}}` substitution.
- Environment: Windows 11, PowerShell 5.1 (NOT PowerShell 7 — this matters),
  Codex CLI 0.146.1, model gpt-5.6-sol.

## Already found and fixed — do NOT re-report these

1. Prompt template read without `-Encoding UTF8`; PS 5.1 read UTF-8 as ANSI and
   corrupted 26 characters of the prompt before the model saw it. Fixed; verified
   26 -> 0 with em-dashes intact.
2. The disclosure block asserted "cannot write to SS-PT" without testing. Now
   measured: instructing Codex to write outside root returns
   `patch rejected: writing outside of the project`.
3. `2>&1 | Tee-Object` silently dropped stderr. Probe: 50 stdout + 50 stderr lines
   in, 58 lines out, `stderr line 50` absent. Codex writes its session narration to
   stderr, so a failed run produced a 26-byte log while shell redirection of the
   same prompt produced 112 KB — the tool told the user "check the log" and pointed
   at an empty file. Replaced with `Start-Process` + file redirection for stdin,
   stdout, stderr.
4. Console copy claimed "Live output below" after the fix removed live streaming.
   Copy corrected to match behaviour.

## What I want attacked

- **The safety story.** Is "draft & stage only" actually enforceable, or can a
  crafted market/focus string, a job prompt edit, or Codex's own tooling escape it?
  The sandbox blocks writes outside root — but what about network actions, form
  submission, or logins that the sandbox does not govern at all?
- **Input handling.** `$market`/`$focus` flow into a filename slug, into prompt
  text, and into console output. Path traversal was tested and contained. What was
  not tested?
- **Prompt injection.** The recon job reads arbitrary public web pages. A
  competitor could host text designed to redirect the agent. The prompt has
  constraints but no explicit injection defence. How bad is this, and what is the
  cheapest real mitigation?
- **The `-Yes` flag.** It bypasses the spend confirmation for scheduling. What does
  that enable that the owner has not thought about?
- **Failure modes and honesty.** A first live run produced a report with 60
  VERIFIED / 31 INFERRED / 41 UNKNOWN tags and 124 source URLs, and correctly
  reported that it could not reach the ad libraries rather than inventing data. Is
  the tagging discipline actually load-bearing, or is it theatre a model can
  satisfy while still fabricating?
- Anything else that will cost the owner time, money, or trust later.

Repository rules that constrain any fix you propose: styled-components only (N/A
here), no secrets in committed files, IDs/roles only in any artifact, and the tool
must remain operable by one non-programmer owner clicking one file.

---

# FILE 1 of 2 — Swan-Ops.ps1

```powershell
<#
    SWAN OPS CONSOLE
    ----------------
    One button. Pick a job. Codex does the work.

    v1 job catalogue:
      1. Market & competitor recon  (read-only research -> markdown report)

    Design rules this launcher obeys:
      * DRAFT & STAGE ONLY. No job in this console posts, sends, buys, or
        submits anything. Outward action is a separate decision Sean makes by
        hand, in the app, later.
      * The sandbox is the real boundary, not the prompt text. Codex runs with
        --sandbox workspace-write and --cd pinned to this swan-ops folder, so it
        physically cannot write into the SwanStudios repo or anywhere else.
      * Full disclosure before spend. The exact command is printed and confirmed
        before anything runs.
      * Everything is logged locally. Transcript per run under logs/.
#>

#Requires -Version 5.1

<#
    Non-interactive mode. Supply -Market to skip the menu entirely:

      .\Swan-Ops.ps1 -Market "premium golf-performance training" -Focus "pricing" -Yes

    This is how you schedule a recurring recon, and how anything other than a
    human hand drives the console. Without -Yes it still stops at the
    confirmation, so automation has to opt in to spending explicitly.
#>
param(
    [string]$Market,
    [string]$Focus = '',
    [string]$Job   = '1',
    [switch]$Yes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root       = Split-Path -Parent $MyInvocation.MyCommand.Path
$JobsDir    = Join-Path $Root 'jobs'
$ReportsDir = Join-Path $Root 'reports'
$LogsDir    = Join-Path $Root 'logs'
$WorkDir    = Join-Path $Root '.work'

foreach ($d in @($ReportsDir, $LogsDir, $WorkDir)) {
    if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
}

# ---------------------------------------------------------------- presentation

function Write-Rule { param([string]$Char = '-')
    Write-Host ($Char * 66) -ForegroundColor DarkCyan
}

function Write-Banner {
    Clear-Host
    Write-Host ''
    Write-Host '   SWAN OPS' -ForegroundColor Cyan -NoNewline
    Write-Host '  |  business console' -ForegroundColor DarkGray
    Write-Host ''
    Write-Rule
}

function Write-Field { param([string]$Label, [string]$Value, [ConsoleColor]$Color = 'Gray')
    Write-Host ('  {0,-14}' -f $Label) -ForegroundColor DarkGray -NoNewline
    Write-Host $Value -ForegroundColor $Color
}

function Read-WithDefault {
    param([string]$Prompt, [string]$Default = '')
    if ($Default) {
        Write-Host "  $Prompt " -ForegroundColor Gray -NoNewline
        Write-Host "[$Default]" -ForegroundColor DarkGray -NoNewline
        Write-Host ': ' -NoNewline
    } else {
        Write-Host "  $Prompt" -ForegroundColor Gray -NoNewline
        Write-Host ': ' -NoNewline
    }
    $answer = Read-Host
    if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
    return $answer.Trim()
}

# ------------------------------------------------------------------ preflight

function Test-Preflight {
    $codex = Get-Command codex -ErrorAction SilentlyContinue
    if (-not $codex) {
        Write-Host ''
        Write-Host '  Codex CLI is not on PATH.' -ForegroundColor Red
        Write-Host '  Install it, or open the terminal where `codex --version` works.' -ForegroundColor DarkGray
        Write-Host ''
        return $false
    }
    $version = (& codex --version 2>&1 | Select-Object -First 1)
    Write-Field 'codex' $version 'Green'
    return $true
}

# ------------------------------------------------------------------- job defs

# Each job: the prompt template, the sandbox it earns, and any per-run tokens it
# needs filled in. Adding a job later means adding a row here and a prompt file.
$Jobs = @(
    [ordered]@{
        Key         = '1'
        Name        = 'Market & competitor recon'
        Blurb       = 'Codex researches your market and writes a report. Reads public pages only.'
        Template    = 'market-recon.md'
        Outward     = $false
        Sandbox     = 'workspace-write'
    }
)

function Show-Menu {
    Write-Host ''
    Write-Host '  What should Codex work on?' -ForegroundColor White
    Write-Host ''
    foreach ($j in $Jobs) {
        Write-Host "    $($j.Key). " -ForegroundColor Cyan -NoNewline
        Write-Host $j.Name -ForegroundColor White
        Write-Host "       $($j.Blurb)" -ForegroundColor DarkGray
    }
    Write-Host ''
    Write-Host '    Q. ' -ForegroundColor DarkGray -NoNewline
    Write-Host 'quit' -ForegroundColor DarkGray
    Write-Host ''
}

# ------------------------------------------------------------------- the runner

function Invoke-ReconJob {
    param(
        $Job,
        [string]$PresetMarket,
        [string]$PresetFocus,
        [switch]$AutoConfirm
    )

    Write-Banner
    Write-Host '  MARKET & COMPETITOR RECON' -ForegroundColor White
    Write-Host ''

    if ($PresetMarket) {
        # Non-interactive: values came from the command line.
        $market = $PresetMarket
        $focus  = $PresetFocus
        Write-Host '  (non-interactive - market supplied on the command line)' -ForegroundColor DarkGray
        Write-Host ''
    } else {
        Write-Host '  Two questions, then it runs.' -ForegroundColor DarkGray
        Write-Host ''

        $market = Read-WithDefault 'Market or geography to research' 'premium personal training, United States (online + in-person)'
        if ([string]::IsNullOrWhiteSpace($market)) {
            Write-Host '  Cancelled.' -ForegroundColor DarkGray
            return
        }

        Write-Host ''
        Write-Host '  Anything specific this run? (pricing, ads, content angles, a named' -ForegroundColor DarkGray
        Write-Host '  competitor, golf/sport niche...) Leave blank for the full sweep.' -ForegroundColor DarkGray
        $focus = Read-WithDefault 'Focus' ''
    }

    $stamp     = Get-Date -Format 'yyyy-MM-dd-HHmmss'
    $runTs     = Get-Date -Format 'yyyy-MM-dd HH:mm'
    $slug      = ($market -replace '[^a-zA-Z0-9]+', '-').Trim('-').ToLower()
    if ($slug.Length -gt 40) { $slug = $slug.Substring(0, 40).Trim('-') }
    $reportName = "$stamp-$slug.md"

    $scopeNote = if ($focus) { "focused: $focus" } else { 'full A-E sweep' }

    # Materialise the prompt with this run's tokens filled in.
    $templatePath = Join-Path $JobsDir $Job.Template
    if (-not (Test-Path $templatePath)) {
        Write-Host "  Missing prompt template: $templatePath" -ForegroundColor Red
        return
    }
    # -Encoding UTF8 is load-bearing: PowerShell 5.1 otherwise reads a UTF-8
    # file as the system ANSI codepage and quietly mangles every em-dash and
    # curly quote in the prompt before Codex ever sees it.
    $prompt = Get-Content -Path $templatePath -Raw -Encoding UTF8
    $prompt = $prompt.Replace('{{MARKET}}',          $market)
    $prompt = $prompt.Replace('{{FOCUS}}',           $(if ($focus) { $focus } else { '(none - run the full sweep)' }))
    $prompt = $prompt.Replace('{{REPORT_FILENAME}}', $reportName)
    $prompt = $prompt.Replace('{{RUN_TS}}',          $runTs)
    $prompt = $prompt.Replace('{{SCOPE_NOTE}}',      $scopeNote)

    $promptPath = Join-Path $WorkDir "prompt-$stamp.md"
    Set-Content -Path $promptPath -Value $prompt -Encoding UTF8

    $logPath      = Join-Path $LogsDir "recon-$stamp.log"
    $lastMsgPath  = Join-Path $WorkDir "lastmsg-$stamp.txt"
    $reportPath   = Join-Path $ReportsDir $reportName

    # ---- disclosure ----------------------------------------------------------
    Write-Host ''
    Write-Rule
    Write-Host '  BEFORE IT RUNS' -ForegroundColor Yellow
    Write-Rule
    Write-Field 'job'        $Job.Name
    Write-Field 'market'     $market
    Write-Field 'focus'      $(if ($focus) { $focus } else { 'full sweep' })
    Write-Field 'sandbox'    "$($Job.Sandbox), rooted at swan-ops\  (cannot write to SS-PT)" 'Green'
    Write-Field 'outward'    'none - reads public pages, writes one report' 'Green'
    Write-Field 'report'     "reports\$reportName"
    Write-Field 'log'        "logs\recon-$stamp.log"
    Write-Host ''
    Write-Host '  Command:' -ForegroundColor DarkGray
    Write-Host "    codex exec --cd `"$Root`" --sandbox $($Job.Sandbox) \" -ForegroundColor DarkCyan
    Write-Host "         --skip-git-repo-check -c approval_policy=`"never`" \" -ForegroundColor DarkCyan
    Write-Host "         -o `"$lastMsgPath`" -  < prompt-$stamp.md" -ForegroundColor DarkCyan
    Write-Host ''
    if ($AutoConfirm) {
        Write-Host '  -Yes supplied; spending without asking.' -ForegroundColor Yellow
        $go = 'y'
    } else {
        Write-Host '  This spends Codex usage. ' -ForegroundColor DarkGray -NoNewline
        $go = Read-WithDefault 'Run it? (y/N)' 'n'
    }
    if ($go -notmatch '^(y|yes)$') {
        Write-Host ''
        Write-Host '  Cancelled. Nothing ran.' -ForegroundColor DarkGray
        Write-Host ''
        return
    }

    # ---- run -----------------------------------------------------------------
    Write-Host ''
    Write-Rule
    Write-Host "  Running. This takes several minutes and is quiet while it works." -ForegroundColor DarkGray
    Write-Host "  Full transcript is written to logs\recon-$stamp.log when it finishes." -ForegroundColor DarkGray
    Write-Host "  To watch it live, open a second terminal:" -ForegroundColor DarkGray
    Write-Host "    Get-Content -Wait '$WorkDir\out-$stamp.txt'" -ForegroundColor DarkCyan
    Write-Rule
    Write-Host ''

    $started = Get-Date

    $codexArgs = @(
        'exec'
        '--cd', $Root
        '--sandbox', $Job.Sandbox
        '--skip-git-repo-check'
        '-c', 'approval_policy="never"'
        '-c', 'mcp_servers.playwright.tools.browser_navigate.approval_mode="auto"'
        '-c', 'mcp_servers.playwright.tools.browser_resize.approval_mode="auto"'
        '-o', $lastMsgPath
        '-'
    )

    # Why Start-Process and not `Get-Content | & codex 2>&1 | Tee-Object`:
    # that pipeline SILENTLY DROPS STDERR. Measured 2026-08-14 — a probe emitting
    # 50 stdout + 50 stderr lines came out the far end with all 50 stdout lines and
    # only 8 stderr lines. Codex writes its entire session narration to stderr, so
    # a failed run produced a 26-byte log while the same prompt redirected by the
    # shell produced 112 KB. The launcher was telling the user "check the log"
    # and pointing them at an empty file at the exact moment they needed it.
    #
    # File-based stdin also removes a second hazard: piping the prompt in while the
    # host's own stdin is redirected is fragile, and is the likeliest cause of a run
    # that died at 8 seconds.
    $outFile = Join-Path $WorkDir "out-$stamp.txt"
    $errFile = Join-Path $WorkDir "err-$stamp.txt"
    try {
        $proc = Start-Process -FilePath 'codex' `
                              -ArgumentList $codexArgs `
                              -NoNewWindow -Wait -PassThru `
                              -RedirectStandardInput  $promptPath `
                              -RedirectStandardOutput $outFile `
                              -RedirectStandardError  $errFile
        $exit = $proc.ExitCode

        # One log, both streams, stderr last so the failure reason is at the end.
        if (Test-Path $outFile) { Get-Content $outFile -Encoding UTF8 | Set-Content  $logPath -Encoding UTF8 }
        if (Test-Path $errFile) { Get-Content $errFile -Encoding UTF8 | Add-Content $logPath -Encoding UTF8 }
        Remove-Item $outFile, $errFile -ErrorAction SilentlyContinue
    } catch {
        Write-Host ''
        Write-Host "  Run failed: $($_.Exception.Message)" -ForegroundColor Red
        $_.Exception.Message | Out-File -FilePath $logPath -Append -Encoding UTF8
        $exit = 1
    }

    $elapsed = [int]((Get-Date) - $started).TotalSeconds

    # ---- result --------------------------------------------------------------
    Write-Host ''
    Write-Rule
    if (Test-Path $reportPath) {
        $size = [math]::Round((Get-Item $reportPath).Length / 1KB, 1)
        Write-Host '  DONE' -ForegroundColor Green
        Write-Field 'report'  $reportPath 'Green'
        Write-Field 'size'    "$size KB"
        Write-Field 'elapsed' "${elapsed}s"
        Write-Host ''
        $open = Read-WithDefault 'Open it now? (Y/n)' 'y'
        if ($open -match '^(y|yes)$') { Invoke-Item $reportPath }
    } else {
        Write-Host '  NO REPORT WAS WRITTEN' -ForegroundColor Yellow
        Write-Field 'expected' $reportPath 'Yellow'
        Write-Field 'exit code' "$exit"
        Write-Field 'elapsed'  "${elapsed}s"
        Write-Host ''
        Write-Host '  Codex ran but did not produce the report file. Check the log:' -ForegroundColor DarkGray
        Write-Host "    $logPath" -ForegroundColor DarkGray
        if (Test-Path $lastMsgPath) {
            Write-Host ''
            Write-Host '  Its final message:' -ForegroundColor DarkGray
            Get-Content $lastMsgPath -Encoding UTF8 | Select-Object -First 20 | ForEach-Object {
                Write-Host "    $_" -ForegroundColor DarkGray
            }
        }
    }
    Write-Rule
    Write-Host ''
}

# ---------------------------------------------------------------------- main

Write-Banner
if (-not (Test-Preflight)) {
    Read-Host '  press enter to close'
    exit 1
}
Write-Field 'root'    $Root
Write-Field 'mode'    'draft & stage only - no posting, sending, or buying' 'Green'

# Non-interactive: -Market supplied, so run that one job and exit rather than
# entering the menu loop. This is the path a scheduler would take.
if ($Market) {
    $presetJob = $Jobs | Where-Object { $_.Key -eq $Job } | Select-Object -First 1
    if (-not $presetJob) {
        Write-Host ''
        Write-Host "  No job '$Job'." -ForegroundColor Red
        exit 1
    }
    Invoke-ReconJob -Job $presetJob -PresetMarket $Market -PresetFocus $Focus -AutoConfirm:$Yes
    exit 0
}

while ($true) {
    Show-Menu
    $choice = Read-WithDefault 'Choice' 'q'

    if ($choice -match '^(q|quit|exit)$') {
        Write-Host ''
        Write-Host '  Bye.' -ForegroundColor DarkGray
        Write-Host ''
        break
    }

    $job = $Jobs | Where-Object { $_.Key -eq $choice } | Select-Object -First 1
    if (-not $job) {
        Write-Host ''
        Write-Host "  No job '$choice'." -ForegroundColor Yellow
        continue
    }

    switch ($job.Template) {
        'market-recon.md' { Invoke-ReconJob -Job $job }
        default           { Write-Host '  That job has no runner yet.' -ForegroundColor Yellow }
    }

    Write-Host ''
    Read-WithDefault 'press enter for the menu' '' | Out-Null
    Write-Banner
    Write-Field 'root' $Root
    Write-Field 'mode' 'draft & stage only - no posting, sending, or buying' 'Green'
}

```

# FILE 2 of 2 — jobs/market-recon.md (the job prompt)

```markdown
# JOB: Market & Competitor Recon — SwanStudios

You are running a **read-only market intelligence sweep** for a personal-training business.
Your entire output is one markdown report. You take **no outward action of any kind.**

---

## 1. HARD CONSTRAINTS — read these before anything else

These are not preferences. Violating any one of them fails the job.

**Read-only, always.** You may navigate to public pages and read them. You may NOT:
- log in to any account, or use any saved session/cookie to reach logged-in content
- submit any form, including "free consultation", newsletter, contact, quote, or lead forms
- send any message, DM, comment, review, application, or email
- make any purchase, start any trial, or enter payment details
- create any account
- post anything, anywhere, on any platform
- download or execute files
- write to any directory other than your working root

If a page requires a login or a form submission to see the thing you want, **record it as a gap and move on.** An unanswered question is a fine outcome. A submitted form is not.

**Respect the front door.** Public pages, public profiles, public pricing pages, public ad libraries (Meta Ad Library, Google Ads Transparency Center), public review pages, published articles. No scraping tools, no rate hammering, no paywall circumvention, no logged-in-only surfaces.

**Zero personal data.** Never record a private individual's name, email, phone, address, photo, health information, or any client identity — not the client of a competitor, not a reviewer, not a person in a testimonial. Businesses and public brand accounts are fair game; private people are not. If a review or testimonial is useful, quote the *substance* and attribute it as "a reviewer", never by name or handle.

**Every claim carries a source.** A URL, or it did not happen. See the confidence rules in §4.

---

## 2. Who you are researching for

**SwanStudios** — sswanstudios.com. A trainer-led personal-training business with a software platform behind it.

What makes it different from a generic gym or a generic fitness app:
- The trainer relationship is the product. Software makes the coach better; it does not replace them.
- It owns the client's actual training record — programs, workout logs, coach notes, adherence, progress over time — rather than syncing someone else's data.
- Positioning is premium and personal, not budget or mass-market.

Pricing, for competitive comparison:
- $175 per hour session
- $110 per 30-minute session (10-pack $1,100)
- 3-month $8,400 · 6-month $16,800 · 12-month $33,600

The owner's credentials, stated **exactly** this way if you reference them:
- "26+ years of experience"
- "NASM-protocol" training methodology

**Never write "NASM-certified"** or any variation implying a currently-held certification. This is a legal accuracy line, not a style preference. If you find yourself describing credentials, use only the two phrasings above.

**Language ban:** do not use "yoga" or "meditation" to describe any SwanStudios offering or recommendation. Use "stretching" or "flexibility". You may of course report that a *competitor* sells yoga — that is a fact about them.

---

## 3. What to find

Run these as **separate passes**, not one blurred search. Each pass has its own angle, and you should finish a pass before starting the next. Do not judge the market from one search — a single query returns one slice of a market, and the slice is usually the one with the biggest ad budget.

### Pass A — Who competes here
Direct competitors in the target market defined in §6. For each, capture: name, URL, what they sell, who they appear to target, and the single sentence they lead with. Aim for 6–12. Include at least two that are clearly *more expensive* than SwanStudios and two that are clearly cheaper — the market is not just the middle.

### Pass B — Money
Published pricing, package structure, session lengths, contract terms, guarantees, refund/cancellation policy, trial offers, financing. Build a comparison table with SwanStudios' numbers from §2 in it. Call out explicitly: is SwanStudios priced above, at, or below this market — and what do the ones charging more give you for the difference?

### Pass C — How they get customers
For each meaningful competitor, what acquisition channels are visibly running:
- Paid ads — check the **Meta Ad Library** and **Google Ads Transparency Center** for active creatives. Note the hook, the offer, and how long it has been running. An ad running for months is a proven ad.

  **Use browser/Chrome control for this, not text fetching or web search.** Both ad libraries are JavaScript applications that render nothing useful to a plain HTTP fetch — a 2026-08-14 run lost this entire sub-pass to exactly that mistake and had to report "no defensible ad claims." Navigate to `facebook.com/ads/library` (filter by country and advertiser name) and `adstransparency.google.com` (search the advertiser) in a real browser, read the rendered results, and screenshot or transcribe what you see. These are public, logged-out surfaces — no login, and per §1 you still submit nothing.

  If browser control is unavailable in this run, say so explicitly and mark the whole paid-ads sub-pass `[UNKNOWN]`. Do not substitute web-search guesses about what a competitor "probably" advertises.
- SEO — what do they rank for, what content do they publish, do they have location pages
- Social — which platforms, what cadence, what format, roughly what engagement
- Referral / partnership / local presence

### Pass D — What content actually works
Concrete, high-performing content angles in this niche — the specific hooks and formats, not "post consistently". What earns saves and shares for premium personal training specifically. Note which of these SwanStudios could produce from a real training session with a phone.

### Pass E — The gaps
Where is the market weak? Underserved segments, promises nobody makes, objections nobody answers, audiences everyone ignores. Pay particular attention to:
- affluent clients who want a genuine expert, not an app
- golf-specific and sport-specific performance training
- clients who have been failed by cheap online coaching and now distrust the category
- the "I need someone to actually watch my form" buyer

---

## 4. How to write claims

Tag every non-obvious factual claim:
- **[VERIFIED]** — you read it on a page you visited. Include the URL. Prices, offers, ad copy, and rankings must be VERIFIED or they do not belong in the report.
- **[INFERRED]** — a reasonable read of the evidence, but you did not see it stated. Say what evidence.
- **[UNKNOWN]** — you could not determine it. Say what would answer it.

Do not smooth over uncertainty with confident prose. A report that says "I could not see their pricing, it is behind a consultation call" is more useful than a guessed number, because the guessed number will get built on.

Prefer specifics over adjectives. "Leads with a 90-day transformation guarantee, $299/mo, 12-month minimum" beats "positions itself as premium".

---

## 5. Output

Write **one file** to your working root:

`reports/{{REPORT_FILENAME}}`

Structure:

```markdown
# Market & Competitor Recon — {{MARKET}}
Run: {{RUN_TS}} · Scope: {{SCOPE_NOTE}}

## Bottom line
(5–8 sentences. What is actually true about this market, and the single biggest
opportunity you found. Write this last, but put it first.)

## The competitive set
(table: name | URL | what they sell | who they target | lead promise)

## Pricing reality
(table incl. SwanStudios' real numbers. Then: above/at/below, and what the
premium players deliver for the difference.)

## How they acquire
(per competitor: paid / SEO / social / referral. Ad-library findings with
run-duration where visible.)

## Content angles that work
(specific hooks and formats, with evidence. Mark which are producible from a
real session with a phone.)

## The gaps
(ranked. each gap: who is underserved, why the incumbents miss it, what it
would take to own it.)

## Recommended moves
(ranked table: move | why it wins | effort S/M/L | first concrete step |
confidence)

## What I could not determine
(every UNKNOWN, and what would resolve it. Be complete here — this section
tells the reader where the report is thin.)

## Sources
(every URL visited, grouped by pass)
```

Then stop. Do not write any other file. Do not modify anything outside your working root.

---

## 6. This run

**Market / geography:** {{MARKET}}

**Specific focus for this run:** {{FOCUS}}

If the focus line is empty, run the full A–E sweep. If it names something specific, that pass gets the depth and the others get enough coverage to give it context.

---

## 7. Before you finish

Re-read your own report as a skeptic and fix what fails:

- Is any price, offer, or ad claim tagged VERIFIED without a URL? Fix it or downgrade the tag.
- Did any private individual's name, handle, or personal detail get in? Remove it.
- Does "NASM-certified" appear anywhere? Remove it.
- Does "Recommended moves" contain anything that is really just "post more" or "improve SEO"? Replace it with something a person could start on Monday morning.
- Is "What I could not determine" honestly complete, or did you quietly skip the questions you failed to answer?
- Did you take any outward action — form, message, login, purchase, post? If yes, say so at the very top of the report in bold. Do not hide it.

The last check matters most. A recon report that overstates its own certainty is worse than no report, because it gets spent against.
```
