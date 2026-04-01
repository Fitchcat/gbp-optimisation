// src/ad_generator.js
// Logique frontend autonome pour Ad & Post Generator

document.addEventListener('DOMContentLoaded', () => {
    // ─── STATE & DOM ───
    const state = {
        type: 'image',
        format: '1:1',
        overlay: 'yes',
        provider: 'openai',
        canvasBgImage: null // Stocke l'illustration générée
    };

    // Load Google Fonts for Canvas
    WebFontConfig = {
        google: { families: ['Inter:600,800', 'Outfit:600,800', 'Montserrat:600,800', 'Bebas Neue:400'] },
        active: function() { drawCanvas(); } // Redraw once loaded
    };
    (function() {
        var wf = document.createElement('script');
        wf.src = 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js';
        wf.type = 'text/javascript';
        wf.async = 'true';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(wf, s);
    })();

    // ─── WIZARD NAVIGATION ───
    const step1 = document.getElementById('step-1');
    const step2 = document.getElementById('step-2');
    const node1 = document.getElementById('node-1');
    const node2 = document.getElementById('node-2');
    const progressLine = document.getElementById('progress-line');

    document.getElementById('btn-next').addEventListener('click', () => {
        step1.classList.remove('active');
        step2.classList.add('active');
        node1.classList.add('done');
        node2.classList.add('active');
        progressLine.style.width = '100%';
        updateProviderLabel();
    });

    document.getElementById('btn-prev').addEventListener('click', () => {
        step2.classList.remove('active');
        step1.classList.add('active');
        node2.classList.remove('active');
        node1.classList.remove('done');
        progressLine.style.width = '0%';
    });

    // ─── RADIO PILLS LOGIC ───
    function bindRadioPills(containerId, stateKey, callback) {
        const container = document.getElementById(containerId);
        const labels = container.querySelectorAll('.radio-pill');
        labels.forEach(lbl => {
            const input = lbl.querySelector('input');
            input.addEventListener('change', () => {
                labels.forEach(l => l.classList.remove('selected'));
                lbl.classList.add('selected');
                state[stateKey] = input.value;
                if(callback) callback();
            });
        });
    }

    bindRadioPills('opt-type', 'type');
    bindRadioPills('opt-format', 'format', updateCanvasSize);
    bindRadioPills('opt-overlay', 'overlay', toggleOverlayOptions);

    // ─── API KEYS MANAGEMENT ───
    const gbpKeys = JSON.parse(localStorage.getItem('gbp_api_keys')) || {};
    
    // Initial load
    const apiKeyInput = document.getElementById('p_api_key');
    apiKeyInput.value = gbpKeys[state.provider] || '';

    apiKeyInput.addEventListener('input', (e) => {
        gbpKeys[state.provider] = e.target.value.trim();
        localStorage.setItem('gbp_api_keys', JSON.stringify(gbpKeys));
    });

    document.getElementById('p_ai_provider').addEventListener('change', (e) => {
        state.provider = e.target.value;
        updateProviderLabel();
        
        // Restore key for this provider
        apiKeyInput.value = gbpKeys[state.provider] || '';
        
        // Show/Hide custom inputs for Wavespeed
        const isWs = state.provider === 'wavespeed';
        document.getElementById('wavespeed-model-group').style.display = isWs ? 'flex' : 'none';
        document.getElementById('ws-endpoint-group').style.display = isWs ? 'flex' : 'none';
    });
    
    const wsModelSelect = document.getElementById('p_ai_model_select');
    if (wsModelSelect) {
        wsModelSelect.addEventListener('change', (e) => {
            document.getElementById('p_ai_model_custom').style.display = e.target.value === 'custom' ? 'block' : 'none';
        });
    }

    function toggleOverlayOptions() {
        document.getElementById('overlay-options').style.display = state.overlay === 'yes' ? 'flex' : 'none';
        drawCanvas();
    }

    function updateProviderLabel() {
        const labels = { 'openai': 'OpenAI (DALL-E)', 'falai': 'Fal.ai', 'wavespeed': 'Wavespeed' };
        document.getElementById('lbl-api-provider').textContent = labels[state.provider];
    }

    // ─── CANVAS RENDERING ───
    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');

    // Load a default placeholder gradient
    function initCanvasBg() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1080; tempCanvas.height = 1080;
        const tctx = tempCanvas.getContext('2d');
        const grd = tctx.createLinearGradient(0, 0, 1080, 1080);
        grd.addColorStop(0, "#1e1b4b");
        grd.addColorStop(1, "#8b5cf6");
        tctx.fillStyle = grd;
        tctx.fillRect(0, 0, 1080, 1080);
        
        const img = new Image();
        img.src = tempCanvas.toDataURL();
        img.onload = () => {
            state.canvasBgImage = img;
            drawCanvas();
        };
    }

    function updateCanvasSize() {
        let w = 1080, h = 1080;
        if (state.format === '9:16') { w = 1080; h = 1920; }
        else if (state.format === '16:9') { w = 1920; h = 1080; }
        
        // Smoothly animate resize using CSS wrapper, but actually resize canvas immediately
        canvas.width = w;
        canvas.height = h;
        drawCanvas();
    }

    function drawCanvas() {
        if(!state.canvasBgImage) return;
        
        // 1. Draw Background Image
        // Scale to fill
        const hRatio = canvas.width / state.canvasBgImage.width;
        const vRatio = canvas.height / state.canvasBgImage.height;
        const ratio  = Math.max(hRatio, vRatio);
        const centerShiftX = (canvas.width - state.canvasBgImage.width * ratio) / 2;
        const centerShiftY = (canvas.height - state.canvasBgImage.height * ratio) / 2;
        ctx.clearRect(0,0, canvas.width, canvas.height);
        ctx.drawImage(state.canvasBgImage, 0, 0, state.canvasBgImage.width, state.canvasBgImage.height,
                      centerShiftX, centerShiftY, state.canvasBgImage.width * ratio, state.canvasBgImage.height * ratio);

        // 2. Overlay Text if requested
        if (state.overlay === 'yes') {
            const title = document.getElementById('p_title').value || '';
            const subtitle = document.getElementById('p_subtitle').value || '';
            const fontFam = document.getElementById('p_font').value || 'Inter';
            const color = document.getElementById('p_color').value || '#ffffff';

            // Dark gradient overlay at bottom for text readability
            const grd = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height);
            grd.addColorStop(0, "rgba(0,0,0,0)");
            grd.addColorStop(1, "rgba(0,0,0,0.85)");
            ctx.fillStyle = grd;
            ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

            // Draw Texts
            ctx.textAlign = "center";
            ctx.fillStyle = color;
            
            // Title
            ctx.font = `800 ${canvas.width * 0.08}px '${fontFam}'`;
            // Simple shadow for pop
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 15;
            ctx.shadowOffsetY = 5;
            ctx.fillText(title, canvas.width / 2, canvas.height - (canvas.height * 0.15));

            // Subtitle
            ctx.font = `600 ${canvas.width * 0.04}px '${fontFam}'`;
            ctx.fillStyle = "rgba(255,255,255,0.9)";
            ctx.shadowBlur = 10;
            ctx.fillText(subtitle, canvas.width / 2, canvas.height - (canvas.height * 0.08));
            
            // Reset shadow
            ctx.shadowColor = "transparent";
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;
        }
    }

    // Attach listeners for live update
    ['p_title', 'p_subtitle', 'p_font', 'p_color'].forEach(id => {
        document.getElementById(id).addEventListener('input', drawCanvas);
        document.getElementById(id).addEventListener('change', drawCanvas);
    });
    document.getElementById('btn-refresh').addEventListener('click', drawCanvas);

    // ─── GENERATION LOGIC ───
    document.getElementById('btn-generate').addEventListener('click', async () => {
        const apiKey = document.getElementById('p_api_key').value.trim();
        const prompt = document.getElementById('p_prompt').value.trim();
        
        let aiModel = null;
        if (state.provider === 'wavespeed') {
            const wsSelect = document.getElementById('p_ai_model_select');
            aiModel = wsSelect ? wsSelect.value : 'flux-dev';
            if (aiModel === 'custom') {
                aiModel = document.getElementById('p_ai_model_custom')?.value.trim();
                if (!aiModel) { alert("Veuillez saisir le nom exact de votre modèle personnalisé Wavespeed."); return; }
            }
        }
        
        const wsEndpoint = document.getElementById('p_ws_endpoint')?.value.trim();
        
        if (!apiKey) { alert('Veuillez entrer votre clé API pour générer.'); return; }
        if (!prompt) { alert('Veuillez entrer une description (prompt).'); return; }

        const loader = document.getElementById('loader');
        loader.style.display = 'flex';

        try {
            const resp = await fetch('/api/generate-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: state.provider,
                    apiKey: apiKey,
                    prompt: prompt,
                    format: state.format,
                    model: aiModel,
                    wsEndpoint: wsEndpoint
                })
            });

            const data = await resp.json();
            if(!resp.ok) throw new Error(data.error || 'Erreur API inconnue');

            // data.imageUrl holds the generated URL
            const img = new Image();
            img.crossOrigin = "Anonymous"; // to allow canvas export
            img.onload = () => {
                state.canvasBgImage = img;
                drawCanvas();
                loader.style.display = 'none';
            };
            img.onerror = () => {
                throw new Error("Impossible de charger l'image générée (CORS ou URL expirée)");
            };
            img.src = data.imageUrl;

        } catch (e) {
            console.error(e);
            alert("Erreur de génération : " + e.message);
            loader.style.display = 'none';
        }
    });

    // ─── DOWNLOAD LOGIC ───
    document.getElementById('btn-download').addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `ad_post_${Date.now()}.jpg`;
        // Convert to JPG for smaller file size
        link.href = canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    });

    // Initialize
    updateCanvasSize();
    initCanvasBg();
});
