// Toggle movement keys: defaults <-> WASD + arrows + numpad all move (no pan)
const PREFERRED = {
  moveUp: ["KeyW", "ArrowUp", "Numpad8"], moveDown: ["KeyS", "ArrowDown", "Numpad2"],
  moveLeft: ["KeyA", "ArrowLeft", "Numpad4"], moveRight: ["KeyD", "ArrowRight", "Numpad6"],
  moveUpLeft: ["Numpad7"], moveUpRight: ["Numpad9"],
  moveDownLeft: ["Numpad1"], moveDownRight: ["Numpad3"],
  panUp: [], panDown: [], panLeft: [], panRight: [],
  panUpLeft: [], panUpRight: [], panDownLeft: [], panDownRight: []
};

const preferredOn = game.keybindings.get("core", "moveUp").some((binding) => binding.key === "ArrowUp");
for (const [action, keys] of Object.entries(PREFERRED)) {
  await game.keybindings.set("core", action, preferredOn ? undefined : keys.map((key) => ({key})));
}
ui.notifications.info(preferredOn ? "Keys: WASD only (defaults)" : "Keys: WASD + arrows + numpad");
