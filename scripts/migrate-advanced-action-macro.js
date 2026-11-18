const MACRO_NAME = "Advanced Action Macro";
const PLAYER_OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

Hooks.once("ready", async () => {
  if (!game.user.isActiveGM) return;

  const outdatedCopies = game.macros.filter((macro) =>
    macro.type === "script" &&
    macro.name === MACRO_NAME &&
    macro.command.includes("game.PF2eWorkbench") &&
    (macro.ownership.default ?? CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE) < PLAYER_OBSERVER
  );

  await Promise.all(outdatedCopies.map((macro) => macro.update({
    ownership: {
      ...macro.ownership,
      default: PLAYER_OBSERVER
    }
  })));
});
