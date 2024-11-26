document.addEventListener('DOMContentLoaded', function() {
    const correctionInput = document.getElementById('correctionInput');
    const correctionOutput = document.getElementById('correctionOutput');
    const correctText = document.getElementById('correctText');
    const copyCorrection = document.getElementById('copyCorrection');
    const clearCorrection = document.getElementById('clearCorrection');

    // Initialize text statistics for both input and output
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
    if (correctionInput) {
        correctionInput.addEventListener('input', () => {
            updateTextStats(correctionInput, 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
        });
    }

    // Handle correction request
    if (correctText) {
        correctText.addEventListener('click', async function() {
            const text = correctionInput.value.trim();
            if (!text) return;

            // Get correction options
            const options = {
                grammar: document.getElementById('checkGrammar')?.checked || false,
                spelling: document.getElementById('checkSpelling')?.checked || false,
                style: document.getElementById('checkStyle')?.checked || false,
                punctuation: document.getElementById('checkPunctuation')?.checked || false
            };

            correctText.disabled = true;
            correctText.textContent = 'En cours...';
            correctionOutput.value = "Correction en cours...";

            try {
                const response = await fetch('/api/correct', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        text: text,
                        options: options
                    })
                });

                const data = await response.json();
                if (data.error) {
                    correctionOutput.value = `Erreur: ${data.error}`;
                } else {
                    correctionOutput.value = data.text;
                    updateTextStats(correctionOutput, 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
                }
            } catch (error) {
                correctionOutput.value = `Erreur: ${error.message}`;
            } finally {
                correctText.disabled = false;
                correctText.textContent = 'Corriger';
            }
        });
    }

    // Copy corrected text
    if (copyCorrection) {
        copyCorrection.addEventListener('click', async () => {
            const text = correctionOutput.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyCorrection.textContent;
                copyCorrection.textContent = 'Copié!';
                setTimeout(() => {
                    copyCorrection.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    }

    // Clear all fields
    if (clearCorrection) {
        clearCorrection.addEventListener('click', () => {
            if (correctionInput) {
                correctionInput.value = '';
                updateTextStats(correctionInput, 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
            }
            if (correctionOutput) {
                correctionOutput.value = '';
                updateTextStats(correctionOutput, 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
            }
        });
    }
});
