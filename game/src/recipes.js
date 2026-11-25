// Ingredients, sauces and dishes. One job: what a dish is made of.
// Every dish is one base + one topping + one sauce, so the same six
// ingredients combine into six different dishes.
export const INGREDIENTS = {
  noodle: { id: "noodle", name: "Mie", short: "Mie", kind: "base", chop: 0, color: "#f2c14e", dark: "#c98f1e" },
  rice: { id: "rice", name: "Nasi", short: "Nasi", kind: "base", chop: 0, color: "#fff6dd", dark: "#d9c98f" },
  chicken: { id: "chicken", name: "Ayam", short: "Ayam", kind: "topping", chop: 3, color: "#e8a06a", dark: "#a85f2e" },
  egg: { id: "egg", name: "Telur", short: "Telur", kind: "topping", chop: 1, color: "#ffd966", dark: "#d99a1e" },
  greens: { id: "greens", name: "Sayur", short: "Sayur", kind: "topping", chop: 2, color: "#4caf6d", dark: "#2c6e42" },
};

export const INGREDIENT_ORDER = ["noodle", "rice", "chicken", "egg", "greens"];

export const SAUCES = {
  sweet: { id: "sweet", name: "Kecap Manis", short: "Kecap", color: "#6b3a1e", light: "#8a5426" },
  spicy: { id: "spicy", name: "Sambal", short: "Sambal", color: "#c0392b", light: "#e74c3c" },
  peanut: { id: "peanut", name: "Kacang", short: "Kacang", color: "#c98f4e", light: "#dda763" },
};

export const SAUCE_ORDER = ["sweet", "spicy", "peanut"];

export const DISHES = [
  { id: "mie-goreng", name: "Mie Goreng Senja", base: "noodle", topping: "chicken", sauce: "sweet", price: 45 },
  { id: "mie-pedas", name: "Mie Ayam Pedas", base: "noodle", topping: "egg", sauce: "spicy", price: 40 },
  { id: "nasi-goreng", name: "Nasi Goreng Kampung", base: "rice", topping: "chicken", sauce: "sweet", price: 45 },
  { id: "nasi-kacang", name: "Nasi Telur Kacang", base: "rice", topping: "egg", sauce: "peanut", price: 40 },
  { id: "mie-sayur", name: "Mie Sayur Lada", base: "noodle", topping: "greens", sauce: "spicy", price: 35 },
  { id: "nasi-sayur", name: "Nasi Sayur Kacang", base: "rice", topping: "greens", sauce: "peanut", price: 35 },
];

export function findDish(base, topping, sauce) {
  return DISHES.find((dish) => dish.base === base && dish.topping === topping && dish.sauce === sauce) || null;
}

export function describePlate(plate) {
  if (!plate.base && !plate.topping) return "Piring kosong";
  const parts = [];
  if (plate.base) parts.push(INGREDIENTS[plate.base].name);
  if (plate.topping) parts.push(INGREDIENTS[plate.topping].name);
  if (plate.sauce) parts.push(SAUCES[plate.sauce].name);
  const dish = plate.base && plate.topping && plate.sauce ? findDish(plate.base, plate.topping, plate.sauce) : null;
  if (dish) return dish.name;
  return parts.join(" + ") + " (belum jadi hidangan)";
}

export function plateIsComplete(plate) {
  return Boolean(plate.base && plate.topping && plate.sauce);
}
