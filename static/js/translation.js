document.addEventListener('DOMContentLoaded', function() {
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');
    const clearTranslation = document.getElementById('clearTranslation');

    // Update text statistics for both input and output
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

    // Setup the target language button group
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

    setupTagGroup('targetLanguageGroup');

    // Get selected language from button group
    function getSelectedLanguage() {
        const activeButton = document.querySelector('#targetLanguageGroup .btn.active');
        return activeButton ? activeButton.dataset.value : 'Anglais';
    }

    // Handle translation request
    if (translateText) {
        translateText.addEventListener('click', async function() {
            const text = translationInput.value.trim();
            if (!text) return;

            translateText.disabled = true;
            translateText.textContent = 'En cours...';
            translationOutput.value = "Traduction en cours...";

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

    // Copy translated text
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
                updateTextStats(translationInput, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }
            if (translationOutput) {
                translationOutput.value = '';
                updateTextStats(translationOutput, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
            }
        });
    }
});
