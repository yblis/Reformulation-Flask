document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const useOpenAI = document.getElementById('useOpenAI');
    const ollamaConfig = document.getElementById('ollamaConfig');
    const openaiConfig = document.getElementById('openaiConfig');
    const openaiApiKey = document.getElementById('openaiApiKey');
    const openaiModelSelect = document.getElementById('openaiModelSelect');
    const alertContainer = document.getElementById('alertContainer');

    // Load saved URL from localStorage
    if (ollamaUrl) {
        const savedUrl = localStorage.getItem('ollamaUrl');
        if (savedUrl) {
            ollamaUrl.value = savedUrl;
        }
    }

    // Toggle between Ollama and OpenAI configurations
    if (useOpenAI) {
        useOpenAI.addEventListener('change', function() {
            if (this.checked) {
                if (ollamaConfig) ollamaConfig.style.display = 'none';
                if (openaiConfig) openaiConfig.style.display = 'block';
            } else {
                if (ollamaConfig) ollamaConfig.style.display = 'block';
                if (openaiConfig) openaiConfig.style.display = 'none';
            }
            // Reload models for the selected provider
            loadModels();
        });
    }

    function showAlert(message, type = 'danger', duration = 5000) {
        try {
            if (!alertContainer) {
                console.error('Alert container not found');
                return;
            }

            // Remove any existing alerts
            const existingAlerts = alertContainer.querySelectorAll('.alert');
            existingAlerts.forEach(alert => alert.remove());

            const alert = document.createElement('div');
            alert.className = `alert alert-${type} alert-dismissible fade show`;
            alert.innerHTML = `
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            alertContainer.appendChild(alert);

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
                option.value = model.name || model.id;
                option.textContent = model.name || model.id;
                if (model.name === previousSelection || model.id === previousSelection) {
                    option.selected = true;
                    hasSelectedModel = true;
                }
                modelSelect.appendChild(option);
            });
            
            if (!hasSelectedModel && models.length > 0) {
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
        if (!modelSelect) return;

        try {
            const previousSelection = localStorage.getItem('selectedModel');

            if (refreshModels) refreshModels.disabled = true;
            updateModelSelect([], 'Chargement des modèles...', previousSelection);

            const apiUrl = useOpenAI && useOpenAI.checked ? 
                '/api/openai_models' : 
                '/api/models?url=' + encodeURIComponent(ollamaUrl.value.trim());

            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la récupération des modèles');
            }

            const models = data.models || [];
            updateModelSelect(models, '', previousSelection);

            if (models.length === 0) {
                showAlert('Aucun modèle disponible.', 'warning');
            }

        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error.message);
            updateModelSelect([], error.message);
            showAlert(error.message || 'Erreur lors de la récupération des modèles');
        } finally {
            if (refreshModels) refreshModels.disabled = false;
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
            const originalText = saveConfig.textContent;
            saveConfig.disabled = true;
            saveConfig.textContent = 'Sauvegarde en cours...';

            try {
                // Prepare settings data
                const settingsData = {
                    use_openai: useOpenAI && useOpenAI.checked
                };

                if (useOpenAI && useOpenAI.checked) {
                    // OpenAI settings
                    if (openaiApiKey && openaiApiKey.value) {
                        if (!openaiApiKey.value.startsWith('sk-')) {
                            throw new Error("Format de clé API OpenAI invalide");
                        }
                        settingsData.openai_api_key = openaiApiKey.value;
                    }
                    if (openaiModelSelect) {
                        settingsData.openai_model = openaiModelSelect.value;
                    }
                } else {
                    // Ollama settings
                    if (ollamaUrl) {
                        settingsData.url = ollamaUrl.value.trim();
                    }
                    if (modelSelect) {
                        settingsData.model = modelSelect.value;
                    }
                }

                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settingsData)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Erreur lors de la sauvegarde des paramètres');
                }

                // Store settings in localStorage
                if (!settingsData.use_openai) {
                    localStorage.setItem('ollamaUrl', ollamaUrl.value.trim());
                    localStorage.setItem('selectedModel', modelSelect.value);
                }

                showAlert('Configuration sauvegardée avec succès', 'success', 3000);
                
                // Check provider status
                const statusUrl = settingsData.use_openai ? 
                    '/api/status' : 
                    '/api/status?url=' + encodeURIComponent(ollamaUrl.value.trim());
                
                const statusResponse = await fetch(statusUrl);
                const statusData = await statusResponse.json();
                
                if (statusData.status === 'connected') {
                    await loadModels();
                } else {
                    showAlert('Configuration sauvegardée mais le service n\'est pas accessible.', 'warning');
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

    // Load initial configuration
    loadModels();
});
