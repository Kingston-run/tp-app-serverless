// Configuration de l'API
const API_CONFIG = {
    baseUrl: 'https://tp-apim-serverless.azure-api.net',
    endpoints: {
        test: '/hello'
    }
};

// Classe pour gérer les appels API
class APIClient {
    constructor(config) {
        this.config = config;
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(this.config.baseUrl + endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            throw new Error(`Erreur de requête: ${error.message}`);
        }
    }
}

// Gestionnaire d'interface utilisateur
class UIManager {
    constructor() {
        this.resultDiv = document.getElementById('result');
        this.loadingDiv = document.getElementById('loading');
        this.button = document.querySelector('.btn');
        this.apiClient = new APIClient(API_CONFIG);
    }

    showLoading() {
        this.loadingDiv.style.display = 'block';
        this.button.disabled = true;
        this.resultDiv.textContent = 'Chargement...';
    }

    hideLoading() {
        this.loadingDiv.style.display = 'none';
        this.button.disabled = false;
    }

    showResult(data) {
        this.resultDiv.textContent = JSON.stringify(data, null, 2);
    }

    showError(error) {
        this.resultDiv.textContent = `Erreur: ${error.message}`;
        this.resultDiv.style.color = '#e74c3c';
    }

    resetError() {
        this.resultDiv.style.color = '#2c3e50';
    }
}

// Instance globale du gestionnaire d'interface
let uiManager;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    uiManager = new UIManager();
});

// Fonction principale pour tester l'API
async function testAPI() {
    if (!uiManager) return;

    uiManager.resetError();
    uiManager.showLoading();

    try {
        const data = await uiManager.apiClient.makeRequest(API_CONFIG.endpoints.test);
        uiManager.showResult(data);
    } catch (error) {
        uiManager.showError(error);
    } finally {
        uiManager.hideLoading();
    }
}