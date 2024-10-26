document.addEventListener('DOMContentLoaded', function() {
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const targetLanguage = document.getElementById('targetLanguage');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');

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
                    language: targetLanguage.value
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
});
