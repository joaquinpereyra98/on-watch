import WatchManager from "./watch-manager.mjs";

/**
 * Manages socket communications for the Watch module, allowing for turn updates,
 * rendering the tracker, and roll requests.
 * @class
 */
export default class SocketManager {
  /**
   * @param {Object} options - Configuration options for the manager.
   * @param {WatchManager|null} options.doc - The associated WatchManager instance.
   */
  constructor(options = {}) {
    /** @type {string} The unique identifier for socket messages. */
    this.identifier = "module.on-watch";
    /** @type {WatchManager|null} The WatchManager instance linked to this SocketManager. */
    this.doc = options.doc ?? null;

    this._registerListeners();
  }

  /* -------------------------------------------- */
  /*  Listeners Methods                           */
  /* -------------------------------------------- */

  /**
   * Registers the socket event listeners for the module.
   * Listens for incoming messages on the socket and calls corresponding handlers.
   * @private
   */
  _registerListeners() {
    game.socket.on(this.identifier, ({ type, payload }) => {
      switch (type) {
        case "UPDATE-TURNS":
          this._handleUpdateTurns(payload);
          break;
        case "RENDER-TRACKER":
          this._handleRenderTracker(payload);
          break;
        case "REQUEST-ROLL":
          this._handleRequestRoll(payload);
          break;
        default:
          console.error(`Unknown socket event type: ${type}`);
      }
    });
  }

  /* -------------------------------------------- */
  /*  Emitters Events Methods                     */
  /* -------------------------------------------- */

  /**
   * Emits a custom event over the game socket.
   * @param {string} type - The type of event to emit.
   * @param {Object} payload - The data associated with the event.
   * @private
   */
  _emit(type, payload) {
    game.socket.emit(this.identifier, { type, payload });
  }

  /**
   * Emits an event to update the turns.
   * @param {Turn[]} turns - Array of updated turn objects.
   */
  emitUpdateTurns(turns) {
    this._emit("UPDATE-TURNS", { turns });
  }

  /**
   * Emits an event to render the tracker application.
   * @param {boolean} [force=false] - Whether to force rendering the application.
   */
  emitRenderTracker(force = false) {
    console.log("emitRenderTracker", force)
    this._emit("RENDER-TRACKER", { force });
  }

  /**
   * Emits an event to request a roll.
   * @param {Object} payload - The data associated with the roll request.
   */
  emitRequestRoll(payload) {
    this._emit("REQUEST-ROLL", payload);
  }

  /* -------------------------------------------- */
  /*  Handlers Events Methods                     */
  /* -------------------------------------------- */

  /**
   * Handles updates to the turns from a received socket event.
   * @param {Object} payload - The updated turn data.
   * @private
   */
  _handleUpdateTurns({turns}) {
    if(game.user=== game.users.activeGM) game.settings.set("on-watch", "turns", turns);
  }

  /**
   * Handles rendering the tracker application from a received socket event.
   * @param {Object} payload - The render settings.
   * @param {boolean} payload.force - Whether to force rendering the application.
   * @private
   */
  _handleRenderTracker({ force }) {
    console.log("_handleRenderTracker", force)
    const module = game.modules.get("on-watch");
    module.watchManager?.app?.render(force);
  }

  /**
   * Handles a roll request from a received socket event.
   * @param {Object} payload - The data for the roll request.
   * @private
   */
  _handleRequestRoll(payload) {
    // Implement roll request logic here
  }
}
