const { getDb } = require('./firebase-admin');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const payload = JSON.parse(event.body || '{}');
    const playerId = String(payload.playerId || '').slice(0, 80);
    const limit = Math.max(5, Math.min(Number(payload.limit) || 30, 50));

    if (!playerId) return json(400, { error: 'Missing playerId.' });

    const db = getDb();
    const snap = await db.collection('wrongPatterns')
      .where('playerId', '==', playerId)
      .limit(200)
      .get();

    const items = [];
    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.wrongCount) return;
      items.push({
        sourceDiff: data.sourceDiff,
        sourceLevel: data.sourceLevel,
        wrongCount: data.wrongCount || 0,
        totalCount: data.totalCount || 0,
        zone: data.zone || 0
      });
    });
    items.sort((a, b) => (b.wrongCount - a.wrongCount) || (b.totalCount - a.totalCount));
    items.splice(limit);

    await db.collection('ultimateSessions').add({
      playerId,
      count: items.length,
      items,
      createdAt: new Date()
    });

    return json(200, { ok: true, items });
  } catch (err) {
    return json(500, { error: err.message || 'Unexpected error' });
  }
};
