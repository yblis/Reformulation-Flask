document.addEventListener('DOMContentLoaded', function() {
    // Text statistics functions
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function countParagraphs(text) {
        return text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }

    function updateTextStats(text, charCountId, wordCountId, paraCountId) {
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);

        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = countWords(text);
        if (paraCount) paraCount.textContent = countParagraphs(text);
    }

    // Setup text statistics for all textareas
    const textAreas = {
        'contextText': ['contextCharCount', 'contextWordCount', 'contextParaCount'],
        'inputText': ['inputCharCount', 'inputWordCount', 'inputParaCount'],
        'outputText': ['outputCharCount', 'outputWordCount', 'outputParaCount'],
        'translationInput': ['translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount'],
        'translationOutput': ['translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount']
    };

    Object.entries(textAreas).forEach(([textAreaId, countIds]) => {
        const textArea = document.getElementById(textAreaId);
        if (textArea) {
            // Initial count
            updateTextStats(textArea.value, ...countIds);
            
            // Update on input
            textArea.addEventListener('input', () => {
                updateTextStats(textArea.value, ...countIds);
            });
        }
    });

    // Elements for reformulation
    const contextText = document.getElementById('contextText');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const reformulateBtn = document.getElementById('reformulateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Clear History Button
    const clearHistory = document.getElementById('clearHistory');
    if (clearHistory) {
        clearHistory.addEventListener('click', async () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer tout l'historique ?')) {
                try {
                    const response = await fetch('/api/history/clear', {
                        method: 'POST'
                    });
                    
                    if (response.ok) {
                        window.location.reload();
                        showAlert('Historique supprimé avec succès', 'success', 3000);
                    } else {
                        const data = await response.json();
                        throw new Error(data.error || 'Failed to clear history');
                    }
                } catch (error) {
                    console.error('Error clearing history:', error);
                    showAlert('Erreur lors de la suppression de l\'historique', 'danger', 5000);
                }
            }
        });
    }

    // Handle reuse history button clicks
    document.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', function() {
            // Get the reformulation tab element and show it
            const reformulationTab = document.getElementById('reformulation-tab');
            const tab = new bootstrap.Tab(reformulationTab);
            tab.show();
            
            // Set the context and input text
            if (contextText) {
                contextText.value = this.dataset.context || '';
                updateTextStats(contextText.value, 'contextCharCount', 'contextWordCount', 'contextParaCount');
            }
            
            if (inputText) {
                inputText.value = this.dataset.text || '';
                updateTextStats(inputText.value, 'inputCharCount', 'inputWordCount', 'inputParaCount');
            }
            
            // Set the formatting options
            const toneButtons = document.querySelectorAll('#toneGroup .btn');
            const formatButtons = document.querySelectorAll('#formatGroup .btn');
            const lengthButtons = document.querySelectorAll('#lengthGroup .btn');
            
            function setActiveButton(buttons, value) {
                buttons.forEach(btn => {
                    if (btn.dataset.value === value) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }

            setActiveButton(toneButtons, this.dataset.tone);
            setActiveButton(formatButtons, this.dataset.format);
            setActiveButton(lengthButtons, this.dataset.length);
            
            // Clear the output
            if (outputText) {
                outputText.value = '';
                updateTextStats('', 'outputCharCount', 'outputWordCount', 'outputParaCount');
            }

            // Show confirmation message
            showAlert('Texte et options chargés avec succès', 'success', 2000);
        });
    });

    // Status check interval
    let lastStatus = 'unknown';
    
    async function checkOllamaStatus() {
        try {
            const savedUrl = localStorage.getItem('ollamaUrl');
            const url = savedUrl ? `/api/status?url=${encodeURIComponent(savedUrl)}` : '/api/status';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error('Status check failed');
            }
            
            const data = await response.json();
            if (data.status !== lastStatus) {
                lastStatus = data.status;
                updateUIForStatus(data.status);
            }
            return data.status === 'connected';
        } catch (error) {
            console.error('Error checking status:', error);
            updateUIForStatus('disconnected');
            return false;
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
        
        if (!isConnected && lastStatus !== 'unknown') {
            const savedUrl = localStorage.getItem('ollamaUrl');
            if (!savedUrl || !checkOllamaStatus()) {
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
            }
        } else if (statusMessage) {
            statusMessage.remove();
        }
    }

    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

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

    function getSelectedValue(groupId) {
        const activeButton = document.querySelector(`#${groupId} .btn.active`);
        return activeButton ? activeButton.dataset.value : '';
    }

    if (reformulateBtn) {
        reformulateBtn.classList.add('requires-ollama');
        reformulateBtn.addEventListener('click', async function() {
            const text = inputText.value.trim();
            const context = contextText.value.trim();
            
            if (!text) {
                showAlert('Veuillez entrer un texte à reformuler.', 'warning', 3000);
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
                    updateTextStats(data.text, 'outputCharCount', 'outputWordCount', 'outputParaCount');
                    showAlert('Texte reformulé avec succès', 'success', 2000);
                } else {
                    outputText.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                    showAlert(data.error || 'Une erreur est survenue', 'danger', 5000);
                }
            } catch (error) {
                console.error('Erreur:', error);
                outputText.value = "Erreur de connexion. Veuillez réessayer.";
                showAlert('Erreur de connexion', 'danger', 5000);
            } finally {
                reformulateBtn.disabled = false;
                reformulateBtn.textContent = 'Reformuler';
            }
        });
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const text = outputText.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                showAlert('Texte copié dans le presse-papier', 'success', 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
                showAlert('Erreur lors de la copie', 'danger', 3000);
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (contextText) {
                contextText.value = '';
                updateTextStats('', 'contextCharCount', 'contextWordCount', 'contextParaCount');
            }
            if (inputText) {
                inputText.value = '';
                updateTextStats('', 'inputCharCount', 'inputWordCount', 'inputParaCount');
            }
            if (outputText) {
                outputText.value = '';
                updateTextStats('', 'outputCharCount', 'outputWordCount', 'outputParaCount');
            }
            showAlert('Champs effacés', 'success', 2000);
        });
    }

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
});
