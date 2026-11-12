if (!game.user.isGM) return ui.notifications.warn("Only a GM can use this token picker.");

const workbench = game.PF2eWorkbench;
if (typeof workbench?.basicActionMacros !== "function") {
  return ui.notifications.warn("Enable PF2e Workbench to use Basic Action Macros.");
}

const scene = canvas.scene;
if (!canvas.ready || !scene) return ui.notifications.warn("Open a scene first.");

const supportedTypes = ["character", "npc", "familiar"];
const tokens = scene.tokens.filter(token => supportedTypes.includes(token.actor?.type))
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
if (!tokens.length) return ui.notifications.warn("This scene has no tokens supported by Basic Action Macros.");

const content = document.createElement("div");
const label = document.createElement("label");
const select = document.createElement("select");
select.name = "tokenId";
select.autofocus = true;
label.append("Scene token ", select);
content.append(label);

for (const token of tokens) {
  const duplicate = tokens.some(other => other !== token && other.name === token.name);
  const location = duplicate ? ` — (${token.x}, ${token.y})` : "";
  const hidden = token.hidden ? " [Hidden]" : "";
  select.add(new Option(`${token.name}${location}${hidden}`, token.id));
}

const choice = await foundry.applications.api.DialogV2.input({
  window: { title: "Basic Actions for a Token" },
  content,
  ok: { label: "Open Basic Actions" }
});
if (!choice) return;

const token = canvas.scene === scene ? scene.tokens.get(choice.tokenId)?.object : null;
if (!token || !supportedTypes.includes(token.actor?.type)) {
  return ui.notifications.warn("That token is no longer available on the canvas.");
}

for (const selected of canvas.tokens.controlled) {
  if (selected !== token) selected.release();
}
if (!token.controlled && !token.control({ pan: false })) {
  return ui.notifications.warn("Foundry could not select that token.");
}

const openPanel = foundry.applications.instances.get("xdy-pf2e-workbench-BAM-app");
if (openPanel?.rendered) await openPanel.close();

return workbench.basicActionMacros();
