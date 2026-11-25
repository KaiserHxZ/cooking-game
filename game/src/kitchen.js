// The kitchen world. One job: stations, the chef, and what each station does.
import { CHEF_SPEED, FLOOR_BOUNDS, MAX_CARRY, WOK_COOK_SECONDS, WOK_BURN_SECONDS } from "./config.js";
import { INGREDIENTS, SAUCES, findDish } from "./recipes.js";
import { createOrderBook, spawnOrder, fillOrderBoard } from "./orders.js";
import { createClock, createScore } from "./timer.js";
import { playChopSound, playSizzleSound } from "./sound.js";

export const STATIONS = {
  pantry: { id: "pantry", name: "PETI BAHAN", x: 330, y: 96, w: 430, h: 86 },
  wok: { id: "wok", name: "WAJAN API", x: 790, y: 96, w: 220, h: 86 },
  board: { id: "board", name: "TALENAN", x: 340, y: 280, w: 180, h: 120 },
  plating: { id: "plating", name: "MEJA SAJI", x: 560, y: 280, w: 170, h: 120 },
  seasoning: { id: "seasoning", name: "RAK SAUS", x: 750, y: 280, w: 150, h: 120 },
  serve: { id: "serve", name: "JENDELA SAJI", x: 1050, y: 280, w: 200, h: 120 },
  trash: { id: "trash", name: "TEMPAT SAMPAH", x: 340, y: 500, w: 110, h: 80 },
};

export const PANTRY_CRATES = [
  { id: "noodle", x: 340, y: 106, w: 76, h: 56 },
  { id: "rice", x: 424, y: 106, w: 76, h: 56 },
  { id: "chicken", x: 508, y: 106, w: 76, h: 56 },
  { id: "egg", x: 592, y: 106, w: 76, h: 56 },
  { id: "greens", x: 676, y: 106, w: 76, h: 56 },
];

export function createGameState(rng, seed) {
  return {
    phase: "title",
    seed,
    rng,
    elapsed: 0,
    chef: { x: 700, y: 540, facing: 1, moving: false, chopAnim: 0, wokAnim: 0 },
    carrying: [],
    carriedPlate: null,
    plate: { base: null, topping: null, sauce: null, quality: "ok" },
    wok: { items: [], progress: 0, state: "empty" },
    book: createOrderBook(),
    clock: createClock(),
    score: createScore(),
    message: "Selamat datang di Mie Senja!",
    messageAt: 0,
    walkTarget: null,
    pendingAction: null,
    lastServeAt: -99,
    startedAt: 0,
  };
}

export function startDay(game) {
  game.phase = "playing";
  game.elapsed = 0;
  game.carrying = [];
  game.carriedPlate = null;
  game.plate = { base: null, topping: null, sauce: null, quality: "ok" };
  game.wok = { items: [], progress: 0, state: "empty" };
  game.book = createOrderBook();
  game.clock = createClock();
  game.score = createScore();
  game.chef.x = 700;
  game.chef.y = 540;
  game.walkTarget = null;
  game.pendingAction = null;
  fillOrderBoard(game.book, game.rng, 48);
  setMessage(game, "Hari dimulai! Ambil bahan dari peti (1-5).");
}

export function setMessage(game, text) {
  game.message = text;
  game.messageAt = game.elapsed;
}

export function stationRect(station) {
  return station;
}

export function nearestStation(game) {
  const chef = game.chef;
  let best = null;
  let bestDistance = Infinity;
  for (const station of Object.values(STATIONS)) {
    const cx = station.x + station.w / 2;
    const cy = station.y + station.h / 2;
    const dx = Math.max(Math.abs(chef.x - cx) - station.w / 2, 0);
    const dy = Math.max(Math.abs(chef.y - cy) - station.h / 2, 0);
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = station;
    }
  }
  return bestDistance <= 90 ? best : null;
}

