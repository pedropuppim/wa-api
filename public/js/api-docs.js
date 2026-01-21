(function () {
  'use strict';

  const logoutBtn = document.getElementById('logoutBtn');

  // Fetch API token and update curl examples
  async function fetchApiToken() {
    try {
      const response = await fetch('/dashboard/settings');

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }

      const data = await response.json();

      if (data.ok && data.settings.API_TOKEN) {
        const token = data.settings.API_TOKEN;
        document.querySelectorAll('.api-token-placeholder').forEach((el) => {
          el.textContent = token;
        });
      }

      // Update base URL in curl examples
      const baseUrl = window.location.origin;
      document.querySelectorAll('.curl-base-url').forEach((el) => {
        el.textContent = baseUrl;
      });
    } catch (err) {
      console.error('Error fetching API token:', err);
    }
  }

  // Copy curl to clipboard
  async function copyCurl(targetId, btn) {
    const pre = document.getElementById(targetId);
    if (!pre) return;

    const text = pre.textContent;

    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('copied');

      setTimeout(() => {
        btn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);

      btn.classList.add('copied');
      setTimeout(() => {
        btn.classList.remove('copied');
      }, 2000);
    }
  }

  // Setup copy buttons for curl examples
  function setupCurlCopyButtons() {
    document.querySelectorAll('.btn-copy-curl').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        copyCurl(target, btn);
      });
    });
  }

  // Setup collapsible sections
  function setupCollapsibles() {
    document.querySelectorAll('.collapsible-header').forEach((header) => {
      header.addEventListener('click', () => {
        const collapsible = header.closest('.collapsible');
        collapsible.classList.toggle('open');
      });
    });
  }

  // Logout
  async function logout() {
    try {
      await fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Error logging out:', err);
    }
    window.location.href = '/login';
  }

  // Initialize
  function init() {
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    setupCurlCopyButtons();
    setupCollapsibles();
    fetchApiToken();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
