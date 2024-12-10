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

    // Setup text areas statistics tracking
    const textAreas = {
        'contextText': ['contextCharCount', 'contextWordCount', 'contextParaCount'],
        'inputText': ['inputCharCount', 'inputWordCount', 'inputParaCount'],
        'outputText': ['outputCharCount', 'outputWordCount', 'outputParaCount'],
        'emailContent': ['emailContentCharCount', 'emailContentWordCount', 'emailContentParaCount']
    };

    Object.entries(textAreas).forEach(([textAreaId, countIds]) => {
        const textArea = document.getElementById(textAreaId);
        if (textArea) {
            function updateStats() {
                const text = textArea.value;
                document.getElementById(countIds[0])?.textContent = text.length;
                document.getElementById(countIds[1])?.textContent = countWords(text);
                document.getElementById(countIds[2])?.textContent = countParagraphs(text);
            }
            
            textArea.addEventListener('input', updateStats);
            updateStats(); // Initial update
        }
    });

    // Select management functions
    function setupSelect(selectId, addBtnId, removeBtnId) {
        const select = document.getElementById(selectId);
        const addBtn = document.getElementById(addBtnId);
        const removeBtn = document.getElementById(removeBtnId);
        
        if (!select || !addBtn || !removeBtn) return;

        // Load saved options from localStorage
        const savedOptions = JSON.parse(localStorage.getItem(`${selectId}Options`) || '[]');
        const savedSelections = JSON.parse(localStorage.getItem(`${selectId}Selections`) || '[]');
        
        if (savedOptions.length > 0) {
            select.innerHTML = savedOptions.map(option => 
                `<option value="${option}" ${savedSelections.includes(option) ? 'selected' : ''}>${option}</option>`
            ).join('');
        }

        // Add new option
        addBtn.addEventListener('click', () => {
            const value = prompt('Entrez une nouvelle option :');
            if (value && value.trim()) {
                const option = document.createElement('option');
                option.value = value.trim();
                option.textContent = value.trim();
                select.appendChild(option);
                saveSelectState(select);
            }
        });

        // Remove selected option(s)
        removeBtn.addEventListener('click', () => {
            Array.from(select.selectedOptions).forEach(option => option.remove());
            saveSelectState(select);
        });

        // Save state when selection changes
        select.addEventListener('change', () => {
            saveSelectState(select);
        });
    }

    function saveSelectState(select) {
        const options = Array.from(select.options).map(option => option.value);
        const selections = Array.from(select.selectedOptions).map(option => option.value);
        
        localStorage.setItem(`${select.id}Options`, JSON.stringify(options));
        localStorage.setItem(`${select.id}Selections`, JSON.stringify(selections));
    }

    // Setup all selects
    setupSelect('toneGroup', 'addTone', 'removeTone');
    setupSelect('formatGroup', 'addFormat', 'removeFormat');
    setupSelect('lengthGroup', 'addLength', 'removeLength');
    setupSelect('emailToneGroup', 'addEmailTone', 'removeEmailTone');

    function getSelectedValues(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return [];
        
        return Array.from(select.selectedOptions).map(option => option.value);
    }

    // Reformulate functionality
    const reformulateBtn = document.getElementById('reformulateBtn');
    if (reformulateBtn) {
        reformulateBtn.addEventListener('click', async function() {
            const inputText = document.getElementById('inputText')?.value.trim();
            const contextText = document.getElementById('contextText')?.value.trim();
            const outputText = document.getElementById('outputText');
            
            if (!inputText) {
                alert("Veuillez entrer un texte à reformuler.");
                return;
            }

            const tones = getSelectedValues('toneGroup');
            const format = getSelectedValues('formatGroup')[0];
            const length = getSelectedValues('lengthGroup')[0];

            reformulateBtn.disabled = true;
            reformulateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>En cours...';
            if (outputText) outputText.value = "Reformulation en cours...";

            try {
                const response = await fetch('/api/reformulate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        context: contextText,
                        text: inputText,
                        tones: tones,
                        format: format,
                        length: length
                    })
                });

                const data = await response.json();
                if (response.ok && outputText) {
                    outputText.value = data.text;
                    const stats = document.getElementById('outputStats');
                    if (stats) {
                        stats.textContent = `${data.text.length} caractères, ${countWords(data.text)} mots`;
                    }
                } else if (outputText) {
                    outputText.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                if (outputText) outputText.value = "Erreur de connexion. Veuillez réessayer.";
            } finally {
                reformulateBtn.disabled = false;
                reformulateBtn.textContent = "Reformuler";
            }
        });
    }

    // Email generation functionality
    const generateEmailBtn = document.getElementById('generateEmail');
    if (generateEmailBtn) {
        generateEmailBtn.addEventListener('click', async function() {
            const emailType = document.getElementById('emailType')?.value.trim();
            const emailContent = document.getElementById('emailContent')?.value.trim();
            const emailSender = document.getElementById('emailSender')?.value.trim();
            const emailOutput = document.getElementById('emailOutput');
            const emailSubject = document.getElementById('emailSubject');
            
            if (!emailType || !emailContent) {
                alert("Veuillez remplir tous les champs requis.");
                return;
            }

            const tones = getSelectedValues('emailToneGroup');

            generateEmailBtn.disabled = true;
            generateEmailBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>En cours...';
            if (emailOutput) emailOutput.value = "Génération de l'email en cours...";
            if (emailSubject) emailSubject.value = "";

            try {
                const response = await fetch('/api/generate-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: emailType,
                        content: emailContent,
                        sender: emailSender,
                        tones: tones
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    // Enhanced email parsing
                    const lines = data.text.split('\n');
                    const subjectLine = lines.find(line => 
                        line.toLowerCase().startsWith('objet:') || 
                        line.toLowerCase().startsWith('object:') ||
                        line.toLowerCase().startsWith('sujet:')
                    );
                    
                    if (subjectLine && emailSubject) {
                        const subjectText = subjectLine.substring(subjectLine.indexOf(':') + 1).trim();
                        emailSubject.value = subjectText;
                        
                        if (emailOutput) {
                            const bodyLines = lines
                                .filter(line => !line.toLowerCase().match(/^(objet|object|sujet):/))
                                .join('\n')
                                .trim()
                                .replace(/\n{3,}/g, '\n\n');
                            emailOutput.value = bodyLines;
                        }
                    } else {
                        if (emailSubject) emailSubject.value = "";
                        if (emailOutput) emailOutput.value = data.text;
                    }
                } else {
                    if (emailOutput) emailOutput.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                if (emailOutput) emailOutput.value = "Erreur de connexion. Veuillez réessayer.";
            } finally {
                generateEmailBtn.disabled = false;
                generateEmailBtn.textContent = "Générer l'email";
            }
        });
    }

    // Copy functionality
    document.querySelectorAll('[id^="copy"]').forEach(button => {
        button.addEventListener('click', async function() {
            const targetId = this.id.replace('copy', '').toLowerCase();
            const targetElement = document.getElementById(targetId);
            
            if (!targetElement || !targetElement.value) return;

            try {
                await navigator.clipboard.writeText(targetElement.value);
                const originalText = this.textContent;
                this.innerHTML = '<i class="bi bi-check2"></i> Copié!';
                setTimeout(() => {
                    this.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    });

    // Clear functionality
    document.querySelectorAll('[id^="clear"]').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.id.replace('clear', '').toLowerCase();
            const elements = document.querySelectorAll(`#${targetId}Type, #${targetId}Content, #${targetId}Output, #${targetId}Subject`);
            
            elements.forEach(element => {
                if (element) {
                    element.value = '';
                    if (element.id.includes('Content')) {
                        const countIds = textAreas[element.id];
                        if (countIds) {
                            countIds.forEach(id => {
                                const countElement = document.getElementById(id);
                                if (countElement) countElement.textContent = '0';
                            });
                        }
                    }
                }
            });
        });
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

    // Load saved tags from localStorage
    function loadSavedTags() {
        const groups = ['toneGroup', 'formatGroup', 'lengthGroup', 'emailToneGroup'];
        groups.forEach(groupId => {
            const container = document.getElementById(groupId);
            if (!container) return;

            try {
                const savedTags = JSON.parse(localStorage.getItem(`${groupId}Tags`) || '[]');
                
                if (savedTags.length > 0) {
                    container.innerHTML = savedTags.map(tag => `
                        <span class="tag ${tag.isActive ? 'active' : ''}" data-value="${tag.value}">
                            ${tag.value} <i class="bi bi-x tag-remove"></i>
                        </span>
                    `).join('');
                } else {
                    // Default tags if none are saved
                    const defaultTags = {
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
                            { value: 'Cordial', isActive: false }
                        ]
                    };

                    if (defaultTags[groupId]) {
                        container.innerHTML = defaultTags[groupId].map(tag => `
                            <span class="tag ${tag.isActive ? 'active' : ''}" data-value="${tag.value}">
                                ${tag.value} <i class="bi bi-x tag-remove"></i>
                            </span>
                        `).join('');
                        // Save default tags
                        localStorage.setItem(`${groupId}Tags`, JSON.stringify(defaultTags[groupId]));
                    }
                }
            } catch (error) {
                console.error(`Error loading tags for ${groupId}:`, error);
            }
        });
    }

    // Save tags to localStorage
    function saveTags(groupId) {
        const container = document.getElementById(groupId);
        if (!container) return;

        // Save all tags and their values
        const tags = Array.from(container.querySelectorAll('.tag')).map(tag => ({
            value: tag.dataset.value,
            isActive: tag.classList.contains('active')
        }));
        
        localStorage.setItem(`${groupId}Tags`, JSON.stringify(tags));
        
        // Trigger a custom event to notify any listeners
        const event = new CustomEvent('tagsUpdated', {
            detail: { groupId, tags }
        });
        document.dispatchEvent(event);
    }

    function setupTagGroup(groupId) {
        const group = document.getElementById(groupId);
        if (!group) return;

        function handleTagClick(tag, isRemoveClick = false) {
            if (isRemoveClick) {
                tag.classList.add('removing');
                setTimeout(() => {
                    tag.remove();
                    saveTags(groupId);
                }, 150);
                return;
            }

            if (groupId === 'toneGroup' || groupId === 'emailToneGroup') {
                // Multiple selection for tone groups
                tag.classList.toggle('active');
            } else {
                // Single selection for other groups
                group.querySelectorAll('.tag').forEach(t => {
                    if (t !== tag) t.classList.remove('active');
                });
                tag.classList.add('active');
            }
            saveTags(groupId);
        }

        // Handle tag clicks
        group.addEventListener('click', function(e) {
            const removeIcon = e.target.closest('.tag-remove');
            const tag = e.target.closest('.tag');
            
            if (removeIcon) {
                handleTagClick(tag, true);
            } else if (tag) {
                handleTagClick(tag);
            }
        });

        // Handle adding new tags
        const addButton = document.querySelector(`[data-target="${groupId}"]`);
        if (addButton) {
            addButton.addEventListener('click', function() {
                const value = prompt('Entrez une nouvelle valeur :');
                if (value && value.trim()) {
                    const newTag = document.createElement('span');
                    newTag.className = 'tag';
                    newTag.dataset.value = value.trim();
                    newTag.innerHTML = `${value.trim()} <i class="bi bi-x tag-remove"></i>`;
                    group.appendChild(newTag);
                    
                    // Trigger animation
                    requestAnimationFrame(() => {
                        newTag.classList.add('tag-appear');
                    });
                    
                    saveTags(groupId);
                }
            });
        }
    }

    // Initialize tag groups
    document.addEventListener('DOMContentLoaded', function() {
        loadSavedTags();
        setupTagGroup('toneGroup');
        setupTagGroup('formatGroup');
        setupTagGroup('lengthGroup');
        setupTagGroup('emailToneGroup');
    });


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
        if (status.provider === 'ollama' && status.error) {
            console.log(`État Ollama: ${status.error}`);
        }
    }

    // Initialize status check
    checkOllamaStatus();
    setInterval(checkOllamaStatus, 30000);

});