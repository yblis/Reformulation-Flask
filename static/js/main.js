// Enhanced text statistics functions
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

    // Context visibility management
    const showContextCheckbox = document.getElementById('showContext');
    const contextSection = document.getElementById('contextSection');
    
    if (showContextCheckbox && contextSection) {
        // Restore saved preference
        const showContext = localStorage.getItem('showContext') === 'true';
        showContextCheckbox.checked = showContext;
        contextSection.style.display = showContext ? 'block' : 'none';
        
        // Handle checkbox changes
        showContextCheckbox.addEventListener('change', function() {
            const isChecked = this.checked;
            contextSection.style.display = isChecked ? 'block' : 'none';
            localStorage.setItem('showContext', isChecked);
        });
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

    // Tag management system
    class TagManager {
        constructor() {
            this.defaultTags = {
                'toneGroup': [
                    { value: 'Professionnel', isActive: true },
                    { value: 'Informatif', isActive: false },
                    { value: 'Décontracté', isActive: false }
                ],
                'formatGroup': [
                    { value: 'Mail', isActive: true },
                    { value: 'Paragraphe', isActive: false },
                    { value: 'Article de blog', isActive: false }
                ],
                'lengthGroup': [
                    { value: 'Court', isActive: false },
                    { value: 'Moyen', isActive: true },
                    { value: 'Long', isActive: false }
                ],
                'emailToneGroup': [
                    { value: 'Professionnel', isActive: true },
                    { value: 'Informatif', isActive: false },
                    { value: 'Décontracté', isActive: false },
                    { value: 'Amical', isActive: false },
                    { value: 'Formel', isActive: false }
                ]
            };
            this.groups = ['toneGroup', 'formatGroup', 'lengthGroup', 'emailToneGroup'];
        }

        init() {
            this.groups.forEach(groupId => {
                this.loadTags(groupId);
                this.setupTagListeners(groupId);
                this.setupAddButton(groupId);
            });
        }

        createTagElement(tag) {
            const element = document.createElement('span');
            element.className = `tag${tag.isActive ? ' active' : ''}`;
            element.dataset.value = tag.value;
            element.dataset.timestamp = tag.timestamp || new Date().toISOString();
            element.dataset.usageCount = tag.usageCount || '0';
            
            const usageCount = parseInt(element.dataset.usageCount, 10);
            const tagClass = usageCount > 10 ? 'frequently-used' : usageCount > 5 ? 'moderately-used' : '';
            if (tagClass) {
                element.classList.add(tagClass);
            }
            
            element.innerHTML = `
                ${tag.value}
                ${usageCount > 0 ? `<span class="tag-usage-count" title="${usageCount} utilisations">${usageCount}</span>` : ''}
                <i class="bi bi-x tag-remove" aria-label="Supprimer le tag"></i>
            `.trim();
            
            return element;
        }

        loadTags(groupId) {
            const container = document.getElementById(groupId);
            if (!container) return;

            try {
                let tags = JSON.parse(localStorage.getItem(`${groupId}Tags`) || '[]');
                if (tags.length === 0 && this.defaultTags[groupId]) {
                    tags = this.defaultTags[groupId];
                    localStorage.setItem(`${groupId}Tags`, JSON.stringify(tags));
                }

                container.innerHTML = '';
                tags.forEach(tag => {
                    container.appendChild(this.createTagElement(tag));
                });
            } catch (error) {
                console.error(`Error loading tags for ${groupId}:`, error);
                // Fallback to defaults on error
                if (this.defaultTags[groupId]) {
                    container.innerHTML = '';
                    this.defaultTags[groupId].forEach(tag => {
                        container.appendChild(this.createTagElement(tag));
                    });
                }
            }
        }

        saveTags(groupId) {
            const container = document.getElementById(groupId);
            if (!container) return;

            const tags = Array.from(container.querySelectorAll('.tag')).map(tag => ({
                value: tag.dataset.value,
                isActive: tag.classList.contains('active'),
                timestamp: tag.dataset.timestamp || new Date().toISOString(),
                usageCount: parseInt(tag.dataset.usageCount || '0', 10)
            }));

            localStorage.setItem(`${groupId}Tags`, JSON.stringify(tags));
            
            // Sauvegarder l'historique des tags utilisés
            const tagsHistory = JSON.parse(localStorage.getItem(`${groupId}History`) || '[]');
            const activeTags = tags.filter(tag => tag.isActive);
            if (activeTags.length > 0) {
                tagsHistory.push({
                    tags: activeTags,
                    timestamp: new Date().toISOString()
                });
                // Garder seulement les 50 dernières utilisations
                if (tagsHistory.length > 50) {
                    tagsHistory.shift();
                }
                localStorage.setItem(`${groupId}History`, JSON.stringify(tagsHistory));
            }
            
            document.dispatchEvent(new CustomEvent('tagsUpdated', {
                detail: { groupId, tags, history: tagsHistory }
            }));
        }

        setupTagListeners(groupId) {
            const container = document.getElementById(groupId);
            if (!container) return;

            container.addEventListener('click', (e) => {
                const removeIcon = e.target.closest('.tag-remove');
                const tag = e.target.closest('.tag');
                
                if (!tag) return;

                if (removeIcon) {
                    tag.classList.add('removing');
                    setTimeout(() => {
                        tag.remove();
                        this.saveTags(groupId);
                    }, 150);
                    return;
                }

                if (groupId === 'toneGroup' || groupId === 'emailToneGroup') {
                    tag.classList.toggle('active');
                } else {
                    container.querySelectorAll('.tag').forEach(t => {
                        if (t !== tag) t.classList.remove('active');
                    });
                    tag.classList.add('active');
                }
                this.saveTags(groupId);
            });
        }

        setupAddButton(groupId) {
            const container = document.getElementById(groupId);
            const addButton = document.querySelector(`[data-target="${groupId}"]`);
            if (!addButton || !container) return;

            // Create input container
            const inputContainer = document.createElement('div');
            inputContainer.className = 'tag-input-container';
            inputContainer.innerHTML = `
                <input type="text" class="tag-input" placeholder="Nouveau tag...">
                <div class="tag-input-buttons">
                    <button class="btn btn-success btn-sm confirm-tag">+</button>
                    <button class="btn btn-secondary btn-sm cancel-tag">Annuler</button>
                </div>
            `;
            container.parentNode.insertBefore(inputContainer, container.nextSibling);

            const input = inputContainer.querySelector('.tag-input');
            const confirmBtn = inputContainer.querySelector('.confirm-tag');
            const cancelBtn = inputContainer.querySelector('.cancel-tag');

            addButton.addEventListener('click', () => {
                inputContainer.classList.add('active');
                input.focus();
            });

            confirmBtn.addEventListener('click', () => {
                const value = input.value.trim();
                if (value) {
                    const newTag = this.createTagElement({ value: value, isActive: false });
                    container.appendChild(newTag);
                    requestAnimationFrame(() => {
                        newTag.classList.add('tag-appear');
                    });
                    this.saveTags(groupId);
                }
                input.value = '';
                inputContainer.classList.remove('active');
            });

            cancelBtn.addEventListener('click', () => {
                input.value = '';
                inputContainer.classList.remove('active');
            });

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    confirmBtn.click();
                }
            });

            input.addEventListener('keyup', (e) => {
                if (e.key === 'Escape') {
                    cancelBtn.click();
                }
            });
        }
    }

    // Initialize tag system
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM Content Loaded - Initializing TagManager');
        const tagManager = new TagManager();
        tagManager.init();
        console.log('TagManager initialized');
    });

    // Immediately create an instance for external use
    const globalTagManager = new TagManager();
    
    // Also initialize when the script loads
    console.log('Initializing TagManager on script load');
    globalTagManager.init();

    // Make getSelectedValues available globally
    window.getSelectedValues = function(groupId) {
        const container = document.getElementById(groupId);
        if (!container) return groupId.includes('tone') ? [] : '';

        const activeTags = Array.from(container.querySelectorAll('.tag.active')).map(tag => tag.dataset.value);
        
        // Return array for tone groups, single value for others
        return groupId.includes('tone') ? activeTags : (activeTags[0] || '');
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
                showAlert("Veuillez entrer un texte à reformuler dans le champ 'Texte à reformuler'.", "warning");
                return;
            }

            const selectedTones = getSelectedValues('toneGroup');
            const tone = Array.isArray(selectedTones) ? selectedTones[0] : selectedTones;
            const format = getSelectedValues('formatGroup');
            const length = getSelectedValues('lengthGroup');

            console.log('Reformulation - Texte à reformuler:', text);
            console.log('Reformulation - Contexte:', context);
            console.log('Reformulation - Ton sélectionné:', tone);
            console.log('Reformulation - Format:', format);
            console.log('Reformulation - Longueur:', length);

            if (!tone) {
                showAlert("Veuillez sélectionner un ton", "warning", 3000);
                return;
            }

            setLoading(reformulateBtn, true, "Reformuler");
            outputText.value = "Reformulation en cours...";

            try {
                const useEmojis = document.getElementById('useEmojis').checked;
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
                        length: length,
                        use_emojis: useEmojis
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    try {
                        const errorData = JSON.parse(errorText);
                        throw new Error(errorData.error || 'Une erreur est survenue');
                    } catch (e) {
                        throw new Error('Erreur de communication avec le serveur');
                    }
                }

                const data = await response.json();
                outputText.value = data.text;
                updateTextStats(data.text, 'outputCharCount', 'outputWordCount', 'outputParaCount');
                showAlert("Reformulation terminée avec succès!", "success", 3000);
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
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || 'Status check failed');
                } catch (e) {
                    if (response.status === 404) {
                        return true; // Consider non-Ollama providers as valid
                    }
                    throw new Error('Service indisponible');
                }
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
            // Don't block the UI for status check errors
            return true;
        }
    }

    function updateUIForStatus(status) {
        if (status.provider === 'ollama' && status.error) {
            console.log(`État Ollama: ${status.error}`);
        }
    }

    // Initialize status check
    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

});

