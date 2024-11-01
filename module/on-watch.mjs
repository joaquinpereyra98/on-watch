import WatchTracker from "./apps/watch-tracker.mjs";
import * as hooks from './hooks/_module.mjs';
import * as classes from './classes/_module.mjs'

Hooks.on("init", () => {
  const module = game.modules.get("on-watch");
  hooks.initSettings();
  module.classes = classes;
  module.watchTracker = WatchTracker;
});

Hooks.on("renderSceneControls", hooks.sceneControls);

Hooks.on("controlToken", hooks.controlToken);
Hooks.on("destroyToken", hooks.destroyToken);