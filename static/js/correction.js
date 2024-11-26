document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const correctionInput = document.getElementById('correctionInput');
    const correctionOutput = document.getElementById('correctionOutput');
    const correctText = document.getElementById('correctText');
    const copyCorrectionBtn = document.getElementById('copyCorrectionBtn');
    const clearCorrectionBtn = document.getElementById('clearCorrectionBtn');

    // Setup correction options button group
    function setupCorrectionOptions() {
        const group = document.getElementById('correctionOptions');
        if (!group) return;
        
        const buttons = group.querySelectorAll('.btn');
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    setupCorrectionOptions();

    // Get selected correction options
    function getSelectedOptions() {
        const activeButtons = document.querySelectorAll('#correctionOptions .btn.active');
        return Array.from(activeButtons).map(btn => btn.dataset.value);
    }

    // Text statistics updates
    function updateTextStats(text, charCountId, wordCountId, paraCountId) {
        const charCount = document.getElementById(charCountId);
        const wordCount = document.getElementById(wordCountId);
        const paraCount = document.getElementById(paraCountId);

        if (charCount) charCount.textContent = text.length;
        if (wordCount) wordCount.textContent = text.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (paraCount) paraCount.textContent = text.trim().split(/\n\s*\n/).filter(para => para.trim().length > 0).length;
    }

    // Setup input event listeners for statistics
    if (correctionInput) {
        correctionInput.addEventListener('input', () => {
            updateTextStats(
                correctionInput.value,
                'correctionInputCharCount',
                'correctionInputWordCount',
                'correctionInputParaCount'
            );
        });
    }

    if (correctionOutput) {
        correctionOutput.addEventListener('input', () => {
            updateTextStats(
                correctionOutput.value,
                'correctionOutputCharCount',
                'correctionOutputWordCount',
                'correctionOutputParaCount'
            );
        });
    }

    // Correction functionality
    if (correctText) {
        correctText.addEventListener('click', async function() {
            const text = correctionInput.value.trim();
            if (!text) return;

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
                        options: getSelectedOptions()
                    })
                });

                const data = await response.json();
                if (data.error) {
                    correctionOutput.value = `Erreur: ${data.error}`;
                } else {
                    correctionOutput.value = data.text;
                    updateTextStats(
                        data.text,
                        'correctionOutputCharCount',
                        'correctionOutputWordCount',
                        'correctionOutputParaCount'
                    );
                }
            } catch (error) {
                correctionOutput.value = `Erreur: ${error.message}`;
            } finally {
                correctText.disabled = false;
                correctText.textContent = 'Corriger';
            }
        });
    }

    // Copy functionality
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

    // Clear functionality
    if (clearCorrectionBtn) {
        clearCorrectionBtn.addEventListener('click', function() {
            if (correctionInput) {
                correctionInput.value = '';
                updateTextStats('', 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
            }
            if (correctionOutput) {
                correctionOutput.value = '';
                updateTextStats('', 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
            }
        });
    }
});