export function chefIsNear(game, stationId) {
  const station = STATIONS[stationId];
  const chef = game.chef;
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2;
  const dx = Math.max(Math.abs(chef.x - cx) - station.w / 2, 0);
  const dy = Math.max(Math.abs(chef.y - cy) - station.h / 2, 0);
  return Math.hypot(dx, dy) <= 90;
}

export function moveChefToward(game, targetX, targetY, dt) {
  const chef = game.chef;
  const dx = targetX - chef.x;
  const dy = targetY - chef.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 6) return true;
  const step = Math.min(distance, CHEF_SPEED * dt);
  chef.x += (dx / distance) * step;
  chef.y += (dy / distance) * step;
  if (Math.abs(dx) > 2) chef.facing = dx > 0 ? 1 : -1;
  chef.moving = true;
  chef.x = Math.max(FLOOR_BOUNDS.x, Math.min(FLOOR_BOUNDS.x + FLOOR_BOUNDS.width, chef.x));
  chef.y = Math.max(FLOOR_BOUNDS.y, Math.min(FLOOR_BOUNDS.y + FLOOR_BOUNDS.height, chef.y));
  return false;
}

export function moveChefByKeys(game, dx, dy, dt) {
  const chef = game.chef;
  if (dx === 0 && dy === 0) return;
  const length = Math.hypot(dx, dy);
  chef.x += (dx / length) * CHEF_SPEED * dt;
  chef.y += (dy / length) * CHEF_SPEED * dt;
  if (dx !== 0) chef.facing = dx > 0 ? 1 : -1;
  chef.moving = true;
  chef.x = Math.max(FLOOR_BOUNDS.x, Math.min(FLOOR_BOUNDS.x + FLOOR_BOUNDS.width, chef.x));
  chef.y = Math.max(FLOOR_BOUNDS.y, Math.min(FLOOR_BOUNDS.y + FLOOR_BOUNDS.height, chef.y));
}

export function takeIngredient(game, ingredientId) {
  if (game.carrying.length >= MAX_CARRY) {
    setMessage(game, "Tangan penuh! Olah dulu bahan yang dibawa.");
    return false;
  }
  const def = INGREDIENTS[ingredientId];
  game.carrying.push({ id: ingredientId, state: "raw", chops: 0 });
  setMessage(game, def.name + " diambil. " + (def.chop > 0 ? "Cincang di talenan." : "Masak di wajan."));
  return true;
}

export function chopCarriedTopping(game) {
  const item = game.carrying.find((carried) => INGREDIENTS[carried.id] && INGREDIENTS[carried.id].chop > 0 && carried.state === "raw");
  if (!item) {
    setMessage(game, "Tidak ada bahan yang perlu dicincang di tangan.");
    return false;
  }
  item.chops += 1;
  game.chef.chopAnim = 0.25;
  playChopSound();
  const need = INGREDIENTS[item.id].chop;
  if (item.chops >= need) {
    item.state = "chopped";
    setMessage(game, INGREDIENTS[item.id].name + " sudah dicincang. Masukkan ke wajan bersama bahan pokok.");
  } else {
    setMessage(game, "Cincang " + INGREDIENTS[item.id].name + ": " + item.chops + "/" + need);
  }
  return true;
}

export function wokCookQuality(game) {
  const progress = game.wok.progress;
  if (progress >= WOK_BURN_SECONDS / WOK_COOK_SECONDS) return "burnt";
  if (progress >= 0.95 && progress <= 1.3) return "perfect";
  if (progress >= 0.75) return "ok";
  return "raw";
}

