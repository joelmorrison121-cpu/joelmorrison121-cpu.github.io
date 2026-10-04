# Joel Morrison portfolio — published site

This public repository serves **https://joelmorrison121-cpu.github.io/** using GitHub Pages from the root of `main`. It contains the compiled static output of Joel’s separately managed portfolio source, not its editable React component files. The initial refreshed deployment was built from the Manus project at commit `fc9b38eacc26ee0258bc0e738478dfec191e490d`.

## Updating the site

After changing the source, run `pnpm install --frozen-lockfile && pnpm build` in the source project. Copy **the contents of its `dist/` folder**, including hidden `.nojekyll`, into the root of a clone of this repository; replace the old `index.html` and `assets/` files. Then `git add -A`, `git commit -m "Update portfolio"` and `git push origin main`. GitHub Pages builds and publishes from `main` automatically. Do not upload `site/src/`, `node_modules/` or the raw Vite `site/index.html` directly—those are source files, not the production site. Preserve any independent changes to this repository before copying.

The portfolio uses adapted components from [React Bits](https://reactbits.dev/). This repository is intentionally public because it hosts the website. It is separate from the private, currently empty repository named `joel-morrison-portfolio`.
