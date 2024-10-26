document.addEventListener('DOMContentLoaded', function() {
    // Elements for reformulation
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const reformulateBtn = document.getElementById('reformulateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Elements for translation
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const targetLanguage = document.getElementById('targetLanguage');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');
    const clearTranslation = document.getElementById('clearTranslation');

    // Elements for configuration
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const systemPrompt = document.getElementById('systemPrompt');
    const saveConfig = document.getElementById('saveConfig');

    // Handle tag groups
    function setupTagGroup(groupId) {
        const group = document.getElementById(groupId);
        const buttons = group.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    setupTagGroup('toneGroup');
    setupTagGroup('formatGroup');
    setupTagGroup('lengthGroup');

    // Get selected value from a tag group
    function getSelectedValue(groupId) {
        const activeButton = document.querySelector(`#${groupId} .btn.active`);
        return activeButton ? activeButton.dataset.value : '';
    }

    // Reformulation functionality
    reformulateBtn.addEventListener('click', async function() {
        const text = inputText.value.trim();
        if (!text) return;

        reformulateBtn.disabled = true;
        reformulateBtn.textContent = 'En cours...';

        try {
            const response = await fetch('/api/reformulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    tone: getSelectedValue('toneGroup'),
                    format: getSelectedValue('formatGroup'),
                    length: getSelectedValue('lengthGroup')
                })
            });

            const data = await response.json();
            if (data.error) {
                outputText.value = `Erreur: ${data.error}`;
            } else {
                outputText.value = data.text;
            }
        } catch (error) {
            outputText.value = `Erreur: ${error.message}`;
        } finally {
            reformulateBtn.disabled = false;
            reformulateBtn.textContent = 'Reformuler';
        }
    });

    // Translation functionality
    translateText.addEventListener('click', async function() {
        const text = translationInput.value.trim();
        if (!text) return;

        translateText.disabled = true;
        translateText.textContent = 'En cours...';

        try {
            const response = await fetch('/api/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    language: targetLanguage.value
                })
            });

            const data = await response.json();
            if (data.error) {
                translationOutput.value = `Erreur: ${data.error}`;
            } else {
                translationOutput.value = data.text;
            }
        } catch (error) {
            translationOutput.value = `Erreur: ${error.message}`;
        } finally {
            translateText.disabled = false;
            translateText.textContent = 'Traduire';
        }
    });

    // Configuration functionality
    async function loadModels() {
        try {
            modelSelect.innerHTML = '<option value="" disabled selected>Chargement des modèles...</option>';
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
                modelSelect.innerHTML = '<option value="" disabled selected>Aucun modèle trouvé</option>';
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des modèles:', error);
            modelSelect.innerHTML = '<option value="" disabled selected>Erreur lors de la récupération des modèles</option>';
        } finally {
            refreshModels.disabled = false;
        }
    }

    refreshModels.addEventListener('click', loadModels);

    saveConfig.addEventListener('click', async function() {
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

    // Utility functions
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Erreur lors de la copie:', err);
        });
    }

    // Copy buttons
    copyBtn.addEventListener('click', () => copyToClipboard(outputText.value));
    copyTranslation.addEventListener('click', () => copyToClipboard(translationOutput.value));

    // Clear buttons
    clearBtn.addEventListener('click', () => outputText.value = '');
    clearTranslation.addEventListener('click', () => {
        translationInput.value = '';
        translationOutput.value = '';
    });

    // Load initial configuration
    loadModels();
});
