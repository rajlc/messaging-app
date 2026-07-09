// Persistent Sidebar Column View for Facebook Messenger & Facebook Messages
console.log('[Marketplace Assistant] content.js loaded.');

function isExtensionContextValid() {
  try {
    return !!(typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.getManifest);
  } catch (e) {
    return false;
  }
}

const activeTimeouts = new Map();
let nextTimeoutId = 1;

function safeTimeout(callback, delay) {
  if (!isExtensionContextValid()) {
    return setTimeout(callback, delay);
  }
  if (!document.hidden) {
    return setTimeout(callback, delay);
  }

  const id = nextTimeoutId++;
  activeTimeouts.set(id, callback);
  try {
    chrome.runtime.sendMessage({
      type: 'scheduleTimeout',
      delay: delay,
      timeoutId: id
    });
  } catch (err) {
    activeTimeouts.delete(id);
    return setTimeout(callback, delay);
  }
  return id;
}

function safeClearTimeout(id) {
  if (typeof id === 'number') {
    activeTimeouts.delete(id);
  } else {
    clearTimeout(id);
  }
}

// Listen for background timeouts
try {
  if (isExtensionContextValid()) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'timeoutFired') {
        const callback = activeTimeouts.get(msg.timeoutId);
        if (callback) {
          activeTimeouts.delete(msg.timeoutId);
          callback();
        }
      }
    });
  }
} catch (err) {
  console.warn('[Marketplace Assistant] Failed to add timeout listener, context likely invalidated.');
}

let backendUrl = 'http://127.0.0.1:3002/';
let token = null;
let chromeProfileTag = 'Profile-1';
let activeProfileName = 'Marketplace Profile';
let activeProfileId = 'marketplace-profile-1';
let lastHeartbeatTime = 0;
let user = null;
let monitorNewChatsEnabled = false;
let lastUserTypeTime = 0;
let lastLoggedSenderState = '';
let lastSuppressReason = '';
let lastConnectTime = 0;
let threadNoneSince = 0;
let lastActiveThreadId = '';
let activeProcessingMessageKey = '';
let activeProcessingMessageSignature = '';
let syncedCustomerNames = new Map();
// Fetch proxy helper using extension message passing to bypass Facebook page CSP
async function fetchProxy(url, options = {}) {
  if (!isExtensionContextValid()) {
    return Promise.reject(new Error('Extension context invalidated'));
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({
        type: 'fetchProxy',
        url: url,
        options: options
      }, (response) => {
        try {
          if (!isExtensionContextValid()) {
            return reject(new Error('Extension context invalidated'));
          }
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (!response) {
            return reject(new Error('No response received from background proxy'));
          }
          if (response.error) {
            return reject(new Error(response.error));
          }
          resolve({
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            json: async () => response.body,
            text: async () => typeof response.body === 'string' ? response.body : JSON.stringify(response.body)
          });
        } catch (callbackErr) {
          reject(new Error('Extension context invalidated: ' + callbackErr.message));
        }
      });
    } catch (err) {
      reject(new Error('Extension context invalidated: ' + err.message));
    }
  });
}

function queryOutsideSidebar(selector, all = false) {
  const elements = document.querySelectorAll(selector);
  const filtered = Array.from(elements).filter(el => {
    if (el.closest('#mkt-sidebar') ||
      el.closest('#mkt-order-panel') ||
      el.closest('#mkt-order-modal') ||
      el.closest('.mkt-panel-container') ||
      el.closest('#mkt-suggestion-box')) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    return true;
  });
  if (all) return filtered;
  return filtered[0] || null;
}

