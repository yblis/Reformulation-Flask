document.addEventListener('DOMContentLoaded', function() {
    const settingsModal = document.getElementById('settingsModal');
    const ollamaUrl = document.getElementById('ollamaUrl');
    const modelSelect = document.getElementById('modelSelect');
    const refreshModels = document.getElementById('refreshModels');
    const saveSettings = document.getElementById('saveSettings');

    async function loadModels() {
        try {
            const response = await fetch('/api/models');
            const data = await response.json();
            
            modelSelect.innerHTML = '';
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = model.name;
                modelSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading models:', error);
        }
    }

    refreshModels.addEventListener('click', loadModels);

    saveSettings.addEventListener('click', async function() {
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: ollamaUrl.value,
                    model: modelSelect.value
                })
            });
            
            bootstrap.Modal.getInstance(settingsModal).hide();
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    });

    // Load models when modal opens
    settingsModal.addEventListener('show.bs.modal', loadModels);
});
