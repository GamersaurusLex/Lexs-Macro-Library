if (!game.user.isGM) return ui.notifications.warn("Only a GM can open the Award Panel.");

const rules = game.modules.get("hero-bonus-points");
if (!rules?.active) return ui.notifications.warn("Enable Lex's Variant Rules in this world first.");
if (typeof rules.api?.open !== "function") return ui.notifications.warn("The Award Panel is unavailable. Check your Lex's Variant Rules version.");

return rules.api.open();
