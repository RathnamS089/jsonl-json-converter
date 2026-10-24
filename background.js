// Clicking the toolbar icon opens the side panel. Unlike a popup, the side panel
// stays open while the OS file picker is up or a file is dragged in.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err) => console.error(err));
