// ============================================================
// GBP AUTO-AUDIT MODULE – Google Places API Integration
// ============================================================
// NOTE: Replace GOOGLE_PLACES_API_KEY with a real key.
// Required APIs to enable: Places API (New), Maps JavaScript API
// To get one: https://console.cloud.google.com/ → APIs & Services → Credentials
// ============================================================

const GOOGLE_PLACES_API_KEY = 'YOUR_API_KEY_HERE'; // <-- replace this

// Auto-detectable criteria (6/10)
const AUTO_CRITERIA_MAP = {
    reviews_volume: (place) => (place.user_ratings_total || 0) >= 30,
    reviews_score:  (place) => (place.rating || 0) >= 4.5,
    hours:          (place) => !!(place.opening_hours?.weekday_text?.length >= 7),
    attributes:     (place) => !!(place.website),
    photos:         (place) => (place.photos?.length || 0) >= 5,
    category:       (place) => place.types && place.types.length > 0,
};

// Audit criteria (same as before, augmented with auto flag)
const AUDIT_CRITERIA = [
    { id: 'category',        label: 'Nom & Catégorie Principale',        weight: 15, auto: true, tip: '🎯 Vérifiez votre catégorie sur <strong>business.google.com</strong>' },
    { id: 'description',     label: 'Description optimisée (750 car.)',  weight: 15, auto: false, tip: '✍️ Rédigez 700+ caractères avec vos mots-clés cibles.' },
    { id: 'photos',          label: 'Photos récentes & diversifiées',    weight: 15, auto: true,  tip: '📸 Publiez 1 photo par semaine via le module Freshness.' },
    { id: 'reviews_volume',  label: 'Volume d\'avis (≥ 30)',             weight: 15, auto: true,  tip: '⭐ Activez le SMS Smart Reviews après chaque séance.' },
    { id: 'reviews_score',   label: 'Note moyenne (≥ 4.5/5)',            weight: 10, auto: true,  tip: '📈 Répondez aux avis négatifs sous 24h.' },
    { id: 'responses',       label: 'Taux de réponse (> 80%)',           weight: 10, auto: false, tip: '💬 Planifiez un créneau hebdomadaire pour les réponses.' },
    { id: 'posts',           label: 'Google Posts actifs (< 7 jours)',   weight: 10, auto: false, tip: '📢 Publiez 1 post/semaine via le module Automatisations.' },
    { id: 'hours',           label: 'Horaires complets & précis',        weight:  5, auto: true,  tip: '🕐 Mettez à jour les horaires exceptionnels.' },
    { id: 'services',        label: 'Services & Produits listés',        weight:  3, auto: false, tip: '📋 Listez chaque type de cours avec une description.' },
    { id: 'attributes',      label: 'Site web + Attributs renseignés',   weight:  2, auto: true,  tip: '🔗 Vérifiez l\'URL et ajoutez 5+ attributs pertinents.' },
];

let autoResults = {}; // stores auto-fetched check states

export function showAuditView() {
    let auditView = document.getElementById('audit-view');
    if (!auditView) {
        auditView = document.createElement('div');
        auditView.id = 'audit-view';
        document.querySelector('.main-content').appendChild(auditView);
    }
    auditView.style.display = 'block';
    auditView.innerHTML = buildAuditHTML();
    attachAuditListeners();
}

