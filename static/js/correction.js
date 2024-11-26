document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const correctionInput = document.getElementById('correctionInput');
    const correctionOutput = document.getElementById('correctionOutput');
    const detectAndCorrectBtn = document.getElementById('detectAndCorrectBtn');
    const copyCorrectionBtn = document.getElementById('copyCorrectionBtn');
    const clearCorrectionBtn = document.getElementById('clearCorrectionBtn');
    const detectedLanguage = document.getElementById('detectedLanguage');

    if (!correctionInput || !correctionOutput || !detectAndCorrectBtn) return;

    function updateTextStats(text, charCountId, wordCountId, paraCountId) {
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);

        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (paraCount) paraCount.textContent = text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }

    correctionInput.addEventListener('input', function() {
        updateTextStats(this.value, 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
    });

    correctionOutput.addEventListener('input', function() {
        updateTextStats(this.value, 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
    });

    detectAndCorrectBtn.addEventListener('click', async function() {
        const text = correctionInput.value.trim();
        if (!text) return;

        detectAndCorrectBtn.disabled = true;
        detectAndCorrectBtn.textContent = 'En cours...';
        correctionOutput.value = "Correction en cours...";
        
        try {
            const response = await fetch('/api/correct', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();
            if (data.error) {
                correctionOutput.value = `Erreur: ${data.error}`;
                if (detectedLanguage) {
                    detectedLanguage.textContent = "Erreur de détection";
                }
            } else {
                correctionOutput.value = data.corrected_text;
                if (detectedLanguage) {
                    detectedLanguage.textContent = `Langue détectée: ${data.detected_language}`;
                }
                updateTextStats(data.corrected_text, 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
            }
        } catch (error) {
            correctionOutput.value = "Erreur de connexion. Veuillez réessayer.";
            if (detectedLanguage) {
                detectedLanguage.textContent = "Erreur de détection";
            }
        } finally {
            detectAndCorrectBtn.disabled = false;
            detectAndCorrectBtn.textContent = 'Détecter et Corriger';
        }
    });

    if (copyCorrectionBtn) {
        copyCorrectionBtn.addEventListener('click', async function() {
            const text = correctionOutput.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyCorrectionBtn.textContent;
                copyCorrectionBtn.textContent = 'Copié!';
                setTimeout(() => {
                    copyCorrectionBtn.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    }

    if (clearCorrectionBtn) {
        clearCorrectionBtn.addEventListener('click', function() {
            correctionInput.value = '';
            correctionOutput.value = '';
            if (detectedLanguage) {
                detectedLanguage.textContent = '';
            }
            updateTextStats('', 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
            updateTextStats('', 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
        });
    }
});