export function actAtWok(game) {
  const wok = game.wok;
  if (wok.state === "empty") {
    const base = game.carrying.find((item) => INGREDIENTS[item.id] && INGREDIENTS[item.id].kind === "base");
    const topping = game.carrying.find(
      (item) => INGREDIENTS[item.id] && INGREDIENTS[item.id].kind === "topping" && item.state === "chopped",
    );
    if (!base || !topping) {
      setMessage(game, "Wajan butuh bahan pokok + topping yang sudah dicincang.");
      return false;
    }
    game.carrying = game.carrying.filter((item) => item !== base && item !== topping);
    wok.items = [base.id, topping.id];
    wok.progress = 0;
    wok.state = "cooking";
    game.chef.wokAnim = 0.4;
    playSizzleSound();
    setMessage(game, "Memasak! Angkat saat bilah hijau — jangan sampai gosong.");
    return true;
  }
  if (wok.state === "cooking" || wok.state === "ready") {
    if (game.carrying.length >= MAX_CARRY) {
      setMessage(game, "Tangan penuh! Kosongkan dulu tanganmu.");
      return false;
    }
    const quality = wokCookQuality(game);
    const [base, topping] = wok.items;
    game.carrying.push({ id: "cooked", state: "cooked", base, topping, quality, chops: 0 });
    wok.items = [];
    wok.progress = 0;
    wok.state = "empty";
    if (quality === "burnt") {
      setMessage(game, "Gosong! Buang ke tempat sampah.");
    } else if (quality === "perfect") {
      setMessage(game, "Matang sempurna! Tata di Meja Saji.");
    } else if (quality === "raw") {
      setMessage(game, "Masih mentah — masak lebih lama lain kali.");
    } else {
      setMessage(game, "Matang! Tata di Meja Saji.");
    }
    return true;
  }
  return false;
}

export function actAtPlating(game) {
  if (game.carriedPlate) {
    setMessage(game, "Kamu sudah membawa piring jadi. Antar ke Jendela Saji.");
    return false;
  }
  const cooked = game.carrying.find((item) => item.state === "cooked");
  if (cooked && !game.plate.base) {
    game.carrying = game.carrying.filter((item) => item !== cooked);
    game.plate.base = cooked.base;
    game.plate.topping = cooked.topping;
    game.plate.quality = cooked.quality;
    game.plate.sauce = null;
    setMessage(game, "Hidangan di atas piring. Tambahkan saus di Rak Saus.");
    return true;
  }
  if (game.plate.base && game.plate.topping && game.plate.sauce) {
    const dish = findDish(game.plate.base, game.plate.topping, game.plate.sauce);
    game.carriedPlate = { base: game.plate.base, topping: game.plate.topping, sauce: game.plate.sauce, quality: game.plate.quality, dish };
    game.plate = { base: null, topping: null, sauce: null, quality: "ok" };
    setMessage(game, "Piring siap saji! Antar ke Jendela Saji.");
    return true;
  }
  if (game.plate.base && !game.plate.sauce) {
    setMessage(game, "Piring masih dirakit — tambahkan saus dulu di Rak Saus.");
    return false;
  }
  setMessage(game, "Bawa hasil masakan dari wajan ke meja ini.");
  return false;
}

export function actAtSeasoning(game, sauceId) {
  if (!game.plate.base || !game.plate.topping) {
    setMessage(game, "Belum ada hidangan di meja saji untuk diberi saus.");
    return false;
  }
  if (game.plate.sauce) {
    setMessage(game, "Saus sudah ditambahkan: " + SAUCES[game.plate.sauce].name + ".");
    return false;
  }
  if (!sauceId || !SAUCES[sauceId]) {
    setMessage(game, "Pilih saus: 1 Kecap Manis, 2 Sambal, 3 Kacang — atau klik botolnya.");
    return false;
  }
  game.plate.sauce = sauceId;
  const dish = findDish(game.plate.base, game.plate.topping, sauceId);
  if (dish) {
    setMessage(game, dish.name + " selesai! Angkat piringnya di Meja Saji.");
  } else {
    setMessage(game, SAUCES[sauceId].name + " ditambahkan. Kombinasi ini bukan pesanan yang dikenal — tetap bisa disajikan kalau ada yang pesan.");
  }
  return true;
}

