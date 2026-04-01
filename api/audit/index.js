// api/audit.js – Vercel Serverless Function
// Fetches business data from Google.
// Strategy: Google Places API (if GOOGLE_PLACES_API_KEY is set) → scraping fallback.
//
// To enable real data: set GOOGLE_PLACES_API_KEY in your environment variables.
// Get a free key at: https://console.cloud.google.com → APIs → Places API

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing ?q= parameter' });

    // ── Priority 1: Google Places API ──────────────────────────────
    const PLACES_KEY = req.query.placesKey || process.env.GOOGLE_PLACES_API_KEY;
    let apiFailedMessage = null;
    if (PLACES_KEY) {
        try {
            const result = await fetchFromPlacesApi(q, PLACES_KEY);
            if (result) return res.status(200).json(result);
        } catch (err) {
            console.error('Places API error, falling back to scrape:', err.message);
            apiFailedMessage = err.message;
            // Ne pas retourner l'erreur directement, on tente le scrape
        }
    }

    // ── Priority 2: Scraping fallback ──────────────────────────────
    try {
        const result = await scrape(q);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Scrape error:', err.message);
        return res.status(200).json({
            name: q, source: 'scrape_failed', error: err.message,
            user_ratings_total: null, rating: null, website: null,
            photos: [], types: [], opening_hours: null
        });
    }
};

async function fetchFromPlacesApi(query, key) {
    // Text Search → returns best matching place with all useful fields
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=fr&key=${key}`;
    const res = await fetch(url, { timeout: 8000 });
    const data = await res.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(data.status + (data.error_message ? ': ' + data.error_message : ''));
    }

    const p = data.results[0];

    // Fetch full details (website + opening_hours are not in text search results)
    let website = null;
    let opening_hours = null;
    let google_url = null;
    let reviews = [];
    if (p.place_id) {
        try {
            const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${p.place_id}&fields=website,opening_hours,url,reviews&language=fr&key=${key}`;
            const detailRes = await fetch(detailUrl, { timeout: 6000 });
            const detail = await detailRes.json();
            if (detail.status === 'OK' && detail.result) {
                website = detail.result.website || null;
                opening_hours = detail.result.opening_hours || null;
                google_url = detail.result.url || null;
                reviews = detail.result.reviews || [];
            }
        } catch { /* non-blocking */ }
    }

    return {
        name:               p.name,
        formatted_address:  p.formatted_address,
        rating:             p.rating || null,
        user_ratings_total: p.user_ratings_total || 0,
        website,
        photos:             p.photos || [],
        types:              p.types || [],
        opening_hours,
        place_id:           p.place_id,
        google_url:         google_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`,
        source:             'google_places_api',
        // New heuristic flags
        has_replies:        (reviews || []).some(r => r.author_name && (r.text || r.rating) && (r.relative_time_description || r.time)), 
        // Note: owner_answer is the field name in Places API for owner responses
        has_owner_reply:    (reviews || []).some(r => r.author_name && r.owner_answer),
        has_questions:      false, // Placeholder for scrape
        has_posts:          false, // Placeholder for scrape
        has_services:       (p.types || []).length > 5, 
        has_products:       false,
        address_components: p.address_components || []
    };
}

async function scrape(query) {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    // Try multiple Google search formats
    const urls = [
        `https://www.google.com/search?q=${encodeURIComponent(query + ' site avis google maps')}&hl=fr&gl=fr`,
        `https://www.google.fr/search?q=${encodeURIComponent(query)}&hl=fr`,
    ];

    for (const url of urls) {
        const html = await fetchHtml(url, ua);
        if (!html) continue;

        const data = parseHtml(html, query);
        if (data.rating || data.user_ratings_total) {
            data.source = 'google_scrape';
            return data;
        }
    }

    // If all failed: return what we could partially get anyway
    return { name: query, source: 'scrape_partial', user_ratings_total: null, rating: null, website: null, photos: [], types: [], opening_hours: null };
}

async function fetchHtml(url, ua) {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': ua,
                'Accept-Language': 'fr-FR,fr;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Referer': 'https://www.google.fr/',
            },
            follow: 5,
            timeout: 8000
        });
        if (!res.ok) return null;
        return res.text();
    } catch { return null; }
}

function parseHtml(html, query) {
    const $ = cheerio.load(html);
    const result = { name: query };

    // ─── Rating: try multiple known selectors ────────────────────
    const ratingPatterns = [
        () => $('span.yi40Hd').first().text(),
        () => $('div.BHMmbe').first().text(),
        () => $('[data-attrid="kc:/collection/knowledge_panels/has_ratings:star_score"]').first().text(),
        () => {
            let found = null;
            $('span').each((_, el) => {
                const t = $(el).text().trim().replace(',', '.');
                const n = parseFloat(t);
                if (!found && n >= 1 && n <= 5 && t.length <= 4) found = t;
            });
            return found || '';
        }
    ];
    for (const fn of ratingPatterns) {
        const t = fn();
        const n = parseFloat((t || '').toString().replace(',', '.'));
        if (n >= 1 && n <= 5) { result.rating = n; break; }
    }

    // ─── Review count ─────────────────────────────────────────────
    const fullText = $('body').text();
    const reviewMatch = fullText.match(/(\d[\d\s]{0,5})\s*avis/i);
    if (reviewMatch) {
        const count = parseInt(reviewMatch[1].replace(/\s/g, ''), 10);
        if (count > 0 && count < 500000) result.user_ratings_total = count;
    }

    // ─── Website ──────────────────────────────────────────────────
    $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href.startsWith('http') && !href.includes('google') && !href.includes('facebook') && !result.website) {
            const text = $(el).text().toLowerCase();
            if (text.includes('site') || text.includes('web') || text.includes('réservation') || text.includes('booking')) {
                result.website = href;
            }
        }
    });

    // ─── Has hours ───────────────────────────────────────────────
    const hasHours = fullText.match(/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i);
    result.opening_hours = hasHours ? { weekday_text: ['L','M','M','J','V','S','D'] } : null;

    // ─── Detect advanced sections ────────────────────────────────
    result.has_questions = fullText.includes('Questions et réponses') || html.includes('id="questions-and-answers"');
    result.has_posts     = fullText.includes('Mises à jour') || fullText.includes('Google Post');
    result.has_services  = fullText.includes('Services') || fullText.includes('Prestations');
    result.has_products  = fullText.includes('Produits') || fullText.includes('Boutique');
    result.has_replies   = fullText.includes('réponse du propriétaire') || fullText.includes('Owner reply');
    result.has_videos    = fullText.includes('Vidéos') || html.includes('type="video"');

    // ─── Category ────────────────────────────────────────────────
    result.types = result.rating ? ['establishment'] : [];

    // ─── Photos proxy (we can't easily detect count) ─────────────
    result.photos = [];

    return result;
}
