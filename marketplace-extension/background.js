// Background Service Worker for FB Marketplace Assistant
console.log('[Marketplace Assistant] Background service worker loaded.');

const activePorts = new Set();
let pingIntervalId = null;

function startPingInterval() {
  if (pingIntervalId) return;
  console.log('[Marketplace Assistant] Starting 3-second background ping interval.');
  pingIntervalId = setInterval(() => {
    if (activePorts.size === 0) {
      console.log('[Marketplace Assistant] No active ports. Stopping ping interval.');
      clearInterval(pingIntervalId);
      pingIntervalId = null;
      return;
    }

    for (const port of activePorts) {
      try {
        port.postMessage({ type: 'backgroundPing' });
      } catch (e) {
        console.warn('[Marketplace Assistant] Failed to ping port, removing:', e);
        activePorts.delete(port);
      }
    }
  }, 3000);
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'mkt-keepalive') {
    console.log('[Marketplace Assistant] Content script connected keep-alive port.');
    activePorts.add(port);
    startPingInterval();

    port.onMessage.addListener((msg) => {
      if (msg && msg.type === 'keepalive') {
        // Keepalive ping received from content script.
        // We log it occasionally or just ignore.
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Marketplace Assistant] Content script disconnected keep-alive port.');
      activePorts.delete(port);
      if (activePorts.size === 0 && pingIntervalId) {
        clearInterval(pingIntervalId);
        pingIntervalId = null;
      }
    });
  }
});