function isStatusOrNotificationText(txt) {
  if (!txt) return true;
  const t = txt.trim().toLowerCase();
  if (!t) return true;

  if (t === 'active now') return true;
  if (/^active\s+\d+\s*\w+\s+ago/i.test(t)) return true;
  if (/^unread\s+message/i.test(t)) return true;
  if (t === 'unread') return true;
  if (t === 'sent') return true;
  if (t === 'delivered') return true;
  if (t === 'seen') return true;

  if (/^\d+[mhdw]$/i.test(t)) return true;
  if (/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i.test(t)) return true;
  if (/^(today|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(t)) return true;
  if (t === '·' || t === '•') return true;

  return false;
}

function cleanContactName(name) {
  if (!name) return '';
  let cleaned = name.trim();

  const statusRegex = /^(active\s+now|active\s+\d+\w*\s+ago|unread\s+message:?|unread)/i;
  cleaned = cleaned.replace(statusRegex, '').trim();

  if (cleaned.includes(' · ')) {
    cleaned = cleaned.split(' · ')[0].trim();
  } else if (cleaned.includes(' • ')) {
    cleaned = cleaned.split(' • ')[0].trim();
  }

  return cleaned;
}

function isBlueColor(rgbStr) {
  if (!rgbStr) return false;
  const match = rgbStr.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return false;
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return b > 140 && b - r > 40 && b - g > 25;
}

let debugLogHistory = ['Ready.'];
function logToUI(msg) {
  console.log('[MKT Assistant]', msg);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  debugLogHistory.push(`[${time}] ${msg}`);
  if (debugLogHistory.length > 50) {
    debugLogHistory.shift();
  }
  const logEl = document.getElementById('sb-debug-logs');
  if (logEl) {
    logEl.textContent = debugLogHistory.join('\n');
    logEl.scrollTop = logEl.scrollHeight;
  }
}

// Track active user typing
document.addEventListener('keydown', (e) => {
  const activeElement = document.activeElement;
  const isInput = activeElement && (
    activeElement.getAttribute('role') === 'textbox' ||
    activeElement.getAttribute('contenteditable') === 'true' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.tagName === 'INPUT'
  );
  if (isInput) {
    lastUserTypeTime = Date.now();
  }
});

function updateSidebarFoldState() {
  chrome.storage.local.get(['sidebarFolded'], (data) => {
    const isFolded = !!data.sidebarFolded;
    const sidebar = document.getElementById('mkt-sidebar');
    if (sidebar) {
      if (isFolded) {
        sidebar.classList.add('mkt-folded');
        document.body.classList.remove('mkt-sidebar-active');
      } else {
        sidebar.classList.remove('mkt-folded');
        document.body.classList.add('mkt-sidebar-active');
      }
    }
  });
}

function toggleSidebarFold() {
  chrome.storage.local.get(['sidebarFolded'], (data) => {
    const nextState = !data.sidebarFolded;
    chrome.storage.local.set({ sidebarFolded: nextState }, () => {
      updateSidebarFoldState();
    });
  });
}

// Initial injection of Sidebar
function injectSidebar() {
  if (document.getElementById('mkt-sidebar')) return;

  // Set style to push Messenger container
  if (!document.getElementById('mkt-sidebar-body-styles')) {
    const bodyStyle = document.createElement('style');
    bodyStyle.id = 'mkt-sidebar-body-styles';
    bodyStyle.textContent = `
      body {
        position: relative !important;
        transition: margin-right 0.2s, width 0.2s;
      }
      body.mkt-sidebar-active {
        margin-right: 320px !important;
        width: calc(100% - 320px) !important;
      }
    `;
    document.head.appendChild(bodyStyle);
  }

  // Inject Styles
  const style = document.createElement('style');
  style.id = 'mkt-sidebar-styles';
  style.textContent = `
    #mkt-sidebar {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: 320px;
      background-color: #1e293b;
      color: #f8fafc;
      border-left: 1px solid #334155;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 20px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      transition: bottom 0.2s, height 0.2s, border-bottom-left-radius 0.2s, box-shadow 0.2s;
    }
    #mkt-sidebar.mkt-folded {
      bottom: auto;
      height: 48px; /* header height */
      overflow: hidden;
      border-bottom: 1px solid #334155;
      border-bottom-left-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    .mkt-sb-header {
      padding: 16px 20px;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #0f172a;
      cursor: pointer;
      user-select: none;
    }
    .mkt-sb-title {
      font-size: 14px;
      font-weight: 800;
      color: #6366f1;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .mkt-sb-body {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .mkt-sb-section {
      background-color: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .mkt-sb-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 0.05em;
    }
    .mkt-sb-value {
      font-size: 13px;
      color: #f8fafc;
      font-weight: 500;
    }
    .mkt-sb-input {
      box-sizing: border-box;
      width: 100%;
      padding: 8px 12px;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #f8fafc;
      font-size: 13px;
      outline: none;
    }
    .mkt-sb-input:focus {
      border-color: #6366f1;
    }
    .mkt-sb-btn {
      width: 100%;
      padding: 10px;
      background-color: #6366f1;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: background-color 0.2s;
      text-align: center;
    }
    .mkt-sb-btn:hover {
      background-color: #4f46e5;
    }
    .mkt-sb-btn-secondary {
      background-color: #334155;
      color: #f8fafc;
    }
    .mkt-sb-btn-secondary:hover {
      background-color: #475569;
    }
    .mkt-sb-btn-danger {
      background-color: transparent;
      color: #f43f5e;
      border: 1px solid #f43f5e;
    }
    .mkt-sb-btn-danger:hover {
      background-color: rgba(244, 63, 94, 0.1);
    }
    .mkt-status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .mkt-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .mkt-dot-online {
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    .mkt-dot-offline {
      background-color: #ef4444;
      box-shadow: 0 0 8px #ef4444;
    }

    /* ── Bulk Select Mode styles ── */
    .mkt-select-overlay {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 10;
    }
    .mkt-conv-checkbox-wrap {
      position: absolute;
      left: 4px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: all;
      z-index: 9999999;
    }
    .mkt-conv-checkbox-wrap input[type="checkbox"] {
      width: 18px;
      height: 18px;
      accent-color: #6366f1;
      cursor: pointer;
      margin: 0;
    }
    /* Highlight selected rows */
    .mkt-conv-selected {
      background: rgba(99, 102, 241, 0.18) !important;
      outline: 2px solid rgba(99, 102, 241, 0.5) !important;
      border-radius: 8px;
    }
    /* Floating action bar at bottom */
    #mkt-select-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 320px;
      background: #1e293b;
      border-top: 2px solid #6366f1;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 9999998;
      box-shadow: 0 -4px 20px rgba(0,0,0,0.4);
    }
    #mkt-select-bar .mkt-sel-count {
      font-size: 13px;
      font-weight: 700;
      color: #f8fafc;
      flex: 1;
    }
    #mkt-select-bar .mkt-sel-btn {
      padding: 8px 14px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s;
    }
    #mkt-select-bar .mkt-sel-auto {
      background: #0ea5e9;
      color: #fff;
    }
    #mkt-select-bar .mkt-sel-auto:hover { background: #0284c7; }
    #mkt-select-bar .mkt-sel-reply {
      background: #10b981;
      color: #fff;
    }
    #mkt-select-bar .mkt-sel-reply:hover { background: #059669; }
    #mkt-select-bar .mkt-sel-cancel {
      background: #334155;
      color: #f8fafc;
    }
    #mkt-select-bar .mkt-sel-cancel:hover { background: #475569; }
    #mkt-select-bar .mkt-sel-progress {
      font-size: 11px;
      color: #fbbf24;
      font-weight: 600;
    }
    @keyframes pulse-green {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }
    .mkt-btn-monitoring {
      animation: pulse-green 2s infinite;
      background-color: #10b981 !important;
      border: 1px solid #34d399 !important;
      color: white !important;
    }
  `;
  document.head.appendChild(style);

  const sidebar = document.createElement('div');
  sidebar.id = 'mkt-sidebar';
  document.body.appendChild(sidebar);

  sidebar.addEventListener('click', (e) => {
    const header = e.target.closest('.mkt-sb-header');
    const isButtonOrIndicator = e.target.closest('.mkt-status-indicator') || e.target.closest('button') || e.target.closest('input');
    if (header && !isButtonOrIndicator) {
      toggleSidebarFold();
    }
  });

  updateSidebarFoldState();
  renderSidebar();
}

// Render the inside of the sidebar based on login/active configs
function renderSidebar() {
  const sidebar = document.getElementById('mkt-sidebar');
  if (!sidebar) return;

  chrome.storage.local.get(['backendUrl', 'token', 'chromeProfile', 'user', 'autoReplyDisabled', 'monitorNewChatsEnabled', 'backgroundRunningEnabled'], (data) => {
    backendUrl = data.backendUrl || 'http://localhost:3002';
    token = data.token || null;
    chromeProfileTag = data.chromeProfile || 'Profile-1';
    user = data.user || null;
    const isAutoReplyDisabled = !!data.autoReplyDisabled;
    const isMonitorNewChatsActive = !!data.monitorNewChatsEnabled;
    monitorNewChatsEnabled = isMonitorNewChatsActive;
    const isBackgroundRunningEnabled = !!data.backgroundRunningEnabled;

    if (!token) {
      // Show login form inside sidebar
      sidebar.innerHTML = `
        <div class="mkt-sb-header">
          <h3 class="mkt-sb-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Marketplace Login
          </h3>
        </div>
        <div class="mkt-sb-body">
          <div style="font-size:12px; color:#94a3b8; line-height:1.4;">
            Please log in with your messaging app account to authenticate the assistant.
          </div>
          
          <div class="mkt-form-group">
            <label class="mkt-sb-label">Backend API URL</label>
            <input type="text" id="sb-url" class="mkt-sb-input" value="${backendUrl}">
          </div>

          <div class="mkt-form-group">
            <label class="mkt-sb-label">Chrome Profile Tag</label>
            <input type="text" id="sb-profile" class="mkt-sb-input" value="${chromeProfileTag}">
          </div>

          <div class="mkt-form-group">
            <label class="mkt-sb-label">Email</label>
            <input type="email" id="sb-email" class="mkt-sb-input" placeholder="name@email.com">
          </div>

          <div class="mkt-form-group">
            <label class="mkt-sb-label">Password</label>
            <input type="password" id="sb-pass" class="mkt-sb-input" placeholder="••••••••">
          </div>

          <button class="mkt-sb-btn" id="sb-btn-login" style="margin-top:10px;">Login</button>
          
          <div id="sb-login-status" style="font-size:12px; color:#ef4444; font-weight:600; text-align:center; display:none;"></div>
        </div>
      `;

      // Event handlers
      document.getElementById('sb-url').onchange = (e) => {
        let val = e.target.value.trim();
        if (val.endsWith('/')) val = val.slice(0, -1);
        chrome.storage.local.set({ backendUrl: val });
      };
      document.getElementById('sb-profile').onchange = (e) => {
        chrome.storage.local.set({ chromeProfile: e.target.value.trim() });
      };

      document.getElementById('sb-btn-login').onclick = async () => {
        const email = document.getElementById('sb-email').value.trim();
        const password = document.getElementById('sb-pass').value;
        const bUrl = document.getElementById('sb-url').value.trim();
        const statusDiv = document.getElementById('sb-login-status');

        if (!email || !password) {
          statusDiv.textContent = 'Please enter both fields.';
          statusDiv.style.display = 'block';
          return;
        }

        const btn = document.getElementById('sb-btn-login');
        btn.disabled = true;
        btn.textContent = 'Logging in...';
        statusDiv.style.display = 'none';

        try {
          const res = await fetchProxy(`${bUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Invalid credentials');
          }

          const result = await res.json();
          const tokenVal = result.access_token;
          const userVal = result.user || { email, role: 'user' };

          chrome.storage.local.set({ token: tokenVal, user: userVal }, () => {
            renderSidebar();
            initAssistant();
          });
        } catch (e) {
          statusDiv.textContent = e.message;
          statusDiv.style.display = 'block';
        } finally {
          btn.disabled = false;
          btn.textContent = 'Login';
        }
      };
    } else {
      // Show controls and real-time dashboard inside sidebar
      sidebar.innerHTML = `
        <div class="mkt-sb-header">
          <h3 class="mkt-sb-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            Marketplace Assistant
          </h3>
          <div class="mkt-status-indicator" id="sb-conn-status">
            <span class="mkt-dot mkt-dot-online"></span>
            <span style="font-size:10px; color:#10b981;">ONLINE</span>
          </div>
        </div>
        <div class="mkt-sb-body">
          <div class="mkt-sb-section">
            <div>
              <span class="mkt-sb-label">Logged In As</span>
              <div class="mkt-sb-value" style="font-weight:700; color:#818cf8; margin-top:2px;">
                ${user.full_name || user.email}
              </div>
            </div>
            <div>
              <span class="mkt-sb-label">Browser Profile</span>
              <div class="mkt-sb-value" style="margin-top:2px;">
                ${chromeProfileTag}
              </div>
            </div>
          </div>

          <div class="mkt-sb-section">
            <span class="mkt-sb-label">Active FB Profile</span>
            <div class="mkt-sb-value" style="font-weight:700; color:#f8fafc; margin-top:2px;" id="sb-profile-name">
              ${activeProfileName}
            </div>
          </div>

          <div class="mkt-sb-section">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="mkt-sb-label">Unread Chats</span>
                <div class="mkt-sb-value" id="sb-unread-count" style="font-size:18px; font-weight:800; color:#fbbf24; margin-top:4px;">
                  0
                </div>
              </div>
              <div>
                <span class="mkt-sb-label">Active Chat Sender</span>
                <div class="mkt-sb-value" id="sb-sender-status" style="font-size:12px; font-weight:700; color:#38bdf8; margin-top:4px;">
                  Scanning...
                </div>
              </div>
            </div>
          </div>

          <div class="mkt-sb-section">
            <span class="mkt-sb-label">Auto-Reply Configuration</span>
            <button class="mkt-sb-btn" id="sb-btn-mode" style="background-color: ${isAutoReplyDisabled ? '#f59e0b' : '#10b981'}; margin-top:4px;">
              ${isAutoReplyDisabled ? 'Mode: Suggest Only' : 'Mode: Auto-Reply'}
            </button>
          </div>

          <div class="mkt-sb-section" style="gap:8px;">
            <span class="mkt-sb-label">New Chats Auto-Pilot</span>
            <div style="font-size:11px; color:#64748b; line-height:1.4;">Automatically detect, open, and reply to any new incoming customer messages.</div>
            <button class="mkt-sb-btn ${isMonitorNewChatsActive ? 'mkt-btn-monitoring' : ''}" id="sb-btn-monitor" style="background-color: ${isMonitorNewChatsActive ? '#10b981' : '#475569'}; margin-top:2px; font-weight:700;">
              ${isMonitorNewChatsActive ? '⚡ Monitoring Active' : '⚡ Monitor New Chats'}
            </button>
          </div>

          <div class="mkt-sb-section" style="gap:8px;">
            <span class="mkt-sb-label">Background Running</span>
            <div style="font-size:11px; color:#64748b; line-height:1.4;">Keep scanning and replying even when this tab is minimized, hidden, or inactive.</div>
            <button class="mkt-sb-btn ${isBackgroundRunningEnabled ? 'mkt-btn-monitoring' : ''}" id="sb-btn-bg-run" style="background-color: ${isBackgroundRunningEnabled ? '#10b981' : '#475569'}; margin-top:2px; font-weight:700;">
              ${isBackgroundRunningEnabled ? '🟢 Background Active' : '⚪ Background Running'}
            </button>
          </div>

          <div class="mkt-sb-section" style="gap:8px;">
            <span class="mkt-sb-label">Bulk Select &amp; Reply</span>
            <div style="font-size:11px; color:#64748b; line-height:1.4;">Manually pick which conversations to reply to. Tick each chat, then press Reply.</div>
            <button class="mkt-sb-btn" id="sb-btn-select-mode" style="background-color:#7c3aed; margin-top:2px;">
              ☑ Select &amp; Reply Mode
            </button>
          </div>

          <button class="mkt-sb-btn" id="sb-btn-create-order" style="padding: 12px; font-size:14px;">
            Create Order
          </button>

          <div class="mkt-sb-section" style="gap:5px; margin-top: auto; margin-bottom: 10px;">
            <span class="mkt-sb-label" style="color:#10b981; font-weight:700;">Extension Logs</span>
            <div id="sb-debug-logs" style="font-family: monospace; font-size: 9px; color: #a7f3d0; background: #020617; border: 1px solid #1e293b; padding: 6px; height: 90px; overflow-y: auto; border-radius: 6px; line-height: 1.3; white-space: pre-wrap;">${debugLogHistory.join('\n')}</div>
          </div>

          <button class="mkt-sb-btn mkt-sb-btn-danger" id="sb-btn-logout" style="padding: 6px 12px; font-size:11px; flex-shrink:0;">
            Logout / Disconnect
          </button>
        </div>
      `;

      // Event handlers
      document.getElementById('sb-btn-mode').onclick = () => {
        chrome.storage.local.get(['autoReplyDisabled'], (config) => {
          const state = !config.autoReplyDisabled;
          chrome.storage.local.set({ autoReplyDisabled: state }, () => {
            renderSidebar();
          });
        });
      };

      document.getElementById('sb-btn-monitor').onclick = () => {
        chrome.storage.local.get(['monitorNewChatsEnabled'], (config) => {
          const state = !config.monitorNewChatsEnabled;
          chrome.storage.local.set({ monitorNewChatsEnabled: state }, () => {
            renderSidebar();
          });
        });
      };

      document.getElementById('sb-btn-bg-run').onclick = () => {
        chrome.storage.local.get(['backgroundRunningEnabled'], (config) => {
          const state = !config.backgroundRunningEnabled;
          chrome.storage.local.set({ backgroundRunningEnabled: state }, () => {
            renderSidebar();
            if (state) {
              connectKeepAlive();
            } else {
              disconnectKeepAlive();
            }
          });
        });
      };

      document.getElementById('sb-btn-select-mode').onclick = () => {
        enterSelectMode();
      };

      document.getElementById('sb-btn-create-order').onclick = () => {
        const details = getCustomerDetails();
        window.MarketplaceOrderModal.open(
          details.name,
          details.id,
          activeProfileId,
          `${activeProfileName} (${chromeProfileTag})`
        );
      };

      document.getElementById('sb-btn-logout').onclick = () => {
        chrome.storage.local.remove(['token', 'user'], () => {
          renderSidebar();
        });
      };

      checkBackendConnection();

      const logEl = document.getElementById('sb-debug-logs');
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }
  });
}

// Scrape Facebook profile info from DOM
function getActiveFBProfile() {
  const profileAnchor = queryOutsideSidebar('a[href*="facebook.com/profile.php"], a[href*="facebook.com/me/"], div[role="navigation"] a[href^="/"]');
  if (profileAnchor) {
    const nameText = profileAnchor.textContent?.trim();
    if (nameText && nameText.length > 2) {
      activeProfileName = nameText;
      const label = document.getElementById('sb-profile-name');
      if (label) label.textContent = nameText;
    }
  }

  const cookies = document.cookie;
  const match = cookies.match(/c_user=(\d+)/);
  if (match && match[1]) {
    activeProfileId = match[1];
  }
}

// Auto-register Facebook page on backend
async function registerProfileWithBackend() {
  if (!token) return;

  try {
    const res = await fetchProxy(`${backendUrl}/api/pages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        pageId: activeProfileId,
        pageName: `${activeProfileName} (${chromeProfileTag})`,
        platform: 'facebook_marketplace',
        accessToken: 'none'
      })
    });
    if (res.ok) {
      console.log('[Marketplace Assistant] Active profile registered on backend.');
    }
  } catch (e) {
    console.warn('[Marketplace Assistant] Registration failed: ', e);
  }
}

// Setup real-time listeners and DOM scanning
function initAssistant() {
  getActiveFBProfile();
  registerProfileWithBackend();
}

// Real-time scraper for unread chats
function getUnreadCount() {
  const anchors = queryOutsideSidebar('a[href]', true).filter(a => {
    const h = a.getAttribute('href') || '';
    return h.includes('/messages/t/') || h.includes('/t/');
  });

  let unreadCount = 0;
  anchors.forEach(anchor => {
    const hasAriaUnread = anchor.getAttribute('aria-label')?.toLowerCase().includes('unread');
    const hasBlueDot = Array.from(anchor.querySelectorAll('div,span')).some(el => {
      const s = window.getComputedStyle(el);
      const bg = s.backgroundColor;
      const w = parseInt(s.width);
      const h = parseInt(s.height);
      const isBlue = isBlueColor(bg);
      const isCircle = s.borderRadius === '50%' || (w > 4 && w < 16 && h === w);
      return isBlue && isCircle;
    });
    if (hasAriaUnread || hasBlueDot) {
      unreadCount++;
    }
  });
  return unreadCount;
}

// Helper to identify system notices/warnings that are not real messages
function isSystemNotice(text) {
  const textLower = text.toLowerCase();
  const warnings = [
    'to help identify and reduce scams',
    'started this chat',
    'connected on messenger',
    'use technology to review',
    'view buyer profile',
    'marketplace assistant',
    'ai reply suggestion',
    'suggested a reply',
    'joined the conversation',
    'sent an attachment',
    'was sent'
  ];
  if (warnings.some(w => textLower.includes(w))) {
    return true;
  }

  // RegEx checks for timestamps and dates (e.g. "4:54 PM", "Yesterday", "June 14")
  const timeRegex = /\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/i;
  const dayRegex = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Today|Yesterday)$/i;
  const dateRegex = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}\b/i;

  const cleanText = text.trim();
  if (timeRegex.test(cleanText) || dayRegex.test(cleanText) || dateRegex.test(cleanText)) {
    return true;
  }

  return false;
}

