document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const aiProvider = document.getElementById('aiProvider');
    const providerConfigs = document.querySelectorAll('.provider-config');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');
    const translationPrompt = document.getElementById('translationPrompt');

    // Load saved prompts and settings from localStorage
    function loadSavedSettings() {
        const savedProvider = localStorage.getItem('aiProvider') || 'ollama';
        aiProvider.value = savedProvider;
        showProviderConfig(savedProvider);

        // Load provider-specific settings
        if (document.getElementById('ollamaUrl')) {
            document.getElementById('ollamaUrl').value = localStorage.getItem('ollamaUrl') || 'http://localhost:11434';
        }
        
        // Load prompts
        if (systemPrompt) {
            const savedSystemPrompt = localStorage.getItem('systemPrompt');
            if (savedSystemPrompt) {
                systemPrompt.value = savedSystemPrompt;
            }
        }
        if (translationPrompt) {
            const savedTranslationPrompt = localStorage.getItem('translationPrompt');
            if (savedTranslationPrompt) {
                translationPrompt.value = savedTranslationPrompt;
            }
        }

        // Load models for the selected provider
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

            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            // Clear existing options
            modelSelect.innerHTML = '';
            
            // Add new options
            if (data.models && Array.isArray(data.models)) {
                data.models.forEach(model => {
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
                const providerConfig = document.getElementById(`${selectedProvider}Config`);
                if (providerConfig) {
                    if (selectedProvider === 'groq') {
                        const apiKeyInput = document.getElementById('groqKey');
                        const modelSelect = document.getElementById('groqModel');
                        config.settings = {
                            apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
                            model: modelSelect ? modelSelect.value : ''
                        };
                    } else if (selectedProvider === 'ollama') {
                        config.settings = {
                            url: document.getElementById('ollamaUrl').value.trim(),
                            model: document.getElementById('modelSelect').value
                        };
                    } else {
                        const apiKeyInput = providerConfig.querySelector('input[type="password"]');
                        const modelSelect = providerConfig.querySelector('select');
                        config.settings = {
                            apiKey: apiKeyInput ? apiKeyInput.value.trim() : '',
                            model: modelSelect ? modelSelect.value : ''
                        };
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

                // Save prompts
                if (systemPrompt) {
                    localStorage.setItem('systemPrompt', systemPrompt.value.trim());
                }
                if (translationPrompt) {
                    localStorage.setItem('translationPrompt', translationPrompt.value.trim());
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
