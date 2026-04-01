
    // ============================================================
    //  GBP OPTIMIZER – All logic in one self-contained script
    // ============================================================

    // ─── State ───────────────────────────────────────────────────
    const state = {
        establishments: JSON.parse(localStorage.getItem('gbp_establishments')) || [
            { id:'1', name:'Aquabike Center', location:'Paris 15e', googleVerified: true, googleUrl: 'https://www.google.com/maps/search/?api=1&query=Aquabike+Center+Paris+15' },
            { id:'2', name:'Fitness Plus', location:'Paris 8e', googleVerified: true, googleUrl: 'https://www.google.com/maps/search/?api=1&query=Fitness+Plus+Paris+8' }
        ],
        currentId: localStorage.getItem('gbp_currentId') || '1'
    };
    const getCurrentEst = () => state.establishments.find(e => e.id === state.currentId);

    // ─── API Keys & AI provider (stored in localStorage) ─────────
    const KEYS_LS = 'gbp_api_keys';
    const keys = JSON.parse(localStorage.getItem(KEYS_LS)) || {
        placesApi: '', anthropic: '', openai: '', gemini: '',
        googleClientId: '', googleClientSecret: '', googleRefreshToken: '',
        aiProvider: 'claude', aiModel: ''
    };
    function saveKeys() { localStorage.setItem(KEYS_LS, JSON.stringify(keys)); }

    const AI_PROVIDERS = {
        claude: { label: 'Claude (Anthropic)', models: [
            { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — Rapide & économique' },
            { id: 'claude-sonnet-4-6',         label: 'Sonnet 4.6 — Meilleure qualité'  },
        ]},
        openai: { label: 'OpenAI (ChatGPT)', models: [
            { id: 'gpt-4o-mini', label: 'GPT-4o mini — Rapide & économique' },
            { id: 'gpt-4o',      label: 'GPT-4o — Meilleure qualité'        },
        ]},
        gemini: { label: 'Google Gemini', models: [
            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Rapide & économique' },
            { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro — Meilleure qualité'     },
        ]},
    };

    function updateBrandUI() {
        const est = getCurrentEst();
        const el = document.getElementById('brand-subtitle');
        if (el) el.textContent = `${est.googleVerified ? est.googleName || est.name : est.name} – ${est.googleAddress || est.location}`;
        
        // Update global GBP button in header
        const headerBtn = document.getElementById('header-gbp-link');
        if (headerBtn) {
            const url = est.googleUrl || (est.name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(est.name)}` : null);
            if (url) {
                headerBtn.innerHTML = `<a href="${url}" target="_blank" class="btn btn-outline" style="padding:4px 12px;font-size:.72rem;border-radius:6px;height:auto;display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1)">
                    <i class="fab fa-google"></i> Voir la fiche
                </a>`;
            } else {
                headerBtn.innerHTML = '';
            }
        }

        // Update sidebar switcher label
        const lbl = document.getElementById('client-switcher-label');
        if (lbl) lbl.textContent = est.googleVerified ? est.googleName || est.name : est.name;
        // Also refresh dashboard if visible
        renderDashboard();
    }

    function renderDashboard() {
        const est = getCurrentEst();
        const grid = document.getElementById('dashboard-grid');
        if (!grid) return;
        
        // Dynamic stats (would ideally be fetched from API)
        const reviewCount = est.googleReviewCount || 0;
        const rating = est.googleRating || '–';

        grid.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3>Audit Avancé</h3>
                    <span class="status-badge status-active">Prêt</span>
                </div>
                <p style="font-size:.85rem;color:var(--text-secondary)">Analyse stratégique en 12 points pour ${est.googleName || est.name}.</p>
                <button class="btn btn-primary btn-full" onclick="navigateTo('advanced-audit')">Audit Stratégique</button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Freshness Média</h3>
                    <span class="status-badge status-active">Actif</span>
                </div>
                <p style="font-size:.85rem;color:var(--text-secondary)">Photos Google : ${est.googlePhotoCount || 0}</p>
                <p style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">Fréquence : 1 photo / semaine</p>
                <div class="progress-bar" style="margin-top:1rem"><div class="progress-fill" style="width:75%"></div></div>
                <button id="publish-btn" class="btn btn-outline btn-full">Publier Maintenant</button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Audit GBP</h3>
                    <span class="status-badge status-active">Outil Direct</span>
                </div>
                <p style="font-size:.85rem;color:var(--text-secondary)">Score actuel : ${rating} ★ · ${reviewCount} avis</p>
                <p style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">Analyse en temps réel</p>
                <button class="btn btn-outline btn-full" onclick="navigateTo('audit')"><i class="fas fa-search"></i> Lancer l'Audit</button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Réponses IA</h3>
                    <span class="status-badge status-active">Actif</span>
                </div>
                <p style="font-size:.85rem;color:var(--text-secondary)">Traitement intelligent pour ${est.googleName || est.name}</p>
                <p style="font-size:.85rem;color:var(--text-secondary);margin-top:4px">Utilise Claude 3.5 Sonnet</p>
                <button class="btn btn-primary btn-full" onclick="navigateTo('reply-reviews')"><i class="fas fa-reply"></i> Gérer les avis</button>
            </div>`;
    }

    function renderClientSwitcher() {
        const menu = document.getElementById('client-switcher-menu');
        if (!menu) return;
        menu.innerHTML = state.establishments.map(e => `
            <button class="cs-item ${e.id === state.currentId ? 'cs-active' : ''}" data-id="${e.id}">
                <i class="fas fa-store" style="font-size:.7rem;opacity:.6"></i>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.googleVerified ? e.googleName || e.name : e.name}</span>
                ${e.id === state.currentId ? '<i class="fas fa-check" style="margin-left:auto;font-size:.7rem"></i>' : ''}
            </button>`).join('') +
            `<button class="cs-item cs-add"><i class="fas fa-plus" style="font-size:.7rem"></i> Ajouter un client</button>`;

        menu.querySelectorAll('.cs-item[data-id]').forEach(btn => {
            btn.addEventListener('click', () => {
                state.currentId = btn.dataset.id;
                localStorage.setItem('gbp_currentId', state.currentId);
                updateBrandUI();
                menu.style.display = 'none';
                // Reload current view for the new client
                const active = document.querySelector('.nav-item.active[data-view]');
                if (active) navigateTo(active.dataset.view);
            });
        });

        menu.querySelector('.cs-add').addEventListener('click', () => {
            menu.style.display = 'none';
            addNewClient();
        });
    }

    function addNewClient() {
        let modal = document.getElementById('est-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'est-modal';
            modal.style = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2000;`;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="card" style="width:400px;padding:2rem;border:1px solid var(--accent);background:var(--bg-dark)">
                <h2 style="margin-bottom:1.5rem">Nouveau Client</h2>
                <div style="margin-bottom:1rem">
                    <label style="display:block;font-size:.7rem;color:var(--text-secondary);margin-bottom:6px">Nom de l'entreprise</label>
                    <input type="text" id="new-est-name" placeholder="Ex: Golf de Castelnau" style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);color:white;border-radius:8px;outline:none">
                </div>
                <div style="margin-bottom:1.5rem">
                    <label style="display:block;font-size:.7rem;color:var(--text-secondary);margin-bottom:6px">Localisation (Ville / Quartier)</label>
                    <input type="text" id="new-est-loc" placeholder="Ex: Montpellier" style="width:100%;padding:10px;background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);color:white;border-radius:8px;outline:none">
                </div>
                <div style="display:flex;gap:10px">
                    <button id="cancel-est-btn" class="btn btn-outline" style="flex:1">Annuler</button>
                    <button id="save-est-btn" class="btn btn-primary" style="flex:1">Enregistrer</button>
                </div>
            </div>`;

        document.getElementById('cancel-est-btn').addEventListener('click', () => modal.style.display = 'none');
        document.getElementById('save-est-btn').addEventListener('click', () => {
            const name = document.getElementById('new-est-name').value.trim();
            const loc = document.getElementById('new-est-loc').value.trim();
            if (!name) return alert("Veuillez entrer au moins un nom.");

            const id = Date.now().toString();
            const newEst = { id, name, location: loc, clients: [], googleVerified: false };
            state.establishments.push(newEst);
            state.currentId = id;
            localStorage.setItem('gbp_establishments', JSON.stringify(state.establishments));
            localStorage.setItem('gbp_currentId', id);
            
            updateBrandUI();
            modal.style.display = 'none';
            navigateTo('params');
        });
    }

    // Switcher toggle
    document.getElementById('client-switcher-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('client-switcher-menu');
        const isOpen = menu.style.display !== 'none';
        menu.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) renderClientSwitcher();
    });
    document.addEventListener('click', () => {
        const menu = document.getElementById('client-switcher-menu');
        if (menu) menu.style.display = 'none';
    });

    updateBrandUI();

    // ─── Navigation ──────────────────────────────────────────────
    function navigateTo(viewId) {
        document.querySelectorAll('.nav-item[data-view]').forEach(n => {
            n.classList.toggle('active', n.dataset.view === viewId);
        });
        const grid = document.getElementById('dashboard-grid');
        const container = document.getElementById('views-container');
        grid.style.display = viewId === 'dashboard' ? 'grid' : 'none';
        // Update H1 title
        const titles = {
            'dashboard': 'Tableau de Bord',
            'audit': 'Audit GBP Standard',
            'advanced-audit': 'Audit Stratégique Avancé',
            'reply-reviews': 'Réponses aux Avis IA',
            'clients': 'Gestion des Clients',
            'params': 'Paramètres & API',
            'automations': 'Automatisations IA'
        };
        const h1 = document.querySelector('header h1');
        if (h1) h1.textContent = titles[viewId] || 'GBP OPTIMIZER';

        // Clear dynamic views
        container.innerHTML = '';
        switch (viewId) {
            case 'dashboard': break;
            case 'audit': showAuditView(container); break;
            case 'advanced-audit': showAdvancedAuditView(container); break;
            case 'reply-reviews': showReplyReviewsView(container); break;
            case 'clients': showClientsView(container); break;
            case 'params': showParamsView(container); break;
            default:
                container.innerHTML = '<div class="card"><p style="color:var(--text-secondary)">Ce module arrive bientôt.</p></div>';
        }
        updateBrandUI();
    }

    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
        item.addEventListener('click', e => { e.preventDefault(); navigateTo(item.dataset.view); });
    });
    document.querySelectorAll('.go-to-audit').forEach(b => b.addEventListener('click', () => navigateTo('audit')));

    document.querySelectorAll('.go-to-reply-reviews').forEach(b => b.addEventListener('click', () => navigateTo('reply-reviews')));

    // Publish button
    document.getElementById('publish-btn').addEventListener('click', () => {
        document.querySelector('.progress-fill').style.width = '100%';
        alert('Photo publiée avec succès ! Le profil Google est à jour.');
    });

    // ─── AUDIT MODULE ─────────────────────────────────────────────
    const AUDIT_CRITERIA = [
        { id:'category',       label:'Nom & Catégorie Principale',       weight:15, auto:true,  tip:'🎯 Vérifiez votre catégorie sur business.google.com' },
        { id:'description',    label:'Description optimisée (750 car.)', weight:15, auto:false, tip:'✍️ Rédigez 700+ caractères avec vos mots-clés cibles.' },
        { id:'photos',         label:'Photos récentes & diversifiées',   weight:15, auto:true,  tip:'📸 Publiez 1 photo par semaine via Freshness Média.' },
        { id:'reviews_volume', label:'Volume d\'avis (≥ 30)',            weight:15, auto:true,  tip:'⭐ Activez Smart Reviews après chaque séance.' },
        { id:'reviews_score',  label:'Note moyenne (≥ 4.5/5)',           weight:10, auto:true,  tip:'📈 Répondez aux avis négatifs sous 24h.' },
        { id:'responses',      label:'Taux de réponse (> 80%)',          weight:10, auto:false, tip:'💬 Consacrez 15 min/semaine à répondre aux avis.' },
        { id:'posts',          label:'Google Posts actifs (< 7 jours)',  weight:10, auto:false, tip:'📢 Publiez 1 post/semaine via Automations.' },
        { id:'hours',          label:'Horaires complets & précis',       weight:5,  auto:true,  tip:'🕐 Mettez à jour les horaires exceptionnels.' },
        { id:'services',       label:'Services & Produits listés',       weight:3,  auto:false, tip:'📋 Listez chaque cours avec description courte.' },
        { id:'attributes',     label:'Site web + Attributs renseignés',  weight:2,  auto:true,  tip:'🔗 Vérifiez l\'URL et ajoutez 5+ attributs.' },
    ];
    const AUTO_MAP = {
        category:       p => p.types && p.types.length > 0,
        photos:         p => (p.photos||[]).length >= 5,
        reviews_volume: p => (p.user_ratings_total||0) >= 30,
        reviews_score:  p => (p.rating||0) >= 4.5,
        hours:          p => !!(p.opening_hours?.weekday_text?.length >= 7),
        attributes:     p => !!p.website,
    };

    function showAuditView(container) {
        const est = getCurrentEst();
        container.innerHTML = `
        <div style="max-width:820px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
            <div><h2>Audit GBP Automatisé – ${est.googleVerified ? est.googleName || est.name : est.name}</h2><p style="color:var(--text-secondary);font-size:.85rem">Entrez le nom pour détecter automatiquement 6 critères.</p></div>
            <div class="score-gauge" id="score-display"><div class="score-number" id="score-number">–</div><div class="score-label">/ 100</div></div>
          </div>
          <div class="audit-search-bar">
            <i class="fas fa-map-marker-alt" style="color:var(--accent)"></i>
            <input type="text" id="place-input" placeholder="Ex: Aquabike Center Paris 15"
              value="${est.googleVerified ? est.googleName || est.name : est.name}"
              style="flex:1;background:none;border:none;color:var(--text-primary);font-size:1rem;outline:none;padding:0 8px">
            <button id="audit-go-btn" class="btn btn-primary"><i class="fas fa-search"></i> Lancer</button>
          </div>
          <div id="audit-status" style="display:none;color:var(--text-secondary);font-size:.85rem;margin:1rem 0;align-items:center;gap:8px"></div>
          <div id="audit-results" style="display:none;margin-top:1rem">
            <div id="place-summary" class="card" style="margin-bottom:1.5rem"></div>
            <div class="audit-legend">
              <span><span style="background:rgba(99,102,241,0.2);padding:2px 8px;border-radius:4px;font-size:.72rem;color:var(--accent)">AUTO</span> Détecté auto</span>
              <span><span style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px;font-size:.72rem">MANUEL</span> À vérifier</span>
            </div>
            <div class="audit-list" id="audit-list"></div>
            <div id="reco-block" class="card" style="margin-top:1.5rem;display:none">
              <h3>📋 Plan d'Action</h3>
              <div id="reco-list" style="margin-top:1rem"></div>
              <div style="margin-top:1.2rem;display:flex;gap:.8rem;flex-wrap:wrap">
                <button id="pdf-btn" class="btn btn-primary"><i class="fas fa-file-pdf"></i> Exporter PDF</button>
                <button id="prompt-btn" class="btn btn-outline"><i class="fas fa-copy"></i> Copier prompt IA</button>
              </div>
            </div>
          </div>
        </div>`;

        document.getElementById('audit-go-btn').addEventListener('click', runAudit);
        document.getElementById('place-input').addEventListener('keydown', e => e.key==='Enter' && runAudit());
    }

    // ─── ADVANCED AUDIT MODULE ────────────────────────────────────
    const ADV_CRITERIA = [
        { id: 1,  weight: 15, title: "Photos et visuels", desc: "Nombre et qualité des photos publiées sur la fiche GBP", options: [ { pts:0, label:"Moins de 5 photos" }, { pts:5, label:"5-14 photos" }, { pts:10, label:"15-19 photos" }, { pts:15, label:"20+ photos HD (Lieu, Équipe, Action)" } ], recos: ["Urgent : publiez 20+ photos HD.","Ajoutez des photos d'équipe et d'action.","Ajoutez les photos manquantes pour passer les 20 visuels.",null] },
        { id: 2,  weight: 15, title: "Avis clients", desc: "Volume, note et régularité des avis", options: [ { pts:0, label:"< 10 avis ou note < 4.0" }, { pts:5, label:"10-29 avis, note 4.0-4.4" }, { pts:10, label:"30-99 avis, note ≥ 4.5" }, { pts:15, label:"100+ avis, note ≥ 4.5, réguliers" } ], recos: ["Urgent : QR code et relances SMS nécessaires.","Visez 30+ avis avec mots-clés locaux.","Maintenez le rythme : 3-5 avis / mois.",null] },
        { id: 3,  weight: 10, title: "Réponses aux avis", desc: "Qualité et SEO des réponses", options: [ { pts:0, label:"Aucune réponse" }, { pts:3, label:"< 50% de réponses" }, { pts:7, label:"Fréquentes mais sans SEO" }, { pts:10, label:"100% sous 48h avec mots-clés + Ville" } ], recos: ["Répondez à tout l'historique aujourd'hui.","Visez 100% avec Ville + Service.","Optimisez le SEO dans chaque réponse.",null] },
        { id: 4,  weight: 10, title: "Google Posts", desc: "Fréquence des publications", options: [ { pts:0, label:"Aucun post" }, { pts:3, label:"Moins d'un par mois" }, { pts:7, label:"1 à 3 posts par mois" }, { pts:10, label:"1+ post / semaine" } ], recos: ["Commencez par 1 post / semaine (Offres).","Planifiez un calendrier mensuel.","Maintenez la cadence hebdo.",null] },
        { id: 5,  weight: 10, title: "Services & Produits", desc: "Optimisation du catalogue", options: [ { pts:0, label:"Vide" }, { pts:4, label:"Quelques services sans détails" }, { pts:7, label:"Services avec descriptions" }, { pts:10, label:"Services + Tarifs + Fiches produits" } ], recos: ["Remplissez tout : chaque service est un mot-clé.","Ajoutez tarifs et descriptions.","Utilisez les fiches produits pour les abonnements.",null] },
        { id: 6,  weight: 8, title: "Questions & Réponses", desc: "FAQ pro-active dans la fiche", options: [ { pts:0, label:"Aucune Q&R" }, { pts:4, label:"Non géré par le pro" }, { pts:6, label:"3-5 Q&R avec réponses" }, { pts:8, label:"6+ Q&R stratégiques configurées" } ], recos: ["Créez votre propre FAQ (Prix, Accès).","Répondez aux questions en attente.","Ajoutez des Q&R stratégiques.",null] },
        { id: 7,  weight: 8, title: "Lien de réservation", desc: "Conversion directe", options: [ { pts:0, label:"Aucun lien" }, { pts:4, label:"Lien site web uniquement" }, { pts:6, label:"Lien direct planning" }, { pts:8, label:"Intégration 'Réserver avec Google'" } ], recos: ["Urgent : ajoutez un lien de réservation.","Liez directement vers votre planning.","Vérifiez l'intégration native si possible.",null] },
        { id: 8,  weight: 7, title: "Cohérence NAP", desc: "Nom, Adresse, Tél partout pareil", options: [ { pts:0, label:"Incohérences majeures" }, { pts:3, label:"Écarts mineurs" }, { pts:5, label:"OK sur GBP et Site" }, { pts:7, label:"100% stable sur tous les annuaires" } ], recos: ["Corrigez le NAP : impact SEO critique.","Vérifiez Pages Jaunes et Yelp.","Verrouillez le NAP partout.",null] },
        { id: 9,  weight: 7, title: "Tracking & Analytics (UTM)", desc: "Mesure réelle du trafic GBP", options: [ { pts:0, label:"Aucun tracking" }, { pts:3, label:"Lien site simple" }, { pts:5, label:"UTM configurés sur Site Web" }, { pts:7, label:"UTM sur Site + Planning + Posts" } ], recos: ["Ajoutez des paramètres UTM à vos liens.","Traçabilité nécessaire pour juger du ROI.","Configurez des UTM pour chaque post.",null] },
        { id: 10, weight: 5, title: "Engagement Vidéo", desc: "Freshness visuelle avancée", options: [ { pts:0, label:"Aucune vidéo" }, { pts:2, label:"Vidéos amateurs" }, { pts:4, label:"Vidéo de présentation pro" }, { pts:5, label:"Audit 360 + Vidéos régulières" } ], recos: ["Publiez une vidéo de 30s du lieu.","Mettez en avant l'équipe en vidéo.","Visite virtuelle recommandée pour convertir.",null] },
        { id: 11, weight: 5, title: "Attributs & Accessibilité", desc: "Détails qui font la différence", options: [ { pts:0, label:"Non renseignés" }, { pts:2, label:"Basiques uniquement" }, { pts:4, label:"Complet (WiFi, Parking...)" }, { pts:5, label:"Complet + Accessibilité PMR vérifiée" } ], recos: ["Cochez tous les attributs business.","Précisez l'accessibilité PMR.","Indiquez les options de paiement.",null] },
    ];

    function showAdvancedAuditView(container) {
        const est = getCurrentEst();
        const stateKey = `gbp_adv_audit_${est.id}`;
        let advAnswers = JSON.parse(localStorage.getItem(stateKey)) || {};

        function renderAdv() {
            const score = ADV_CRITERIA.reduce((s, c) => s + (advAnswers[c.id] !== undefined ? c.options[advAnswers[c.id]].pts : 0), 0);
            const answered = Object.keys(advAnswers).length;
            const weak = ADV_CRITERIA.filter(c => advAnswers[c.id] !== undefined && (c.options[advAnswers[c.id]].pts / c.weight) < 0.6).length;
            const gain = ADV_CRITERIA.reduce((s, c) => advAnswers[c.id] === undefined ? s + c.weight : s + (c.weight - c.options[advAnswers[c.id]].pts), 0);

            container.innerHTML = `
            <div style="max-width:880px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
                    <div>
                        <h2>Audit Stratégique Avancé</h2>
                        <p style="color:var(--text-secondary);font-size:.85rem;margin-top:2px">${est.googleName || est.name} · Diagnostic manuel approfondi</p>
                    </div>
                    <div style="display:flex;gap:10px;align-items:center">
                        <button id="adv-sync-btn" class="btn btn-outline" style="font-size:.75rem;padding:6px 14px"><i class="fas fa-sync"></i> Synchroniser Google</button>
                        <div class="score-gauge ${score >= 75 ? 'score-excellent' : score >= 45 ? 'score-good' : 'score-poor'}">
                            <div class="score-number">${answered > 0 ? score : '—'}</div>
                            <div class="score-label">/ 100</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.5rem;gap:10px">
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--accent)">${answered}</div><div class="adv-metric-lbl">Critères</div></div>
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--danger)">${answered > 0 ? weak : '—'}</div><div class="adv-metric-lbl">Faiblesses</div></div>
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--success)">+${answered > 0 ? gain : '—'}</div><div class="adv-metric-lbl">Gain potentiel</div></div>
                    <div class="adv-metric"><div class="adv-metric-val">${Math.min(100, Math.round((answered / ADV_CRITERIA.length * 100)))}%</div><div class="adv-metric-lbl">Complétion</div></div>
                </div>

                <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:2rem">
                    ${ADV_CRITERIA.map(c => {
                        const sel = advAnswers[c.id];
                        const ok = sel !== undefined;
                        const pts = ok ? c.options[sel].pts : 0;
                        const pct = ok ? (pts / c.weight) : 0;
                        const pillColor = ok ? (pct >= 0.8 ? 'var(--success)' : pct >= 0.5 ? 'var(--warning)' : 'var(--danger)') : 'var(--text-secondary)';
                        
                        return `
                        <div class="adv-crit-item ${ok ? 'answered' : ''}" id="adv-crit-${c.id}">
                            <div class="adv-crit-head" onclick="toggleAdv(${c.id})">
                                <div class="adv-crit-num">${c.id}</div>
                                <div class="adv-crit-title">${c.title}</div>
                                <div class="adv-crit-pill" style="color:${pillColor};background:${pillColor}15;border:1px solid ${pillColor}40">${ok ? pts + '/' + c.weight + ' pts' : '—'}</div>
                                <i class="fas fa-chevron-down" style="font-size:.7rem;color:var(--text-secondary);transition:transform .2s"></i>
                            </div>
                            <div class="adv-crit-body">
                                <p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:12px">${c.desc}</p>
                                <div style="display:flex;flex-direction:column;gap:6px">
                                    ${c.options.map((o, idx) => `
                                        <div class="adv-opt ${sel === idx ? 'selected' : ''}" onclick="selectAdv(${c.id}, ${idx}, event)">
                                            <div class="adv-radio"></div>
                                            <div style="flex:1">${o.label}</div>
                                            <div style="font-family:monospace;font-size:11px;opacity:.6">${o.pts} pts</div>
                                        </div>
                                    `).join('')}
                                </div>
                                ${ok && c.recos[sel] ? `<div class="adv-reco"><i class="fas fa-lightbulb" style="margin-right:6px"></i>${c.recos[sel]}</div>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
                    <div>
                        <h3 style="margin-bottom:4px">Rapport Stratégique IA</h3>
                        <p style="font-size:.78rem;color:var(--text-secondary)">Générez un plan d'action détaillé prêt à envoyer au client.</p>
                    </div>
                    <button class="btn btn-primary" onclick="generateAdvPlan()"><i class="fas fa-bolt"></i> Générer le Plan d'Action</button>
                </div>
                <div id="adv-plan-out" style="display:none;margin-top:1.5rem"></div>
                <div id="adv-prompt-out" style="display:none;margin-top:1.5rem">
                   <div style="background:var(--gray-900);border:1px solid var(--glass-border);border-radius:12px;overflow:hidden">
                       <div style="padding:10px 16px;background:rgba(255,255,255,0.05);display:flex;justify-content:space-between;align-items:center">
                           <span style="font-size:.7rem;font-family:monospace;color:var(--text-secondary)">PROMPT IA GÉNÉRÉ (Optionnel)</span>
                           <button class="btn btn-outline" style="font-size:.7rem;padding:4px 10px" onclick="copyAdvPrompt()">Copier</button>
                       </div>
                       <pre id="adv-prompt-text" style="padding:16px;font-size:.8rem;color:#c8e6c9;white-space:pre-wrap;font-family:monospace;max-height:400px;overflow-y:auto"></pre>
                   </div>
                </div>
            </div>`;
        }

        window.toggleAdv = (id) => {
            const item = document.getElementById(`adv-crit-${id}`);
            const isOpen = item.classList.contains('open');
            document.querySelectorAll('.adv-crit-item').forEach(i => i.classList.remove('open'));
            if (!isOpen) item.classList.add('open');
        };

        window.selectAdv = (id, idx, e) => {
            e.stopPropagation();
            advAnswers[id] = idx;
            localStorage.setItem(stateKey, JSON.stringify(advAnswers));
            renderAdv();
        };

        window.generateAdvPlan = () => {
            const currentEst = getCurrentEst();
            const score = ADV_CRITERIA.reduce((s, c) => s + (advAnswers[c.id] !== undefined ? c.options[advAnswers[c.id]].pts : 0), 0);
            const weak = ADV_CRITERIA.filter(c => advAnswers[c.id] !== undefined && (c.options[advAnswers[c.id]].pts / c.weight) < 0.6);
            const urgent = weak.slice(0, 3);

            let planHtml = `
            <div class="card" style="margin-top:2rem;padding:24px;background:rgba(15,15,20,0.8);border:1px solid var(--accent);box-shadow: 0 0 30px rgba(99,102,241,0.1)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
                    <h3 style="display:flex;align-items:center;gap:10px;font-size:1.2rem">
                        <i class="fas fa-rocket" style="color:var(--accent)"></i> Stratégie de Domination Locale : 30 Jours
                    </h3>
                    <div style="display:flex;gap:8px">
                        <button class="btn btn-outline" style="font-size:.7rem;padding:5px 12px" onclick="window.print()"><i class="fas fa-print"></i> PDF</button>
                    </div>
                </div>

                <div class="dashboard-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:1.5rem;gap:10px">
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--warning)">${score}</div><div class="adv-metric-lbl">Score Actuel</div></div>
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--success)">85+</div><div class="adv-metric-lbl">Objectif J+30</div></div>
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--danger)">${urgent.length}</div><div class="adv-metric-lbl">Urgences</div></div>
                    <div class="adv-metric"><div class="adv-metric-val" style="color:var(--accent)">3 phases</div><div class="adv-metric-lbl">Structure</div></div>
                </div>

                <div class="plan-tabs">
                    <div class="plan-tab active" onclick="switchPlanTab('strat', this)">Plan 30 Jours</div>
                    <div class="plan-tab" onclick="switchPlanTab('content', this)">Contenus Prêts</div>
                    <div class="plan-tab" onclick="switchPlanTab('bench', this)">Benchmark & SEO</div>
                </div>

                <div id="plan-strat" class="plan-panel active">
                    <div style="display:flex;flex-direction:column;gap:1.5rem">
                        <div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                                <span style="font-size:.75rem;font-weight:700;color:var(--danger);background:rgba(239,68,68,0.1);padding:3px 10px;border-radius:20px">SEMAINE 1</span>
                                <span style="font-size:0.9rem;font-weight:600">Fondations & Urgences SEO</span>
                            </div>
                            <div class="tasks">
                                ${urgent.map(c => `
                                    <div class="task-card">
                                        <div class="task-dot" style="background:var(--danger)"></div>
                                        <div style="flex:1">
                                            <div style="font-size:.85rem;font-weight:600">${c.recos[advAnswers[c.id]] || c.title}</div>
                                            <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Impact critique sur le classement. Action immédiate requise.</div>
                                            <div class="task-meta">
                                                <span class="plan-chip">Urgent</span>
                                                <span class="plan-chip">Impact Fort</span>
                                                <span class="plan-chip">15-30 min</span>
                                            </div>
                                        </div>
                                    </div>
                                `).join('')}
                                <div class="task-card">
                                    <div class="task-dot" style="background:var(--accent)"></div>
                                    <div style="flex:1">
                                        <div style="font-size:.85rem;font-weight:600">Audit & Harmonisation du NAP</div>
                                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Vérifier Nom, Adresse, Tel sur GBP, Site Web et annuaires.</div>
                                        <div class="task-meta"><span class="plan-chip">Structure</span><span class="plan-chip">Impact Moyen</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                                <span style="font-size:.75rem;font-weight:700;color:var(--warning);background:rgba(245,158,11,0.1);padding:3px 10px;border-radius:20px">SEMAINE 2</span>
                                <span style="font-size:0.9rem;font-weight:600">Conversion & Preuve Sociale</span>
                            </div>
                            <div class="tasks">
                                <div class="task-card">
                                    <div class="task-dot" style="background:var(--warning)"></div>
                                    <div style="flex:1">
                                        <div style="font-size:.85rem;font-weight:600">Campagne de collecte d'avis par QR Code</div>
                                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Placer un QR code à la sortie pour viser 5 avis/semaine.</div>
                                        <div class="task-meta"><span class="plan-chip">Conversion</span><span class="plan-chip">Impact Fort</span></div>
                                    </div>
                                </div>
                                <div class="task-card">
                                    <div class="task-dot" style="background:var(--warning)"></div>
                                    <div style="flex:1">
                                        <div style="font-size:.85rem;font-weight:600">Séance Photo/Vidéo Freshness</div>
                                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Publier 10 photos HD et 1 vidéo de 30s du lieu.</div>
                                        <div class="task-meta"><span class="plan-chip">Visibilité</span><span class="plan-chip">CTR x2</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
                                <span style="font-size:.75rem;font-weight:700;color:var(--success);background:rgba(34,197,94,0.1);padding:3px 10px;border-radius:20px">SEMAINE 3-4</span>
                                <span style="font-size:0.9rem;font-weight:600">Autorité & Domination Locale</span>
                            </div>
                            <div class="tasks">
                                <div class="task-card">
                                    <div class="task-dot" style="background:var(--success)"></div>
                                    <div style="flex:1">
                                        <div style="font-size:.85rem;font-weight:600">Mise en place de la FAQ Stratégique</div>
                                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Intégrer les questions des clients dans la section Q&R GBP.</div>
                                        <div class="task-meta"><span class="plan-chip">SEO</span><span class="plan-chip">Engagement</span></div>
                                    </div>
                                </div>
                                <div class="task-card">
                                    <div class="task-dot" style="background:var(--success)"></div>
                                    <div style="flex:1">
                                        <div style="font-size:.85rem;font-weight:600">Calendrier de Posts Hebdomadaires</div>
                                        <div style="font-size:.75rem;color:var(--text-secondary);margin-top:3px">Maintenir 1 post/semaine pour rester favori de l'algorithme.</div>
                                        <div class="task-meta"><span class="plan-chip">Régularité</span><span class="plan-chip">Algorithm</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="plan-content" class="plan-panel">
                    <div class="plan-content-card">
                        <div class="adv-metric-lbl">Description GBP optimisée (750 car.)</div>
                        <div class="plan-content-text" id="tpl-desc">Bienvenue chez ${currentEst.googleName || currentEst.name} ! Nous sommes votre expert local spécialisé dans les services de qualité. Profitez de notre savoir-faire et de notre accueil chaleureux. Nos clients apprécient particulièrement notre professionnalisme et nos équipements modernes. Idéalement situé, notre établissement vous accueille pour des moments de détente et de sport exceptionnels. Réservez votre séance dès maintenant !</div>
                        <button class="btn btn-outline" style="font-size:.7rem" onclick="copySnippet('tpl-desc')">Copier</button>
                    </div>
                    <div class="plan-content-card">
                        <div class="adv-metric-lbl">SMS de collecte d'avis</div>
                        <div class="plan-content-text" id="tpl-sms">Bonjour ! Merci pour votre visite chez ${currentEst.googleName || currentEst.name}. Si vous avez passé un bon moment, pourriez-vous nous laisser un petit avis ici ? Ça nous aide énormément : [LIEN_GBP_ICI]. Merci !</div>
                        <button class="btn btn-outline" style="font-size:.7rem" onclick="copySnippet('tpl-sms')">Copier</button>
                    </div>
                    <div class="plan-content-card">
                        <div class="adv-metric-lbl">FAQ Stratégique (Q&R)</div>
                        <div class="plan-content-text" id="tpl-qr">Q : Quels sont vos horaires d'ouverture ?\nR : Nous sommes ouverts du lundi au vendredi. Consultez notre fiche pour les horaires détaillés !\n\nQ : Proposez-vous des offres découvertes ?\nR : Oui, nous avons régulièrement des offres pour les nouveaux clients. N'hésitez pas à nous appeler !</div>
                        <button class="btn btn-outline" style="font-size:.7rem" onclick="copySnippet('tpl-qr')">Copier</button>
                    </div>
                </div>

                <div id="plan-bench" class="plan-panel">
                    <div style="background:rgba(255,255,255,0.03);padding:18px;border-radius:12px;margin-bottom:15px;font-size:0.82rem;line-height:1.6">
                        <h4 style="color:var(--accent);margin-bottom:8px"><i class="fas fa-search"></i> Diagnostic Concurrentiel</h4>
                        Votre établissement a un potentiel inexploré. La structure multi-fiches ou la présence locale forte est votre meilleur atout. Pour dépasser vos concurrents, misez sur la <b>fraîcheur</b> (posts hebdo) et la <b>preuve sociale</b> (avis récents).
                    </div>
                    <div class="card" style="padding:15px">
                        <div class="adv-metric-lbl" style="margin-bottom:10px">Requêtes cibles à dominer</div>
                        <div style="display:flex;flex-wrap:wrap;gap:8px">
                            <span class="keyword-tag">${currentEst.name} Local</span>
                            <span class="keyword-tag">Meilleur ${currentEst.name.split(' ')[0]}</span>
                            <span class="keyword-tag">Avis ${currentEst.name}</span>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-full" style="margin-top:20px" onclick="generateAdvPrompt()">Débloquer la stratégie complète IA ↗</button>
                </div>
            </div>`;

            const out = document.getElementById('adv-plan-out');
            out.innerHTML = planHtml;
            out.style.display = 'block';
            out.scrollIntoView({ behavior:'smooth' });
        };

        window.switchPlanTab = (id, el) => {
            document.querySelectorAll('.plan-panel').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
            document.getElementById('plan-' + id).classList.add('active');
            el.classList.add('active');
        };

        window.copySnippet = (id) => {
            const txt = document.getElementById(id).textContent;
            navigator.clipboard.writeText(txt);
            alert('Copié !');
        };

        window.generateAdvPrompt = () => {
            const score = ADV_CRITERIA.reduce((s, c) => s + (advAnswers[c.id] !== undefined ? c.options[advAnswers[c.id]].pts : 0), 0);
            let text = `Agis en tant qu'Expert SEO Local spécialisé en Google Business Profile. 
Analyse l'audit suivant pour l'établissement "${est.googleName || est.name}" et rédige une Note d'Opportunité Stratégique (en français) pour le client.

SCORE GLOBAL : ${score} / 100

DÉTAIL CRITÈRES :\n`;

            ADV_CRITERIA.forEach(c => {
                const sel = advAnswers[c.id];
                if (sel !== undefined) {
                    text += `- ${c.title} : ${c.options[sel].label} (${c.options[sel].pts}/${c.weight} pts)\n`;
                    if (c.recos[sel]) text += `  💡 Recommendation: ${c.recos[sel]}\n`;
                } else {
                    text += `- ${c.title} : Non évalué\n`;
                }
            });

            text += `\nSTRUCTURE ATTENDUE POUR TON RAPPORT :
1. ANALYSE RAPIDE : Résumé des forces et faiblesses.
2. TOP 3 ACTIONS PRIORITAIRES : Ce qui aura l'impact le plus fort immédiatement.
3. STRATÉGIE DE DOMINATION : Comment passer devant les concurrents locaux.
Sois très pro-actif, précis et utilise un ton persuasif (B3+).`;

            document.getElementById('adv-prompt-text').textContent = text;
            document.getElementById('adv-prompt-out').style.display = 'block';
            document.getElementById('adv-prompt-out').scrollIntoView({ behavior:'smooth' });
        };

        window.copyAdvPrompt = () => {
            const t = document.getElementById('adv-prompt-text').textContent;
            navigator.clipboard.writeText(t);
            alert('Prompt copié ! Collez-le dans Claude, ChatGPT ou Gemini.');
        };

        window.advSync = async () => {
            const btn = document.getElementById('adv-sync-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sync...'; }
            
            try {
                const q = est.googleName || est.name;
                const r = await fetch('/api/audit?q=' + encodeURIComponent(q) + '&placesKey=' + encodeURIComponent(keys.placesApi || ''));
                const data = await r.json();
                if (data.error) throw new Error(data.error);
                
                autoFillAdvAudit(data);
                // Reload data from storage
                advAnswers = JSON.parse(localStorage.getItem(stateKey)) || {};
                renderAdv();
                showToast('✅ Audit mis à jour avec les données de Google !', '#22c55e');
            } catch (err) {
                showToast('❌ Erreur de synchro : ' + err.message, '#ef4444');
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync"></i> Synchroniser Google'; }
            }
        };

        // Attach sync listener
        setTimeout(() => {
            document.getElementById('adv-sync-btn')?.addEventListener('click', advSync);
        }, 10);
        
        renderAdv();
    }

    async function runAudit() {
        const q = document.getElementById('place-input')?.value.trim();
        if (!q) return;
        const status = document.getElementById('audit-status');
        const results = document.getElementById('audit-results');
        status.style.display = 'flex';
        status.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--accent)"></i>&nbsp; Analyse Google en cours…';
        results.style.display = 'none';
        document.getElementById('score-number').textContent = '…';

        let data;
        try {
            const r = await fetch('/api/audit?q=' + encodeURIComponent(q) + '&placesKey=' + encodeURIComponent(keys.placesApi || ''));
            data = await r.json();
            if (data.error) {
                status.innerHTML = `<span style="color:var(--danger)"><i class="fas fa-exclamation-triangle"></i> ${data.error}</span>`;
                status.style.display = 'flex';
                return;
            }
        } catch (err) {
            data = getMockData(q);
        }

        status.style.display = 'none';
        results.style.display = 'block';
        renderSummary(data);
        renderCriteria(data);
        autoFillAdvAudit(data);
    }

    function autoFillAdvAudit(p) {
        const est = getCurrentEst();
        const stateKey = `gbp_adv_audit_${est.id}`;
        let answers = JSON.parse(localStorage.getItem(stateKey) || '{}');

        // Mapping Rules
        // 1. Photos
        const photoCount = (p.photos || []).length;
        if (photoCount >= 20) answers[1] = 3;
        else if (photoCount >= 15) answers[1] = 2;
        else if (photoCount >= 5) answers[1] = 1;
        else answers[1] = 0;

        // 2. Avis & Note
        const rating = p.rating || 0;
        const total = p.user_ratings_total || 0;
        if (total >= 100 && rating >= 4.5) answers[2] = 3;
        else if (total >= 30 && rating >= 4.5) answers[2] = 2;
        else if (total >= 10 && rating >= 4.0) answers[2] = 1;
        else answers[2] = 0;

        // 3. Réponses aux avis
        if (p.has_owner_reply) answers[3] = 3; // 100% sous 48h (pts:10)
        else if (p.has_replies) answers[3] = 2; // Fréquentes (pts:7)
        else answers[3] = 0;

        // 4. Google Posts
        if (p.has_posts) answers[4] = 2; // Présents (pts:10)
        else answers[4] = 0; // Aucun (pts:0)

        // 5. Services & Produits
        if (p.has_services || p.has_products) answers[5] = 2; // Complets (pts:7)
        else answers[5] = 0; // Vide (pts:0)

        // 6. Questions & Réponses
        if (p.has_questions || p.has_replies) answers[6] = 2; // 3-5 Q&R (pts:6)
        else answers[6] = 0; // Aucune (pts:0)

        // 7. Lien de Réservation
        const site = (p.website || "").toLowerCase();
        if (site.includes('booking') || site.includes('rdv') || site.includes('deciplus') || site.includes('agenda') || site.includes('reserver')) {
            answers[7] = 2; // Lien direct planning (pts:6)
        } else if (site) {
            answers[7] = 1; // Lien site uniquement (pts:4)
        } else {
            answers[7] = 0; // Aucun (pts:0)
        }

        // 8. Coherence NAP
        if (p.formatted_address && p.formatted_address.length > 20) answers[8] = 2; // OK (pts:5)
        else answers[8] = 1; // Écarts mineurs (pts:3)

        // 9. Tracking UTM
        if (site.includes('utm_')) answers[9] = 2; // UTM configurés (pts:5)
        else if (site) answers[9] = 1; // Lien site simple (pts:3)
        else answers[9] = 0; // Aucun (pts:0)
        
        // 10. Engagement Vidéo
        if (p.has_videos) answers[10] = 1; // Vidéos amateurs (pts:2)
        else answers[10] = 0; // Aucune (pts:0)

        // 11. Attributs & Accessibilité
        if (p.types && p.types.length > 5) answers[11] = 2; // Complet WiFi... (pts:4)
        else answers[11] = 1; // Basiques (pts:2)

        localStorage.setItem(stateKey, JSON.stringify(answers));
        // Note: we don't switch view, we just update data in background. 
        // If user is currently on advanced-audit view, they might need a refresh or we can call renderAdv if it exists.
    }

    function getMockData(q) {
        return { name:q, formatted_address:'Paris, France', rating:4.3, user_ratings_total:22,
            website:null, types:['gym'], photos:[{},{} ], opening_hours:{ weekday_text:['L','M','M','J','V'] }, source:'demo' };
    }

    function renderSummary(p) {
        // Sync header subtitle with the audited business name
        const stars = '⭐'.repeat(Math.round(p.rating||0));
        document.getElementById('place-summary').innerHTML = `
          <div style="flex:1">
            <h3 style="margin:0 0 4px 0">${p.name}</h3>
            <p style="color:var(--text-secondary);font-size:.82rem;margin-top:2px">${p.formatted_address||''}</p>
            <div style="display:flex;gap:1.2rem;margin-top:1rem;flex-wrap:wrap">
              <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800;color:${(p.rating||0)>=4.5?'var(--success)':'var(--warning)'}">${p.rating||'–'}</div><div style="font-size:.7rem;color:var(--text-secondary)">${stars}</div></div>
              <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800;color:${(p.user_ratings_total||0)>=30?'var(--success)':'var(--warning)'}">${p.user_ratings_total||0}</div><div style="font-size:.7rem;color:var(--text-secondary)">avis</div></div>
              <div style="text-align:center"><div style="font-size:1.4rem;font-weight:800">${(p.photos||[]).length}</div><div style="font-size:.7rem;color:var(--text-secondary)">photos</div></div>
              <div style="text-align:center"><div style="font-size:1.1rem;font-weight:700;color:${p.website?'var(--success)':'var(--danger)'}">${p.website?'✅':'❌'}</div><div style="font-size:.7rem;color:var(--text-secondary)">site web</div></div>
            </div>
          </div>
          <div style="text-align:center;align-self:flex-start">
            <div style="background:rgba(99,102,241,0.15);padding:5px 12px;border-radius:6px;font-size:.78rem;color:var(--accent)">
              ${p.source==='google_scrape'?'🔍 Google (réel)':'🔬 Demo'}
            </div>
          </div>`;
    }

    function renderCriteria(place) {
        const auto = {};
        AUDIT_CRITERIA.forEach(c => { if (c.auto && AUTO_MAP[c.id]) auto[c.id] = AUTO_MAP[c.id](place); });
        const checked = new Set(Object.keys(auto).filter(k => auto[k]));

        document.getElementById('audit-list').innerHTML = AUDIT_CRITERIA.map((c,i) => {
            const ok = checked.has(c.id);
            return `<div class="audit-item ${ok?'done':''}" style="animation-delay:${i*0.05}s">
              <div class="audit-item-header">
                <div class="audit-check-group">
                  <div class="audit-toggle ${ok?'active':''} ${c.auto?'is-auto':''}" data-id="${c.id}" style="cursor:${c.auto?'default':'pointer'}">
                    <div class="toggle-inner"></div>
                  </div>
                  <div>
                    <div class="audit-label">${c.label}<span class="audit-mode-tag ${c.auto?'tag-auto':'tag-manual'}">${c.auto?'AUTO':'MANUEL'}</span></div>
                    ${c.auto && ok ? '<div style="font-size:.75rem;color:var(--success);margin-top:2px">✅ Conforme</div>' : ''}
                    ${c.auto && !ok ? '<div style="font-size:.75rem;color:var(--danger);margin-top:2px">❌ Non conforme</div>' : ''}
                    ${!c.auto ? `<div class="audit-tip" style="border:none;background:none;padding:4px 0 0">${c.tip}</div>` : ''}
                  </div>
                </div>
                <div class="audit-weight">+${c.weight} pts</div>
              </div>
            </div>`;
        }).join('');

        // Manual toggles
        document.querySelectorAll('.audit-toggle:not(.is-auto)').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const id = toggle.dataset.id;
                const item = toggle.closest('.audit-item');
                if (checked.has(id)) { checked.delete(id); toggle.classList.remove('active'); item.classList.remove('done'); }
                else { checked.add(id); toggle.classList.add('active'); item.classList.add('done'); }
                updateScore(checked);
            });
        });

        updateScore(checked);
    }

    function updateScore(checked) {
        const total = AUDIT_CRITERIA.reduce((s,c) => checked.has(c.id) ? s+c.weight : s, 0);
        const numEl = document.getElementById('score-number');
        const gaugeEl = document.getElementById('score-display');
        if (numEl) numEl.textContent = total;
        if (gaugeEl) {
            gaugeEl.className = 'score-gauge';
            if (total>=80) gaugeEl.classList.add('score-excellent');
            else if (total>=50) gaugeEl.classList.add('score-good');
            else gaugeEl.classList.add('score-poor');
        }
        const missing = AUDIT_CRITERIA.filter(c => !checked.has(c.id));
        const rb = document.getElementById('reco-block');
        const rl = document.getElementById('reco-list');
        if (rb) rb.style.display = 'block';
        if (rl) rl.innerHTML = missing.length===0
            ? '<p style="color:var(--success)">🎉 Fiche parfaitement optimisée !</p>'
            : missing.map((c,i) => `<div style="padding:10px;border-left:3px solid var(--accent);margin-bottom:10px;background:rgba(99,102,241,0.05);border-radius:0 8px 8px 0"><strong>${i+1}. ${c.label}</strong><p style="color:var(--text-secondary);font-size:.8rem;margin-top:3px">${c.tip}</p></div>`).join('');

        const pdfBtn = document.getElementById('pdf-btn');
        const promptBtn = document.getElementById('prompt-btn');
        if (pdfBtn) { pdfBtn.onclick = null; pdfBtn.addEventListener('click', () => window.print()); }
        if (promptBtn) { promptBtn.onclick = null; promptBtn.addEventListener('click', () => {
            const prompt = `Expert GBP. Score: ${total}/100.\nManquants:\n${missing.map(c=>'- '+c.label).join('\n')}\nDonne 1 recommandation actionnable par critère. Conclus par les 3 priorités du mois.`;
            navigator.clipboard.writeText(prompt).then(() => { promptBtn.textContent='✅ Copié !'; setTimeout(()=>promptBtn.innerHTML='<i class="fas fa-copy"></i> Copier prompt IA',2000); });
        }); }
    }


    // ─── REPLY REVIEWS MODULE ─────────────────────────────────────
    const MOCK_REVIEWS = [
        { id:'r1', author:'Sophie L.', rating:5, date:'Il y a 2 jours',
          text:'Cours fantastique ! Le coach est hyper professionnel et l\'ambiance est vraiment top. Les résultats sont visibles après seulement 2 semaines. Je recommande vivement !',
          replied:false, aiReply:null },
        { id:'r2', author:'Thomas M.', rating:2, date:'Il y a 4 jours',
          text:'Déçu par l\'accueil à la réception, l\'attente était longue et le vestiaire pas très propre. Les cours en eux-mêmes sont corrects mais l\'organisation laisse à désirer.',
          replied:false, aiReply:null },
        { id:'r3', author:'Isabelle R.', rating:5, date:'Il y a 1 semaine',
          text:'Super expérience depuis 3 mois ! L\'équipe est motivante, les cours d\'aquabike sont excellents. J\'ai perdu 4 kilos, je suis ravie !',
                    replied:true, aiReply:`Bonjour Isabelle,\n\nMerci du fond du cœur pour ce témoignage qui nous touche vraiment — 4 kilos, quelle belle victoire ! C'est exactement pour ces moments que toute l'équipe se donne à fond chaque jour. Nous sommes fiers de vous accompagner dans ce beau parcours et avons hâte de vous retrouver très prochainement !\n\nL'équipe ${getCurrentEst().name}` },
        { id:'r4', author:'Marc D.', rating:4, date:'Il y a 1 semaine',
          text:'Très bon cours d\'aquabike, le coach donne de bons conseils personnalisés. Petite déception sur le parking qui est compliqué en soirée.',
          replied:false, aiReply:null },
        { id:'r5', author:'Nathalie B.', rating:1, date:'Il y a 2 semaines',
          text:'Réservation annulée 1 heure avant sans prévenir. Quand j\'ai appelé, personne n\'a su m\'expliquer pourquoi. Je ne reviendrai pas.',
          replied:false, aiReply:null },
        { id:'r6', author:'Pierre G.', rating:5, date:'Il y a 3 semaines',
          text:'Excellente découverte ! Le cours du mardi avec Laure est incroyable, on sent que c\'est une vraie passionnée. Propreté irréprochable, équipement moderne.',
          replied:false, aiReply:null },
    ];

    function starsHtml(n) {
        return Array.from({length:5}, (_,i) =>
            `<i class="fas fa-star ${i < n ? 'star-filled' : 'star-empty'}"></i>`
        ).join('');
    }

    function ratingClass(r) {
        if (r >= 4) return 'rating-high';
        if (r === 3) return 'rating-mid';
        return 'rating-low';
    }

    function showReplyReviewsView(container) {
        const est = getCurrentEst();
        let activeFilter = 'all';
        let autoReplyEnabled = JSON.parse(localStorage.getItem('gbp_auto_reply') || 'false');
        let autoRunning = false;
        let reviews = [];          // ← local state, never touches MOCK_REVIEWS
        let dataSource = 'demo';   // 'live' | 'demo'

        container.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:2rem;color:var(--text-secondary)">
            <i class="fas fa-spinner fa-spin" style="color:var(--accent)"></i> Chargement des avis…
        </div>`;

        loadReviews().then(result => {
            if (result.source === 'live') {
                reviews = result.reviews;
                dataSource = 'live';
                lastLoadError = null;
            } else {
                reviews = [...MOCK_REVIEWS];
                dataSource = 'demo';
                lastLoadError = result.reason || null;
            }
            render();
        });

        let lastLoadError = null;

        async function loadReviews() {
            // Cas 1 : clé Places absente
            if (!keys.placesApi) return { source:'demo', reason:'Clé Google Places API non renseignée dans Paramètres → Clés API' };

            // Cas 2 : établissement non confirmé
            if (!est.googleVerified) return { source:'demo', reason:'Aucun établissement confirmé — allez dans Paramètres pour le rechercher' };

            // Cas 3 : place_id absent (établissement confirmé avant la dernière màj) → on le récupère
            if (!est.googlePlaceId) {
                try {
                    const searchUrl = `/api/audit?q=${encodeURIComponent(est.googleName || est.name)}&placesKey=${encodeURIComponent(keys.placesApi)}`;
                    const sr = await fetch(searchUrl);
                    const sd = await sr.json();
                    if (sd.place_id) {
                        est.googlePlaceId = sd.place_id;
                        localStorage.setItem('gbp_establishments', JSON.stringify(state.establishments));
                    } else {
                        return { source:'demo', reason:'place_id introuvable — ouvrez Paramètres, cliquez "Changer" puis "Confirmer" à nouveau' };
                    }
                } catch (e) {
                    return { source:'demo', reason:'Erreur lors de la récupération du place_id : ' + e.message };
                }
            }

            // Cas 4 : fetch des avis
            try {
                const url = `/api/reponses-aux-avis/get-reviews?placeId=${encodeURIComponent(est.googlePlaceId)}&placesKey=${encodeURIComponent(keys.placesApi)}`;
                const resp = await fetch(url);
                const data = await resp.json();
                if (data.reviews && data.reviews.length > 0) return { source:'live', reviews: data.reviews };
                if (data.demo) return { source:'demo', reason: 'API Places : ' + (data.reason || 'aucun avis retourné') };
                return { source:'demo', reason:'Aucun avis trouvé pour cet établissement' };
            } catch (e) {
                return { source:'demo', reason:'Erreur réseau : ' + e.message };
            }
        }

        function render() {
            const filtered = activeFilter === 'pending'
                ? reviews.filter(r => !r.replied)
                : activeFilter === 'replied'
                    ? reviews.filter(r => r.replied)
                    : reviews;
            const pending = reviews.filter(r => !r.replied).length;
            const replied = reviews.filter(r => r.replied).length;
            const rate = reviews.length ? Math.round((replied / reviews.length) * 100) : 0;

            container.innerHTML = `
            <div style="max-width:860px">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
                <div>
                <h2><i class="fas fa-reply" style="color:var(--accent);margin-right:8px"></i>Réponses IA – ${est.googleVerified ? est.googleName || est.name : est.name}</h2>
                  <p style="color:var(--text-secondary);font-size:.85rem;margin-top:2px">Réponses générées par Claude IA · Vous approuvez avant publication</p>
                </div>
                <span class="status-badge status-active"><i class="fas fa-robot" style="margin-right:5px"></i> Claude IA</span>
              </div>

              <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem">
                <div class="card" style="text-align:center;padding:1rem">
                  <div style="font-size:1.8rem;font-weight:800;color:var(--text-primary)">${reviews.length}</div>
                  <div style="font-size:.78rem;color:var(--text-secondary)">Avis total</div>
                </div>
                <div class="card" style="text-align:center;padding:1rem">
                  <div style="font-size:1.8rem;font-weight:800;color:var(--warning)">${pending}</div>
                  <div style="font-size:.78rem;color:var(--text-secondary)">Sans réponse</div>
                </div>
                <div class="card" style="text-align:center;padding:1rem">
                  <div style="font-size:1.8rem;font-weight:800;color:var(--success)">${replied}</div>
                  <div style="font-size:.78rem;color:var(--text-secondary)">Répondus</div>
                </div>
                <div class="card" style="text-align:center;padding:1rem">
                  <div style="font-size:1.8rem;font-weight:800;color:${rate>=80?'var(--success)':rate>=50?'var(--warning)':'var(--danger)'}">${rate}%</div>
                  <div style="font-size:.78rem;color:var(--text-secondary)">Taux réponse</div>
                </div>
              </div>

              <div class="card" style="margin-bottom:1.2rem;border-color:${autoReplyEnabled?'rgba(99,102,241,0.5)':'var(--glass-border)'}">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
                  <div style="display:flex;align-items:center;gap:12px">
                    <div class="audit-toggle ${autoReplyEnabled?'active':''}" id="auto-reply-toggle" style="cursor:pointer">
                      <div class="toggle-inner"></div>
                    </div>
                    <div>
                      <div style="font-weight:600;font-size:.9rem">Auto-réponse aux avis <span style="color:#fbbf24">★★★★</span> et <span style="color:#fbbf24">★★★★★</span></div>
                      <div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">
                        ${autoReplyEnabled
                          ? `Actif · ${reviews.filter(r=>r.rating>=4&&!r.replied).length} avis positifs en attente de réponse`
                          : 'Les avis 1★, 2★ et 3★ restent toujours en validation manuelle'}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
                    ${autoReplyEnabled ? `<button id="run-auto-btn" class="btn btn-primary" style="font-size:.8rem"><i class="fas fa-bolt"></i> Répondre maintenant aux avis positifs</button>` : ''}
                    <span class="status-badge ${autoReplyEnabled?'status-active':'status-pending'}">${autoReplyEnabled?'⚡ Auto actif':'⏸ Manuel'}</span>
                  </div>
                </div>
                ${autoReplyEnabled ? `<div style="margin-top:10px;padding:8px 12px;background:rgba(99,102,241,0.08);border-radius:6px;font-size:.78rem;color:var(--text-secondary)">
                  <i class="fas fa-info-circle" style="margin-right:4px"></i>En production, un job automatique tourne toutes les heures pour répondre aux nouveaux avis positifs. Les avis négatifs restent en validation manuelle.
                </div>` : ''}
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.8rem">
                <div style="display:flex;gap:.5rem">
                  <button class="reply-tab ${activeFilter==='all'?'active':''}" data-filter="all">Tous (${reviews.length})</button>
                  <button class="reply-tab ${activeFilter==='pending'?'active':''}" data-filter="pending">À répondre (${pending})</button>
                  <button class="reply-tab ${activeFilter==='replied'?'active':''}" data-filter="replied">Répondus (${replied})</button>
                </div>
                <div style="font-size:.75rem;color:var(--text-secondary);display:flex;align-items:center;gap:5px">
                  ${dataSource === 'live'
                    ? `<span style="color:var(--success)"><i class="fas fa-check-circle"></i> ${reviews.length} avis Google réels · <span style="color:var(--accent);cursor:pointer" id="refresh-btn">↻ Rafraîchir</span></span>`
                    : `<span style="color:var(--warning)"><i class="fas fa-flask"></i> Démo · <span style="color:var(--accent);cursor:pointer" onclick="navigateTo('params')">Configurer →</span></span>`}
                </div>
              </div>

              ${lastLoadError ? `
              <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);border-radius:8px;padding:12px 16px;margin-bottom:1rem;font-size:.82rem;line-height:1.6">
                <div style="font-weight:600;color:var(--danger);margin-bottom:4px"><i class="fas fa-exclamation-triangle"></i> Impossible de charger les vrais avis</div>
                <div style="color:var(--text-secondary)">${lastLoadError}</div>
                <div style="margin-top:8px;color:var(--text-secondary)">
                  <strong style="color:var(--text-primary)">À vérifier dans Google Cloud Console :</strong><br>
                  1. APIs &amp; Services → Bibliothèque → <strong>Places API</strong> → Activer<br>
                  2. APIs &amp; Services → Identifiants → votre clé → aucune restriction ne bloque<br>
                  3. Facturation activée sur le projet (nécessaire même avec le crédit gratuit)
                </div>
              </div>` : ''}

              <div id="reviews-list" style="display:flex;flex-direction:column;gap:12px">
                ${filtered.map((rv, idx) => renderReviewCard(rv, idx)).join('')}
              </div>
            </div>`;

            // Refresh button
            document.getElementById('refresh-btn')?.addEventListener('click', () => {
                container.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:2rem;color:var(--text-secondary)">
                    <i class="fas fa-spinner fa-spin" style="color:var(--accent)"></i> Rechargement…
                </div>`;
                loadReviews().then(result => {
                    if (result.source === 'live') { reviews = result.reviews; dataSource = 'live'; lastLoadError = null; }
                    else { lastLoadError = result.reason || null; }
                    render();
                });
            });

            // Auto-reply toggle
            const toggleEl = document.getElementById('auto-reply-toggle');
            if (toggleEl) {
                toggleEl.addEventListener('click', () => {
                    autoReplyEnabled = !autoReplyEnabled;
                    localStorage.setItem('gbp_auto_reply', JSON.stringify(autoReplyEnabled));
                    render();
                });
            }

            // Run auto-reply now button
            const runBtn = document.getElementById('run-auto-btn');
            if (runBtn) {
                runBtn.addEventListener('click', () => runAutoReply(runBtn));
            }

            // Filter tabs
            container.querySelectorAll('.reply-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    activeFilter = tab.dataset.filter;
                    render();
                });
            });

            // Generate buttons
            container.querySelectorAll('.generate-btn').forEach(btn => {
                btn.addEventListener('click', () => generateReply(btn.dataset.id));
            });

            // Regenerate buttons
            container.querySelectorAll('.regen-btn').forEach(btn => {
                btn.addEventListener('click', () => generateReply(btn.dataset.id));
            });

            // Approve & copy buttons
            container.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', () => approveReply(btn.dataset.id));
            });
        }

        function renderReviewCard(rv, idx) {
            const isReplied = rv.replied;
            return `
            <div class="review-card ${ratingClass(rv.rating)} ${isReplied?'replied-card':''}" data-review-id="${rv.id}" style="animation-delay:${idx*0.05}s">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0">
                    ${rv.author.charAt(0)}
                  </div>
                  <div>
                    <div style="font-weight:600;font-size:.9rem">${rv.author}</div>
                    <div style="font-size:.72rem;color:var(--text-secondary)">${rv.date}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <div style="font-size:.85rem">${starsHtml(rv.rating)}</div>
                  ${isReplied
                    ? '<span class="status-badge status-active">✅ Répondu</span>'
                    : '<span class="status-badge status-pending">⏳ En attente</span>'}
                </div>
              </div>
              <p style="margin-top:12px;font-size:.85rem;color:var(--text-secondary);line-height:1.6">"${rv.text}"</p>
              <div id="reply-section-${rv.id}" style="margin-top:12px">
                ${isReplied
                    ? `<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 14px;font-size:.82rem;line-height:1.6;color:var(--text-secondary);white-space:pre-wrap">${rv.aiReply}</div>`
                    : rv.aiReply
                        ? replyActionsHtml(rv)
                        : `<button class="btn btn-primary generate-btn" data-id="${rv.id}" style="font-size:.8rem;padding:6px 14px"><i class="fas fa-magic"></i> Générer une réponse IA</button>`
                }
              </div>
            </div>`;
        }

        function replyActionsHtml(rv) {
            return `<textarea class="reply-textarea" id="textarea-${rv.id}">${rv.aiReply}</textarea>
            <div style="display:flex;gap:.6rem;margin-top:8px;flex-wrap:wrap">
              <button class="btn btn-primary approve-btn" data-id="${rv.id}" style="font-size:.8rem;padding:6px 14px"><i class="fas fa-check"></i> Approuver & Copier</button>
              <button class="btn btn-outline regen-btn" data-id="${rv.id}" style="font-size:.8rem;padding:6px 14px"><i class="fas fa-redo"></i> Régénérer</button>
              ${rv.demo ? '<span style="font-size:.72rem;color:var(--text-secondary);align-self:center"><i class="fas fa-flask"></i> Mode démo (sans clé API)</span>' : ''}
            </div>`;
        }

        async function runAutoReply(btn) {
            if (autoRunning) return;
            const targets = reviews.filter(r => r.rating >= 4 && !r.replied);
            if (targets.length === 0) { showToast('Aucun avis positif en attente !', '#6366f1'); return; }

            autoRunning = true;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Traitement de ${targets.length} avis…`;

            let done = 0;
            for (const rv of targets) {
                // 1. Generate reply
                try {
                    const resp = await fetch('/api/reponses-aux-avis/generate-reply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            review: rv, businessName: est.name,
                            provider: keys.aiProvider || 'claude',
                            model:    keys.aiModel    || undefined,
                            anthropicKey: keys.anthropic || undefined,
                            openaiKey:    keys.openai    || undefined,
                            geminiKey:    keys.gemini    || undefined,
                        })
                    });
                    const data = await resp.json();
                    rv.aiReply = data.reply;
                } catch {
                    rv.aiReply = `Bonjour ${rv.author.split(' ')[0]},\n\nMerci beaucoup pour votre avis, il nous fait vraiment plaisir ! Toute l'équipe sera ravie de vous lire. À très vite !\n\nL'équipe ${est.name}`;
                }

                // 2. Post reply
                try {
                    const postResp = await fetch('/api/reponses-aux-avis/post-reply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reviewName: rv.googleReviewName || null, replyText: rv.aiReply })
                    });
                    const postData = await postResp.json();
                    if (postData.success || postData.demo) { rv.replied = true; done++; }
                } catch { rv.replied = true; done++; }

                btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${done}/${targets.length} traités…`;
            }

            autoRunning = false;
            showToast(`✅ ${done} réponse${done>1?'s':''} publiée${done>1?'s':''} automatiquement !`, '#22c55e');
            render();
        }

        async function generateReply(reviewId) {
            const rv = reviews.find(r => r.id === reviewId);
            if (!rv) return;
            const section = document.getElementById(`reply-section-${reviewId}`);
            const btn = section.querySelector('.generate-btn, .regen-btn');
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Génération…'; }

            try {
                const resp = await fetch('/api/reponses-aux-avis/generate-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        review: rv, businessName: est.name,
                        provider: keys.aiProvider || 'claude',
                        model:    keys.aiModel    || undefined,
                        anthropicKey: keys.anthropic || undefined,
                        openaiKey:    keys.openai    || undefined,
                        geminiKey:    keys.gemini    || undefined,
                    })
                });
                const data = await resp.json();
                rv.aiReply = data.reply;
                rv.demo = !!data.demo;
            } catch {
                rv.aiReply = `Bonjour ${rv.author.split(' ')[0]},\n\nMerci pour votre avis ! Nous sommes ravis de pouvoir vous répondre et restons à votre écoute.\n\nL'équipe ${est.name}`;
                rv.demo = true;
            }
            section.innerHTML = replyActionsHtml(rv);
            section.querySelector('.approve-btn').addEventListener('click', () => approveReply(reviewId));
            section.querySelector('.regen-btn').addEventListener('click', () => generateReply(reviewId));
        }

        async function approveReply(reviewId) {
            const rv = reviews.find(r => r.id === reviewId);
            if (!rv) return;
            const ta = document.getElementById(`textarea-${reviewId}`);
            const text = ta ? ta.value : rv.aiReply;

            const btn = document.querySelector(`.approve-btn[data-id="${reviewId}"]`);
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publication…'; }

            try {
                const resp = await fetch('/api/reponses-aux-avis/post-reply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        reviewName: rv.googleReviewName || null,
                        replyText: text,
                        googleClientId:     keys.googleClientId     || undefined,
                        googleClientSecret: keys.googleClientSecret || undefined,
                        googleRefreshToken: keys.googleRefreshToken || undefined,
                    })
                });
                const data = await resp.json();

                rv.replied = true;
                rv.aiReply = text;

                if (data.demo) {
                    // Google not connected yet — copy to clipboard as fallback
                    await navigator.clipboard.writeText(text).catch(() => {});
                    showToast('📋 Google non connecté — réponse copiée dans le presse-papiers. Collez-la sur business.google.com', '#f59e0b');
                } else if (data.success) {
                    showToast('✅ Réponse publiée sur Google Business !', '#22c55e');
                } else {
                    showToast('❌ Erreur : ' + (data.error || 'Vérifiez la connexion Google.'), '#ef4444');
                    rv.replied = false;
                }
            } catch {
                await navigator.clipboard.writeText(text).catch(() => {});
                rv.replied = true;
                showToast('📋 Erreur réseau — réponse copiée dans le presse-papiers.', '#f59e0b');
            }
            render();
        }

        function showToast(msg, color) {
            const toast = document.createElement('div');
            toast.textContent = msg;
            Object.assign(toast.style, { position:'fixed', bottom:'24px', left:'50%', transform:'translateX(-50%)', background:color, color:'white', padding:'10px 20px', borderRadius:'8px', fontSize:'.85rem', zIndex:'9999', boxShadow:'0 4px 20px rgba(0,0,0,0.3)', maxWidth:'90vw', textAlign:'center' });
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
        }

        render();
    }

    // ─── CLIENTS VIEW ─────────────────────────────────────────────
    function showClientsView(container) {
        const est = getCurrentEst();
        container.innerHTML = `
        <div class="card" style="max-width:700px">
          <h2>Base Clients – ${est.googleVerified ? est.googleName || est.name : est.name}</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:1rem">
            <thead><tr style="text-align:left;color:var(--text-secondary);border-bottom:1px solid var(--glass-border);font-size:.8rem">
              <th style="padding:10px">Nom</th><th style="padding:10px">Téléphone</th><th style="padding:10px">Statut</th>
            </tr></thead>
            <tbody>
              <tr><td style="padding:10px">Jean Dupont</td><td style="padding:10px">06 12 34 56 78</td><td><span class="status-badge status-active">Fidèle</span></td></tr>
              <tr><td style="padding:10px">Marie Curie</td><td style="padding:10px">06 98 76 54 32</td><td><span class="status-badge status-pending">Nouveau</span></td></tr>
            </tbody>
          </table>
          <button class="btn btn-primary btn-full" style="margin-top:1.5rem"><i class="fas fa-upload"></i> Importer CSV</button>
        </div>`;
    }

    // ─── PARAMS VIEW ──────────────────────────────────────────────
    function showParamsView(container) {
        window.currentParamsContainer = container;
        renderParams();
    }

    function renderParams() {
        const container = window.currentParamsContainer;
        if (!container) return;
        const est = getCurrentEst();
            const verified = est.googleVerified;
            container.innerHTML = `
            <div style="max-width:600px;display:flex;flex-direction:column;gap:1.2rem">

              <!-- ① Liste des clients -->
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
                  <h2 style="margin:0">Clients</h2>
                  <button id="add-client-btn" class="btn btn-primary" style="font-size:.8rem"><i class="fas fa-plus"></i> Ajouter</button>
                </div>
                <div style="display:flex;flex-direction:column;gap:7px">
                  ${state.establishments.map(e => `
                  <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${e.id===state.currentId?'var(--accent)':'var(--glass-border)'};background:${e.id===state.currentId?'rgba(99,102,241,0.08)':'transparent'};cursor:pointer;transition:all .15s" data-switch-id="${e.id}">
                    <div style="width:32px;height:32px;border-radius:8px;background:${e.id===state.currentId?'var(--accent)':'rgba(255,255,255,0.08)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                      <i class="fas fa-store" style="font-size:.72rem"></i>
                    </div>
                    <div style="flex:1;min-width:0">
                      <div style="font-weight:600;font-size:.88rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.googleVerified ? e.googleName || e.name : e.name}</div>
                      <div style="font-size:.72rem;color:var(--text-secondary);margin-top:1px">${e.googleVerified ? `✅ ${e.googleRating||'–'}★ · ${e.googleReviewCount||0} avis · ${e.googleAddress||''}` : '⚠️ Non vérifié — cliquez pour configurer'}</div>
                    </div>
                    ${e.id===state.currentId ? '<span class="status-badge status-active" style="flex-shrink:0;font-size:.68rem">Actif</span>' : ''}
                    ${state.establishments.length > 1 ? `<button class="del-client-btn" data-del-id="${e.id}" style="background:transparent;border:none;color:rgba(239,68,68,.5);cursor:pointer;padding:4px 6px;border-radius:4px;font-size:.78rem" title="Supprimer" onclick="event.stopPropagation()"><i class="fas fa-trash"></i></button>` : ''}
                  </div>`).join('')}
                </div>
              </div>

              <!-- ② Établissement client (actif) -->
              <div class="card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem">
                  <h3><i class="fas fa-store" style="color:var(--accent);margin-right:8px"></i>Établissement client</h3>
                  ${verified
                    ? '<span class="status-badge status-active">✅ Fiche confirmée</span>'
                    : '<span class="status-badge status-pending">⚠️ Non vérifié</span>'}
                </div>

                ${verified ? `
                <div style="display:flex;align-items:center;gap:14px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:14px;margin-bottom:1rem">
                  <div style="width:44px;height:44px;border-radius:10px;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <i class="fas fa-map-marker-alt" style="color:var(--success)"></i>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:.95rem">${est.googleName}</div>
                    <div style="font-size:.78rem;color:var(--text-secondary);margin-top:2px">${est.googleAddress}</div>
                    <div style="margin-top:4px;display:flex;gap:10px;font-size:.78rem">
                      <span style="color:#fbbf24">${'★'.repeat(Math.round(est.googleRating||0))}${'☆'.repeat(5-Math.round(est.googleRating||0))}</span>
                      <span style="color:var(--text-secondary)">${est.googleRating} · ${est.googleReviewCount} avis</span>
                    </div>
                  </div>
                  <button id="change-est-btn" class="btn btn-outline" style="font-size:.75rem;padding:5px 12px;white-space:nowrap">Changer</button>
                </div>` : ''}

                <div id="search-zone" style="${verified?'display:none':''}">
                  <label style="display:block;color:var(--text-secondary);font-size:.85rem;margin-bottom:6px">Nom du client ou de l'établissement</label>
                  <div class="audit-search-bar" style="margin-bottom:.8rem">
                    <i class="fas fa-search" style="color:var(--accent)"></i>
                    <input id="client-search-input" type="text" placeholder="Ex: Aquabike Center Paris 15"
                      value="${est.name !== 'Aquabike Center' ? est.name : ''}"
                      style="flex:1;background:none;border:none;color:var(--text-primary);font-size:.95rem;outline:none;padding:0 8px">
                    <button id="client-search-btn" class="btn btn-primary" style="font-size:.82rem"><i class="fas fa-search"></i> Rechercher</button>
                  </div>
                  <div id="search-status" style="display:none;font-size:.83rem;color:var(--text-secondary);margin-bottom:.8rem"></div>
                  <div id="search-result" style="display:none"></div>
                </div>
              </div>

              <!-- ② Modèle IA -->
              <div class="card">
                <h3 style="margin-bottom:1.2rem"><i class="fas fa-robot" style="color:var(--accent);margin-right:8px"></i>Modèle IA pour les réponses</h3>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-bottom:1.2rem">
                  ${Object.entries(AI_PROVIDERS).map(([id, p]) => `
                  <label style="display:flex;align-items:center;gap:10px;padding:12px;border-radius:8px;border:2px solid ${keys.aiProvider===id?'var(--accent)':'var(--glass-border)'};cursor:pointer;transition:border-color .2s;background:${keys.aiProvider===id?'rgba(99,102,241,0.08)':'transparent'}">
                    <input type="radio" name="ai-provider" value="${id}" ${keys.aiProvider===id?'checked':''} style="accent-color:var(--accent)">
                    <span style="font-size:.85rem;font-weight:${keys.aiProvider===id?'600':'400'}">${p.label}</span>
                  </label>`).join('')}
                </div>

                <div style="margin-bottom:1rem">
                  <label style="display:block;font-size:.82rem;color:var(--text-secondary);margin-bottom:4px">Modèle</label>
                  <select id="ai-model-sel" style="width:100%;padding:8px 10px;background:rgba(0,0,0,0.2);border:1px solid var(--glass-border);color:var(--text-primary);border-radius:7px;font-size:.85rem;font-family:inherit">
                    ${AI_PROVIDERS[keys.aiProvider||'claude'].models.map(m =>
                      `<option value="${m.id}" ${(keys.aiModel||AI_PROVIDERS[keys.aiProvider||'claude'].models[0].id)===m.id?'selected':''}>${m.label}</option>`
                    ).join('')}
                  </select>
                </div>
              </div>

              <!-- ③ Clés API -->
              <div class="card">
                <h3 style="margin-bottom:1.2rem"><i class="fas fa-key" style="color:var(--accent);margin-right:8px"></i>Clés API</h3>

                <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:.7rem;text-transform:uppercase;letter-spacing:.05em">Recherche d'établissement</div>
                ${keyField('places', 'Google Places API', 'AIzaSy…', 'Paramètres → recherche client', 'https://console.cloud.google.com/apis/library/places-backend.googleapis.com')}

                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--glass-border)">
                  <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:.7rem;text-transform:uppercase;letter-spacing:.05em">Génération des réponses IA</div>
                  ${keyField('anthropic', 'Claude (Anthropic)',  'sk-ant-…',   'console.anthropic.com',           'https://console.anthropic.com/settings/api-keys')}
                  ${keyField('openai',    'OpenAI (ChatGPT)',    'sk-…',       'platform.openai.com',             'https://platform.openai.com/api-keys')}
                  ${keyField('gemini',    'Google Gemini',       'AIzaSy…',    'aistudio.google.com',             'https://aistudio.google.com/app/apikey')}
                </div>

                <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--glass-border)">
                  <div style="font-size:.78rem;font-weight:600;color:var(--text-secondary);margin-bottom:.7rem;text-transform:uppercase;letter-spacing:.05em">Google OAuth — Publication des réponses</div>
                  ${keyField('googleClientId',     'Client ID',     '123456….apps.googleusercontent.com', 'Google Cloud Console')}
                  ${keyField('googleClientSecret', 'Client Secret', 'GOCSPX-…', 'Google Cloud Console')}
                  ${keyField('googleRefreshToken', 'Refresh Token', 'Généré via le bouton ci-dessous', 'Obtenu après connexion OAuth')}
                  <div style="margin-top:.8rem;display:flex;gap:.6rem;flex-wrap:wrap;align-items:center">
                    <a id="oauth-link" href="/api/reponses-aux-avis/oauth-start" class="btn btn-primary" style="font-size:.8rem">
                      <i class="fab fa-google"></i> Obtenir le Refresh Token
                    </a>
                    <span style="font-size:.75rem;color:var(--text-secondary)">Renseignez Client ID & Secret d'abord</span>
                  </div>
                </div>
              </div>

            </div>`;

            bindParamsEvents();
        }

        function keyField(id, label, placeholder, hint, docUrl) {
            const val = keys[id] || '';
            const filled = val.length > 0;
            return `<div style="margin-bottom:.9rem">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <label style="font-size:.82rem;color:var(--text-secondary)">${label}</label>
                ${filled
                  ? '<span style="font-size:.72rem;color:var(--success)"><i class="fas fa-check-circle"></i> Renseignée</span>'
                  : docUrl ? `<a href="${docUrl}" target="_blank" style="font-size:.72rem;color:var(--accent)">Obtenir la clé →</a>` : ''}
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <input type="password" id="key-${id}" value="${val}"
                  placeholder="${placeholder}"
                  style="flex:1;background:rgba(0,0,0,0.2);border:1px solid ${filled?'rgba(34,197,94,0.4)':'var(--glass-border)'};color:var(--text-primary);border-radius:7px;padding:8px 10px;font-size:.82rem;outline:none;font-family:monospace;transition:border-color .2s">
                <button class="key-eye-btn" data-target="key-${id}" style="background:transparent;border:1px solid var(--glass-border);color:var(--text-secondary);border-radius:7px;padding:7px 10px;cursor:pointer" title="Afficher/masquer">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
              <div style="font-size:.72rem;color:var(--text-secondary);margin-top:3px">${hint}</div>
            </div>`;
        }

        function bindParamsEvents() {
            // Add client button
            document.getElementById('add-client-btn')?.addEventListener('click', () => {
                addNewClient();
            });

            // Switch to client on row click
            document.querySelectorAll('[data-switch-id]').forEach(row => {
                row.addEventListener('click', () => {
                    state.currentId = row.dataset.switchId;
                    localStorage.setItem('gbp_currentId', state.currentId);
                    updateBrandUI();
                    renderClientSwitcher(); 
                    // Refresh current view globally
                    const active = document.querySelector('.nav-item.active[data-view]');
                    if (active) navigateTo(active.dataset.view);
                });
            });

            // Delete client
            document.querySelectorAll('.del-client-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.delId;
                    if (!confirm('Supprimer ce client ?')) return;
                    state.establishments = state.establishments.filter(e => e.id !== id);
                    if (state.currentId === id) state.currentId = state.establishments[0].id;
                    localStorage.setItem('gbp_establishments', JSON.stringify(state.establishments));
                    localStorage.setItem('gbp_currentId', state.currentId);
                    updateBrandUI();
                    renderParams();
                });
            });

            // AI provider radio buttons
            document.querySelectorAll('input[name="ai-provider"]').forEach(radio => {
                radio.addEventListener('change', () => {
                    keys.aiProvider = radio.value;
                    keys.aiModel = AI_PROVIDERS[radio.value].models[0].id;
                    saveKeys();
                    renderParams(); // re-render to update model options + border colors
                });
            });

            // Model selector
            document.getElementById('ai-model-sel')?.addEventListener('change', e => {
                keys.aiModel = e.target.value;
                saveKeys();
            });

            // Key inputs — save on change + refresh border color
            const keyMap = { places:'placesApi', anthropic:'anthropic', openai:'openai', gemini:'gemini', googleClientId:'googleClientId', googleClientSecret:'googleClientSecret', googleRefreshToken:'googleRefreshToken' };
            Object.entries(keyMap).forEach(([fieldId, stateKey]) => {
                const input = document.getElementById(`key-${fieldId}`);
                if (!input) return;
                input.addEventListener('input', () => {
                    keys[stateKey] = input.value.trim();
                    saveKeys();
                    input.style.borderColor = input.value ? 'rgba(34,197,94,0.4)' : 'var(--glass-border)';
                    // Update the "Renseignée" badge without full re-render
                    const badge = input.closest('div[style]')?.querySelector('span[style*="success"]') || input.closest('div[style]')?.previousElementSibling?.querySelector('span');
                    if (badge && input.value) { badge.style.color='var(--success)'; badge.innerHTML='<i class="fas fa-check-circle"></i> Renseignée'; }
                });
            });

            // Eye toggle — show/hide key value
            document.querySelectorAll('.key-eye-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const inp = document.getElementById(btn.dataset.target);
                    if (!inp) return;
                    const isPassword = inp.type === 'password';
                    inp.type = isPassword ? 'text' : 'password';
                    btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
                });
            });

            // OAuth link — pass client id/secret via query so oauth-start can use them
            const oauthLink = document.getElementById('oauth-link');
            if (oauthLink && keys.googleClientId && keys.googleClientSecret) {
                oauthLink.href = `/api/reponses-aux-avis/oauth-start?clientId=${encodeURIComponent(keys.googleClientId)}&clientSecret=${encodeURIComponent(keys.googleClientSecret)}`;
            }

            // Toggle back to search zone
            document.getElementById('change-est-btn')?.addEventListener('click', () => {
                document.getElementById('search-zone').style.display = '';
                document.getElementById('change-est-btn').closest('div[style]').style.display = 'none';
            });

            // Search
            const searchBtn = document.getElementById('client-search-btn');
            const searchInput = document.getElementById('client-search-input');
            if (searchBtn) searchBtn.addEventListener('click', runClientSearch);
            if (searchInput) searchInput.addEventListener('keydown', e => e.key === 'Enter' && runClientSearch());

            // Google connection status
            fetch('/api/reponses-aux-avis/post-reply', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({reviewName:'test',replyText:'test'}) })
                .then(r => r.json())
                .then(d => {
                    const badge = document.getElementById('google-status-badge');
                    if (!badge) return;
                    if (d.demo) { badge.className='status-badge status-pending'; badge.textContent='⏳ Non connecté'; }
                    else { badge.className='status-badge status-active'; badge.textContent='✅ Connecté'; }
                }).catch(() => {
                    const badge = document.getElementById('google-status-badge');
                    if (badge) { badge.className='status-badge status-pending'; badge.textContent='⏳ Non connecté'; }
                });
        }

        async function runClientSearch() {
            const q = document.getElementById('client-search-input')?.value.trim();
            if (!q) return;
            const status = document.getElementById('search-status');
            const result = document.getElementById('search-result');
            status.style.display = 'block';
            status.innerHTML = '<i class="fas fa-spinner fa-spin" style="color:var(--accent)"></i>&nbsp; Recherche sur Google…';
            result.style.display = 'none';

            let data;
            try {
                let url = '/api/audit?q=' + encodeURIComponent(q);
                if (keys.placesApi) url += '&placesKey=' + encodeURIComponent(keys.placesApi);
                const r = await fetch(url);
                data = r.ok ? await r.json() : null;
            } catch { data = null; }

            status.style.display = 'none';

            if (!data || !data.name) {
                result.style.display = 'block';
                result.innerHTML = `<div style="padding:12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:.85rem;color:var(--danger)">
                  <i class="fas fa-exclamation-triangle"></i> Aucun résultat trouvé. Essayez un nom plus précis ou ajoutez la ville.
                </div>`;
                return;
            }

            const stars = '★'.repeat(Math.round(data.rating||0)) + '☆'.repeat(5-Math.round(data.rating||0));
            const sourceBadge = {
                google_places_api: '<span style="background:rgba(34,197,94,0.15);color:#4ade80;padding:3px 8px;border-radius:5px;font-size:.72rem">✅ API Google</span>',
                google_scrape:     '<span style="background:rgba(99,102,241,0.15);color:#818cf8;padding:3px 8px;border-radius:5px;font-size:.72rem">🔍 Scraping</span>',
            }[data.source] || '<span style="background:rgba(245,158,11,0.15);color:#fbbf24;padding:3px 8px;border-radius:5px;font-size:.72rem">⚠️ Demo</span>';
            const isDemo = !['google_places_api','google_scrape'].includes(data.source);

            result.style.display = 'block';
            result.innerHTML = `
              <div style="border:2px solid ${isDemo?'var(--warning)':'var(--accent)'};border-radius:10px;padding:14px;background:rgba(99,102,241,0.06)" id="found-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
                  <div style="flex:1;min-width:0">
                    <div style="font-weight:700;font-size:1rem">${data.name}</div>
                    <div style="font-size:.8rem;color:var(--text-secondary);margin-top:3px">${data.formatted_address||''}</div>
                    <div style="margin-top:8px;display:flex;gap:14px;font-size:.82rem;flex-wrap:wrap">
                      <span style="color:#fbbf24">${stars}</span>
                      <span style="color:var(--text-secondary)">${data.rating||'–'} · ${data.user_ratings_total||0} avis</span>
                      <span style="color:var(--text-secondary)">${(data.photos||[]).length} photos</span>
                      ${data.website ? `<span style="color:var(--success)"><i class="fas fa-globe"></i> Site web</span>` : ''}
                    </div>
                  </div>
                  <div>${sourceBadge}</div>
                </div>
                ${isDemo ? `<div style="margin-top:10px;font-size:.78rem;color:var(--warning);padding:8px 12px;background:rgba(245,158,11,0.07);border-radius:6px;line-height:1.5">
                  <i class="fas fa-exclamation-triangle"></i> <strong>Données non vérifiées.</strong> Ajoutez <code>GOOGLE_PLACES_API_KEY</code> dans vos variables d'environnement pour obtenir les vraies données Google.
                </div>` : ''}
                <div style="display:flex;gap:.6rem;margin-top:12px;flex-wrap:wrap">
                  <button id="confirm-est-btn" class="btn btn-primary" style="font-size:.82rem"><i class="fas fa-check"></i> Confirmer cet établissement</button>
                  <button id="retry-search-btn" class="btn btn-outline" style="font-size:.82rem"><i class="fas fa-redo"></i> Pas le bon — réessayer</button>
                </div>
              </div>`;

            document.getElementById('confirm-est-btn').addEventListener('click', () => {
                est.name              = data.name;
                est.location          = data.formatted_address || est.location;
                est.googleName        = data.name;
                est.googleAddress     = data.formatted_address || '';
                est.googleRating      = data.rating || 0;
                est.googleReviewCount = data.user_ratings_total || 0;
                est.googlePhotoCount  = (data.photos || []).length;
                est.googlePlaceId     = data.place_id || null;
                est.googleUrl         = data.google_url || null;
                est.googleVerified    = true;
                localStorage.setItem('gbp_establishments', JSON.stringify(state.establishments));
                updateBrandUI();
                renderParams();
            });

            document.getElementById('retry-search-btn').addEventListener('click', () => {
                result.style.display = 'none';
                document.getElementById('client-search-input').focus();
            });
        }

        // renderParams();
        navigateTo('dashboard');
    