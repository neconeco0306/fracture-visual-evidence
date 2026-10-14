# FRACTURE / Visual Evidence Studio

**Make the difference visible.** Two free, browser-based tools for people who build and review interfaces.

> Two screenshots → compare → annotate → share a clear report. No account, no screenshot upload to a server.

**Live demo (deployed build):** https://fracture-visual-evidence.vercel.app/  
**Color inspector:** https://fracture-visual-evidence.vercel.app/contrast.html

## What it does

### 01 / FRACTURE
- Choose two screenshots, or **LOAD THE SAMPLE CASE**.
- Review changes with a **SPLIT** reveal, **OVERLAY** opacity blend, or **DIFF** pixel mask.
- Adjust pixel sensitivity. The app measures color differences; it does **not** decide whether a design is correct.
- Tap to add numbered notes, then make an annotated PNG inspection sheet, Markdown fix brief, or JSON handoff.

### 02 / CONTRAST
- Sample a text and background color from a screenshot, or enter hexadecimal colors.
- Calculate a WCAG 2.2 contrast ratio and compare it with AA/AAA text thresholds.
- Copy a summary or export a shareable inspection card.
- Sampling two pixels is **not** a comprehensive accessibility audit.

## Privacy & limitations

- Screenshots and comparisons run locally in your browser. Files are not uploaded by the app.
- Exports are created on your device; check for personal or confidential information **before you share them**.
- Two images must have the same dimensions for the raw pixel-diff statistic to be meaningful.
- The app does not automatically determine whether a bug was fixed.
- Browser support and mobile export behavior can vary. The live demo may be an earlier deployment than the latest source commit.

## Run locally

Requires a local HTTP server for JavaScript modules. For example, with Python installed:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000 in a browser.

If you have Node.js 20+:

```bash
npm test
```

The tests cover deterministic pixel/color calculations and static wiring. Passing them does not prove successful end-to-end export or mobile compatibility.

## Technical notes

- Vanilla HTML/CSS/JavaScript with ES modules; no backend or build framework.
- Browser Canvas API for inspection and export.
- Strict content security policy configured via `vercel.json`.
- Designed to make human-reviewable evidence, **not to replace human review**.

Built as a small AI-assisted software experiment. The original prototype was manually exercised on an iPhone; automated CI and all export paths are not yet verified.

**License:** A source license has not yet been selected. Viewing public source is not the same as granting reuse rights.

## The print finish

Small, **fixed** ink-registration offsets and a nearly invisible paper grain give the interface an intentionally analogue touch. These decorations are confined to editorial surfaces. The image viewer, pixel-diff canvas, sampled color and exported reports stay precise.

The idea of restraint and layered marks was inspired by the design discussion around [PALIMPSEST](https://github.com/neconeco0306/PALIMPSEST), a separate artwork. This is not a port of that artwork.

**Source:** https://github.com/neconeco0306/fracture-visual-evidence

**Current status:** Prototype. The previously deployed website was manually exercised on an iPhone, but the current public source commit, exports on every device, and automatic deployment have not yet been certified. The live Vercel version might lag this source release.

**Copyright/reuse:** No source license has been granted yet. Public visibility is not permission to reuse this source.
