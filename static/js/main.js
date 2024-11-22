document.addEventListener('DOMContentLoaded', function() {
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
            updateTextStats(textArea.value, ...countIds);
            
            textArea.addEventListener('input', () => {
                updateTextStats(textArea.value, ...countIds);
            });
        }
    });

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

    document.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const reformulationTab = document.querySelector('#reformulation-tab');
            if (reformulationTab) {
                const tab = new bootstrap.Tab(reformulationTab);
                tab.show();
                
                // Wait for the tab transition
                setTimeout(() => {
                    const contextText = document.getElementById('contextText');
                    const inputText = document.getElementById('inputText');
                    
                    if (contextText) {
                        contextText.value = this.dataset.context || '';
                        updateTextStats(contextText.value, 'contextCharCount', 'contextWordCount', 'contextParaCount');
                    }
                    
                    if (inputText) {
                        inputText.value = this.dataset.text || '';
                        updateTextStats(inputText.value, 'inputCharCount', 'inputWordCount', 'inputParaCount');
                    }
                    
                    function setActiveButton(groupId, value) {
                        const buttons = document.querySelectorAll(`#${groupId} .btn`);
                        buttons.forEach(btn => {
                            if (btn.dataset.value === value) {
                                btn.classList.add('active');
                            } else {
                                btn.classList.remove('active');
                            }
                        });
                    }
                    
                    setActiveButton('toneGroup', this.dataset.tone);
                    setActiveButton('formatGroup', this.dataset.format);
                    setActiveButton('lengthGroup', this.dataset.length);
                }, 150); // Short delay to ensure tab is fully shown
            }
            
            const outputText = document.getElementById('outputText');
            if (outputText) {
                outputText.value = '';
                updateTextStats('', 'outputCharCount', 'outputWordCount', 'outputParaCount');
            }
        });
    });

    document.querySelectorAll('.reuse-email').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const emailTab = document.querySelector('#email-tab');
            if (emailTab) {
                const tab = new bootstrap.Tab(emailTab);
                tab.show();
            }

            const emailType = document.getElementById('emailType');
            const emailContent = document.getElementById('emailContent');
            const emailSender = document.getElementById('emailSender');
            const emailSubject = document.getElementById('emailSubject');
            const emailOutput = document.getElementById('emailOutput');
            
            if (emailType) emailType.value = this.dataset.type || '';
            if (emailContent) emailContent.value = this.dataset.content || '';
            if (emailSender) emailSender.value = this.dataset.sender || '';
            if (emailSubject) emailSubject.value = '';
            if (emailOutput) emailOutput.value = '';
        });
    });

    const resetHistory = document.getElementById('resetHistory');
    if (resetHistory) {
        resetHistory.addEventListener('click', async () => {
            if (confirm('Êtes-vous sûr de vouloir supprimer tout l\'historique ?')) {
                try {
                    const response = await fetch('/api/history/reset', {
                        method: 'POST'
                    });
                    
                    if (response.ok) {
                        const accordion = document.getElementById('historyAccordion');
                        if (accordion) {
                            accordion.innerHTML = '';
                        }
                        showAlert('Historique réinitialisé', 'success', 3000);
                    } else {
                        throw new Error('Failed to reset history');
                    }
                } catch (error) {
                    console.error('Error resetting history:', error);
                    showAlert('Erreur lors de la réinitialisation', 'danger', 5000);
                }
            }
        });
    }

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

    async function updateUIForStatus(status) {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            const currentProvider = data.provider;
            
            const isConnected = status === 'connected';
            const buttons = document.querySelectorAll('.requires-ollama');
            buttons.forEach(button => {
                const shouldDisable = currentProvider === 'ollama' && !isConnected;
                button.disabled = shouldDisable;
                button.title = shouldDisable ? "Service Ollama non disponible" : "";
            });
        } catch (error) {
            console.error('Error fetching provider settings:', error);
        }
    }

    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

    const reformulateBtn = document.getElementById('reformulateBtn');
    if (reformulateBtn) {
        reformulateBtn.classList.add('requires-ollama');
        reformulateBtn.addEventListener('click', async function() {
            const inputText = document.getElementById('inputText');
            const contextText = document.getElementById('contextText');
            const outputText = document.getElementById('outputText');
            
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

    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const outputText = document.getElementById('outputText');
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
            const contextText = document.getElementById('contextText');
            const inputText = document.getElementById('inputText');
            const outputText = document.getElementById('outputText');
            
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