// Find the exact horizontal center line of the middle chat column
function getChatColumnCenter() {
  const inputArea = document.querySelector('div[role="textbox"], div[aria-label="Message"], textarea');
  if (inputArea) {
    let parent = inputArea.parentElement;
    while (parent && parent !== document.body) {
      const parentRect = parent.getBoundingClientRect();
      // The main chat pane/composer column is typically between 350px and 900px wide.
      if (parentRect.width >= 350 && parentRect.width <= 900) {
        return parentRect.left + parentRect.width / 2;
      }
      parent = parent.parentElement;
    }
    const inputRect = inputArea.getBoundingClientRect();
    return inputRect.left + inputRect.width / 2 - 40; // fallback by offsetting for left action buttons
  }

  // Fallback to main content area center
  const mainArea = document.querySelector('div[role="main"]');
  if (mainArea) {
    const mainRect = mainArea.getBoundingClientRect();
    if (mainRect.width > 0) {
      // If a right panel is open, the chat column is typically shifted to the left 60% portion of role="main".
      if (mainRect.width > 800) {
        return mainRect.left + mainRect.width * 0.35;
      }
      return mainRect.left + mainRect.width / 2;
    }
  }
  return window.innerWidth / 2;
}

// Check bubble style to identify if it is a grey customer bubble vs colored agent bubble
function getBubbleColorType(el) {
  let current = el;
  // Walk up to 3 levels to find background color
  for (let i = 0; i < 3; i++) {
    if (!current) break;
    const style = window.getComputedStyle(current);

    // Check if the background uses a gradient (gradient backgrounds are exclusively used for Agent messages)
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
      return 'colored'; // Agent message
    }

    const bg = style.backgroundColor;
    if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)')) {
      const match = bg.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min < 20) {
          return 'grey'; // Customer message
        } else {
          return 'colored'; // Agent message (blue, purple, etc.)
        }
      }
    }
    current = current.parentElement;
  }
  return 'unknown';
}

// Real-time detector for last message sender
function determineSender(el) {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return 'None';

  // 1. Try to use input area bounding box as reference
  const inputArea = queryOutsideSidebar('div[role="textbox"], div[aria-label="Message"], textarea');
  if (inputArea) {
    const inputRect = inputArea.getBoundingClientRect();
    if (inputRect.width > 0) {
      const distToLeft = rect.left - inputRect.left;
      const distToRight = inputRect.right - rect.right;
      return distToLeft < distToRight ? 'Customer' : 'Agent (Us)';
    }
  }

  // 2. Try to use role="main" bounding box as reference
  const mainArea = queryOutsideSidebar('div[role="main"]');
  if (mainArea) {
    const mainRect = mainArea.getBoundingClientRect();
    if (mainRect.width > 0) {
      const textCenter = rect.left + rect.width / 2;
      const chatCenter = mainRect.left + mainRect.width * (mainRect.width > 800 ? 0.35 : 0.5);
      return textCenter < chatCenter ? 'Customer' : 'Agent (Us)';
    }
  }

  // 3. Fallback to screen center
  const textCenter = rect.left + rect.width / 2;
  const screenCenter = window.innerWidth / 2;
  return textCenter < screenCenter ? 'Customer' : 'Agent (Us)';
}

function detectSenderOfElement(el) {
  // First, check explicit aria-label indicators which are extremely high confidence
  const row = el.closest('div[role="row"], div[data-testid="message_grid"] div[role="presentation"]');
  if (row) {
    const aria = row.getAttribute('aria-label') || '';
    if (/(sent by you|you sent|you)/i.test(aria)) {
      return 'Agent (Us)';
    }
  }

  const isAgentAria = el.closest('[aria-label*="Sent by You"], [aria-label*="You sent"], [aria-label*="You"], [aria-label*="sent by you"], [aria-label*="you sent"], [aria-label*="you"]');
  if (isAgentAria) {
    return 'Agent (Us)';
  }

  // Use geometry check as the primary structural indicator
  return determineSender(el);
}

function getActiveChatMessages() {
  const allDirs = queryOutsideSidebar('div[dir="auto"]', true);

  return allDirs.filter(el => {
    // 1. Skip left conversation sidebar list items (wrapped in conversation links)
    if (el.closest('a[href]')) {
      return false;
    }

    // Also skip standard navigation/sidebar roles
    if (el.closest('[role="navigation"], [aria-label*="Chats" i]')) {
      return false;
    }

    // 2. Skip composer/input area
    if (el.closest('[role="textbox"], [contenteditable="true"], form, [aria-label="Message" i]')) {
      return false;
    }

    // 3. Skip headers/banners
    if (el.closest('h1, h2, h3, h4, [role="heading"], [role="banner"]')) {
      return false;
    }

    // 4. Ensure it has non-empty text content
    const text = el.textContent.trim();
    if (!text) {
      return false;
    }

    // 5. Skip system notices
    if (isSystemNotice(text)) {
      return false;
    }

    return true;
  });
}

