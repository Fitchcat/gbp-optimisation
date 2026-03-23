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

// Add interactivity
document.getElementById('publish-btn').addEventListener('click', () => {
    mediaService.simulateUpload();
    document.querySelector('.progress-fill').style.width = '100%';
    document.querySelector('.status-active').innerText = 'À jour';
});

document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--accent)';
    });
    card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--glass-border)';
    });
});
