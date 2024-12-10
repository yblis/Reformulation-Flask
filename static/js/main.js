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
// Gestion de l'historique
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function createHistoryEntry(entry, type) {
    const div = document.createElement('div');
    div.className = 'list-group-item';
    div.dataset.id = entry.id;

    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between align-items-center mb-2';
    
    const timestamp = document.createElement('small');
    timestamp.className = 'text-muted';
    timestamp.textContent = formatDate(entry.id);
    
    const buttonsContainer = document.createElement('div');
    
    const reuseButton = document.createElement('button');
    reuseButton.className = 'btn btn-sm btn-success me-2';
    reuseButton.textContent = 'Réutiliser';
    reuseButton.onclick = () => reuseHistoryEntry(entry, type);
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-sm btn-danger';
    deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
    deleteButton.onclick = () => deleteHistoryEntry(entry.id, type);
    
    buttonsContainer.appendChild(reuseButton);
    buttonsContainer.appendChild(deleteButton);
    header.appendChild(timestamp);
    header.appendChild(buttonsContainer);
    div.appendChild(header);

    const content = document.createElement('div');
    content.className = 'mb-2';
    
    // Contenu spécifique selon le type
    switch(type) {
        case 'reformulation':
            content.innerHTML = `
                <strong>Original:</strong>
                <pre class="mb-2">${entry.original_text || ''}</pre>
                ${entry.context ? `
                <strong>Contexte:</strong>
                <pre class="mb-2">${entry.context}</pre>
                ` : ''}
                <strong>Reformulation:</strong>
                <pre>${entry.reformulated_text || ''}</pre>
                <div class="mt-2">
                    ${entry.tone ? `<span class="badge bg-secondary me-1">${entry.tone}</span>` : ''}
                    ${entry.format ? `<span class="badge bg-secondary me-1">${entry.format}</span>` : ''}
                    ${entry.length ? `<span class="badge bg-secondary">${entry.length}</span>` : ''}
                </div>
            `;
            break;
        case 'email':
            content.innerHTML = `
                <strong>Type:</strong>
                <pre class="mb-2">${entry.email_type || ''}</pre>
                <strong>Contenu:</strong>
                <pre class="mb-2">${entry.content || ''}</pre>
                <strong>Email généré:</strong>
                <pre>${entry.generated_email || ''}</pre>
            `;
            break;
        case 'correction':
            content.innerHTML = `
                <strong>Original:</strong>
                <pre class="mb-2">${entry.original_text || ''}</pre>
                <strong>Correction:</strong>
                <pre>${entry.corrected_text || ''}</pre>
            `;
            break;
        case 'translation':
            content.innerHTML = `
                <strong>Original:</strong>
                <pre class="mb-2">${entry.original_text || ''}</pre>
                <strong>Traduction:</strong>
                <pre>${entry.translated_text || ''}</pre>
                <div class="mt-2">
                    <span class="badge bg-secondary">Langue: ${entry.target_language || ''}</span>
                </div>
            `;
            break;
    }
    
    div.appendChild(content);
    return div;
}

function loadHistory(type) {
    const containerIds = {
        'reformulation': 'reformulationHistoryContainer',
        'email': 'emailHistoryContainer',
        'correction': 'correctionHistoryContainer',
        'translation': 'translationHistoryContainer'
    };
    
    const container = document.getElementById(containerIds[type]);
    if (!container) return;
    
    const history = LocalStorageManager.getHistory(`${type}_history`);
    container.innerHTML = '';
    
    if (history.length === 0) {
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'text-muted text-center p-3';
        emptyMessage.textContent = 'Aucun historique disponible';
        container.appendChild(emptyMessage);
        return;
    }
    
    history.forEach(entry => {
        container.appendChild(createHistoryEntry(entry, type));
    });
}

function deleteHistoryEntry(id, type) {
    if (confirm('Voulez-vous vraiment supprimer cette entrée de l\'historique ?')) {
        LocalStorageManager.removeFromHistory(`${type}_history`, id);
        loadHistory(type);
    }
}

function reuseHistoryEntry(entry, type) {
    switch(type) {
        case 'reformulation':
            document.getElementById('contextText').value = entry.context || '';
            document.getElementById('inputText').value = entry.original_text || '';
            // Mettre à jour les tags
            if (entry.tone) {
                const toneContainer = document.getElementById('toneGroup');
                const toneTag = toneContainer.querySelector(`[data-value="${entry.tone}"]`);
                if (toneTag) toneTag.classList.add('active');
            }
            if (entry.format) {
                const formatContainer = document.getElementById('formatGroup');
                const formatTag = formatContainer.querySelector(`[data-value="${entry.format}"]`);
                if (formatTag) formatTag.classList.add('active');
            }
            if (entry.length) {
                const lengthContainer = document.getElementById('lengthGroup');
                const lengthTag = lengthContainer.querySelector(`[data-value="${entry.length}"]`);
                if (lengthTag) lengthTag.classList.add('active');
            }
            break;
        case 'email':
            document.getElementById('emailType').value = entry.email_type || '';
            document.getElementById('emailContent').value = entry.content || '';
            document.getElementById('emailSender').value = entry.sender || '';
            break;
        case 'correction':
            document.getElementById('correctionInput').value = entry.original_text || '';
            break;
        case 'translation':
            document.getElementById('translationInput').value = entry.original_text || '';
            if (entry.target_language) {
                document.getElementById('targetLanguage').value = entry.target_language;
            }
            break;
    }
    
    // Mettre à jour les statistiques
    updateAllTextStats();
}

// Fonction utilitaire pour mettre à jour toutes les statistiques
function updateAllTextStats() {
    Object.entries(textAreas).forEach(([textAreaId, countIds]) => {
        const textArea = document.getElementById(textAreaId);
        if (textArea) {
            updateTextStats(textArea.value, ...countIds);
        }
    });
}

// Charger l'historique au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    ['reformulation', 'email', 'correction', 'translation'].forEach(type => {
        loadHistory(type);
    });
});
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
                
                // Sauvegarder dans l'historique
                const historyEntry = {
                    original_text: text,
                    context: context,
                    reformulated_text: data.text,
                    tone: tone,
                    format: format,
                    length: length,
                    id: Date.now()
                };
                LocalStorageManager.addToHistory('reformulation_history', historyEntry);
                loadHistory('reformulation');
                
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