/**
 * Adds a "Watch Tracker" button to the Player List when the "on-watch" module is active.
 * @param {JQuery} html - The rendered HTML content of the Player List, allowing for modifications.
 */
export default function onRenderPlayerList(_, html) {
  const isActive = game.settings.get("on-watch", "watch")?.watchActive ?? false;
  if (!game.user.isGM || !isActive) return;

  const button = `
      <h3 class="tracker-btn on-watch" data-tooltip="On Watch!">
        <i class="fa-solid fa-campground"></i> Watch Tracker
      </h3>
    `;

  html.find('h3[aria-label="Players"]').after(button);
  html.on("click", ".tracker-btn.on-watch", () => {
    game.modules.get("on-watch")?.watchManager?.app?.render(true);
  });
}
