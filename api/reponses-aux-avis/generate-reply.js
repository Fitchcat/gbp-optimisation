// api/generate-reply.js – Vercel Serverless Function
// Generates a warm French reply to a Google review.
// Supports: Claude (Anthropic), OpenAI (GPT), Google Gemini
//
// Body params:
//   review        – { author, rating, text }
//   businessName  – string
//   provider      – 'claude' | 'openai' | 'gemini'  (default: 'claude')
//   model         – model ID (optional, uses provider default)
//   anthropicKey  – Anthropic API key (overrides env ANTHROPIC_API_KEY)
//   openaiKey     – OpenAI API key (overrides env OPENAI_API_KEY)
//   geminiKey     – Gemini API key (overrides env GEMINI_API_KEY)

const DEFAULTS = {
    claude: 'claude-haiku-4-5-20251001',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { review, businessName, provider = 'claude', model, anthropicKey, openaiKey, geminiKey } = req.body || {};
    if (!review || !review.text) return res.status(400).json({ error: 'Missing review data' });

    const firstName = review.author.split(' ')[0];
    const biz = businessName || 'notre établissement';
    const ratingLabel = review.rating >= 4 ? 'positif' : review.rating >= 3 ? 'neutre' : 'négatif';
    const selectedModel = model || DEFAULTS[provider] || DEFAULTS.claude;

    const prompt = `Rédige une réponse à cet avis Google ${ratingLabel} (${review.rating}/5 étoiles) pour "${biz}" en français.

Auteur : ${review.author}
Avis : "${review.text}"

Règles absolues :
- Commence directement par "Bonjour ${firstName},"
- Ton chaleureux, sincère et humain — jamais robotique ni générique
- Entre 60 et 120 mots
- Pour avis négatif (1-2★) : empathie sincère, excuses sans justifications, propose un contact direct (sans donner de coordonnées)
- Pour avis neutre (3★) : remerciements, reconnaître ce qui peut être amélioré, inviter à revenir
- Pour avis positif (4-5★) : remerciements spécifiques aux détails mentionnés dans l'avis, invite à revenir
- Signe avec "L'équipe ${biz}"
- Texte brut uniquement, aucun markdown ni emoji`;

    try {
        let reply;
        if (provider === 'openai') {
            reply = await callOpenAI(prompt, selectedModel, openaiKey || process.env.OPENAI_API_KEY);
        } else if (provider === 'gemini') {
            reply = await callGemini(prompt, selectedModel, geminiKey || process.env.GEMINI_API_KEY);
        } else {
            reply = await callClaude(prompt, selectedModel, anthropicKey || process.env.ANTHROPIC_API_KEY);
        }

        if (reply) return res.status(200).json({ reply, provider, model: selectedModel });
        return res.status(200).json({ reply: buildFallback(review, biz, firstName), demo: true });

    } catch (err) {
        console.error(`[generate-reply] ${provider} error:`, err.message);
        return res.status(200).json({ reply: buildFallback(review, biz, firstName), demo: true, error: err.message });
    }
};

// ── Claude ────────────────────────────────────────────────────────
async function callClaude(prompt, model, apiKey) {
    if (!apiKey) return null;
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 250, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    if (!data.content?.[0]?.text) throw new Error(data.error?.message || 'Empty Claude response');
    return data.content[0].text.trim();
}

// ── OpenAI ────────────────────────────────────────────────────────
async function callOpenAI(prompt, model, apiKey) {
    if (!apiKey) return null;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 250, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await res.json();
    if (!data.choices?.[0]?.message?.content) throw new Error(data.error?.message || 'Empty OpenAI response');
    return data.choices[0].message.content.trim();
}

// ── Gemini ────────────────────────────────────────────────────────
async function callGemini(prompt, model, apiKey) {
    if (!apiKey) return null;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 250 }
        })
    });
    const data = await res.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error(data.error?.message || 'Empty Gemini response');
    return data.candidates[0].content.parts[0].text.trim();
}

function buildFallback(review, biz, firstName) {
    if (review.rating >= 4) {
        return `Bonjour ${firstName},\n\nMerci beaucoup pour ce retour chaleureux, il nous touche vraiment ! Toute l'équipe sera ravie de vous lire — c'est exactement ce qui nous motive chaque jour. Nous espérons vous retrouver très prochainement !\n\nL'équipe ${biz}`;
    }
    if (review.rating === 3) {
        return `Bonjour ${firstName},\n\nMerci de prendre le temps de partager votre expérience. Nous sommes désolés que votre visite n'ait pas été entièrement à la hauteur de vos attentes. Vos retours nous aident à progresser. N'hésitez pas à nous contacter directement.\n\nL'équipe ${biz}`;
    }
    return `Bonjour ${firstName},\n\nNous vous remercions d'avoir pris le temps de nous faire part de votre expérience. Nous sommes sincèrement désolés pour ce désagrément. N'hésitez pas à nous contacter directement — nous sommes à votre écoute et souhaitons trouver une solution.\n\nL'équipe ${biz}`;
}
