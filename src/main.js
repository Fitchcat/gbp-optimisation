// Module 1: Freshness Média Logic
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

// Initial state
console.log("GBP Optimizer Dashboard loaded.");
console.log("Current Freshness Status:", mediaService.checkStatus());

// Navigation Logic
const views = {
    dashboard: document.querySelector('.dashboard-grid'),
    parameters: null // Will create dynamically
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        const viewName = item.innerText.trim().toLowerCase();
        console.log("Switching to view:", viewName);
        
        if (viewName === 'paramètres') {
            document.querySelector('.dashboard-grid').style.display = 'none';
            let paramsView = document.getElementById('params-view');
            if (!paramsView) {
                paramsView = document.createElement('div');
                paramsView.id = 'params-view';
                paramsView.className = 'card';
                paramsView.innerHTML = `
                    <h2>Paramètres du Compte</h2>
                    <div style="margin-top: 2rem;">
                        <p>ID Etablissement : ChIJuX... (Aquabike Center)</p>
                        <p style="margin-top: 1rem;">Token API Twilio : ••••••••••••••••</p>
                        <p style="margin-top: 1rem;">Statut Synchro Google : <span class="status-badge status-active">Connecté</span></p>
                    </div>
                `;
                document.querySelector('.main-content').appendChild(paramsView);
            }
            paramsView.style.display = 'block';
        } else if (viewName === 'dashboard') {
            document.querySelector('.dashboard-grid').style.display = 'grid';
            if (document.getElementById('params-view')) {
                document.getElementById('params-view').style.display = 'none';
            }
        } else {
            alert("Ce module (" + viewName + ") est en cours de développement.");
        }
    });
});

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
