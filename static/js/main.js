document.addEventListener('DOMContentLoaded', function() {
    // Existing code remains the same until history handling...

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
                        if (contextText) contextText.value = button.dataset.context || '';
                        if (inputText) inputText.value = button.dataset.text || '';
                        
                        // Set tone, format, and length
                        setActiveButton('toneGroup', button.dataset.tone);
                        setActiveButton('formatGroup', button.dataset.format);
                        setActiveButton('lengthGroup', button.dataset.length);
                        
                        // Update statistics
                        updateTextStats(contextText.value, 'contextCharCount', 'contextWordCount', 'contextParaCount');
                        updateTextStats(inputText.value, 'inputCharCount', 'inputWordCount', 'inputParaCount');
                        break;
                        
                    case 'translation':
                        if (translationInput) {
                            translationInput.value = button.dataset.text || '';
                            updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
                        }
                        setActiveButton('targetLanguageGroup', button.dataset.targetLanguage);
                        break;
                        
                    case 'email':
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

    // Helper function to set active button in a button group
    function setActiveButton(groupId, value) {
        const group = document.getElementById(groupId);
        if (!group) return;
        
        const buttons = group.querySelectorAll('.btn');
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
});
