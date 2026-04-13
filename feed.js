// ============================================================
// MONA INVEST — feed.js
// AI Feed Generation & Display Module
// ============================================================

(function () {
  'use strict';

  const { API_BASE, FREE_FEED_LIMIT } = window.APP_CONFIG;

  let allFeedItems = [];
  let currentFilter = 'all';
  let currentProfile = null;

  // ── Type Config ───────────────────────────────────────────────

  const TYPE_CONFIG = {
    dividend: {
      label: 'Dividende',
      color: '#B87333',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B87333" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    },
    catalyst: {
      label: 'Catalyseur',
      color: '#4A3590',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B8FE0" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    },
    signal: {
      label: 'Signal',
      color: '#7A8F62',
      icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A8C17A" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    },
  };

  // ── Fetch Feed from API ───────────────────────────────────────

  async function generateFeedFromAPI() {
    const response = await fetch(`${API_BASE}/generate-feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() }),
    });

    if (!response.ok) throw new Error(`Feed generation failed: ${response.status}`);
    const result = await response.json();
    return result.items || [];
  }

  // ── Fallback Feed ─────────────────────────────────────────────

  function getFallbackFeed() {
    const now = new Date();
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const month = months[now.getMonth()];

    return [
      {
        type: 'dividend',
        ticker: 'TTE',
        company_name: 'TotalEnergies',
        title: `Dividende TotalEnergies — Détachement ${month}`,
        description: 'Rendement 5,2% annuel. Détachement dans 8 jours. Éligible PEA.',
        detail: 'TotalEnergies verse un dividende trimestriel de 0,79€ par action. La date de détachement est prévue ce mois-ci. Avec un cours autour de 61€, le rendement annualisé ressort à 5,2%, supérieur à la moyenne sectorielle des majors pétrolières. La compagnie maintient une politique de dividende croissant depuis 2020 tout en accélérant sa transition vers les énergies renouvelables.',
        stats: { 'Rendement': '5,2%', 'Dividende/action': '0,79€', 'Fréquence': 'Trimestriel', 'Cours approx.': '61€', 'Éligible PEA': 'Oui' },
        platform: 'pea',
      },
      {
        type: 'dividend',
        ticker: 'AIR',
        company_name: 'Airbus',
        title: 'Airbus — Dividende annuel record attendu',
        description: 'Dividende exceptionnel prévu. Carnet de commandes historique.',
        detail: 'Airbus devrait annoncer un dividende annuel en hausse significative suite à une année de livraisons record et un carnet de commandes dépassant 8 500 appareils. Le titre reste soutenu par la demande structurelle du transport aérien post-Covid. Consensus analyste favorable avec un objectif moyen à 185€.',
        stats: { 'Dividende estimé': '1,80€', 'Rendement': '1,1%', 'P/E': '24x', 'Carnet': '8500 avions', 'Éligible PEA': 'Oui' },
        platform: 'pea',
      },
      {
        type: 'dividend',
        ticker: 'MSFT',
        company_name: 'Microsoft',
        title: 'Microsoft — Dividende trimestriel + rachat actions',
        description: '22 ans de croissance du dividende consécutifs. IA = catalyseur.',
        detail: 'Microsoft a annoncé une augmentation de 10% de son dividende trimestriel à 0,83$, portant le rendement à ~0,7%. En parallèle, le programme de rachat d\'actions de 60Md$ reste actif. L\'accélération d\'Azure et l\'intégration de Copilot dans Office 365 soutiennent les prévisions de revenus pour les 4 prochains trimestres.',
        stats: { 'Dividende': '0,83$/trimestre', 'Croissance div.': '22 ans', 'Cours': '~420$', 'Rachat': '60Md$', 'Plateforme': 'eToro' },
        platform: 'etoro',
      },
      {
        type: 'catalyst',
        ticker: 'MC',
        company_name: 'LVMH',
        title: 'LVMH — Résultats T2 : rebond Asie attendu',
        description: 'Reprise du luxe en Chine. Consensus 12% de hausse potentielle.',
        detail: 'Les résultats trimestriels de LVMH sont attendus avec un rebond des ventes en Asie-Pacifique après 3 trimestres de ralentissement. Les analystes anticipent une croissance organique de 4-6% portée par Louis Vuitton et Dior. La normalisation du tourisme chinois et la demande américaine soutenue constituent les principaux catalyseurs court terme.',
        stats: { 'Objectif moyen': '720€', 'Potentiel hausse': '+12%', 'P/E fwd': '19x', 'Croissance rev.': '+5% att.', 'Éligible PEA': 'Oui' },
        platform: 'pea',
      },
      {
        type: 'catalyst',
        ticker: 'NVDA',
        company_name: 'NVIDIA',
        title: 'NVIDIA — Blackwell : rupture technologique',
        description: 'Nouveaux GPU IA. Demande hyper-scalers en accélération.',
        detail: 'Le lancement commercial des GPU Blackwell de NVIDIA se confirme avec des commandes massives des hyperscalers (Microsoft, Google, Meta, Amazon). Les premières estimations pointent vers un doublement des revenus Data Center sur les 12 prochains mois. Malgré une valorisation élevée (P/E 35x fwd), la croissance bénéficiaire justifie l\'enthousiasme des investisseurs growth.',
        stats: { 'Cours approx.': '~900$', 'P/E fwd': '35x', 'Croissance BPA': '+85% att.', 'Marge brute': '73%', 'Plateforme': 'eToro' },
        platform: 'etoro',
      },
      {
        type: 'catalyst',
        ticker: 'SAN',
        company_name: 'Sanofi',
        title: 'Sanofi — Pipeline immunologie : données Phase III',
        description: 'Dupixent + 2 nouveaux assets. Catalyseur réglementaire FDA.',
        detail: 'Sanofi publie ce trimestre les résultats de Phase III de son traitement contre la BPOC (maladie pulmonaire obstructive). Dupixent continue d\'afficher une croissance à 2 chiffres et représente désormais 40% des revenus. Une approbation FDA supplémentaire pourrait ajouter 2-3Md€ de revenus annuels au pipeline. Le titre se traite à décote historique vs peers pharma.',
        stats: { 'Cours': '~89€', 'P/E': '14x', 'Rendement div.': '3,8%', 'Pipeline': '15 assets', 'Éligible PEA': 'Oui' },
        platform: 'pea',
      },
      {
        type: 'signal',
        ticker: 'CAC40',
        company_name: 'CAC 40',
        title: 'CAC 40 — Support technique 7 800 pts testé',
        description: 'Zone de support majeure. RSI survendu. Rebond probable.',
        detail: 'Le CAC 40 teste actuellement le support technique clé des 7 800 points, une zone ayant tenu lors des 3 dernières corrections significatives. Le RSI hebdomadaire est entré en zone de survente (<30), signal historiquement favorable pour un rebond à horizon 4-8 semaines. Le contexte macro reste incertain mais les valorisations européennes atteignent des niveaux attractifs vs historique.',
        stats: { 'Niveau actuel': '7 820 pts', 'Support clé': '7 800 pts', 'RSI hebdo': '28 (survendu)', 'P/E CAC': '13x', 'Signal': 'Achat technique' },
        platform: 'pea',
      },
      {
        type: 'signal',
        ticker: 'GOLD',
        company_name: 'Or (XAU)',
        title: 'Or — Nouveau sommet historique. Momentum haussier.',
        description: 'Banques centrales acheteuses. Inflation refuge. ATH franchi.',
        detail: 'L\'or vient de franchir un nouveau sommet historique soutenu par des achats massifs des banques centrales émergentes (Chine, Inde, Turquie) et l\'incertitude géopolitique persistante. La corrélation avec les taux réels américains reste forte : une pause de la Fed constitue le prochain catalyseur. Les ETF or type GLD sur eToro offrent une exposition simple sans frais de stockage.',
        stats: { 'Prix': '~2 650$/oz', 'YTD': '+18%', 'Momentum': 'Haussier', 'Support': '2 500$', 'Plateforme': 'eToro' },
        platform: 'etoro',
      },
      {
        type: 'signal',
        ticker: 'EUR/USD',
        company_name: 'Euro/Dollar',
        title: 'EUR/USD — Divergence Fed/BCE crée opportunité',
        description: 'La BCE maintient ses baisses. Le dollar s\'affaiblit. Pari change.',
        detail: 'La divergence de politique monétaire entre la Fed (pause) et la BCE (baisses continues) crée un contexte favorable à l\'appréciation de l\'euro. Techniquement, un franchissement de 1,12 ouvrirait la voie vers 1,15-1,18. Impact direct : les exportateurs européens seraient pénalisés mais les actions importatrices et les ETF US non couverts bénéficieraient.',
        stats: { 'Cours EUR/USD': '1,108', 'Résistance': '1,12', 'Objectif': '1,15', 'Sentiment': 'Neutre→Haussier', 'Signal': 'À surveiller' },
        platform: 'both',
      },
    ];
  }

  // ── Load Feed ─────────────────────────────────────────────────

  async function loadFeed(profile) {
    currentProfile = profile;
    showFeedSkeleton();

    try {
      // Try to get from DB cache first
      const cached = await DB.getActiveFeedItems();

      if (cached && cached.length >= 6) {
        allFeedItems = cached;
      } else {
        // Generate from API
        try {
          const generated = await generateFeedFromAPI();
          if (generated && generated.length > 0) {
            allFeedItems = generated;
            await DB.saveFeedItems(generated).catch(console.error);
          } else {
            allFeedItems = getFallbackFeed();
          }
        } catch (apiErr) {
          console.warn('Feed API failed, using fallback:', apiErr);
          allFeedItems = getFallbackFeed();
        }
      }

      renderFeed(currentFilter);
    } catch (err) {
      console.error('Feed load error:', err);
      allFeedItems = getFallbackFeed();
      renderFeed(currentFilter);
    }
  }

  // ── Render Feed ───────────────────────────────────────────────

  function renderFeed(filter = 'all') {
    currentFilter = filter;
    const grid = document.getElementById('feed-grid');
    const blurCta = document.getElementById('feed-blur-cta');
    if (!grid) return;

    // Filter items
    let filtered = allFeedItems;
    if (filter !== 'all') {
      if (['dividend', 'catalyst', 'signal'].includes(filter)) {
        filtered = allFeedItems.filter(i => i.type === filter);
      } else if (['pea', 'etoro'].includes(filter)) {
        filtered = allFeedItems.filter(i => i.platform === filter || i.platform === 'both');
      }
    }

    const isPro = currentProfile?.plan === 'pro';
    const visibleItems = isPro ? filtered : filtered.slice(0, FREE_FEED_LIMIT);
    const hasHidden = !isPro && filtered.length > FREE_FEED_LIMIT;

    grid.innerHTML = '';
    visibleItems.forEach((item, i) => {
      grid.appendChild(createFeedCard(item, i));
    });

    // Show blur CTA for free users with more items
    if (blurCta) {
      if (hasHidden) {
        blurCta.classList.remove('hidden');
      } else {
        blurCta.classList.add('hidden');
      }
    }

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  function createFeedCard(item, index) {
    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.signal;
    const card = document.createElement('div');
    card.className = `feed-card feed-card--${item.type}`;
    card.style.animationDelay = `${index * 0.05}s`;

    const statsHtml = item.stats
      ? Object.entries(item.stats).slice(0, 3).map(([k, v]) =>
          `<div class="feed-stat"><span class="stat-label">${k}</span><span class="stat-value">${v}</span></div>`
        ).join('')
      : '';

    const platformBadge = item.platform
      ? `<span class="platform-badge platform-badge--${item.platform}">${item.platform === 'both' ? 'PEA / eToro' : item.platform.toUpperCase()}</span>`
      : '';

    card.innerHTML = `
      <div class="feed-card-header">
        <div class="feed-card-type">
          ${config.icon}
          <span class="type-label" style="color:${config.color}">${config.label}</span>
        </div>
        ${platformBadge}
      </div>
      <div class="feed-card-ticker">${item.ticker || ''}</div>
      <h3 class="feed-card-title">${escapeHtml(item.title)}</h3>
      <p class="feed-card-description">${escapeHtml(item.description)}</p>
      <div class="feed-stats">${statsHtml}</div>
      <button class="btn-detail" onclick="Feed.openDetail(${JSON.stringify(index)})">
        Voir le détail
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    `;

    return card;
  }

  function showFeedSkeleton() {
    const grid = document.getElementById('feed-grid');
    if (!grid) return;
    grid.innerHTML = Array(3).fill(0).map(() => `
      <div class="feed-card feed-skeleton">
        <div class="skeleton-line short"></div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line medium"></div>
        <div class="skeleton-line short"></div>
      </div>
    `).join('');
  }

  // ── Detail Modal ──────────────────────────────────────────────

  function openDetail(index) {
    const filtered = getFilteredItems();
    const item = filtered[index];
    if (!item) return;

    const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.signal;
    const modal = document.getElementById('modal-feed-detail');
    const overlay = document.getElementById('modal-overlay');
    if (!modal || !overlay) return;

    const allStatsHtml = item.stats
      ? Object.entries(item.stats).map(([k, v]) =>
          `<div class="detail-stat"><span class="detail-stat-label">${k}</span><span class="detail-stat-value">${v}</span></div>`
        ).join('')
      : '';

    modal.innerHTML = `
      <div class="modal-header">
        <div class="feed-card-type">
          ${config.icon}
          <span style="color:${config.color};font-weight:600">${config.label.toUpperCase()}</span>
          ${item.ticker ? `<span class="ticker-badge">${item.ticker}</span>` : ''}
        </div>
        <button class="modal-close" onclick="Feed.closeDetail()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <h2 class="modal-title">${escapeHtml(item.title)}</h2>
        <p class="modal-description">${escapeHtml(item.detail || item.description)}</p>
        <div class="detail-stats">${allStatsHtml}</div>
        <button class="btn-primary btn-analyze" onclick="Feed.analyzeWithAI(${JSON.stringify(index)})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Analyser avec Mona IA
        </button>
      </div>
    `;

    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
    overlay.onclick = closeDetail;
  }

  function closeDetail() {
    const modal = document.getElementById('modal-feed-detail');
    const overlay = document.getElementById('modal-overlay');
    if (modal) modal.classList.add('hidden');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.onclick = null;
    }
  }

  function analyzeWithAI(index) {
    const filtered = getFilteredItems();
    const item = filtered[index];
    if (!item) return;

    closeDetail();

    // Navigate to chat section with pre-filled message
    if (window.App) window.App.navigate('chat');

    setTimeout(() => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = `Analyse moi ${item.ticker || item.company_name || 'cette opportunité'} : ${item.title}. Est-ce adapté à mon profil ?`;
        const form = document.getElementById('chat-form');
        if (form) form.dispatchEvent(new Event('submit'));
      }
    }, 300);
  }

  function getFilteredItems() {
    if (currentFilter === 'all') return allFeedItems;
    if (['dividend', 'catalyst', 'signal'].includes(currentFilter)) {
      return allFeedItems.filter(i => i.type === currentFilter);
    }
    if (['pea', 'etoro'].includes(currentFilter)) {
      return allFeedItems.filter(i => i.platform === currentFilter || i.platform === 'both');
    }
    return allFeedItems;
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ── Init ──────────────────────────────────────────────────────

  function initFeedFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        renderFeed(btn.dataset.filter);
      });
    });

    // Refresh button
    const refreshBtn = document.getElementById('feed-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        if (!currentProfile) return;
        refreshBtn.disabled = true;
        refreshBtn.classList.add('loading');
        try {
          const generated = await generateFeedFromAPI();
          if (generated && generated.length > 0) {
            allFeedItems = generated;
            await DB.saveFeedItems(generated).catch(console.error);
            renderFeed(currentFilter);
          }
        } catch (err) {
          console.warn('Refresh failed:', err);
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.classList.remove('loading');
        }
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────
  window.Feed = {
    loadFeed,
    renderFeed,
    initFeedFilters,
    openDetail,
    closeDetail,
    analyzeWithAI,
    setProfile: (profile) => { currentProfile = profile; },
  };
})();