function buildAuditHTML() {
    return `
        <div style="max-width: 820px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2>Audit GBP Automatisé</h2>
                    <p style="color: var(--text-secondary); margin-top: 4px; font-size: 0.9rem;">
                        Entrez le nom de l'établissement. L'IA détecte automatiquement 6 des 10 critères.
                    </p>
                </div>
                <div class="score-gauge" id="score-display">
                    <div class="score-number" id="score-number">–</div>
                    <div class="score-label">/ 100</div>
                </div>
            </div>

            <!-- Search Bar -->
            <div class="audit-search-bar">
                <i class="fas fa-map-marker-alt" style="color: var(--accent); font-size: 1.1rem;"></i>
                <input type="text" id="place-search-input" placeholder="Ex: Aquabike Center Paris 15" 
                    style="flex:1; background:none; border:none; color:var(--text-primary); font-size:1rem; outline:none; padding: 0 8px;">
                <button id="start-audit-btn" class="audit-search-btn">
                    <i class="fas fa-search"></i> Lancer l'audit
                </button>
            </div>

            <!-- Status -->
            <div id="audit-status" style="display:none; color: var(--text-secondary); font-size: 0.85rem; margin: 1rem 0; display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-spinner fa-spin" style="color: var(--accent);"></i>
                Recherche en cours…
            </div>

            <!-- Results Grid (hidden until search) -->
            <div id="audit-results" style="display:none; margin-top: 1rem;">
                <!-- Place Summary Card -->
                <div id="place-summary" class="card" style="margin-bottom: 1.5rem; display:flex; gap: 1.5rem; align-items: flex-start; flex-wrap:wrap;"></div>

                <!-- Criteria Legend -->
                <div class="audit-legend">
                    <span><span style="background: rgba(99,102,241,0.2); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; color: var(--accent);">AUTO</span> Détecté automatiquement</span>
                    <span><span style="background: rgba(255,255,255,0.08); padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">MANUEL</span> À vérifier vous-même</span>
                </div>

                <!-- Criteria List -->
                <div class="audit-list" id="criteria-list"></div>

                <!-- Action plan -->
                <div id="audit-reco-block" class="card" style="margin-top: 2rem; display: none;">
                    <h3>📋 Plan d'Action</h3>
                    <div id="audit-reco-list" style="margin-top: 1rem;"></div>
                    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                        <button id="export-pdf-btn" style="background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-file-pdf"></i> Exporter
                        </button>
                        <button id="copy-prompt-btn" style="background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                            <i class="fas fa-copy"></i> Copier le prompt IA
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function attachAuditListeners() {
    document.getElementById('start-audit-btn')?.addEventListener('click', runAudit);
    document.getElementById('place-search-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runAudit();
    });
}

async function runAudit() {
    const query = document.getElementById('place-search-input')?.value.trim();
    if (!query) return;

    const statusEl = document.getElementById('audit-status');
    const resultsEl = document.getElementById('audit-results');
    
    statusEl.style.display = 'flex';
    statusEl.innerHTML = `<i class="fas fa-spinner fa-spin" style="color: var(--accent);"></i> Analyse de la fiche Google en cours…`;
    resultsEl.style.display = 'none';
    document.getElementById('score-number').innerText = '…';

    try {
        // Call the serverless scraper (no API key needed)
        const response = await fetch(`/api/audit?q=${encodeURIComponent(query)}`);
        
        let placeData;
        if (!response.ok) {
            // Fallback to demo data if scraper fails (e.g. local dev)
            console.warn('Scraper not available, using demo data');
            await new Promise(r => setTimeout(r, 800));
            placeData = getMockData(query);
        } else {
            placeData = await response.json();
        }

        statusEl.style.display = 'none';
        resultsEl.style.display = 'block';
        renderPlaceSummary(placeData);
        renderCriteriaList(placeData);
    } catch (err) {
        // Graceful fallback to demo if network issue
        console.warn('Network error, switching to demo:', err.message);
        await new Promise(r => setTimeout(r, 500));
        const placeData = getMockData(query);
        statusEl.style.display = 'none';
        resultsEl.style.display = 'block';
        renderPlaceSummary(placeData);
        renderCriteriaList(placeData);
    }
}

async function fetchFromPlacesAPI(query) {
    // Step 1: Find Place ID
    const searchRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id&key=${GOOGLE_PLACES_API_KEY}`
    );
    const searchData = await searchRes.json();
    if (!searchData.candidates?.length) throw new Error('Aucun établissement trouvé');
    const placeId = searchData.candidates[0].place_id;

    // Step 2: Fetch Place Details
    const detailRes = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,opening_hours,website,photos,types,editorial_summary,formatted_address&key=${GOOGLE_PLACES_API_KEY}`
    );
    const detailData = await detailRes.json();
    return detailData.result;
}

function getMockData(query) {
    // Realistic mock data to demonstrate the audit without an API key
    return {
        name: query,
        formatted_address: 'Paris, France',
        rating: 4.3,
        user_ratings_total: 22,
        website: null,
        types: ['gym', 'health', 'establishment'],
        editorial_summary: { overview: '' },
        opening_hours: {
            weekday_text: ['Lundi: 07:00–21:00', 'Mardi: 07:00–21:00', 'Mercredi: 07:00–21:00',
                'Jeudi: 07:00–21:00', 'Vendredi: 07:00–21:00']  // Only 5 days – triggers alert
        },
        photos: [{ photo_reference: 'mock' }, { photo_reference: 'mock' }] // Only 2 photos
    };
}

function renderPlaceSummary(place) {
    const stars = '⭐'.repeat(Math.round(place.rating || 0));
    document.getElementById('place-summary').innerHTML = `
        <div style="flex: 1; min-width: 200px;">
            <h3 style="font-size: 1.1rem;">${place.name}</h3>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">${place.formatted_address || ''}</p>
            <div style="margin-top: 12px; display: flex; gap: 1rem; flex-wrap: wrap;">
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: ${(place.rating || 0) >= 4.5 ? 'var(--success)' : 'var(--warning)'};">${place.rating || '–'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${stars}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: ${(place.user_ratings_total || 0) >= 30 ? 'var(--success)' : 'var(--warning)'};">${place.user_ratings_total || 0}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">avis</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 800;">${(place.photos || []).length}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">photos</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: ${place.website ? 'var(--success)' : 'var(--danger)'};">${place.website ? '✅' : '❌'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">site web</div>
                </div>
            </div>
        </div>
        <div style="min-width: 160px; text-align: center;">
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 4px;">Source</div>
            <div style="background: rgba(99,102,241,0.15); padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; color: var(--accent);">
                ${place.source === 'google_scrape' ? '🔍 Scrape Google (réel)' : '🔬 Données simulées (démo)'}
            </div>
        </div>
    `;
}

function renderCriteriaList(place) {
    // Auto-score
    autoResults = {};
    AUDIT_CRITERIA.forEach(c => {
        if (c.auto && AUTO_CRITERIA_MAP[c.id]) {
            autoResults[c.id] = AUTO_CRITERIA_MAP[c.id](place);
        }
    });

    const checked = new Set(Object.keys(autoResults).filter(k => autoResults[k]));

    const list = document.getElementById('criteria-list');
    list.innerHTML = AUDIT_CRITERIA.map((c, i) => {
        const isChecked = checked.has(c.id);
        const isAuto = c.auto;
        return `
            <div class="audit-item ${isChecked ? 'done' : ''}" style="animation-delay: ${i * 0.06}s;" data-id="${c.id}">
                <div class="audit-item-header">
                    <div class="audit-check-group">
                        <div class="audit-toggle ${isChecked ? 'active' : ''} ${isAuto ? 'auto-toggle' : ''}" data-id="${c.id}" title="${isAuto ? 'Détecté automatiquement' : 'Contrôle manuel'}">
                            <div class="toggle-inner"></div>
                        </div>
                        <div>
                            <div class="audit-label">
                                ${c.label}
                                <span class="audit-mode-tag ${isAuto ? 'tag-auto' : 'tag-manual'}">${isAuto ? 'AUTO' : 'MANUEL'}</span>
                            </div>
                            ${isAuto && isChecked ? `<div style="font-size: 0.78rem; color: var(--success); margin-top: 2px;">✅ Détecté automatiquement</div>` : ''}
                            ${isAuto && !isChecked ? `<div style="font-size: 0.78rem; color: var(--danger); margin-top: 2px;">❌ Non conforme (source: Google Places)</div>` : ''}
                            ${!isAuto ? `<div class="audit-tip" style="border: none; background: none; padding: 4px 0 0;">${c.tip}</div>` : ''}
                        </div>
                    </div>
                    <div class="audit-weight">+${c.weight} pts</div>
                </div>
            </div>
        `;
    }).join('');

    // Auto-score for checked items
    updateScore(checked);

    // Toggles for manual items
    list.querySelectorAll('.audit-toggle:not(.auto-toggle)').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const id = toggle.dataset.id;
            const item = toggle.closest('.audit-item');
            if (checked.has(id)) {
                checked.delete(id);
                toggle.classList.remove('active');
                item.classList.remove('done');
            } else {
                checked.add(id);
                toggle.classList.add('active');
                item.classList.add('done');
            }
            updateScore(checked);
        });
    });
}

function updateScore(checked) {
    const total = AUDIT_CRITERIA.reduce((sum, c) => checked.has(c.id) ? sum + c.weight : sum, 0);
    const scoreEl = document.getElementById('score-number');
    if (scoreEl) scoreEl.innerText = total;
    
    const display = document.getElementById('score-display');
    if (display) {
        display.className = 'score-gauge';
        if (total >= 80) display.classList.add('score-excellent');
        else if (total >= 50) display.classList.add('score-good');
        else display.classList.add('score-poor');
    }

    // Recommendations
    const missing = AUDIT_CRITERIA.filter(c => !checked.has(c.id));
    const recoBlock = document.getElementById('audit-reco-block');
    const recoList = document.getElementById('audit-reco-list');
    if (recoBlock) recoBlock.style.display = 'block';
    if (recoList) {
        recoList.innerHTML = missing.length === 0
            ? `<p style="color: var(--success);">🎉 Fiche parfaitement optimisée !</p>`
            : missing.map((c, i) => `
                <div style="padding: 10px; border-left: 3px solid var(--accent); margin-bottom: 10px; background: rgba(99,102,241,0.05); border-radius: 0 8px 8px 0;">
                    <strong>${i + 1}. ${c.label}</strong>
                    <p style="color: var(--text-secondary); font-size: 0.82rem; margin-top: 4px;">${c.tip}</p>
                </div>`).join('');
    }

    document.getElementById('copy-prompt-btn')?.addEventListener('click', () => copyAuditPrompt(checked, total));
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => window.print());
}

function copyAuditPrompt(checked, total) {
    const missingLabels = AUDIT_CRITERIA.filter(c => !checked.has(c.id)).map(c => `- ${c.label}`).join('\n');
    const prompt = `Tu es un expert en référencement local Google Business Profile.
Score actuel de la fiche : ${total}/100.

Critères manquants :
${missingLabels}

Pour chaque critère manquant, donne 1 recommandation concrète, actionnable et chiffrée pour un club de sport.
Conclus par les 3 priorités absolues pour ce mois-ci.`;

    navigator.clipboard.writeText(prompt).then(() => {
        const btn = document.getElementById('copy-prompt-btn');
        if (btn) {
            btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
            setTimeout(() => btn.innerHTML = '<i class="fas fa-copy"></i> Copier le prompt IA', 2000);
        }
    });
}
