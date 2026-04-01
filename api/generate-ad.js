// api/generate-ad.js - Vercel Serverless Function
// Interagit avec OpenAI (DALL-E 3) ou Fal.ai (Flux) pour concevoir l'image.

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

    const { provider, apiKey, prompt, format } = req.body;

    if (!apiKey) return res.status(400).json({ error: 'Clé API manquante' });
    if (!prompt) return res.status(400).json({ error: 'Prompt manquant' });

    // Map the format selection strictly for OpenAI (DALL-E 3 supports these specific string literals)
    let openaiSize = "1024x1024";
    if (format === '9:16') openaiSize = "1024x1792";
    if (format === '16:9') openaiSize = "1792x1024";

    // Map aspect ratios for Fal.ai (Flux)
    let falImageSize = "square_hd";
    if (format === '9:16') falImageSize = "portrait_16_9"; // Fal flux uses "portrait_16_9" string for 9:16
    if (format === '16:9') falImageSize = "landscape_16_9";

    try {
        if (provider === 'openai') {
            const response = await fetch('https://api.openai.com/v1/images/generations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: "Image de qualité publicitaire, haut de gamme, hyper-réaliste, " + prompt,
                    n: 1,
                    size: openaiSize,
                    quality: "standard"
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message || 'OpenAI API Error');
            if (data.data && data.data.length > 0) {
                return res.status(200).json({ imageUrl: data.data[0].url });
            }
            throw new Error('Réponse invalide de OpenAI');

        } else if (provider === 'falai') {
            // using fal.ai REST endpoint for flux (dev/schnell)
            const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Key ${apiKey}`
                },
                body: JSON.stringify({
                    prompt: "hyper-realistic advertisement photography, " + prompt,
                    image_size: falImageSize,
                    num_inference_steps: 4
                })
            });

            const data = await response.json();
            if (response.status >= 400) throw new Error(data.detail || 'Fal.ai API Error');
            if (data.images && data.images.length > 0) {
                return res.status(200).json({ imageUrl: data.images[0].url });
            }
            throw new Error('Réponse invalide de Fal.ai');
        } else if (provider === 'wavespeed') {
            const endpoint = (req.body.wsEndpoint || 'https://api.wavespeed.ai/api/v3').replace(/\/$/, '');
            let targetModel = req.body.model || 'wavespeed-ai/flux-dev';
            
            // Correction automatique pour ceux qui ont gardé l'ancien défaut "flux"
            if (targetModel.toLowerCase() === 'flux') targetModel = 'flux-dev';
            
            // Auto-correction du préfixe si l'utilisateur tape juste 'flux-dev' ou 'flux-schnell'
            if (!targetModel.includes('/')) {
                // S'il a tapé "midjourney", on adaptera, mais par défaut ils ont "wavespeed-ai/"
                targetModel = `wavespeed-ai/${targetModel}`; 
            }
            
            // 1. Initier la tâche
            const response = await fetch(`${endpoint}/${targetModel}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({ prompt })
            });

            let data;
            try { data = await response.json(); } 
            catch (e) { throw new Error(`Wavespeed a renvoyé une réponse non-JSON. Vérifiez l'URL de l'Endpoint Avancé.`); }

            if (data.code !== 200 || !data.data) {
                throw new Error(data.message || 'Erreur API Wavespeed - Requête refusée.');
            }

            const taskId = data.data.id || data.data.task_id;
            if (!taskId) throw new Error('Erreur WaveSpeed : Échec de création de la tâche (ID manquant).');

            // 2. Polling (sondage)
            let status = 'pending';
            let resultUrl = null;
            let attempts = 0;
            
            while (status !== 'completed' && status !== 'failed' && attempts < 25) {
                await new Promise(r => setTimeout(r, 4000));
                
                const check = await fetch(`${endpoint}/predictions/${taskId}/result`, {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                
                let statusData;
                try {
                    statusData = await check.json();
                    if (statusData.data) {
                        status = statusData.data.status || 'pending';
                    }
                } catch(e) { status = 'pending'; }
                
                if (status === 'completed') {
                    const outputs = statusData.data.outputs;
                    if (outputs && outputs.length > 0) {
                        resultUrl = outputs[0];
                    }
                } else if (status === 'failed') {
                    throw new Error(`WaveSpeed Image Failed: ${statusData.data.error || 'Erreur interne Wavespeed'}`);
                }
                attempts++;
            }
            
            if (!resultUrl) throw new Error('WaveSpeed Timeout : Le visuel n\'a pas pu être généré à temps (Status: ' + status + ').');
            return res.status(200).json({ imageUrl: resultUrl });
            
        } else {
            return res.status(400).json({ error: 'Fournisseur non supporté' });
        }

    } catch (err) {
        console.error('Ad Generation Error:', err.message);
        return res.status(500).json({ error: err.message });
    }
};
