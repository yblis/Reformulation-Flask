document.addEventListener('DOMContentLoaded', function() {
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');
    const clearTranslation = document.getElementById('clearTranslation');

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
                // Update statistics
                updateTextStats(data.text, 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');

                // Save to history
                try {
                    await fetch('/api/history', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            type: 'translation',
                            original_text: text,
                            reformulated_text: data.text,
                            target_language: getSelectedLanguage()
                        })
                    });
                } catch (error) {
                    console.error('Error saving to history:', error);
                }
            }
        } catch (error) {
            translationOutput.value = `Erreur: ${error.message}`;
        } finally {
            translateText.disabled = false;
            translateText.textContent = 'Traduire';
        }
    });

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

    if (clearTranslation) {
        clearTranslation.addEventListener('click', () => {
            translationInput.value = '';
            translationOutput.value = '';
            updateTextStats('', 'translationInputCharCount', 'translationInputWordCount', 'translationInputParaCount');
            updateTextStats('', 'translationOutputCharCount', 'translationOutputWordCount', 'translationOutputParaCount');
        });
    }
});
