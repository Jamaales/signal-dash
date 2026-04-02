// api/screener.js
// Uses Yahoo Finance's query2 screener endpoint — no API key required.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    marketCapMin,
    marketCapMax,
    priceMin,
    priceMax,
    sector,
    exchange,
    volumeMin,
    limit = 50,
  } = req.body || {};

  const operands = [];

  if (priceMin != null || priceMax != null) {
    operands.push({
      operator: 'BTWN',
      operands: ['regularMarketPrice', priceMin ?? 0, priceMax ?? 99999],
    });
  }

  if (marketCapMin != null || marketCapMax != null) {
    operands.push({
      operator: 'BTWN',
      operands: ['marketCap', (marketCapMin ?? 0) * 1e9, (marketCapMax ?? 1e15) * 1e9],
    });
  }

  if (volumeMin != null) {
    operands.push({
      operator: 'GT',
      operands: ['averageDailyVolume3Month', volumeMin],
    });
  }

  if (sector) {
    operands.push({
      operator: 'EQ',
      operands: ['sector', sector],
    });
  }

  if (exchange) {
    operands.push({
      operator: 'EQ',
      operands: ['exchange', exchange],
    });
  }

  operands.push({ operator: 'EQ', operands: ['region', 'us'] });
  operands.push({ operator: 'EQ', operands: ['quoteType', 'EQUITY'] });

  const payload = {
    offset: 0,
    size: Math.min(limit, 100),
    sortField: 'marketcap',
    sortType: 'DESC',
    quoteType: 'EQUITY',
    query: {
      operator: 'AND',
      operands,
    },
    userId: '',
    userIdType: 'guid',
  };

  try {
    const response = await fetch('https://query2.finance.yahoo.com/v1/finance/screener', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; signal-dash/1.0)',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Yahoo error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const quotes = data?.finance?.result?.[0]?.quotes ?? [];

    const results = quotes.map(q => ({
      symbol:    q.symbol,
      name:      q.longName || q.shortName || '—',
      price:     q.regularMarketPrice != null ? q.regularMarketPrice.toFixed(2) : '—',
      marketCap: q.marketCap != null ? formatMktCap(q.marketCap) : '—',
      volume:    q.regularMarketVolume != null ? formatVol(q.regularMarketVolume) : '—',
      sector:    q.sector || '—',
      exchange:  q.fullExchangeName || q.exchange || '—',
      beta:      q.beta != null ? q.beta.toFixed(2) : '—',
      changePct: q.regularMarketChangePercent != null
                   ? q.regularMarketChangePercent.toFixed(2)
                   : null,
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
