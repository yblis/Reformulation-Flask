document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const aiProvider = document.getElementById('aiProvider');
    const providerConfigs = document.querySelectorAll('.provider-config');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');
    const emailPrompt = document.getElementById('emailPrompt');

    async function loadSavedSettings() {
        try {
            // Fetch current settings from backend
            const response = await fetch('/api/settings');
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to load settings');
            }

            // Update provider dropdown
            const savedProvider = data.provider || localStorage.getItem('aiProvider') || 'ollama';
            aiProvider.value = savedProvider;
            
            // Update API keys and URLs
            if (data.settings) {
                // Ollama URL
                const ollamaUrl = document.getElementById('ollamaUrl');
                if (ollamaUrl && data.settings.ollama_url) {
                    ollamaUrl.value = data.settings.ollama_url;
                }
                
                // OpenAI
                const openaiKey = document.getElementById('openaiKey');
                if (openaiKey && data.settings.openai_api_key) {
                    openaiKey.value = data.settings.openai_api_key;
                }
                
                // Anthropic
                const anthropicKey = document.getElementById('anthropicKey');
                if (anthropicKey && data.settings.anthropic_api_key) {
                    anthropicKey.value = data.settings.anthropic_api_key;
                }
                
                // Gemini
                const geminiKey = document.getElementById('geminiKey');
                if (geminiKey && data.settings.google_api_key) {
                    geminiKey.value = data.settings.google_api_key;
                }
                
                // Groq
                const groqKey = document.getElementById('groqKey');
                if (groqKey && data.settings.groq_api_key) {
                    groqKey.value = data.settings.groq_api_key;
                }
            }
            
            // Show correct provider config and load models
            showProviderConfig(savedProvider);
            await loadProviderModels(savedProvider);
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
        try {
            const modelSelect = document.getElementById(provider === 'ollama' ? 'modelSelect' : `${provider}Model`);
            if (!modelSelect) {
                throw new Error(`Model select element not found for ${provider}`);
            }

            if (button) {
                button.disabled = true;
                button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Loading...';
            }

            // Clear existing options
            modelSelect.innerHTML = '<option value="">Loading models...</option>';

            let url = `/api/models/${provider}`;
            if (provider === 'ollama') {
                const ollamaUrl = document.getElementById('ollamaUrl')?.value;
                if (ollamaUrl) {
                    url += `?url=${encodeURIComponent(ollamaUrl)}`;
                }
            }

            const apiKeyInput = document.getElementById(`${provider}Key`);
            if (provider !== 'ollama' && (!apiKeyInput?.value)) {
                throw new Error(`Please configure ${provider} API key first`);
            }

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Failed to fetch ${provider} models`);
            }

            if (!data.models?.length) {
                throw new Error(`No models available for ${provider}`);
            }

            // Clear loading option and add fetched models
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

            showAlert(`Models refreshed for ${provider}`, 'success', 3000);

        } catch (error) {
            console.error(`Error loading ${provider} models:`, error);
            if (error.message.includes('API key')) {
                showAlert(`Please configure ${provider} API key first`, 'warning', 5000);
            } else {
                showAlert(error.message, 'danger', 5000);
            }
            
            const modelSelect = document.getElementById(provider === 'ollama' ? 'modelSelect' : `${provider}Model`);
            if (modelSelect) {
                modelSelect.innerHTML = `<option value="">${error.message}</option>`;
            }
        } finally {
            if (button) {
                button.disabled = false;
                button.innerHTML = 'Rafraîchir les modèles';
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
                const selectedProvider = aiProvider.value;
                const config = {
                    provider: selectedProvider,
                    settings: {}
                };

                // Get provider-specific settings
                const apiKeyInput = document.getElementById(`${selectedProvider}Key`);
                const modelSelect = document.getElementById(`${selectedProvider}Model`) || document.getElementById('modelSelect');

                if (selectedProvider === 'ollama') {
                    const ollamaUrl = document.getElementById('ollamaUrl').value.trim();
                    if (!ollamaUrl) {
                        throw new Error('Ollama URL is required');
                    }
                    config.settings.url = ollamaUrl;
                } else {
                    if (!apiKeyInput?.value.trim()) {
                        throw new Error(`${selectedProvider} API key is required`);
                    }
                    config.settings.apiKey = apiKeyInput.value.trim();
                }

                if (!modelSelect?.value) {
                    throw new Error(`Please select a model for ${selectedProvider}`);
                }
                config.settings.model = modelSelect.value;
                localStorage.setItem(`${selectedProvider}Model`, modelSelect.value);

                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to save settings');
                }

                showAlert('Configuration saved successfully', 'success', 3000);
                await loadProviderModels(selectedProvider);

            } catch (error) {
                console.error('Error saving settings:', error);
                showAlert(error.message || 'Error saving settings', 'danger', 5000);
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
