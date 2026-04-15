// ============================================================
// MONA INVEST — Public Configuration
// ============================================================

window.APP_CONFIG = {
  SUPABASE_URL: 'https://bboachalrqodasomdlnb.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_yBioxEaaNEWGwe3rI5T7_g_mwHbHu-F',

  // API base path (Netlify Functions proxy)
  API_BASE: '/api',

  // App settings
  FREE_FEED_LIMIT: 3,
  FREE_POSITIONS_LIMIT: 5,
  FREE_IA_CREDITS: 5,
  REWARDED_AD_CREDITS: 3,
  PRO_PRICE: '9,99€/mois',

  // ── Lemonsqueezy (paiement Pro) ──────────────────────────────
  // Remplacez par votre URL de checkout Lemonsqueezy
  // Format : https://VOTRE-BOUTIQUE.lemonsqueezy.com/buy/VARIANT-ID
  LEMON_CHECKOUT_URL: 'https://VOTRE-BOUTIQUE.lemonsqueezy.com/buy/VARIANT-ID',

  // ── Liens affiliés (remplacez par vos vrais liens) ───────────
  AFFILIATE_TRADE_REPUBLIC: 'https://ref.trade.re/VOTRE-CODE',
  AFFILIATE_DEGIRO:         'https://www.degiro.fr/parrainage?id=VOTRE-ID',
  AFFILIATE_N26:            'https://n26.com/r/VOTRE-CODE',
  AFFILIATE_ETORO:          'https://etoro.tw/VOTRE-CODE',
};
