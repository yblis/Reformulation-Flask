document.addEventListener('DOMContentLoaded', function() {
    const correctionInput = document.getElementById('correctionInput');
    const correctionOutput = document.getElementById('correctionOutput');
    const correctText = document.getElementById('correctText');
    const copyCorrection = document.getElementById('copyCorrection');
    const clearCorrection = document.getElementById('clearCorrection');
    const synonymsContainer = document.createElement('div');
    synonymsContainer.className = 'card mt-3';
    synonymsContainer.style.display = 'none';

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

    // Parse response to separate corrected text and synonyms
    function parseResponse(text) {
        const parts = text.split('===SYNONYMES===');
        if (parts.length === 1) {
            return { text: text.trim(), synonyms: null };
        }

        let correctedText = parts[0].replace('===TEXTE CORRIGÉ===', '').trim();
        const synonymsText = parts[1].trim();
        const synonyms = {};

        synonymsText.split('\n').forEach(line => {
            const [word, synonymsList] = line.split(':').map(s => s.trim());
            if (word && synonymsList) {
                synonyms[word] = synonymsList.split(',').map(s => s.trim());
            }
        });

        return { text: correctedText, synonyms };
    }

    // Display synonyms in the UI
    function displaySynonyms(synonyms) {
        if (!synonyms || Object.keys(synonyms).length === 0) {
            synonymsContainer.style.display = 'none';
            return;
        }

        let synonymsHtml = '<div class="card-body"><h5 class="mb-3">Suggestions de synonymes:</h5><ul class="list-group">';
        for (const [word, synonymsList] of Object.entries(synonyms)) {
            synonymsHtml += `
                <li class="list-group-item">
                    <strong>${word}</strong>: ${synonymsList.join(', ')}
                </li>`;
        }
        synonymsHtml += '</ul></div>';
        
        synonymsContainer.innerHTML = synonymsHtml;
        synonymsContainer.style.display = 'block';
        
        // Insert after correction output
        if (!synonymsContainer.isConnected) {
            correctionOutput.parentNode.insertBefore(synonymsContainer, correctionOutput.nextSibling);
        }
    }

    // Handle correction request
    if (correctText) {
        correctText.addEventListener('click', async function() {
            const text = correctionInput.value.trim();
            if (!text) return;

            // Get correction options
            const syntaxRules = {
                word_order: document.getElementById('wordOrder')?.checked || false,
                subject_verb_agreement: document.getElementById('subjectVerb')?.checked || false,
                verb_tense: document.getElementById('verbTense')?.checked || false,
                gender_number: document.getElementById('genderNumber')?.checked || false,
                relative_pronouns: document.getElementById('relativePronouns')?.checked || false
            };

            const options = {
                syntax: document.getElementById('checkSyntax')?.checked || false,
                syntax_rules: syntaxRules,
                grammar: document.getElementById('checkGrammar')?.checked || false,
                spelling: document.getElementById('checkSpelling')?.checked || false,
                style: document.getElementById('checkStyle')?.checked || false,
                punctuation: document.getElementById('checkPunctuation')?.checked || false,
                synonyms: document.getElementById('checkSynonyms')?.checked || false
            };

            correctText.disabled = true;
            correctText.textContent = 'En cours...';
            correctionOutput.value = "Correction en cours...";
            synonymsContainer.style.display = 'none';

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
                    synonymsContainer.style.display = 'none';
                } else {
                    const { text: correctedText, synonyms } = parseResponse(data.text);
                    correctionOutput.value = correctedText;
                    updateTextStats(correctionOutput, 'correctionOutputCharCount', 'correctionOutputWordCount', 'correctionOutputParaCount');
                    
                    if (options.synonyms) {
                        displaySynonyms(synonyms);
                    } else {
                        synonymsContainer.style.display = 'none';
                    }
                }
            } catch (error) {
                correctionOutput.value = `Erreur: ${error.message}`;
                synonymsContainer.style.display = 'none';
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
            synonymsContainer.style.display = 'none';
        });
    }
});
    // Handle reuse correction button
    document.querySelectorAll('.reuse-correction').forEach(button => {
        button.addEventListener('click', function() {
            const text = this.dataset.text;
            let corrections = {};
            if (this.dataset.corrections) {
                try {
                    const correctionData = this.dataset.corrections.replace(/&quot;/g, '"');
                    corrections = JSON.parse(correctionData);
                    if (typeof corrections !== 'object' || corrections === null) {
                        throw new Error('Invalid corrections format');
                    }
                } catch (error) {
                    console.error('Error parsing corrections:', error);
                    corrections = {};
                }
            }
            
            // Fill the input text
            const correctionInput = document.getElementById('correctionInput');
            if (correctionInput) {
                correctionInput.value = text || '';
                updateTextStats(correctionInput.value, 'correctionInputCharCount', 'correctionInputWordCount', 'correctionInputParaCount');
            }
            
            // Set correction options based on saved corrections
            if (corrections) {
                document.getElementById('checkSyntax').checked = corrections.syntax || false;
                document.getElementById('checkGrammar').checked = corrections.grammar || false;
                document.getElementById('checkSpelling').checked = corrections.spelling || false;
                document.getElementById('checkStyle').checked = corrections.style || false;
                document.getElementById('checkPunctuation').checked = corrections.punctuation || false;
                document.getElementById('checkSynonyms').checked = corrections.synonyms || false;
                
                // Set syntax rules if they exist
                if (corrections.syntax_rules) {
                    document.getElementById('wordOrder').checked = corrections.syntax_rules.word_order || false;
                    document.getElementById('subjectVerb').checked = corrections.syntax_rules.subject_verb_agreement || false;
                    document.getElementById('verbTense').checked = corrections.syntax_rules.verb_tense || false;
                    document.getElementById('genderNumber').checked = corrections.syntax_rules.gender_number || false;
                    document.getElementById('relativePronouns').checked = corrections.syntax_rules.relative_pronouns || false;
                }
            }
            
            // Scroll to correction section
            document.getElementById('correction').scrollIntoView({ behavior: 'smooth' });
        });
    });
