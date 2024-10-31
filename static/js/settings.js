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
        try {
            // Show loading state
            if (button) {
                const originalText = button.textContent;
                button.disabled = true;
                button.textContent = 'Chargement...';
            }

            // Get the correct model select element
            const modelSelect = document.getElementById(`${provider}Model`) || document.getElementById('modelSelect');
            if (!modelSelect) return;

            // For Ollama, include the URL in the request
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
            
            // Clear existing options
            modelSelect.innerHTML = '';
            
            // Add new options
            if (data.models && Array.isArray(data.models)) {
                data.models.forEach(model => {
                    if (model.id === "error") {
                        throw new Error(model.name);
                    }
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name || model.id;
                    modelSelect.appendChild(option);
                });
                showAlert(`Models refreshed successfully for ${provider}`, 'success', 3000);
            } else {
                throw new Error('No models found');
            }
        } catch (error) {
            console.error(`Error loading ${provider} models:`, error);
            showAlert(error.message, 'danger', 5000);
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

    // Add event listeners for API key changes
    const apiKeyInputs = {
        'openai': document.getElementById('openaiKey'),
        'groq': document.getElementById('groqKey'),
        'anthropic': document.getElementById('anthropicKey'),
        'gemini': document.getElementById('geminiKey')
    };

    Object.entries(apiKeyInputs).forEach(([provider, input]) => {
        if (input) {
            input.addEventListener('change', () => {
                if (input.value.trim()) {
                    loadProviderModels(provider);
                }
            });
        }
    });

    // Add refresh button listeners for each provider
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

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            try {
                const selectedProvider = aiProvider.value;
                const config = {
                    provider: selectedProvider,
                    settings: {}
                };

                // Get provider-specific settings
                if (selectedProvider === 'groq') {
                    const groqKeyInput = document.getElementById('groqKey');
                    if (!groqKeyInput || !groqKeyInput.value.trim()) {
                        throw new Error('Groq API key is required');
                    }
                    config.settings = {
                        apiKey: groqKeyInput.value.trim()
                    };
                    
                    // Log the configuration being sent (without the actual API key)
                    console.log('Sending Groq config:', {
                        provider: config.provider,
                        settings: { apiKey: '[REDACTED]' }
                    });
                } else if (selectedProvider === 'ollama') {
                    config.settings = {
                        url: document.getElementById('ollamaUrl').value.trim(),
                        model: document.getElementById('modelSelect').value
                    };
                } else {
                    const apiKeyInput = document.getElementById(`${selectedProvider}Key`);
                    const modelSelect = document.getElementById(`${selectedProvider}Model`);
                    
                    if (apiKeyInput && apiKeyInput.value.trim()) {
                        config.settings.apiKey = apiKeyInput.value.trim();
                    }
                    if (modelSelect && modelSelect.value) {
                        config.settings.model = modelSelect.value;
                    }
                }

                const response = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(config)
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to save settings');
                }

                // For Groq, wait a bit and refresh models after saving
                if (selectedProvider === 'groq' && config.settings.apiKey) {
                    // Wait for backend to process
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await loadProviderModels('groq');
                }

                showAlert('Configuration sauvegardée avec succès', 'success', 3000);
            } catch (error) {
                console.error('Error saving settings:', error);
                showAlert(error.message || 'Erreur lors de la sauvegarde des paramètres', 'danger', 5000);
            }
        });
    }

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
