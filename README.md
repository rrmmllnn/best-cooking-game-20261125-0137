# Sizzle & Serve — Rush Hour Kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/rrmmllnn/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/rrmmllnn/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

A complete, original cooking game that plays offline in a desktop browser from its own
static files — no network, no build step, no library. Built for the make.fun competition
[best-cooking-game-20261125-0137](https://make.fun/bounty/best-cooking-game-20261125-0137).

## How to play

You run a tiny kitchen through one 150-second dinner shift:

- **Tickets arrive on the ORDER BOARD** (left) — each names a dish and its ingredients,
  with a patience bar draining until the customer storms out.
- **Click ingredient bins** (or press keys 1–6) to stack layers on YOUR PLATE.
- **Patties must grill first**: click the patty bin, watch the ring fill, and click the
  grill slot when it says READY — leave it too long and it burns.
- **SERVE (or SPACE)** when your plate matches a ticket: fast serves earn tips, and
  serving in a row builds a combo bonus. A plate no ticket wants stays put — clear it
  with the CLEAR PLATE button (BKSP) and start again.
- Four dishes on the menu: Classic Burger ($10), Cheese Deluxe ($12), Garden Stack ($8),
  Double Stack ($15). The shift ends at 0:00 — beat your best shift total.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## Layout

- `game/index.html` — the page; `game/src/main.js` — boot and game loop
- `game/src/config.js` — dishes, ingredients, tuning, screen layout
- `game/src/world.js` — tickets, grill, plate, scoring (no drawing, no browser)
- `game/src/render.js` — all canvas drawing: kitchen, board, grill, plate, bins
- `game/src/input.js` — mouse + keyboard, queued once per frame
- `game/src/audio.js` — synthesised WebAudio sounds (no audio files)
- `game/src/shots.js` — the four staged screenshot scenes (`?shot=start|play|serve|end`)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — real renders of the game's own code in headless Chromium

Sounds are synthesised in the browser; art is drawn with canvas shapes. Everything is
original — its own idea, art, sounds and names.

---

<sub>Entered on [make.fun](https://make.fun/?ref=5hwq4sqk&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
