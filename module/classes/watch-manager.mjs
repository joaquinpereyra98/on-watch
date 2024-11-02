import WatchTracker from "../apps/watch-tracker.mjs";
import SocketManager from "./socket-manager.mjs";

/**
 * Represents a single turn in a watch.
 * @typedef {Object} Turn
 * @property {number} duration - Duration of the turn in hours.
 * @property {Set<string>} members - A set of member UUID.
 * @property {number} sort - Sort order for the turn.
 */

/**
 * Represents a watch consisting of multiple turns.
 * @typedef {Object} Watch
 * @property {number} duration - Total duration of the watch in hours.
 * @property {Turn[]} turns - Array of turns that make up the watch.
 */

/**
 * A class that tracks and manages turns with support for resetting and accessing the current watch.
 * @alias WatchManager
 */
export default class WatchManager {
  constructor() {
    /**
     * @type {Turn[]}
     */
    this.turns = [];

    /**
     * @type {Watch}
     */
    this.watch = null;
    this.isActive = false;
    this._currentTurn = 0;
    /**
     * @type {SocketManager}
     */
    this.socket = new SocketManager({doc: this});
    this._initialize();
  }

  /* -------------------------------------------- */
  /*  Settings Methods                            */
  /* -------------------------------------------- */

  static async onTurnsChange() {
    const {watchManager} = game.modules.get("on-watch");
      if(!watchManager)return;
      watchManager.turns = await watchManager._initTurns();
      watchManager.watch = watchManager._calcWatch()
      watchManager.app.render();
  }

  static async onWatchChange(watch) {
    ui.controls.render()
    const {watchManager} = game.modules.get("on-watch");
      if(!watchManager)return;

      watchManager.isActive = watch?.watchActive ?? false;
      watchManager._currentTurn = watch?.currentTurn ?? 0;

      if(!watchManager.isActive && !game.user.isGM) {
        watchManager.app.close();
      }

      watchManager.app.render();
  }

  /* -------------------------------------------- */
  /*  Initialization Methods                      */
  /* -------------------------------------------- */

  /**
   * Initializes async properties of the class.
   * @returns {Promise<void>}
   */
  async _initialize() {
    this.turns = await this._initTurns();
    this.watch = this._calcWatch();
    this.updateTurns(this.turns);

    const watchSettings = game.settings.get("on-watch", "watch");
    this.isActive = watchSettings?.watchActive ?? false;
    this._currentTurn = watchSettings?.currentTurn ?? 0;
  }

  /**
   * Initializes the turns from stored settings, ensuring that each turn object is valid and sorted.
   * @returns {Promise<Turn[]>} A promise that resolves to an array of sorted turn objects.
   */
  async _initTurns() {
    let turns = game.settings.get("on-watch", "turns");
    if (!Array.isArray(turns)) turns = [];

    // Map turns to promises, waiting for _validateMembers for each turn
    const validatedTurns = await Promise.all(
      turns.map(async (turn, index) => ({
        duration: typeof turn.duration === "number" ? turn.duration : 1,
        members: await this._validateMembers(turn.members),
        sort: index,
      }))
    );

    return this._sortTurns(validatedTurns);
  }

  /**
   * Validates the members of a turn, ensuring they are valid UUIDs.
   * Converts each UUID to an actor entity and adds it to the set if valid.
   * @param {any} members - The members of the turn.
   * @returns {Promise<Set<string>>} A set of valid member UUIDs.
   */
  async _validateMembers(members) {
    if (!Array.isArray(members)) return new Set();
    const validMembers = new Set();

    for (const uuid of members) {
      if (typeof uuid === "string" && this._validateUuid(uuid)) {
        const actor = await fromUuid(uuid);
        if (actor) validMembers.add(uuid);
      }
    }
    return validMembers;
  }

  /**
   * Validates a UUID string.
   * @param {string} uuid - The UUID to validate.
   * @returns {boolean} True if the UUID is valid, false otherwise.
   */
  _validateUuid(uuid) {
    const p = foundry.utils.parseUuid(uuid);

    return (
      p.type === "Actor" && foundry.data.validators.isValidId(p.documentId)
    );
  }

  /* -------------------------------------------- */
  /*  Turn Management Methods                     */
  /* -------------------------------------------- */

  _currentTurn;

  get currentTurn() {
    const lastTurn = Math.max(0, this.turns.length - 1);
    if (this._currentTurn < 0) this._currentTurn = 0;
    else if (this._currentTurn > lastTurn) this._currentTurn = lastTurn;
    return this._currentTurn;
  }

  /**
   * Sorts turns by the `sort` property in ascending order.
   * @param {Turn[]} turns - Array of turns to sort.
   * @returns {Turn[]} Sorted array of turns.
   */
  _sortTurns(turns) {
    return turns.sort((a, b) => a.sort - b.sort);
  }

  /**
   * Set a new current turn on a started watch
   * @param {number} sort - sort of the new current turn
   */
  updateCurrentTurn(sort) {
    const turnIndex = this.turns.findIndex((turn) => turn.sort === sort);
    if (!this.isActive || turnIndex === -1) return;

    game.settings.set("on-watch", "watch", {
      watchActive: true,
      currentTurn: turnIndex,
    });

    this._currentTurn = turnIndex;
  }

  /**
   * Updates the stored watches with a new array of turns.
   * @param {Turn[]} watches - Array of updated turn objects.
   * @param {boolean} [render=true] - render the App?
   */
  async updateTurns(turns, render = true) {
    turns = this._sortTurns(turns);
    const setting = turns.map((t) => ({
      ...t,
      members: Array.from(t.members),
    }));
    if(game.user.isGM) game.settings.set("on-watch", "turns", setting);
    else this.socket.emitUpdateTurns(setting);

    if (render) await this.app?.render();
  }

