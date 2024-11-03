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

    this.#dragDrop = this.#createDragDropHandlers();
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
          icon: "fa-solid fa-eye",
          label: "Show to Players!",
          action: "showPlayer",
        },
      ],
    },
    actions: {
      create: WatchTracker.createTurn,
      delete: WatchTracker.deleteTurn,
      swapTurn: WatchTracker.swapTurns,
      addToken: WatchTracker.addToken,
      showPlayer: WatchTracker.showPlayer,
      deleteMember: WatchTracker.deleteMember,
      startWatch: WatchTracker.startWatch,
      endWatch: WatchTracker.endWatch,
      previousTurn: WatchTracker.previousTurn,
      nextTurn: WatchTracker.nextTurn,
      roll: WatchTracker.roll,
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

  /** @inheritDoc */
  _initializeApplicationOptions(options) {
    options = super._initializeApplicationOptions(options);

    const showPlayer = options.window?.controls?.find(c => c.action === 'showPlayer');
    if(showPlayer) showPlayer.visible = game.user.isGM;

    return options;
  }
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
    const { isActive, turns, currentTurn } = this.doc;
    const lastTurn = Math.max(0, turns.length - 1);

    const context = {
      hasToken: !!canvas.scene && canvas.tokens.controlled.length > 0,
      turns: await this._prepareTurns(),
      lastTurn,
      isGM: game.user.isGM,
      isActive,
      currentTurn,
      isPreviousTurnValid: currentTurn === 0,
      isNextTurnValid: currentTurn === lastTurn,
      isRollValid: this._prepareRoll(),
    };

    return context;
  }

  /**
   * Prepares the turns data for rendering, converting member UUIDs to entities.
   * @returns {Promise<Object[]>} Promise resolving to an array of prepared turn objects.
   */
  async _prepareTurns() {
    return Promise.all(
      this.doc.turns.map(async (turn) => ({
        ...turn,
        members: await Promise.all(
          Array.from(turn.members, async (uuid) => await fromUuid(uuid))
        ),
      }))
    );
  }

  /**
   * Check if the curent turn is avilitable for roll.
   * @returns {Boolean} Bolean to determine whether the Roll should be enabled or not
   */
  _prepareRoll() {
    const { isActive, turns, currentTurn } = this.doc;
    const turn = turns.find((t) => t.sort === currentTurn);

    return isActive && turns.length > 0 && turn.members.size > 0;
  }

  /** @inheritDoc */
  _onRender(context, options) {
    const div = this.element;
    const inputs = div.querySelectorAll("input.duration-input");
    inputs.forEach((i) =>
      i.addEventListener("change", this.#handleDurationChange.bind(this))
    );
    this.#dragDrop.bind(div);
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
  /*  DragDrop Methods                            */
  /* -------------------------------------------- */

  #dragDrop;

  /**
   * Returns an array of DragDrop instances
   * @type {DragDrop[]}
   */
  get dragDrop() {
    return this.#dragDrop;
  }

  /**
   * Create drag-and-drop workflow handlers for this Application
   * @returns {DragDrop}     An array of DragDrop handlers
   * @private
   */
  #createDragDropHandlers() {
    return new DragDrop({
      dragSelector: null,
      dropSelector: ".turn",
      permissions: {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      },
      callbacks: {
        dragstart: this._onDragStart.bind(this),
        drop: this._onDragDrop.bind(this),
      },
    });
  }
  _canDragStart(selector) {
    return false;
  }
  _canDragDrop(selector) {
    return true;
  }
  _onDragStart(event) {}

  /**
   * Callback actions which occur when a dragged element is dropped on a target.
   * @param {DragEvent} event       The originating DragEvent
   * @protected
   */
  _onDragDrop(event) {
    const data = TextEditor.getDragEventData(event);
    if (data.type === "Actor") this._onDropActor(event, data);
  }

  /**
   * Handle dropping of an Actor data onto the WatchTracker
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    const turn = event.target.closest(".turn[data-index]");
    if (!turn) return false;
    const index = Number(turn.dataset.index);
    await this.doc.addMember(index, data.uuid);
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
  static showPlayer(event, target) {
    event.preventDefault();
    console.log("showPlayer");
    this.doc.socket.emitRenderTracker(true)
  }

  /**
   * Starts the watch, initializing or resetting any necessary values.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The HTML element that captured the event.
   */
  static startWatch(event, target) {
    event.preventDefault();
    this.doc.startWatch();
  }

  /**
   * Ends the current watch, finalizing any remaining tasks or values.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The HTML element that captured the event.
   */
  static endWatch(event, target) {
    event.preventDefault();
    this.doc.endWatch();
  }

  /**
   * Moves to the previous turn in the watch sequence, updating the current turn accordingly.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The HTML element that captured the event.
   */
  static previousTurn(event, target) {
    event.preventDefault();
    this.doc.updateCurrentTurn(this.doc.currentTurn - 1);
    this.render();
  }

  /**
   * Advances to the next turn in the watch sequence, updating the current turn accordingly.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The HTML element that captured the event.
   */
  static nextTurn(event, target) {
    event.preventDefault();
    this.doc.updateCurrentTurn(this.doc.currentTurn + 1);
    this.render();
  }

  /**
   * Make perception rolls.
   * @param {PointerEvent} event - The originating click event.
   * @param {HTMLElement} target - The HTML element that captured the event.
   */
  static async roll(event, target) {
    await this.doc.watchRoll();
  }
}
