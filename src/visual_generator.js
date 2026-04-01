/**
 * Visual Architect AI - Core Logic (v2.4)
 * Handles Multi-Format Generation: Single Image, Carousel (3), and Video.
 * Aligned with visual_post_generator.html (theme, tone, context).
 */

const STATE = {
    format: 'single', // 'single' | 'carousel' | 'video'
    isGenerating: false,
    mockMode: false,
    mediaType: 'image',
    establishments: JSON.parse(localStorage.getItem('gbp_establishments')) || [],
    currentEstablishmentId: localStorage.getItem('gbp_currentId')
};

const getCurrentEst = () => STATE.establishments.find(e => e.id === STATE.currentEstablishmentId) || { name: 'Votre Entreprise', location: '' };

// ==========================================
//  UI DOM ELEMENTS
// ==========================================
const DOM = {
    formatTabs: document.querySelectorAll('#content-type-tabs .format-tab'),
    generateBtn: document.getElementById('generate-btn'),
    viewport: document.getElementById('results-container'),
    
    // Toast
    toast: document.getElementById('toast'),
    
    inputs: {
        // Media Source & Upload
        mediaSourceTabs: document.getElementById('media-source-tabs'),
        mediaSource: { value: 'ai' }, // Pseudo-element to keep minimal changes elsewhere or read from state
        uploadContainer: document.getElementById('upload-container'),
        mediaUpload: document.getElementById('media-upload'),
        aiContainer: document.getElementById('ai-container'),
        
        // Brand
        logoInput: document.getElementById('brand-logo-input'),
        logoStatus: document.getElementById('logo-status'),
        sizeLogo: document.getElementById('size-logo'),
        
        // Others
        ctaTitle: document.getElementById('cta-title'),
        ctaLink: document.getElementById('cta-link'),
        aspectRatio: document.getElementById('aspect-ratio'),
        tone: document.getElementById('tone'),
        context: document.getElementById('context'),

        // Charter
        fontTitle: document.getElementById('font-title'),
        fontSubtitle: document.getElementById('font-subtitle'),
        colorTitle: document.getElementById('color-title'),
        colorSubtitle: document.getElementById('color-subtitle'),
        sizeTitle: document.getElementById('size-title'),
        sizeSubtitle: document.getElementById('size-subtitle'),

        // Keys
        keyWavespeed: document.getElementById('key-wavespeed'),
        keyGoogle: document.getElementById('key-google')
    }
};

// ==========================================
//  UTILITIES
// ==========================================
const showToast = (msg) => {
    DOM.toast.textContent = msg;
    DOM.toast.style.transform = 'translateY(0)';
    DOM.toast.style.opacity = '1';
    setTimeout(() => {
        DOM.toast.style.transform = 'translateY(100px)';
        DOM.toast.style.opacity = '0';
    }, 4000);
};

const showLoading = () => {
    DOM.viewport.innerHTML = `
        <div style="text-align: center; margin: auto;">
            <div class="skeleton" style="width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 1.5rem;"></div>
            <h3 style="font-family: 'Syne', sans-serif; font-size: 1.2rem; color: var(--accent);">Architecturation en cours...</h3>
            <p style="color: var(--text-secondary); margin-top: 0.5rem;">Nos modèles synchronisent les calques visuels.</p>
        </div>
    `;
};

const MOCK_ASSETS = {
    images: ["https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800"],
    video: "https://assets.mixkit.co/videos/preview/mixkit-fitness-woman-running-on-the-treadmill-at-the-gym-23428-large.mp4"
};