// Real-time detector for last message sender
function detectLastMessageSender() {
  const messages = getActiveChatMessages();
  if (messages.length === 0) {
    const mainArea = queryOutsideSidebar('div[role="main"]');
    console.log('[MKT Assistant] detectLastMessageSender: no message elements found. Main area present:', !!mainArea);
    return 'None';
  }

  // The last message in the array is the most recent message
  const lastMsg = messages[messages.length - 1];
  return detectSenderOfElement(lastMsg);
}

function getThreadIdFromUrl(url) {
  if (!url) return '';
  const match = url.match(/t\/([a-zA-Z0-9_\-\.]+)/) || url.match(/thread\/(\d+)/);
  return match ? match[1] : '';
}

function scrapeListingPriceAndProduct() {
  let price = '';
  let name = '';

  const pricePattern = /^(NPR|Rs\.?|\$)\s*(\d+(?:,\d+)*)\s*-\s*(.+)$/i;

  const chatPane = queryOutsideSidebar('div[role="main"], div[role="presentation"]');
  const contextArea = chatPane || document.body;

  const elements = Array.from(contextArea.querySelectorAll('span, div')).filter(el => {
    if (el.closest('#mkt-sidebar') || el.closest('#mkt-suggestion-box') || el.closest('.mkt-panel-container')) {
      return false;
    }
    return el.childElementCount === 0 && el.textContent.trim().length > 0;
  });

  for (const el of elements) {
    const text = el.textContent?.trim();
    if (text && pricePattern.test(text)) {
      const match = text.match(pricePattern);
      if (match) {
        price = `${match[1]} ${match[2]}`.trim();
        name = match[3].trim();
        break;
      }
    }
  }

  return { price, name };
}

// Scrape customer details from active chat header
function getCustomerDetails() {
  const headers = [
    queryOutsideSidebar('div[role="main"] h1'),
    queryOutsideSidebar('div[role="presentation"] h1'),
    queryOutsideSidebar('.x1heor1g.x1qlqyx8'),
    queryOutsideSidebar('span[role="heading"]')
  ];

  let rawName = '';
  for (const h of headers) {
    if (h && h.textContent) {
      rawName = h.textContent.trim();
      if (rawName.length > 0) break;
    }
  }

  // Fallback name/ID search from active conversation link in sidebar
  const activeAnchor = queryOutsideSidebar('a[aria-selected="true"]') || queryOutsideSidebar('a[href*="/messages/"][aria-current="page"]');
  if (!rawName && activeAnchor) {
    const leafTextEls = Array.from(activeAnchor.querySelectorAll('*'))
      .filter(el => el.childElementCount === 0 && el.textContent.trim().length > 1);

    const validLeaf = leafTextEls.find(el => !isStatusOrNotificationText(el.textContent));
    if (validLeaf) {
      rawName = validLeaf.textContent.trim();
    } else {
      rawName = activeAnchor.textContent?.split('\n')?.[0]?.trim() || '';
    }
  }

  // Prioritize activeAnchor ID over page URL to prevent e2ee/canonical mismatches
  let id = '';
  if (activeAnchor) {
    id = getThreadIdFromUrl(activeAnchor.getAttribute('href'));
  }
  if (!id) {
    id = getThreadIdFromUrl(window.location.href);
  }

  let name = cleanContactName(rawName);

  let productName = '';
  if (rawName.includes(' · ')) {
    productName = rawName.split(' · ')[1].trim();
  } else if (rawName.includes(' • ')) {
    productName = rawName.split(' • ')[1].trim();
  }

  const cardDetails = scrapeListingPriceAndProduct();
  let productPrice = '';
  if (cardDetails.price) {
    productPrice = cardDetails.price;
  }
  if (cardDetails.name) {
    productName = cardDetails.name;
  }

  return {
    name: name || 'Customer',
    id: id || 'customer-id',
    productName: productName || null,
    productPrice: productPrice || null
  };
}

// Check if a message bubble was sent by customer
function isIncomingMessageElement(el) {
  // Exclude extension's own elements
  if (el.closest('#mkt-sidebar') ||
    el.closest('#mkt-order-panel') ||
    el.closest('#mkt-order-modal') ||
    el.closest('.mkt-panel-container') ||
    el.closest('#mkt-suggestion-box')) {
    return false;
  }

  // Skip if inside left conversation sidebar list
  if (el.closest('[role="navigation"], [aria-label*="Chats" i]')) {
    return false;
  }

  // Skip active chat input area or composer
  if (el.closest('[role="textbox"], [contenteditable="true"], form, [aria-label="Message" i]')) {
    return false;
  }

  // Skip headings/banners/headers
  if (el.closest('h1, h2, h3, h4, [role="heading"], [role="banner"]')) {
    return false;
  }

  const text = el.textContent?.trim() || '';
  if (!text) return false;

  // Skip system notices/warnings in chat
  if (isSystemNotice(text)) {
    return false;
  }

  return detectSenderOfElement(el) === 'Customer';
}

// Watch chat feed for incoming customer messages to trigger auto-responses
function observeMessages() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Find all text bubbles inside the added node (or the node itself)
            const textContainers = Array.from(node.querySelectorAll('div[dir="auto"]'));
            if (node.matches && node.matches('div[dir="auto"]')) {
              textContainers.push(node);
            }

            for (const textEl of textContainers) {
              const messageText = textEl.textContent?.trim();
              if (messageText && isIncomingMessageElement(textEl)) {
                handleNewMessage(messageText);
              }
            }
          }
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

let lastRepliedMessageKey = '';

let lastUnreadChatClickTime = 0;

function clickNextUnreadChat() {
  const now = Date.now();
  if (now - lastUnreadChatClickTime < 6000) return; // Minimum 6 seconds between chat clicks to prevent spamming

  // Skip if we are currently typing or scheduled to type a reply
  if (typingOrScheduledKey) {
    return;
  }

  // Skip if user recently typed manually (in the last 8 seconds) or has active draft text in the composer (only if tab is visible)
  const isTabVisible = !document.hidden;
  const composer = queryOutsideSidebar('div[role="textbox"]');
  const hasDraftText = composer && composer.textContent && composer.textContent.trim().length > 0;
  const recentlyTyped = now - lastUserTypeTime < 8000;

  if (recentlyTyped || (isTabVisible && hasDraftText)) {
    const reason = recentlyTyped ? 'typing' : 'draft';
    if (reason !== lastSuppressReason) {
      lastSuppressReason = reason;
      if (recentlyTyped) {
        logToUI("Active manual typing detected. Suppressing auto-navigation.");
      } else {
        logToUI("Active composer draft detected. Suppressing auto-navigation.");
      }
    }
    return;
  }
  lastSuppressReason = '';

  // Only auto-advance if we are in Auto-Reply mode OR Monitor New Chats mode is active
  chrome.storage.local.get(['autoReplyDisabled', 'monitorNewChatsEnabled'], (config) => {
    const isAuto = !config.autoReplyDisabled || !!config.monitorNewChatsEnabled;
    if (!isAuto) return;

    // Scan for all conversation anchors on the page
    const anchors = queryOutsideSidebar('a[href]', true).filter(a => {
      const h = a.getAttribute('href') || '';
      return h.includes('/messages/t/') || h.includes('/t/');
    });

    // Diagnostic tracking for Raj Lc to find unread indicators
    const rajAnchor = queryOutsideSidebar('a[href]', true).find(a => a.textContent.includes('Raj Lc'));
    if (rajAnchor) {
      logToUI("Raj Lc anchor text: '" + rajAnchor.textContent.trim().replace(/\s+/g, ' ') + "'");
      const children = Array.from(rajAnchor.querySelectorAll('*'));
      let loggedCount = 0;
      children.forEach((child, i) => {
        const s = window.getComputedStyle(child);
        const bg = s.backgroundColor;
        const w = parseInt(s.width);
        const h = parseInt(s.height);
        if (bg && bg !== 'transparent' && !bg.includes('rgba(0, 0, 0, 0)') && loggedCount < 5) {
          logToUI("Child #" + i + " " + child.tagName + ", bg: " + bg + ", size: " + w + "x" + h + ", class: " + child.className.substring(0, 20));
          loggedCount++;
        }
      });
    }

    // Find the ones that are unread
    const unreadAnchors = anchors.filter(anchor => {
      const hasAriaUnread = anchor.getAttribute('aria-label')?.toLowerCase().includes('unread');
      const hasBlueDot = Array.from(anchor.querySelectorAll('div,span')).some(el => {
        const s = window.getComputedStyle(el);
        const bg = s.backgroundColor;
        const w = parseInt(s.width);
        const h = parseInt(s.height);
        const isBlue = isBlueColor(bg);
        const isCircle = s.borderRadius === '50%' || (w > 4 && w < 16 && h === w);
        return isBlue && isCircle;
      });
      return hasAriaUnread || hasBlueDot;
    });

    logToUI("Scanner found " + unreadAnchors.length + " unread chats.");

    if (unreadAnchors.length === 0) {
      return;
    }

    const activeUrl = window.location.href;
    const activeThreadId = getThreadIdFromUrl(activeUrl);
    logToUI("Active thread ID: " + activeThreadId);

    let idx = 0;
    for (const anchor of unreadAnchors) {
      idx++;
      const href = anchor.getAttribute('href');
      const targetThreadId = getThreadIdFromUrl(href);
      logToUI("Unread Chat #" + idx + " -> ID: " + targetThreadId + ", href: " + href);

      if (activeThreadId && targetThreadId && activeThreadId === targetThreadId) {
        logToUI("Unread Chat #" + idx + " is the active thread. Skipping.");
        continue;
      }

      logToUI("Auto-clicking unread chat: " + (targetThreadId || "unknown"));
      lastUnreadChatClickTime = now;
      anchor.click();
      break;
    }
  });
}

