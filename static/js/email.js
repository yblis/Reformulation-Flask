document.addEventListener('DOMContentLoaded', function() {
    const emailType = document.getElementById('emailType');
    const emailContent = document.getElementById('emailContent');
    const emailOutput = document.getElementById('emailOutput');
    const generateEmail = document.getElementById('generateEmail');
    const copyEmail = document.getElementById('copyEmail');
    const clearEmail = document.getElementById('clearEmail');
    const emailPrompt = document.getElementById('emailPrompt');

    // Load saved email prompt from localStorage
    if (emailPrompt) {
        const savedEmailPrompt = localStorage.getItem('emailPrompt');
        if (savedEmailPrompt) {
            emailPrompt.value = savedEmailPrompt;
        }
    }

    if (generateEmail) {
        generateEmail.classList.add('requires-ollama');
        generateEmail.addEventListener('click', async function() {
            const type = emailType.value.trim();
            const content = emailContent.value.trim();
            
            if (!type || !content) {
                emailOutput.value = "Veuillez remplir tous les champs.";
                return;
            }

            generateEmail.disabled = true;
            generateEmail.textContent = 'En cours...';
            emailOutput.value = "Génération de l'email en cours...";

            try {
                const response = await fetch('/api/generate-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: type,
                        content: content
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    emailOutput.value = data.text;
                } else {
                    emailOutput.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                emailOutput.value = "Erreur de connexion. Veuillez réessayer.";
            } finally {
                generateEmail.disabled = false;
                generateEmail.textContent = "Générer l'email";
            }
        });
    }

    if (copyEmail) {
        copyEmail.addEventListener('click', async () => {
            const text = emailOutput.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyEmail.textContent;
                copyEmail.textContent = 'Copié!';
                setTimeout(() => {
                    copyEmail.textContent = originalText;
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
            }
        });
    }

    if (clearEmail) {
        clearEmail.addEventListener('click', () => {
            emailType.value = '';
            emailContent.value = '';
            emailOutput.value = '';
        });
    }
});
