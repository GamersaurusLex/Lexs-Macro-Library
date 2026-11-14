(async () => {
  const STORAGE_KEY = "gamersauruslex.add-party-to-map." + game.world.id + "." + game.user.id;
  const scene = canvas?.scene;
  const isDeltaGreen = game.system.id === "deltagreen";
  const isDnd5e = game.system.id === "dnd5e";

  if (!game.user.isGM) {
    return ui.notifications.warn("Only a GM can add actors to a scene.");
  }

  if (!scene) {
    return ui.notifications.warn("Open the scene where you want to place the party first.");
  }

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);

  const readRememberedExtraIds = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  let partyActors = [];

  if (isDnd5e) {
    const partyFolder = game.folders.find((folder) =>
      folder.type === "Actor" && folder.name.trim().toLocaleLowerCase() === "the party"
    );

    if (!partyFolder) {
      return ui.notifications.warn("I could not find an Actors folder named The Party.");
    }

    partyActors = game.actors.contents.filter((actor) =>
      actor.folder?.id === partyFolder.id && actor.type === "character"
    );

    if (!partyActors.length) {
      return ui.notifications.warn("The Actors folder named The Party does not contain any D&D character Actors.");
    }
  } else if (isDeltaGreen) {
    const partyFolder = game.folders.find((folder) =>
      folder.type === "Actor" && folder.name.trim().toLocaleLowerCase() === "party"
    );

    if (!partyFolder) {
      return ui.notifications.warn("I could not find an Actors folder named Party.");
    }

    partyActors = game.actors.contents.filter((actor) => actor.folder?.id === partyFolder.id);

    if (!partyActors.length) {
      return ui.notifications.warn("The Actors folder named Party does not contain any Actors.");
    }
  } else {
    const party = game.actors.party ?? game.actors.find((actor) => actor.type === "party");

    partyActors = Array.from(party?.members ?? [])
      .map((member) => member?.actor ?? member)
      .filter((actor) => actor?.documentName === "Actor");

    if (!partyActors.length) {
      partyActors = game.actors.contents.filter((actor) => actor.type === "character" && actor.hasPlayerOwner);

      if (partyActors.length) {
        ui.notifications.warn("No PF2e Party actor was found. Using player-owned character Actors instead.");
      }
    }

    if (!partyActors.length) {
      return ui.notifications.warn("I could not find a PF2e Party actor or any player-owned character Actors.");
    }
  }

  const partyIds = new Set(partyActors.map((actor) => actor.id));

  const folderPath = (folder) => {
    const names = [];
    let current = folder;

    while (current) {
      names.unshift(current.name);
      current = current.parent ?? null;
    }

    return names.join(" / ") || "Unfoldered Actors";
  };

  const isSupplementalFolder = (actor) => /(familiar|companion)/i.test(folderPath(actor.folder));

  const extraActors = game.actors.contents
    .filter((actor) => !isDeltaGreen && actor.type !== "party" && !partyIds.has(actor.id) && isSupplementalFolder(actor))
    .sort((a, b) => {
      const folderCompare = folderPath(a.folder).localeCompare(folderPath(b.folder));
      return folderCompare || a.name.localeCompare(b.name);
    });

  const rememberedExtraIds = new Set(readRememberedExtraIds());

  const groupedExtras = extraActors.reduce((groups, actor) => {
    const folder = folderPath(actor.folder);
    groups[folder] ??= [];
    groups[folder].push(actor);
    return groups;
  }, {});

  const partyList = partyActors.map((actor) => "<li>" + escapeHtml(actor.name) + "</li>").join("");

  const extraList = Object.entries(groupedExtras).map(([folder, actors]) => {
    const actorsHtml = actors.map((actor) => {
      const checked = rememberedExtraIds.has(actor.id) ? " checked" : "";
      return '<label style="display: inline-flex; align-items: center; gap: 0.35rem; width: 48%; margin: 0.2rem 0;">' +
        '<input type="checkbox" name="extraActorIds" value="' + actor.id + '"' + checked + ">" +
        '<img src="' + escapeHtml(actor.img) + '" width="24" height="24" style="object-fit: cover; border: 0; border-radius: 3px;">' +
        "<span>" + escapeHtml(actor.name) + "</span>" +
      "</label>";
    }).join("");

    return '<fieldset style="margin: 0 0 0.5rem; padding: 0.5rem;">' +
      "<legend>" + escapeHtml(folder) + "</legend>" + actorsHtml +
    "</fieldset>";
  }).join("");

  const content = "<div>" +
    (isDeltaGreen || isDnd5e
      ? "<p>These Actors from <strong>Actors → " + (isDnd5e ? "The Party" : "Party") + "</strong> will be added from their prototype tokens:</p>"
      : "<p>These party members will be added from their prototype tokens:</p>") +
    '<ul style="margin-top: 0;">' + partyList + "</ul>" +
    (isDeltaGreen ? "" : "<hr>" +
      "<p>Select any additional Actors to include—familiars, companions, thralls, mounts, summons, and so forth.</p>" +
      '<div style="max-height: 330px; overflow-y: auto; padding-right: 0.35rem;">' +
        (extraList || "<p><em>There are no additional Actors available.</em></p>") +
      "</div>" +
      "<hr>") +
    '<label style="display: block; margin: 0.35rem 0;"><input type="checkbox" name="skipExisting" checked> Skip Actors that already have a token on this scene</label>' +
    (isDeltaGreen ? "" : '<label style="display: block; margin: 0.35rem 0;"><input type="checkbox" name="rememberExtras" checked> Remember these additional Actors for my next run</label>') +
  "</div>";

  const result = await foundry.applications.api.DialogV2.wait({
    window: {
      title: "Add Party to Active Scene",
      icon: "fa-solid fa-users"
    },
    position: { width: 760 },
    content,
    buttons: [
      {
        action: "add",
        label: "Add Tokens",
        icon: "fa-solid fa-plus",
        default: true,
        callback: (_event, button) => {
          const form = button.form;
          if (!form) return null;

          return {
            extraActorIds: Array.from(form.querySelectorAll('input[name="extraActorIds"]:checked')).map((input) => input.value),
            skipExisting: form.elements.skipExisting.checked,
            rememberExtras: form.elements.rememberExtras?.checked ?? false
          };
        }
      },
      {
        action: "cancel",
        label: "Cancel",
        callback: () => null
      }
    ],
    rejectClose: false
  });

  if (!result) return;

  if (result.rememberExtras) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(result.extraActorIds));
  }

  const selectedExtras = result.extraActorIds.map((id) => game.actors.get(id)).filter(Boolean);
  const actors = Array.from(new Map([...partyActors, ...selectedExtras].map((actor) => [actor.id, actor])).values());

  const existingActorIds = new Set(Array.from(scene.tokens).map((token) => token.actorId).filter(Boolean));
  const actorsToPlace = result.skipExisting ? actors.filter((actor) => !existingActorIds.has(actor.id)) : actors;

  if (!actorsToPlace.length) {
    return ui.notifications.info("Every selected Actor already has a token on this scene.");
  }

  const tokenSources = actorsToPlace.map((actor) => {
    const source = actor.prototypeToken.toObject();
    delete source._id;
    source.actorId = actor.id;
    source.name ??= actor.name;
    return { actor, source };
  });

  const gridSize = Number(scene.grid?.size ?? canvas.grid?.size ?? 100) || 100;
  const maxWidth = Math.max(...tokenSources.map(({ source }) => Number(source.width) || 1));
  const maxHeight = Math.max(...tokenSources.map(({ source }) => Number(source.height) || 1));
  const cellWidth = (maxWidth + 1) * gridSize;
  const cellHeight = (maxHeight + 1) * gridSize;
  const columns = Math.min(5, Math.ceil(Math.sqrt(tokenSources.length)));
  const rows = Math.ceil(tokenSources.length / columns);
  const sceneWidth = Number(scene.width) || 4000;
  const sceneHeight = Number(scene.height) || 3000;
  const snap = (value) => Math.floor(value / gridSize) * gridSize;
  const startX = Math.max(0, snap((sceneWidth - columns * cellWidth) / 2));
  const startY = Math.max(0, snap((sceneHeight - rows * cellHeight) / 2));

  const tokenData = tokenSources.map(({ source }, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const tokenWidth = (Number(source.width) || 1) * gridSize;
    const tokenHeight = (Number(source.height) || 1) * gridSize;

    source.x = Math.min(Math.max(0, startX + column * cellWidth), Math.max(0, sceneWidth - tokenWidth));
    source.y = Math.min(Math.max(0, startY + row * cellHeight), Math.max(0, sceneHeight - tokenHeight));
    return source;
  });

  await scene.createEmbeddedDocuments("Token", tokenData);
  ui.notifications.info("Added " + tokenData.length + " token" + (tokenData.length === 1 ? "" : "s") + " to " + scene.name + ".");
})();
