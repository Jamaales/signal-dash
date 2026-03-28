export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { watchlist } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const prompt = `You are a financial market analyst. Today is ${today}. List 4-6 recent Trump announcements, Truth Social posts, tariffs, or executive orders that could move markets. User watchlist: ${watchlist || 'none'}. Return ONLY a raw JSON array, no markdown, no backticks:
[{"title":"max 10 words","summary":"1-2 sentences","date":"approximate date","impact":"high or medium or low or neutral","sectors":["sector1"],"tickers":["TICK1"],"reasoning":"1 sentence for swing traders"}]`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } })
      });
      const d = await r.json();
      if (d.error) continue;
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const s = clean.indexOf('['), e = clean.lastIndexOf(']');
      if (s === -1) continue;
      const parsed = JSON.parse(clean.slice(s, e + 1));
      return res.status(200).json(parsed);
    } catch (e) { continue; }
  }

  return res.status(500).json({ error: 'Gemini API failed. Verify your key at aistudio.google.com' });
}
