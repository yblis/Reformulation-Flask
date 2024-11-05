document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const emailTab = document.getElementById('email');
    const emailType = document.getElementById('emailType');
    const emailContent = document.getElementById('emailContent');
    const emailSender = document.getElementById('emailSender');
    const emailSubject = document.getElementById('emailSubject');
    const emailOutput = document.getElementById('emailOutput');
    const generateEmail = document.getElementById('generateEmail');
    const copyEmail = document.getElementById('copyEmail');
    const clearEmail = document.getElementById('clearEmail');
    const emailPrompt = document.getElementById('emailPrompt');

    // Only proceed if we're on the email tab
    if (!emailTab) return;

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
            if (!emailType || !emailContent || !emailOutput) return;
            
            const type = emailType.value.trim();
            const content = emailContent.value.trim();
            const sender = emailSender ? emailSender.value.trim() : '';
            
            if (!type || !content) {
                if (emailOutput) emailOutput.value = "Veuillez remplir tous les champs.";
                return;
            }

            generateEmail.disabled = true;
            generateEmail.textContent = 'En cours...';
            if (emailOutput) emailOutput.value = "Génération de l'email en cours...";
            if (emailSubject) emailSubject.value = "";

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
                    
                    if (subjectLine && emailSubject) {
                        emailSubject.value = subjectLine.substring(6).trim();
                        if (emailOutput) {
                            emailOutput.value = lines.filter(line => !line.toLowerCase().startsWith('objet:')).join('\n').trim();
                        }
                    } else {
                        if (emailSubject) emailSubject.value = "";
                        if (emailOutput) emailOutput.value = data.text;
                    }
                } else {
                    if (emailOutput) emailOutput.value = `Erreur: ${data.error || 'Une erreur est survenue'}`;
                }
            } catch (error) {
                console.error('Erreur:', error);
                if (emailOutput) emailOutput.value = "Erreur de connexion. Veuillez réessayer.";
            } finally {
                generateEmail.disabled = false;
                generateEmail.textContent = "Générer l'email";
            }
        });
    }

    if (copyEmail) {
        copyEmail.addEventListener('click', async () => {
            if (!emailOutput) return;
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
            if (emailType) emailType.value = '';
            if (emailContent) emailContent.value = '';
            if (emailSender) emailSender.value = '';
            if (emailSubject) emailSubject.value = '';
            if (emailOutput) emailOutput.value = '';
        });
    }
});
