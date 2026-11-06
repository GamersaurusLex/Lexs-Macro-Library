// Add the player-character party to the active Scene, with optional actors from Familiar/Companion folders.
const scene = canvas.scene;
if (!scene) return ui.notifications.error("Open the Scene that should receive the party first.");

const party = game.actors.filter((actor) => actor.type === "character" && actor.hasPlayerOwner);
if (!party.length) return ui.notifications.warn("No player-owned character actors were found.");

const matchingFolders = game.folders.filter((folder) =>
  folder.type === "Actor" && /\b(familiar|companion)s?\b/i.test(folder.name)
);
const folderActors = (folder) => game.actors.filter((actor) => {
  for (let current = actor.folder; current; current = current.folder) {
    if (current.id === folder.id) return true;
  }
  return false;
});

const choices = matchingFolders.map((folder) => {
  const count = folderActors(folder).length;
  return `<label class="checkbox"><input type="checkbox" name="folder" value="${folder.id}"> ${foundry.utils.escapeHTML(folder.name)} (${count})</label>`;
}).join("");

const selectedFolders = choices ? await foundry.applications.api.DialogV2.wait({
  window: {title: "Add Party to Scene"},
  content: `<p>Add the ${party.length} player characters to <strong>${foundry.utils.escapeHTML(scene.name)}</strong>.</p>
    <p>Also include actors from these folders:</p><div class="form-group stacked-checkboxes">${choices}</div>`,
  buttons: [
    {action: "add", default: true, icon: "fa-solid fa-users", label: "Add Party", callback: (_event, button) => [...button.form.elements.folder].filter((input) => input.checked).map((input) => input.value)},
    {action: "cancel", icon: "fa-solid fa-xmark", label: "Cancel", callback: () => null}
  ]
}) : [];
if (selectedFolders === null) return;

const extras = selectedFolders.flatMap((id) => folderActors(game.folders.get(id)));
const actors = [...new Map([...party, ...extras].map((actor) => [actor.id, actor])).values()];
const existing = new Set(scene.tokens.map((token) => token.actorId));
const toPlace = actors.filter((actor) => !existing.has(actor.id));
if (!toPlace.length) return ui.notifications.info("Every selected party actor already has a token on this Scene.");

const grid = canvas.dimensions.size;
const center = canvas.stage.worldTransform.applyInverse({
  x: canvas.app.renderer.screen.width / 2,
  y: canvas.app.renderer.screen.height / 2
});
const columns = Math.ceil(Math.sqrt(toPlace.length));
const startX = Math.floor(center.x / grid) * grid - Math.floor(columns / 2) * grid;
const rows = Math.ceil(toPlace.length / columns);
const startY = Math.floor(center.y / grid) * grid - Math.floor(rows / 2) * grid;
const tokenData = await Promise.all(toPlace.map(async (actor, index) => {
  const token = await actor.getTokenDocument({
    x: startX + (index % columns) * grid,
    y: startY + Math.floor(index / columns) * grid
  });
  return token.toObject();
}));
await scene.createEmbeddedDocuments("Token", tokenData);

const skipped = actors.length - toPlace.length;
ui.notifications.info(`Added ${toPlace.length} ${toPlace.length === 1 ? "token" : "tokens"} to ${scene.name}${skipped ? `; ${skipped} already present` : ""}.`);
