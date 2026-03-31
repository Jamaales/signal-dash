export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { watchlist } = req.body;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY missing' });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `Today is ${today}. Search the web for Trump's most recent announcements, Truth Social posts, executive orders, tariff actions, and policy statements from the last 48-72 hours that could impact financial markets.

User's watchlist: ${watchlist || 'none'}. Flag any watchlist tickers that could be affected.

After searching, return ONLY a raw JSON array with 4-6 items, no markdown, no backticks, no explanation before or after the JSON:
[{"title":"max 10 word headline","summary":"1-2 sentence summary of what happened","date":"actual date","impact":"high or medium or low or neutral","sectors":["sector1","sector2"],"tickers":["TICK1","TICK2"],"reasoning":"1 sentence why this matters to swing traders right now"}]

Focus on announcements that cause unusual options activity or pre-announcement market moves. Prioritize tariff news, trade deals, Iran war updates, sector callouts, and Truth Social posts that moved markets.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'groq/compound',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2048
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('[');
    const end = clean.lastIndexOf(']');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Could not parse response — try scanning again' });

    const parsed = JSON.parse(clean.slice(start, end + 1));
    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
