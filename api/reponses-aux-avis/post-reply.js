// api/post-reply.js – Vercel Serverless Function
// Posts an approved reply to a Google Business Profile review.
//
// Required env vars:
//   GOOGLE_CLIENT_ID      – OAuth client ID from Google Cloud Console
//   GOOGLE_CLIENT_SECRET  – OAuth client secret
//   GOOGLE_REFRESH_TOKEN  – Long-lived token obtained via /api/oauth-start flow
//
// Review name format: "accounts/{accountId}/locations/{locationId}/reviews/{reviewId}"

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { reviewName, replyText } = req.body || {};
    if (!reviewName || !replyText) {
        return res.status(400).json({ error: 'Missing reviewName or replyText' });
    }

    const CLIENT_ID     = req.body.googleClientId     || process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = req.body.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = req.body.googleRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        return res.status(200).json({
            demo: true,
            message: 'Mode démo — variables GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET et GOOGLE_REFRESH_TOKEN non configurées.'
        });
    }

    // 1. Exchange refresh token for a fresh access token
    let accessToken;
    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id:     CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: REFRESH_TOKEN,
                grant_type:    'refresh_token',
            }).toString()
        });
        const tokenData = await tokenRes.json();
        if (!tokenData.access_token) {
            console.error('[post-reply] Token error:', tokenData);
            return res.status(401).json({ error: 'Impossible de renouveler le token Google. Reconnectez le compte.' });
        }
        accessToken = tokenData.access_token;
    } catch (err) {
        return res.status(500).json({ error: 'Erreur réseau lors du renouvellement du token: ' + err.message });
    }

    // 2. Post the reply via Google My Business API
    try {
        const apiUrl = `https://mybusiness.googleapis.com/v4/${reviewName}/reply`;
        const apiRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ comment: replyText })
        });

        if (apiRes.ok) {
            return res.status(200).json({ success: true });
        }

        const errData = await apiRes.json();
        console.error('[post-reply] GMB API error:', errData);
        return res.status(apiRes.status).json({
            error: errData?.error?.message || 'Erreur API Google Business Profile',
            details: errData
        });
    } catch (err) {
        return res.status(500).json({ error: 'Erreur réseau lors de la publication: ' + err.message });
    }
};
