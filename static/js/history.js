document.addEventListener('DOMContentLoaded', function() {
    // Copy history entries
    document.querySelectorAll('.copy-history, .copy-translation-history').forEach(button => {
        button.addEventListener('click', async () => {
            const text = button.dataset.text;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = button.textContent;
                button.textContent = '✓ Copié!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Error copying text:', err);
            }
        });
    });

    // Copy email history entries
    document.querySelectorAll('.copy-email-history').forEach(button => {
        button.addEventListener('click', async () => {
            const subject = button.dataset.subject;
            const email = button.dataset.email;
            const fullText = `Objet: ${subject}\n\n${email}`;

            try {
                await navigator.clipboard.writeText(fullText);
                const originalText = button.textContent;
                button.textContent = '✓ Copié!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Error copying email:', err);
            }
        });
    });

    // Reuse reformulation history
    document.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', () => {
            // Get data from button attributes
            const context = button.dataset.context || '';
            const text = button.dataset.text || '';
            const tone = button.dataset.tone || 'Professionnel';
            const format = button.dataset.format || 'Paragraphe';
            const length = button.dataset.length || 'Moyen';

            // Switch to reformulation tab
            const reformulationTab = document.querySelector('#reformulation-tab');
            if (reformulationTab) {
                const tab = new bootstrap.Tab(reformulationTab);
                tab.show();
            }

            // Fill the form fields
            const contextText = document.getElementById('contextText');
            const inputText = document.getElementById('inputText');
            
            if (contextText) contextText.value = context;
            if (inputText) inputText.value = text;

            // Update text statistics
            if (contextText) {
                updateTextStats(context, 'contextCharCount', 'contextWordCount', 'contextParaCount');
            }
            if (inputText) {
                updateTextStats(text, 'inputCharCount', 'inputWordCount', 'inputParaCount');
            }

            // Set the options
            const toneButtons = document.querySelectorAll('#toneGroup .btn');
            const formatButtons = document.querySelectorAll('#formatGroup .btn');
            const lengthButtons = document.querySelectorAll('#lengthGroup .btn');

            function setActiveButton(buttons, value) {
                buttons.forEach(btn => {
                    if (btn.dataset.value === value) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }

            setActiveButton(toneButtons, tone);
            setActiveButton(formatButtons, format);
            setActiveButton(lengthButtons, length);
        });
    });

    // Reuse translation history
    document.querySelectorAll('.reuse-translation').forEach(button => {
        button.addEventListener('click', () => {
            const text = button.dataset.text || '';
            const language = button.dataset.language || 'Anglais';

            // Switch to translation tab
            const translationTab = document.querySelector('#translation-tab');
            if (translationTab) {
                const tab = new bootstrap.Tab(translationTab);
                tab.show();
            }

            // Fill the form fields
            const translationInput = document.getElementById('translationInput');
            if (translationInput) {
                translationInput.value = text;
                updateTextStats(text, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }

            // Set target language
            const languageButtons = document.querySelectorAll('#targetLanguageGroup .btn');
            languageButtons.forEach(btn => {
                if (btn.dataset.value === language) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    });

    // Reuse email history
    document.querySelectorAll('.reuse-email').forEach(button => {
        button.addEventListener('click', () => {
            const type = button.dataset.type || '';
            const content = button.dataset.content || '';
            const sender = button.dataset.sender || '';

            // Switch to email tab
            const emailTab = document.querySelector('#email-tab');
            if (emailTab) {
                const tab = new bootstrap.Tab(emailTab);
                tab.show();
            }

            // Fill the form fields
            const emailType = document.getElementById('emailType');
            const emailContent = document.getElementById('emailContent');
            const emailSender = document.getElementById('emailSender');

            if (emailType) emailType.value = type;
            if (emailContent) emailContent.value = content;
            if (emailSender) emailSender.value = sender;
        });
    });

    // Reset history
    const resetHistoryBtn = document.getElementById('resetHistory');
    if (resetHistoryBtn) {
        resetHistoryBtn.addEventListener('click', async () => {
            if (!confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
                return;
            }

            try {
                const response = await fetch('/api/history/reset', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                if (response.ok) {
                    // Clear all history accordions
                    ['reformulationHistoryAccordion', 'translationHistoryAccordion', 'emailHistoryAccordion'].forEach(id => {
                        const accordion = document.getElementById(id);
                        if (accordion) {
                            accordion.innerHTML = '';
                        }
                    });
                    // Show success message
                    showAlert('Historique effacé avec succès', 'success');
                } else {
                    throw new Error(data.error || 'Failed to reset history');
                }
            } catch (error) {
                console.error('Error resetting history:', error);
                showAlert('Erreur lors de la réinitialisation de l\'historique', 'danger');
            }
        });
    }

    // Utility function to show alerts
    function showAlert(message, type = 'success') {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alertDiv, container.firstChild);
        }

        setTimeout(() => {
            alertDiv.remove();
        }, 3000);
    }

    // Function to update text statistics
    function updateTextStats(text, charCountId, wordCountId, paraCountId) {
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);

        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (paraCount) paraCount.textContent = text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }
});
