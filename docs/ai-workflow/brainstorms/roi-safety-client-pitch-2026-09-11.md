# Automated Weekly Contact Monitoring System — Proposal

**Prepared for:** Jessee McClellan, ROI Safety Services
**Prepared by:** Sean — [Business Name]
**Date:** September 2026
**Valid for 30 days**

---

## Executive summary

You currently compile facility and business-contact lists from three government registries by
hand, monthly. I propose a fully automated system that checks all three sources **every week**,
extracts every available business contact (name, email, phone, address), removes duplicates
across sources, flags what's **new or changed** since last week, and delivers the result to a
spreadsheet you own — plus a weekly summary email showing exactly what happened in each run.

No logins are bypassed, no protections are circumvented, and no email addresses are ever guessed
or fabricated. Everything comes from official public data published by the State of California
and the US EPA.

## The three sources

| Source | What it is | Contact data available | How the system accesses it |
|---|---|---|---|
| **CA Water Boards SMARTS** | Storm water permit registry (industrial, construction, municipal) | Facility / operator contact names, emails, phones, addresses, WDID | Official public data pages — no login |
| **EPA Envirofacts — TRI** | Toxics Release Inventory facilities | Assigned public contact, phone, email, facility details | Official EPA data API — no login |
| **EPA RCRAInfo** | Hazardous waste handler registry | Primary, owner/operator, permit, and additional contacts with emails | Official EPA bulk downloads — no login |

All three publish this data for public use. The login page you sent for SMARTS is for regulated
users submitting reports; the public data pages are separate and open to everyone.

## What you receive each week

1. **Current contact list** — every deduplicated contact found across all three sources, with
   company/facility name, contact name, role, email, phone, address, the source record
   identifier (WDID, TRI Facility ID, or EPA ID) for every contact, and a direct link to the
   source record where the source provides one.
2. **New & Updated list** — contacts added or changed since the previous week, clearly flagged.
3. **Run summary email** — what was checked, how many records were found, what changed, and any
   issues encountered.
4. **Error log** — if a source was unreachable, you'll know it, and the system keeps serving the
   last good data instead of going blank or corrupting your list.
5. **Full history** — weekly snapshots are retained for the period you choose (default: 12
   months), so any change can be explained later.

## Honest expectations (important)

- **Not every facility publishes an email.** Some records have a name and phone only. The system
  reports exactly what each source publishes — it will never invent or guess an address. The
  discovery phase (below) will give you the real coverage percentages for each source before you
  commit to the full build.
- **The sources update at different speeds.** SMARTS changes week to week. RCRAInfo exports
  roughly monthly. TRI follows the EPA's annual reporting cycle (July 1). Your weekly report will
  often say "TRI: no changes" — that is the source working correctly, not the system failing.
  Every weekly summary shows each source's expected update pace so this is never confusing.
- **Compliance-ready by design.** If you later use these contacts for outreach, the system
  maintains an opt-out/suppression list that is always honored, and your data handling stays
  documented and auditable. (Commercial email carries CAN-SPAM obligations regardless of whether
  recipients are businesses — worth a quick review with your counsel before any campaign.)

## Phased plan

### Phase 1 — Discovery & Coverage Audit (1 week) — $1,500

A real pull from all three sources, California-wide, producing:

- Per-source email/contact coverage percentages (the honest numbers for each registry)
- A sample deduplicated contact list in spreadsheet form
- A duplicate-rate report (how many facilities appear in 2+ registries)
- One simulated weekly change run, so you see exactly what "new & updated" looks like
- A GO / NO-GO recommendation per source

**This phase is fully credited toward the build if you proceed.** Whether to proceed is always
your call — I'll give you a clear GO / NO-GO recommendation for each source, with the numbers
behind it. If the audit shows a source can't deliver what you need, you keep the findings and
owe nothing further; if we do proceed, scope and price are adjusted together *before* the build
starts — never after.

### Phase 2 — Production build (4–5 weeks; up to 6 if SMARTS proves complex — confirmed at the end of Phase 1) — $4,500

Weekly automated runs of all three sources, deduplication, change detection, spreadsheet
publishing, summary emails, error handling, and the full run history — delivered, tested, and
documented.

The build itself is complete in 3–4 weeks. Final acceptance follows **two observed production
weekly runs** (up to two additional weeks), so you sign off on the system running live — not on
a demo. Timelines assume client inputs (decisions, account setup, review turnaround) land within
a few business days; while we're waiting on you, the clock pauses.

**Total if you proceed: $6,000** ($1,500 discovery, credited + $4,500 build).

### What "done" means — acceptance checklist

