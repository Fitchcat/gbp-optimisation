// api/oauth-start.js – Vercel Serverless Function
// Redirects the user to Google's OAuth consent screen.
// After consent, Google redirects to /api/reponses-aux-avis/oauth-callback with a code.
//
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI
// GOOGLE_REDIRECT_URI example: https://your-app.vercel.app/api/reponses-aux-avis/oauth-callback
//                    or local: http://localhost:3000/api/reponses-aux-avis/oauth-callback

module.exports = (req, res) => {
    const CLIENT_ID    = req.query.clientId    || process.env.GOOGLE_CLIENT_ID;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/api/reponses-aux-avis/oauth-callback`;

    if (!CLIENT_ID || !REDIRECT_URI) {
        return res.status(500).send(`
            <h2>Configuration manquante</h2>
            <p>Définissez les variables d'environnement <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_REDIRECT_URI</code> avant de lancer le flow OAuth.</p>
        `);
    }

    const params = new URLSearchParams({
        client_id:     CLIENT_ID,
        redirect_uri:  REDIRECT_URI,
        response_type: 'code',
        scope:         'https://www.googleapis.com/auth/business.manage',
        access_type:   'offline',
        prompt:        'consent',   // force consent so we always get a refresh_token
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};
