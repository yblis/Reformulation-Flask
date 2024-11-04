document.addEventListener('DOMContentLoaded', function() {
    // Text statistics function
    window.updateTextStats = function(text, charCountId, wordCountId, paraCountId) {
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);
        
        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (paraCount) paraCount.textContent = text.trim().split(/\n\s*\n/).filter(para => para.length > 0).length;
    }

    // History handling
    const historyAccordion = document.getElementById('historyAccordion');
    const resetHistory = document.getElementById('resetHistory');

    if (historyAccordion) {
        // Copy button functionality
        historyAccordion.addEventListener('click', async function(e) {
            if (e.target.classList.contains('copy-history') || e.target.closest('.copy-history')) {
                const button = e.target.classList.contains('copy-history') ? e.target : e.target.closest('.copy-history');
                const text = button.dataset.text;
                
                try {
                    await navigator.clipboard.writeText(text);
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="bi bi-check"></i> Copié!';
                    setTimeout(() => {
                        button.innerHTML = originalText;
                    }, 2000);
                } catch (err) {
                    console.error('Error copying text:', err);
                }
            }
        });

        // Reuse button functionality
        historyAccordion.addEventListener('click', function(e) {
            if (e.target.classList.contains('reuse-history') || e.target.closest('.reuse-history')) {
                const button = e.target.classList.contains('reuse-history') ? e.target : e.target.closest('.reuse-history');
                const type = button.dataset.type;
                
                // Switch to the appropriate tab
                const tabToShow = document.querySelector(`#${type}-tab`);
                if (tabToShow) {
                    const tab = new bootstrap.Tab(tabToShow);
                    tab.show();
                }

                // Fill in the appropriate form based on type
                switch (type) {
                    case 'reformulation':
                        const contextText = document.getElementById('contextText');
                        const inputText = document.getElementById('inputText');
                        
                        if (contextText) contextText.value = button.dataset.context || '';
                        if (inputText) inputText.value = button.dataset.text || '';
                        
                        // Set tone, format, and length
                        const toneButtons = document.querySelectorAll('#toneGroup .btn');
                        const formatButtons = document.querySelectorAll('#formatGroup .btn');
                        const lengthButtons = document.querySelectorAll('#lengthGroup .btn');
                        
                        setButtonsByValue(toneButtons, button.dataset.tone);
                        setButtonsByValue(formatButtons, button.dataset.format);
                        setButtonsByValue(lengthButtons, button.dataset.length);
                        
                        // Update statistics
                        if (contextText) updateTextStats(contextText.value, 'contextCharCount', 'contextWordCount', 'contextParaCount');
                        if (inputText) updateTextStats(inputText.value, 'inputCharCount', 'inputWordCount', 'inputParaCount');
                        break;
                        
                    case 'translation':
                        const translationInput = document.getElementById('translationInput');
                        if (translationInput) {
                            translationInput.value = button.dataset.text || '';
                            updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
                        }
                        
                        // Set target language
                        const langButtons = document.querySelectorAll('#targetLanguageGroup .btn');
                        setButtonsByValue(langButtons, button.dataset.targetLanguage);
                        break;
                        
                    case 'email':
                        const emailType = document.getElementById('emailType');
                        const emailContent = document.getElementById('emailContent');
                        const emailSender = document.getElementById('emailSender');
                        
                        if (emailType) emailType.value = button.dataset.emailType || '';
                        if (emailContent) {
                            emailContent.value = button.dataset.text || '';
                            updateTextStats(emailContent.value, 'emailContentCharCount', 'emailContentWordCount', 'emailContentParaCount');
                        }
                        if (emailSender) emailSender.value = button.dataset.senderName || '';
                        break;
                }
            }
        });
    }

    // Reset history functionality
    if (resetHistory) {
        resetHistory.addEventListener('click', async function() {
            if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ? Cette action est irréversible.')) {
                try {
                    const response = await fetch('/api/history/reset', { method: 'POST' });
                    if (response.ok) {
                        // Clear the history accordion
                        if (historyAccordion) {
                            historyAccordion.innerHTML = '';
                        }
                        // Show success message
                        showAlert('Historique effacé avec succès', 'success');
                        // Reload the page to refresh history
                        window.location.reload();
                    } else {
                        throw new Error('Failed to reset history');
                    }
                } catch (error) {
                    console.error('Error resetting history:', error);
                    showAlert('Erreur lors de la suppression de l\'historique', 'danger');
                }
            }
        });
    }

    // Helper function to set buttons by value
    function setButtonsByValue(buttons, value) {
        buttons.forEach(button => {
            if (button.dataset.value === value) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // Helper function to show alerts
    function showAlert(message, type = 'danger', duration = 5000) {
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

    // Add input event listeners for text statistics
    const textAreas = {
        'contextText': ['contextCharCount', 'contextWordCount', 'contextParaCount'],
        'inputText': ['inputCharCount', 'inputWordCount', 'inputParaCount'],
        'translationInput': ['translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount'],
        'translationOutput': ['translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount'],
        'emailContent': ['emailContentCharCount', 'emailContentWordCount', 'emailContentParaCount']
    };

    Object.entries(textAreas).forEach(([id, counters]) => {
        const textarea = document.getElementById(id);
        if (textarea) {
            textarea.addEventListener('input', () => {
                updateTextStats(textarea.value, ...counters);
            });
            // Initial count
            updateTextStats(textarea.value, ...counters);
        }
    });
});
