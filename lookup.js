export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const prompt = `You are a financial analyst. Search your knowledge for current data on the stock ticker ${symbol}. 
Return ONLY a single raw JSON object, no markdown, no backticks, no explanation:
{
  "symbol": "${symbol}",
  "name": "full company name",
  "price": "most recent known price as string",
  "rsi": "estimated 14-day RSI as string (if unknown write unknown)",
  "target": "analyst consensus price target as string (if unknown write unknown)",
  "congress": "green if there have been notable congressional buys in last 90 days, else gray",
  "options": "gray",
  "technical": "green if stock appears to be in uptrend with RSI 50-70, amber if RSI 30-50 or mixed signals, red if downtrend or overbought, gray if unclear",
  "notes": "2-3 sentence trader thesis: recent news or catalysts, why this might be on a trader's radar, key risk factors to watch"
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON found');
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Lookup failed', detail: err.message });
  }
}
