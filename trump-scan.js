export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { watchlist } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not set in environment variables' });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `You are a financial market analyst specializing in political risk and swing trading. Today is ${today}.

Identify 4-6 of the most significant recent Trump announcements, Truth Social posts, executive orders, tariff actions, or policy statements that could impact financial markets.

The user's watchlist is: ${watchlist || 'none'}. Flag tickers from this watchlist that could be affected.

Return ONLY a raw JSON array, no markdown, no backticks, no explanation:
[{"title":"max 10 word headline","summary":"1-2 sentence summary","date":"approximate date","impact":"high or medium or low or neutral","sectors":["sector1","sector2"],"tickers":["TICK1","TICK2"],"reasoning":"1 sentence why this matters to swing traders"}]

Focus on announcements that cause unusual options activity or pre-announcement market moves.`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      if (data.error) continue;

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      if (!text) continue;

      const cleaned = text.replace(/```json|```/g, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end === -1) continue;

      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return res.status(200).json(parsed);

    } catch (err) {
      continue;
    }
  }

  return res.status(500).json({ error: 'All Gemini models failed. Check your API key at aistudio.google.com.' });
}
