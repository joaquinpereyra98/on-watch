import WatchManager from "../classes/watch-manager.mjs";

const { BooleanField, NumberField, SchemaField } = foundry.data.fields;
export default function initSettings() {
  game.settings.register("on-watch", "turns", {
    name: "Turns",
    hint: "",
    config: false,
    scope: "world",
    requiresReload: false,
    type: Array,
    default: [],
    onChange: WatchManager.onTurnsChange,
  });
  game.settings.register("on-watch", "watch", {
    name: "Watch",
    hint: "",
    config: false,
    scope: "world",
    requiresReload: false,
    type: new SchemaField({
      watchActive: new BooleanField(),
      currentTurn: new NumberField(),
    }),
    default: {
      watchActive: false,
    },
    onChange: WatchManager.onWatchChange,
  });
}