function checkActiveChatForUnrepliedMessage() {
  const now = Date.now();

  // If we are currently typing or scheduled to type a reply, check if the customer has sent a NEW message in the meantime.
  // If so, we abort the current typing and re-evaluate to reply to all messages combined.
  if (typingOrScheduledKey) {
    const { id: customerId, productName } = getCustomerDetails();
    if (customerId && customerId !== 'customer-id') {
      const messages = getActiveChatMessages();
      let currentLastCustomerText = '';
      for (let i = messages.length - 1; i >= 0; i--) {
        const msgEl = messages[i];
        if (isIncomingMessageElement(msgEl)) {
          currentLastCustomerText = msgEl.textContent.trim();
          break;
        }
      }

      if (currentLastCustomerText && activeProcessingMessageKey) {
        const cleanProdName = (productName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const currentKey = customerId + ':' + (cleanProdName || 'none') + ':' + currentLastCustomerText;
        if (currentKey !== activeProcessingMessageKey) {
          logToUI(`New customer message detected during typing ("${currentLastCustomerText}"). Aborting and re-evaluating...`);
          abortTyping("New customer message arrived during typing delay.");
          return;
        }
      }
    }
    return;
  }

  // If we just clicked/switched to a chat, wait 2 seconds for the messages DOM to load
  if (now - lastUnreadChatClickTime < 2000) {
    return;
  }

  const { id: customerId, name: customerName, productName } = getCustomerDetails();
  if (!customerId || customerId === 'customer-id') return;

  const lastSender = detectLastMessageSender();

  // Telemetry log to UI on change of thread or sender to trace identification
  const threadKey = customerId + ':' + lastSender;
  if (threadKey !== lastLoggedSenderState) {
    lastLoggedSenderState = threadKey;
    logToUI(`Active thread: ${customerId} (${customerName}), Last sender: ${lastSender}`);
  }

  if (lastSender !== 'None') {
    threadNoneSince = 0;
  }

  if (lastSender === 'Customer') {
    const messages = getActiveChatMessages();
    const newCustomerMessages = [];

    // Scan backwards to gather all customer messages sent since the last agent message
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgEl = messages[i];
      if (isIncomingMessageElement(msgEl)) {
        const txt = msgEl.textContent.trim();
        if (txt) {
          newCustomerMessages.unshift(txt);
        }
      } else {
        // Hit agent message, stop gathering
        break;
      }
    }

    if (newCustomerMessages.length > 0) {
      // Use the last customer message text as the unique signature for keying
      const lastText = newCustomerMessages[newCustomerMessages.length - 1];
      const combinedText = newCustomerMessages.join(' ');
      const cleanProdName = (productName || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      const messageKey = customerId + ':' + (cleanProdName || 'none') + ':' + lastText;
      const messageSignature = customerId + ':' + (cleanProdName || 'none') + ':' + combinedText;

      const lastSentAt = processedMessageSignatures.get(messageSignature) || 0;

      // Only process if this exact message signature (combined text) hasn't been processed within 12 hours
      if ((now - lastSentAt) > 43200000) {
        logToUI("Found new unreplied messages: " + JSON.stringify(newCustomerMessages));
        processedMessageSignatures.set(messageSignature, now);
        activeProcessingMessageKey = messageKey;
        activeProcessingMessageSignature = messageSignature;
        lastRepliedMessageKey = messageKey;
        handleNewMessage(newCustomerMessages);
      } else {
        // Already processed, look for other unread chats to process automatically
        logToUI("Message '" + lastText.substring(0, 15) + "...' already processed. Checking unread list.");
        clickNextUnreadChat();
      }
    } else {
      // No unreplied text found, check for other unread chats
      clickNextUnreadChat();
    }
  } else if (lastSender === 'Agent (Us)') {
    // Last message was sent by us, so look for other unread chats to process automatically
    clickNextUnreadChat();
  } else if (lastSender === 'None') {
    if (threadNoneSince === 0) {
      threadNoneSince = now;
    } else if (now - threadNoneSince > 5000) {
      logToUI("Active thread has no message elements. Moving to next unread chat.");
      threadNoneSince = 0; // reset
      clickNextUnreadChat();
    }
  }
}

const processedMessageSignatures = new Map(); // key: messageSignature, value: timestamp when we last sent this

async function handleNewMessage(textOrArray) {
  const now = Date.now();

  let combinedText = '';
  let textsArray = [];

  if (Array.isArray(textOrArray)) {
    textsArray = textOrArray;
    combinedText = textOrArray.join(' ');
  } else {
    combinedText = textOrArray;
    textsArray = [textOrArray];
  }

  logToUI("Processing intercepted messages: " + JSON.stringify(textsArray));

  if (!token) {
    logToUI("No token found. Please log in.");
    return;
  }

  const { name: customerName, id: customerId, productName, productPrice } = getCustomerDetails();
  logToUI("Customer: " + customerName + " (" + customerId + "), Product: " + (productName || 'None') + " (" + (productPrice || 'No Price') + ")");

  const hasValidCustomer = customerId && customerId !== 'customer-id';
  if (hasValidCustomer) {
    typingOrScheduledKey = customerId + ':fetching';
  }

  try {
    logToUI("Fetching auto-response from backend...");
    const response = await fetchProxy(`${backendUrl}/api/webhooks/marketplace`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        profileId: activeProfileId,
        profileName: `${activeProfileName} (${chromeProfileTag})`,
        customerId: customerId,
        customerName: customerName,
        messageText: combinedText,
        messageTexts: textsArray,
        productName: productName,
        productPrice: productPrice
      })
    });

    logToUI("Backend response status: " + response.status);

    if (response.ok) {
      const data = await response.json();
      if (data.replyText) {
        logToUI("Backend reply matched: '" + data.replyText.substring(0, 20) + "...'");

        // Only trigger reply if the fetching lock wasn't cleared/aborted in the meantime
        if (!hasValidCustomer || typingOrScheduledKey === customerId + ':fetching') {
          if (hasValidCustomer) {
            typingOrScheduledKey = ''; // Clear fetching lock so typeAndSendReply can type
          }
          chrome.storage.local.get(['autoReplyDisabled', 'monitorNewChatsEnabled'], (config) => {
            if (config.monitorNewChatsEnabled) {
              logToUI("Auto-Pilot active. Typing reply...");
              typeAndSendReply(data.replyText);
            } else if (config.autoReplyDisabled) {
              logToUI("Suggest Only mode active. Showing suggestion box.");
              if (activeProcessingMessageKey) {
                activeProcessingMessageKey = '';
              }
              injectSuggestionBox(data.replyText);
            } else {
              logToUI("Auto-Reply mode active. Typing reply...");
              typeAndSendReply(data.replyText);
            }
          });
        } else {
          logToUI("Fetch resolved but lock state changed. Aborting reply insertion.");
        }
      } else {
        logToUI("No reply template or AI response returned (cutoff or disabled).");
        if (hasValidCustomer && typingOrScheduledKey === customerId + ':fetching') {
          typingOrScheduledKey = '';
        }
        if (activeProcessingMessageKey) {
          activeProcessingMessageKey = '';
        }
      }
    } else {
      logToUI("Backend returned non-ok status: " + response.status);
      if (hasValidCustomer && typingOrScheduledKey === customerId + ':fetching') {
        typingOrScheduledKey = '';
      }
      if (activeProcessingMessageKey) {
        if (activeProcessingMessageSignature) {
          processedMessageSignatures.delete(activeProcessingMessageSignature);
          activeProcessingMessageSignature = '';
        }
        activeProcessingMessageKey = '';
      }
    }
  } catch (err) {
    logToUI("Failed to fetch reply from backend: " + err.message);
    console.error('Failed to query marketplace webhook', err);
    if (hasValidCustomer && typingOrScheduledKey === customerId + ':fetching') {
      typingOrScheduledKey = '';
    }
    if (activeProcessingMessageKey) {
      if (activeProcessingMessageSignature) {
        processedMessageSignatures.delete(activeProcessingMessageSignature);
        activeProcessingMessageSignature = '';
      }
      activeProcessingMessageKey = '';
    }
  }
}

