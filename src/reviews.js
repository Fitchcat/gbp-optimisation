// ============================================================
// SMART REVIEWS MODULE – SMS Twilio + IA Keywords
// ============================================================
// This module sends an SMS to clients 30 min after a session,
// suggesting keywords to include in their Google review.
// Backend: /api/send-sms (Vercel serverless function)
// ============================================================

const SUGGESTED_KEYWORDS = [
    'propreté', 'coach', 'résultats', 'ambiance', 'aquabike',
    'bonne humeur', 'professionnel', 'motivant', 'efficace', 'conseils'
];

const SMS_TEMPLATES = [
    (name, keywords) => `Bonjour ${name} ! 🏊 Merci pour votre séance aujourd'hui. Votre avis aide d'autres sportifs à nous trouver 😊\n\nSi vous avez apprécié nos ${keywords[0]} et le ${keywords[1]}, laissez-nous un avis ici → {LINK}\n\nMerci ! – L'équipe`,
    (name, keywords) => `Bonjour ${name} ! Nous espérons que votre cours vous a plu 💪\n\nUn avis de 2 min ferait toute la différence ! Mentionnez le ${keywords[0]} et ${keywords[1]} si vous avez remarqué 😉\n\n→ {LINK}`,
];

export function showSmartReviewsView() {
    let view = document.getElementById('reviews-view');
    if (!view) {
        view = document.createElement('div');
        view.id = 'reviews-view';
        document.querySelector('.main-content').appendChild(view);
    }
    view.style.display = 'block';
    view.innerHTML = buildReviewsHTML();
    attachReviewsListeners();
}

function buildReviewsHTML() {
    const mockClients = [
        { name: 'Jean Dupont', phone: '0612345678', lastSession: '17:30', status: 'pending' },
        { name: 'Marie Curie', phone: '0698765432', lastSession: '18:00', status: 'sent' },
        { name: 'Paul Martin', phone: '0756781234', lastSession: '09:00', status: 'pending' },
    ];

    const clientRows = mockClients.map(c => `
        <tr class="client-row" data-name="${c.name}" data-phone="${c.phone}">
            <td style="padding: 12px;">${c.name}</td>
            <td style="padding: 12px; color: var(--text-secondary);">${c.phone}</td>
            <td style="padding: 12px;">Séance ${c.lastSession}</td>
            <td style="padding: 12px;">
                <span class="status-badge ${c.status === 'sent' ? 'status-active' : 'status-pending'}">
                    ${c.status === 'sent' ? '✅ SMS envoyé' : '⏳ En attente'}
                </span>
            </td>
            <td style="padding: 12px;">
                ${c.status === 'pending' ? `<button class="send-sms-btn" data-name="${c.name}" data-phone="${c.phone}" 
                    style="background: var(--accent); color: white; border: none; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                    Envoyer SMS
                </button>` : '<span style="color: var(--text-secondary); font-size: 0.8rem;">–</span>'}
            </td>
        </tr>
    `).join('');

    const keyword1 = SUGGESTED_KEYWORDS[Math.floor(Math.random() * 5)];
    const keyword2 = SUGGESTED_KEYWORDS[5 + Math.floor(Math.random() * 5)];
    const previewMsg = SMS_TEMPLATES[0]('Client', [keyword1, keyword2]).replace('{LINK}', 'maps.app.goo.gl/xxxx');

    return `
        <div style="max-width: 900px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h2>Smart Reviews – SMS Automatiques</h2>
                    <p style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px;">
                        Envoyez un SMS personnalisé 30 min après la séance avec des mots-clés IA pour booster le SEO.
                    </p>
                </div>
                <div class="status-badge status-active" style="font-size: 0.85rem;">
                    <i class="fas fa-robot" style="margin-right: 6px;"></i> IA Activée
                </div>
            </div>

            <!-- Stats Row -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem;">
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--accent);">3</div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem;">Séances aujourd'hui</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--success);">1</div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem;">SMS envoyés</div>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--warning);">2</div>
                    <div style="color: var(--text-secondary); font-size: 0.85rem;">En attente (30 min)</div>
                </div>
            </div>

            <!-- AI Keyword Suggestions -->
            <div class="card" style="margin-bottom: 2rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3><i class="fas fa-magic" style="color: var(--accent); margin-right: 8px;"></i> Mots-clés suggérés par l'IA</h3>
                    <button id="refresh-keywords-btn" style="background: transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 4px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">
                        🔄 Régénérer
                    </button>
                </div>
                <div id="keywords-container" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${SUGGESTED_KEYWORDS.map((kw, i) => `
                        <span class="keyword-tag ${i < 3 ? 'keyword-selected' : ''}" data-kw="${kw}">
                            ${kw}
                        </span>`).join('')}
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 12px;">
                    Cliquez pour sélectionner/désélectionner. Les mots-clés en violet seront intégrés dans le SMS.
                </p>
            </div>

            <!-- SMS Preview -->
            <div class="card" style="margin-bottom: 2rem;">
                <h3><i class="fas fa-comment-sms" style="color: var(--success); margin-right: 8px;"></i> Aperçu du SMS</h3>
                <div id="sms-preview" style="margin-top: 1rem; background: rgba(0,0,0,0.3); border-radius: 12px; padding: 16px; font-size: 0.85rem; line-height: 1.7; color: var(--text-primary); white-space: pre-wrap; border: 1px solid var(--glass-border);">${previewMsg}</div>
                <div style="margin-top: 8px; display: flex; justify-content: space-between;">
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">${previewMsg.length} caractères</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Lien GBP intégré automatiquement</span>
                </div>
            </div>

            <!-- Client Table -->
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3>Clients du jour</h3>
                    <button id="send-all-btn" style="background: var(--accent); color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fas fa-paper-plane"></i> Envoyer à tous (en attente)
                    </button>
                </div>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; color: var(--text-secondary); border-bottom: 1px solid var(--glass-border); font-size: 0.8rem;">
                                <th style="padding: 10px;">Nom</th>
                                <th style="padding: 10px;">Téléphone</th>
                                <th style="padding: 10px;">Séance</th>
                                <th style="padding: 10px;">Statut</th>
                                <th style="padding: 10px;">Action</th>
                            </tr>
                        </thead>
                        <tbody id="clients-tbody">${clientRows}</tbody>
                    </table>
                </div>
            </div>

            <!-- Twilio Config Notice -->
            <div class="card" style="margin-top: 1.5rem; border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05);">
                <h4 style="color: var(--accent); margin-bottom: 1rem;"><i class="fas fa-plug"></i> Configuration Twilio (Production)</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">Account SID</label>
                        <input type="password" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" 
                            style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 8px; border-radius: 6px; margin-top: 4px; font-size: 0.85rem;">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">Auth Token</label>
                        <input type="password" placeholder="••••••••••••••••••••••••••••••••" 
                            style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 8px; border-radius: 6px; margin-top: 4px; font-size: 0.85rem;">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">Numéro Twilio (From)</label>
                        <input type="text" placeholder="+33XXXXXXXXX" 
                            style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 8px; border-radius: 6px; margin-top: 4px; font-size: 0.85rem;">
                    </div>
                    <div>
                        <label style="font-size: 0.8rem; color: var(--text-secondary);">Lien GBP (Reviews)</label>
                        <input type="text" placeholder="https://g.page/r/xxxxx/review" 
                            style="width: 100%; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; padding: 8px; border-radius: 6px; margin-top: 4px; font-size: 0.85rem;">
                    </div>
                </div>
                <button style="margin-top: 1rem; background: var(--accent); color: white; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer;">
                    Sauvegarder la configuration
                </button>
            </div>
        </div>
    `;
}

