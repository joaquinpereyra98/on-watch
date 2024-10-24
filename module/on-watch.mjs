import WatchTracker from "./apps/watch-tracker.mjs";
import * as hooks from './hooks/_module.mjs';
import * as classes from './classes/_module.mjs'

Hooks.on("init", () => {
  const module = game.modules.get("on-watch");
  hooks.initSettings();
  module.classes = classes;
});

Hooks.on("ready", ()=> {
  const module = game.modules.get("on-watch");
  module.watchTracker = new WatchTracker();
  module.watchManager = new module.classes.WatchManagerClass();
})

Hooks.on("renderSceneControls", hooks.sceneControls);

