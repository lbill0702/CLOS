const { getDb } = require('./firebase-admin');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

function zoneLabel(zone) {
  const labels = {
    0: 'Measurement Lab',
    1: 'Pictograph Park',
    2: 'Bar Chart City',
    3: 'Data Master',
    4: 'Triangle World',
    5: 'Fraction Forest',
    6: 'Place Value Peak'
  };
  return labels[zone] || 'Unknown Zone';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const expected = process.env.ADMIN_PASSCODE || '';

    if (!expected) return json(403, { error: 'ADMIN_PASSCODE is not configured on Netlify.' });
    if (String(payload.passcode || '') !== expected) return json(401, { error: 'Incorrect admin passcode.' });

    const db = getDb();
    const snap = await db.collection('wrongPatterns').limit(500).get();
    const patterns = [];
    const zones = {};

    snap.forEach((doc) => {
      const data = doc.data();
      const item = {
        sourceDiff: data.sourceDiff,
        sourceLevel: data.sourceLevel,
        zone: Number(data.zone) || 0,
        question: data.question || '',
        totalCount: Number(data.totalCount) || 0,
        wrongCount: Number(data.wrongCount) || 0
      };
      if (!item.totalCount) return;
      patterns.push(item);
      const zone = zones[item.zone] || (zones[item.zone] = { zone: item.zone, total: 0, wrong: 0 });
      zone.total += item.totalCount;
      zone.wrong += item.wrongCount;
    });

    const correctPatterns = patterns
      .filter((item) => item.wrongCount === 0)
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 12);

    const incorrectPatterns = patterns
      .filter((item) => item.wrongCount > 0)
      .sort((a, b) => (b.wrongCount - a.wrongCount) || (b.totalCount - a.totalCount))
      .slice(0, 12);

    const areasOfImprovement = Object.values(zones)
      .map((zone) => ({
        ...zone,
        label: zoneLabel(zone.zone),
        rate: zone.total ? Math.round((zone.wrong / zone.total) * 100) : 0
      }))
      .sort((a, b) => (b.rate - a.rate) || (b.wrong - a.wrong))
      .slice(0, 7);

    return json(200, {
      ok: true,
      source: 'firebase',
      correctPatterns,
      incorrectPatterns,
      areasOfImprovement
    });
  } catch (err) {
    return json(500, { error: err.message || 'Unexpected error' });
  }
};