document.addEventListener('DOMContentLoaded', function() {
    // Gestion des boutons de langue
    const languageButtons = document.querySelectorAll('#languageButtons button');

    languageButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Retirer la classe active des autres boutons
            languageButtons.forEach(btn => btn.classList.remove('active'));

            // Ajouter la classe active au bouton sélectionné
            this.classList.add('active');

            // Récupérer la langue sélectionnée
            const selectedLanguage = this.getAttribute('data-lang');
            console.log('Langue cible:', selectedLanguage);

            // Sauvegarde dans localStorage si nécessaire
            localStorage.setItem('selectedLanguage', selectedLanguage);
        });
    });

    // Restaurer la sélection à partir du localStorage
    const savedLanguage = localStorage.getItem('selectedLanguage');
    if (savedLanguage) {
        languageButtons.forEach(button => {
            if (button.getAttribute('data-lang') === savedLanguage) {
                button.classList.add('active');
            }
        });
    }
});

function showNotification(message, isError = false) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '10px';
    notification.style.right = '10px';
    notification.style.backgroundColor = isError ? '#f44336' : '#4CAF50';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0px 2px 5px rgba(0, 0, 0, 0.3)';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Gestion des événements de collage
document.getElementById('pasteInputText').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('inputText').value = text;
        showNotification('Texte collé avec succès !');
    } catch (err) {
        showNotification('Impossible de coller le texte. Vérifiez les permissions du navigateur.', true);
    }
});

