document.addEventListener('DOMContentLoaded', function() {
    const inputText = document.getElementById('inputText');
    const outputText = document.getElementById('outputText');
    const reformulateBtn = document.getElementById('reformulateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const clearBtn = document.getElementById('clearBtn');

    // Handle tag groups
    function setupTagGroup(groupId) {
        const group = document.getElementById(groupId);
        const buttons = group.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                buttons.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    setupTagGroup('toneGroup');
    setupTagGroup('formatGroup');
    setupTagGroup('lengthGroup');

    // Get selected value from a tag group
    function getSelectedValue(groupId) {
        const activeButton = document.querySelector(`#${groupId} .btn.active`);
        return activeButton ? activeButton.dataset.value : '';
    }

    // Reformulate text
    reformulateBtn.addEventListener('click', async function() {
        const text = inputText.value.trim();
        if (!text) return;

        reformulateBtn.disabled = true;
        reformulateBtn.textContent = 'En cours...';

        try {
            const response = await fetch('/api/reformulate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    tone: getSelectedValue('toneGroup'),
                    format: getSelectedValue('formatGroup'),
                    length: getSelectedValue('lengthGroup')
                })
            });

            const data = await response.json();
            if (data.error) {
                outputText.value = `Erreur: ${data.error}`;
            } else {
                outputText.value = data.text;
            }
        } catch (error) {
            outputText.value = `Erreur: ${error.message}`;
        } finally {
            reformulateBtn.disabled = false;
            reformulateBtn.textContent = 'Reformuler';
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', function() {
        outputText.select();
        document.execCommand('copy');
    });

    // Clear output
    clearBtn.addEventListener('click', function() {
        outputText.value = '';
    });
});
