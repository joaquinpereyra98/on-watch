/**
 * Represents a single turn in a watch.
 * @typedef {Object} Turn
 * @property {number} duration - Duration of the turn in hours.
 * @property {string[]} members - Array of turn member UUIDs.
 */

/**
 * Represents a watch consisting of multiple turns.
 * @typedef {Object} Watch
 * @property {number} duration - Total duration of the watch in hours.
 * @property {Turn[]} turns - Array of turns that make up the watch.
 */

/**
 * A class that tracks and manages turns with support for resetting and accessing the current watch.
 */
export default class WatchManager {
  constructor() {
    /**
     * @type {Watch}
     */
    this.watch;

    /**
     * @type {Turn[]}
     */
    this.turns = this._initTurns();
    this.updateTurns(this.turns);

  }

  /**
   * Initializes the turns from stored settings.
   * Ensures that the result is always an array of valid Turn objects.
   * @returns {Turn[]} Array of turn objects.
   */
  _initTurns() {
    let turns = game.settings.get("on-watch", "turns");
    if (!Array.isArray(turns)) turns = [];
    const test = turns.map((turn) => ({
      duration: typeof turn.duration === "number" ? turn.duration : 0,
      members: this._validateMembers(turn.members),
    }));
    return test;
  }

  /**
   * Validates the members of a turn, ensuring it is an array of valid UUID strings.
   * @param {any} members - The members of the turn.
   * @returns {string[]} Array of valid member UUIDs.
   */
  _validateMembers(members) {
    if (!Array.isArray(members)) return [];
    return members.filter(
      (uuid) => typeof uuid === "string" && this._validateUuid(uuid)
    );
  }

  /**
   * Validates a UUID string.
   * @param {string} uuid - The UUID to validate.
   * @returns {boolean} True if the UUID is valid, false otherwise.
   */
  _validateUuid(uuid) {
    const p = parseUuid(uuid);
    return p.type === "Actor" && isValidId(p.documentId);
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
   */
  updateTurns(turns) {
    game.settings.set("on-watch", "turns", turns);
    this.watch = this._calcWatch();
  }

  createTurn(){
    this.turns.push({
      duration: 0,
      members: []
    });
    this.updateTurns(this.turns);
  }
}
