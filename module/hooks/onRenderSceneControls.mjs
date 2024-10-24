/** 
 * A hook event that fires whenever an SceneControls is rendered.
 * @param {Application} application
 * @param {JQuery} html
 * @param {Object} data
 */
export default function onRenderSceneControls(application, html, data) {
  const content = `
    <li class="scene-control on-watch" aria-label="On Track!" data-tooltip="On Watch!">
            <i class="fa-solid fa-snooze"></i>
    </li>
    `;
  html.find("ol.main-controls.control-tools").append(content);

  html.on("click", ".scene-control.on-watch", () => {
    console.log("Ontrack button clicked!");
    getModule().watchTracker?.render(true);
  });
}