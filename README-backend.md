# Firebase + Netlify Backend

This project is still a static single-page game. The backend is optional and only activates when hosted over HTTP/HTTPS.

## What It Stores

- `attempts`: every answer attempt.
- `wrongPatterns`: per-player aggregate of questions answered incorrectly.
- `ultimateSessions`: generated Ultimate practice sessions.

## Netlify Environment Variables

Set these in Netlify project settings:

```text
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Use a Firebase service account key from Firebase Console > Project settings > Service accounts.

## Local Development

```bash
npm install
npm run dev
```

Netlify Dev will serve the static game and functions together. Ultimate also works offline from local wrong-answer history if Firebase is not configured.

## GitHub Pages vs Netlify

The simplest deployment is to connect this GitHub repository to Netlify and let Netlify host both `index.html` and `/.netlify/functions/*`.

If the frontend stays on GitHub Pages, set a full function base URL before the game script loads:

```html
<script>
window.HKDD_API_BASE = "https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions";
</script>
```
