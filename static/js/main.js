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

    // Rest of the existing code...
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
        const savedUrl = localStorage.getItem('ollamaUrl');
        try {
            const url = savedUrl ? `/api/status?url=${encodeURIComponent(savedUrl)}` : '/api/status';
            const response = await fetch(url);
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
                    // Update output text statistics
                    updateTextStats(data.text, 'outputCharCount', 'outputWordCount', 'outputParaCount');
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
        });
    }

    // Rest of the existing code...
});
