// ============================================================
// MONA INVEST — Netlify Function: Generate Feed
// Uses Claude to generate financial opportunity cards.
// ============================================================

const Anthropic = require('@anthropic-ai/sdk');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const FEED_SYSTEM_PROMPT = `Tu es un analyste financier expert spécialisé dans les marchés actions européens et américains.
Tu génères des opportunités d'investissement structurées pour une application de gestion de patrimoine premium.
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans markdown.`;

function buildFeedPrompt(month, year) {
  return `Génère exactement 9 opportunités d'investissement pertinentes pour ${month} ${year}.
Retourne un tableau JSON avec exactement ce format pour chaque carte :
[
  {
    "type": "dividend",
    "ticker": "TTE",
    "company_name": "TotalEnergies",
    "title": "Dividende TotalEnergies — Détachement 15 ${month}",
    "description": "Rendement 5,2% annuel. Détachement dans 8 jours.",
    "detail": "TotalEnergies verse un dividende trimestriel de 0,79€ par action. La date de détachement est le 15 ${month} ${year}. Avec un cours actuel autour de 61€, le rendement annualisé ressort à 5,2%, supérieur à la moyenne sectorielle. La compagnie a confirmé sa politique de dividende croissant depuis 2020 malgré la transition énergétique.",
    "stats": {"yield": "5,2%", "detachement": "15 ${month}", "paiement": "20 ${month}", "dernier_cours": "61,40€"},
    "platform": "pea"
  }
]

Types disponibles : "dividend" (dividende imminent), "catalyst" (catalyseur fondamental), "signal" (signal marché).
Plateformes : "pea", "etoro", "both".
Fais 3 cartes de chaque type. Mix PEA et eToro. Actions européennes ET américaines.
Inclut des données chiffrées réalistes dans stats (4-5 clés). Detail doit faire 2-3 phrases.
Sois précis, professionnel, comme un analyste de private banking.`;
}

exports.handler = async (event) => {
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

  const now = new Date();
  const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: FEED_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildFeedPrompt(month, year) }],
    });

    const rawText = response.content[0]?.text || '[]';

    // Extract JSON array from the response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in Claude response');
    }

    const feedItems = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(feedItems)) {
      throw new Error('Response is not an array');
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ items: feedItems, generated_at: now.toISOString() }),
    };
  } catch (error) {
    console.error('Feed generation error:', error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
