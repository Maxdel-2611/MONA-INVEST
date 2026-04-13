// ============================================================
// MONA INVEST — db.js
// Supabase Database Module
// ============================================================

(function () {
  'use strict';

  function getClient() {
    return window._supabase;
  }

  // ── Profiles ────────────────────────────────────────────────

  async function getProfile(userId) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = row not found
    return data;
  }

  async function createProfile(userId, data = {}) {
    const { data: profile, error } = await getClient()
      .from('profiles')
      .insert({ id: userId, ...data })
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async function upsertProfile(userId, data) {
    const { data: profile, error } = await getClient()
      .from('profiles')
      .upsert({ id: userId, ...data }, { onConflict: 'id' })
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  async function updateProfile(userId, data) {
    const { data: profile, error } = await getClient()
      .from('profiles')
      .update(data)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return profile;
  }

  // ── IA Credits ──────────────────────────────────────────────

  async function checkAndResetCredits(profile) {
    const today = new Date().toISOString().split('T')[0];
    const resetDate = profile.ia_credits_reset_date;
    const lastReset = resetDate ? new Date(resetDate) : null;
    const now = new Date();

    // Reset on 1st of month
    const shouldReset =
      !lastReset ||
      (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());

    if (shouldReset) {
      const updated = await updateProfile(profile.id, {
        ia_credits: window.APP_CONFIG.FREE_IA_CREDITS,
        ia_credits_reset_date: today,
      });
      return updated;
    }
    return profile;
  }

  async function useIaCredit(userId) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('ia_credits, plan')
      .eq('id', userId)
      .single();

    if (error) throw error;
    if (data.plan === 'pro') return true; // Pro has unlimited credits

    if (data.ia_credits <= 0) return false;

    await getClient()
      .from('profiles')
      .update({ ia_credits: data.ia_credits - 1 })
      .eq('id', userId);

    return true;
  }

  async function addIaCredits(userId, amount) {
    const { data, error } = await getClient()
      .from('profiles')
      .select('ia_credits')
      .eq('id', userId)
      .single();

    if (error) throw error;

    await getClient()
      .from('profiles')
      .update({ ia_credits: (data.ia_credits || 0) + amount })
      .eq('id', userId);
  }

  // ── Positions ────────────────────────────────────────────────

  async function getPositions(userId) {
    const { data, error } = await getClient()
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function getPositionsByPlatform(userId, platform) {
    const { data, error } = await getClient()
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function addPosition(userId, positionData) {
    const { data, error } = await getClient()
      .from('positions')
      .insert({ user_id: userId, ...positionData })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function updatePosition(positionId, userId, data) {
    const { data: updated, error } = await getClient()
      .from('positions')
      .update(data)
      .eq('id', positionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }

  async function deletePosition(positionId, userId) {
    const { error } = await getClient()
      .from('positions')
      .delete()
      .eq('id', positionId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Chat History ─────────────────────────────────────────────

  async function getChatHistory(userId, limit = 50) {
    const { data, error } = await getClient()
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async function saveChatMessage(userId, role, content) {
    const { data, error } = await getClient()
      .from('chat_history')
      .insert({ user_id: userId, role, content })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async function clearChatHistory(userId) {
    const { error } = await getClient()
      .from('chat_history')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  // ── Feed Items ───────────────────────────────────────────────

  async function getActiveFeedItems() {
    const { data, error } = await getClient()
      .from('feed_items')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('generated_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async function saveFeedItems(items) {
    // Delete expired items first
    await getClient()
      .from('feed_items')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (!items || items.length === 0) return;

    const now = new Date();
    const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const rows = items.map(item => ({
      type: item.type,
      ticker: item.ticker,
      company_name: item.company_name,
      title: item.title,
      description: item.description,
      detail: item.detail,
      stats: item.stats || {},
      platform: item.platform || 'both',
      generated_at: now.toISOString(),
      expires_at: expires.toISOString(),
    }));

    const { data, error } = await getClient()
      .from('feed_items')
      .insert(rows)
      .select();

    if (error) throw error;
    return data;
  }

  // ── Public API ───────────────────────────────────────────────
  window.DB = {
    // Profiles
    getProfile,
    createProfile,
    upsertProfile,
    updateProfile,
    checkAndResetCredits,
    useIaCredit,
    addIaCredits,
    // Positions
    getPositions,
    getPositionsByPlatform,
    addPosition,
    updatePosition,
    deletePosition,
    // Chat
    getChatHistory,
    saveChatMessage,
    clearChatHistory,
    // Feed
    getActiveFeedItems,
    saveFeedItems,
  };
})();
