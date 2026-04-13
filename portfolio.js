// ============================================================
// MONA INVEST — portfolio.js
// Portfolio Management Module (CRUD Positions)
// ============================================================

(function () {
  'use strict';

  const { FREE_POSITIONS_LIMIT } = window.APP_CONFIG;

  let currentProfile = null;
  let allPositions = [];
  let currentPlatform = 'pea';
  let editingPositionId = null;

  // ── Load & Render ─────────────────────────────────────────────

  async function loadPortfolio(profile) {
    currentProfile = profile;
    try {
      allPositions = await DB.getPositions(profile.id);
      renderPortfolio();
      updatePortfolioSummary();
    } catch (err) {
      console.error('Error loading portfolio:', err);
    }
  }

  function renderPortfolio() {
    renderPlatformPositions(currentPlatform);
    updatePlatformTabs();
  }

  function renderPlatformPositions(platform) {
    currentPlatform = platform;
    const container = document.getElementById('positions-list');
    if (!container) return;

    const positions = allPositions.filter(p => p.platform === platform);

    if (positions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="1.5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          <p>Aucune position sur ${platform.toUpperCase()}</p>
          <button class="btn-primary" onclick="Portfolio.openAddModal()">Ajouter ma première position</button>
        </div>
      `;
      return;
    }

    container.innerHTML = positions.map(pos => createPositionRow(pos)).join('');
  }

  function createPositionRow(pos) {
    const invested = pos.quantity * pos.buy_price;
    const currentPrice = pos.current_price || pos.buy_price;
    const currentValue = pos.quantity * currentPrice;
    const pnl = currentValue - invested;
    const pnlPct = invested > 0 ? ((pnl / invested) * 100) : 0;
    const pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
    const pnlSign = pnl >= 0 ? '+' : '';

    return `
      <div class="position-row" data-id="${pos.id}">
        <div class="position-info">
          <div class="position-ticker">${escapeHtml(pos.ticker)}</div>
          <div class="position-name">${escapeHtml(pos.name)}</div>
          <div class="position-date">${pos.buy_date ? formatDate(pos.buy_date) : '—'}</div>
        </div>
        <div class="position-numbers">
          <div class="position-qty">
            <span class="label">Qté</span>
            <span class="value">${formatNum(pos.quantity)}</span>
          </div>
          <div class="position-buy">
            <span class="label">Prix achat</span>
            <span class="value mono">${formatMoney(pos.buy_price)}</span>
          </div>
          <div class="position-current">
            <span class="label">Prix actuel</span>
            <span class="value mono">${formatMoney(currentPrice)}</span>
          </div>
          <div class="position-invested">
            <span class="label">Investi</span>
            <span class="value mono">${formatMoney(invested)}</span>
          </div>
          <div class="position-value">
            <span class="label">Valeur</span>
            <span class="value mono">${formatMoney(currentValue)}</span>
          </div>
          <div class="position-pnl ${pnlClass}">
            <span class="label">P&L</span>
            <span class="value mono">${pnlSign}${formatMoney(pnl)} (${pnlSign}${pnlPct.toFixed(2)}%)</span>
          </div>
        </div>
        <div class="position-actions">
          <button class="btn-icon" onclick="Portfolio.openEditModal('${pos.id}')" title="Modifier">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon--danger" onclick="Portfolio.deletePositionConfirm('${pos.id}')" title="Supprimer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `;
  }

  function updatePortfolioSummary() {
    const totalInvested = allPositions.reduce((sum, p) => sum + (p.quantity * p.buy_price), 0);
    const totalValue = allPositions.reduce((sum, p) => {
      const price = p.current_price || p.buy_price;
      return sum + (p.quantity * price);
    }, 0);
    const totalPnl = totalValue - totalInvested;
    const totalPnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100) : 0;

    const peaPositions = allPositions.filter(p => p.platform === 'pea');
    const etoroPositions = allPositions.filter(p => p.platform === 'etoro');

    const peaValue = peaPositions.reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);
    const etoroValue = etoroPositions.reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);

    setEl('portfolio-total-invested', formatMoney(totalInvested));
    setEl('portfolio-total-value', formatMoney(totalValue));
    setEl('portfolio-total-pnl', `${totalPnl >= 0 ? '+' : ''}${formatMoney(totalPnl)} (${totalPnl >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%)`);
    setEl('portfolio-pea-value', formatMoney(peaValue));
    setEl('portfolio-etoro-value', formatMoney(etoroValue));
    setEl('portfolio-count', `${allPositions.length} position${allPositions.length !== 1 ? 's' : ''}`);

    const pnlEl = document.getElementById('portfolio-total-pnl');
    if (pnlEl) pnlEl.className = `summary-value mono ${totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative'}`;

    // Position limit indicator for free users
    const limitEl = document.getElementById('position-limit-info');
    if (limitEl) {
      if (currentProfile?.plan !== 'pro') {
        limitEl.textContent = `${allPositions.length}/${FREE_POSITIONS_LIMIT} positions`;
        limitEl.classList.remove('hidden');
      } else {
        limitEl.classList.add('hidden');
      }
    }
  }

  function updatePlatformTabs() {
    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.platform === currentPlatform);
    });
  }

  // ── Add / Edit Modal ──────────────────────────────────────────

  function openAddModal() {
    // Check position limit for free users
    if (currentProfile?.plan !== 'pro' && allPositions.length >= FREE_POSITIONS_LIMIT) {
      showProModal('Vous avez atteint la limite de 5 positions en version gratuite.');
      return;
    }

    editingPositionId = null;
    showPositionModal({
      platform: currentPlatform,
      ticker: '',
      name: '',
      quantity: '',
      buy_price: '',
      current_price: '',
      buy_date: new Date().toISOString().split('T')[0],
    }, 'Ajouter une position');
  }

  function openEditModal(positionId) {
    const pos = allPositions.find(p => p.id === positionId);
    if (!pos) return;
    editingPositionId = positionId;
    showPositionModal(pos, 'Modifier la position');
  }

  function showPositionModal(pos, title) {
    const modal = document.getElementById('modal-position');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    modal.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" onclick="Portfolio.closeModal()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <form id="position-form" onsubmit="Portfolio.submitPosition(event)">
          <div class="form-row">
            <div class="form-group">
              <label>Plateforme</label>
              <select name="platform" required>
                <option value="pea" ${pos.platform === 'pea' ? 'selected' : ''}>PEA</option>
                <option value="etoro" ${pos.platform === 'etoro' ? 'selected' : ''}>eToro</option>
              </select>
            </div>
            <div class="form-group">
              <label>Ticker / Symbole</label>
              <input type="text" name="ticker" value="${escapeHtml(pos.ticker || '')}" placeholder="ex: TTE, MSFT" required>
            </div>
          </div>
          <div class="form-group">
            <label>Nom de l'entreprise</label>
            <input type="text" name="name" value="${escapeHtml(pos.name || '')}" placeholder="ex: TotalEnergies" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Quantité</label>
              <input type="number" name="quantity" value="${pos.quantity || ''}" placeholder="0" step="0.001" min="0" required>
            </div>
            <div class="form-group">
              <label>Prix d'achat (€/$)</label>
              <input type="number" name="buy_price" value="${pos.buy_price || ''}" placeholder="0.00" step="0.01" min="0" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Prix actuel (€/$) <span class="optional">facultatif</span></label>
              <input type="number" name="current_price" value="${pos.current_price || ''}" placeholder="0.00" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Date d'achat</label>
              <input type="date" name="buy_date" value="${pos.buy_date || ''}">
            </div>
          </div>
          <div id="position-form-error" class="form-error hidden"></div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="Portfolio.closeModal()">Annuler</button>
            <button type="submit" class="btn-primary">
              ${editingPositionId ? 'Enregistrer' : 'Ajouter la position'}
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  }

  async function submitPosition(event) {
    event.preventDefault();
    const form = event.target;
    const errEl = document.getElementById('position-form-error');
    const submitBtn = form.querySelector('button[type="submit"]');

    const data = {
      platform: form.platform.value,
      ticker: form.ticker.value.trim().toUpperCase(),
      name: form.name.value.trim(),
      quantity: parseFloat(form.quantity.value),
      buy_price: parseFloat(form.buy_price.value),
      current_price: form.current_price.value ? parseFloat(form.current_price.value) : null,
      buy_date: form.buy_date.value || null,
    };

    if (data.quantity <= 0 || data.buy_price <= 0) {
      errEl.textContent = 'La quantité et le prix doivent être supérieurs à 0.';
      errEl.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enregistrement…';

    try {
      if (editingPositionId) {
        const updated = await DB.updatePosition(editingPositionId, currentProfile.id, data);
        const idx = allPositions.findIndex(p => p.id === editingPositionId);
        if (idx !== -1) allPositions[idx] = updated;
      } else {
        const added = await DB.addPosition(currentProfile.id, data);
        allPositions.unshift(added);
      }

      closeModal();
      renderPortfolio();
      updatePortfolioSummary();

      // Update dashboard stats if visible
      if (window.App && window.App.updateDashboard) {
        window.App.updateDashboard();
      }
    } catch (err) {
      errEl.textContent = err.message || 'Erreur lors de l\'enregistrement.';
      errEl.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = editingPositionId ? 'Enregistrer' : 'Ajouter la position';
    }
  }

  async function deletePositionConfirm(positionId) {
    if (!confirm('Supprimer cette position ?')) return;

    try {
      await DB.deletePosition(positionId, currentProfile.id);
      allPositions = allPositions.filter(p => p.id !== positionId);
      renderPortfolio();
      updatePortfolioSummary();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Erreur lors de la suppression : ' + err.message);
    }
  }

  function closeModal() {
    const modal = document.getElementById('modal-position');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.onclick = null;
    }
    editingPositionId = null;
  }

  // ── Pro Modal ─────────────────────────────────────────────────

  function showProModal(message) {
    if (window.App && window.App.showProModal) {
      window.App.showProModal(message);
    }
  }

  // ── Public Getters ────────────────────────────────────────────

  function getAllPositions() { return allPositions; }
  function getTotalWealth() {
    return allPositions.reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);
  }
  function getPlatformValue(platform) {
    return allPositions
      .filter(p => p.platform === platform)
      .reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);
  }

  // ── Helpers ───────────────────────────────────────────────────

  function formatMoney(n) {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
  }

  function formatNum(n) {
    if (n === null || n === undefined) return '—';
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(n);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text)));
    return div.innerHTML;
  }

  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── Init ──────────────────────────────────────────────────────

  function initPortfolioSection() {
    // Platform tabs
    document.querySelectorAll('.platform-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentPlatform = tab.dataset.platform;
        updatePlatformTabs();
        renderPlatformPositions(currentPlatform);
      });
    });

    // Add position button
    const addBtn = document.getElementById('add-position-btn');
    if (addBtn) addBtn.addEventListener('click', openAddModal);
  }

  // ── Public API ────────────────────────────────────────────────
  window.Portfolio = {
    loadPortfolio,
    renderPortfolio,
    initPortfolioSection,
    openAddModal,
    openEditModal,
    closeModal,
    submitPosition,
    deletePositionConfirm,
    getAllPositions,
    getTotalWealth,
    getPlatformValue,
    setProfile: (profile) => { currentProfile = profile; },
  };
})();
