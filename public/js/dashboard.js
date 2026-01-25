(function () {
  'use strict';

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const errorMessage = document.getElementById('errorMessage');
  const qrContainer = document.getElementById('qrContainer');
  const qrCode = document.getElementById('qrCode');
  const connectedMessage = document.getElementById('connectedMessage');
  const phoneInfoEl = document.getElementById('phoneInfo');
  const phoneNumberEl = document.getElementById('phoneNumber');
  const phoneNameEl = document.getElementById('phoneName');
  const restartBtn = document.getElementById('restartBtn');
  const regenerateQrBtn = document.getElementById('regenerateQrBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const pausedCount = document.getElementById('pausedCount');

  const STATUS_LABELS = {
    DISCONNECTED: 'Desconectado',
    CONNECTING: 'Conectando...',
    QR_REQUIRED: 'Aguardando QR Code',
    READY: 'Conectado',
  };

  let pollInterval = null;

  // Fetch status from server
  async function fetchStatus() {
    try {
      const response = await fetch('/dashboard/status');

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      updateUI(data);
    } catch (err) {
      console.error('Error fetching status:', err);
      statusText.textContent = 'Erro ao obter status';
      statusDot.className = 'status-dot disconnected';
    }
  }

  // Update UI based on status
  function updateUI(data) {
    const status = data.status;

    // Update status indicator
    statusDot.className = 'status-dot ' + status.toLowerCase();
    statusText.textContent = STATUS_LABELS[status] || status;

    // Show/hide error message
    if (data.lastError) {
      errorMessage.textContent = data.lastError;
      errorMessage.style.display = 'block';
    } else {
      errorMessage.style.display = 'none';
    }

    // Show/hide QR code
    if (status === 'QR_REQUIRED' && data.qrCode) {
      qrCode.src = data.qrCode;
      qrContainer.style.display = 'block';
      connectedMessage.style.display = 'none';
    } else {
      qrContainer.style.display = 'none';
    }

    // Show/hide connected message and phone info
    if (status === 'READY') {
      connectedMessage.style.display = 'block';

      // Show phone info if available
      if (data.phoneInfo) {
        phoneNumberEl.textContent = formatPhoneNumber(data.phoneInfo.number) || '-';
        phoneNameEl.textContent = data.phoneInfo.pushname || '';
        phoneInfoEl.style.display = 'block';
      } else {
        phoneInfoEl.style.display = 'none';
      }
    } else {
      connectedMessage.style.display = 'none';
      phoneInfoEl.style.display = 'none';
    }
  }

  // Format phone number for display
  function formatPhoneNumber(number) {
    if (!number) return null;
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return `+${cleaned}`;
  }

  // Restart WhatsApp session
  async function restartSession() {
    if (!confirm('Tem certeza que deseja reiniciar a sessão do WhatsApp?')) {
      return;
    }

    restartBtn.disabled = true;
    restartBtn.textContent = 'Reiniciando...';

    try {
      const response = await fetch('/dashboard/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (!data.ok) {
        alert('Erro ao reiniciar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error restarting session:', err);
      alert('Erro ao reiniciar sessão');
    } finally {
      restartBtn.disabled = false;
      restartBtn.textContent = 'Reiniciar Sessão';
    }
  }

  // Regenerate QR code
  async function regenerateQr() {
    if (!confirm('Isso irá desconectar a sessão atual e gerar um novo QR Code. Continuar?')) {
      return;
    }

    regenerateQrBtn.disabled = true;
    regenerateQrBtn.textContent = 'Gerando...';

    try {
      const response = await fetch('/dashboard/regenerate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (!data.ok) {
        alert('Erro ao gerar QR Code: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error regenerating QR:', err);
      alert('Erro ao gerar novo QR Code');
    } finally {
      regenerateQrBtn.disabled = false;
      regenerateQrBtn.textContent = 'Gerar Novo QR Code';
    }
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

  // Update badge count
  function updatePausedBadge(count) {
    if (count > 0) {
      pausedCount.textContent = count;
      pausedCount.classList.remove('hidden');
    } else {
      pausedCount.textContent = '0';
      pausedCount.classList.add('hidden');
    }
  }

  // Fetch paused contacts count for badge
  async function fetchPausedContacts() {
    try {
      const response = await fetch('/dashboard/paused-contacts');

      if (response.status === 401) return;
      if (!response.ok) throw new Error('Failed to fetch paused contacts');

      const data = await response.json();
      updatePausedBadge(data.contacts.length);
    } catch (err) {
      console.error('Error fetching paused contacts:', err);
    }
  }

  // Initialize
  function init() {
    restartBtn.addEventListener('click', restartSession);
    regenerateQrBtn.addEventListener('click', regenerateQr);
    logoutBtn.addEventListener('click', logout);

    fetchStatus();
    fetchPausedContacts();

    pollInterval = setInterval(fetchStatus, 3000);
    setInterval(fetchPausedContacts, 30000);
  }

  window.addEventListener('beforeunload', function () {
    if (pollInterval) clearInterval(pollInterval);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
