document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveConfig = document.getElementById('saveConfig');
    const systemPrompt = document.getElementById('systemPrompt');

    function displayErrorInSelect(message) {
        if (modelSelect) {
            modelSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = message;
            option.disabled = true;
            option.selected = true;
            modelSelect.appendChild(option);
        }
    }

    async function loadModels() {
        if (!modelSelect || !refreshModels) return;

        try {
            displayErrorInSelect('Chargement des modèles...');
            refreshModels.disabled = true;

            const response = await fetch('/api/models');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur de connexion à Ollama');
            }

            modelSelect.innerHTML = '';
            if (data.models && data.models.length > 0) {
                data.models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.name;
                    option.textContent = model.name;
                    modelSelect.appendChild(option);
                });
            } else {
                displayErrorInSelect('Aucun modèle trouvé');
            }
        } catch (error) {
            console.error('Erreur:', error);
            displayErrorInSelect(error.message || 'Erreur lors de la récupération des modèles');
        } finally {
            if (refreshModels) {
                refreshModels.disabled = false;
            }
        }
    }

    // Add event listeners
    if (refreshModels) {
        refreshModels.addEventListener('click', loadModels);
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            if (!ollamaUrl || !modelSelect) {
                console.error('Required elements not found');
                return;
            }

            const originalText = saveConfig.textContent;
            saveConfig.disabled = true;
            saveConfig.textContent = 'Sauvegarde en cours...';

            try {
                const settingsResponse = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: ollamaUrl.value,
                        model: modelSelect.value
                    })
                });

                if (systemPrompt) {
                    const promptResponse = await fetch('/api/prompt', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: systemPrompt.value
                        })
                    });

                    if (!promptResponse.ok) {
                        throw new Error('Erreur lors de la sauvegarde du prompt');
                    }
                }

                if (!settingsResponse.ok) {
                    throw new Error('Erreur lors de la sauvegarde des paramètres');
                }

                // Show success message
                const alert = document.createElement('div');
                alert.className = 'alert alert-success';
                alert.textContent = 'Configuration sauvegardée avec succès';
                saveConfig.parentNode.insertBefore(alert, saveConfig);
                setTimeout(() => alert.remove(), 3000);

                // Reload models to reflect any URL changes
                loadModels();
            } catch (error) {
                console.error('Erreur:', error);
                const alert = document.createElement('div');
                alert.className = 'alert alert-danger';
                alert.textContent = error.message || 'Erreur lors de la sauvegarde';
                saveConfig.parentNode.insertBefore(alert, saveConfig);
                setTimeout(() => alert.remove(), 5000);
            } finally {
                saveConfig.disabled = false;
                saveConfig.textContent = originalText;
            }
        });
    }

    // Load initial configuration
    loadModels();
});
