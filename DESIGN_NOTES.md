# PRINT FINISH / 001

## Goal
A light manual-print texture for FRACTURE, referencing the design principle described around **PALIMPSEST** without copying that artwork or using its name as FRACTURE's identity.

## Decorative adjustments
- Quiet paper grain: two transparent, fixed dot fields on the document paper.
- Brand glyph and one indicator square: subtle 1–2 px registration shadows.
- A slightly misaligned outline around the desktop hero stamp.
- A 1 px period offset and faint paper border echo beside the upload fields.
- The CONTRAST landing-page **illustration** has two displaced color swatches.

## Functional invariants
- No filters, transforms, noise overlays or animation on actual uploaded screenshots, visual stage, difference canvas, color sampling surface, compliance values, numbered pins or exported PNGs.
- The grain has no randomness or dynamic animation.
- No new third-party scripts, fonts, files or API requests.
- All decorative pseudo-elements have `pointer-events:none`; high-contrast preference suppresses the artwork overlays.

## Evidence boundaries
The main site's prior deployed version had a ~96-second manual iPhone inspection. This is not proof that this new commit is already live on Vercel or that all export flows work on all devices.
