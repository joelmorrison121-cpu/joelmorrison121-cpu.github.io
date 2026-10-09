# Joel Morrison — plain static portfolio

A readable, directly editable website. No package manager, React, Vite, compiler, hashed bundle or build step is required. In this source repository, the website files live in `site/`. In the downloaded ZIP and GitHub Pages repository, they are at the root.

## Open and edit

Extract the whole ZIP to a folder and double-click `index.html`. Keep `styles.css`, `main.js` and `favicon.svg` alongside it. You can also visit the live website at https://joelmorrison121-cpu.github.io/.

Edit all content, contact links and navigation directly in `index.html`. Both the animated menu and native fallback menu are ordinary HTML; update both sets of navigation links if you add a section. Change the design tokens at the top of `styles.css` to adjust colors and fonts. The stylesheet also contains the labeled layout, full-page background, menu timeline and responsive rules.

## Motion controls

The supplied React Bits effect behaviors are adapted to native browser APIs rather than importing their React wrappers. The result retains the readable, build-free file structure.

| Effect | Where to edit in `main.js` |
| --- | --- |
| Dither waves | `setupWaves()` → `settings`: speed, frequency, amplitude, color levels, pixel size, mouse radius, wave color and background color. The shader retains the supplied noise and 8×8 Bayer ordering, with intensity quantized before the warm-brass tint so the waves remain visible. |
| Click sparks | `setupClickSpark()` → `settings`: count, length, radius, duration and color. Sparks draw only after a pointer click and stop when the burst ends. |
| Staggered menu | Navigation text and destinations live in HTML. Edit the sequenced layer/link delays, rolling label and rotating icon in `styles.css`. Keyboard, click-away and link-closure behavior is in `setupMenu()`. |
| Small typed labels | The phrase arrays near the end of `main.js`, passed to `typeLabel()`. A stable accessible label accompanies the decorative animation. |
| Technical name | Edit the real name in HTML; `techName()` automatically derives glyphs and positions its outlined selection from the rendered text. |

The wave canvas is fixed behind the entire document, not just the hero. Section backgrounds are transparent; local reading surfaces retain the translucent glass treatment from the independent Pages edit. Sparks are drawn above the interface in a pointer-transparent canvas, including inside the menu.

Reduced-motion preferences disable continuous motion and sparks. Hidden tabs pause animation. Missing JavaScript leaves the complete content and native navigation available; missing WebGL uses a static CSS background. Google Fonts are optional: system and serif fallbacks work offline. Animations, local CSS and JavaScript also work when opening the HTML with a `file://` URL.

## Publish changes

The public repository https://github.com/joelmorrison121-cpu/joelmorrison121-cpu.github.io serves `main` and `/`. Upload or copy the complete flat export to its root, preserving independent edits, then commit to `main`. GitHub Pages publishes the files directly. There is nothing to install or compile.

The Manus-managed source repository remains separate; the earlier private `joel-morrison-portfolio` repository is not used or changed.

## Content to confirm

Verify the DCU, Redbrick, skills and experience copy; add the retail employer and role dates; and provide a real build, screenshot, demo and source URL before presenting the Quiz App concept as a finished project. The Gmail, GitHub and LinkedIn destinations are the details supplied by Joel.
