// Canvas rendering. One job: draw the kitchen, the food and the HUD.
import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS, FLOOR_BOUNDS } from "./config.js";
import { INGREDIENTS, SAUCES, SAUCE_ORDER, describePlate, plateIsComplete } from "./recipes.js";
import { STATIONS, PANTRY_CRATES, nearestStation } from "./kitchen.js";
import { formatClock, clockIsRush } from "./timer.js";
import { orderPatienceFraction } from "./orders.js";

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawText(ctx, text, x, y, size, color, align, weight) {
  ctx.fillStyle = color || COLORS.ink;
  ctx.font = (weight || "bold") + " " + size + "px 'Trebuchet MS', Verdana, sans-serif";
  ctx.textAlign = align || "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

export function drawIngredientIcon(ctx, id, x, y, radius, state) {
  const def = INGREDIENTS[id];
  ctx.save();
  ctx.translate(x, y);
  if (id === "noodle") {
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, (i - 1) * 7, radius - 4, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, (i - 1) * 7, radius - 6, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
  } else if (id === "rice") {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(0, 4, radius, radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.dark;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-radius * 0.5 + i * radius * 0.25, -2 + (i % 2) * 4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (id === "chicken") {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.ellipse(-3, 2, radius * 0.8, radius * 0.6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6dd";
    ctx.beginPath();
    ctx.arc(radius * 0.65, -radius * 0.55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(radius * 0.3, -radius * 0.2);
    ctx.lineTo(radius * 0.65, -radius * 0.55);
    ctx.stroke();
    if (state === "chopped") {
      ctx.strokeStyle = def.dark;
      ctx.beginPath();
      ctx.moveTo(-radius * 0.5, -radius * 0.3);
      ctx.lineTo(radius * 0.3, radius * 0.3);
      ctx.moveTo(-radius * 0.1, -radius * 0.5);
      ctx.lineTo(radius * 0.5, 0);
      ctx.stroke();
    }
  } else if (id === "egg") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(2, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "greens") {
    ctx.fillStyle = def.color;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(-radius * 0.5 + i * radius * 0.5, (i % 2) * 4 - 2, radius * 0.42, radius * 0.55, (i - 1) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.6, radius * 0.6);
    ctx.lineTo(radius * 0.6, -radius * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlateDish(ctx, plate, x, y, scale) {
  const s = scale || 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#e8eef2";
  ctx.beginPath();
  ctx.ellipse(0, 6 * s, 52 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 2 * s, 44 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9fb2ba";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 48 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (plate.base) {
    drawIngredientIcon(ctx, plate.base, 0, -6 * s, 26 * s, "cooked");
  }
  if (plate.topping) {
    drawIngredientIcon(ctx, plate.topping, 14 * s, -14 * s, 16 * s, "chopped");
  }
  if (plate.sauce) {
    ctx.strokeStyle = SAUCES[plate.sauce].color;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.moveTo(-26 * s, -8 * s);
    ctx.quadraticCurveTo(0, -20 * s, 26 * s, -8 * s);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStationCounter(ctx, station, highlighted, label) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, station.x + 4, station.y + 8, station.w, station.h, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.counterWood;
  roundRect(ctx, station.x, station.y, station.w, station.h, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.counterTop;
  roundRect(ctx, station.x, station.y, station.w, 26, 12);
  ctx.fill();
  ctx.fillStyle = COLORS.counterEdge;
  roundRect(ctx, station.x, station.y + 22, station.w, 4, 2);
  ctx.fill();
  if (highlighted) {
    ctx.strokeStyle = "#ffe066";
    ctx.lineWidth = 4;
    roundRect(ctx, station.x - 3, station.y - 3, station.w + 6, station.h + 6, 14);
    ctx.stroke();
  }
  drawText(ctx, label || station.name, station.x + station.w / 2, station.y + station.h - 14, 16, "#fff6e3", "center");
}

function drawOrderTicket(ctx, order, x, y, w, h) {
  const fraction = orderPatienceFraction(order);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, x + 3, y + 4, w, h, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = COLORS.boardEdge;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();
  drawText(ctx, "#" + order.id + "  " + order.customer, x + 14, y + 24, 16, COLORS.ink, "left");
  drawText(ctx, order.dish.name, x + 14, y + 50, 20, "#7a2e0e", "left");
  const dish = order.dish;
  const parts = [
    { id: dish.base, label: INGREDIENTS[dish.base].name },
    { id: dish.topping, label: INGREDIENTS[dish.topping].name },
    { id: null, label: SAUCES[dish.sauce].name, sauce: dish.sauce },
  ];
  parts.forEach((part, i) => {
    const px = x + 34 + i * 82;
    const py = y + 86;
    if (part.sauce) {
      ctx.fillStyle = SAUCES[part.sauce].color;
      ctx.beginPath();
      ctx.arc(px, py, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px 'Trebuchet MS', Verdana, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("S", px, py + 1);
    } else {
      drawIngredientIcon(ctx, part.id, px, py, 17, "raw");
    }
    drawText(ctx, part.label, px, py + 28, 13, COLORS.ink, "center", "bold");
  });
  const barX = x + 14;
  const barY = y + h - 18;
  const barW = w - 28;
  ctx.fillStyle = "#d8c9a3";
  roundRect(ctx, barX, barY, barW, 12, 6);
  ctx.fill();
  ctx.fillStyle = fraction > 0.5 ? COLORS.green : fraction > 0.25 ? COLORS.gold : COLORS.red;
  roundRect(ctx, barX, barY, Math.max(10, barW * fraction), 12, 6);
  ctx.fill();
  drawText(ctx, Math.ceil(order.patience) + " dtk", x + w - 14, barY + 6, 13, COLORS.ink, "right");
  drawText(ctx, order.dish.price + " koin", x + w - 14, y + 24, 15, "#7a5a00", "right");
}

function drawChef(ctx, game) {
  const chef = game.chef;
  const bob = chef.moving ? Math.sin(game.elapsed * 10) * 2 : 0;
  ctx.save();
  ctx.translate(chef.x, chef.y + bob);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath();
  ctx.ellipse(0, 30, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Apron body
  ctx.fillStyle = "#f4f1e6";
  roundRect(ctx, -18, -6, 36, 36, 10);
  ctx.fill();
  ctx.fillStyle = COLORS.teal;
  roundRect(ctx, -18, 12, 36, 18, 8);
  ctx.fill();
  // Head
  ctx.fillStyle = "#f2c89b";
  ctx.beginPath();
  ctx.arc(0, -22, 15, 0, Math.PI * 2);
  ctx.fill();
  // Chef hat
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, -36, 17, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  roundRect(ctx, -11, -40, 22, 10, 4);
  ctx.fill();
  // Eyes look where the chef faces
  ctx.fillStyle = "#2b1a10";
  ctx.beginPath();
  ctx.arc(chef.facing * 4 - 4, -22, 2.2, 0, Math.PI * 2);
  ctx.arc(chef.facing * 4 + 5, -22, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // Carried plate above the head
  if (game.carriedPlate) {
    drawPlateDish(ctx, game.carriedPlate, 0, -62, 0.62);
    drawText(ctx, "SIAP SAJI", 0, -84, 13, "#ffe066", "center");
  } else {
    game.carrying.forEach((item, i) => {
      const ox = (i - (game.carrying.length - 1) / 2) * 34;
      if (item.state === "cooked") {
        drawPlateDish(ctx, { base: item.base, topping: item.topping, sauce: null }, ox, -58, 0.5);
      } else {
        drawIngredientIcon(ctx, item.id, ox, -58, 15, item.state);
      }
    });
  }
  // Chop animation: knife flashing over the board side
  if (chef.chopAnim > 0) {
    ctx.strokeStyle = "#dfe7ea";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(20, -52);
    ctx.lineTo(30, -34);
    ctx.stroke();
  }
  ctx.restore();
}

export function renderGame(ctx, game) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Wall and floor
  ctx.fillStyle = COLORS.wallTop;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 76);
  ctx.fillStyle = COLORS.wall;
  ctx.fillRect(0, 76, CANVAS_WIDTH, 8);
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 84, CANVAS_WIDTH, CANVAS_HEIGHT - 84);
  ctx.fillStyle = COLORS.floorTile;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 16; col += 1) {
      if ((row + col) % 2 === 0) ctx.fillRect(64 + col * 80, 100 + row * 64, 78, 62);
    }
  }
  // Hanging lamps
  for (let i = 0; i < 4; i += 1) {
    const lx = 420 + i * 260;
    ctx.strokeStyle = "#1d120b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, 34);
    ctx.stroke();
    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.ellipse(lx, 44, 26, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 233, 168, 0.18)";
    ctx.beginPath();
    ctx.ellipse(lx, 110, 90, 70, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawText(ctx, "MIE SENJA", 24, 34, 26, "#ffe9a8", "left");
  drawText(ctx, "Dapur Gerobak", 24, 56, 13, "#e8c9a0", "left");

  const highlighted = game.phase === "playing" ? nearestStation(game) : null;

  // Order board
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  roundRect(ctx, 12, 84, 288, 560, 12);
  ctx.fill();
  ctx.fillStyle = "#4a2f1d";
  roundRect(ctx, 12, 84, 288, 560, 12);
  ctx.fill();
  drawText(ctx, "PAPAN PESANAN", 156, 110, 19, "#ffe9a8", "center");
  drawText(ctx, game.book.orders.length + " pesanan aktif", 156, 132, 13, "#e8c9a0", "center");
  if (game.book.orders.length === 0) {
    drawText(ctx, "Belum ada pesanan.", 156, 200, 15, "#e8c9a0", "center");
  }
  game.book.orders.forEach((order, i) => {
    drawOrderTicket(ctx, order, 24, 148 + i * 158, 264, 146);
  });
  drawText(ctx, "Menu: 6 hidangan, 3 bahan + 1 saus.", 156, 624, 12, "#e8c9a0", "center");

  // Pantry crates
  drawStationCounter(ctx, STATIONS.pantry, highlighted && highlighted.id === "pantry");
  PANTRY_CRATES.forEach((crate, i) => {
    ctx.fillStyle = "#8a5a22";
    roundRect(ctx, crate.x, crate.y, crate.w, crate.h, 8);
    ctx.fill();
    ctx.fillStyle = "#f6e8c8";
    roundRect(ctx, crate.x + 4, crate.y + 4, crate.w - 8, crate.h - 8, 6);
    ctx.fill();
    drawIngredientIcon(ctx, crate.id, crate.x + crate.w / 2, crate.y + 26, 16, "raw");
    drawText(ctx, (i + 1) + " " + INGREDIENTS[crate.id].name, crate.x + crate.w / 2, crate.y + crate.h - 9, 12, COLORS.ink, "center");
  });

  // Wok stove
  drawStationCounter(ctx, STATIONS.wok, highlighted && highlighted.id === "wok");
  const wokStation = STATIONS.wok;
  ctx.fillStyle = "#2b1a10";
  roundRect(ctx, wokStation.x + 30, wokStation.y + 30, 160, 34, 10);
  ctx.fill();
  ctx.fillStyle = "#3a3f44";
  ctx.beginPath();
  ctx.ellipse(wokStation.x + 110, wokStation.y + 40, 62, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (game.wok.state === "cooking" || game.wok.state === "ready" || game.wok.state === "burnt") {
    ctx.fillStyle = game.wok.state === "burnt" ? "#3a2a1a" : "#e8a06a";
    ctx.beginPath();
    ctx.ellipse(wokStation.x + 110, wokStation.y + 38, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (game.wok.items[0]) drawIngredientIcon(ctx, game.wok.items[0], wokStation.x + 96, wokStation.y + 34, 12, "cooked");
    if (game.wok.items[1]) drawIngredientIcon(ctx, game.wok.items[1], wokStation.x + 124, wokStation.y + 34, 12, "chopped");
    // Flames
    ctx.fillStyle = game.wok.state === "burnt" ? "#5a5a5a" : "#e8590c";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.ellipse(wokStation.x + 70 + i * 40, wokStation.y + 66, 12, 7 + Math.sin(game.elapsed * 12 + i) * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Cook progress bar with a green perfect zone
    const barX = wokStation.x + 30;
    const barY = wokStation.y + 74;
    const barW = 160;
    ctx.fillStyle = "#d8c9a3";
    roundRect(ctx, barX, barY, barW, 10, 5);
    ctx.fill();
    ctx.fillStyle = "#7a5238";
    roundRect(ctx, barX + barW * 0.53, barY, barW * 0.2, 10, 5);
    ctx.fill();
    ctx.fillStyle = COLORS.green;
    roundRect(ctx, barX + barW * 0.53, barY, barW * 0.2, 10, 5);
    ctx.fill();
    ctx.fillStyle = game.wok.state === "burnt" ? COLORS.red : COLORS.gold;
    roundRect(ctx, barX, barY, Math.min(barW, barW * (game.wok.progress / 1.8)), 10, 5);
    ctx.fill();
    const wokLabel = game.wok.state === "burnt" ? "GOSONG!" : game.wok.state === "ready" ? "ANGKAT!" : "MEMASAK…";
    drawText(ctx, wokLabel, wokStation.x + 110, wokStation.y + 12, 13, "#ffe066", "center");
  } else {
    drawText(ctx, "Wajan kosong", wokStation.x + 110, wokStation.y + 44, 14, "#e8c9a0", "center");
  }

  // Chopping board
  drawStationCounter(ctx, STATIONS.board, highlighted && highlighted.id === "board");
  const board = STATIONS.board;
  ctx.fillStyle = "#e8d9b0";
  roundRect(ctx, board.x + 24, board.y + 28, 132, 52, 8);
  ctx.fill();
  ctx.strokeStyle = "#8a5a22";
  ctx.lineWidth = 2;
  roundRect(ctx, board.x + 24, board.y + 28, 132, 52, 8);
  ctx.stroke();
  const choppable = game.carrying.find((item) => INGREDIENTS[item.id] && INGREDIENTS[item.id].chop > 0 && item.state === "raw");
  const chopped = game.carrying.find((item) => item.state === "chopped");
  if (choppable) {
    drawIngredientIcon(ctx, choppable.id, board.x + 90, board.y + 54, 20, "raw");
    drawText(ctx, "Tekan E: " + choppable.chops + "/" + INGREDIENTS[choppable.id].chop, board.x + 90, board.y + 96, 13, "#fff6e3", "center");
  } else if (chopped) {
    drawIngredientIcon(ctx, chopped.id, board.x + 90, board.y + 54, 20, "chopped");
    drawText(ctx, "Sudah dicincang", board.x + 90, board.y + 96, 13, "#fff6e3", "center");
  } else {
    drawText(ctx, "Pisau siap", board.x + 90, board.y + 54, 14, "#e8c9a0", "center");
  }

  // Plating counter with the dish mid-assembly
  drawStationCounter(ctx, STATIONS.plating, highlighted && highlighted.id === "plating");
  const plating = STATIONS.plating;
  drawPlateDish(ctx, game.plate, plating.x + 85, plating.y + 62, 0.85);

  // Seasoning rack
  drawStationCounter(ctx, STATIONS.seasoning, highlighted && highlighted.id === "seasoning");
  const seasoning = STATIONS.seasoning;
  SAUCE_ORDER.forEach((sauceId, i) => {
    const bx = seasoning.x + 22 + i * 44;
    const by = seasoning.y + 34;
    ctx.fillStyle = SAUCES[sauceId].color;
    roundRect(ctx, bx, by, 30, 40, 6);
    ctx.fill();
    ctx.fillStyle = SAUCES[sauceId].light;
    roundRect(ctx, bx + 4, by + 4, 22, 12, 4);
    ctx.fill();
    drawText(ctx, String(i + 1), bx + 15, by + 52, 12, "#fff6e3", "center");
  });
  if (game.plate.sauce) {
    drawText(ctx, "Saus: " + SAUCES[game.plate.sauce].name, seasoning.x + 75, seasoning.y - 12, 13, "#ffe066", "center");
  }

  // Serve window
  drawStationCounter(ctx, STATIONS.serve, highlighted && highlighted.id === "serve");
  const serve = STATIONS.serve;
  ctx.fillStyle = "#1d120b";
  roundRect(ctx, serve.x + 24, serve.y + 24, 152, 46, 8);
  ctx.fill();
  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.arc(serve.x + 100, serve.y + 47, 12, 0, Math.PI * 2);
  ctx.fill();
  if (game.serveDisplay) {
    drawPlateDish(ctx, game.serveDisplay, serve.x + 100, serve.y + 88, 0.62);
    drawText(ctx, "PIRING SIAP SAJI", serve.x + 100, serve.y - 12, 13, "#ffe066", "center");
  } else {
    drawText(ctx, "Antar piring jadi ke sini", serve.x + 100, serve.y + 88, 13, "#e8c9a0", "center");
  }

  // Trash
  drawStationCounter(ctx, STATIONS.trash, highlighted && highlighted.id === "trash");
  const trash = STATIONS.trash;
  ctx.fillStyle = "#5a6368";
  roundRect(ctx, trash.x + 30, trash.y + 22, 50, 38, 6);
  ctx.fill();
  ctx.fillStyle = "#3a3f44";
  roundRect(ctx, trash.x + 26, trash.y + 18, 58, 10, 5);
  ctx.fill();

  drawChef(ctx, game);

  // Bottom bar: hands, plate, message, controls
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(0, 648, CANVAS_WIDTH, 152);
  ctx.fillStyle = "#3a2417";
  ctx.fillRect(0, 648, CANVAS_WIDTH, 3);
  drawText(ctx, "TANGAN", 24, 672, 15, "#ffe9a8", "left");
  if (game.carrying.length === 0 && !game.carriedPlate) {
    drawText(ctx, "(kosong)", 24, 700, 15, "#e8c9a0", "left");
  }
  game.carrying.forEach((item, i) => {
    const ix = 60 + i * 120;
    if (item.state === "cooked") {
      drawText(ctx, "Masakan: " + INGREDIENTS[item.base].name + "+" + INGREDIENTS[item.topping].name + " (" + item.quality + ")", ix, 700, 14, "#fff6e3", "left");
    } else {
      drawIngredientIcon(ctx, item.id, ix, 700, 14, item.state);
      const label = INGREDIENTS[item.id].name + (item.state === "chopped" ? " (cincang)" : item.state === "raw" && INGREDIENTS[item.id].chop > 0 ? " (" + item.chops + "/" + INGREDIENTS[item.id].chop + ")" : "");
      drawText(ctx, label, ix + 22, 700, 14, "#fff6e3", "left");
    }
  });
  if (game.carriedPlate) {
    drawText(ctx, "Membawa: " + (game.carriedPlate.dish ? game.carriedPlate.dish.name : describePlate(game.carriedPlate)), 24, 726, 14, "#ffe066", "left");
  }
  drawText(ctx, "PIRING DI MEJA: " + describePlate(game.plate), 430, 672, 15, "#ffe9a8", "left");
  drawText(ctx, plateIsComplete(game.plate) ? "Piring lengkap — angkat di Meja Saji, antar ke Jendela Saji." : "Rakit: bahan pokok + topping dari wajan, lalu saus.", 430, 700, 14, "#fff6e3", "left");
  drawText(ctx, game.message, 430, 730, 15, "#ffe066", "left");
  drawText(ctx, "Gerak: WASD / panah  •  Aksi: E / Spasi  •  Bahan & saus: 1-5  •  Klik stasiun untuk jalan ke sana", 24, 766, 14, "#e8c9a0", "left");
  drawText(ctx, "Mulai ulang: R", 1150, 766, 14, "#e8c9a0", "left");

  renderHud(ctx, game);

  if (game.phase === "title") renderTitle(ctx, game);
  if (game.phase === "over") renderEnd(ctx, game);
  if (game.phase === "playing" && clockIsRush(game.clock)) {
    ctx.fillStyle = "rgba(232, 89, 12, 0.92)";
    roundRect(ctx, CANVAS_WIDTH / 2 - 130, 208, 260, 36, 18);
    ctx.fill();
    drawText(ctx, "JAM RAMAI! Pesanan berdatangan", CANVAS_WIDTH / 2, 226, 17, "#ffffff", "center");
  }
}

function renderHud(ctx, game) {
  ctx.fillStyle = COLORS.hud;
  ctx.fillRect(300, 0, CANVAS_WIDTH - 300, 76);
  ctx.fillStyle = "#3a2417";
  ctx.fillRect(300, 74, CANVAS_WIDTH - 300, 2);
  const urgent = game.clock.left <= 30 && game.phase === "playing";
  const pulse = urgent ? 1 + Math.sin(game.elapsed * 6) * 0.12 : 1;
  ctx.save();
  ctx.translate(430, 38);
  ctx.scale(pulse, pulse);
  drawText(ctx, "WAKTU", 0, -18, 13, "#e8c9a0", "center");
  drawText(ctx, formatClock(game.clock), 0, 10, 30, urgent ? "#ff6b6b" : "#ffffff", "center");
  ctx.restore();
  drawText(ctx, "SKOR", 580, 20, 13, "#e8c9a0", "center");
  drawText(ctx, String(game.score.points), 580, 50, 26, "#ffffff", "center");
  drawText(ctx, "KOIN", 720, 20, 13, "#e8c9a0", "center");
  drawText(ctx, String(game.score.coins), 720, 50, 26, COLORS.gold, "center");
  drawText(ctx, "TERSAJI", 860, 20, 13, "#e8c9a0", "center");
  drawText(ctx, String(game.score.served), 860, 50, 26, "#ffffff", "center");
  if (game.score.combo > 1) {
    drawText(ctx, "KOMBO x" + game.score.combo, 1010, 38, 22, "#ffe066", "center");
  } else {
    drawText(ctx, "Hari ke-1 di gerobak", 1010, 38, 15, "#e8c9a0", "center");
  }
  drawText(ctx, "Pesanan: " + game.book.orders.length + "/3", 1190, 38, 15, "#fff6e3", "center");
}

function renderTitle(ctx, game) {
  ctx.fillStyle = "rgba(20, 10, 6, 0.78)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, 340, 130, 600, 520, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.boardEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, 340, 130, 600, 520, 18);
  ctx.stroke();
  drawText(ctx, "MIE SENJA", 640, 190, 52, "#7a2e0e", "center");
  drawText(ctx, "Dapur Gerobak — masak sampai senja tiba", 640, 232, 19, COLORS.ink, "center");
  drawPlateDish(ctx, { base: "noodle", topping: "chicken", sauce: "sweet" }, 640, 300, 1.15);
  const lines = [
    "Ambil bahan dari peti, cincang di talenan,",
    "masak di wajan, tata di meja saji, beri saus,",
    "lalu antar piring jadi ke Jendela Saji.",
    "",
    "Enam hidangan dari lima bahan dan tiga saus.",
    "Sajikan cepat selagi pelanggan masih sabar —",
    "kombo tumbuh kalau kamu melayani berturut-turut.",
  ];
  lines.forEach((line, i) => {
    drawText(ctx, line, 640, 380 + i * 26, 17, COLORS.ink, "center", line ? "bold" : "bold");
  });
  ctx.fillStyle = COLORS.accent;
  roundRect(ctx, 490, 556, 300, 52, 26);
  ctx.fill();
  drawText(ctx, "Tekan ENTER / klik untuk mulai", 640, 582, 18, "#ffffff", "center");
  drawText(ctx, "WASD / panah untuk berjalan  •  E untuk beraksi  •  1-5 untuk bahan & saus", 640, 628, 13, "#6e4520", "center");
}

function renderEnd(ctx, game) {
  ctx.fillStyle = "rgba(20, 10, 6, 0.78)";
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = COLORS.board;
  roundRect(ctx, 380, 170, 520, 440, 18);
  ctx.fill();
  ctx.strokeStyle = COLORS.boardEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, 380, 170, 520, 440, 18);
  ctx.stroke();
  drawText(ctx, "SENJA TIBA", 640, 224, 42, "#7a2e0e", "center");
  drawText(ctx, "Gerobak tutup. Ini hasil harimu:", 640, 262, 18, COLORS.ink, "center");
  const rows = [
    ["Skor akhir", String(game.score.points)],
    ["Koin", String(game.score.coins)],
    ["Hidangan tersaji", String(game.score.served)],
    ["Pesanan hilang", String(game.score.lost)],
    ["Kombo terbaik", "x" + Math.max(1, game.score.bestCombo)],
    ["Masakan sempurna", String(game.score.perfectCooks)],
  ];
  rows.forEach((row, i) => {
    drawText(ctx, row[0], 440, 310 + i * 36, 18, COLORS.ink, "left");
    drawText(ctx, row[1], 840, 310 + i * 36, 18, "#7a2e0e", "right");
  });
  ctx.fillStyle = COLORS.teal;
  roundRect(ctx, 490, 540, 300, 48, 24);
  ctx.fill();
  drawText(ctx, "Tekan R / klik untuk main lagi", 640, 564, 17, "#ffffff", "center");
}

export function canvasPointFromEvent(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}