// ==========================================
//  GENERATION LOGIC
// ==========================================
async function generatePost() {
    if (STATE.isGenerating) return;
    STATE.isGenerating = true;
    DOM.generateBtn.disabled = true;
    showLoading();

    const isUpload = DOM.inputs.mediaSource.value === 'upload';
    
    const params = {
        tone: DOM.inputs.tone.value,
        context: DOM.inputs.context.value,
        format: STATE.format,
        mediaSource: DOM.inputs.mediaSource.value,
        charter: {
            colors: { 
                title: DOM.inputs.colorTitle.value, 
                subtitle: DOM.inputs.colorSubtitle.value 
            },
            typography: {
                titleFont: DOM.inputs.fontTitle.value,
                subtitleFont: DOM.inputs.fontSubtitle.value,
                titleSize: DOM.inputs.sizeTitle.value,
                subtitleSize: DOM.inputs.sizeSubtitle.value,
                logoSize: DOM.inputs.sizeLogo.value
            },
            brand: {
                logo: STATE.brandLogo,
                cta: DOM.inputs.ctaTitle.value,
                ctaLink: DOM.inputs.ctaLink.value
            }
        },
        keys: {
            wavespeed: DOM.inputs.keyWavespeed.value,
            google: DOM.inputs.keyGoogle.value
        },
        brandName: getCurrentEst().name,
        brandLocation: getCurrentEst().location
    };

    try {
        let result;
        
        // If we have uploaded media, skip AI media generation but still fetch text if needed
        if (isUpload && !STATE.uploadedMedia) {
            throw new Error("Veuillez d'abord sélectionner un fichier.");
        }

        const response = await fetch('/api/generate-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...params,
                skipMedia: isUpload
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Err API');
        }
        result = await response.json();
        
        // Override image/video if uploaded
        if (isUpload) {
            if (STATE.mediaType === 'video') result.post.video = STATE.uploadedMedia;
            else result.post.image = STATE.uploadedMedia;
        }

        if (STATE.format === 'single') renderSingle(params, result.post);
        else if (STATE.format === 'carousel') renderCarousel(params, result.post);
        else if (STATE.format === 'video') renderVideo(params, result.post);

        showToast("Contenu créé !");
    } catch (err) {
        console.error(err);
        showToast("Échec: " + err.message);
    } finally {
        STATE.isGenerating = false;
        DOM.generateBtn.disabled = false;
    }
}

// ==========================================
//  RENDERERS
// ==========================================
function renderSingle(params, postData) {
    const title = postData?.title || "POST TITLE";
    const subtitle = postData?.subtitle || "Post Subtitle";
    const imageUrl = postData?.image || MOCK_ASSETS.images[0];
    const typo = params.charter.typography;
    const logoSize = typo.logoSize || 60;
    const pos = params.charter.position || 'bottom';
    
    loadGoogleFont(typo.titleFont);
    loadGoogleFont(typo.subtitleFont);

    const posStyles = {
        bottom: 'justify-content: flex-end; text-align: left;',
        center: 'justify-content: center; text-align: center;',
        top: 'justify-content: flex-start; text-align: left;',
        'bottom-left': 'justify-content: flex-end; text-align: left; align-items: flex-start;'
    };

    DOM.viewport.innerHTML = `
        <div class="single-post-preview" style="font-family: '${typo.titleFont}', sans-serif;">
            <div class="media-card">
                <div class="media-aspect">
                    ${STATE.brandLogo ? `<img src="${STATE.brandLogo}" class="brand-logo-overlay" style="width: ${logoSize}px;">` : ''}
                    <img src="${imageUrl}" class="media-img">
                    <div class="text-overlay" style="${posStyles[pos]}">
                        <div class="overlay-title" style="font-size: ${typo.titleSize}rem; font-family: '${typo.titleFont}', sans-serif;">${title}</div>
                        <div class="overlay-subtitle" style="font-size: ${typo.subtitleSize}rem; font-family: '${typo.subtitleFont}', sans-serif;">${subtitle}</div>
                    </div>
                </div>
                <div class="post-meta">
                    <div class="post-caption">${postData?.caption?.replace(/\n/g, '<br>') || ''}</div>
                    <div class="action-btns">
                        <button class="btn-meta" onclick="copyText('cap')"><i class="fas fa-copy"></i> Copier Texte</button>
                        <button class="btn-meta" style="background: var(--accent);"><i class="fas fa-download"></i> Télécharger</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCarousel(params, postData) {
    const typo = params.charter.typography;
    const logoSize = typo.logoSize || 60;
    loadGoogleFont(typo.titleFont);
    
    let html = `<div class="carousel-preview">`;
    [1,2,3].forEach(idx => {
        html += `
            <div class="carousel-item">
                <div class="media-card">
                    <div class="media-aspect">
                        ${STATE.brandLogo ? `<img src="${STATE.brandLogo}" class="brand-logo-overlay" style="width: ${logoSize}px;">` : ''}
                        <img src="${MOCK_ASSETS.images[0]}" class="media-img">
                        <div class="text-overlay">
                            <span style="font-size: 0.65rem; color: #fff; margin-bottom: 5px; opacity: 0.7;">SLIDE ${idx}/3</span>
                            <div class="overlay-title" style="font-size: 1.2rem;">${postData?.title || 'SLIDE '+idx}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    html += `</div>`;
    DOM.viewport.innerHTML = html;
}

