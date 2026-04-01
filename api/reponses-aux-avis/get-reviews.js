// api/get-reviews.js – Vercel Serverless Function
// Fetches Google reviews for a place using the Places Details API.
// No OAuth required — uses the same GOOGLE_PLACES_API_KEY as the audit.
//
// Query params:
//   placeId   – Google Place ID (e.g. ChIJ...)
//   placesKey – API key (overrides env GOOGLE_PLACES_API_KEY)

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { placeId, placesKey } = req.query;
    if (!placeId) return res.status(400).json({ error: 'Missing placeId' });

    const API_KEY = placesKey || process.env.GOOGLE_PLACES_API_KEY;
    if (!API_KEY) {
        return res.status(200).json({ reviews: [], demo: true, reason: 'No API key' });
    }

    try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json`
            + `?place_id=${encodeURIComponent(placeId)}`
            + `&fields=name,reviews`
            + `&reviews_sort=newest`
            + `&language=fr`
            + `&key=${API_KEY}`;

        const apiRes = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await apiRes.json();

        if (data.status !== 'OK') {
            const reason = data.status === 'REQUEST_DENIED'
                ? `REQUEST_DENIED — vérifiez que "Places API" est bien activée dans Google Cloud Console et que la clé n'a pas de restriction bloquante. Message: ${data.error_message || ''}`
                : `${data.status}: ${data.error_message || ''}`;
            console.error('[get-reviews] Places API:', reason);
            return res.status(200).json({ reviews: [], demo: true, reason });
        }

        const reviews = (data.result?.reviews || []).map(r => ({
            id:              r.time.toString(),
            author:          r.author_name,
            rating:          r.rating,
            text:            r.text || '',
            date:            r.relative_time_description,
            profilePhoto:    r.profile_photo_url || null,
            replied:         false,
            aiReply:         null,
            googleReviewName: null, // OAuth needed to reply — filled later when connected
        }));

        return res.status(200).json({ reviews, source: 'google_places_api' });

    } catch (err) {
        console.error('[get-reviews] Error:', err.message);
        return res.status(200).json({ reviews: [], demo: true, reason: err.message });
    }
};
