export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY missing' });

  const prompt = `You are a financial analyst. Provide data on stock ticker ${symbol}. Return ONLY a raw JSON object, no markdown, no backticks:
{"symbol":"${symbol}","name":"full company name","price":"recent price","rsi":"14-day RSI","target":"analyst price target","congress":"green if congressional buys last 90 days else gray","options":"gray","technical":"green if uptrend RSI 50-70, amber if RSI 30-50, red if downtrend, gray if unclear","notes":"2-3 sentence trader thesis with catalysts and risks"}`;

  const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest'];

  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 1024 } })
      });
      const d = await r.json();
      if (d.error) continue;
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const s = clean.indexOf('{'), e = clean.lastIndexOf('}');
      if (s === -1) continue;
      const parsed = JSON.parse(clean.slice(s, e + 1));
      return res.status(200).json(parsed);
    } catch (e) { continue; }
  }

  return res.status(500).json({ error: 'Gemini API failed. Verify your key at aistudio.google.com' });
}