export function actAtTrash(game) {
  if (game.carrying.length > 0) {
    game.carrying = [];
    setMessage(game, "Bahan di tangan dibuang.");
    return true;
  }
  if (game.carriedPlate) {
    game.carriedPlate = null;
    setMessage(game, "Piring dibuang.");
    return true;
  }
  if (game.plate.base) {
    game.plate = { base: null, topping: null, sauce: null, quality: "ok" };
    setMessage(game, "Piring di meja dibuang.");
    return true;
  }
  setMessage(game, "Tidak ada yang perlu dibuang.");
  return false;
}

export function stationAction(game, stationId, extra) {
  switch (stationId) {
    case "pantry":
      setMessage(game, "Pilih bahan: tekan 1 Mie, 2 Nasi, 3 Ayam, 4 Telur, 5 Sayur — atau klik petinya.");
      return false;
    case "board":
      return chopCarriedTopping(game);
    case "wok":
      return actAtWok(game);
    case "plating":
      return actAtPlating(game);
    case "seasoning":
      return actAtSeasoning(game, extra);
    case "serve":
      return false;
    case "trash":
      return actAtTrash(game);
    default:
      return false;
  }
}

export function updateKitchen(game, dt) {
  const wok = game.wok;
  if (wok.state === "cooking") {
    wok.progress += dt / WOK_COOK_SECONDS;
    if (wok.progress >= 1) wok.state = "ready";
    if (wok.progress >= WOK_BURN_SECONDS / WOK_COOK_SECONDS) wok.state = "burnt";
  } else if (wok.state === "ready") {
    wok.progress += dt / WOK_COOK_SECONDS;
    if (wok.progress >= WOK_BURN_SECONDS / WOK_COOK_SECONDS) wok.state = "burnt";
  }
  if (game.chef.chopAnim > 0) game.chef.chopAnim = Math.max(0, game.chef.chopAnim - dt);
  if (game.chef.wokAnim > 0) game.chef.wokAnim = Math.max(0, game.chef.wokAnim - dt);
  if (game.walkTarget) {
    const arrived = moveChefToward(game, game.walkTarget.x, game.walkTarget.y, dt);
    if (arrived) {
      const pending = game.pendingAction;
      game.walkTarget = null;
      game.pendingAction = null;
      if (pending) pending();
    }
  }
}

export function stageBusyKitchen(game, rng) {
  // Used only by ?shot= staging: builds a real mid-service moment through
  // the game's own state fields, so the cover shows every required element.
  startDay(game);
  game.clock.left = 132;
  game.elapsed = 48;
  fillOrderBoard(game.book, rng, 48);
  game.chef.x = 640;
  game.chef.y = 470;
  game.carrying = [{ id: "cooked", state: "cooked", base: "rice", topping: "egg", quality: "perfect", chops: 0 }];
  game.carriedPlate = null;
  game.plate = { base: "noodle", topping: "chicken", sauce: null, quality: "perfect" };
  game.wok = { items: ["noodle", "greens"], progress: 0.55, state: "cooking" };
  game.score.points = 850;
  game.score.coins = 130;
  game.score.served = 4;
  game.score.combo = 2;
  game.score.comboLeft = 9;
  setMessage(game, "Jam ramai! Selesaikan piring di Meja Saji, lalu antar.");
  // A finished plate waits at the serve window, ready to hand over.
  game.serveDisplay = { base: "rice", topping: "chicken", sauce: "sweet", quality: "perfect" };
  game.serveDisplayAt = game.elapsed;
  return game;
}

export function stageEndOfDay(game) {
  startDay(game);
  game.clock.left = 1.2;
  game.score.points = 1240;
  game.score.coins = 215;
  game.score.served = 7;
  game.score.lost = 1;
  game.score.bestCombo = 3;
  game.score.perfectCooks = 4;
  game.book.orders = [game.book.orders[0]].filter(Boolean);
  return game;
}

export function seedInitialOrders(game, rng) {
  spawnOrder(game.book, rng, 48);
  return game.book.orders;
}
