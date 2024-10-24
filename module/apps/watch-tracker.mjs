const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class WatchTracker extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ["on-watch"],
    window: {
      title: "Watch Tracker",
      icon: "fa-solid fa-snooze",
      resizable: true,
    },
    actions: {},
  };

  static PARTS = {
    form: {
      template: "modules/on-watch/templates/watch-tracker.hbs",
    },
  };
  
  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (options.isFirstRender) {
      options.position.left ??= ui.nav?.element[0].getBoundingClientRect().left;
      options.position.top ??=
        ui.controls?.element[0].getBoundingClientRect().top;
    }
  }

}
