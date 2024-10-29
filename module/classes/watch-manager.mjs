import WatchTracker from "../apps/watch-tracker.mjs";

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
    this.turns = this._initTurns();

    /**
     * @type {Watch}
     */
    this.watch = this._calcWatch();
    this.updateTurns(this.turns);
  }

  #app;

  get app() {
    if (!this.#app) {
      this.#app = new WatchTracker({ doc: this });
    }
    return this.#app;
  }
  /**
   * Initializes the turns from stored settings.
   * Ensures that the result is always an array of valid Turn objects.
   * @returns {Turn[]} Array of turn objects.
   */
  _initTurns() {
    let turns = game.settings.get("on-watch", "turns");
    if (!Array.isArray(turns)) turns = [];

    return this._sortTurns(
      turns.map((turn, index) => ({
        duration: typeof turn.duration === "number" ? turn.duration : 1,
        members: this._validateMembers(turn.members),
        sort: index,
      }))
    );
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
   * Validates the members of a turn, ensuring it is an array of valid UUID strings.
   * @param {any} members - The members of the turn.
   * @returns {Set<string>} Array of valid member UUIDs.
   */
  _validateMembers(members) {
    if (!Array.isArray(members)) return new Set();
    const validMembers = new Set();
    members.forEach((uuid) => {
      if (typeof uuid === "string" && this._validateUuid(uuid)) {
        const actor = fromUuidSync(uuid);
        if (actor) validMembers.add(uuid);
      }
    });
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
   * Updates the stored watches with a new array of turns.
   * @param {Turn[]} watches - Array of updated turn objects.
   * @param {boolean} [render=true] - render the App?
   */
  async updateTurns(turns, render=true) {
    this.turns = this._sortTurns(turns);
    const setting = this.turns.map((t) => ({
      ...t,
      members: Array.from(t.members),
    }));
    game.settings.set("on-watch", "turns", setting);
    this.watch = this._calcWatch();
    if(render) await this.app?.render();
  }

  /**
   * Creates and adds a new turn with a unique `sort` value.
   */
  async createTurn() {
    const newTurn = {
      duration: 0,
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
  async changeTurnDuration(sort, newDuration, render=true) {
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
}
