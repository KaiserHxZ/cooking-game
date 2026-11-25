// The day clock and the score. One job: time pressure and points.
import { DAY_LENGTH_SECONDS, COMBO_WINDOW_SECONDS, RUSH_AT_SECONDS_LEFT } from "./config.js";

export function createClock(dayLength) {
  return { total: dayLength || DAY_LENGTH_SECONDS, left: dayLength || DAY_LENGTH_SECONDS, rushAnnounced: [] };
}

export function updateClock(clock, dt) {
  clock.left = Math.max(0, clock.left - dt);
  return clock.left <= 0;
}

export function clockIsRush(clock) {
  return RUSH_AT_SECONDS_LEFT.some((mark) => clock.left <= mark && clock.left > mark - 18);
}

export function clockRushJustStarted(clock) {
  for (const mark of RUSH_AT_SECONDS_LEFT) {
    if (clock.left <= mark && !clock.rushAnnounced.includes(mark)) {
      clock.rushAnnounced.push(mark);
      return true;
    }
  }
  return false;
}

export function formatClock(clock) {
  const total = Math.max(0, Math.ceil(clock.left));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

export function createScore() {
  return { points: 0, coins: 0, served: 0, lost: 0, combo: 0, bestCombo: 0, comboLeft: 0, perfectCooks: 0 };
}

export function awardServe(score, order, cookQuality, patienceFraction) {
  const patienceBonus = Math.round(100 * Math.max(0, patienceFraction));
  const perfectBonus = cookQuality === "perfect" ? 50 : 0;
  if (score.comboLeft > 0) {
    score.combo = Math.min(3, score.combo + 1);
  } else {
    score.combo = 1;
  }
  score.bestCombo = Math.max(score.bestCombo, score.combo);
  score.comboLeft = COMBO_WINDOW_SECONDS;
  const gained = (100 + patienceBonus + perfectBonus) * score.combo;
  score.points += gained;
  score.coins += order.dish.price;
  score.served += 1;
  if (cookQuality === "perfect") score.perfectCooks += 1;
  return { gained, patienceBonus, perfectBonus };
}

export function updateCombo(score, dt) {
  if (score.comboLeft > 0) {
    score.comboLeft -= dt;
    if (score.comboLeft <= 0) score.combo = 0;
  }
}

export function breakComboOnLostOrder(score) {
  score.combo = 0;
  score.comboLeft = 0;
  score.lost += 1;
}
