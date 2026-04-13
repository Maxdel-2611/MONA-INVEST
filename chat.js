// ============================================================
// MONA INVEST — chat.js
// AI Advisor Chat Module (Claude via Netlify Function)
// ============================================================

(function () {
  'use strict';

  const { API_BASE, FREE_IA_CREDITS, REWARDED_AD_CREDITS } = window.APP_CONFIG;

  let currentProfile = null;
  let chatMessages = []; // In-memory conversation (for API context)
  let isTyping = false;

  // ── System Prompt ────────────────────────────────────────────

  function buildSystemPrompt(profile) {
    const goals = (profile.goals || []).join(', ') || 'non définis';
    const mode = { chill: 'Chill (~150€/mois)', balanced: 'Équilibré (~300€/mois)', ambitious: 'Ambitieux (~500€/mois)' }[profile.investment_mode] || 'Équilibré';
    const investable = (profile.income || 0) - (profile.fixed_expenses || 0) - (profile.variable_expenses || 0);

    return `Tu es Mona, une conseillère financière personnelle experte, intégrée dans l'application Mona Invest.
Tu es professionnelle, bienveillante, précise et orientée vers l'action concrète.
Tu parles en français, avec un style élégant adapté au private banking.

PROFIL DE L'UTILISATEUR :
- Revenus nets mensuels : ${profile.income || 0}€
- Dépenses fixes : ${profile.fixed_expenses || 0}€
- Dépenses variables : ${profile.variable_expenses || 0}€
- Épargne de précaution : ${profile.savings_buffer || 0}€
- Capital investissable estimé : ${Math.max(0, investable)}€/mois
- Mode d'investissement : ${mode}
- Budget mensuel alloué : ${profile.monthly_budget || 0}€
- Objectifs de vie : ${goals}
- Plan : ${profile.plan === 'pro' ? 'Pro (accès illimité)' : 'Gratuit'}

INSTRUCTIONS :
- Donne des conseils personnalisés basés sur ce profil exact
- Sois concis et actionnable (3-5 phrases max par réponse, sauf si l'utilisateur demande plus)
- Mentionne des chiffres concrets quand pertinent
- Si tu recommandes un actif, précise si c'est éligible PEA ou eToro
- Ne donne jamais de garanties de rendement
- Rappelle toujours que tes conseils sont éducatifs et ne constituent pas un conseil en investissement réglementé
- Format : utilise des sauts de ligne pour aérer, des emojis avec parcimonie`;
  }

  // ── Suggestions ──────────────────────────────────────────────

  const SUGGESTIONS = [
    'Quelles actions PEA choisir avec mon profil ?',
    'Comment optimiser mon épargne mensuelle ?',
    'Qu\'est-ce que le DCA et comment l\'appliquer ?',
    'Quelle répartition entre PEA et eToro ?',
    'Comment calculer mon niveau de risque ?',
    'Quels ETF pour débuter en bourse ?',
    'Comment préparer ma retraite avec 300€/mois ?',
    'Quelles sont les meilleures dates de dividendes ?',
  ];

  // ── API Call ─────────────────────────────────────────────────

  async function callChatAPI(messages, systemPrompt) {
    const response = await fetch(`${API_BASE}/claude-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt, maxTokens: 1024 }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Erreur réseau' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Message Rendering ─────────────────────────────────────────

  function renderMessage(role, content) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-message ${role === 'user' ? 'user-msg' : 'ai-msg'}`;

    if (role === 'assistant') {
      div.innerHTML = `
        <div class="msg-avatar">
          <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="20" cy="20" rx="16" ry="9" stroke="#B87333" stroke-width="2"/>
            <circle cx="20" cy="20" r="4" fill="#B87333"/>
            <circle cx="20" cy="20" r="1.5" fill="#0A0A0A"/>
          </svg>
        </div>
        <div class="msg-bubble">${formatMessageContent(content)}</div>
      `;
    } else {
      div.innerHTML = `<div class="msg-bubble">${escapeHtml(content)}</div>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function renderTypingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return null;

    const div = document.createElement('div');
    div.className = 'chat-message ai-msg typing-indicator-wrap';
    div.id = 'typing-indicator';
    div.innerHTML = `
      <div class="msg-avatar">
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="20" cy="20" rx="16" ry="9" stroke="#B87333" stroke-width="2"/>
          <circle cx="20" cy="20" r="4" fill="#B87333"/>
        </svg>
      </div>
      <div class="msg-bubble typing-indicator">
        <span></span><span></span><span></span>
      </div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function formatMessageContent(text) {
    return escapeHtml(text)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ── Credits UI ────────────────────────────────────────────────

  function updateCreditsDisplay(profile) {
    const creditsEl = document.getElementById('ia-credits-count');
    const rewardBtn = document.getElementById('reward-ad-btn');
    const inputArea = document.getElementById('chat-input-area');
    const blockedMsg = document.getElementById('chat-blocked-msg');

    if (!creditsEl) return;

    if (profile.plan === 'pro') {
      creditsEl.textContent = '∞';
      if (rewardBtn) rewardBtn.classList.add('hidden');
      if (inputArea) inputArea.classList.remove('hidden');
      if (blockedMsg) blockedMsg.classList.add('hidden');
      return;
    }

    const credits = profile.ia_credits || 0;
    creditsEl.textContent = credits;

    if (credits <= 0) {
      if (rewardBtn) rewardBtn.classList.remove('hidden');
      if (inputArea) inputArea.classList.add('hidden');
      if (blockedMsg) blockedMsg.classList.remove('hidden');
    } else {
      if (rewardBtn) rewardBtn.classList.add('hidden');
      if (inputArea) inputArea.classList.remove('hidden');
      if (blockedMsg) blockedMsg.classList.add('hidden');
    }
  }

  // ── Send Message ──────────────────────────────────────────────

  async function sendMessage(content) {
    if (!content || isTyping) return;
    if (!currentProfile) return;

    const userId = currentProfile.id;

    // Check credits
    const canSend = await DB.useIaCredit(userId);
    if (!canSend) {
      currentProfile.ia_credits = 0;
      updateCreditsDisplay(currentProfile);
      return;
    }

    // Update local credit count
    if (currentProfile.plan !== 'pro') {
      currentProfile.ia_credits = Math.max(0, (currentProfile.ia_credits || 1) - 1);
      updateCreditsDisplay(currentProfile);
    }

    // Clear suggestions
    const suggestionsEl = document.getElementById('chat-suggestions');
    if (suggestionsEl) suggestionsEl.classList.add('hidden');

    // Render user message
    renderMessage('user', content);

    // Save to DB
    await DB.saveChatMessage(userId, 'user', content).catch(console.error);

    // Add to in-memory context
    chatMessages.push({ role: 'user', content });

    // Show typing indicator
    isTyping = true;
    const typingEl = renderTypingIndicator();

    try {
      const systemPrompt = buildSystemPrompt(currentProfile);

      // Keep last 20 messages for context (API limit)
      const contextMessages = chatMessages.slice(-20);

      const result = await callChatAPI(contextMessages, systemPrompt);
      const aiContent = result.content;

      // Remove typing, render AI response
      removeTypingIndicator();
      renderMessage('assistant', aiContent);

      // Save to DB and memory
      await DB.saveChatMessage(userId, 'assistant', aiContent).catch(console.error);
      chatMessages.push({ role: 'assistant', content: aiContent });

    } catch (err) {
      removeTypingIndicator();
      renderMessage('assistant', `Désolée, une erreur est survenue : ${err.message}. Veuillez réessayer.`);
    } finally {
      isTyping = false;
    }
  }

  // ── Load History ──────────────────────────────────────────────

  async function loadChatHistory(profile) {
    currentProfile = profile;
    chatMessages = [];

    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    try {
      const history = await DB.getChatHistory(profile.id);

      if (history.length === 0) {
        // Show welcome message
        renderMessage('assistant',
          `Bonjour ! Je suis Mona, votre conseillère financière personnelle. 🌟\n\nAvec un budget mensuel de ${profile.monthly_budget || 300}€ et vos objectifs (${(profile.goals || []).join(', ') || 'à définir'}), je suis là pour vous guider.\n\nQue puis-je faire pour vous aujourd'hui ?`
        );
      } else {
        history.forEach(msg => {
          renderMessage(msg.role, msg.content);
          chatMessages.push({ role: msg.role, content: msg.content });
        });
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }

    updateCreditsDisplay(profile);
    renderSuggestions();
  }

  function renderSuggestions() {
    const el = document.getElementById('chat-suggestions');
    if (!el) return;

    if (chatMessages.length > 0) {
      el.classList.add('hidden');
      return;
    }

    const shuffled = SUGGESTIONS.sort(() => 0.5 - Math.random()).slice(0, 4);
    el.innerHTML = shuffled.map(s =>
      `<button class="suggestion-chip" onclick="Chat.handleSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`
    ).join('');
    el.classList.remove('hidden');
  }

  // ── Rewarded Ad ───────────────────────────────────────────────

  async function showRewardedAd() {
    const modal = document.getElementById('modal-rewarded-ad');
    if (!modal) return;

    modal.classList.remove('hidden');
    document.getElementById('modal-overlay').classList.remove('hidden');

    const progressEl = document.getElementById('reward-progress');
    const countdownEl = document.getElementById('reward-countdown');
    const claimBtn = document.getElementById('reward-claim-btn');

    let seconds = 10;
    if (claimBtn) claimBtn.disabled = true;

    const interval = setInterval(() => {
      seconds--;
      if (countdownEl) countdownEl.textContent = seconds;
      if (progressEl) progressEl.style.width = `${((10 - seconds) / 10) * 100}%`;

      if (seconds <= 0) {
        clearInterval(interval);
        if (claimBtn) claimBtn.disabled = false;
      }
    }, 1000);
  }

  async function claimRewardedCredits() {
    if (!currentProfile) return;

    try {
      await DB.addIaCredits(currentProfile.id, REWARDED_AD_CREDITS);
      currentProfile.ia_credits = (currentProfile.ia_credits || 0) + REWARDED_AD_CREDITS;

      // Refresh profile in app state
      if (window.App && window.App.updateProfile) {
        window.App.updateProfile(currentProfile);
      }

      updateCreditsDisplay(currentProfile);
      closeRewardModal();

      // Show toast
      showToast(`+${REWARDED_AD_CREDITS} crédits IA ajoutés !`);
    } catch (err) {
      console.error('Error claiming reward:', err);
    }
  }

  function closeRewardModal() {
    const modal = document.getElementById('modal-rewarded-ad');
    if (modal) modal.classList.add('hidden');
    document.getElementById('modal-overlay').classList.add('hidden');
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
    }, 3000);
  }

  // ── Init ──────────────────────────────────────────────────────

  function initChatSection() {
    const form = document.getElementById('chat-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content) return;
        input.value = '';
        await sendMessage(content);
      });
    }

    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          form && form.dispatchEvent(new Event('submit'));
        }
      });
    }

    const rewardBtn = document.getElementById('reward-ad-btn');
    if (rewardBtn) {
      rewardBtn.addEventListener('click', showRewardedAd);
    }

    const claimBtn = document.getElementById('reward-claim-btn');
    if (claimBtn) {
      claimBtn.addEventListener('click', claimRewardedCredits);
    }

    const clearBtn = document.getElementById('chat-clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        if (!currentProfile) return;
        if (!confirm('Effacer l\'historique de conversation ?')) return;
        await DB.clearChatHistory(currentProfile.id);
        chatMessages = [];
        const container = document.getElementById('chat-messages');
        if (container) container.innerHTML = '';
        loadChatHistory(currentProfile);
      });
    }
  }

  // ── Public API ────────────────────────────────────────────────
  window.Chat = {
    loadChatHistory,
    initChatSection,
    updateCreditsDisplay,
    showRewardedAd,
    claimRewardedCredits,
    closeRewardModal,
    handleSuggestion: (text) => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = text;
        const form = document.getElementById('chat-form');
        if (form) form.dispatchEvent(new Event('submit'));
      }
    },
    setProfile: (profile) => { currentProfile = profile; },
  };
})();
