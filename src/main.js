import { showAuditView } from './audit.js';
import { showSmartReviewsView } from './reviews.js';

const mediaService = {
    lastUpload: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    frequency: 'weekly',
    
    checkStatus() {
        const now = new Date();
        const diff = now - this.lastUpload;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        return days >= 7 ? 'READY' : 'WAITING';
    },

    simulateUpload() {
        console.log("Simulating photo upload to GBP API...");
        this.lastUpload = new Date();
        document.querySelector('.progress-fill').style.width = '0%';
        alert("Photo publiée avec succès ! Le profil Google est à jour.");
    }
};

// State Management (Simplified for Demo)
const state = {
    establishments: JSON.parse(localStorage.getItem('establishments')) || [
        { id: '1', name: 'Aquabike Center', location: 'Paris 15e', clients: [] },
        { id: '2', name: 'Fitness Plus', location: 'Paris 8e', clients: [] }
    ],
    currentId: localStorage.getItem('currentEstablishmentId') || '1'
};

const getCurrentEst = () => state.establishments.find(e => e.id === state.currentId);

// Update UI based on current establishment
const updateBrandUI = () => {
    const est = getCurrentEst();
    document.querySelector('header p').innerText = `${est.name} - ${est.location}`;
};

updateBrandUI();

// Central navigation function
function navigateTo(viewId) {
    // Update sidebar active state
    document.querySelectorAll('.nav-item[data-view]').forEach(n => {
        n.classList.toggle('active', n.dataset.view === viewId);
    });

    // Hide all dynamic views + the grid
    document.querySelector('.dashboard-grid').style.display = 'none';
    ['params-view', 'clients-view', 'audit-view', 'reviews-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    switch (viewId) {
        case 'dashboard':
            document.querySelector('.dashboard-grid').style.display = 'grid';
            break;
        case 'audit':
            showAuditView();
            break;
        case 'reviews':
            showSmartReviewsView();
            break;
        case 'clients':
            showClientsView();
            break;
        case 'params':
            showParametersView();
            break;
        default:
            alert('Ce module est en développement.');
            document.querySelector('.dashboard-grid').style.display = 'grid';
    }
}

// Sidebar nav clicks
document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.view);
    });
});

// Dashboard card shortcut buttons
document.querySelectorAll('.go-to-audit').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('audit'));
});
document.querySelectorAll('.go-to-reviews').forEach(btn => {
    btn.addEventListener('click', () => navigateTo('reviews'));
});

function showParametersView() {
    let paramsView = document.getElementById('params-view');
    if (!paramsView) {
        paramsView = document.createElement('div');
        paramsView.id = 'params-view';
        paramsView.className = 'card';
        document.querySelector('.main-content').appendChild(paramsView);
    }
    paramsView.style.display = 'block';
    paramsView.innerHTML = `
        <h2>Configuration Multi-Établissements</h2>
        <div style="margin-top: 2rem;">
            <label style="display: block; color: var(--text-secondary); margin-bottom: 8px;">Choisir l'établissement actif</label>
            <select id="est-selector" style="width: 100%; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border); color: white; border-radius: 8px; margin-bottom: 2rem;">
                ${state.establishments.map(e => `<option value="${e.id}" ${e.id === state.currentId ? 'selected' : ''}>${e.name} (${e.location})</option>`).join('')}
            </select>
            <button id="add-est-btn" class="nav-item" style="border: 1px dashed var(--accent); color: var(--accent); background: transparent;">+ Ajouter un établissement</button>
        </div>
    `;
    
    document.getElementById('est-selector').addEventListener('change', (e) => {
        state.currentId = e.target.value;
        localStorage.setItem('currentEstablishmentId', state.currentId);
        updateBrandUI();
    });
}

function showClientsView() {
    let clientsView = document.getElementById('clients-view');
    if (!clientsView) {
        clientsView = document.createElement('div');
        clientsView.id = 'clients-view';
        clientsView.className = 'card';
        document.querySelector('.main-content').appendChild(clientsView);
    }
    clientsView.style.display = 'block';
    const est = getCurrentEst();
    clientsView.innerHTML = `
        <h2>Base Clients - ${est.name}</h2>
        <div style="margin-top: 1rem;">
            <table style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                <thead>
                    <tr style="text-align: left; color: var(--text-secondary); border-bottom: 1px solid var(--glass-border)">
                        <th style="padding: 10px;">Nom</th>
                        <th style="padding: 10px;">Téléphone</th>
                        <th style="padding: 10px;">Statut</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td style="padding: 10px;">Jean Dupont</td><td style="padding: 10px;">06 12 34 56 78</td><td><span class="status-badge status-active">Fidèle</span></td></tr>
                    <tr><td style="padding: 10px;">Marie Curie</td><td style="padding: 10px;">06 98 76 54 32</td><td><span class="status-badge status-pending">Nouveau</span></td></tr>
                </tbody>
            </table>
            <button style="margin-top: 2rem; background: var(--accent); color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer;">
                Importer une liste (CSV)
            </button>
        </div>
    `;
}

// Module 1 Button Listener
document.getElementById('publish-btn').addEventListener('click', () => {
    mediaService.simulateUpload();
    document.querySelector('.progress-fill').style.width = '100%';
    const badge = document.querySelector('#module-media .status-active');
    if (badge) badge.innerText = 'À jour';
});

// Hover effects for all cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--accent)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--glass-border)';
    });
});
