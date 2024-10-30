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
        });
    }

    document.querySelectorAll('.copy-history').forEach(button => {
        button.addEventListener('click', async () => {
            const text = button.dataset.text;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = button.textContent;
                button.textContent = 'Copié!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    });

    document.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', () => {
            const reformulationTab = document.querySelector('#reformulation-tab');
            bootstrap.Tab.getOrCreateInstance(reformulationTab).show();

            const contextText = document.getElementById('contextText');
            const inputText = document.getElementById('inputText');
            if (contextText) contextText.value = button.dataset.context || '';
            if (inputText) inputText.value = button.dataset.original || '';

            const toneButtons = document.querySelectorAll('#toneGroup .btn');
            toneButtons.forEach(btn => {
                if (btn.dataset.value === button.dataset.tone) {
                    btn.click();
                }
            });

            const formatButtons = document.querySelectorAll('#formatGroup .btn');
            formatButtons.forEach(btn => {
                if (btn.dataset.value === button.dataset.format) {
                    btn.click();
                }
            });

            const lengthButtons = document.querySelectorAll('#lengthGroup .btn');
            lengthButtons.forEach(btn => {
                if (btn.dataset.value === button.dataset.length) {
                    btn.click();
                }
            });
        });
    });

    document.querySelector('#history-tab').addEventListener('shown.bs.tab', async () => {
        try {
            const response = await fetch('/api/history');
            const history = await response.json();
            
            const accordion = document.getElementById('historyAccordion');
            accordion.innerHTML = history.map(item => `
                <div class="accordion-item mb-3">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#history-${item.id}">
                            <div class="d-flex justify-content-between w-100 me-3">
                                <div class="text-truncate">${item.original_text.substring(0, 50)}...</div>
                                <small class="text-muted ms-2">${new Date(item.created_at).toLocaleString()}</small>
                            </div>
                        </button>
                    </h2>
                    <div id="history-${item.id}" class="accordion-collapse collapse">
                        <div class="accordion-body">
                            ${item.context ? `
                            <div class="mb-3">
                                <h6>Contexte:</h6>
                                <div class="card">
                                    <div class="card-body">${item.context}</div>
                                </div>
                            </div>
                            ` : ''}
                            <div class="mb-3">
                                <h6>Texte original:</h6>
                                <div class="card">
                                    <div class="card-body">${item.original_text}</div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <h6>Texte reformulé:</h6>
                                <div class="card">
                                    <div class="card-body">${item.reformulated_text}</div>
                                </div>
                            </div>
                            <div class="d-flex gap-2 mb-3">
                                <span class="badge bg-secondary">${item.tone}</span>
                                <span class="badge bg-secondary">${item.format}</span>
                                <span class="badge bg-secondary">${item.length}</span>
                            </div>
                            <div class="btn-group">
                                <button class="btn btn-success btn-sm copy-history" data-text="${item.reformulated_text}">
                                    Copier
                                </button>
                                <button class="btn btn-success btn-sm reuse-history" 
                                        data-original="${item.original_text}"
                                        data-context="${item.context || ''}"
                                        data-tone="${item.tone}"
                                        data-format="${item.format}"
                                        data-length="${item.length}">
                                    Réutiliser
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');

            document.querySelectorAll('.copy-history').forEach(button => {
                button.addEventListener('click', async () => {
                    const text = button.dataset.text;
                    if (!text) return;

                    try {
                        await navigator.clipboard.writeText(text);
                        const originalText = button.textContent;
                        button.textContent = 'Copié!';
                        setTimeout(() => {
                            button.textContent = originalText;
                        }, 2000);
                    } catch (err) {
                        console.error('Erreur lors de la copie:', err);
                    }
                });
            });

            document.querySelectorAll('.reuse-history').forEach(button => {
                button.addEventListener('click', () => {
                    const reformulationTab = document.querySelector('#reformulation-tab');
                    bootstrap.Tab.getOrCreateInstance(reformulationTab).show();

                    const contextText = document.getElementById('contextText');
                    const inputText = document.getElementById('inputText');
                    if (contextText) contextText.value = button.dataset.context || '';
                    if (inputText) inputText.value = button.dataset.original || '';

                    const toneButtons = document.querySelectorAll('#toneGroup .btn');
                    toneButtons.forEach(btn => {
                        if (btn.dataset.value === button.dataset.tone) {
                            btn.click();
                        }
                    });

                    const formatButtons = document.querySelectorAll('#formatGroup .btn');
                    formatButtons.forEach(btn => {
                        if (btn.dataset.value === button.dataset.format) {
                            btn.click();
                        }
                    });

                    const lengthButtons = document.querySelectorAll('#lengthGroup .btn');
                    lengthButtons.forEach(btn => {
                        if (btn.dataset.value === button.dataset.length) {
                            btn.click();
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Error fetching history:', error);
        }
    });
});