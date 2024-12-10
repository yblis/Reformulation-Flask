// Clés de stockage
const STORAGE_KEYS = {
    REFORMULATION_HISTORY: 'reformulationHistory',
    TRANSLATION_HISTORY: 'translationHistory',
    CORRECTION_HISTORY: 'correctionHistory',
    EMAIL_HISTORY: 'emailHistory',
    SYSTEM_PROMPT: 'systemPrompt',
    TRANSLATION_PROMPT: 'translationPrompt',
    CORRECTION_PROMPT: 'correctionPrompt',
    EMAIL_PROMPT: 'emailPrompt'
};

// Gestionnaire d'historique local
class LocalStorageManager {
    static getHistory(type) {
        try {
            const data = localStorage.getItem(type);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Erreur lors de la récupération de l'historique ${type}:`, error);
            return [];
        }
    }

    static addToHistory(type, entry) {
        try {
            const history = this.getHistory(type);
            if (!entry || typeof entry !== 'object') {
                throw new Error('Invalid entry format');
            }

            // Ajouter un timestamp si non présent
            const newEntry = {
                ...entry,
                id: Date.now(),
                created_at: entry.created_at || new Date().toISOString()
            };

            // Limiter la taille de l'historique à 50 entrées
            history.unshift(newEntry);
            if (history.length > 50) {
                history.pop();
            }

            localStorage.setItem(type, JSON.stringify(history));
            return history;
        } catch (error) {
            console.error(`Erreur lors de l'ajout à l'historique ${type}:`, error);
            return this.getHistory(type);
        }
    }

    static removeFromHistory(type, id) {
        try {
            const history = this.getHistory(type);
            const updatedHistory = history.filter(entry => entry.id !== id);
            localStorage.setItem(type, JSON.stringify(updatedHistory));
            return updatedHistory;
        } catch (error) {
            console.error(`Erreur lors de la suppression de l'historique ${type}:`, error);
            return this.getHistory(type);
        }
    }

    static clearHistory(type) {
        try {
            localStorage.removeItem(type);
            return [];
        } catch (error) {
            console.error(`Erreur lors de la réinitialisation de l'historique ${type}:`, error);
            return [];
        }
    }

    static getPrompt(type) {
        try {
            return localStorage.getItem(type);
        } catch (error) {
            console.error(`Erreur lors de la récupération du prompt ${type}:`, error);
            return null;
        }
    }

    static setPrompt(type, prompt) {
        try {
            if (typeof prompt !== 'string') {
                throw new Error('Invalid prompt format');
            }
            localStorage.setItem(type, prompt.trim());
        } catch (error) {
            console.error(`Erreur lors de la définition du prompt ${type}:`, error);
        }
    }
}

