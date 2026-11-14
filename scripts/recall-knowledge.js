const variantRules = game.modules.get("hero-bonus-points");
if (!variantRules?.active) {
  return ui.notifications.error("Enable Lex’s Variant Rules before using Recall Knowledge.");
}

await variantRules.api.recallKnowledge();
