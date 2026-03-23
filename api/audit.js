// api/audit.js – Vercel Serverless Function
// Scrapes publicly visible Google Search Knowledge Panel data for a business query.
// No API key required – uses Google Search results HTML parsing via cheerio.

const fetch = require('node-fetch');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Missing query parameter: q' });

    try {
        const result = await scrapeGoogleKnowledgePanel(q);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Scrape error:', err.message);
        return res.status(500).json({ error: err.message || 'Scraping failed' });
    }
};

async function scrapeGoogleKnowledgePanel(query) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query + ' avis google')}&hl=fr&gl=fr&num=5`;

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Cache-Control': 'no-cache',
    };

    const response = await fetch(url, { headers, redirect: 'follow' });
    if (!response.ok) throw new Error(`Google responded with status ${response.status}`);
    const html = await response.text();

    const $ = cheerio.load(html);
    const result = {
        name: query,
        source: 'google_scrape',
        scraped_at: new Date().toISOString(),
    };

    // ─── Rating ─────────────────────────────────────────────
    // Multiple selectors Google uses for ratings
    const ratingSelectors = ['span.yi40Hd', 'div.BHMmbe', 'span[aria-hidden="true"]'];
    for (const sel of ratingSelectors) {
        const text = $(sel).first().text().trim();
        const num = parseFloat(text.replace(',', '.'));
        if (num >= 1 && num <= 5) { result.rating = num; break; }
    }

    // ─── Review count ────────────────────────────────────────
    const reviewSelectors = ['span.RDApEe', 'div.BHMmbe+span', '[data-async-type="reviewDialog"] span'];
    for (const sel of reviewSelectors) {
        const text = $(sel).first().text().trim();
        const match = text.match(/[\d\s]+/);
        if (match) {
            const count = parseInt(match[0].replace(/\s/g, ''), 10);
            if (count > 0) { result.user_ratings_total = count; break; }
        }
    }

    // Fallback: search for patterns like "102 avis" in visible text
    if (!result.user_ratings_total) {
        $('*').each((_, el) => {
            const text = $(el).clone().children().remove().end().text().trim();
            const match = text.match(/^(\d[\d\s]*)\s+avis/i);
            if (match && !result.user_ratings_total) {
                result.user_ratings_total = parseInt(match[1].replace(/\s/g, ''), 10);
            }
        });
    }

    // ─── Website ─────────────────────────────────────────────
    $('a').each((_, el) => {
        const href = $(el).attr('href') || '';
        const text = $(el).text().toLowerCase();
        if ((text.includes('site') || text.includes('web')) && href.startsWith('http') && !href.includes('google')) {
            if (!result.website) result.website = href;
        }
    });

    // ─── Opening hours ────────────────────────────────────────
    const hoursEl = $('[data-dtype="d3ifr"]').text() || $('div.hkUHFe').text();
    result.has_hours = hoursEl.length > 0;

    // ─── Category ─────────────────────────────────────────────
    const categoryEl = $('div.LrzXr').first().text() || $('span.YhemCb').first().text();
    result.category = categoryEl.trim() || null;

    // ─── Address ──────────────────────────────────────────────
    result.address = $('span.LrzXr').filter((_, el) => $(el).text().match(/^\d|rue|avenue|bd/i)).first().text().trim() || null;

    return result;
}
