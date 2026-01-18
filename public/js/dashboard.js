(function () {
  'use strict';

  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const errorMessage = document.getElementById('errorMessage');
  const qrContainer = document.getElementById('qrContainer');
  const qrCode = document.getElementById('qrCode');
  const connectedMessage = document.getElementById('connectedMessage');
  const restartBtn = document.getElementById('restartBtn');
  const regenerateQrBtn = document.getElementById('regenerateQrBtn');
  const logoutBtn = document.getElementById('logoutBtn');

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

    // Show/hide connected message
    if (status === 'READY') {
      connectedMessage.style.display = 'block';
    } else {
      connectedMessage.style.display = 'none';
    }
  }

  // Restart WhatsApp session
  async function restartSession() {
    if (!confirm('Tem certeza que deseja reiniciar a sessao do WhatsApp?')) {
      return;
    }

    restartBtn.disabled = true;
    restartBtn.textContent = 'Reiniciando...';

    try {
      const response = await fetch('/dashboard/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      alert('Erro ao reiniciar sessao');
    } finally {
      restartBtn.disabled = false;
      restartBtn.textContent = 'Reiniciar Sessao';
    }
  }

  // Regenerate QR code
  async function regenerateQr() {
    if (!confirm('Isso ira desconectar a sessao atual e gerar um novo QR Code. Continuar?')) {
      return;
    }

    regenerateQrBtn.disabled = true;
    regenerateQrBtn.textContent = 'Gerando...';

    try {
      const response = await fetch('/dashboard/regenerate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      const response = await fetch('/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      window.location.href = '/login';
    } catch (err) {
      console.error('Error logging out:', err);
      window.location.href = '/login';
    }
  }

  // Initialize
  function init() {
    // Event listeners
    restartBtn.addEventListener('click', restartSession);
    regenerateQrBtn.addEventListener('click', regenerateQr);
    logoutBtn.addEventListener('click', logout);

    // Initial fetch
    fetchStatus();

    // Start polling every 3 seconds
    pollInterval = setInterval(fetchStatus, 3000);
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (pollInterval) {
      clearInterval(pollInterval);
    }
  });

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
