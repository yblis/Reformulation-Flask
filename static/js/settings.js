document.addEventListener('DOMContentLoaded', function() {
    const settingsModal = document.getElementById('settingsModal');
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveSettings = document.getElementById('saveSettings');

    function displayErrorInSelect(message) {
        modelSelect.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = message;
        option.disabled = true;
        option.selected = true;
        modelSelect.appendChild(option);
    }

    async function loadModels() {
        try {
            displayErrorInSelect('Chargement des modèles...');
            refreshModels.disabled = true;

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
            refreshModels.disabled = false;
        }
    }

    refreshModels.addEventListener('click', loadModels);

    saveSettings.addEventListener('click', async function() {
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: ollamaUrl.value,
                    model: modelSelect.value
                })
            });

            if (!response.ok) {
                throw new Error('Erreur lors de la sauvegarde des paramètres');
            }
            
            bootstrap.Modal.getInstance(settingsModal).hide();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erreur lors de la sauvegarde des paramètres');
        }
    });

    // Load models when modal opens
    settingsModal.addEventListener('show.bs.modal', loadModels);
});
