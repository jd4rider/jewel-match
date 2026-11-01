# Jewel Match

A jewel-matching puzzle game built with Phaser 4, Vite and Electron — playable in the browser and as a desktop app for macOS, Windows and Linux.

- Play online: <https://jd4rider.github.io/jewel-match/play/>
- Downloads: <https://github.com/jd4rider/jewel-match/releases/latest>

## How to play

Swap two neighbouring gems (click one then another, or drag) to line up 3+ of a kind. Match **4** to make a **Blast Gem** (clears a 3×3 area when matched); match **5** to make a **Rainbow Gem** (swap it with any gem to clear every gem of that colour). Reach the score target before you run out of moves to advance; the game gets harder each level. Idle for a few seconds, or press **Hint**, to see a move.

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
