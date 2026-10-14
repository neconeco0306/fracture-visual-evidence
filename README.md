# FRACTURE / Visual Evidence Studio

**Make the difference visible.** Two free, browser-based tools for people who build and review interfaces.

> Two screenshots → compare → annotate → share a clear report. No account, no screenshot upload to a server.

**Live demo (GitHub Pages):** https://neconeco0306.github.io/fracture-visual-evidence/  
**Color inspector:** https://neconeco0306.github.io/fracture-visual-evidence/contrast.html  
**Previous Vercel preview:** https://fracture-visual-evidence.vercel.app/ (may serve an older build)

## 日本語

2枚のスクリーンショットをSPLIT / OVERLAY / DIFFで比較し、気になる箇所に番号付きの注釈を付けて、PNGレポートやJSONとして保存できます。別ページのCONTRASTでは文字色と背景色のコントラストを調べられます。画像はサーバーにアップロードされません。

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
- Browser support and mobile export behavior can vary. Chromium mobile-emulation tests passed, but native iPhone Safari export is not yet independently verified.

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

The Node suite covers deterministic pixel/color calculations and static wiring. Additional Playwright tests validate synthetic image comparison, pin notes, and downloaded PNG/JSON files in mobile-size Chromium, both against a local HTTP server and the public GitHub Pages site. See the [successful browser QA run](https://github.com/neconeco0306/fracture-visual-evidence/actions/runs/38611610221). This is not a native Safari certification.

## Technical notes

- Vanilla HTML/CSS/JavaScript with ES modules; no backend or build framework.
- Browser Canvas API for inspection and export.
- Content security policy configured through `vercel.json` on Vercel and through HTML CSP meta tags on GitHub Pages. These mechanisms are not identical.
- Designed to make human-reviewable evidence, **not to replace human review**.

Built as a small AI-assisted software experiment. The original prototype was manually exercised on an iPhone. GitHub Actions static/Node checks pass; local and hosted Chromium mobile tests pass (2 each). Actual iOS Safari export and clipboard behavior remain a separate manual verification task.

**License:** A source license has not yet been selected. Viewing public source is not the same as granting reuse rights.

## The print finish

Small, **fixed** ink-registration offsets and a nearly invisible paper grain give the interface an intentionally analogue touch. These decorations are confined to editorial surfaces. The image viewer, pixel-diff canvas, sampled color and exported reports stay precise.

The idea of restraint and layered marks was inspired by the design discussion around [PALIMPSEST](https://github.com/neconeco0306/PALIMPSEST), a separate artwork. This is not a port of that artwork.

**Source:** https://github.com/neconeco0306/fracture-visual-evidence

**Current status:** Public prototype. GitHub Pages deployed successfully from `gh-pages`; the real hosted comparison and contrast routes passed browser-based flow/export checks. These checks use emulated mobile Chromium rather than physical Safari. The older Vercel deployment may lag behind.


