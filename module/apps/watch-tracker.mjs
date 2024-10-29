import WatchManager from "../classes/watch-manager.mjs";
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * WatchTracker UI for managing and displaying current watch turns.
 * @extends ApplicationV2
 * @mixes HandlebarsApplication
 * @alias WatchTracker
 */
export default class WatchTracker extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  constructor(options) {
    super(options);

    /** @type {WatchManager|null} */
    this.doc = options.doc ?? null;
  }
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["on-watch"],
    position: {
      width: 325,
    },
    window: {
      title: "Watch Tracker",
      icon: "fa-solid fa-campground",
      resizable: true,
      controls: [
        {
          icon: "fa-solid fa-arrow-up-right-from-square",
          label: "Popout!",
          action: "popout",
        },
      ],
    },
    actions: {
      create: WatchTracker.createTurn,
      delete: WatchTracker.deleteTurn,
      swapTurn: WatchTracker.swapTurns,
      addToken: WatchTracker.addToken,
      popout: WatchTracker.popout,
      deleteMember: WatchTracker.deleteMember,
    },
  };
  /** @override */
  static PARTS = {
    form: {
      template: "modules/on-watch/templates/watch-tracker.hbs",
      scrollable: ["ol.turns-list"],
    },
  };

  /* -------------------------------------------- */
  /*  Instance Methods                            */
  /* -------------------------------------------- */

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (options.isFirstRender) {
      options.position.left ??= ui.nav?.element[0].getBoundingClientRect().left;
      options.position.top ??=
        ui.controls?.element[0].getBoundingClientRect().top;
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const canvasActive = !!canvas.scene;
    const hasControlled = canvas.tokens.controlled.length > 0;

    return {
      hasToken: canvasActive && hasControlled,
      turns: this._prepareTurns(),
      lastTurn: this.doc.turns.length - 1,
      isGM: game.user.isGM,
    };
  }

  _prepareTurns() {
    return this.doc.turns.map((t) => ({
      ...t,
      members: Array.from(t.members).map((m) => fromUuidSync(m)),
    }));
  }

  /** @inheritDoc */
  _onRender(context, options) {
    const div = this.element;
    const inputs = div.querySelectorAll("input.duration-input");
    inputs.forEach((i) =>
      i.addEventListener("change", this.#handleDurationChange.bind(this))
    );
    return super._onRender(context, options);
  }

  /**
   * Handles duration input change for a specific turn.
   * @param {Event} e - The change event triggered by the duration input.
   * @private
   */
  async #handleDurationChange(e) {
    const input = e.currentTarget;
    const index = Number(input.closest(".turn[data-index]").dataset.index);
    const newDuration = e.currentTarget.valueAsNumber;

    await this.doc.changeTurnDuration(index, newDuration, false);
  }

  /* -------------------------------------------- */
  /*  Static Action Methods                       */
  /* -------------------------------------------- */

  /**
   * Creates a new turn in the Watch.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static async createTurn(event, target) {
    event.preventDefault();
    await this.doc.createTurn();
  }

  /**
   * Deletes a selected turn from the Watch.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static async deleteTurn(event, target) {
    event.preventDefault();
    const li = target.closest(".turn[data-index]");
    const index = Number(li.dataset.index);
    await this.doc.deleteTurn(index);
  }

  /**
   * Swaps positions of turns in the Watch.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static async swapTurns(event, target) {
    event.preventDefault();
    const direction = Number(target.dataset.direction);
    const index = Number(target.closest(".turn[data-index]").dataset.index);
    await this.doc.swapTurns(index, index + direction);
  }

  /**
   * Add controlled token as member to the turn.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static async addToken(event, target) {
    event.preventDefault();
    const index = Number(target.closest(".turn[data-index]").dataset.index);
    canvas.tokens.controlled.forEach(async (token) => {
      await this.doc.addMember(index, token.actor.uuid);
    });
  }

  /**
   * Delete member of a turn.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static async deleteMember(event, target) {
    const { member } = target.dataset;
    const index = Number(target.closest(".turn[data-index]").dataset.index);
    await this.doc.removeMember(index, member);
  }

  /**
   * Pops out the application for all users.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The capturing HTML element which defines the [data-action].
   */
  static popout(event, target) {}
}
