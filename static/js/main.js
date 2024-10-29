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
            button.classList.toggle('btn-disabled', !isConnected);
            
            if (!isConnected) {
                button.setAttribute('title', 'Service Ollama non disponible');
                button.classList.add('cursor-not-allowed', 'opacity-50');
                
                // Add visual feedback with a small warning icon
                const warningIcon = document.createElement('span');
                warningIcon.className = 'warning-icon ms-2';
                warningIcon.innerHTML = '⚠️';
                if (!button.querySelector('.warning-icon')) {
                    button.appendChild(warningIcon);
                }
            } else {
                button.removeAttribute('title');
                button.classList.remove('cursor-not-allowed', 'opacity-50');
                const warningIcon = button.querySelector('.warning-icon');
                if (warningIcon) {
                    warningIcon.remove();
                }
            }
        });

        // Handle status message
        const existingMessage = document.querySelector('.status-message');
        if (!isConnected) {
            const message = "⚠️ Service Ollama non disponible. Vérifiez que le service est démarré et que l'URL est correcte dans la configuration.";
            
            if (!existingMessage) {
                const alert = document.createElement('div');
                alert.className = 'alert alert-warning mb-3 status-message';
                alert.role = 'alert';
                alert.innerHTML = `
                    <div class="d-flex align-items-center">
                        <div class="me-3">
                            <strong>État du service:</strong> Non connecté
                        </div>
                        <div>
                            ${message}
                        </div>
                    </div>
                `;
                const container = document.querySelector('.container');
                if (container) {
                    container.insertBefore(alert, container.firstChild);
                }
            }
        } else if (existingMessage) {
            existingMessage.remove();
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
                showAlert('Veuillez entrer un texte à reformuler.', 'warning');
                return;
            }

            const tone = getSelectedValue('toneGroup');
            const format = getSelectedValue('formatGroup');
            const length = getSelectedValue('lengthGroup');

            reformulateBtn.disabled = true;
            reformulateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>En cours...';
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
                    showAlert(`Erreur: ${data.error || 'Une erreur est survenue'}`, 'danger');
                    outputText.value = '';
                }
            } catch (error) {
                console.error('Erreur:', error);
                showAlert('Erreur de connexion. Veuillez réessayer.', 'danger');
                outputText.value = '';
            } finally {
                reformulateBtn.disabled = false;
                reformulateBtn.innerHTML = 'Reformuler';
                checkOllamaStatus(); // Recheck status after operation
            }
        });
    }

    // Show alert function
    function showAlert(message, type = 'danger', duration = 5000) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }

        if (duration) {
            setTimeout(() => {
                alertDiv.remove();
            }, duration);
        }
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
                showAlert('Erreur lors de la copie du texte', 'danger');
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
