document.addEventListener('DOMContentLoaded', function() {
    // Copy history entry
    document.querySelectorAll('.copy-history').forEach(button => {
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

    // Reuse history entry
    document.querySelectorAll('.reuse-history').forEach(button => {
        button.addEventListener('click', () => {
            // Get data from button attributes
            const context = button.dataset.context || '';
            const text = button.dataset.text || '';
            const tone = button.dataset.tone || 'Professionnel';
            const format = button.dataset.format || 'Paragraphe';
            const length = button.dataset.length || 'Moyen';

            // Switch to reformulation tab
            const reformulationTab = document.getElementById('reformulation-tab');
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
                    // Clear the history accordion
                    const historyAccordion = document.getElementById('historyAccordion');
                    if (historyAccordion) {
                        historyAccordion.innerHTML = '';
                    }
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
});