// Suggest reply panel in chat screen
function injectSuggestionBox(replyText) {
  const existingBox = document.getElementById('mkt-suggestion-box');
  if (existingBox) existingBox.remove();

  const box = document.createElement('div');
  box.id = 'mkt-suggestion-box';
  box.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 340px; /* Aligned next to the sidebar */
    width: 320px;
    background-color: #1e293b;
    border: 1px solid #6366f1;
    border-radius: 12px;
    padding: 12px;
    z-index: 99999;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
    font-family: system-ui, sans-serif;
  `;

  box.innerHTML = `
    <div style="font-size:11px; font-weight:bold; color:#6366f1; margin-bottom:6px; display:flex; justify-content:space-between;">
      <span>AI REPLY SUGGESTION</span>
      <button style="background:none; border:none; color:#ef4444; cursor:pointer;" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
    </div>
    <div style="font-size:13px; color:#f8fafc; margin-bottom:8px; line-height:1.4;">${replyText}</div>
    <button id="mkt-send-suggest-btn" style="background-color:#6366f1; color:white; border:none; border-radius:6px; padding:6px 12px; font-size:12px; font-weight:bold; cursor:pointer; width:100%;">
      Type & Send
    </button>
  `;

  document.body.appendChild(box);

  document.getElementById('mkt-send-suggest-btn').onclick = () => {
    typeAndSendReply(replyText);
    box.remove();
  };
}

let typingOrScheduledKey = '';
let typingCustomerName = '';
let typingTimeoutId = null;
let charTypingTimeoutId = null;

function abortTyping(reason) {
  if (typingOrScheduledKey) {
    logToUI(`Aborting typing: ${reason}`);
    typingOrScheduledKey = '';
    typingCustomerName = '';
  }
  if (activeProcessingMessageKey) {
    if (activeProcessingMessageSignature) {
      processedMessageSignatures.delete(activeProcessingMessageSignature);
      activeProcessingMessageSignature = '';
    }
    activeProcessingMessageKey = '';
  }
  if (typingTimeoutId) {
    clearTimeout(typingTimeoutId);
    typingTimeoutId = null;
  }
  if (charTypingTimeoutId) {
    clearTimeout(charTypingTimeoutId);
    charTypingTimeoutId = null;
  }
}

// Simulate human typing
function typeAndSendReply(replyText) {
  const targetCustomer = getCustomerDetails();
  if (!targetCustomer.id || targetCustomer.id === 'customer-id') {
    logToUI("Could not identify customer thread. Aborting typing.");
    return;
  }

  const messageKey = targetCustomer.id + ':' + replyText;
  if (typingOrScheduledKey === messageKey) {
    logToUI("Duplicate message already scheduled. Skipping.");
    return;
  }
  if (typingOrScheduledKey && typingOrScheduledKey.startsWith(targetCustomer.id + ':')) {
    logToUI("Another message is typing for this thread. Skipping.");
    return;
  }

  typingOrScheduledKey = messageKey;
  typingCustomerName = targetCustomer.name;
  const waitMs = Math.floor(Math.random() * 10000) + 5000;
  logToUI("Simulating typing: waiting " + (waitMs / 1000).toFixed(1) + "s...");

  typingTimeoutId = setTimeout(() => {
    try {
      const currentCustomer = getCustomerDetails();
      if (currentCustomer.id !== targetCustomer.id || currentCustomer.name !== targetCustomer.name) {
        abortTyping("Chat switched before typing started.");
        return;
      }

      const input = queryOutsideSidebar('div[role="textbox"], div[aria-label="Message"], textarea');
      if (!input) {
        abortTyping("Composer input box not found.");
        return;
      }

      input.focus();
      logToUI("Typing response: '" + replyText.substring(0, 25) + "...'");

      try {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false); // Collapse to end of text
        selection.removeAllRanges();
        selection.addRange(range);
      } catch (selErr) {
        console.warn("Could not set cursor position explicitly:", selErr);
      }

      if (document.hidden) {
        logToUI("Tab is in background. Inserting entire response instantly to bypass background throttling.");

        let execSuccess = false;
        try {
          input.focus();
          const oldText = input.textContent || '';
          document.execCommand('insertText', false, replyText);
          const newText = input.textContent || '';
          if (newText.includes(replyText)) {
            logToUI("Background insertText via execCommand succeeded.");
            execSuccess = true;
          }
        } catch (execErr) {
          console.warn("execCommand failed in background:", execErr);
        }

        // Direct DOM insertion fallback (only run if execCommand failed to populate the composer)
        if (!execSuccess) {
          const currentText = input.textContent || '';
          if (!currentText.includes(replyText.substring(0, Math.min(10, replyText.length)))) {
            try {
              input.focus();

              let p = input.querySelector('p');
              if (!p) {
                p = document.createElement('p');
                p.className = 'xdj266r x11i5rnm xat24cr x1mh8g0r x16tdct8';
                input.appendChild(p);
              }

              let span = p.querySelector('span[data-lexical-text="true"]') || p.querySelector('span[data-text="true"]') || p.querySelector('span');
              if (!span) {
                span = document.createElement('span');
                span.setAttribute('data-lexical-text', 'true');
                p.appendChild(span);
              }

              span.textContent = replyText;
              p.querySelectorAll('br').forEach(br => br.remove());

              // Tell Lexical/React that the element text has changed without double-inserting
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
            } catch (domErr) {
              console.error("Direct DOM text injection failed:", domErr);
            }
          }
        }

        charTypingTimeoutId = setTimeout(() => {
          try {
            const checkCustomerFinal = getCustomerDetails();
            if (checkCustomerFinal.id !== targetCustomer.id || checkCustomerFinal.name !== targetCustomer.name) {
              abortTyping("Chat switched before sending in background.");
              return;
            }

            const textLength = (input.textContent || '').trim().length;
            if (textLength === 0) {
              abortTyping("Composer is empty. Message was not inserted correctly.");
              return;
            }

            const allButtons = queryOutsideSidebar('div[role="button"], button', true);
            let finalSendBtn = allButtons.find(b => {
              const label = (b.getAttribute('aria-label') || '').toLowerCase();
              return label === 'send' || label === 'press enter to send';
            });

            if (!finalSendBtn) {
              finalSendBtn = allButtons.find(b => {
                const label = (b.getAttribute('aria-label') || '').toLowerCase();
                if (label.includes('like')) return false;
                const svg = b.querySelector('svg');
                if (svg) {
                  const fill = svg.getAttribute('fill') || '';
                  return fill === '#0084ff' || svg.querySelector('path');
                }
                return false;
              });
            }

            if (finalSendBtn) {
              finalSendBtn.click();
              logToUI("Message sent via Send button!");
            } else {
              const dispatchKey = (type) => {
                input.dispatchEvent(new KeyboardEvent(type, {
                  key: 'Enter',
                  code: 'Enter',
                  keyCode: 13,
                  which: 13,
                  bubbles: true,
                  cancelable: true
                }));
              };
              dispatchKey('keydown');
              dispatchKey('keypress');
              dispatchKey('keyup');
              logToUI("Message sent via Enter key simulation!");
            }
          } catch (err) {
            logToUI("Error sending message: " + err.message);
          } finally {
            typingOrScheduledKey = '';
            activeProcessingMessageKey = '';
          }
        }, 500);
        return;
      }

      let charIndex = 0;
      function typeChar() {
        try {
          const checkCustomer = getCustomerDetails();
          if (checkCustomer.id !== targetCustomer.id || checkCustomer.name !== targetCustomer.name) {
            abortTyping("Chat switched during typing.");
            return;
          }

          if (charIndex < replyText.length) {
            const char = replyText.charAt(charIndex);
            document.execCommand('insertText', false, char);
            charIndex++;
            const delay = Math.floor(Math.random() * 100) + 50;
            charTypingTimeoutId = setTimeout(typeChar, delay);
          } else {
            charTypingTimeoutId = setTimeout(() => {
              try {
                const checkCustomerFinal = getCustomerDetails();
                if (checkCustomerFinal.id !== targetCustomer.id || checkCustomerFinal.name !== targetCustomer.name) {
                  abortTyping("Chat switched before sending.");
                  return;
                }

                const textLength = (input.textContent || '').trim().length;
                if (textLength === 0) {
                  abortTyping("Composer is empty. Message was not typed correctly.");
                  return;
                }

                const allButtons = queryOutsideSidebar('div[role="button"], button', true);
                let finalSendBtn = allButtons.find(b => {
                  const label = (b.getAttribute('aria-label') || '').toLowerCase();
                  return label === 'send' || label === 'press enter to send';
                });

                if (!finalSendBtn) {
                  finalSendBtn = allButtons.find(b => {
                    const label = (b.getAttribute('aria-label') || '').toLowerCase();
                    if (label.includes('like')) return false;
                    const svg = b.querySelector('svg');
                    if (svg) {
                      const fill = svg.getAttribute('fill') || '';
                      return fill === '#0084ff' || svg.querySelector('path');
                    }
                    return false;
                  });
                }

                if (finalSendBtn) {
                  finalSendBtn.click();
                  logToUI("Message sent via Send button!");
                } else {
                  const dispatchKey = (type) => {
                    input.dispatchEvent(new KeyboardEvent(type, {
                      key: 'Enter',
                      code: 'Enter',
                      keyCode: 13,
                      which: 13,
                      bubbles: true,
                      cancelable: true
                    }));
                  };
                  dispatchKey('keydown');
                  dispatchKey('keypress');
                  dispatchKey('keyup');
                  logToUI("Message sent via Enter key simulation!");
                }
              } catch (err) {
                logToUI("Error sending message: " + err.message);
              } finally {
                typingOrScheduledKey = '';
                activeProcessingMessageKey = '';
              }
            }, 300);
          }
        } catch (err) {
          logToUI("Typing error: " + err.message);
          typingOrScheduledKey = '';
          activeProcessingMessageKey = '';
        }
      }

      // Delay typing start by 250ms to let focus and range selection stabilize in the DOM
      charTypingTimeoutId = setTimeout(typeChar, 250);
    } catch (err) {
      logToUI("Typing initialization error: " + err.message);
      typingOrScheduledKey = '';
      activeProcessingMessageKey = '';
    }
  }, waitMs);
}

// Periodic check of backend connection
async function checkBackendConnection() {
  const statusIndicator = document.getElementById('sb-conn-status');
  if (!statusIndicator) return;

  try {
    const res = await fetchProxy(`${backendUrl}/api/logistics/cities`);
    if (res.ok) {
      statusIndicator.innerHTML = `
        <span class="mkt-dot mkt-dot-online"></span>
        <span style="font-size:10px; color:#10b981;">ONLINE</span>
      `;
    } else {
      throw new Error();
    }
  } catch (e) {
    statusIndicator.innerHTML = `
      <span class="mkt-dot mkt-dot-offline"></span>
      <span style="font-size:10px; color:#ef4444;">OFFLINE</span>
    `;
  }
}

async function sendHeartbeatToBackend() {
  if (!activeProfileId) return;

  chrome.storage.local.get(['token'], async (store) => {
    const activeToken = store.token || token;
    if (!activeToken) return;

    try {
      await fetchProxy(`${backendUrl}/api/pages/heartbeat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          pageId: activeProfileId,
          platform: 'facebook_marketplace'
        })
      });
    } catch (e) {
      // Ignore heartbeat errors
    }
  });
}

// Listen for manual clicks on conversation items to reset cooldown timer
document.addEventListener('click', (e) => {
  const anchor = e.target.closest('a[href]');
  if (anchor) {
    const href = anchor.getAttribute('href') || '';
    if (href.includes('/messages/t/') || href.includes('/t/') || href.includes('/messages/e2ee/t/')) {
      lastUnreadChatClickTime = Date.now();
    }
  }
});

// Listen for storage changes to sync sidebar state in real-time
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    renderSidebar();
  }
});

let lastScanTime = 0;

