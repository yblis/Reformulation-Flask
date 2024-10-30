document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const useOpenAI = document.getElementById('useOpenAI');
    const ollamaConfig = document.getElementById('ollamaConfig');
    const openaiConfig = document.getElementById('openaiConfig');
    const openaiUrl = document.getElementById('openaiUrl');
    const openaiApiKey = document.getElementById('openaiApiKey');
    const openaiModelSelect = document.getElementById('openaiModelSelect');
    const refreshOpenAIModels = document.getElementById('refreshOpenAIModels');
    const alertContainer = document.getElementById('alertContainer');

    // Load saved URLs from localStorage
    if (ollamaUrl) {
        const savedUrl = localStorage.getItem('ollamaUrl');
        if (savedUrl) {
            ollamaUrl.value = savedUrl;
        }
    }

    if (openaiUrl) {
        const savedOpenAIUrl = localStorage.getItem('openaiUrl');
        if (savedOpenAIUrl) {
            openaiUrl.value = savedOpenAIUrl;
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

        // Set initial visibility based on checkbox state
        if (useOpenAI.checked) {
            if (ollamaConfig) ollamaConfig.style.display = 'none';
            if (openaiConfig) openaiConfig.style.display = 'block';
        } else {
            if (ollamaConfig) ollamaConfig.style.display = 'block';
            if (openaiConfig) openaiConfig.style.display = 'none';
        }
    }

    function showAlert(message, type = 'danger', duration = 5000) {
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
    }

    function updateModelSelect(models = [], errorMessage = '', previousSelection = '', isOpenAI = false) {
        const select = isOpenAI ? openaiModelSelect : modelSelect;
        if (!select) return;
        
        select.innerHTML = '';
        
        if (errorMessage) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = `Erreur: ${errorMessage}`;
            option.disabled = true;
            option.selected = true;
            select.appendChild(option);
            select.disabled = true;
            return;
        }

        if (Array.isArray(models) && models.length > 0) {
            let hasSelectedModel = false;
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name || model.id;
                option.textContent = model.name || model.id;
                if (model.name === previousSelection || model.id === previousSelection) {
                    option.selected = true;
                    hasSelectedModel = true;
                }
                select.appendChild(option);
            });
            
            if (!hasSelectedModel && models.length > 0) {
                select.selectedIndex = 0;
            }
            select.disabled = false;
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Aucun modèle disponible';
            option.disabled = true;
            option.selected = true;
            select.appendChild(option);
            select.disabled = true;
        }
    }

    async function loadOpenAIModels() {
        if (!openaiModelSelect) return;

        try {
            const previousSelection = localStorage.getItem('selectedOpenAIModel');
            
            if (refreshOpenAIModels) refreshOpenAIModels.disabled = true;
            updateModelSelect([], 'Chargement des modèles...', previousSelection, true);

            const response = await fetch('/api/openai_models');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la récupération des modèles');
            }

            const models = data.models || [];
            updateModelSelect(models, '', previousSelection, true);

            if (models.length === 0) {
                showAlert('Aucun modèle OpenAI disponible.', 'warning');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error.message);
            updateModelSelect([], error.message, '', true);
            showAlert(error.message || 'Erreur lors de la récupération des modèles OpenAI');
        } finally {
            if (refreshOpenAIModels) refreshOpenAIModels.disabled = false;
        }
    }

    async function loadOllamaModels() {
        if (!modelSelect) return;

        try {
            const previousSelection = localStorage.getItem('selectedModel');

            if (refreshModels) refreshModels.disabled = true;
            updateModelSelect([], 'Chargement des modèles...', previousSelection, false);

            const url = ollamaUrl ? ollamaUrl.value.trim() : '';
            const response = await fetch('/api/models?url=' + encodeURIComponent(url));
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la récupération des modèles');
            }

            const models = data.models || [];
            updateModelSelect(models, '', previousSelection, false);

            if (models.length === 0) {
                showAlert('Aucun modèle Ollama disponible.', 'warning');
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error.message);
            updateModelSelect([], error.message, '', false);
            showAlert(error.message || 'Erreur lors de la récupération des modèles Ollama');
        } finally {
            if (refreshModels) refreshModels.disabled = false;
        }
    }

    async function loadModels() {
        if (useOpenAI && useOpenAI.checked) {
            await loadOpenAIModels();
        } else {
            await loadOllamaModels();
        }
    }

    // Add event listeners
    if (refreshModels) {
        refreshModels.addEventListener('click', loadOllamaModels);
    }

    if (refreshOpenAIModels) {
        refreshOpenAIModels.addEventListener('click', loadOpenAIModels);
    }

    if (ollamaUrl) {
        ollamaUrl.addEventListener('blur', loadOllamaModels);
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            const originalText = saveConfig.textContent;
            saveConfig.disabled = true;
            saveConfig.textContent = 'Sauvegarde en cours...';

            try {
                // Prepare settings data
                const settingsData = {
                    use_openai: useOpenAI && useOpenAI.checked,
                    url: ollamaUrl ? ollamaUrl.value.trim() : undefined,
                    model: modelSelect ? modelSelect.value : undefined,
                    openai_api_key: openaiApiKey ? openaiApiKey.value : undefined,
                    openai_url: openaiUrl ? openaiUrl.value.trim() : undefined,
                    openai_model: openaiModelSelect ? openaiModelSelect.value : undefined
                };

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
                if (settingsData.use_openai) {
                    localStorage.setItem('openaiUrl', openaiUrl.value.trim());
                    localStorage.setItem('selectedOpenAIModel', openaiModelSelect.value);
                } else {
                    localStorage.setItem('ollamaUrl', ollamaUrl.value.trim());
                    localStorage.setItem('selectedModel', modelSelect.value);
                }

                showAlert('Configuration sauvegardée avec succès', 'success', 3000);

                // Reload models for the selected provider
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
