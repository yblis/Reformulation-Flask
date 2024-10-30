document.addEventListener('DOMContentLoaded', function() {
    const emailType = document.getElementById('emailType');
    const emailContent = document.getElementById('emailContent');
    const emailSender = document.getElementById('emailSender');
    const emailSubject = document.getElementById('emailSubject');
    const emailOutput = document.getElementById('emailOutput');
    const generateEmail = document.getElementById('generateEmail');
    const copyEmail = document.getElementById('copyEmail');
    const copyEmailSubject = document.getElementById('copyEmailSubject');
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
            const sender = emailSender.value.trim();
            
            if (!type || !content) {
                emailOutput.value = "Veuillez remplir tous les champs.";
                return;
            }

            generateEmail.disabled = true;
            generateEmail.textContent = 'En cours...';
            emailOutput.value = "Génération de l'email en cours...";
            emailSubject.value = "";

            try {
                const response = await fetch('/api/generate-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: type,
                        content: content,
                        sender: sender
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    // Split the response into subject and body
                    const lines = data.text.split('\n');
                    const subjectLine = lines.find(line => line.toLowerCase().startsWith('objet:'));
                    
                    if (subjectLine) {
                        emailSubject.value = subjectLine.substring(6).trim();
                        emailOutput.value = lines.filter(line => !line.toLowerCase().startsWith('objet:')).join('\n').trim();
                    } else {
                        emailSubject.value = "";
                        emailOutput.value = data.text;
                    }
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

    if (copyEmailSubject) {
        copyEmailSubject.addEventListener('click', async () => {
            const text = emailSubject.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = copyEmailSubject.textContent;
                copyEmailSubject.textContent = 'Copié!';
                setTimeout(() => {
                    copyEmailSubject.textContent = originalText;
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
            emailSender.value = '';
            emailSubject.value = '';
            emailOutput.value = '';
        });
    }
});
