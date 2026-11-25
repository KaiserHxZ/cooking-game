// Screenshot staging. One job: set up real game states for ?shot= queries.
// Staging only: every state here is one the game itself can reach while
// playing; shots.js never draws anything that is not the game.
import { createSeededRandom } from "./random.js";
import { createGameState, stageBusyKitchen, stageEndOfDay, startDay } from "./kitchen.js";

export function parseShotParams(search) {
  const params = new URLSearchParams(search);
  return {
    shot: params.get("shot") || "",
    seed: Number(params.get("seed") || "1") || 1,
  };
}

export function applyShotStaging(game, shot, seed) {
  const rng = createSeededRandom(seed);
  game.rng = rng;
  if (shot === "start") {
    const fresh = createGameState(rng, seed);
    Object.assign(game, fresh);
    game.phase = "title";
    return game;
  }
  if (shot === "play") {
    stageBusyKitchen(game, rng);
    return game;
  }
  if (shot === "rush") {
    stageBusyKitchen(game, rng);
    game.clock.left = 118;
    game.book.rushQueued = 1;
    return game;
  }
  if (shot === "end") {
    stageEndOfDay(game);
    return game;
  }
  return game;
}

export function startFreshGame(seed) {
  const rng = createSeededRandom(seed);
  const game = createGameState(rng, seed);
  return game;
}