function runPeriodicScan() {
  if (!isExtensionContextValid()) return;
  const now = Date.now();
  if (now - lastScanTime < 2000) return;
  lastScanTime = now;

  if (now - lastHeartbeatTime > 12000) {
    lastHeartbeatTime = now;
    sendHeartbeatToBackend();
  }

  // Always ensure sidebar is loaded
  injectSidebar();

  if (token) {
    // 1. Scrape profile changes
    getActiveFBProfile();

    // 2. Scan unread messages
    const count = getUnreadCount();
    const countEl = document.getElementById('sb-unread-count');
    if (countEl) {
      countEl.textContent = count;
    }

    // 3. Scan last message sender
    const lastSender = detectLastMessageSender();
    const senderEl = document.getElementById('sb-sender-status');
    if (senderEl) {
      senderEl.textContent = lastSender;
      if (lastSender === 'Customer') {
        senderEl.style.color = '#38bdf8'; // light blue
      } else if (lastSender === 'Agent (Us)') {
        senderEl.style.color = '#10b981'; // green
      } else {
        senderEl.style.color = '#94a3b8'; // gray
      }
    }

    // Check if the thread changed to cancel any scheduled typing tasks for other threads
    const currentCustomer = getCustomerDetails();
    if (currentCustomer.id && currentCustomer.id !== 'customer-id' && currentCustomer.name && currentCustomer.name !== 'Customer') {
      const lastSynced = syncedCustomerNames.get(currentCustomer.id);
      if (lastSynced !== currentCustomer.name) {
        syncedCustomerNames.set(currentCustomer.id, currentCustomer.name);
        syncCustomerNameWithBackend(currentCustomer.id, currentCustomer.name);
      }
    }

    if (currentCustomer.id && currentCustomer.id !== lastActiveThreadId) {
      const oldId = lastActiveThreadId;
      lastActiveThreadId = currentCustomer.id;
      if (typingOrScheduledKey) {
        const scheduledId = typingOrScheduledKey.split(':')[0];
        if (scheduledId !== currentCustomer.id || (currentCustomer.id === 'customer-id' && typingCustomerName && typingCustomerName !== currentCustomer.name)) {
          abortTyping(`Thread changed to ${currentCustomer.name} (${currentCustomer.id}).`);
        }
      }
    }

    // 4. Check active chat for unreplied customer message
    checkActiveChatForUnrepliedMessage();

    // 5. Check for pending messages to type & send
    if (now - lastPendingCheckTime > 4000) {
      lastPendingCheckTime = now;
      checkPendingMessages();
    }
  }
}

let lastPendingCheckTime = 0;
let isCurrentlySendingPending = false;

async function checkPendingMessages() {
  if (!isExtensionContextValid()) return;
  if (!activeProfileId || isCurrentlySendingPending) return;

  try {
    chrome.storage.local.get(['token'], async (store) => {
      const activeToken = store.token || token;
      if (!activeToken) return;

      try {
        const res = await fetchProxy(`${backendUrl}/api/pages/pending-messages/${activeProfileId}`, {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });
        if (res.ok) {
          const queue = await res.json();
          if (queue && queue.length > 0) {
            isCurrentlySendingPending = true;
            try {
              await processPendingMessage(queue[0]);
            } finally {
              isCurrentlySendingPending = false;
            }
          }
        }
      } catch (e) {
        console.error('[Marketplace Assistant] Error checking pending messages:', e);
      }
    });
  } catch (err) {
    console.warn('[Marketplace Assistant] Pending check storage access failed, context invalidated:', err.message);
  }
}

async function processPendingMessage(msgObj) {
  const { recipientId, text, messageId } = msgObj;
  logToUI(`[Pending Send] Processing queued message for customer ${recipientId}: "${text}"`);

  // 1. Check if we are currently on the correct conversation URL
  const currentUrl = window.location.href;
  const currentThreadId = getThreadIdFromUrl(currentUrl);

  if (currentThreadId !== recipientId) {
    logToUI(`[Pending Send] Navigating to customer thread: ${recipientId}`);
    // Click the thread if visible or change location
    const anchor = queryOutsideSidebar(`a[href*="/messages/t/${recipientId}"], a[href*="/t/${recipientId}"]`);
    if (anchor) {
      anchor.click();
    } else {
      // If anchor not found in sidebar list, navigate there directly
      window.location.href = `https://www.facebook.com/messages/t/${recipientId}`;
      // Wait for page to reload/navigate
      return;
    }
    // Wait a brief delay for DOM to load after clicking
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // 2. We are on the correct thread, type and send it!
  const success = await typeAndSendReplyDirectly(text);

  if (success) {
    logToUI(`[Pending Send] Message sent successfully. Notifying backend...`);
    // 3. Notify backend to clear from queue
    chrome.storage.local.get(['token'], async (store) => {
      const activeToken = store.token || token;
      await fetchProxy(`${backendUrl}/api/pages/pending-messages/sent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          pageId: activeProfileId,
          messageId: messageId
        })
      });
    });
  } else {
    logToUI(`[Pending Send] Failed to type/send message. Will retry.`);
  }
}

async function typeAndSendReplyDirectly(replyText) {
  const input = queryOutsideSidebar('div[role="textbox"], div[aria-label="Message"], textarea');
  if (!input) {
    logToUI("[Pending Send] Composer input box not found.");
    return false;
  }

  input.focus();
  logToUI("[Pending Send] Inserting text: '" + replyText.substring(0, 25) + "...'");

  let execSuccess = false;
  try {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(input);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  } catch (e) {
    console.warn("Could not focus cursor explicitly:", e);
  }

  try {
    document.execCommand('insertText', false, replyText);
    const newText = input.textContent || '';
    if (newText.includes(replyText)) {
      execSuccess = true;
    }
  } catch (execErr) {
    console.warn("execCommand failed in foreground:", execErr);
  }

  if (!execSuccess) {
    try {
      let p = input.querySelector('p');
      if (!p) {
        p = document.createElement('p');
        p.className = 'xdj266r x11i5rnm xat24cr x1mh8g0r x16tdct8';
        input.appendChild(p);
      }
      let span = p.querySelector('span[data-lexical-text="true"]') || p.querySelector('span[data-text="true"]') || p.querySelector('span');
      if (!span) {
        span = document.createElement('span');
        span.setAttribute('data-lexical-text', 'true');
        p.appendChild(span);
      }
      span.textContent = replyText;
      p.querySelectorAll('br').forEach(br => br.remove());
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      execSuccess = true;
    } catch (domErr) {
      console.error("Direct DOM text injection failed:", domErr);
    }
  }

  await new Promise(resolve => setTimeout(resolve, 800));

  const textLength = (input.textContent || '').trim().length;
  if (textLength === 0) {
    logToUI("[Pending Send] Composer is empty. Message insertion failed.");
    return false;
  }

  // Click send button
  const allButtons = queryOutsideSidebar('div[role="button"], button', true);
  let finalSendBtn = allButtons.find(b => {
    const label = (b.getAttribute('aria-label') || '').toLowerCase();
    return label === 'send' || label === 'press enter to send';
  });

  if (!finalSendBtn) {
    finalSendBtn = allButtons.find(b => {
      const label = (b.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('like')) return false;
      const svg = b.querySelector('svg');
      if (svg) {
        const fill = svg.getAttribute('fill') || '';
        return fill === '#0084ff' || svg.querySelector('path');
      }
      return false;
    });
  }

  if (finalSendBtn) {
    finalSendBtn.click();
    logToUI("[Pending Send] Sent via Send button!");
    return true;
  } else {
    const dispatchKey = (type) => {
      input.dispatchEvent(new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));
    };
    dispatchKey('keydown');
    dispatchKey('keypress');
    dispatchKey('keyup');
    logToUI("[Pending Send] Sent via Enter simulation!");
    return true;
  }
}

async function syncCustomerNameWithBackend(customerId, customerName) {
  if (!token) return;
  try {
    const res = await fetchProxy(`${backendUrl}/api/conversations/sync-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ customerId, customerName })
    });
    if (res.ok) {
      console.log(`[Marketplace Assistant] Successfully synced customer name: ${customerId} -> ${customerName}`);
    } else {
      console.warn(`[Marketplace Assistant] Failed to sync customer name: ${res.status}`);
    }
  } catch (e) {
    console.error('[Marketplace Assistant] Error syncing customer name:', e);
  }
}

// Periodic scanning of Facebook DOM for layout registration and count metrics
setInterval(() => {
  runPeriodicScan();
}, 3000);

let keepAlivePort = null;

function connectKeepAlive() {
  if (!isExtensionContextValid()) return;
  try {
    chrome.storage.local.get(['backgroundRunningEnabled'], (data) => {
      if (!data.backgroundRunningEnabled) {
        disconnectKeepAlive();
        return;
      }

      if (keepAlivePort) return;

      const now = Date.now();
      // If we connected less than 1.5 seconds ago, delay the next connection to prevent infinite looping or spamming if SW keeps failing
      if (now - lastConnectTime < 1500) {
        setTimeout(connectKeepAlive, 2000);
        return;
      }
      lastConnectTime = now;

      try {
        console.log('[Marketplace Assistant] Connecting keepalive port to background service worker.');
        keepAlivePort = chrome.runtime.connect({ name: 'mkt-keepalive' });

        keepAlivePort.onMessage.addListener((msg) => {
          if (msg && msg.type === 'backgroundPing') {
            // Trigger scan
            runPeriodicScan();
          }
        });

        keepAlivePort.onDisconnect.addListener(() => {
          console.log('[Marketplace Assistant] Keepalive port disconnected. Reconnecting immediately...');
          keepAlivePort = null;
          connectKeepAlive();
        });
      } catch (e) {
        console.error('[Marketplace Assistant] Failed to connect port:', e);
        setTimeout(connectKeepAlive, 5000);
      }
    });
  } catch (err) {
    console.warn('[Marketplace Assistant] connectKeepAlive storage access failed, context invalidated:', err.message);
  }
}

function disconnectKeepAlive() {
  if (keepAlivePort) {
    try {
      console.log('[Marketplace Assistant] Disconnecting keepalive port.');
      keepAlivePort.disconnect();
    } catch (e) { }
    keepAlivePort = null;
  }
}

// Send a periodic keepalive ping to the service worker to prevent MV3 hibernation
setInterval(() => {
  if (!isExtensionContextValid()) return;
  if (keepAlivePort) {
    try {
      keepAlivePort.postMessage({ type: 'keepalive' });
    } catch (e) {
      // Disconnection listener will handle reconnecting
    }
  }
}, 10000);

// ═══════════════════════════════════════════════════════════
// BULK SELECT & REPLY MODE  (sidebar conversation picker)
// ═══════════════════════════════════════════════════════════

let selectModeActive = false;
const selectModeConversations = new Map(); // href -> {name,preview,isUnread,isCustomerLast}
const selectedHrefs = new Set();

