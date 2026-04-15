// ============================================================
// MONA INVEST — bank.js
// Compte courant, budget récurrent, dépenses occasionnelles
// ============================================================

(function () {
  'use strict';

  let currentProfile = null;
  let bankAccounts = [];
  let recurringItems = [];
  let occasionalExpenses = [];

  const CATEGORIES = {
    income: ['Salaire', 'Prime', 'Freelance', 'Autre revenu'],
    expense: ['Loyer', 'Crédit', 'Abonnement', 'Courses', 'Transport', 'Santé', 'Loisirs', 'Restaurant', 'Shopping', 'Autre'],
  };

  // ── DB Helpers ────────────────────────────────────────────

  function db() { return window._supabase; }

  async function loadAll(userId) {
    const [acc, rec, occ] = await Promise.all([
      db().from('bank_accounts').select('*').eq('user_id', userId).order('created_at'),
      db().from('recurring_items').select('*').eq('user_id', userId).eq('active', true).order('day_of_month'),
      db().from('occasional_expenses').select('*').eq('user_id', userId).gte('date', getFirstOfMonth()).order('date', { ascending: false }),
    ]);
    bankAccounts = acc.data || [];
    recurringItems = rec.data || [];
    occasionalExpenses = occ.data || [];
  }

  function getFirstOfMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // ── Balance Simulation ────────────────────────────────────

  function simulateMonth() {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const todayNum = today.getDate();

    // Starting balance = sum of all accounts
    let balance = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

    // Subtract recurring items already passed this month (before today)
    recurringItems.forEach(item => {
      if (item.day_of_month < todayNum) {
        balance += item.type === 'income' ? 0 : 0; // already included in current balance
      }
    });

    // Build day-by-day forecast from today
    const forecast = [];
    let runningBalance = balance;

    for (let day = todayNum; day <= daysInMonth; day++) {
      // Apply recurring items for this day
      recurringItems.forEach(item => {
        if (item.day_of_month === day) {
          runningBalance += item.type === 'income' ? item.amount : -item.amount;
        }
      });

      // Apply occasional expenses for this day (future ones entered by user)
      occasionalExpenses.forEach(exp => {
        const expDay = new Date(exp.date).getDate();
        const expMonth = new Date(exp.date).getMonth();
        if (expDay === day && expMonth === today.getMonth()) {
          runningBalance -= exp.amount;
        }
      });

      forecast.push({ day, balance: runningBalance, isToday: day === todayNum });
    }

    return { currentBalance: balance, forecast, daysInMonth, todayNum };
  }

  // ── Render ────────────────────────────────────────────────

  async function loadBankSection(profile) {
    currentProfile = profile;
    await loadAll(profile.id);
    renderBankSection();
  }

  function renderBankSection() {
    const container = document.getElementById('bank-content');
    if (!container) return;

    const totalBalance = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
    const { forecast, currentBalance } = simulateMonth();
    const endOfMonthBalance = forecast.length > 0 ? forecast[forecast.length - 1].balance : currentBalance;

    const monthlyIncome = recurringItems.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
    const monthlyExpense = recurringItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);
    const occasionalTotal = occasionalExpenses.reduce((s, e) => s + e.amount, 0);

    container.innerHTML = `
      <!-- Soldes actuels -->
      <div class="bank-accounts-grid">
        ${bankAccounts.map(acc => `
          <div class="bank-account-card">
            <div class="bank-account-header">
              <div class="bank-account-type-icon">${getAccountIcon(acc.type)}</div>
              <div class="bank-account-info">
                <div class="bank-account-name">${escapeHtml(acc.name)}</div>
                <div class="bank-account-type">${getAccountTypeLabel(acc.type)}</div>
              </div>
              <div class="bank-account-actions">
                <button class="btn-icon" onclick="Bank.openUpdateBalance('${acc.id}')" title="Mettre à jour">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon btn-icon--danger" onclick="Bank.deleteAccount('${acc.id}')" title="Supprimer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                </button>
              </div>
            </div>
            <div class="bank-account-balance mono">${formatMoney(acc.current_balance)}</div>
            <div class="bank-account-updated">Mis à jour ${formatDateTime(acc.updated_at)}</div>
          </div>
        `).join('')}
        <button class="bank-add-account-btn" onclick="Bank.openAddAccount()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter un compte
        </button>
      </div>

      <!-- Résumé du mois -->
      <div class="bank-summary-row">
        <div class="bank-summary-card">
          <div class="bank-summary-label">Solde total actuel</div>
          <div class="bank-summary-value mono ${totalBalance >= 0 ? 'positive' : 'negative'}">${formatMoney(totalBalance)}</div>
        </div>
        <div class="bank-summary-card">
          <div class="bank-summary-label">Revenus du mois</div>
          <div class="bank-summary-value mono positive">+${formatMoney(monthlyIncome)}</div>
        </div>
        <div class="bank-summary-card">
          <div class="bank-summary-label">Charges fixes</div>
          <div class="bank-summary-value mono negative">-${formatMoney(monthlyExpense)}</div>
        </div>
        <div class="bank-summary-card">
          <div class="bank-summary-label">Dépenses occasionnelles</div>
          <div class="bank-summary-value mono negative">-${formatMoney(occasionalTotal)}</div>
        </div>
        <div class="bank-summary-card highlight">
          <div class="bank-summary-label">Estimé fin de mois</div>
          <div class="bank-summary-value mono ${endOfMonthBalance >= 0 ? 'positive' : 'negative'}">${formatMoney(endOfMonthBalance)}</div>
        </div>
      </div>

      <!-- Courbe prévisionnelle -->
      <div class="bank-forecast-card">
        <div class="bank-forecast-header">
          <h3>Prévision du mois</h3>
          <span class="section-subtitle">Solde estimé jour par jour</span>
        </div>
        ${renderForecastChart(forecast)}
      </div>

      <!-- Deux colonnes : récurrents + occasionnels -->
      <div class="bank-two-col">

        <!-- Récurrents -->
        <div class="bank-col-card">
          <div class="bank-col-header">
            <h3>Revenus & Charges fixes</h3>
            <button class="btn-primary" style="padding:0.4rem 0.875rem;font-size:0.85rem" onclick="Bank.openAddRecurring()">+ Ajouter</button>
          </div>
          ${recurringItems.length === 0 ? `<p class="text-muted" style="padding:1rem 0">Aucun élément récurrent configuré.</p>` : ''}
          ${recurringItems.filter(i => i.type === 'income').length > 0 ? `
            <div class="recurring-group-label">Revenus</div>
            ${recurringItems.filter(i => i.type === 'income').map(item => renderRecurringItem(item)).join('')}
          ` : ''}
          ${recurringItems.filter(i => i.type === 'expense').length > 0 ? `
            <div class="recurring-group-label" style="margin-top:0.75rem">Charges fixes</div>
            ${recurringItems.filter(i => i.type === 'expense').map(item => renderRecurringItem(item)).join('')}
          ` : ''}
        </div>

        <!-- Occasionnels -->
        <div class="bank-col-card">
          <div class="bank-col-header">
            <h3>Dépenses occasionnelles</h3>
            <button class="btn-primary" style="padding:0.4rem 0.875rem;font-size:0.85rem" onclick="Bank.openAddOccasional()">+ Ajouter</button>
          </div>
          ${occasionalExpenses.length === 0 ? `<p class="text-muted" style="padding:1rem 0">Aucune dépense ce mois-ci.</p>` : ''}
          ${occasionalExpenses.map(exp => `
            <div class="occasional-row">
              <div class="occasional-info">
                <div class="occasional-label">${escapeHtml(exp.label)}</div>
                <div class="occasional-meta">${exp.category} · ${formatDate(exp.date)}</div>
              </div>
              <div class="occasional-amount negative mono">-${formatMoney(exp.amount)}</div>
              <button class="btn-icon btn-icon--danger" onclick="Bank.deleteOccasional('${exp.id}')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          `).join('')}
        </div>

      </div>
    `;
  }

  function renderRecurringItem(item) {
    return `
      <div class="recurring-row">
        <div class="recurring-day">${item.day_of_month}</div>
        <div class="recurring-info">
          <div class="recurring-label">${escapeHtml(item.label)}</div>
          <div class="recurring-category">${item.category}</div>
        </div>
        <div class="recurring-amount ${item.type === 'income' ? 'positive' : 'negative'} mono">
          ${item.type === 'income' ? '+' : '-'}${formatMoney(item.amount)}
        </div>
        <button class="btn-icon btn-icon--danger" onclick="Bank.deleteRecurring('${item.id}')">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
        </button>
      </div>
    `;
  }

  function renderForecastChart(forecast) {
    if (forecast.length === 0) return '<p class="text-muted">Ajoutez des comptes pour voir la prévision.</p>';

    const values = forecast.map(f => f.balance);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 1);
    const range = max - min || 1;
    const chartH = 120;
    const chartW = 100;

    const points = forecast.map((f, i) => {
      const x = (i / (forecast.length - 1 || 1)) * chartW;
      const y = chartH - ((f.balance - min) / range) * chartH;
      return `${x},${y}`;
    }).join(' ');

    const zeroY = chartH - ((0 - min) / range) * chartH;

    return `
      <div class="forecast-chart-wrap">
        <svg viewBox="0 0 100 ${chartH + 20}" preserveAspectRatio="none" class="forecast-svg">
          <!-- Zero line -->
          <line x1="0" y1="${zeroY}" x2="100" y2="${zeroY}" stroke="#333" stroke-width="0.5" stroke-dasharray="2,2"/>
          <!-- Area -->
          <polyline points="${points}" fill="none" stroke="#B87333" stroke-width="1.5"/>
          <!-- Today dot -->
          ${forecast.filter(f => f.isToday).map((f, i) => {
            const x = (forecast.indexOf(f) / (forecast.length - 1 || 1)) * chartW;
            const y = chartH - ((f.balance - min) / range) * chartH;
            return `<circle cx="${x}" cy="${y}" r="2" fill="#B87333"/>`;
          }).join('')}
        </svg>
        <div class="forecast-labels">
          <span>${forecast[0]?.day}</span>
          <span>Aujourd'hui</span>
          <span>${forecast[forecast.length - 1]?.day}</span>
        </div>
        <div class="forecast-minmax">
          <span class="text-muted" style="font-size:0.75rem">Min: <span class="mono">${formatMoney(min)}</span></span>
          <span class="text-muted" style="font-size:0.75rem">Max: <span class="mono">${formatMoney(max)}</span></span>
        </div>
      </div>
    `;
  }

  // ── Modals ────────────────────────────────────────────────

  function openAddAccount() {
    showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Ajouter un compte</h2>
        <button class="modal-close" onclick="Bank.closeModal()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-body">
        <form onsubmit="Bank.submitAddAccount(event)">
          <div class="form-group">
            <label>Nom du compte</label>
            <input type="text" name="name" placeholder="ex: Compte courant BNP" required>
          </div>
          <div class="form-group">
            <label>Type</label>
            <select name="type">
              <option value="checking">Compte courant</option>
              <option value="savings">Épargne</option>
              <option value="livret">Livret A / LDDS</option>
              <option value="other">Autre</option>
            </select>
          </div>
          <div class="form-group">
            <label>Solde actuel (€)</label>
            <input type="number" name="balance" placeholder="ex: 2500" step="0.01" required>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="Bank.closeModal()">Annuler</button>
            <button type="submit" class="btn-primary">Ajouter</button>
          </div>
        </form>
      </div>
    `);
  }

  function openUpdateBalance(accountId) {
    const acc = bankAccounts.find(a => a.id === accountId);
    if (!acc) return;
    showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Mettre à jour le solde</h2>
        <button class="modal-close" onclick="Bank.closeModal()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-body">
        <p class="modal-description">${escapeHtml(acc.name)}</p>
        <form onsubmit="Bank.submitUpdateBalance(event, '${accountId}')">
          <div class="form-group">
            <label>Nouveau solde (€)</label>
            <input type="number" name="balance" value="${acc.current_balance}" step="0.01" required autofocus>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="Bank.closeModal()">Annuler</button>
            <button type="submit" class="btn-primary">Mettre à jour</button>
          </div>
        </form>
      </div>
    `);
  }

  function openAddRecurring() {
    showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Ajouter un élément récurrent</h2>
        <button class="modal-close" onclick="Bank.closeModal()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-body">
        <form onsubmit="Bank.submitAddRecurring(event)">
          <div class="form-row">
            <div class="form-group">
              <label>Type</label>
              <select name="type" onchange="Bank.updateCategoryOptions(this)">
                <option value="income">Revenu</option>
                <option value="expense">Charge fixe</option>
              </select>
            </div>
            <div class="form-group">
              <label>Jour du mois</label>
              <input type="number" name="day" min="1" max="31" value="1" required>
            </div>
          </div>
          <div class="form-group">
            <label>Libellé</label>
            <input type="text" name="label" placeholder="ex: Salaire, Loyer, Netflix…" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant (€)</label>
              <input type="number" name="amount" placeholder="0" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Catégorie</label>
              <select name="category" id="recurring-category-select">
                <option>Salaire</option>
                <option>Prime</option>
                <option>Freelance</option>
                <option>Autre revenu</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="Bank.closeModal()">Annuler</button>
            <button type="submit" class="btn-primary">Ajouter</button>
          </div>
        </form>
      </div>
    `);
  }

  function openAddOccasional() {
    showModal(`
      <div class="modal-header">
        <h2 class="modal-title">Ajouter une dépense</h2>
        <button class="modal-close" onclick="Bank.closeModal()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
      </div>
      <div class="modal-body">
        <form onsubmit="Bank.submitAddOccasional(event)">
          <div class="form-group">
            <label>Libellé</label>
            <input type="text" name="label" placeholder="ex: Restaurant, Vêtements, Cadeau…" required autofocus>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Montant (€)</label>
              <input type="number" name="amount" placeholder="0" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Date</label>
              <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}">
            </div>
          </div>
          <div class="form-group">
            <label>Catégorie</label>
            <select name="category">
              ${CATEGORIES.expense.map(c => `<option>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="Bank.closeModal()">Annuler</button>
            <button type="submit" class="btn-primary">Ajouter</button>
          </div>
        </form>
      </div>
    `);
  }

  // ── Submit handlers ───────────────────────────────────────

  async function submitAddAccount(e) {
    e.preventDefault();
    const f = e.target;
    const { data, error } = await db().from('bank_accounts').insert({
      user_id: currentProfile.id,
      name: f.name.value.trim(),
      type: f.type.value,
      current_balance: parseFloat(f.balance.value),
    }).select().single();
    if (error) { alert(error.message); return; }
    bankAccounts.push(data);
    closeModal();
    renderBankSection();
  }

  async function submitUpdateBalance(e, accountId) {
    e.preventDefault();
    const newBalance = parseFloat(e.target.balance.value);
    const { data, error } = await db().from('bank_accounts').update({
      current_balance: newBalance, updated_at: new Date().toISOString()
    }).eq('id', accountId).eq('user_id', currentProfile.id).select().single();
    if (error) { alert(error.message); return; }
    const idx = bankAccounts.findIndex(a => a.id === accountId);
    if (idx !== -1) bankAccounts[idx] = data;
    closeModal();
    renderBankSection();
  }

  async function submitAddRecurring(e) {
    e.preventDefault();
    const f = e.target;
    const { data, error } = await db().from('recurring_items').insert({
      user_id: currentProfile.id,
      type: f.type.value,
      label: f.label.value.trim(),
      amount: parseFloat(f.amount.value),
      day_of_month: parseInt(f.day.value),
      category: f.category.value,
    }).select().single();
    if (error) { alert(error.message); return; }
    recurringItems.push(data);
    recurringItems.sort((a, b) => a.day_of_month - b.day_of_month);
    closeModal();
    renderBankSection();
  }

  async function submitAddOccasional(e) {
    e.preventDefault();
    const f = e.target;
    const { data, error } = await db().from('occasional_expenses').insert({
      user_id: currentProfile.id,
      label: f.label.value.trim(),
      amount: parseFloat(f.amount.value),
      date: f.date.value,
      category: f.category.value,
    }).select().single();
    if (error) { alert(error.message); return; }
    occasionalExpenses.unshift(data);
    closeModal();
    renderBankSection();
  }

  async function deleteAccount(id) {
    if (!confirm('Supprimer ce compte ?')) return;
    await db().from('bank_accounts').delete().eq('id', id).eq('user_id', currentProfile.id);
    bankAccounts = bankAccounts.filter(a => a.id !== id);
    renderBankSection();
  }

  async function deleteRecurring(id) {
    await db().from('recurring_items').delete().eq('id', id).eq('user_id', currentProfile.id);
    recurringItems = recurringItems.filter(i => i.id !== id);
    renderBankSection();
  }

  async function deleteOccasional(id) {
    await db().from('occasional_expenses').delete().eq('id', id).eq('user_id', currentProfile.id);
    occasionalExpenses = occasionalExpenses.filter(e => e.id !== id);
    renderBankSection();
  }

  function updateCategoryOptions(select) {
    const catSelect = document.getElementById('recurring-category-select');
    if (!catSelect) return;
    const cats = select.value === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    catSelect.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
  }

  // ── Modal helpers ─────────────────────────────────────────

  function showModal(html) {
    const modal = document.getElementById('modal-bank');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;
    modal.innerHTML = html;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  }

  function closeModal() {
    const modal = document.getElementById('modal-bank');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) { overlay.classList.add('hidden'); overlay.onclick = null; }
  }

  // ── Getters for Dashboard ─────────────────────────────────

  function getTotalBankBalance() {
    return bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  }

  // ── Helpers ───────────────────────────────────────────────

  function formatMoney(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  function formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
  }

  function getAccountIcon(type) {
    const icons = {
      checking: '🏦',
      savings: '💰',
      livret: '📗',
      other: '💳',
    };
    return icons[type] || '💳';
  }

  function getAccountTypeLabel(type) {
    const labels = {
      checking: 'Compte courant',
      savings: 'Épargne',
      livret: 'Livret',
      other: 'Autre',
    };
    return labels[type] || 'Compte';
  }

  // ── Public API ────────────────────────────────────────────
  window.Bank = {
    loadBankSection,
    renderBankSection,
    openAddAccount,
    openUpdateBalance,
    openAddRecurring,
    openAddOccasional,
    submitAddAccount,
    submitUpdateBalance,
    submitAddRecurring,
    submitAddOccasional,
    deleteAccount,
    deleteRecurring,
    deleteOccasional,
    updateCategoryOptions,
    closeModal,
    getTotalBankBalance,
    setProfile: (p) => { currentProfile = p; },
  };
})();
