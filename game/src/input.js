// Keyboard and mouse input. One job: turn presses and clicks into intents.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    clicks: [],
    mouse: { x: 0, y: 0 },
  };

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener("keydown", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(key);
    input.keys.add(key);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    input.keys.delete(key);
  });

  canvas.addEventListener("mousemove", (event) => {
    input.mouse = canvasPoint(event);
  });

  canvas.addEventListener("click", (event) => {
    input.clicks.push(canvasPoint(event));
  });

  return input;
}

export function consumePress(input, key) {
  if (input.pressed.has(key)) {
    input.pressed.delete(key);
    return true;
  }
  return false;
}

export function consumeClick(input) {
  return input.clicks.shift() || null;
}

export function movementFromKeys(input) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has("a") || input.keys.has("ArrowLeft")) dx -= 1;
  if (input.keys.has("d") || input.keys.has("ArrowRight")) dx += 1;
  if (input.keys.has("w") || input.keys.has("ArrowUp")) dy -= 1;
  if (input.keys.has("s") || input.keys.has("ArrowDown")) dy += 1;
  return { dx, dy };
}

export function clearStalePresses(input) {
  input.pressed.clear();
}
