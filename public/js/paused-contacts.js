(function () {
  'use strict';

  const pausedList = document.getElementById('pausedList');
  const logoutBtn = document.getElementById('logoutBtn');
  const message = document.getElementById('message');

  // Fetch paused contacts
  async function fetchPausedContacts() {
    try {
      const response = await fetch('/dashboard/paused-contacts');

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch paused contacts');

      const data = await response.json();
      renderPausedContacts(data.contacts);
    } catch (err) {
      console.error('Error fetching paused contacts:', err);
      pausedList.innerHTML = '<p class="empty-message">Erro ao carregar conversas pausadas</p>';
      showMessage('Erro ao carregar conversas pausadas', 'error');
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

    pausedList.querySelectorAll('.paused-item').forEach((item) => {
      const chatId = item.dataset.chatId;
      const datetimeInput = item.querySelector('.paused-datetime');
      const updateBtn = item.querySelector('.btn-update-pause');
      const removeBtn = item.querySelector('.btn-remove-pause');

      updateBtn.addEventListener('click', () => updatePause(chatId, datetimeInput.value));
      removeBtn.addEventListener('click', () => removePause(chatId));
    });
  }

  function formatDatetimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatRemaining(ms) {
    if (ms <= 0) return 'Expirado';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  }

  async function updatePause(chatId, datetime) {
    try {
      const expiresAt = new Date(datetime).toISOString();

      const response = await fetch(`/dashboard/paused-contacts/${encodeURIComponent(chatId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt }),
      });

      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.ok) {
        showMessage('Pausa atualizada com sucesso', 'success');
        fetchPausedContacts();
      } else {
        showMessage('Erro ao atualizar: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Error updating pause:', err);
      showMessage('Erro ao atualizar pausa', 'error');
    }
  }

  async function removePause(chatId) {
    if (!confirm('Remover pausa e reativar webhook para este contato?')) return;

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
        showMessage('Pausa removida com sucesso', 'success');
        fetchPausedContacts();
      } else {
        showMessage('Erro ao remover: ' + (data.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Error removing pause:', err);
      showMessage('Erro ao remover pausa', 'error');
    }
  }

  function showMessage(text, type = 'info') {
    message.textContent = text;
    message.className = `message message-${type}`;
    message.style.display = 'block';

    setTimeout(() => {
      message.style.display = 'none';
    }, 5000);
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
    logoutBtn.addEventListener('click', logout);
    fetchPausedContacts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();