function attachReviewsListeners() {
    // Keyword toggle
    document.querySelectorAll('.keyword-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('keyword-selected');
            updateSmsPreview();
        });
    });

    // Refresh keywords
    document.getElementById('refresh-keywords-btn')?.addEventListener('click', () => {
        const shuffled = [...SUGGESTED_KEYWORDS].sort(() => Math.random() - 0.5);
        const container = document.getElementById('keywords-container');
        container.innerHTML = shuffled.map((kw, i) => `
            <span class="keyword-tag ${i < 3 ? 'keyword-selected' : ''}" data-kw="${kw}">${kw}</span>
        `).join('');
        document.querySelectorAll('.keyword-tag').forEach(tag => {
            tag.addEventListener('click', () => {
                tag.classList.toggle('keyword-selected');
                updateSmsPreview();
            });
        });
        updateSmsPreview();
    });

    // Send individual SMS
    document.querySelectorAll('.send-sms-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const name = btn.dataset.name;
            const phone = btn.dataset.phone;
            await sendSms(name, phone, btn);
        });
    });

    // Send all
    document.getElementById('send-all-btn')?.addEventListener('click', async () => {
        const pendingBtns = document.querySelectorAll('.send-sms-btn');
        for (const btn of pendingBtns) {
            await sendSms(btn.dataset.name, btn.dataset.phone, btn);
            await new Promise(r => setTimeout(r, 400));
        }
    });
}

function updateSmsPreview() {
    const selected = [...document.querySelectorAll('.keyword-tag.keyword-selected')].map(t => t.dataset.kw);
    if (selected.length < 2) return;
    const msg = SMS_TEMPLATES[0]('Client', selected).replace('{LINK}', 'maps.app.goo.gl/xxxx');
    const preview = document.getElementById('sms-preview');
    if (preview) preview.innerText = msg;
}

async function sendSms(name, phone, btn) {
    const selected = [...document.querySelectorAll('.keyword-tag.keyword-selected')].map(t => t.dataset.kw);
    const message = SMS_TEMPLATES[0](name, selected.length >= 2 ? selected : ['propreté', 'coach']).replace('{LINK}', 'maps.app.goo.gl/xxxx');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const res = await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phone, message })
        });
        const data = await res.json();
        
        if (data.success || data.demo) {
            // Update the row
            const row = btn.closest('tr');
            row.querySelector('.status-badge').className = 'status-badge status-active';
            row.querySelector('.status-badge').innerText = '✅ SMS envoyé';
            btn.replaceWith(document.createTextNode('–'));
        }
    } catch {
        // Demo mode: simulate success
        const row = btn.closest('tr');
        if (row) {
            row.querySelector('.status-badge').className = 'status-badge status-active';
            row.querySelector('.status-badge').innerText = '✅ SMS simulé (démo)';
            btn.replaceWith(document.createTextNode('–'));
        }
    }
}
