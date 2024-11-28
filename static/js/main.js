document.addEventListener('DOMContentLoaded', function() {
    // Navigation functionality with improved mobile handling
    const navbar = document.querySelector('.navbar-collapse');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbarToggler = document.querySelector('.navbar-toggler');

    // Function to close the mobile menu with animation
    function closeNavbar() {
        if (window.innerWidth <= 768 && navbar.classList.contains('show')) {
            navbar.classList.add('fade');
            setTimeout(() => {
                navbarToggler.click();
                navbar.classList.remove('fade');
            }, 150);
        }
    }

    // Close menu when clicking a nav link on mobile with smooth transition
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            setTimeout(() => {
                closeNavbar();
            }, 100);
        });
    });

    // Enhanced text statistics functions
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function countParagraphs(text) {
        return text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }

    // Improved statistics update with animations
    function updateTextStats(text, charCountId, wordCountId, paraCountId) {
        const elements = {
            char: document.getElementById(charCountId),
            word: document.getElementById(wordCountId),
            para: document.getElementById(paraCountId)
        };

        const stats = {
            char: text.length,
            word: countWords(text),
            para: countParagraphs(text)
        };

        Object.entries(elements).forEach(([type, element]) => {
            if (element) {
                const currentValue = parseInt(element.textContent) || 0;
                const targetValue = stats[type];
                
                // Animate the number change
                animateValue(element, currentValue, targetValue, 200);
            }
        });
    }

    // Number animation function
    function animateValue(element, start, end, duration) {
        if (start === end) return;
        const range = end - start;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const value = Math.floor(start + (range * progress));
            element.textContent = value;

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    // Enhanced alert system with animations
    function showAlert(message, type = 'danger', duration = 5000) {
        const existingAlerts = document.querySelectorAll('.floating-alert');
        existingAlerts.forEach(alert => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        });

        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible floating-alert`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alert);
        setTimeout(() => alert.classList.add('show'), 10);

        if (duration) {
            setTimeout(() => {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 300);
            }, duration);
        }
    }

    // Loading spinner management
    function setLoading(button, isLoading, originalText) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>En cours...';
        } else {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // Setup text areas statistics tracking
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

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        const isClickInside = navbar.contains(event.target) || navbarToggler.contains(event.target);
        if (!isClickInside && navbar.classList.contains('show')) {
            closeNavbar();
        }
    });

    // Close menu when pressing escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && navbar.classList.contains('show')) {
            closeNavbar();
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

    // Enhanced reformulate functionality
    const reformulateBtn = document.getElementById('reformulateBtn');
    if (reformulateBtn) {
        reformulateBtn.addEventListener('click', async function() {
            const inputText = document.getElementById('inputText');
            const contextText = document.getElementById('contextText');
            const outputText = document.getElementById('outputText');
            
            const text = inputText.value.trim();
            const context = contextText.value.trim();
            
            if (!text) {
                showAlert("Veuillez entrer un texte à reformuler.", "warning");
                return;
            }

            const tone = getSelectedValue('toneGroup');
            const format = getSelectedValue('formatGroup');
            const length = getSelectedValue('lengthGroup');

            setLoading(reformulateBtn, true, "Reformuler");
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
                    showAlert("Reformulation terminée avec succès!", "success", 3000);
                } else {
                    outputText.value = "";
                    showAlert(`Erreur: ${data.error || 'Une erreur est survenue'}`, "danger");
                }
            } catch (error) {
                console.error('Erreur:', error);
                outputText.value = "";
                showAlert("Erreur de connexion. Veuillez réessayer.", "danger");
            } finally {
                setLoading(reformulateBtn, false, "Reformuler");
            }
        });
    }

    // Enhanced copy functionality
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const outputText = document.getElementById('outputText');
            const text = outputText.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyBtn.textContent;
                copyBtn.innerHTML = '<i class="bi bi-check2"></i> Copié!';
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
                showAlert("Erreur lors de la copie du texte", "danger");
            }
        });
    }

    // Enhanced clear functionality
    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ['contextText', 'inputText', 'outputText'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = '';
                    const [charId, wordId, paraId] = textAreas[id];
                    updateTextStats('', charId, wordId, paraId);
                }
            });
            showAlert("Tous les champs ont été effacés", "info", 2000);
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
            const status = {
                state: data.status,
                provider: data.provider,
                error: data.error
            };
            
            if (status.provider !== 'ollama') {
                if (lastStatus !== 'non-ollama') {
                    lastStatus = 'non-ollama';
                    updateUIForStatus(status);
                }
                return true;
            }
            
            if (status.state !== lastStatus) {
                lastStatus = status.state;
                updateUIForStatus(status);
            }
            return status.state === 'connected';
        } catch (error) {
            console.error('Error checking status:', error);
            updateUIForStatus({
                state: 'disconnected',
                provider: 'unknown',
                error: error.message
            });
            return false;
        }
    }

    function updateUIForStatus(status) {
        const statusIndicator = document.getElementById('statusIndicator');
        if (!statusIndicator) {
            return;
        }

        let icon = '';
        let color = '';
        
        switch(status.state) {
            case 'connected':
                icon = '<i class="bi bi-check-circle-fill"></i>';
                color = 'text-success';
                break;
            case 'warning':
                icon = '<i class="bi bi-exclamation-triangle-fill"></i>';
                color = 'text-warning';
                break;
            case 'error':
            case 'disconnected':
                icon = '<i class="bi bi-x-circle-fill"></i>';
                color = 'text-danger';
                break;
            default:
                icon = '<i class="bi bi-question-circle-fill"></i>';
                color = 'text-secondary';
        }

        statusIndicator.innerHTML = `
            <span class="${color}" title="${status.error || status.message || 'État du service'}">
                ${icon} ${status.provider.charAt(0).toUpperCase() + status.provider.slice(1)}
            </span>
        `;
    }

    // Initialize status check
    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

});