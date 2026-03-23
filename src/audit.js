// ============================================================
// GBP AUDIT MODULE - 10 Most Powerful Optimizations
// ============================================================

const AUDIT_CRITERIA = [
    {
        id: 'category',
        label: 'Nom & Catégorie Principale',
        description: 'Le nom correspond exactement à l\'enseigne réelle. La catégorie principale est la plus précise possible (ex: "Salle de fitness aquatique" plutôt que "Club de sport").',
        weight: 15,
        tip: '🎯 Action : Vérifiez votre catégorie sur <strong>business.google.com</strong> et choisissez la plus spécifique possible.'
    },
    {
        id: 'description',
        label: 'Description optimisée (750 car.)',
        description: 'La description est complète, contient des mots-clés locaux pertinents (nom de ville, quartier, type de cours) et est proche des 750 caractères.',
        weight: 15,
        tip: '✍️ Action : Rédigez une description de 700+ caractères intégrant vos mots-clés cibles (ex: "aquabike Paris 15", "vélo aquatique", "cours aquafitness").'
    },
    {
        id: 'photos',
        label: 'Photos récentes & diversifiées',
        description: 'Au moins 1 photo publiée dans les 30 derniers jours. La fiche possède photo de couverture, photo intérieure, photo des coachs et des équipements.',
        weight: 15,
        tip: '📸 Action : Programmer 1 publication photo par semaine. Privilégiez les séances en action et les "avant/après" des espaces.'
    },
    {
        id: 'reviews_volume',
        label: 'Volume d\'avis (≥ 30 avis)',
        description: 'La fiche possède un minimum de 30 avis Google. Le volume est un facteur de confiance majeur pour l\'algorithme.',
        weight: 15,
        tip: '⭐ Action : Activez le module SMS Smart Reviews pour automatiser les demandes d\'avis après chaque séance.'
    },
    {
        id: 'reviews_score',
        label: 'Note moyenne (≥ 4.5/5)',
        description: 'La note moyenne est supérieure ou égale à 4.5 étoiles, ce qui correspond au seuil visible dans les résultats locaux premium.',
        weight: 10,
        tip: '📈 Action : Répondez systématiquement aux avis négatifs en 24h. Une réponse professionnelle limite l\'impact sur votre note.'
    },
    {
        id: 'responses',
        label: 'Taux de réponse aux avis (> 80%)',
        description: 'Plus de 80% des avis reçus ont obtenu une réponse du propriétaire, qu\'ils soient positifs ou négatifs.',
        weight: 10,
        tip: '💬 Action : Planifiez un moment hebdomadaire pour répondre aux avis. Utilisez un template de réponse positive pour gagner du temps.'
    },
    {
        id: 'posts',
        label: 'Google Posts actifs (< 7 jours)',
        description: 'Un post Google a été publié sur la fiche il y a moins de 7 jours. Les posts indiquent que la fiche est gérée activement.',
        weight: 10,
        tip: '📢 Action : Publiez 1 post/semaine. Exemple : "Séance aquabike ce soir 18h ! Réservez en ligne →"'
    },
    {
        id: 'hours',
        label: 'Horaires complets & précis',
        description: 'Les horaires d\'ouverture sont renseignés pour tous les jours de la semaine, avec les horaires exceptionnels (jours fériés, vacances) à jour.',
        weight: 5,
        tip: '🕐 Action : Mettez à jour les horaires des jours fériés à venir. Google vous alerte si vos horaires sont inhabituels.'
    },
    {
        id: 'services',
        label: 'Services & Produits listés',
        description: 'La section "Services" détaille l\'ensemble des prestations proposées avec descriptions et prix si possible.',
        weight: 3,
        tip: '📋 Action : Listez chaque type de cours (aquabike, aquagym, aquaSenior...) dans la section Services avec une description courte.'
    },
    {
        id: 'attributes',
        label: 'Site web + Attributs renseignés',
        description: 'Le lien du site web est renseigné. Les attributs pertinents sont cochés (Accessible PMR, Parking, WiFi, Vestiaires...).',
        weight: 2,
        tip: '🔗 Action : Vérifiez que votre site web pointe vers la bonne URL et ajoutez au moins 5 attributs pertinents.'
    }
];

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
    const criteriaHTML = AUDIT_CRITERIA.map((c, i) => `
        <div class="audit-item" data-id="${c.id}" style="animation-delay: ${i * 0.07}s">
            <div class="audit-item-header">
                <div class="audit-check-group">
                    <div class="audit-toggle" data-id="${c.id}">
                        <div class="toggle-inner"></div>
                    </div>
                    <div>
                        <div class="audit-label">${c.label}</div>
                        <div class="audit-description">${c.description}</div>
                    </div>
                </div>
                <div class="audit-weight">+${c.weight} pts</div>
            </div>
            <div class="audit-tip" id="tip-${c.id}" style="display:none;">
                <i class="fas fa-lightbulb" style="color: var(--warning); margin-right: 8px;"></i>
                ${c.tip}
            </div>
        </div>
    `).join('');

    return `
        <div style="max-width: 800px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2>Audit GBP – 10 Optimisations Clés</h2>
                    <p style="color: var(--text-secondary); margin-top: 4px; font-size: 0.9rem;">
                        Cochez chaque critère présent sur la fiche de votre client pour obtenir un score et des recommandations.
                    </p>
                </div>
                <div class="score-gauge" id="score-display">
                    <div class="score-number" id="score-number">0</div>
                    <div class="score-label">/ 100</div>
                </div>
            </div>
            
            <div class="audit-legend">
                <div class="legend-item"><span style="color: var(--success);">✅ Coché</span> = critère respecté</div>
                <div class="legend-item"><span style="color: var(--warning);">💡 Non coché</span> = recommandation affichée</div>
            </div>
            
            <div class="audit-list">${criteriaHTML}</div>

            <div id="audit-reco-block" class="card" style="margin-top: 2rem; display: none;">
                <h3>📋 Plan d'Action Recommandé</h3>
                <div id="audit-reco-list" style="margin-top: 1rem;"></div>
                <div style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button id="export-pdf-btn" style="background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-file-pdf"></i> Exporter en PDF
                    </button>
                    <button id="copy-prompt-btn" style="background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-copy"></i> Copier le prompt IA
                    </button>
                </div>
            </div>
        </div>
    `;
}

