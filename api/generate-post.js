// api/generate-post.js – Vercel Serverless Function
// Aligned with Visual Architect AI (v2.4)
const fetch = require('node-fetch');

const DEFAULTS = {
    claude: 'claude-3-5-sonnet-20240620',
    openai: 'gpt-4o',
    gemini: 'gemini-1.5-pro',
    wavespeed: 'flux'
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { theme, tone, context, visualDescription, format, charter, keys, providers, brandName, brandLocation } = req.body || {};
    
    const displayBrand = brandName || "un club de sport";
    const displayLocation = brandLocation || "";

    const wavespeedModel = providers?.media || DEFAULTS.wavespeed;
    const wavespeedKey = keys?.wavespeed || process.env.WAVESPEED_API_KEY;
    const googleKey = keys?.google || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const anthropicKey = keys?.anthropic || process.env.ANTHROPIC_API_KEY;

    try {
        // 1. Text Content Generation
        const textPrompt = `Tu es un expert en marketing digital pour ${displayBrand} ${displayLocation}. 
        Thème souhaité : ${theme}
        Ton : ${tone}
        Contexte additionnel : ${context}
        Infos Marque : ${JSON.stringify(charter?.brand || {})}
        
        Format de sortie JSON:
        {
            "title": "Titre accrocheur (max 30 chars)",
            "subtitle": "Sous-titre engageant (max 50 chars)",
            "caption": "Texte complet du post avec hashtags",
            "visual_prompt": "Detailed prompt in ENGLISH for the visual background"
        }`;

        let aiResult;
        const textAiProvider = providers?.text || 'gemini';

        if (textAiProvider === 'gemini' && googleKey) {
            aiResult = await callGemini(textPrompt, DEFAULTS.gemini, googleKey);
        } else if (textAiProvider === 'claude' && anthropicKey) {
            aiResult = await callClaude(textPrompt, DEFAULTS.claude, anthropicKey);
        } else {
            // Only fallback if NO keys are provided at all. If keys provided, they must work.
            if (googleKey || anthropicKey) throw new Error("Erreur de configuration Text AI (Vérifiez vos clés API)");
            
            aiResult = {
                title: (theme || "OFFRE EXCLUSIVE").toUpperCase(),
                subtitle: "Votre bien-être notre priorité",
                caption: `Découvrez notre focus sur : ${theme}. ${context || ''} #Fitness #Montpellier`,
                visual_prompt: visualDescription || `A professional photo for ${theme} theme in a luxury wellness club`
            };
        }

        // 2. Image Generation (WaveSpeed.ai) - Optional if media is uploaded
        const skipMedia = req.body.skipMedia || false;
        let imageUrl = "";

        if (!skipMedia) {
            if (!wavespeedKey) {
                throw new Error('Clé API WaveSpeed manquante. Veuillez la renseigner dans la Configuration API.');
            }
            imageUrl = await callWaveSpeed(aiResult.visual_prompt, wavespeedModel, wavespeedKey);
        }

        return res.status(200).json({
            success: true,
            post: {
                ...aiResult,
                image: imageUrl
            }
        });

    } catch (err) {
        console.error('[generate-post] Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
};

async function callGemini(prompt, model, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + " \nRespond ONLY in valid JSON format." }] }],
            generationConfig: { responseMimeType: "application/json" }
        })
    });
    if (!res.ok) throw new Error('Erreur Gemini API. Vérifiez votre clé.');
    const data = await res.json();
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callClaude(prompt, model, apiKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
            'x-api-key': apiKey, 
            'anthropic-version': '2023-06-01', 
            'content-type': 'application/json' 
        },
        body: JSON.stringify({ 
            model, 
            max_tokens: 1000, 
            messages: [{ role: 'user', content: prompt + " \nRespond ONLY in valid JSON format." }] 
        })
    });
    if (!res.ok) throw new Error('Erreur Claude API. Vérifiez votre clé.');
    const data = await res.json();
    const text = data.content?.[0]?.text;
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
}

async function callWaveSpeed(prompt, model, apiKey) {
    console.log('[WaveSpeed] Initiating task with prompt:', prompt.substring(0, 50) + '...');
    const res = await fetch(`https://api.wavespeed.ai/api/v3/${model}`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, size: "1024x1024" })
    });
    
    let data;
    try {
        const text = await res.text();
        console.log('[WaveSpeed] Raw response:', text.substring(0, 100));
        data = JSON.parse(text);
    } catch (e) {
        throw new Error(`Wavespeed a renvoyé une réponse invalide (non-JSON). Statut: ${res.status}`);
    }

    const taskId = data.task_id || data.id || data.prediction_id;
    if (!taskId) {
        throw new Error(data.error || 'Erreur WaveSpeed : Échec de création de la tâche. Vérifiez votre clé API ou le nom du modèle.');
    }

    let status = 'pending';
    let resultUrl = null;
    let attempts = 0;
    while (status !== 'completed' && status !== 'error' && attempts < 25) {
        await new Promise(r => setTimeout(r, 4000));
        console.log(`[WaveSpeed] Polling task ${taskId} (Attempt ${attempts + 1})...`);
        const check = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        
        // Handle cases where the endpoint check fails or is different
        if (!check.ok) {
            console.log(`[WaveSpeed] Polling failed with status ${check.status}`);
        }
        
        let statusData;
        try {
            statusData = await check.json();
            status = statusData.status;
        } catch(e) {
            status = 'pending'; // Retry if it's struggling to return valid JSON
        }
        
        console.log(`[WaveSpeed] Status: ${status}`);
        
        if (status === 'completed') {
            resultUrl = statusData.output_url || statusData.result || statusData.images?.[0]?.url || statusData.url || (statusData.output && statusData.output[0]); 
        } else if (status === 'error') {
            throw new Error(`WaveSpeed Error: ${statusData.error || 'Erreur interne de génération IA'}`);
        }
        attempts++;
    }
    
    if (!resultUrl) throw new Error('WaveSpeed Time Out : Le visuel n\'a pas pu être généré dans les temps impartis.');
    return resultUrl;
}
