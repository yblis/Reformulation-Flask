document.addEventListener('DOMContentLoaded', function() {
    // Elements for reformulation
    const contextText = document.getElementById('contextText');
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const reformulateBtn = document.getElementById('reformulateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Add text statistics elements
    function createStatsElement(textareaId) {
        const textarea = document.getElementById(textareaId);
        if (!textarea) return;

        const statsDiv = document.createElement('div');
        statsDiv.className = 'text-stats small text-muted mt-2';
        statsDiv.innerHTML = `
            <span class="me-3">Caractères: <span class="char-count">0</span></span>
            <span class="me-3">Mots: <span class="word-count">0</span></span>
            <span>Phrases: <span class="sentence-count">0</span></span>
        `;
        textarea.parentNode.insertBefore(statsDiv, textarea.nextSibling);
        return statsDiv;
    }

    // Create stats elements for textareas
    const inputStats = createStatsElement('inputText');
    const outputStats = createStatsElement('outputText');
    const contextStats = createStatsElement('contextText');

    // Function to count text statistics
    function updateTextStats(text, statsElement) {
        if (!statsElement) return;

        const charCount = text.length;
        const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
        const sentenceCount = text.trim() === '' ? 0 : text.split(/[.!?]+/).filter(Boolean).length;

        statsElement.querySelector('.char-count').textContent = charCount;
        statsElement.querySelector('.word-count').textContent = wordCount;
        statsElement.querySelector('.sentence-count').textContent = sentenceCount;
    }

    // Add input event listeners for real-time updates
    if (inputText) {
        inputText.addEventListener('input', () => updateTextStats(inputText.value, inputStats));
    }
    if (outputText) {
        outputText.addEventListener('input', () => updateTextStats(outputText.value, outputStats));
        // Also update when content changes programmatically
        const originalSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        Object.defineProperty(outputText, 'value', {
            set: function(val) {
                originalSetter.call(this, val);
                updateTextStats(val, outputStats);
            }
        });
    }
    if (contextText) {
        contextText.addEventListener('input', () => updateTextStats(contextText.value, contextStats));
    }

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
            if (contextText) contextText.value = '';
            if (inputText) inputText.value = '';
            if (outputText) outputText.value = '';
            // Update stats after clearing
            updateTextStats('', contextStats);
            updateTextStats('', inputStats);
            updateTextStats('', outputStats);
        });
    }

    // Initial stats update
    if (inputText) updateTextStats(inputText.value, inputStats);
    if (outputText) updateTextStats(outputText.value, outputStats);
    if (contextText) updateTextStats(contextText.value, contextStats);

    // Rest of the existing code...
});
