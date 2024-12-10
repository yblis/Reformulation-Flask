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

    // Initialize text statistics
    function updateTextStats(element, charCountId, wordCountId, paraCountId) {
        const text = element.value;
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);

        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (paraCount) paraCount.textContent = text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }

    // Setup input statistics tracking
    if (translationInput) {
        translationInput.addEventListener('input', () => {
            updateTextStats(translationInput, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
        });
    }

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
                    updateTextStats(translationOutput, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
                }
            } catch (error) {
                translationOutput.value = `Erreur: ${error.message}`;
            } finally {
                translateText.disabled = false;
                translateText.textContent = 'Traduire';
            }
        });
    }

    if (copyTranslation) {
        copyTranslation.addEventListener('click', async function() {
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

    if (clearTranslation) {
        clearTranslation.addEventListener('click', () => {
            if (translationInput) {
                translationInput.value = '';
                updateTextStats(translationInput, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }
            if (translationOutput) {
                translationOutput.value = '';
                updateTextStats(translationOutput, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
            }
        });
    }

    // Handle reuse translation button
    document.querySelectorAll('.reuse-translation').forEach(button => {
        button.addEventListener('click', function() {
            const text = this.dataset.text;
            const targetLanguage = this.dataset.targetLanguage;
            
            // Fill the input text
            const translationInput = document.getElementById('translationInput');
            if (translationInput) {
                translationInput.value = text || '';
                // Use the element's value property
                updateTextStats(translationInput, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }
            
            // Set target language if it exists
            const languageSelect = document.getElementById('targetLanguage');
            if (languageSelect && targetLanguage) {
                const option = Array.from(languageSelect.options).find(opt => opt.value === targetLanguage);
                if (option) {
                    languageSelect.value = targetLanguage;
                }
            }
            
            // Switch to translation tab and scroll to it
            const translationTab = document.querySelector('button[data-bs-target="#translation"]');
            if (translationTab) {
                const tabInstance = new bootstrap.Tab(translationTab);
                tabInstance.show();
                
                setTimeout(() => {
                    document.getElementById('translation').scrollIntoView({ behavior: 'smooth' });
                    if (translationInput) {
                        translationInput.focus();
                    }
                }, 100);
            }
        });
    });
});
