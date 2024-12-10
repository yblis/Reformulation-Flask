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
            }
        } catch (error) {
            translationOutput.value = `Erreur: ${error.message}`;
        } finally {
            translateText.disabled = false;
            translateText.textContent = 'Traduire';
        }
    });

    copyTranslation.addEventListener('click', function() {
        translationOutput.select();
        document.execCommand('copy');
    });

    if (clearTranslation) {
        clearTranslation.addEventListener('click', () => {
            translationInput.value = '';
            translationOutput.value = '';
        });
    }
});
    // Handle reuse translation button
    document.querySelectorAll('.reuse-translation').forEach(button => {
        button.addEventListener('click', function() {
            const text = this.dataset.text;
            const targetLanguage = this.dataset.targetLanguage;
            
            // Fill the input text
            const translationInput = document.getElementById('translationInput');
            if (translationInput) {
                translationInput.value = text || '';
                updateTextStats(translationInput.value, 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            }
            
            // Set target language if it exists
            const languageSelect = document.getElementById('targetLanguage');
            if (languageSelect && targetLanguage) {
                // Find and select the option that matches the target language
                const option = Array.from(languageSelect.options).find(opt => opt.value === targetLanguage);
                if (option) {
                    languageSelect.value = targetLanguage;
                }
            }
            
            // Switch to translation tab and scroll to it
            const translationTab = document.querySelector('button[data-bs-target="#translation"]');
            if (translationTab) {
                const translationTabInstance = new bootstrap.Tab(translationTab);
                translationTabInstance.show();
                
                setTimeout(() => {
                    document.getElementById('translation').scrollIntoView({ behavior: 'smooth' });
                    if (translationInput) {
                        translationInput.focus();
                    }
                }, 100);
            }
        });
    });
