export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { watchlist } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `You are a financial market analyst specializing in political risk and swing trading. Today is ${today}.

Based on your most recent knowledge, identify 4-6 of the most significant recent Trump announcements, Truth Social posts, executive orders, tariff actions, or policy statements that could impact financial markets.

The user's current watchlist is: ${watchlist || 'none'}. Flag any tickers from this watchlist that could be affected.

Return ONLY a raw JSON array, no markdown, no backticks, no explanation. Each object must have exactly these fields:
{
  "title": "max 10 word headline",
  "summary": "1-2 sentences plain language summary",
  "date": "approximate date string",
  "impact": "high, medium, low, or neutral",
  "sectors": ["array", "of", "affected", "sectors"],
  "tickers": ["array", "of", "affected", "ticker", "symbols"],
  "reasoning": "1 sentence explaining why this matters to swing traders specifically"
}

Focus on announcements that have historically caused unusual options activity or pre-announcement market moves. Prioritize tariff news, trade deals, sector-specific callouts, and Truth Social posts that moved markets.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) throw new Error('No JSON array found');
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Scan failed', detail: err.message });
  }
}
