document.addEventListener('DOMContentLoaded', function() {
    // Helper function to safely get elements
    function getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with id '${id}' not found`);
        }
        return element;
    }

    // Get elements with null checks
    const ollamaUrl = getElement('ollamaUrl');
    const modelSelect = getElement('modelSelect');
    const refreshModels = getElement('refreshModels');
    const saveConfig = getElement('saveConfig');
    const systemPrompt = getElement('systemPrompt');

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
        if (!modelSelect || !refreshModels) {
            console.error('Required elements for loading models not found');
            return;
        }

        try {
            displayErrorInSelect('Chargement des modèles...');
            if (refreshModels) {
                refreshModels.disabled = true;
            }

            const response = await fetch('/api/models');
            const data = await response.json();
            
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
            console.error('Erreur lors de la récupération des modèles:', error);
            displayErrorInSelect('Erreur lors de la récupération des modèles');
        } finally {
            if (refreshModels) {
                refreshModels.disabled = false;
            }
        }
    }

    // Add event listeners only if elements exist
    if (refreshModels) {
        refreshModels.addEventListener('click', loadModels);
    }

    if (saveConfig) {
        saveConfig.addEventListener('click', async function() {
            if (!ollamaUrl || !modelSelect || !systemPrompt) {
                console.error('Required elements for saving configuration not found');
                alert('Erreur: Éléments de configuration manquants');
                return;
            }

            try {
                const settingsResponse = await fetch('/api/settings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: ollamaUrl.value,
                        model: modelSelect.value
                    })
                });

                const promptResponse = await fetch('/api/prompt', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        prompt: systemPrompt.value
                    })
                });

                if (!settingsResponse.ok || !promptResponse.ok) {
                    throw new Error('Erreur lors de la sauvegarde de la configuration');
                }

                alert('Configuration sauvegardée avec succès');
            } catch (error) {
                console.error('Erreur:', error);
                alert('Erreur lors de la sauvegarde de la configuration');
            }
        });
    }

    // Load initial configuration
    loadModels();
});