function attachAuditListeners() {
    const checked = new Set();

    document.querySelectorAll('.audit-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const id = toggle.dataset.id;
            const tip = document.getElementById(`tip-${id}`);
            const item = toggle.closest('.audit-item');

            if (checked.has(id)) {
                checked.delete(id);
                toggle.classList.remove('active');
                item.classList.remove('done');
                if (tip) tip.style.display = 'none';
            } else {
                checked.add(id);
                toggle.classList.add('active');
                item.classList.add('done');
                if (tip) tip.style.display = 'none';
            }

            // Show tip for unchecked items
            AUDIT_CRITERIA.forEach(c => {
                const t = document.getElementById(`tip-${c.id}`);
                if (t && !checked.has(c.id)) t.style.display = 'block';
            });

            updateScore(checked);
        });
    });

    document.getElementById('copy-prompt-btn')?.addEventListener('click', copyAuditPrompt);
    document.getElementById('export-pdf-btn')?.addEventListener('click', () => window.print());
}

function updateScore(checked) {
    const total = AUDIT_CRITERIA.reduce((sum, c) => checked.has(c.id) ? sum + c.weight : sum, 0);
    const scoreEl = document.getElementById('score-number');
    scoreEl.innerText = total;
    
    const display = document.getElementById('score-display');
    display.className = 'score-gauge';
    if (total >= 80) display.classList.add('score-excellent');
    else if (total >= 50) display.classList.add('score-good');
    else display.classList.add('score-poor');

    // Build recommendations
    const missing = AUDIT_CRITERIA.filter(c => !checked.has(c.id));
    const recoBlock = document.getElementById('audit-reco-block');
    const recoList = document.getElementById('audit-reco-list');
    
    if (missing.length > 0) {
        recoBlock.style.display = 'block';
        recoList.innerHTML = missing.map((c, i) => `
            <div style="padding: 12px; border-left: 3px solid var(--accent); margin-bottom: 12px; background: rgba(99,102,241,0.05); border-radius: 0 8px 8px 0;">
                <strong style="color: var(--text-primary);">${i + 1}. ${c.label}</strong>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">${c.tip}</p>
            </div>
        `).join('');
    } else {
        recoBlock.style.display = 'block';
        recoList.innerHTML = `<p style="color: var(--success);">🎉 Félicitations ! La fiche est parfaitement optimisée.</p>`;
    }
}

function copyAuditPrompt() {
    const prompt = `Tu es un expert en référencement local Google Business Profile (GBP). 
Analyse la fiche GBP suivante et donne un score sur 100 en évaluant ces 10 critères :
1. Nom & Catégorie principale (15 pts)
2. Description 750 caractères avec mots-clés locaux (15 pts)
3. Photos récentes < 30 jours + couverture + intérieur (15 pts)
4. Volume d'avis ≥ 30 (15 pts)
5. Note moyenne ≥ 4.5/5 (10 pts)
6. Taux de réponse aux avis > 80% (10 pts)
7. Google Posts actif < 7 jours (10 pts)
8. Horaires complets + jours fériés (5 pts)
9. Services & Produits listés avec prix (3 pts)
10. Site web + Attributs (WiFi, PMR, Parking...) (2 pts)

Pour chaque critère manquant, fournis une recommandation concrète et actionnable en 1 phrase.
Termine par un résumé : Score total, Priorité 1, Priorité 2, Priorité 3.`;

    navigator.clipboard.writeText(prompt).then(() => {
        const btn = document.getElementById('copy-prompt-btn');
        btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
        btn.style.color = 'var(--success)';
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-copy"></i> Copier le prompt IA';
            btn.style.color = 'var(--accent)';
        }, 2000);
    });
}
