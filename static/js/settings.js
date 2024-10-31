document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const aiProvider = document.getElementById('aiProvider');
    const providerConfigs = document.querySelectorAll('.provider-config');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');

    function loadSavedSettings() {
        const savedProvider = localStorage.getItem('aiProvider') || 'ollama';
        aiProvider.value = savedProvider;
        showProviderConfig(savedProvider);
        loadProviderModels(savedProvider);
    }

    function showProviderConfig(provider) {
        providerConfigs.forEach(config => {
            config.style.display = config.id === `${provider}Config` ? 'block' : 'none';
        });
    }

    async function loadProviderModels(provider, button = null) {
        let modelSelect;
        
        try {
            if (button) {
                button.disabled = true;
                button.textContent = 'Chargement...';
            }

            // Get the correct model select element based on provider
            modelSelect = provider === 'ollama' ? 
                document.getElementById('modelSelect') : 
                document.getElementById(`${provider}Model`);

            if (!modelSelect) {
                throw new Error(`Model select element not found for ${provider}`);
            }

            // Clear existing options
            modelSelect.innerHTML = '<option value="">Loading models...</option>';

            let url = `/api/models/${provider}`;
            if (provider === 'ollama') {
                const ollamaUrlInput = document.getElementById('ollamaUrl');
                if (ollamaUrlInput) {
                    url += `?url=${encodeURIComponent(ollamaUrlInput.value)}`;
                }
            }

            console.log(`Fetching ${provider} models...`);
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || `Failed to fetch ${provider} models`;
                console.error(`Error loading ${provider} models: ${errorMsg}`);
                throw new Error(errorMsg);
            }

            // Clear options before adding new ones
            modelSelect.innerHTML = '';

            if (!data.models || !Array.isArray(data.models) || data.models.length === 0) {
                throw new Error(`No models available for ${provider}`);
            }

            // Add the models
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name || model.id;
                modelSelect.appendChild(option);
            });

            // Select saved model or first available
            const savedModel = localStorage.getItem(`${provider}Model`);
            if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
                modelSelect.value = savedModel;
            } else if (data.models.length > 0) {
                modelSelect.value = data.models[0].id;
            }

            console.log(`Successfully loaded ${data.models.length} models for ${provider}`);
            showAlert(`Models refreshed successfully for ${provider}`, 'success', 3000);

        } catch (error) {
            console.error(`Error loading ${provider} models:`, error);
            
            if (modelSelect) {
                modelSelect.innerHTML = '<option value="">Error loading models</option>';
                
                // Show appropriate error message
                const errorMsg = error.message.includes('API key') ? 
                    `Please configure ${provider} API key first` : 
                    error.message;
                showAlert(errorMsg, 'danger', 5000);
            }
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = 'Rafraîchir les modèles';
            }
        }
    }

    // Event listeners
    if (aiProvider) {
        aiProvider.addEventListener('change', function() {
            const selectedProvider = this.value;
            showProviderConfig(selectedProvider);
            loadProviderModels(selectedProvider);
            localStorage.setItem('aiProvider', selectedProvider);
        });
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            try {
                const selectedProvider = aiProvider.value;
                const config = {
                    provider: selectedProvider,
                    settings: {}
                };

                if (selectedProvider === 'openai') {
                    const apiKey = document.getElementById('openaiKey').value.trim();
                    if (!apiKey) {
                        throw new Error('OpenAI API key is required');
                    }
                    console.log('Saving OpenAI settings with API key length:', apiKey.length);
                    config.settings.apiKey = apiKey;
                } else if (selectedProvider === 'ollama') {
                    const ollamaUrl = document.getElementById('ollamaUrl').value.trim();
                    if (!ollamaUrl) {
                        throw new Error('Ollama URL is required');
                    }
                    config.settings.url = ollamaUrl;
                } else {
                    const apiKeyInput = document.getElementById(`${selectedProvider}Key`);
                    if (!apiKeyInput || !apiKeyInput.value.trim()) {
                        throw new Error(`${selectedProvider} API key is required`);
                    }
                    config.settings.apiKey = apiKeyInput.value.trim();
                }

                // Get model selection
                const modelSelect = selectedProvider === 'ollama' ?
                    document.getElementById('modelSelect') :
                    document.getElementById(`${selectedProvider}Model`);

                if (modelSelect && modelSelect.value) {
                    config.settings.model = modelSelect.value;
                    localStorage.setItem(`${selectedProvider}Model`, modelSelect.value);
                }

                console.log(`Saving ${selectedProvider} settings...`);
                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save settings');
                }

                console.log(`${selectedProvider} settings saved successfully`);
                showAlert('Configuration sauvegardée avec succès', 'success', 3000);
                
                // Refresh models after saving settings
                await loadProviderModels(selectedProvider);
                
            } catch (error) {
                console.error('Error saving settings:', error);
                showAlert(error.message || 'Erreur lors de la sauvegarde des paramètres', 'danger', 5000);
            }
        });
    }

    // Add event listeners for refresh buttons
    const refreshButtons = {
        'ollama': document.getElementById('refreshModels'),
        'openai': document.getElementById('refreshOpenaiModels'),
        'groq': document.getElementById('refreshGroqModels'),
        'anthropic': document.getElementById('refreshAnthropicModels'),
        'gemini': document.getElementById('refreshGeminiModels')
    };

    Object.entries(refreshButtons).forEach(([provider, button]) => {
        if (button) {
            button.addEventListener('click', () => loadProviderModels(provider, button));
        }
    });

    function showAlert(message, type = 'danger', duration = 5000) {
        const existingAlerts = document.querySelectorAll('.alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('#config');
        if (container) {
            container.insertBefore(alert, container.firstChild);
        }

        if (duration) {
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, duration);
        }
    }

    // Initialize settings
    loadSavedSettings();
});
