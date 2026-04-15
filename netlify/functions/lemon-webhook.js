// ============================================================
// MONA INVEST — Lemonsqueezy Webhook Handler
// Activates Pro plan automatically after payment
// ============================================================

const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // ── Verify webhook signature ─────────────────────────────────
  const secret = process.env.LEMON_WEBHOOK_SECRET;
  if (!secret) {
    console.error('LEMON_WEBHOOK_SECRET not set');
    return { statusCode: 500, body: 'Webhook secret not configured' };
  }

  const signature = event.headers['x-signature'];
  const hash = crypto
    .createHmac('sha256', secret)
    .update(event.body)
    .digest('hex');

  if (hash !== signature) {
    console.error('Invalid webhook signature');
    return { statusCode: 401, body: 'Unauthorized' };
  }

  // ── Parse payload ────────────────────────────────────────────
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const eventName = payload.meta?.event_name;
  console.log('Lemon event:', eventName);

  // Handle order created or subscription activated
  if (eventName === 'order_created' || eventName === 'subscription_created') {
    // Get user_id passed in custom checkout data
    const userId = payload.meta?.custom_data?.user_id;

    if (!userId) {
      console.error('No user_id in custom_data');
      return { statusCode: 200, body: 'OK (no user_id)' };
    }

    // ── Update Supabase profile to Pro ────────────────────────
    const supabaseUrl  = process.env.SUPABASE_URL;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase env vars');
      return { statusCode: 500, body: 'Supabase not configured' };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${serviceKey}`,
          'apikey':        serviceKey,
        },
        body: JSON.stringify({ plan: 'pro' }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('Supabase update failed:', err);
      return { statusCode: 500, body: 'DB update failed' };
    }

    console.log(`User ${userId} upgraded to Pro`);
  }

  return { statusCode: 200, body: 'OK' };
};
