document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');

    function showAlert(message, type = 'danger', duration = 5000) {
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = saveConfig.closest('.card-body');
        container.insertBefore(alert, container.firstChild);

        if (duration) {
            setTimeout(() => alert.remove(), duration);
        }
    }

    function updateModelSelect(models = [], errorMessage = '') {
        if (!modelSelect) return;
        
        modelSelect.innerHTML = '';
        if (errorMessage) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `Erreur: ${errorMessage}`;
            option.disabled = true;
            option.selected = true;
            modelSelect.appendChild(option);
            modelSelect.disabled = true;
            return;
        }

        if (models.length > 0) {
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
            modelSelect.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun modèle disponible';
            option.disabled = true;
            option.selected = true;
            modelSelect.appendChild(option);
            modelSelect.disabled = true;
        }
    }

    async function loadModels() {
        if (!modelSelect || !refreshModels) return;

        try {
            refreshModels.disabled = true;
            updateModelSelect([], 'Chargement des modèles...');

            const response = await fetch('/api/models');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de la récupération des modèles');
            }

            if (!data.models || !Array.isArray(data.models)) {
                throw new Error('Format de réponse invalide du serveur');
            }

            updateModelSelect(data.models);

            if (data.models.length === 0) {
                showAlert('Aucun modèle disponible sur le serveur Ollama.', 'warning');
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error.message);
            updateModelSelect([], error.message);
            showAlert(error.message || 'Erreur lors de la récupération des modèles');
        } finally {
            refreshModels.disabled = false;
        }
    }

    // Add event listeners
    if (refreshModels) {
        refreshModels.addEventListener('click', loadModels);
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            if (!ollamaUrl || !modelSelect) {
                showAlert('Éléments de configuration manquants');
                return;
            }

            const originalText = saveConfig.textContent;
            saveConfig.disabled = true;
            saveConfig.textContent = 'Sauvegarde en cours...';

            try {
                // Validate URL format
                try {
                    new URL(ollamaUrl.value.trim());
                } catch (e) {
                    throw new Error("L'URL d'Ollama n'est pas valide");
                }

                const settingsResponse = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: ollamaUrl.value.trim(),
                        model: modelSelect.value
                    })
                });

                if (!settingsResponse.ok) {
                    const data = await settingsResponse.json();
                    throw new Error(data.message || 'Erreur lors de la sauvegarde des paramètres');
                }

                if (systemPrompt) {
                    const promptResponse = await fetch('/api/prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: systemPrompt.value.trim()
                        })
                    });

                    if (!promptResponse.ok) {
                        const data = await promptResponse.json();
                        throw new Error(data.message || 'Erreur lors de la sauvegarde du prompt');
                    }
                }

                showAlert('Configuration sauvegardée avec succès', 'success', 3000);
                
                // Reload models to reflect any URL changes
                await loadModels();

            } catch (error) {
                console.error('Erreur:', error.message);
                showAlert(error.message || 'Erreur lors de la sauvegarde');
            } finally {
                saveConfig.disabled = false;
                saveConfig.textContent = originalText;
            }
        });
    }

    // Load initial configuration
    loadModels();
});
