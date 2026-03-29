export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const prompt = `You are a financial analyst. Provide current data on stock ticker ${symbol}.
Return ONLY a raw JSON object, no markdown, no backticks, no explanation:
{"symbol":"${symbol}","name":"full company name","price":"most recent known price","rsi":"estimated 14-day RSI","target":"analyst consensus price target","congress":"green if notable congressional buys in last 90 days else gray","options":"gray","technical":"green if uptrend and RSI 50-70, amber if RSI 30-50 or mixed, red if downtrend or overbought, gray if unclear","notes":"2-3 sentence trader thesis covering recent catalysts, why this is on radar, key risks"}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1024
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Could not parse response' });

    const parsed = JSON.parse(clean.slice(start, end + 1));
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
