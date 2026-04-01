// api/cron-auto-reply.js – Vercel Cron Job
// Runs every hour. Fetches reviews >= 4★ without a reply and posts AI-generated responses.
// Triggered automatically by Vercel (see vercel.json crons config).
//
// Required env vars:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
//   GOOGLE_LOCATION_NAME  – format: "accounts/{accountId}/locations/{locationId}"
//   ANTHROPIC_API_KEY     – for Claude AI responses (falls back to template)
//   CRON_SECRET           – set the same value in Vercel cron config to secure this endpoint

module.exports = async (req, res) => {
    // Security: only Vercel's cron runner (or requests with the secret) may call this
    const secret = req.headers['authorization']?.replace('Bearer ', '');
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const CLIENT_ID      = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET  = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN  = process.env.GOOGLE_REFRESH_TOKEN;
    const LOCATION_NAME  = process.env.GOOGLE_LOCATION_NAME;
    const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;

    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !LOCATION_NAME) {
        return res.status(200).json({ skipped: true, reason: 'Google credentials not configured' });
    }

    // 1. Get fresh access token
    let accessToken;
    try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
                refresh_token: REFRESH_TOKEN, grant_type: 'refresh_token',
            }).toString()
        });
        const t = await tokenRes.json();
        if (!t.access_token) throw new Error(JSON.stringify(t));
        accessToken = t.access_token;
    } catch (err) {
        return res.status(500).json({ error: 'Token refresh failed: ' + err.message });
    }

    const authHeader = { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    // 2. Fetch all reviews without a reply
    let reviews = [];
    try {
        const listRes = await fetch(
            `https://mybusiness.googleapis.com/v4/${LOCATION_NAME}/reviews?pageSize=50`,
            { headers: authHeader }
        );
        const listData = await listRes.json();
        reviews = (listData.reviews || []).filter(r => r.starRating >= 4 && !r.reviewReply);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch reviews: ' + err.message });
    }

    if (reviews.length === 0) {
        return res.status(200).json({ processed: 0, message: 'No positive reviews pending reply' });
    }

    // 3. Generate and post reply for each
    const results = [];
    for (const review of reviews) {
        const stars = { ONE:1, TWO:2, THREE:3, FOUR:4, FIVE:5 }[review.starRating] || 5;
        const author = review.reviewer?.displayName || 'Client';
        const text   = review.comment || '';
        const firstName = author.split(' ')[0];

        let replyText;
        if (ANTHROPIC_KEY) {
            try {
                const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
                    body: JSON.stringify({
                        model: 'claude-haiku-4-5-20251001',
                        max_tokens: 250,
                        messages: [{
                            role: 'user',
                            content: `Rédige une réponse chaleureuse (60-120 mots) à cet avis Google ${stars}/5 en français. Commence par "Bonjour ${firstName},". Mentionne un détail de l'avis. Signe avec "L'équipe". Texte brut uniquement.\n\nAvis : "${text}"`
                        }]
                    })
                });
                const aiData = await aiRes.json();
                replyText = aiData.content?.[0]?.text?.trim();
            } catch { /* fall through to template */ }
        }

        if (!replyText) {
            replyText = `Bonjour ${firstName},\n\nMerci beaucoup pour ce retour chaleureux ! Toute l'équipe est ravie de vous lire — c'est une vraie source de motivation. Nous espérons vous retrouver très prochainement !\n\nL'équipe`;
        }

        // Post the reply
        try {
            const postRes = await fetch(
                `https://mybusiness.googleapis.com/v4/${review.name}/reply`,
                { method: 'PUT', headers: authHeader, body: JSON.stringify({ comment: replyText }) }
            );
            results.push({ reviewId: review.name, success: postRes.ok, status: postRes.status });
        } catch (err) {
            results.push({ reviewId: review.name, success: false, error: err.message });
        }
    }

    const succeeded = results.filter(r => r.success).length;
    return res.status(200).json({ processed: reviews.length, succeeded, results });
};
