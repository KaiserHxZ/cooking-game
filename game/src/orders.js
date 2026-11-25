// The order board. One job: tickets arrive, wait, expire, get served.
import { DISHES } from "./recipes.js";
import { pickFrom, shuffleCopy } from "./random.js";
import { MAX_ORDERS, ORDER_SPAWN_SECONDS } from "./config.js";

export const CUSTOMERS = ["Bu Ratna", "Pak Dedi", "Mbak Sari", "Mas Joko", "Dek Rina", "Pak Haji", "Mbak Wulan", "Bang Fajar"];

let orderCounter = 0;

export function createOrderBook() {
  return { orders: [], spawnIn: 4, rushQueued: 0 };
}

export function resetOrderCounter() {
  orderCounter = 0;
}

export function spawnOrder(book, rng, patienceSeconds) {
  if (book.orders.length >= MAX_ORDERS) return null;
  orderCounter += 1;
  const dish = pickFrom(rng, DISHES);
  const order = {
    id: orderCounter,
    dish,
    customer: pickFrom(rng, CUSTOMERS),
    patience: patienceSeconds,
    maxPatience: patienceSeconds,
    arrivedAt: 0,
  };
  book.orders.push(order);
  return order;
}

export function fillOrderBoard(book, rng, patienceSeconds) {
  while (book.orders.length < MAX_ORDERS) spawnOrder(book, rng, patienceSeconds);
  return book.orders;
}

export function updateOrderBook(book, rng, dt, patienceSeconds, rushNow) {
  const expired = [];
  for (const order of book.orders) {
    order.patience -= dt * (rushNow ? 1.35 : 1);
    if (order.patience <= 0) expired.push(order);
  }
  if (expired.length > 0) {
    book.orders = book.orders.filter((order) => order.patience > 0);
  }
  book.spawnIn -= dt;
  if (book.spawnIn <= 0) {
    book.spawnIn = ORDER_SPAWN_SECONDS;
    if (book.rushQueued > 0) {
      book.rushQueued -= 1;
      spawnOrder(book, rng, patienceSeconds);
      spawnOrder(book, rng, patienceSeconds);
    } else {
      spawnOrder(book, rng, patienceSeconds);
    }
  }
  return expired;
}

export function removeOrder(book, orderId) {
  book.orders = book.orders.filter((order) => order.id !== orderId);
}

export function findMatchingOrder(book, dishId) {
  return book.orders.find((order) => order.dish.id === dishId) || null;
}

export function orderPatienceFraction(order) {
  return Math.max(0, order.patience / order.maxPatience);
}

export function shuffledDishMenu(rng) {
  return shuffleCopy(rng, DISHES);
}
