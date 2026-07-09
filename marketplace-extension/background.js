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

// Fetch proxy listener to bypass CSP of injected pages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'scheduleTimeout') {
    const { delay, timeoutId } = message;
    setTimeout(() => {
      try {
        if (sender && sender.tab && sender.tab.id) {
          chrome.tabs.sendMessage(sender.tab.id, { type: 'timeoutFired', timeoutId });
        }
      } catch (err) {
        console.warn('[Marketplace Assistant] Failed to send timeoutFired to tab:', err);
      }
    }, delay);
    return false;
  }

  if (message && message.type === 'fetchProxy') {
    const { url, options } = message;
    fetch(url, options)
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        let body;
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
        sendResponse({
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          body: body
        });
      })
      .catch((error) => {
        console.error('[Marketplace Assistant] Fetch proxy error:', error);
        sendResponse({
          ok: false,
          error: error.message
        });
      });
    return true; // Keep the message channel open for async sendResponse
  }
});

