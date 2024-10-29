/**
 * Renders the watch tracker if conditions are met.
 */
function renderWatchTracker() {
  const module = game.modules.get("on-watch");
  const watchTracker = module?.watchManager?.app;
  if (watchTracker?.rendered) watchTracker.render();
}

/**
 * A hook event that fires when a Token is selected or deselected.
 * @param {Token} token - The token instance which is selected/deselected
 * @param {Boolean} _ - Whether the Token is selected or not.
 */
export function onControlToken(token, _) {
  if (token.actor && canvas.tokens.controlled.length <= 1) renderWatchTracker();
}

/**
 * A hook event that fires when a Token is destroyed.
 * @param {Token} token - The token instance being destroyed
 */
export function onDestroyToken(token) {
  if (token.actor && canvas.tokens.controlled.length === 0) renderWatchTracker();
}
