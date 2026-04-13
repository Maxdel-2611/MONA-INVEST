// ============================================================
// MONA INVEST — Netlify Function: Claude Chat
// Proxies requests to the Anthropic API securely.
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { messages, systemPrompt, maxTokens = 1024 } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'messages array required' }) };
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const requestParams = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: Math.min(maxTokens, 2048),
      messages,
    };

    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }

    const response = await anthropic.messages.create(requestParams);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        content: response.content[0]?.text || '',
        input_tokens: response.usage?.input_tokens,
        output_tokens: response.usage?.output_tokens,
      }),
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    const status = error.status || 500;
    return {
      statusCode: status,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
    };
  }
};
