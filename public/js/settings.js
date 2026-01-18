(function () {
  'use strict';

  const settingsForm = document.getElementById('settingsForm');
  const messageEl = document.getElementById('message');
  const logoutBtn = document.getElementById('logoutBtn');

  // Toggle password visibility and copy to clipboard
  async function toggleAndCopy(fieldId, btn) {
    const input = document.getElementById(fieldId);

    // Don't copy masked values
    if (input.value === '••••••••') {
      showMessage('Token esta oculto. Defina um novo valor para copiar.', 'error');
      return;
    }

    // Toggle visibility temporarily
    const wasPassword = input.type === 'password';
    input.type = 'text';

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(input.value);
      btn.classList.add('copied');
      showMessage('Copiado para a area de transferencia!', 'success');

      setTimeout(() => {
        btn.classList.remove('copied');
        if (wasPassword) {
          input.type = 'password';
        }
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      input.select();
      document.execCommand('copy');
      showMessage('Copiado!', 'success');

      setTimeout(() => {
        if (wasPassword) {
          input.type = 'password';
        }
      }, 2000);
    }
  }

  // Setup copy buttons
  function setupCopyButtons() {
    document.querySelectorAll('.btn-copy').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = btn.getAttribute('data-target');
        toggleAndCopy(target, btn);
      });
    });
  }

  // Load current settings
  async function loadSettings() {
    try {
      const response = await fetch('/dashboard/settings');

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.ok) {
        document.getElementById('DASH_USER').value = data.settings.DASH_USER || '';
        document.getElementById('DASH_PASS').value = data.settings.DASH_PASS || '';
        document.getElementById('WEBHOOK_URL').value = data.settings.WEBHOOK_URL || '';
        document.getElementById('WEBHOOK_TOKEN').value = data.settings.WEBHOOK_TOKEN || '';
        document.getElementById('API_TOKEN').value = data.settings.API_TOKEN || '';
        document.getElementById('PAUSE_DURATION_HOURS').value = data.settings.PAUSE_DURATION_HOURS || 4;
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      showMessage('Erro ao carregar configuracoes', 'error');
    }
  }

  // Save settings
  async function saveSettings(e) {
    e.preventDefault();

    const formData = new FormData(settingsForm);
    const settings = {};

    for (const [key, value] of formData.entries()) {
      settings[key] = value;
    }

    try {
      const response = await fetch('/dashboard/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.ok) {
        showMessage('Configuracoes salvas com sucesso!', 'success');
        // Reload settings to show updated masked values
        await loadSettings();
      } else {
        showMessage(data.error || 'Erro ao salvar configuracoes', 'error');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showMessage('Erro ao salvar configuracoes', 'error');
    }
  }

  // Show message
  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.style.display = 'block';

    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  // Logout
  async function logout() {
    try {
      await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('Error logging out:', err);
    }
    window.location.href = '/login';
  }

  // Initialize
  function init() {
    settingsForm.addEventListener('submit', saveSettings);
    logoutBtn.addEventListener('click', logout);
    setupCopyButtons();
    loadSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
