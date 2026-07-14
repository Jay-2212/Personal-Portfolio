# INTRODUCTION.md — start here

Welcome. If you're an agent (or human) picking this project up, this file is your
briefing. Read it once, in full — it's short on purpose.

---

## What this project is

**CapexIQ** ("Know if it pays for itself, before you buy it.") — a web tool at
`capexiq.jaybharti.me` that helps Indian hospital owners, administrators, COOs, and
CFOs decide whether buying a piece of equipment (MRI, CT, Cath Lab, dialysis unit,
ultrasound, or custom equipment) is financially viable. It's simple enough for an
administrator, deep enough for a CFO: ROI, payback, NPV, IRR, break-even usage,
cash-flow timing, revenue realization, working capital gaps, and export-ready
Excel/Word proposals.

Renamed from the placeholder "Healthcare Capex Decision Support Tool" on 2026-07-05.
It's served at its own subdomain, not a path under jaybharti.me — see `HANDOFF.md`'s
2026-07-05 entry for the full rebrand rationale. As of 2026-07-14, its source moved from
a standalone repo into this `capexiq/` folder inside the `Personal-Portfolio` repo (still
deployed separately, to the same subdomain — the merge is a source-organization change,
not a URL change).

For anything about *what the product does or why* — go to `SPEC.md`. Don't ask "what is
this project" again once you've read this file; the answer lives there in full, with an
index at the top so you can jump to the section you need.

---

## Reading order

Only two files are a hard mandate, every session, no exceptions:

1. **INTRODUCTION.md** — this file. Read it once, in full, before doing anything else.
2. **CONVENTIONS.md** — how code gets written here (file/dependency/testing rules).
   Read this before writing or editing any code — not optional, not just for style.

**HANDOFF.md** sits in between: *updating* it before you finish a session is
mandatory (see Rule 1 below — skipping this is the one thing that actually breaks
this system). *Reading* it isn't a hard mandate the way INTRODUCTION.md/CONVENTIONS.md
are, but it's genuinely the fastest way to find out what's actually done vs. assumed,
so read it unless you already know exactly what you're doing and why.

Everything else below is a **reference map, not a checklist** — consult the one you
actually need for the task in front of you, not all of them, every session, whether
the task touches them or not. This project is meant to be agent-friendly and
context-efficient (`CONVENTIONS.md`'s own motto); burning context reading files a
given task doesn't touch works against that.

- **DIRECTORY.md** — the map of the codebase: what exists, where, and what it's for.
  Open it when you need to find something, not as a front-to-back read.
- **ISSUES.md** — open problems/gaps being tracked. Worth a look before assuming
  something's fine; add to it the moment you spot something wrong, even if you don't
  fix it now.
- **agent-build-plan.md** — the phased build plan. Check it when you need to know
  which phase is next, or a phase's Definition of Done.
- **SPEC.md** — the full product spec, has its own index at the top. Use it when you
  need the detail behind a specific decision, not front-to-back.

---

## Rules for working in this project

1. **Update HANDOFF.md before you finish.** Every session, no exceptions. Overwrite the
   "Current State" block at the top, add one dated entry to the log below it. If you
   didn't update it, the next agent starts blind — that's the one thing that breaks this
   whole system.

2. **If you create a new folder, put an info file in it.** A `README.txt` or
   `sources.txt` — whatever fits — following the pattern already used throughout this
   project (see `equipment-images/sources.txt`, `people-personas/sources.txt`,
   `design/README.txt`, `icons/README.txt`, `fonts/README.txt`). State what's in the
   folder, where it came from, and any license/attribution or known quirks. The next
   agent should never have to guess.

3. **Don't duplicate content across files.** DIRECTORY.md points to README/sources files
   rather than copying their contents. SPEC.md is the one source of product truth. If
   you're about to paste the same paragraph into two files, add a pointer instead.

4. **Keep it context-friendly.** Context is limited and expensive. Prefer short files
   that point to the right place over long files that repeat everything. If a file is
   growing past its purpose (see HANDOFF.md's archive rule), prune it rather than let it
   bloat.

5. **Don't invent data.** Per SPEC.md §24 and §36 — no fabricated benchmarks, pricing,
   or utilization ranges. If something's unresearched, say so and flag it, don't guess a
   plausible-sounding number.

6. **Files in the user's Documents folder can't be deleted or renamed without asking.**
   If you need to remove or rename something here, request permission first.

7. **Track problems in ISSUES.md as you find them.** Don't let a known bug, gap, or
   quirk live only in your own head or a chat transcript. Log it — even a one-line entry
   — the moment you notice it, whether or not you fix it in the same session.

---

## What's already done vs. what's next

This section is stale — check `HANDOFF.md`'s Current State block for what's actually
built (as of 2026-07-14 that includes the wizard UI, results dashboard, and Excel/Word/ZIP
exports; formerly this said nothing past a skeletal build was done, which is no longer
true). This project's source now lives in `capexiq/` inside the `Personal-Portfolio`
GitHub repo rather than its own repo — see DIRECTORY.md for the code map.

---

That's the whole briefing. Check HANDOFF.md's Current State next if you want to know
exactly where things stand — or jump straight into whatever the task in front of you
actually needs. The rest of the docs above are there to help when you need them, not a
checklist to clear before you're allowed to start.