document.getElementById('pasteTranslationText').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('translationInput').value = text;
        showNotification('Texte collé avec succès !');
    } catch (err) {
        showNotification('Impossible de coller le texte. Vérifiez les permissions du navigateur.', true);
    }
});

document.getElementById('pasteCorrectionText').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('correctionInput').value = text;
        showNotification('Texte collé avec succès !');
    } catch (err) {
        showNotification('Impossible de coller le texte. Vérifiez les permissions du navigateur.', true);
    }
});

document.getElementById('pasteEmailContent').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('emailContent').value = text;
        showNotification('Texte collé avec succès !');
    } catch (err) {
        showNotification('Impossible de coller le texte. Vérifiez les permissions du navigateur.', true);
    }
});

document.getElementById('pasteContextText').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('contextText').value = text;
        showNotification('Texte collé avec succès !');
    } catch (err) {
        showNotification('Impossible de coller le texte. Vérifiez les permissions du navigateur.', true);
    }
});

document.getElementById('pasteEmailType').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('emailType').value = text;
        showAlert('Texte collé avec succès !', 'success', 3000);
    } catch (err) {
        showAlert('Impossible de coller le texte. Vérifiez les permissions du navigateur.', 'danger', 3000);
    }
});
document.getElementById('pasteEmailSender').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('emailSender').value = text;
        showAlert('Texte collé avec succès !', 'success', 3000);
    } catch (err) {
        showAlert('Impossible de coller le texte. Vérifiez les permissions du navigateur.', 'danger', 3000);
    }
});

// Gestion des événements de copie
document.getElementById('copyCorrectionOutput').addEventListener('click', () => {
    const correctionOutput = document.getElementById('correctionOutput');
    correctionOutput.select();
    navigator.clipboard.writeText(correctionOutput.value)
        .then(() => {
            showNotification('Texte copié dans le presse-papier !');
        })
        .catch(() => {
            showNotification('Impossible de copier le texte. Vérifiez les permissions du navigateur.', true);
        });
});

document.getElementById('copyTranslationOutput').addEventListener('click', () => {
    const translationOutput = document.getElementById('translationOutput');
    translationOutput.select();
    navigator.clipboard.writeText(translationOutput.value)
        .then(() => {
            showNotification('Texte copié dans le presse-papier !');
        })
        .catch(() => {
            showNotification('Impossible de copier le texte. Vérifiez les permissions du navigateur.', true);
        });
});

document.getElementById('copyOutputText').addEventListener('click', () => {
    const outputText = document.getElementById('outputText');
    outputText.select();
    navigator.clipboard.writeText(outputText.value)
        .then(() => {
            showNotification('Texte copié dans le presse-papier !');
        })
        .catch(() => {
            showNotification('Impossible de copier le texte. Vérifiez les permissions du navigateur.', true);
        });
});

document.getElementById('copyEmailOutput').addEventListener('click', () => {
    const emailOutput = document.getElementById('emailOutput');
    emailOutput.select();
    navigator.clipboard.writeText(emailOutput.value)
        .then(() => {
            showNotification('Texte copié dans le presse-papier !');
        })
        .catch(() => {
            showNotification('Impossible de copier le texte. Vérifiez les permissions du navigateur.', true);
        });
});


document.getElementById('copySubject').addEventListener('click', () => {
    const emailSubject = document.getElementById('emailSubject');
    navigator.clipboard.writeText(emailSubject.value)
        .then(() => {
            showNotification('Texte copié dans le presse-papier !');
        })
        .catch(() => {
            showNotification('Impossible de copier l\'objet. Vérifiez les permissions du navigateur.', true);
        });
});

