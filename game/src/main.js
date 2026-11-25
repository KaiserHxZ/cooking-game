// Game loop and serving. One job: run the day, route input to stations.
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./config.js";
import { INGREDIENT_ORDER, SAUCE_ORDER } from "./recipes.js";
import {
  STATIONS,
  PANTRY_CRATES,
  createGameState,
  startDay,
  setMessage,
  nearestStation,
  chefIsNear,
  moveChefByKeys,
  takeIngredient,
  stationAction,
  actAtWok,
  actAtPlating,
  actAtSeasoning,
  updateKitchen,
} from "./kitchen.js";
import { updateOrderBook, findMatchingOrder, removeOrder } from "./orders.js";
import { updateClock, clockRushJustStarted, updateCombo, awardServe, breakComboOnLostOrder } from "./timer.js";
import { createSeededRandom } from "./random.js";
import { createInput, consumePress, consumeClick, movementFromKeys } from "./input.js";
import { renderGame } from "./render.js";
import { parseShotParams, applyShotStaging } from "./shots.js";
import { ensureAudio, playServeSound, playBellSound } from "./sound.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const input = createInput(canvas);
const params = parseShotParams(window.location.search);
const seed = params.seed;
const game = createGameState(createSeededRandom(seed), seed);
applyShotStaging(game, params.shot, seed);
window.__game = game;

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function stationForPoint(x, y) {
  for (const station of Object.values(STATIONS)) {
    if (pointInRect(x, y, station)) return station;
  }
  return null;
}

function walkToAndDo(game, stationId, action) {
  const station = STATIONS[stationId];
  game.walkTarget = { x: station.x + station.w / 2, y: station.y + station.h + 46 };
  game.pendingAction = action;
}

function serveCarriedPlate(game) {
  if (!game.carriedPlate) {
    setMessage(game, "Bawa dulu piring yang sudah jadi ke Jendela Saji.");
    return false;
  }
  const dish = game.carriedPlate.dish;
  const order = dish ? findMatchingOrder(game.book, dish.id) : null;
  if (!order) {
    setMessage(game, "Tidak ada pesanan untuk hidangan ini. Cek Papan Pesanan.");
    return false;
  }
  const fraction = Math.max(0, order.patience / order.maxPatience);
  const result = awardServe(game.score, order, game.carriedPlate.quality, fraction);
  removeOrder(game.book, order.id);
  game.carriedPlate = null;
  game.serveDisplay = null;
  game.lastServeAt = game.elapsed;
  playServeSound();
  setMessage(game, order.customer + " senang! +" + result.gained + " poin, +" + order.dish.price + " koin.");
  return true;
}

function handleNumberKey(game, digit) {
  const index = Number(digit) - 1;
  if (chefIsNear(game, "pantry") && index >= 0 && index < INGREDIENT_ORDER.length) {
    takeIngredient(game, INGREDIENT_ORDER[index]);
    return true;
  }
  if (chefIsNear(game, "seasoning") && index >= 0 && index < SAUCE_ORDER.length) {
    actAtSeasoning(game, SAUCE_ORDER[index]);
    return true;
  }
  if (chefIsNear(game, "pantry") || chefIsNear(game, "seasoning")) {
    setMessage(game, "Dekati peti bahan atau rak saus dulu.");
  }
  return false;
}

function handleClick(game, point) {
  ensureAudio();
  if (game.phase === "title") {
    startDay(game);
    return;
  }
  if (game.phase === "over") {
    startDay(game);
    return;
  }
  // Pantry crate clicked: walk there and take that ingredient.
  for (const crate of PANTRY_CRATES) {
    if (pointInRect(point.x, point.y, crate)) {
      walkToAndDo(game, "pantry", () => takeIngredient(game, crate.id));
      return;
    }
  }
  // Sauce bottle clicked: walk to the rack and apply that sauce.
  const seasoning = STATIONS.seasoning;
  if (pointInRect(point.x, point.y, seasoning)) {
    const index = Math.floor((point.x - (seasoning.x + 14)) / 44);
    const sauceId = SAUCE_ORDER[Math.max(0, Math.min(SAUCE_ORDER.length - 1, index))];
    walkToAndDo(game, "seasoning", () => actAtSeasoning(game, sauceId));
    return;
  }
  const station = stationForPoint(point.x, point.y);
  if (station) {
    if (station.id === "serve") {
      walkToAndDo(game, "serve", () => serveCarriedPlate(game));
    } else if (station.id === "pantry") {
      walkToAndDo(game, "pantry", () => stationAction(game, "pantry"));
    } else {
      walkToAndDo(game, station.id, () => stationAction(game, station.id));
    }
    return;
  }
  // Clicked open floor: walk there.
  game.walkTarget = { x: point.x, y: point.y };
  game.pendingAction = null;
}

function handleInput(game, dt) {
  let click;
  while ((click = consumeClick(input)) !== null) handleClick(game, click);
  if (game.phase === "title") {
    if (consumePress(input, "Enter") || consumePress(input, " ")) {
      ensureAudio();
      startDay(game);
    }
    return;
  }
  if (game.phase === "over") {
    if (consumePress(input, "r") || consumePress(input, "Enter") || consumePress(input, " ")) {
      startDay(game);
    }
    return;
  }
  if (consumePress(input, "r")) {
    startDay(game);
    return;
  }
  const { dx, dy } = movementFromKeys(input);
  if (dx !== 0 || dy !== 0) {
    game.walkTarget = null;
    game.pendingAction = null;
    moveChefByKeys(game, dx, dy, dt);
    game.chef.moving = true;
  } else if (!game.walkTarget) {
    game.chef.moving = false;
  }
  if (consumePress(input, "e") || consumePress(input, " ")) {
    ensureAudio();
    const station = nearestStation(game);
    if (!station) {
      setMessage(game, "Dekati sebuah stasiun dulu — yang terdekat akan bercahaya kuning.");
      return;
    }
    if (station.id === "serve") serveCarriedPlate(game);
    else if (station.id === "wok") actAtWok(game);
    else if (station.id === "plating") actAtPlating(game);
    else stationAction(game, station.id);
  }
  for (const digit of ["1", "2", "3", "4", "5"]) {
    if (consumePress(input, digit)) handleNumberKey(game, digit);
  }
}

let lastTime = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  handleInput(game, dt);
  if (game.phase === "playing") {
    game.elapsed += dt;
    const dayOver = updateClock(game.clock, dt);
    const rush = game.clock.left <= 120 && game.clock.left > 102;
    const expired = updateOrderBook(game.book, game.rng, dt, 48, rush);
    for (const order of expired) {
      breakComboOnLostOrder(game.score);
      setMessage(game, order.customer + " pergi kecewa. Pesanan #" + order.id + " hangus.");
    }
    if (clockRushJustStarted(game.clock)) {
      game.book.rushQueued = 1;
      game.book.spawnIn = 1.5;
      playBellSound();
      setMessage(game, "JAM RAMAI! Dua pesanan datang sekaligus.");
    }
    updateCombo(game.score, dt);
    updateKitchen(game, dt);
    if (dayOver) {
      game.phase = "over";
      setMessage(game, "Hari selesai.");
    }
  }
  renderGame(ctx, game);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
