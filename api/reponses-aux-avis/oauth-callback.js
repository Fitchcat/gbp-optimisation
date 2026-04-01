// api/oauth-callback.js – Vercel Serverless Function
// Exchanges the OAuth authorization code for tokens and displays the refresh token.
// Copy the refresh token and save it as the GOOGLE_REFRESH_TOKEN env var.
//
// Required env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI

module.exports = async (req, res) => {
    const { code, error } = req.query || {};

    if (error) {
        return res.status(400).send(`<h2>Accès refusé</h2><p>${error}</p>`);
    }
    if (!code) {
        return res.status(400).send('<h2>Code manquant</h2>');
    }

    const CLIENT_ID     = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI;

    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id:     CLIENT_ID,
                client_secret: CLIENT_SECRET,
                redirect_uri:  REDIRECT_URI,
                grant_type:    'authorization_code',
            }).toString()
        });

        const tokens = await tokenRes.json();

        if (!tokens.refresh_token) {
            return res.status(400).send(`
                <h2>Pas de refresh token</h2>
                <p>Google ne renvoie un refresh_token qu'à la première autorisation ou si <code>prompt=consent</code> est forcé. Vérifiez que <code>/api/oauth-start</code> inclut bien <code>prompt=consent</code>.</p>
                <pre>${JSON.stringify(tokens, null, 2)}</pre>
            `);
        }

        // Return a simple page showing the token to copy
        res.status(200).send(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Connexion Google réussie</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 60px auto; padding: 0 20px; background: #0f172a; color: #f8fafc; }
    h1 { color: #22c55e; }
    .box { background: #1e293b; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 16px; margin: 16px 0; }
    code { font-size: .85rem; word-break: break-all; color: #818cf8; }
    .step { display: flex; gap: 12px; margin: 12px 0; align-items: flex-start; font-size: .9rem; }
    .num { background: #6366f1; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: .8rem; }
    button { background: #6366f1; color: white; border: none; padding: 8px 18px; border-radius: 8px; cursor: pointer; font-size: .9rem; margin-top: 8px; }
  </style>
</head>
<body>
  <h1>✅ Connexion Google réussie !</h1>
  <p>Copiez le refresh token ci-dessous et ajoutez-le comme variable d'environnement Vercel.</p>
  <div class="box">
    <strong>GOOGLE_REFRESH_TOKEN</strong><br><br>
    <code id="rt">${tokens.refresh_token}</code><br>
    <button onclick="navigator.clipboard.writeText('${tokens.refresh_token}').then(()=>this.textContent='✅ Copié !')">Copier</button>
  </div>
  <h3>Étapes suivantes :</h3>
  <div class="step"><div class="num">1</div><div>Sur <a href="https://vercel.com" style="color:#818cf8">vercel.com</a> → votre projet → Settings → Environment Variables</div></div>
  <div class="step"><div class="num">2</div><div>Ajoutez <code>GOOGLE_REFRESH_TOKEN</code> avec la valeur ci-dessus</div></div>
  <div class="step"><div class="num">3</div><div>Redéployez le projet. Les réponses seront publiées automatiquement sur Google.</div></div>
</body>
</html>`);

    } catch (err) {
        res.status(500).send(`<h2>Erreur</h2><p>${err.message}</p>`);
    }
};
