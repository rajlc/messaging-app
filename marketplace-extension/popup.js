document.addEventListener('DOMContentLoaded', () => {
  const backendUrlInput = document.getElementById('backend-url');
  const chromeProfileInput = document.getElementById('chrome-profile');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const loginSection = document.getElementById('login-section');
  const appSection = document.getElementById('app-section');
  const loggedInUserSpan = document.getElementById('logged-in-user');
  const loggedInRoleSpan = document.getElementById('logged-in-role');
  const connectionStatusSpan = document.getElementById('connection-status');

  // Load saved settings
  chrome.storage.local.get(['backendUrl', 'chromeProfile', 'token', 'user'], (data) => {
    if (data.backendUrl) {
      backendUrlInput.value = data.backendUrl;
    } else {
      chrome.storage.local.set({ backendUrl: 'http://localhost:3002' });
    }

    if (data.chromeProfile) {
      chromeProfileInput.value = data.chromeProfile;
    }

    if (data.token && data.user) {
      showAppSection(data.user);
    } else {
      showLoginSection();
    }

    checkConnection();
  });

  // Save backend URL & chrome profile on change
  backendUrlInput.addEventListener('change', () => {
    let url = backendUrlInput.value.trim();
    if (url.endsWith('/')) url = url.slice(0, -1);
    chrome.storage.local.set({ backendUrl: url }, () => {
      checkConnection();
    });
  });

  chromeProfileInput.addEventListener('change', () => {
    chrome.storage.local.set({ chromeProfile: chromeProfileInput.value.trim() });
  });

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
