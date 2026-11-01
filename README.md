# Jewel Match

A jewel-matching puzzle game built with Phaser 4, Vite and Electron — playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play online: <https://jd4rider.github.io/jewel-match/play/>
- Downloads: <https://github.com/jd4rider/jewel-match/releases/latest>

## How to play

Swap two neighbouring gems (click or drag) to line up 3+ of a kind.

**Special gems:** 4 in a line → **Line gem** (clears a row/column) · L/T shape → **Bomb** · 2×2 square → **Star** (row + column) · 5 in a line → **Rainbow** (swap to clear a colour). Swap two specials for bigger blasts.

**Modes:** 🗺 **Journey** (48 levels across 6 regions on a scrolling map, with score / collect / timed goals and 3-star ratings) · 💎 **Classic** (endless levels) · ⏱ **Timed Blitz** (60s, combos add time) · 🧘 **Zen**.

**Power-ups:** 🔨 Hammer, 💣 Bomb, ⚡ Zap (clear a colour), 🔀 Shuffle, ➕ Extra moves/time — earned from stars and big combos.

## Develop

```bash
npm install
npm run dev      # web dev server
npm test         # game-logic tests
npm start        # build and run in Electron
npm run dist:mac # or dist:win / dist:linux
```

## Release

Pushing a `v*` tag runs `.github/workflows/release.yml`, which builds installers on macOS, Windows and Linux and attaches them to the GitHub release. Pushing to `main` redeploys the website (landing page at `/`, game at `/play/`) via `.github/workflows/pages.yml`.