// Fonction pour mettre à jour l'affichage de l'historique
function updateHistoryDisplay(type, entries) {
    const containerId = `${type}Container`;
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container not found: ${containerId}`);
        return;
    }

    if (!Array.isArray(entries)) {
        console.error('Invalid entries format:', entries);
        return;
    }

    const getHistoryItemHtml = (entry) => {
        let content = '';
        const timestamp = entry.created_at ? new Date(entry.created_at).toLocaleString() : 'Date inconnue';

        switch (type) {
            case STORAGE_KEYS.REFORMULATION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original:</strong>
                        <pre class="mb-2">${entry.original_text || ''}</pre>
                        ${entry.context ? `<strong>Contexte:</strong><pre class="mb-2">${entry.context}</pre>` : ''}
                        <strong>Reformulation:</strong>
                        <pre>${entry.reformulated_text || ''}</pre>
                    </div>
                    ${entry.tone ? `<div class="badge bg-secondary me-1">${entry.tone}</div>` : ''}
                    ${entry.format ? `<div class="badge bg-secondary me-1">${entry.format}</div>` : ''}
                    ${entry.length ? `<div class="badge bg-secondary">${entry.length}</div>` : ''}`;
                break;
            case STORAGE_KEYS.TRANSLATION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original (${entry.source_language || 'inconnu'}):</strong>
                        <pre class="mb-2">${entry.original_text || ''}</pre>
                        <strong>Traduction (${entry.target_language || 'inconnu'}):</strong>
                        <pre>${entry.translated_text || ''}</pre>
                    </div>`;
                break;
            case STORAGE_KEYS.CORRECTION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original:</strong>
                        <pre class="mb-2">${entry.original_text || ''}</pre>
                        <strong>Correction:</strong>
                        <pre>${entry.corrected_text || ''}</pre>
                    </div>`;
                break;
            case STORAGE_KEYS.EMAIL_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Type:</strong> ${entry.email_type || ''}<br>
                        ${entry.sender ? `<strong>Expéditeur:</strong> ${entry.sender}<br>` : ''}
                        <strong>Contenu original:</strong>
                        <pre class="mb-2">${entry.content || ''}</pre>
                        <strong>Email généré:</strong>
                        <pre>${entry.generated_email || ''}</pre>
                    </div>`;
                break;
        }

        return `
            <div class="list-group-item" data-entry-id="${entry.id}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">${timestamp}</small>
                    <div>
                        <button class="btn btn-sm btn-success me-2 reuse-history" 
                                data-type="${type}" 
                                data-entry='${JSON.stringify(entry)}'>
                            Réutiliser
                        </button>
                        <button class="btn btn-sm btn-danger delete-history" 
                                data-type="${type}" 
                                data-entry-id="${entry.id}">
                            Supprimer
                        </button>
                    </div>
                </div>
                ${content}
            </div>`;
    };

    container.innerHTML = entries.length > 0 
        ? entries.map(getHistoryItemHtml).join('')
        : '<div class="text-center text-muted p-3">Aucun historique</div>';

    // Attacher les événements aux boutons
    container.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', handleHistoryReuse);
    });

    container.querySelectorAll('.delete-history').forEach(button => {
        button.addEventListener('click', handleHistoryDelete);
    });
}

// Gestionnaire de réutilisation d'historique
function handleHistoryReuse(event) {
    const button = event.currentTarget;
    const type = button.dataset.type;
    const entry = JSON.parse(button.dataset.entry);

    // Déclencher un événement personnalisé pour la réutilisation
    const customEvent = new CustomEvent('historyReuse', {
        detail: { type, entry }
    });
    document.dispatchEvent(customEvent);
}

// Gestionnaire de suppression d'historique
function handleHistoryDelete(event) {
    const button = event.currentTarget;
    const type = button.dataset.type;
    const entryId = parseInt(button.dataset.entryId);

    if (confirm('Voulez-vous vraiment supprimer cet élément de l\'historique ?')) {
        const updatedHistory = LocalStorageManager.removeFromHistory(type, entryId);
        updateHistoryDisplay(type, updatedHistory);
    }
}

// Initialisation des prompts depuis la base de données
async function initializePrompts() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const settings = await response.json();
        const prompts = settings.prompts || {};

        // Ne définir les prompts dans le localStorage que s'ils n'existent pas déjà
        if (!LocalStorageManager.getPrompt(STORAGE_KEYS.SYSTEM_PROMPT) && prompts.system_prompt) {
            LocalStorageManager.setPrompt(STORAGE_KEYS.SYSTEM_PROMPT, prompts.system_prompt);
        }
        if (!LocalStorageManager.getPrompt(STORAGE_KEYS.TRANSLATION_PROMPT) && prompts.translation_prompt) {
            LocalStorageManager.setPrompt(STORAGE_KEYS.TRANSLATION_PROMPT, prompts.translation_prompt);
        }
        if (!LocalStorageManager.getPrompt(STORAGE_KEYS.CORRECTION_PROMPT) && prompts.correction_prompt) {
            LocalStorageManager.setPrompt(STORAGE_KEYS.CORRECTION_PROMPT, prompts.correction_prompt);
        }
        if (!LocalStorageManager.getPrompt(STORAGE_KEYS.EMAIL_PROMPT) && prompts.email_prompt) {
            LocalStorageManager.setPrompt(STORAGE_KEYS.EMAIL_PROMPT, prompts.email_prompt);
        }
    } catch (error) {
        console.error('Erreur lors de l\'initialisation des prompts:', error);
    }
}

// Réinitialisation de l'historique
document.getElementById('resetHistory')?.addEventListener('click', function() {
    if (confirm('Voulez-vous vraiment réinitialiser tout l\'historique ? Cette action est irréversible.')) {
        Object.values(STORAGE_KEYS).forEach(type => {
            if (type.includes('HISTORY')) {
                LocalStorageManager.clearHistory(type);
                updateHistoryDisplay(type, []);
            }
        });
    }
});

// Exportation pour utilisation dans d'autres fichiers
window.LocalStorageManager = LocalStorageManager;
window.STORAGE_KEYS = STORAGE_KEYS;
window.updateHistoryDisplay = updateHistoryDisplay;
window.initializePrompts = initializePrompts;
