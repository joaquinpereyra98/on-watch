export default function initSettings() {
  game.settings.register("on-watch", "turns", {
    name: "Turns",
    hint: "",
    config: false,
    scope: "world",
    requiresReload: false,
    type: Array,
    default: []
  });
}
