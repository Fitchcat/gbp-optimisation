// api/audit.js – Vercel Serverless Function
// Scrapes Google Search Knowledge Panel for a business name.

const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Random user agents to avoid bot detection
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

    try {
        const result = await scrape(q);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Scrape error:', err.message);
        // Return partial result so frontend can still work
        return res.status(200).json({
            name: q,
            source: 'scrape_failed',
            error: err.message,
            user_ratings_total: null,
            rating: null,
            website: null,
            photos: [],
            types: [],
            opening_hours: null
        });
    }
};

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

    // ─── Category ────────────────────────────────────────────────
    result.types = result.rating ? ['establishment'] : [];

    // ─── Photos proxy (we can't easily detect count) ─────────────
    result.photos = [];

    return result;
}
