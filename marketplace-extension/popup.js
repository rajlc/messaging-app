document.addEventListener('DOMContentLoaded', () => {
  const backendUrlInput = document.getElementById('backend-url');
  const chromeProfileSelect = document.getElementById('chrome-profile');
  const btnRefreshProfiles = document.getElementById('btn-refresh-profiles');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');
  const loggedInUserSpan = document.getElementById('logged-in-user');
  const loggedInRoleSpan = document.getElementById('logged-in-role');
  const connectionStatusSpan = document.getElementById('connection-status');

  const SUPABASE_URL = 'https://jrcluodakvudjkwlrrxi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyY2x1b2Rha3Z1ZGprd2xycnhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODQ3NzgsImV4cCI6MjA4NDc2MDc3OH0.XtZdrmmG1YUAj22GPCZB0E48TtY-CdPlmdIGZYECk0s';

  async function fetchMarketplaceProfiles(backendUrl) {
    // 1. Direct Supabase REST API (Directly matches Marketplace Settings in real-time)
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_profiles?select=*&order=created_at.asc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (err) {
      console.warn('[Marketplace Assistant] Supabase REST error:', err);
    }

    // 2. Fallback backend endpoint
    try {
      if (backendUrl) {
        const res = await fetch(`${backendUrl}/marketplace/settings`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json?.profiles) && json.profiles.length > 0) {
            return json.profiles;
          }
        }
      }
    } catch (err) {
      console.warn('[Marketplace Assistant] Backend profiles fallback error:', err);
    }

    return [];
  }

  function populateProfilesDropdown(profiles, currentSelected) {
    chromeProfileSelect.innerHTML = '';
    const seen = new Set();
    const uniqueNames = [];

    // Deduplicate profiles case-insensitively
    for (const p of profiles) {
      const name = (p.name || '').trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueNames.push(name);
      }
    }

    // Default fallback
    if (uniqueNames.length === 0) {
      uniqueNames.push('Default');
      seen.add('default');
    }

    // Preserve previously selected custom profile without duplicating
    if (currentSelected && typeof currentSelected === 'string' && currentSelected.trim()) {
      const cleanSel = currentSelected.trim();
      if (!seen.has(cleanSel.toLowerCase())) {
        uniqueNames.push(cleanSel);
        seen.add(cleanSel.toLowerCase());
      }
    }

    for (const name of uniqueNames) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      if (currentSelected && currentSelected.trim().toLowerCase() === name.toLowerCase()) {
        opt.selected = true;
      }
      chromeProfileSelect.appendChild(opt);
    }

    if (!chromeProfileSelect.value && uniqueNames.length > 0) {
      chromeProfileSelect.value = uniqueNames[0];
    }
  }

  // Load saved settings & profiles
  chrome.storage.local.get(['backendUrl', 'chromeProfile', 'token', 'user'], async (data) => {
    if (data.backendUrl) {
      backendUrlInput.value = data.backendUrl;
    } else {
      chrome.storage.local.set({ backendUrl: 'http://localhost:3002' });
    }

    // Fetch and populate profiles without duplicates
    const profiles = await fetchMarketplaceProfiles(data.backendUrl);
    populateProfilesDropdown(profiles, data.chromeProfile);

    // Save initial selected profile if none set
    if (!data.chromeProfile && chromeProfileSelect.value) {
      chrome.storage.local.set({ chromeProfile: chromeProfileSelect.value });
    }

    if (data.token && data.user) {
      showAppSection(data.user);
    } else {
      showLoginSection();
    }

    checkConnection();
  });

  // Save backend URL on change
  backendUrlInput.addEventListener('change', () => {
    let url = backendUrlInput.value.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    chrome.storage.local.set({ backendUrl: url }, () => {
      checkConnection();
    });
  });

  // Save selected profile on change
  chromeProfileSelect.addEventListener('change', () => {
    const selected = chromeProfileSelect.value;
    chrome.storage.local.set({ chromeProfile: selected });
  });

  // Refresh profiles button
  if (btnRefreshProfiles) {
    btnRefreshProfiles.addEventListener('click', async () => {
      btnRefreshProfiles.textContent = '↻ Loading...';
      const data = await chrome.storage.local.get(['backendUrl', 'chromeProfile']);
      const profiles = await fetchMarketplaceProfiles(data.backendUrl);
      populateProfilesDropdown(profiles, data.chromeProfile);
      if (chromeProfileSelect.value) {
        chrome.storage.local.set({ chromeProfile: chromeProfileSelect.value });
      }
      btnRefreshProfiles.textContent = '↻ Refresh';
    });
  }

  // Login click handler
  btnLogin.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const backendUrl = backendUrlInput.value.trim();

    if (!email || !password) {
      alert('Please fill in both email and password.');
      return;
    }

    btnLogin.disabled = true;
    btnLogin.textContent = 'Logging in...';

    try {
      const response = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Invalid credentials');
      }

      const result = await response.json();
      const token = result.access_token;
      const user = result.user || { email, role: 'user' };

      chrome.storage.local.set({ token, user }, () => {
        showAppSection(user);
        emailInput.value = '';
        passwordInput.value = '';
      });

    } catch (error) {
      alert('Login failed: ' + error.message);
    } finally {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Login';
    }
  });

  // Logout click handler
  btnLogout.addEventListener('click', () => {
    chrome.storage.local.remove(['token', 'user'], () => {
      showLoginSection();
    });
  });

  function showLoginSection() {
    loginSection.style.display = 'block';
    appSection.style.display = 'none';
  }

  function showAppSection(user) {
    loginSection.style.display = 'none';
    appSection.style.display = 'block';
    loggedInUserSpan.textContent = user.full_name || user.email;
    loggedInRoleSpan.textContent = user.role ? user.role.toUpperCase() : 'USER';
  }

  async function checkConnection() {
    const backendUrl = backendUrlInput.value.trim();
    connectionStatusSpan.className = 'status-value status-disconnected';
    connectionStatusSpan.textContent = 'Checking...';

    try {
      const res = await fetch(`${backendUrl}/api/logistics/cities`);
      if (res.ok) {
        connectionStatusSpan.className = 'status-value status-connected';
        connectionStatusSpan.textContent = 'Connected to Backend';
      } else {
        throw new Error();
      }
    } catch (e) {
      connectionStatusSpan.className = 'status-value status-disconnected';
      connectionStatusSpan.textContent = 'Offline';
    }
  }
});
