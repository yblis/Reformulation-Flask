document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');

    function showAlert(message, type = 'danger', duration = 5000) {
        try {
            // Remove any existing alerts
            const existingAlerts = document.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());

            const alert = document.createElement('div');
            alert.className = `alert alert-${type} alert-dismissible fade show`;
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            // Find the container in the config tab
            const container = document.querySelector('#config');
            if (!container) {
                console.error('Alert container not found');
                return;
            }

            // Insert at the beginning of the config tab
            container.insertBefore(alert, container.firstChild);

            if (duration) {
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, duration);
            }
        } catch (e) {
            console.error('Error showing alert:', e);
        }
    }

    async function loadPreferences() {
        try {
            const response = await fetch('/api/preferences');
            if (response.ok) {
                const prefs = await response.json();
                ollamaUrl.value = prefs.ollama_url;
                systemPrompt.value = prefs.system_prompt;
                translationPrompt.value = prefs.translation_prompt;
                
                // Load models after setting URL
                await loadModels();
                
                // Set the current model
                if (modelSelect && prefs.current_model) {
                    const options = Array.from(modelSelect.options);
                    const option = options.find(opt => opt.value === prefs.current_model);
                    if (option) {
                        option.selected = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            showAlert('Error loading preferences');
        }
    }

    function updateModelSelect(models = [], errorMessage = '', previousSelection = '') {
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
            let hasSelectedModel = false;
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                if (model.name === previousSelection) {
                    option.selected = true;
                    hasSelectedModel = true;
                }
                modelSelect.appendChild(option);
            });
            
            if (!hasSelectedModel && !previousSelection && models.length > 0) {
                modelSelect.selectedIndex = 0;
            }
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
        if (!modelSelect || !refreshModels || !ollamaUrl) return;

        try {
            const previousSelection = modelSelect.value;

            let url;
            try {
                url = new URL(ollamaUrl.value.trim());
            } catch (e) {
                throw new Error("L'URL d'Ollama n'est pas valide");
            }

            refreshModels.disabled = true;
            updateModelSelect([], 'Chargement des modèles...', previousSelection);

            const apiUrl = '/api/models?url=' + encodeURIComponent(ollamaUrl.value.trim());
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erreur lors de la récupération des modèles');
            }

            if (!data.models || !Array.isArray(data.models)) {
                throw new Error('Format de réponse invalide du serveur');
            }

            updateModelSelect(data.models, '', previousSelection);

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

    if (ollamaUrl) {
        ollamaUrl.addEventListener('blur', loadModels);
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

                if (translationPrompt) {
                    const translationPromptResponse = await fetch('/api/translation_prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: translationPrompt.value.trim()
                        })
                    });

                    if (!translationPromptResponse.ok) {
                        const data = await translationPromptResponse.json();
                        throw new Error(data.message || 'Erreur lors de la sauvegarde du prompt de traduction');
                    }
                }

                showAlert('Configuration sauvegardée avec succès', 'success', 3000);
                
                // Check connection with new URL
                const statusResponse = await fetch('/api/status?url=' + encodeURIComponent(ollamaUrl.value.trim()));
                const statusData = await statusResponse.json();
                
                if (statusData.status === 'connected') {
                    await loadModels();
                } else {
                    showAlert('Configuration sauvegardée mais le service Ollama n\'est pas accessible.', 'warning');
                }

            } catch (error) {
                console.error('Erreur:', error.message);
                showAlert(error.message || 'Erreur lors de la sauvegarde');
            } finally {
                saveConfig.disabled = false;
                saveConfig.textContent = originalText;
            }
        });
    }

    // Load initial preferences and configuration
    loadPreferences();
});
