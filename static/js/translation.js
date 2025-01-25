document.addEventListener('DOMContentLoaded', function() {
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');
    const clearTranslation = document.getElementById('clearTranslation');

    // Get selected language from select input
    function getSelectedLanguage() {
        const select = document.getElementById('targetLanguage');
        return select ? select.value : 'Anglais';
    }

    // Initialize text statistics for input
    if (translationInput) {
        translationInput.addEventListener('input', () => {
            updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
        });
    }

    // Handle translation request
    if (translateText) {
        translateText.addEventListener('click', async function() {
            const text = translationInput.value.trim();
            if (!text) return;

            translateText.disabled = true;
            translateText.textContent = 'En cours...';

            try {
                const response = await fetch('/api/translate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        language: getSelectedLanguage()
                    })
                });

                const data = await response.json();
                if (data.error) {
                    translationOutput.value = `Erreur: ${data.error}`;
                } else {
                    translationOutput.value = data.text;
                    updateTextStats(translationOutput.value, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
                }
            } catch (error) {
                translationOutput.value = `Erreur: ${error.message}`;
            } finally {
                translateText.disabled = false;
                translateText.textContent = 'Traduire';
            }
        });
    }

    // Copy translation
    if (copyTranslation) {
        copyTranslation.addEventListener('click', async () => {
            const text = translationOutput.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyTranslation.textContent;
                copyTranslation.textContent = 'Copié!';
                setTimeout(() => {
                    copyTranslation.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    }

    // Clear all fields
    if (clearTranslation) {
        clearTranslation.addEventListener('click', () => {
            if (translationInput) {
                translationInput.value = '';
                updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }
            if (translationOutput) {
                translationOutput.value = '';
                updateTextStats(translationOutput.value, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
            }
        });
    }

    // Handle reuse translation button
    document.querySelectorAll('.reuse-translation').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const translationTab = document.querySelector('#translation-tab');
            if (translationTab) {
                translationTab.click();
                
                // Wait for the tab transition
                setTimeout(() => {
                    const translationInput = document.getElementById('translationInput');
                    if (translationInput) {
                        translationInput.value = this.dataset.text || '';
                        updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
                    }
                    
                    // Set target language if it exists
                    const languageSelect = document.getElementById('targetLanguage');
                    if (languageSelect && this.dataset.targetLanguage) {
                        const option = Array.from(languageSelect.options).find(opt => opt.value === this.dataset.targetLanguage);
                        if (option) {
                            languageSelect.value = this.dataset.targetLanguage;
                        }
                    }
                    
                    // Reset translation output
                    const translationOutput = document.getElementById('translationOutput');
                    if (translationOutput) {
                        translationOutput.value = '';
                        updateTextStats(translationOutput.value, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
                    }
                }, 150);
            }
        });
    });
});