function renderVideo(params, postData) {
    const typo = params.charter.typography;
    const logoSize = typo.logoSize || 60;
    loadGoogleFont(typo.titleFont);
    
    const videoUrl = postData?.video || MOCK_ASSETS.video;
    
    DOM.viewport.innerHTML = `
        <div class="video-preview" style="font-family: '${typo.titleFont}', sans-serif;">
            ${STATE.brandLogo ? `<img src="${STATE.brandLogo}" class="brand-logo-overlay" style="width: ${logoSize}px;">` : ''}
            <video autoplay muted loop style="width: 100%; height: 100%; object-fit: cover;">
                <source src="${videoUrl}" type="video/mp4">
            </video>
            <div class="video-label">PREVIEW AI</div>
            <div class="text-overlay">
                <div class="overlay-title">${postData?.title || 'DYNAMIC VIDEO'}</div>
                <div class="overlay-subtitle">${postData?.subtitle || 'Motivating motion graphics'}</div>
            </div>
        </div>
    `;
}

function loadGoogleFont(fontName) {
    if (!fontName) return;
    const fontId = `gf-${fontName.replace(/\s+/g, '-')}`;
    if (document.getElementById(fontId)) return;
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@400;700;800&display=swap`;
    document.head.appendChild(link);
}

window.generatePost = generatePost;
window.copyText = (id) => {
    showToast("Copie effectuée.");
};

// ==========================================
//  LISTENERS
// ==========================================
// Format Tabs Selection
DOM.formatTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        DOM.formatTabs.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        STATE.format = btn.dataset.type;
        showToast(`Format: ${STATE.format.toUpperCase()}`);
        
        // Video options visibility
        const videoOpts = document.getElementById('video-options');
        if (videoOpts) videoOpts.style.display = (STATE.format === 'video') ? 'block' : 'none';
    });
});

DOM.generateBtn.addEventListener('click', generatePost);

// Color Previews
['color-title', 'color-subtitle'].forEach(id => {
    const input = document.getElementById(id);
    const label = document.getElementById(`${id}-hex`);
    if (input && label) {
        input.addEventListener('input', (e) => label.textContent = e.target.value.toUpperCase());
    }
});

// Media Source Switcher (New Tabs)
if (DOM.inputs.mediaSourceTabs) {
    const tabs = DOM.inputs.mediaSourceTabs.querySelectorAll('.format-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const source = tab.dataset.source;
            DOM.inputs.mediaSource.value = source;
            
            const isUpload = source === 'upload';
            DOM.inputs.uploadContainer.style.display = isUpload ? 'block' : 'none';
            DOM.inputs.aiContainer.style.display = isUpload ? 'none' : 'block';
            showToast(`Source: ${source === 'ai' ? 'IA' : 'UPLOAD'}`);
        });
    });
}

// Media Upload
DOM.inputs.mediaUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    STATE.mediaType = file.type.startsWith('video') ? 'video' : 'image';
    const reader = new FileReader();
    reader.onload = (ev) => {
        STATE.uploadedMedia = ev.target.result;
        showToast(`${STATE.mediaType.toUpperCase()} chargé.`);
    };
    reader.readAsDataURL(file);
});

// Logo Upload
DOM.inputs.logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        STATE.brandLogo = ev.target.result;
        DOM.inputs.logoStatus.textContent = file.name.toUpperCase();
        showToast("Logo chargé.");
    };
    reader.readAsDataURL(file);
});

// Real-time Resize
DOM.inputs.sizeLogo.addEventListener('input', () => {
    const logos = document.querySelectorAll('.brand-logo-overlay');
    logos.forEach(l => l.style.width = `${DOM.inputs.sizeLogo.value}px`);
});

// No layout-option in v2.4

// Keys Management
const KEY_IDS = ['key-wavespeed', 'key-google', 'key-anthropic'];
KEY_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = localStorage.getItem(`vpg-${id}`) || '';
    el.addEventListener('change', () => {
        localStorage.setItem(`vpg-${id}`, el.value);
        showToast("Clé API sauvegardée.");
    });
});