  /**
   * Creates and adds a new turn with a unique `sort` value.
   */
  async createTurn() {
    const newTurn = {
      duration: 1,
      members: new Set(),
      sort: this.turns.length,
    };
    this.turns.push(newTurn);
    await this.updateTurns(this.turns);
  }

  /**
   * Deletes a turn based on its `sort` number and reassigns `sort` values for subsequent turns.
   * @param {number} sortNumber - The `sort` value of the turn to delete.
   */
  async deleteTurn(sortNumber) {
    const turnIndex = this.turns.findIndex((turn) => turn.sort === sortNumber);

    if (turnIndex !== -1) {
      this.turns.splice(turnIndex, 1);

      // Reassign `sort` values to close gaps after deletion
      this.turns.forEach((turn, index) => (turn.sort = index));
      await this.updateTurns(this.turns);
    }
  }

  /**
   * Swap the positions of two turns based on their `sort` values and updates their `sort` properties.
   * @param {number} sort1 - The `sort` value of the first turn.
   * @param {number} sort2 - The `sort` value of the second turn.
   */
  async swapTurns(sort1, sort2) {
    const index1 = this.turns.findIndex((turn) => turn.sort === sort1);
    const index2 = this.turns.findIndex((turn) => turn.sort === sort2);

    if (index1 !== -1 && index2 !== -1) {
      // Swap sort values
      [this.turns[index1].sort, this.turns[index2].sort] = [
        this.turns[index2].sort,
        this.turns[index1].sort,
      ];

      // Swap the turns
      [this.turns[index1], this.turns[index2]] = [
        this.turns[index2],
        this.turns[index1],
      ];
      await this.updateTurns(this.turns);
    }
  }

  /**
   * Changes the duration of a specific turn.
   * @param {number} sort - The `sort` value of the turn to modify.
   * @param {number} newDuration - The new duration to set for the turn.
   * @param {boolean} [render=true]
   */
  async changeTurnDuration(sort, newDuration, render = true) {
    const turn = this.turns.find((t) => t.sort === sort);
    if (turn && typeof newDuration === "number" && newDuration >= 1) {
      turn.duration = newDuration;
      await this.updateTurns(this.turns, render);
    }
  }
  /**
   * Adds a new member to a turn.
   * @param {number} sort - The sort number of the turn.
   * @param {string} uuid - The UUID to add.
   */
  async addMember(sort, uuid) {
    const turn = this.turns.find((t) => t.sort === sort);
    if (turn && typeof uuid === "string" && this._validateUuid(uuid)) {
      turn.members.add(uuid);
      await this.updateTurns(this.turns);
    }
  }
  /**
   * Removes a member UUID from a turn's member set.
   * @param {number} sort - The sort number of the turn.
   * @param {string} uuid - The UUID to remove.
   */
  async removeMember(sort, uuid) {
    const turn = this.turns.find((t) => t.sort === sort);
    if (turn && turn.members.has(uuid)) {
      turn.members.delete(uuid);
      await this.updateTurns(this.turns);
    }
  }

  /* -------------------------------------------- */
  /*  Watch Control Methods                       */
  /* -------------------------------------------- */

  /**
   * Initializes the current watch based on turns.
   * @returns {Watch} The current watch object.
   */
  _calcWatch() {
    const totalDuration = this.turns.reduce(
      (sum, turn) => sum + turn.duration,
      0
    );
    return { duration: totalDuration, turns: this.turns };
  }

  /**
   * Start a new Watch
   * @returns
   */
  startWatch() {
    if (this.isActive) return;

    this.isActive = true;
    this._currentTurn = 0;

    game.settings.set("on-watch", "watch", {
      watchActive: true,
      currentTurn: 0,
    });

    this.app?.render();
    this.socket.emitRenderTracker(true);
  }

  /**
   * End the Watch
   * @returns
   */
  endWatch() {
    if (!this.isActive) return;
    this.isActive = false;
    this._currentTurn = undefined;
    game.settings.set("on-watch", "watch", {
      watchActive: false,
      currentTurn: undefined,
    });

    this.updateTurns([]);
  }

  /* -------------------------------------------- */
  /*  Roll Methods                                */
  /* -------------------------------------------- */

  static ROLL_ACTIONS = Object.freeze({
    MULTIPLE: "MULTIPLE",
    INDIVIDUAL: "INDIVIDUAL",
  });

  /**
   * Opens a dialog to choose the type of roll to perform.
   * @returns {Promise<string|boolean>} The selected roll action or `false` if the dialog was closed without selection.
   */
  async createRollDialog() {
    const { DialogV2 } = foundry.applications.api;
    const { MULTIPLE, INDIVIDUAL } = WatchManager.ROLL_ACTIONS;

    const action = await DialogV2.wait({
      rejectClose: false,
      window: { title: "Choose Roll", icon: "fa-solid fa-dice-d20" },
      buttons: [
        {
          label: "Multiple Rolls",
          icon: "fa-solid fa-dice-d20",
          action: MULTIPLE,
        },
        {
          label: "Single Roll",
          icon: "fa-regular fa-dice-d20",
          action: INDIVIDUAL,
        },
      ],
    });
    return action ?? false;
  }

  async multipleRoll() {}

  async individualRoll() {}

  /* -------------------------------------------- */
  /*  Application Methods                         */
  /* -------------------------------------------- */

  #app;

  get app() {
    if (!this.#app) {
      this.#app = new WatchTracker({ doc: this });
    }
    return this.#app;
  }
}
