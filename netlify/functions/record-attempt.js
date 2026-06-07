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
    const sourceDiff = String(payload.sourceDiff || payload.diff || '').slice(0, 2);
    const sourceLevel = Number(payload.sourceLevel);

    if (!playerId || !sourceDiff || !Number.isInteger(sourceLevel)) {
      return json(400, { error: 'Missing playerId/source question.' });
    }

    const db = getDb();
    const now = new Date();
    const attempt = {
      playerId,
      diff: String(payload.diff || sourceDiff).slice(0, 2),
      level: Number(payload.level) || 0,
      sourceDiff,
      sourceLevel,
      zone: Number(payload.zone) || 0,
      question: String(payload.question || '').slice(0, 500),
      chosen: Number(payload.chosen),
      correctAnswer: Number(payload.correctAnswer),
      chosenText: String(payload.chosenText || '').slice(0, 200),
      correctText: String(payload.correctText || '').slice(0, 200),
      correct: !!payload.correct,
      retryCount: Number(payload.retryCount) || 0,
      createdAt: now
    };

    await db.collection('attempts').add(attempt);

    const patternId = `${playerId}_${sourceDiff}_${sourceLevel}`;
    const patternRef = db.collection('wrongPatterns').doc(patternId);
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(patternRef);
      const current = snap.exists ? snap.data() : {};
      const totalCount = (current.totalCount || 0) + 1;
      const wrongCount = (current.wrongCount || 0) + (attempt.correct ? 0 : 1);

      tx.set(patternRef, {
        playerId,
        sourceDiff,
        sourceLevel,
        zone: attempt.zone,
        question: attempt.question,
        totalCount,
        wrongCount,
        lastChosen: attempt.chosen,
        lastCorrect: attempt.correct,
        lastAttemptAt: now,
        lastWrongAt: attempt.correct ? current.lastWrongAt || null : now
      }, { merge: true });
    });

    return json(200, { ok: true });
  } catch (err) {
    return json(500, { error: err.message || 'Unexpected error' });
  }
};