function scrapeConversationList() {
  selectModeConversations.clear();
  const anchors = queryOutsideSidebar('a[href]', true).filter(a => {
    const h = a.getAttribute('href') || '';
    return h.includes('/messages/') || h.includes('/t/');
  });
  anchors.forEach(anchor => {
    const href = anchor.getAttribute('href');
    if (!href || selectModeConversations.has(href)) return;
    const textEls = Array.from(anchor.querySelectorAll('[dir="auto"], span, div'))
      .filter(el => el.childElementCount === 0 && el.textContent.trim().length > 1);
    let name = textEls.length > 0 ? textEls[0].textContent.trim() : anchor.textContent.trim().split('\n')[0].trim();
    if (!name || name.length < 2) return;
    let preview = textEls.length > 1 ? textEls[1].textContent.trim() : '';
    const isUnread = Array.from(anchor.querySelectorAll('div,span')).some(el => {
      const s = window.getComputedStyle(el);
      const bg = s.backgroundColor;
      const w = parseInt(s.width);
      return (bg === 'rgb(0, 132, 255)' || bg === 'rgb(45, 136, 255)' || bg === 'rgb(24, 119, 242)') && s.borderRadius === '50%' && w > 4 && w < 20;
    });
    const isCustomerLast = preview && !preview.toLowerCase().startsWith('you:') && !preview.toLowerCase().startsWith('you ');
    selectModeConversations.set(href, { name, preview, isUnread, isCustomerLast });
  });
  console.log('[Select Mode] Scraped ' + selectModeConversations.size + ' conversations.');
}

function enterSelectMode() {
  if (selectModeActive) return;
  selectModeActive = true;
  selectedHrefs.clear();
  scrapeConversationList();

  const sidebar = document.getElementById('mkt-sidebar');
  if (!sidebar) return;

  let rowsHtml = '';
  if (selectModeConversations.size === 0) {
    rowsHtml = '<div style="color:#64748b;font-size:12px;text-align:center;padding:20px;">No conversations found.<br>Make sure you are on FB Marketplace Chats.</div>';
  } else {
    let idx = 0;
    selectModeConversations.forEach((conv, href) => {
      const badge = conv.isUnread ? '<span style="display:inline-block;width:7px;height:7px;background:#3b82f6;border-radius:50%;margin-left:4px;vertical-align:middle;"></span>' : '';
      const previewColor = conv.isCustomerLast ? '#38bdf8' : '#64748b';
      const previewStr = conv.preview ? conv.preview.substring(0, 45) : (conv.isCustomerLast ? 'Customer message' : 'You sent last');
      const safeHref = href.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      rowsHtml += '<div class="mkt-pick-row" data-idx="' + idx + '" data-href="' + safeHref + '" style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid #334155;background:#0f172a;transition:all 0.15s;">' +
        '<input type="checkbox" class="mkt-pick-cb" data-href="' + safeHref + '" style="width:16px;height:16px;accent-color:#6366f1;cursor:pointer;flex-shrink:0;">' +
        '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:12px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + conv.name + badge + '</div>' +
        '<div style="font-size:10px;color:' + previewColor + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;">' + previewStr + '</div>' +
        '</div>' +
        '</div>';
      idx++;
    });
  }

  sidebar.innerHTML =
    '<div class="mkt-sb-header" style="flex-shrink:0;">' +
    '<h3 class="mkt-sb-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> Select Conversations</h3>' +
    '<span id="mkt-pick-count" style="font-size:11px;color:#fbbf24;font-weight:700;">0 selected</span>' +
    '</div>' +
    '<div style="padding:8px 12px;display:flex;gap:6px;border-bottom:1px solid #334155;flex-shrink:0;">' +
    '<button id="mkt-pick-auto" style="flex:1;padding:7px 6px;background:#0ea5e9;color:#fff;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">&#9889; Auto-Unread</button>' +
    '<button id="mkt-pick-all" style="flex:1;padding:7px 6px;background:#334155;color:#f8fafc;border:none;border-radius:7px;font-size:11px;font-weight:700;cursor:pointer;">&#9745; All</button>' +
    '<button id="mkt-pick-refresh" style="padding:7px 8px;background:#334155;color:#94a3b8;border:none;border-radius:7px;font-size:11px;cursor:pointer;" title="Refresh">&#8635;</button>' +
    '</div>' +
    '<div id="mkt-pick-list" style="flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:5px;">' + rowsHtml + '</div>' +
    '<div id="mkt-pick-progress" style="display:none;padding:6px 12px;font-size:11px;font-weight:700;color:#fbbf24;background:#0f172a;text-align:center;border-top:1px solid #334155;flex-shrink:0;"></div>' +
    '<div style="padding:10px 12px;border-top:1px solid #334155;display:flex;flex-direction:column;gap:6px;flex-shrink:0;">' +
    '<button id="mkt-pick-reply" disabled style="padding:10px;background:#10b981;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:not-allowed;opacity:0.5;">&#9993; Reply to Selected (0)</button>' +
    '<button id="mkt-pick-back" style="padding:8px;background:#334155;color:#f8fafc;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">&#8592; Back</button>' +
    '</div>';

  // Wire up row clicks
  sidebar.querySelectorAll('.mkt-pick-row').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.type === 'checkbox') return;
      const cb = row.querySelector('.mkt-pick-cb');
      if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
    });
    const cb = row.querySelector('.mkt-pick-cb');
    if (cb) {
      cb.addEventListener('change', () => {
        const href = cb.dataset.href;
        if (cb.checked) { selectedHrefs.add(href); row.style.background = 'rgba(99,102,241,0.2)'; row.style.borderColor = '#6366f1'; }
        else { selectedHrefs.delete(href); row.style.background = '#0f172a'; row.style.borderColor = '#334155'; }
        updatePickerCount();
      });
    }
  });

  document.getElementById('mkt-pick-auto').onclick = autoSelectUnreadPicker;
  document.getElementById('mkt-pick-all').onclick = selectAllPicker;
  document.getElementById('mkt-pick-refresh').onclick = () => { exitSelectMode(); enterSelectMode(); };
  document.getElementById('mkt-pick-reply').onclick = processSelectedConversations;
  document.getElementById('mkt-pick-back').onclick = exitSelectMode;
}

function updatePickerCount() {
  const count = selectedHrefs.size;
  const el = document.getElementById('mkt-pick-count');
  const btn = document.getElementById('mkt-pick-reply');
  if (el) el.textContent = count + ' selected';
  if (btn) {
    btn.textContent = '\u2709 Reply to Selected (' + count + ')';
    btn.disabled = count === 0;
    btn.style.opacity = count === 0 ? '0.5' : '1';
    btn.style.cursor = count === 0 ? 'not-allowed' : 'pointer';
  }
}

function autoSelectUnreadPicker() {
  document.querySelectorAll('.mkt-pick-cb').forEach(cb => { if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change')); } });
  selectedHrefs.clear();
  let count = 0;
  selectModeConversations.forEach((conv, href) => {
    if (conv.isUnread || conv.isCustomerLast) {
      const cb = document.querySelector('.mkt-pick-cb[data-href="' + href.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"]');
      if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); count++; }
    }
  });
  console.log('[Select Mode] Auto-selected ' + count + ' conversations.');
}

function selectAllPicker() {
  document.querySelectorAll('.mkt-pick-cb').forEach(cb => { if (!cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); } });
}

async function processSelectedConversations() {
  if (selectedHrefs.size === 0) return;
  const links = Array.from(selectedHrefs);
  const replyBtn = document.getElementById('mkt-pick-reply');
  const backBtn = document.getElementById('mkt-pick-back');
  const autoBtn = document.getElementById('mkt-pick-auto');
  const progressEl = document.getElementById('mkt-pick-progress');

  if (replyBtn) { replyBtn.disabled = true; replyBtn.textContent = 'Processing...'; replyBtn.style.opacity = '0.7'; }
  if (backBtn) backBtn.disabled = true;
  if (autoBtn) autoBtn.disabled = true;
  if (progressEl) progressEl.style.display = '';

  let done = 0, replied = 0, skipped = 0;

  for (const href of links) {
    done++;
    const conv = selectModeConversations.get(href);
    const name = conv ? conv.name.substring(0, 20) : '...';
    if (progressEl) progressEl.textContent = '(' + done + '/' + links.length + ') Opening: ' + name + '...';

    const anchor = queryOutsideSidebar('a[href="' + href + '"]');
    if (!anchor) { skipped++; continue; }
    anchor.click();
    await new Promise(r => setTimeout(r, 2800));

    if (progressEl) progressEl.textContent = '(' + done + '/' + links.length + ') Reading messages...';

    const msgRows = queryOutsideSidebar('div[role="row"], div.x78zum5.xdt5ytf.x1iyjqo2.xs83m0k', true);

    let lastText = '';
    for (let i = msgRows.length - 1; i >= 0; i--) {
      const row = msgRows[i];
      if (row.closest('[role="navigation"],[aria-label*="Chats" i]')) continue;
      if (row.closest('[role="textbox"],[contenteditable="true"],form')) continue;
      if (row.closest('h1,h2,h3,[role="heading"],[role="banner"]')) continue;
      const textEl = row.querySelector('div[dir="auto"]');
      if (!textEl) continue;
      const text = textEl.textContent.trim();
      if (!text || isSystemNotice(text)) continue;
      lastText = text;
      break;
    }

    if (!lastText) { skipped++; continue; }

    if (progressEl) progressEl.textContent = '(' + done + '/' + links.length + ') Sending reply...';
    await handleNewMessage(lastText);
    replied++;
    await new Promise(r => setTimeout(r, 1500));
  }

  if (progressEl) {
    progressEl.textContent = 'Done! ' + replied + ' replied, ' + skipped + ' skipped.';
    progressEl.style.color = '#10b981';
    setTimeout(() => { if (progressEl) { progressEl.style.display = 'none'; progressEl.style.color = '#fbbf24'; } }, 6000);
  }
  if (replyBtn) { replyBtn.disabled = false; replyBtn.textContent = 'Reply to Selected (' + selectedHrefs.size + ')'; replyBtn.style.opacity = '1'; }
  if (backBtn) backBtn.disabled = false;
  if (autoBtn) autoBtn.disabled = false;
}

function exitSelectMode() {
  selectModeActive = false;
  selectedHrefs.clear();
  selectModeConversations.clear();
  document.querySelectorAll('.mkt-conv-checkbox-wrap').forEach(w => w.remove());
  const bar = document.getElementById('mkt-select-bar');
  if (bar) bar.remove();
  renderSidebar();
}

// ═══════════════════════════════════════════════════════════
// Initialize assistant logic
injectSidebar();
initAssistant();
connectKeepAlive();
// observeMessages() disabled to prevent historical rendering from re-triggering replies
// observeMessages();
