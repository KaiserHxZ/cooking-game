# Mie Senja — Dapur Gerobak

[![Make the best cooking game](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/KaiserHxZ/cooking-game/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/KaiserHxZ/cooking-game/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

An original cooking game for the [make.fun](https://make.fun) best-cooking-game bounty. You run a dusk noodle cart: take ingredients from the crates, chop them on the board, cook them in the wok over a wood fire, plate the dish, add a sauce, and serve it through the window before the customer's patience runs out.

## How to play

Open `game/index.html` in a desktop browser (or run `node serve.ts` and visit http://localhost:8080). No network, no build step — every file the game loads lives under `game/`.

- **Move:** WASD or arrow keys, or click the floor / a station to walk there.
- **Act:** E or Space at the glowing station.
- **Ingredients & sauces:** keys 1–5 at the crates, keys 1–3 at the sauce rack, or click a crate / bottle.
- **Restart:** R.

Six dishes combine one base (mie/nasi), one topping (ayam/telur/sayur) and one sauce (kecap manis/sambal/kacang). The wok has a green perfect zone — lift the pan in it for bonus points, but leave it too long and it burns. Rush hours bring two orders at once and patience drains faster. Serve dishes back-to-back to build a combo up to x3. The day lasts 3 minutes.

## Layout

- `game/index.html` — page shell and canvas.
- `game/styles.css` — page chrome only.
- `game/src/config.js` — tuning and layout constants.
- `game/src/random.js` — seeded random numbers.
- `game/src/recipes.js` — ingredients, sauces and dishes.
- `game/src/orders.js` — the order board: tickets arrive, wait, expire.
- `game/src/kitchen.js` — stations, the chef, and what each station does.
- `game/src/input.js` — keyboard and mouse input.
- `game/src/render.js` — canvas drawing: kitchen, food, HUD.
- `game/src/timer.js` — the day clock and the score.
- `game/src/sound.js` — tiny WebAudio feedback sounds, made in code.
- `game/src/shots.js` — `?shot=` staging for screenshots (staging only).
- `game/src/main.js` — game loop and serving.
- `main.ts` — copies `game/` and `screenshots/` to the output directory and writes `dossier.json`.
- `serve.ts` — local static server for play-testing.

## Screenshots

`shots.json` lists the four screenshots in `screenshots/`, taken in a real browser at 1280×800. The first, `1-play.jpg`, is the cover: mid-play with the kitchen, order board, ingredients on the counter, a dish mid-assembly on the plating counter, the timer, and a plate ready to serve at the window.

## License

MIT — see `LICENSE`.
