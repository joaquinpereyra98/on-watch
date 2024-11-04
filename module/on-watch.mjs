import WatchTracker from "./apps/watch-tracker.mjs";
import * as hooks from './hooks/_module.mjs';
import * as classes from './classes/_module.mjs'

Hooks.on("init", () => {
  const module = game.modules.get("on-watch");
  hooks.initSettings();
  module.classes = classes;
  module.watchTracker = WatchTracker;
});

Hooks.on("ready", () => {
  const module = game.modules.get("on-watch");
  if (!module.watchManager) module.watchManager = new module.classes.WatchManagerClass();
})

Hooks.on("renderPlayerList", hooks.renderPlayerList);

Hooks.on("controlToken", hooks.controlToken);
Hooks.on("destroyToken", hooks.destroyToken);

Hooks.on("deleteActor", () => {
  const module = game.modules.get("on-watch");
  const watchTracker = module?.watchManager?.app;
  if (watchTracker?.rendered) watchTracker.render();
});