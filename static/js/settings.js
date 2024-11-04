document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const aiProvider = document.getElementById('aiProvider');
    const providerConfigs = document.querySelectorAll('.provider-config');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');

    async function loadSavedSettings() {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load settings');
            }

            // Update provider dropdown
            if (aiProvider) {
                const savedProvider = data.provider || localStorage.getItem('aiProvider') || 'ollama';
                aiProvider.value = savedProvider;
                
                // Show correct provider config and load models
                showProviderConfig(savedProvider);
                await loadProviderModels(savedProvider);
            }
            
            // Add null checks for all element access
            if (data.settings) {
                const elements = {
                    'ollamaUrl': data.settings.ollama_url,
                    'openaiKey': data.settings.openai_api_key,
                    'anthropicKey': data.settings.anthropic_api_key,
                    'geminiKey': data.settings.google_api_key,
                    'groqKey': data.settings.groq_api_key
                };

                for (const [id, value] of Object.entries(elements)) {
                    const element = document.getElementById(id);
                    if (element && value) {
                        element.value = value;
                    }
                }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            showAlert(error.message || 'Failed to load settings', 'danger', 5000);
        }
    }

    function showProviderConfig(provider) {
        providerConfigs.forEach(config => {
            config.style.display = config.id === `${provider}Config` ? 'block' : 'none';
        });
    }

    async function loadProviderModels(provider, button = null) {
        let modelSelect;
        let originalButtonText = '';
        
        try {
            if (button) {
                originalButtonText = button.textContent;
                button.disabled = true;
                button.textContent = 'Chargement...';
            }

            // Get the correct model select element based on provider
            if (provider === 'ollama') {
                modelSelect = document.getElementById('modelSelect');
            } else {
                modelSelect = document.getElementById(`${provider}Model`);
            }

            if (!modelSelect) {
                throw new Error(`Model select element not found for ${provider}`);
            }

            // Clear existing options first
            modelSelect.innerHTML = '<option value="">Loading models...</option>';

            let url = `/api/models/${provider}`;
            if (provider === 'ollama') {
                const ollamaUrlInput = document.getElementById('ollamaUrl');
                if (ollamaUrlInput && ollamaUrlInput.value) {
                    url += `?url=${encodeURIComponent(ollamaUrlInput.value)}`;
                }
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch ${provider} models`);
            }

            if (!data.models || !Array.isArray(data.models) || data.models.length === 0) {
                throw new Error(`No models available for ${provider}`);
            }

            // Clear and add the models
            modelSelect.innerHTML = '';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.name || model.id;
                modelSelect.appendChild(option);
            });

            // Select the saved model if available
            const savedModel = localStorage.getItem(`${provider}Model`);
            if (savedModel && modelSelect.querySelector(`option[value="${savedModel}"]`)) {
                modelSelect.value = savedModel;
            }

            showAlert(`Models refreshed successfully for ${provider}`, 'success', 3000);

        } catch (error) {
            console.error(`Error loading ${provider} models:`, error);
            
            if (modelSelect) {
                modelSelect.innerHTML = `<option value="">${error.message}</option>`;
            }
            
            showAlert(error.message, 'danger', 5000);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalButtonText;
            }
        }
    }

    // Event listeners
    if (aiProvider) {
        aiProvider.addEventListener('change', async function() {
            const selectedProvider = this.value;
            showProviderConfig(selectedProvider);
            await loadProviderModels(selectedProvider);
            localStorage.setItem('aiProvider', selectedProvider);
        });
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            try {
                const selectedProvider = aiProvider ? aiProvider.value : 'ollama';
                const config = {
                    provider: selectedProvider,
                    settings: {}
                };

                // Get provider-specific settings
                const apiKeyInput = document.getElementById(`${selectedProvider}Key`);
                const modelSelect = document.getElementById(`${selectedProvider}Model`) || document.getElementById('modelSelect');

                if (selectedProvider !== 'ollama' && (!apiKeyInput || !apiKeyInput.value.trim())) {
                    throw new Error(`${selectedProvider} API key is required`);
                }

                if (selectedProvider === 'ollama') {
                    const ollamaUrl = document.getElementById('ollamaUrl');
                    if (ollamaUrl && !ollamaUrl.value.trim()) {
                        throw new Error('Ollama URL is required');
                    }
                    if (ollamaUrl) {
                        config.settings.url = ollamaUrl.value.trim();
                    }
                } else if (apiKeyInput) {
                    config.settings.apiKey = apiKeyInput.value.trim();
                }

                if (modelSelect && modelSelect.value) {
                    config.settings.model = modelSelect.value;
                    localStorage.setItem(`${selectedProvider}Model`, modelSelect.value);
                } else {
                    throw new Error(`Please select a model for ${selectedProvider}`);
                }

                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save settings');
                }

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
            button.addEventListener('click', async () => {
                try {
                    await loadProviderModels(provider, button);
                } catch (error) {
                    console.error(`Error refreshing ${provider} models:`, error);
                    showAlert(`Failed to refresh ${provider} models: ${error.message}`, 'danger', 5000);
                }
            });
        }
    });

    function showAlert(message, type = 'danger', duration = 5000) {
        const existingAlerts = document.querySelectorAll('.floating-alert');
        existingAlerts.forEach(alert => alert.remove());

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show floating-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);

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
