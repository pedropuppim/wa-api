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
  const pausedList = document.getElementById('pausedList');

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

  // Fetch paused contacts
  async function fetchPausedContacts() {
    try {
      const response = await fetch('/dashboard/paused-contacts');

      if (response.status === 401) {
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch paused contacts');
      }

      const data = await response.json();
      renderPausedContacts(data.contacts);
    } catch (err) {
      console.error('Error fetching paused contacts:', err);
    }
  }

  // Render paused contacts list
  function renderPausedContacts(contacts) {
    if (!contacts || contacts.length === 0) {
      pausedList.innerHTML = '<p class="empty-message">Nenhuma conversa pausada</p>';
      return;
    }

    const html = contacts.map((contact) => {
      const expiresAt = new Date(contact.expiresAt);
      const localDatetime = formatDatetimeLocal(expiresAt);
      const remainingText = formatRemaining(contact.remainingMs);

      return `
        <div class="paused-item" data-chat-id="${contact.chatId}">
          <div class="paused-info">
            <div class="paused-number">${contact.number}${contact.isGroup ? ' (Grupo)' : ''}</div>
            <div class="paused-time">Expira em: ${remainingText}</div>
          </div>
          <div class="paused-actions">
            <input type="datetime-local" class="paused-datetime" value="${localDatetime}">
            <button class="btn btn-small btn-primary btn-update-pause">Salvar</button>
            <button class="btn btn-small btn-danger btn-remove-pause">Remover</button>
          </div>
        </div>
      `;
    }).join('');

    pausedList.innerHTML = html;

    // Add event listeners
    pausedList.querySelectorAll('.paused-item').forEach((item) => {
      const chatId = item.dataset.chatId;
      const datetimeInput = item.querySelector('.paused-datetime');
      const updateBtn = item.querySelector('.btn-update-pause');
      const removeBtn = item.querySelector('.btn-remove-pause');

      updateBtn.addEventListener('click', () => updatePause(chatId, datetimeInput.value));
      removeBtn.addEventListener('click', () => removePause(chatId));
    });
  }

  // Format datetime for input
  function formatDatetimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  // Format remaining time
  function formatRemaining(ms) {
    if (ms <= 0) return 'Expirado';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  }

  // Update pause expiration
  async function updatePause(chatId, datetime) {
    try {
      const expiresAt = new Date(datetime).toISOString();

      const response = await fetch(`/dashboard/paused-contacts/${encodeURIComponent(chatId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresAt }),
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.ok) {
        fetchPausedContacts();
      } else {
        alert('Erro ao atualizar: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating pause:', err);
      alert('Erro ao atualizar pausa');
    }
  }

  // Remove pause (resume webhook)
  async function removePause(chatId) {
    if (!confirm('Remover pausa e reativar webhook para este contato?')) {
      return;
    }

    try {
      const response = await fetch(`/dashboard/paused-contacts/${encodeURIComponent(chatId)}`, {
        method: 'DELETE',
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.ok) {
        fetchPausedContacts();
      } else {
        alert('Erro ao remover: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error removing pause:', err);
      alert('Erro ao remover pausa');
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
    fetchPausedContacts();

    // Start polling every 3 seconds for status, every 10 seconds for paused contacts
    pollInterval = setInterval(fetchStatus, 3000);
    setInterval(fetchPausedContacts, 10000);
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
