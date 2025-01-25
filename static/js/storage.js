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
        const data = localStorage.getItem(type);
        return data ? JSON.parse(data) : [];
    }

    static addToHistory(type, entry) {
        const history = this.getHistory(type);
        history.unshift({...entry, id: Date.now()}); // Ajouter un ID unique
        localStorage.setItem(type, JSON.stringify(history));
        return history;
    }

    static removeFromHistory(type, id) {
        const history = this.getHistory(type);
        const updatedHistory = history.filter(entry => entry.id !== id);
        localStorage.setItem(type, JSON.stringify(updatedHistory));
        return updatedHistory;
    }

    static clearHistory(type) {
        localStorage.removeItem(type);
        return [];
    }

    static getPrompt(type) {
        return localStorage.getItem(type);
    }

    static setPrompt(type, prompt) {
        localStorage.setItem(type, prompt);
    }
}

// Fonction pour mettre à jour l'affichage de l'historique
function updateHistoryDisplay(type, entries, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const getHistoryItemHtml = (entry) => {
        let content = '';
        switch (type) {
            case STORAGE_KEYS.REFORMULATION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original:</strong>
                        <pre class="mb-2">${entry.original_text}</pre>
                        ${entry.context ? `<strong>Contexte:</strong><pre class="mb-2">${entry.context}</pre>` : ''}
                        <strong>Reformulation:</strong>
                        <pre>${entry.reformulated_text}</pre>
                    </div>
                    <div class="badge bg-secondary me-1">${entry.tone}</div>
                    <div class="badge bg-secondary me-1">${entry.format}</div>
                    <div class="badge bg-secondary">${entry.length}</div>`;
                break;
            case STORAGE_KEYS.TRANSLATION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original (${entry.source_language}):</strong>
                        <pre class="mb-2">${entry.original_text}</pre>
                        <strong>Traduction (${entry.target_language}):</strong>
                        <pre>${entry.translated_text}</pre>
                    </div>`;
                break;
            case STORAGE_KEYS.CORRECTION_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Original:</strong>
                        <pre class="mb-2">${entry.original_text}</pre>
                        <strong>Correction:</strong>
                        <pre>${entry.corrected_text}</pre>
                    </div>`;
                break;
            case STORAGE_KEYS.EMAIL_HISTORY:
                content = `
                    <div class="mb-2">
                        <strong>Type:</strong> ${entry.email_type}<br>
                        <strong>Contenu original:</strong>
                        <pre class="mb-2">${entry.content}</pre>
                        <strong>Email généré:</strong>
                        <pre>${entry.generated_email}</pre>
                    </div>`;
                break;
        }

        return `
            <div class="list-group-item" data-entry-id="${entry.id}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <small class="text-muted">${new Date(entry.created_at).toLocaleString()}</small>
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
        updateHistoryDisplay(type, updatedHistory, getContainerId(type));
    }
}

// Fonction utilitaire pour obtenir l'ID du conteneur
function getContainerId(type) {
    const mapping = {
        [STORAGE_KEYS.REFORMULATION_HISTORY]: 'reformulationHistory',
        [STORAGE_KEYS.TRANSLATION_HISTORY]: 'translationHistory',
        [STORAGE_KEYS.CORRECTION_HISTORY]: 'correctionHistory',
        [STORAGE_KEYS.EMAIL_HISTORY]: 'emailHistory'
    };
    return mapping[type];
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

// Fonction pour vérifier si une valeur est une chaîne valide
function isValidString(text) {
    return typeof text === 'string' && text.trim().length > 0;
}

// Étendre la classe LocalStorageManager avec des validations
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
            const validatedEntry = {...entry};
            // Valider et nettoyer les champs textuels
            if (validatedEntry.original_text) {
                validatedEntry.original_text = String(validatedEntry.original_text);
            }
            if (validatedEntry.reformulated_text) {
                validatedEntry.reformulated_text = String(validatedEntry.reformulated_text);
            }
            history.unshift({...validatedEntry, id: Date.now()});
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
            const prompt = localStorage.getItem(type);
            return isValidString(prompt) ? prompt : null;
        } catch (error) {
            console.error(`Erreur lors de la récupération du prompt ${type}:`, error);
            return null;
        }
    }

    static setPrompt(type, prompt) {
        try {
            if (!isValidString(prompt)) {
                throw new Error('Invalid prompt format');
            }
            localStorage.setItem(type, prompt.trim());
        } catch (error) {
            console.error(`Erreur lors de la définition du prompt ${type}:`, error);
        }
    }
}

// Exportation pour utilisation dans d'autres fichiers
window.LocalStorageManager = LocalStorageManager;
window.STORAGE_KEYS = STORAGE_KEYS;
window.updateHistoryDisplay = updateHistoryDisplay;
window.initializePrompts = initializePrompts;