You sign off when all of the following are demonstrated live:

- [ ] Weekly run completes automatically and on schedule
- [ ] All three sources reporting (SMARTS, TRI, RCRAInfo) with real California data
- [ ] Spreadsheet populated: current contacts, new & updated, run summary, error, and technical
      provenance (source observations) tabs
- [ ] Deduplication verified across sources (same facility, multiple registries → one record)
- [ ] A change correctly detected in a simulated weekly delta
- [ ] A source failure correctly handled (system reports it and preserves last good data)
- [ ] Runbook and handover documentation delivered
- [ ] Two scheduled production runs observed clean

## Investment summary

| Item | Price |
|---|---|
| Phase 1 — Discovery & Coverage Audit (1 week) | $1,500 *(credited toward build)* |
| Phase 2 — Production build (4–5 weeks, confirmed at end of Phase 1) | $4,500 |
| **Total** | **$6,000** |
| Optional — Monthly monitoring & maintenance | $250/mo |

Build payment terms: discovery due at start; build billed 50% at kickoff, 50% at acceptance
sign-off. If the project is cancelled after kickoff, the kickoff payment is non-refundable and
any work completed to that point is settled at the preferred change-order rate.

**Your monthly running costs: approximately $0.** The system is built to run inside free service
tiers (scheduling, storage, and spreadsheet publishing), so there is no meaningful hosting bill
on top of the build and any optional maintenance.

**Optional maintenance ($250/mo)** covers weekly monitoring of run summaries, quarterly
source-health reviews, and minor fixes. You are never locked in: the system, its documentation,
and your data are yours, and the runbook explains how to keep it running with or without me.

### Optional add-ons (quoted separately, any time)

- **Live status dashboard** — a web view of run history, coverage, and changes ($1,500–$2,500)
- **Nationwide expansion** — TRI and RCRAInfo beyond California
- **Historical backfill** — import prior years of change history

## A note on scope and site changes

These are government systems that occasionally redesign their public pages and data formats —
outside any developer's control. The system is built to detect such changes immediately and
alert rather than silently break. If a source redesigns its data and the connector needs
rework, that is handled as a small scoped change order at a preferred rate, not a surprise bill
— and not part of the standard warranty, which covers the system's own code.

## What I need from you

1. A Google account that will own the results spreadsheet (you create/own it; I publish into it)
2. A GitHub account that will own the automation — a guided 20-minute setup call where I create
   everything with you; you hold every credential from the first minute, I work as a
   collaborator during the build, and full admin control transfers to you at acceptance.
   (GitHub is a free, industry-standard automation platform owned by Microsoft — it runs the
   weekly schedule. Your contact data lives only in your spreadsheet and your storage, never in
   any public code site.)
3. A sending email account for the weekly summary (your existing email works fine)
4. Decisions on the questions below
5. A named person to receive the weekly summary email

**Decisions needed before the build:**

- Geographic scope: California only, or nationwide for the EPA sources?
- SMARTS programs: industrial only, or also construction/municipal records?
- Active facilities only, or include closed/inactive for history?
- Which contact roles to include: primary, owner/operator, permit, additional — or all?
- Output: Google Sheet, CSV files, or both?
- How long to retain weekly history (default: 12 months)?

## FAQ

**Is this legal?** Yes. All data comes from official public pages and public APIs published for
exactly this purpose. The system does not log into anything, bypass any protection, or access
any non-public record.

**Will we get an email for every facility?** No — and any vendor who promises that is guessing
addresses. You'll get every email the sources actually publish, with honest coverage numbers
from Phase 1 before you commit.

**Can it send marketing emails for us?** That's deliberately out of scope. The system maintains
a suppression list so you're ready for compliant outreach, but sending campaigns is a separate
conversation involving your counsel and your email platform.

**Why not just download the files ourselves each month?** You already can — and already do. The
downloads aren't the hard part. The value is what happens after: contacts from three different
government registries merged into one clean list without duplicates, week-over-week changes
flagged automatically, broken or changed government sites detected and survived, and zero hours
of your team's month spent on it. A manual pass (or a virtual assistant) gets you three
overlapping lists and no change history.

**What happens if we stop working together?** You keep everything, because you own it from day
one: the spreadsheet, the history, the exports, the accounts the system runs in, and a runbook
explaining how it all works. Nothing is held hostage.

## Next step

Reply to confirm Phase 1 (Discovery & Coverage Audit), and I'll begin within the week. You'll
have the real coverage numbers and a sample of the final product in your hands within days of
starting.

---

*Prepared by Sean — [Business Name] · [email] · [phone]*
