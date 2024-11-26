document.addEventListener('DOMContentLoaded', function() {
    const translationInput = document.getElementById('translationInput');
    const translationOutput = document.getElementById('translationOutput');
    const translateText = document.getElementById('translateText');
    const copyTranslation = document.getElementById('copyTranslation');
    const clearTranslation = document.getElementById('clearTranslation');
    const checkGrammar = document.getElementById('checkGrammar');
    const fixGrammar = document.getElementById('fixGrammar');
    const grammarResults = document.getElementById('grammarResults');

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
    // Grammar checking functionality
    if (checkGrammar) {
        checkGrammar.addEventListener('click', async function() {
            const text = translationInput.value.trim();
            if (!text) return;

            checkGrammar.disabled = true;
            fixGrammar.disabled = true;
            checkGrammar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Analyse en cours...';

            try {
                const response = await fetch('/api/check-grammar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });

                const data = await response.json();
                if (data.errors && data.errors.length > 0) {
                    grammarResults.classList.remove('d-none');
                    const listGroup = grammarResults.querySelector('.list-group');
                    listGroup.innerHTML = data.errors.map(error => `
                        <div class="list-group-item list-group-item-warning">
                            <div class="d-flex w-100 justify-content-between">
                                <h6 class="mb-1">${error.type}</h6>
                                <small>${error.position}</small>
                            </div>
                            <p class="mb-1">${error.message}</p>
                            ${error.suggestion ? `<small class="text-success">Suggestion: ${error.suggestion}</small>` : ''}
                        </div>
                    `).join('');
                    fixGrammar.disabled = false;
                } else {
                    grammarResults.classList.remove('d-none');
                    const listGroup = grammarResults.querySelector('.list-group');
                    listGroup.innerHTML = `
                        <div class="list-group-item list-group-item-success">
                            <p class="mb-0">Aucune erreur grammaticale détectée!</p>
                        </div>
                    `;
                    fixGrammar.disabled = true;
                }
            } catch (error) {
                grammarResults.classList.remove('d-none');
                const listGroup = grammarResults.querySelector('.list-group');
                listGroup.innerHTML = `
                    <div class="list-group-item list-group-item-danger">
                        <p class="mb-0">Erreur lors de l'analyse: ${error.message}</p>
                    </div>
                `;
                fixGrammar.disabled = true;
            } finally {
                checkGrammar.disabled = false;
                checkGrammar.innerHTML = '<i class="bi bi-check-circle me-2"></i>Vérifier la grammaire';
            }
        });
    }

    if (fixGrammar) {
        fixGrammar.addEventListener('click', async function() {
            const text = translationInput.value.trim();
            if (!text) return;

            fixGrammar.disabled = true;
            checkGrammar.disabled = true;
            fixGrammar.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Correction en cours...';

            try {
                const response = await fetch('/api/fix-grammar', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ text: text })
                });

                const data = await response.json();
                if (data.text) {
                    translationInput.value = data.text;
                    grammarResults.classList.add('d-none');
                    // Trigger input event to update character count
                    translationInput.dispatchEvent(new Event('input'));
                }
            } catch (error) {
                grammarResults.classList.remove('d-none');
                const listGroup = grammarResults.querySelector('.list-group');
                listGroup.innerHTML = `
                    <div class="list-group-item list-group-item-danger">
                        <p class="mb-0">Erreur lors de la correction: ${error.message}</p>
                    </div>
                `;
            } finally {
                fixGrammar.disabled = false;
                checkGrammar.disabled = false;
                fixGrammar.innerHTML = '<i class="bi bi-magic me-2"></i>Corriger';
            }
        });
    }
        });
    }
});
