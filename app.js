// ============================================================
// MONA INVEST — app.js
// Main Application Controller
// ============================================================

(function () {
  'use strict';

  let currentUser = null;
  let currentProfile = null;
  let currentSection = 'feed';

  // ── Ad Banner ─────────────────────────────────────────────────

  const ADS = [
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
      title: 'N26 Pro — Banque premium en ligne',
      desc: 'Ouvrez un compte bancaire premium en 8 minutes. Cashback illimité.',
      cta: 'Ouvrir un compte',
      url: '#',
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A3590" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
      title: 'DEGIRO — Investissez sans frais',
      desc: 'Les frais de courtage les plus bas d\'Europe. 0€ sur les ETF.',
      cta: 'Commencer',
      url: '#',
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7A8F62" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
      title: 'Trade Republic — 4% d\'intérêt',
      desc: 'Épargne automatique au meilleur taux. Investissez dès 1€.',
      cta: 'Découvrir',
      url: '#',
    },
  ];

  let adIndex = 0;
  let adInterval = null;

  function initAdBanner(profile) {
    const banner = document.getElementById('ad-banner');
    if (!banner) return;

    if (profile?.plan === 'pro') {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');
    renderAd();

    // Rotate every 10 seconds
    if (adInterval) clearInterval(adInterval);
    adInterval = setInterval(() => {
      adIndex = (adIndex + 1) % ADS.length;
      renderAd();
    }, 10000);
  }

  function renderAd() {
    const ad = ADS[adIndex];
    const iconEl = document.getElementById('ad-icon');
    const titleEl = document.getElementById('ad-title');
    const descEl = document.getElementById('ad-desc');
    const ctaEl = document.getElementById('ad-cta');

    if (iconEl) iconEl.innerHTML = ad.icon;
    if (titleEl) titleEl.textContent = ad.title;
    if (descEl) descEl.textContent = ad.desc;
    if (ctaEl) ctaEl.textContent = ad.cta;
  }

  // ── Section Navigation ────────────────────────────────────────

  function navigate(section) {
    currentSection = section;

    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));

    // Show target section
    const target = document.getElementById(`section-${section}`);
    if (target) target.classList.remove('hidden');

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Load section data on demand
    if (currentProfile) {
      switch (section) {
        case 'feed':
          if (!document.querySelector('.feed-card:not(.feed-skeleton)')) {
            Feed.loadFeed(currentProfile);
          }
          break;
        case 'dashboard':
          renderDashboard();
          break;
        case 'calendar':
          renderCalendar();
          break;
        case 'chat':
          Chat.loadChatHistory(currentProfile);
          break;
        case 'portfolio':
          Portfolio.loadPortfolio(currentProfile);
          break;
        case 'bank':
          Bank.loadBankSection(currentProfile);
          break;
      }
    }

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar && window.innerWidth < 768) {
      sidebar.classList.remove('open');
      document.getElementById('sidebar-overlay')?.classList.add('hidden');
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────

  function renderDashboard() {
    if (!currentProfile) return;

    const positions = Portfolio.getAllPositions ? Portfolio.getAllPositions() : [];
    const totalWealth = positions.reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);
    const totalInvested = positions.reduce((s, p) => s + p.quantity * p.buy_price, 0);
    const pnl = totalWealth - totalInvested;
    const pnlPct = totalInvested > 0 ? ((pnl / totalInvested) * 100) : 0;

    const peaValue = positions.filter(p => p.platform === 'pea')
      .reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);
    const etoroValue = positions.filter(p => p.platform === 'etoro')
      .reduce((s, p) => s + p.quantity * (p.current_price || p.buy_price), 0);

    setEl('dash-total-wealth', formatMoney(totalWealth));
    setEl('dash-pnl', `${pnl >= 0 ? '+' : ''}${formatMoney(pnl)} (${pnl >= 0 ? '+' : ''}${pnlPct.toFixed(2)}% YTD)`);
    setEl('dash-pea-value', formatMoney(peaValue));
    setEl('dash-etoro-value', formatMoney(etoroValue));

    const pnlEl = document.getElementById('dash-pnl');
    if (pnlEl) pnlEl.className = `dash-pnl ${pnl >= 0 ? 'positive' : 'negative'}`;

    // Risk gauge (simplified: crypto/stocks ratio)
    renderRiskGauge(positions);

    // Wealth bar chart
    renderWealthBar(peaValue, etoroValue, totalWealth);

    // Goals
    renderGoalsProgress();

    // Monthly budget
    renderMonthlyBudget();

    // Current date
    const dateEl = document.getElementById('dashboard-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  }

  function renderRiskGauge(positions) {
    const gaugeEl = document.getElementById('risk-gauge-fill');
    const riskLabel = document.getElementById('risk-label');
    if (!gaugeEl) return;

    // Simple risk calculation: more diversified = lower risk
    const count = positions.length;
    let riskScore = 50; // default medium

    if (count === 0) riskScore = 0;
    else if (count >= 10) riskScore = 30;
    else if (count >= 5) riskScore = 45;
    else if (count >= 3) riskScore = 55;
    else riskScore = 70;

    // eToro presence (more risk due to crypto potential)
    const hasEtoro = positions.some(p => p.platform === 'etoro');
    if (hasEtoro) riskScore = Math.min(100, riskScore + 10);

    gaugeEl.style.width = `${riskScore}%`;

    let riskText, riskColor;
    if (riskScore < 30) { riskText = 'Faible'; riskColor = '#7A8F62'; }
    else if (riskScore < 60) { riskText = 'Modéré'; riskColor = '#B87333'; }
    else { riskText = 'Élevé'; riskColor = '#E05252'; }

    gaugeEl.style.background = riskColor;
    if (riskLabel) { riskLabel.textContent = riskText; riskLabel.style.color = riskColor; }
  }

  function renderWealthBar(peaValue, etoroValue, total) {
    const peaBar = document.getElementById('pea-bar');
    const etoroBar = document.getElementById('etoro-bar');
    if (!peaBar || !etoroBar || total <= 0) return;

    const peaPct = total > 0 ? (peaValue / total * 100) : 50;
    const etoroPct = 100 - peaPct;

    peaBar.style.width = `${peaPct}%`;
    etoroBar.style.width = `${etoroPct}%`;

    setEl('pea-pct', `${peaPct.toFixed(0)}%`);
    setEl('etoro-pct', `${etoroPct.toFixed(0)}%`);
  }

  function renderGoalsProgress() {
    const goals = currentProfile?.goals || [];
    const goalsEl = document.getElementById('dash-goals');
    if (!goalsEl) return;

    if (goals.length === 0) {
      goalsEl.innerHTML = '<p class="text-muted">Aucun objectif défini.</p>';
      return;
    }

    const goalLabels = {
      'financial_freedom': 'Liberté financière',
      'real_estate': 'Achat immobilier',
      'travel': 'Voyages',
      'early_retirement': 'Retraite anticipée',
      'business': 'Créer une entreprise',
      'passive_income': 'Revenus passifs',
    };

    goalsEl.innerHTML = goals.slice(0, 2).map(goal => `
      <div class="goal-item">
        <span class="goal-name">${goalLabels[goal] || goal}</span>
        <div class="goal-chip">En cours</div>
      </div>
    `).join('');
  }

  function renderMonthlyBudget() {
    const mode = currentProfile?.investment_mode || 'balanced';
    const budget = currentProfile?.monthly_budget || 300;
    const modeLabels = { chill: 'Chill', balanced: 'Équilibré', ambitious: 'Ambitieux' };

    setEl('dash-mode-label', modeLabels[mode] || 'Équilibré');
    setEl('dash-monthly-budget', `${budget}€`);

    // Calculate what to do this month
    const invested = getMonthlyInvested();
    const remaining = Math.max(0, budget - invested);
    setEl('dash-remaining', `${remaining}€ restants à investir`);
  }

  function getMonthlyInvested() {
    const positions = Portfolio.getAllPositions ? Portfolio.getAllPositions() : [];
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7); // YYYY-MM
    return positions
      .filter(p => p.buy_date && p.buy_date.startsWith(thisMonth))
      .reduce((s, p) => s + p.quantity * p.buy_price, 0);
  }

  // ── Calendar (Dividendes) ────────────────────────────────────

  function renderCalendar() {
    if (!currentProfile) return;
    const positions = Portfolio.getAllPositions ? Portfolio.getAllPositions() : [];
    const container = document.getElementById('calendar-list');
    const totalEl = document.getElementById('calendar-total');

    if (!container) return;

    if (positions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>Ajoutez des positions dans votre portefeuille pour voir vos dividendes à venir.</p>
          <button class="btn-primary" onclick="App.navigate('portfolio')">Voir le portefeuille</button>
        </div>
      `;
      if (totalEl) totalEl.textContent = '0,00 €';
      return;
    }

    // Generate mock dividend data based on positions
    const today = new Date();
    const dividends = generateMockDividends(positions, today);

    if (dividends.length === 0) {
      container.innerHTML = `<p class="text-muted">Aucun dividende imminent détecté pour vos positions actuelles.</p>`;
      if (totalEl) totalEl.textContent = '0,00 €';
      return;
    }

    const totalAmount = dividends.reduce((s, d) => s + d.amount, 0);
    if (totalEl) totalEl.textContent = formatMoney(totalAmount);

    container.innerHTML = dividends.map(d => `
      <div class="dividend-row ${d.isNext ? 'next-month' : ''}">
        <div class="dividend-info">
          <div class="dividend-ticker">${escapeHtml(d.ticker)}</div>
          <div class="dividend-name">${escapeHtml(d.name)}</div>
          <div class="dividend-platform platform-badge platform-badge--${d.platform}">${d.platform.toUpperCase()}</div>
        </div>
        <div class="dividend-details">
          <div class="dividend-date">${formatDate(d.date)}</div>
          <div class="dividend-amount mono">${formatMoney(d.amount)}</div>
        </div>
      </div>
    `).join('');
  }

  function generateMockDividends(positions, today) {
    const dividends = [];
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    positions.forEach(pos => {
      // Assign a mock annual yield (2-5%) and estimate dividend
      const yieldRate = 0.02 + Math.random() * 0.03;
      const currentValue = pos.quantity * (pos.current_price || pos.buy_price);
      const annualDiv = currentValue * yieldRate;
      const quarterlyDiv = annualDiv / 4;

      if (quarterlyDiv < 1) return; // Skip tiny dividends

      // Random payment date in current or next month
      const daysOffset = Math.floor(Math.random() * 45) + 5;
      const payDate = new Date(today.getTime() + daysOffset * 24 * 60 * 60 * 1000);
      const isNext = payDate.getMonth() !== today.getMonth();

      dividends.push({
        ticker: pos.ticker,
        name: pos.name,
        platform: pos.platform,
        date: payDate.toISOString().split('T')[0],
        amount: Math.round(quarterlyDiv * 100) / 100,
        isNext,
      });
    });

    return dividends.sort((a, b) => a.date.localeCompare(b.date));
  }

  // ── Onboarding ────────────────────────────────────────────────

  let onboardingStep = 1;
  const onboardingData = {};

  function showOnboarding() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
    goToStep(1);
  }

  function goToStep(step) {
    onboardingStep = step;
    document.querySelectorAll('.onboarding-step').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`onboarding-step-${step}`);
    if (target) target.classList.remove('hidden');

    // Update progress dots
    document.querySelectorAll('.progress-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i + 1 === step);
      dot.classList.toggle('done', i + 1 < step);
    });

    // Update progress bar
    const progressBar = document.getElementById('onboarding-progress-bar');
    if (progressBar) progressBar.style.width = `${((step - 1) / 2) * 100}%`;
  }

  function initOnboarding() {
    // Step 1 — Financial checkup
    document.getElementById('onboarding-next-1')?.addEventListener('click', () => {
      const income = parseFloat(document.getElementById('ob-income')?.value) || 0;
      const fixed = parseFloat(document.getElementById('ob-fixed')?.value) || 0;
      const variable = parseFloat(document.getElementById('ob-variable')?.value) || 0;
      const savings = parseFloat(document.getElementById('ob-savings')?.value) || 0;

      onboardingData.income = income;
      onboardingData.fixed_expenses = fixed;
      onboardingData.variable_expenses = variable;
      onboardingData.savings_buffer = savings;

      const investable = Math.max(0, income - fixed - variable);
      document.getElementById('ob-investable').textContent = `${investable}€/mois`;

      goToStep(2);
    });

    // Step 2 — Investment mode
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        onboardingData.investment_mode = card.dataset.mode;
        onboardingData.monthly_budget = parseInt(card.dataset.budget, 10);
      });
    });

    document.getElementById('onboarding-next-2')?.addEventListener('click', () => {
      if (!onboardingData.investment_mode) {
        // Default to balanced
        onboardingData.investment_mode = 'balanced';
        onboardingData.monthly_budget = 300;
        document.querySelector('.mode-card[data-mode="balanced"]')?.classList.add('selected');
      }
      goToStep(3);
    });

    // Step 3 — Goals
    document.querySelectorAll('.goal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('selected');
      });
    });

    document.getElementById('onboarding-finish')?.addEventListener('click', async () => {
      const selectedGoals = Array.from(document.querySelectorAll('.goal-btn.selected'))
        .map(btn => btn.dataset.goal);

      onboardingData.goals = selectedGoals;
      onboardingData.onboarding_completed = true;

      const finishBtn = document.getElementById('onboarding-finish');
      if (finishBtn) {
        finishBtn.disabled = true;
        finishBtn.textContent = 'Enregistrement…';
      }

      try {
        const updated = await DB.updateProfile(currentUser.id, onboardingData);
        currentProfile = { ...currentProfile, ...updated };
        startApp();
      } catch (err) {
        console.error('Onboarding save error:', err);
        if (finishBtn) {
          finishBtn.disabled = false;
          finishBtn.textContent = 'Commencer →';
        }
      }
    });
  }

  // ── Profile Edit Modal ────────────────────────────────────────

  function openProfileModal() {
    if (!currentProfile) return;
    const modal = document.getElementById('modal-profile');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    // Pre-fill inputs
    setValue('pf-income',   currentProfile.income            || '');
    setValue('pf-fixed',    currentProfile.fixed_expenses    || '');
    setValue('pf-variable', currentProfile.variable_expenses || '');
    setValue('pf-savings',  currentProfile.savings_buffer    || '');
    setValue('pf-budget',   currentProfile.monthly_budget    || 300);

    // Investment mode
    const mode = currentProfile.investment_mode || 'balanced';
    const modeRadio = document.querySelector(`input[name="pf-mode"][value="${mode}"]`);
    if (modeRadio) modeRadio.checked = true;

    // Goals
    const goals = currentProfile.goals || [];
    document.querySelectorAll('#pf-goals-grid input[type="checkbox"]').forEach(cb => {
      cb.checked = goals.includes(cb.value);
    });

    // Update investable preview
    updateInvestablePreview();

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.onclick = (e) => { if (e.target === overlay) closeProfileModal(); };
  }

  function closeProfileModal() {
    document.getElementById('modal-profile')?.classList.add('hidden');
    const overlay = document.getElementById('modal-overlay');
    // Only hide overlay if all modals are hidden
    const anyOpen = document.querySelector('#modal-overlay .modal:not(.hidden)');
    if (!anyOpen && overlay) { overlay.classList.add('hidden'); overlay.onclick = null; }
  }

  function updateInvestablePreview() {
    const income   = parseFloat(document.getElementById('pf-income')?.value)   || 0;
    const fixed    = parseFloat(document.getElementById('pf-fixed')?.value)    || 0;
    const variable = parseFloat(document.getElementById('pf-variable')?.value) || 0;
    const investable = Math.max(0, income - fixed - variable);
    const el = document.getElementById('pf-investable');
    if (el) el.textContent = `${investable.toLocaleString('fr-FR')} €/mois`;
  }

  function initProfileModal() {
    // Open button
    document.getElementById('edit-profile-btn')?.addEventListener('click', openProfileModal);

    // Close buttons
    document.getElementById('profile-modal-close')?.addEventListener('click',  closeProfileModal);
    document.getElementById('profile-modal-cancel')?.addEventListener('click', closeProfileModal);

    // Live investable preview
    ['pf-income', 'pf-fixed', 'pf-variable'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateInvestablePreview);
    });

    // Mode radio → sync budget field
    document.querySelectorAll('input[name="pf-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const budgetMap = { chill: 100, balanced: 300, ambitious: 600 };
        setValue('pf-budget', budgetMap[radio.value] || 300);
      });
    });

    // Form submit
    document.getElementById('profile-edit-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const saveBtn = document.getElementById('profile-modal-save');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Enregistrement…'; }

      const goals = Array.from(
        document.querySelectorAll('#pf-goals-grid input[type="checkbox"]:checked')
      ).map(cb => cb.value);

      const selectedMode = document.querySelector('input[name="pf-mode"]:checked')?.value || 'balanced';

      const updates = {
        income:            parseFloat(document.getElementById('pf-income')?.value)   || 0,
        fixed_expenses:    parseFloat(document.getElementById('pf-fixed')?.value)    || 0,
        variable_expenses: parseFloat(document.getElementById('pf-variable')?.value) || 0,
        savings_buffer:    parseFloat(document.getElementById('pf-savings')?.value)  || 0,
        investment_mode:   selectedMode,
        monthly_budget:    parseFloat(document.getElementById('pf-budget')?.value)   || 300,
        goals,
      };

      try {
        const updated = await DB.updateProfile(currentUser.id, updates);
        currentProfile = { ...currentProfile, ...updated };
        updateUserUI();
        if (currentSection === 'dashboard') renderDashboard();
        closeProfileModal();
        showToast('Profil financier mis à jour');
      } catch (err) {
        console.error('Profile update error:', err);
        showToast('Erreur lors de la sauvegarde');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Enregistrer`;
        }
      }
    });
  }

  function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  // ── Pro Modal ─────────────────────────────────────────────────

  function showProModal(message) {
    const modal = document.getElementById('modal-pro');
    const overlay = document.getElementById('modal-overlay');
    const msgEl = document.getElementById('pro-modal-message');
    if (!modal || !overlay) return;

    if (msgEl && message) msgEl.textContent = message;
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');

    overlay.onclick = (e) => { if (e.target === overlay) closeProModal(); };
  }

  function closeProModal() {
    const modal = document.getElementById('modal-pro');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) { overlay.classList.add('hidden'); overlay.onclick = null; }
  }

  function activatePro() {
    // Simulate Pro activation (in production, integrate with Stripe/Lemonsqueezy)
    if (!currentProfile) return;
    DB.updateProfile(currentProfile.id, { plan: 'pro' }).then(updated => {
      currentProfile = { ...currentProfile, ...updated };
      closeProModal();
      updateUserUI();
      initAdBanner(currentProfile);

      // Update all modules
      Feed.setProfile(currentProfile);
      Chat.setProfile(currentProfile);
      Portfolio.setProfile(currentProfile);
      Bank.setProfile(currentProfile);

      showToast('Bienvenue dans Mona Invest Pro ! 🎉');
    }).catch(console.error);
  }

  // ── User UI ───────────────────────────────────────────────────

  function updateUserUI() {
    if (!currentProfile) return;

    const name = currentProfile.full_name || currentUser?.email || 'Utilisateur';
    const email = currentUser?.email || '';
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const isPro = currentProfile.plan === 'pro';

    setEl('user-name', name);
    setEl('user-email', email);
    setEl('user-initials', initials);
    setEl('ia-credits-count', isPro ? '∞' : (currentProfile.ia_credits || 0));

    const planBadge = document.getElementById('plan-badge');
    if (planBadge) {
      planBadge.textContent = isPro ? 'PRO' : 'GRATUIT';
      planBadge.className = `plan-badge ${isPro ? 'plan-badge--pro' : ''}`;
    }

    const proBtn = document.getElementById('sidebar-pro-btn');
    if (proBtn) proBtn.classList.toggle('hidden', isPro);
  }

  // ── App Start ─────────────────────────────────────────────────

  function startApp() {
    document.getElementById('loading-screen').classList.add('hidden');
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('onboarding-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Propagate profile to all modules
    Feed.setProfile(currentProfile);
    Chat.setProfile(currentProfile);
    Portfolio.setProfile(currentProfile);
    Bank.setProfile(currentProfile);

    updateUserUI();
    initAdBanner(currentProfile);

    // Load initial section
    navigate('feed');

    // Pre-load portfolio data for dashboard
    Portfolio.loadPortfolio(currentProfile);
  }

  // ── Init App ──────────────────────────────────────────────────

  async function init() {
    document.getElementById('loading-screen').classList.remove('hidden');

    Auth.initAuthForms();
    initOnboarding();
    initNavigation();
    initModals();
    Feed.initFeedFilters();
    Chat.initChatSection();
    Portfolio.initPortfolioSection();

    Auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        currentUser = session.user;

        try {
          let profile = await DB.getProfile(currentUser.id);

          if (!profile) {
            // New user — create profile
            profile = await DB.upsertProfile(currentUser.id, {
              full_name: currentUser.user_metadata?.full_name || currentUser.email,
            });
          }

          // Check and reset monthly credits
          profile = await DB.checkAndResetCredits(profile);
          currentProfile = profile;

          if (!profile.onboarding_completed) {
            showOnboarding();
          } else {
            startApp();
          }
        } catch (err) {
          console.error('Profile load error:', err);
          Auth.showAuthScreen();
        }
      } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentProfile = null;
        Auth.showAuthScreen();
      }
    });

    // Check for existing session
    try {
      const session = await Auth.getSession();
      if (!session) {
        Auth.showAuthScreen();
      }
      // onAuthStateChange will handle the rest
    } catch (err) {
      console.error('Session check error:', err);
      Auth.showAuthScreen();
    }
  }

  function initNavigation() {
    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.section);
      });
    });

    // Mobile hamburger
    const hamburger = document.getElementById('hamburger-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (hamburger) {
      hamburger.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        sidebarOverlay?.classList.toggle('hidden');
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        sidebarOverlay.classList.add('hidden');
      });
    }

    // Pro button
    document.getElementById('sidebar-pro-btn')?.addEventListener('click', () => showProModal());

    // Pro modal actions
    document.getElementById('pro-modal-close')?.addEventListener('click', closeProModal);
    document.getElementById('pro-subscribe-btn')?.addEventListener('click', activatePro);
  }

  function initModals() {
    initProfileModal();

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeProfileModal();
        closeProModal();
        Feed.closeDetail();
        Portfolio.closeModal();
        Chat.closeRewardModal();
        Bank.closeModal();
      }
    });
  }

  function updateDashboard() {
    if (currentSection === 'dashboard') renderDashboard();
  }

  function updateProfile(profile) {
    currentProfile = { ...currentProfile, ...profile };
    updateUserUI();
  }

  // ── Helpers ───────────────────────────────────────────────────

  function formatMoney(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function setEl(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(String(text || '')));
    return div.innerHTML;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('visible'), 100);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── Public API ────────────────────────────────────────────────
  window.App = {
    init,
    navigate,
    showProModal,
    closeProModal,
    openProfileModal,
    closeProfileModal,
    updateDashboard,
    updateProfile,
    getCurrentProfile: () => currentProfile,
    getCurrentUser: () => currentUser,
  };

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', init);
})();
