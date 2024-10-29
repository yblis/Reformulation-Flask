document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');

    function showAlert(message, type = 'danger', duration = 5000) {
        // Remove any existing alerts
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            <div class="d-flex align-items-center">
                ${type === 'danger' ? '<i class="bi bi-exclamation-triangle-fill me-2"></i>' : ''}
                ${type === 'warning' ? '<i class="bi bi-exclamation-circle-fill me-2"></i>' : ''}
                ${type === 'success' ? '<i class="bi bi-check-circle-fill me-2"></i>' : ''}
                <div>${message}</div>
                <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert"></button>
            </div>
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

                // Check connection status
                const statusResponse = await fetch('/api/status');
                const statusData = await statusResponse.json();
                updateUIForConnectionStatus(statusData.status === 'connected');
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
            showAlert('Erreur lors du chargement des préférences', 'danger');
            updateUIForConnectionStatus(false);
        }
    }

    function updateUIForConnectionStatus(isConnected) {
        const configFields = [ollamaUrl, modelSelect, systemPrompt, translationPrompt, saveConfig, refreshModels];
        
        configFields.forEach(element => {
            if (element) {
                element.classList.toggle('is-invalid', !isConnected);
            }
        });

        if (refreshModels) {
            refreshModels.disabled = !isConnected;
            refreshModels.innerHTML = isConnected ? 
                'Rafraîchir les modèles' : 
                '<i class="bi bi-exclamation-triangle"></i> Service non disponible';
        }

        // Update status indicator
        const statusIndicator = document.createElement('div');
        statusIndicator.className = `alert ${isConnected ? 'alert-success' : 'alert-danger'} mb-3`;
        statusIndicator.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="me-2">
                    <i class="bi ${isConnected ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                </div>
                <div>
                    <strong>État du service:</strong> ${isConnected ? 'Connecté' : 'Non connecté'}
                </div>
            </div>
        `;

        const existingStatus = document.querySelector('.alert-success, .alert-danger');
        if (existingStatus) {
            existingStatus.replaceWith(statusIndicator);
        } else {
            const configTab = document.querySelector('#config');
            if (configTab) {
                configTab.insertBefore(statusIndicator, configTab.firstChild);
            }
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
            modelSelect.classList.add('is-invalid');
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
            modelSelect.classList.remove('is-invalid');
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun modèle disponible';
            option.disabled = true;
            option.selected = true;
            modelSelect.appendChild(option);
            modelSelect.disabled = true;
            modelSelect.classList.add('is-invalid');
        }
    }

    async function loadModels() {
        if (!modelSelect || !refreshModels || !ollamaUrl) return;

        try {
            const previousSelection = modelSelect.value;
            refreshModels.disabled = true;
            refreshModels.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Chargement...';
            
            let url;
            try {
                url = new URL(ollamaUrl.value.trim());
            } catch (e) {
                throw new Error("L'URL d'Ollama n'est pas valide");
            }

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
            updateUIForConnectionStatus(true);

            if (data.models.length === 0) {
                showAlert('Aucun modèle disponible sur le serveur Ollama.', 'warning');
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error.message);
            updateModelSelect([], error.message);
            updateUIForConnectionStatus(false);
            showAlert(error.message || 'Erreur lors de la récupération des modèles', 'danger');
        } finally {
            refreshModels.disabled = false;
            refreshModels.innerHTML = 'Rafraîchir les modèles';
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
                showAlert('Éléments de configuration manquants', 'danger');
                return;
            }

            const originalText = saveConfig.textContent;
            saveConfig.disabled = true;
            saveConfig.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sauvegarde...';

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
                
                updateUIForConnectionStatus(statusData.status === 'connected');
                
                if (statusData.status === 'connected') {
                    await loadModels();
                } else {
                    showAlert('Configuration sauvegardée mais le service Ollama n\'est pas accessible.', 'warning');
                }

            } catch (error) {
                console.error('Erreur:', error.message);
                showAlert(error.message || 'Erreur lors de la sauvegarde', 'danger');
                updateUIForConnectionStatus(false);
            } finally {
                saveConfig.disabled = false;
                saveConfig.innerHTML = originalText;
            }
        });
    }

    // Load initial preferences and configuration
    loadPreferences();
});
