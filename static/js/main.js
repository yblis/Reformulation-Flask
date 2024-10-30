document.addEventListener('DOMContentLoaded', function() {
    // Elements for reformulation
    const contextText = document.getElementById('contextText');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const reformulateBtn = document.getElementById('reformulateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Status check interval
    let lastStatus = 'unknown';
    
    async function checkOllamaStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (data.status !== lastStatus) {
                lastStatus = data.status;
                updateUIForStatus(data.status);
            }
        } catch (error) {
            console.error('Error checking status:', error);
            updateUIForStatus('disconnected');
        }
    }

    function updateUIForStatus(status) {
        const isConnected = status === 'connected';
        const buttons = document.querySelectorAll('.requires-ollama');
        buttons.forEach(button => {
            button.disabled = !isConnected;
            button.title = !isConnected ? "Service Ollama non disponible" : "";
        });

        const statusMessage = document.querySelector('.status-message');
        
        // Only show warning if we're disconnected AND not in the initial loading state
        if (!isConnected && lastStatus !== 'unknown') {
            if (!statusMessage) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-warning mb-3 status-message';
                alert.role = 'alert';
                alert.textContent = "⚠️ Service Ollama non disponible. Veuillez vérifier la configuration dans l'onglet Configuration.";
                const container = document.querySelector('.container');
                if (container) {
                    container.insertBefore(alert, container.firstChild);
                }
            }
        } else if (statusMessage) {
            statusMessage.remove();
        }
    }

    // Check status initially and every 30 seconds
    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

    // Handle tag groups
    function setupTagGroup(groupId) {
        const group = document.getElementById(groupId);
        if (!group) return;
        
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
    if (reformulateBtn) {
        reformulateBtn.classList.add('requires-ollama');
        reformulateBtn.addEventListener('click', async function() {
            const text = inputText.value.trim();
            const context = contextText.value.trim();
            
            if (!text) {
                outputText.value = "Veuillez entrer un texte à reformuler.";
                return;
            }

            const tone = getSelectedValue('toneGroup');
            const format = getSelectedValue('formatGroup');
            const length = getSelectedValue('lengthGroup');

            reformulateBtn.disabled = true;
            reformulateBtn.textContent = 'En cours...';
            outputText.value = "Reformulation en cours...";

            try {
                const response = await fetch('/api/reformulate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        context: context,
                        text: text,
                        tone: tone,
                        format: format,
                        length: length
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    outputText.value = data.text;
                } else {
                    outputText.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                outputText.value = "Erreur de connexion. Veuillez réessayer.";
            } finally {
                reformulateBtn.disabled = false;
                reformulateBtn.textContent = 'Reformuler';
            }
        });
    }

    // Copy functionality
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = outputText.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = 'Copié!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    }

    // Clear functionality
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (contextText) contextText.value = '';
            if (inputText) inputText.value = '';
            if (outputText) outputText.value = '';
        });
    }
});
