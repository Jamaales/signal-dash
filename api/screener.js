// api/screener.js
// Vercel serverless function — Stock Screener
// Uses Financial Modeling Prep free tier (https://financialmodelingprep.com/developer/docs/)
// Free tier: 250 calls/day — sufficient for personal use
//
// Set FMP_API_KEY in Vercel environment variables:
//   vercel env add FMP_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const FMP_KEY = process.env.FMP_API_KEY;
  if (!FMP_KEY) {
    return res.status(500).json({ error: 'FMP_API_KEY not set in environment variables' });
  }

  const {
    marketCapMin,   // number, in billions (e.g. 0.3 = $300M)
    marketCapMax,   // number, in billions
    priceMin,       // number
    priceMax,       // number
    sector,         // string, e.g. "Technology"
    exchange,       // string, e.g. "NYSE", "NASDAQ"
    volumeMin,      // number, average daily volume minimum
    limit = 50,
  } = req.body || {};

  // Build FMP screener query params
  const params = new URLSearchParams();
  params.set('apikey', FMP_KEY);
  params.set('limit', Math.min(limit, 100));

  if (marketCapMin != null) params.set('marketCapMoreThan', Math.round(marketCapMin * 1e9));
  if (marketCapMax != null) params.set('marketCapLowerThan', Math.round(marketCapMax * 1e9));
  if (priceMin != null)     params.set('priceMoreThan', priceMin);
  if (priceMax != null)     params.set('priceLowerThan', priceMax);
  if (sector)               params.set('sector', sector);
  if (exchange)             params.set('exchange', exchange);
  if (volumeMin != null)    params.set('volumeMoreThan', volumeMin);

  // Only return US-listed stocks
  params.set('isEtf', 'false');
  params.set('isActivelyTrading', 'true');

  const url = `https://financialmodelingprep.com/api/v3/stock-screener?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`FMP API error ${response.status}: ${text}`);
    }
    const data = await response.json();

    // Normalize to what Signal Dash expects
    const results = (Array.isArray(data) ? data : []).map(s => ({
      symbol:       s.symbol,
      name:         s.companyName || s.name || '—',
      price:        s.price != null ? s.price.toFixed(2) : '—',
      marketCap:    s.marketCap != null ? formatMktCap(s.marketCap) : '—',
      volume:       s.volume != null ? formatVol(s.volume) : '—',
      sector:       s.sector || '—',
      exchange:     s.exchangeShortName || s.exchange || '—',
      beta:         s.beta != null ? s.beta.toFixed(2) : '—',
      change:       s.changes != null ? s.changes.toFixed(2) : null,
      changePct:    s.changesPercentage != null ? parseFloat(s.changesPercentage).toFixed(2) : null,
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(results);

  } catch (err) {
    console.error('Screener error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function formatMktCap(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  return n.toLocaleString();
}

function formatVol(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toString();
}
