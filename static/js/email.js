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
    const emailToneContainer = document.getElementById('emailToneContainer');

    // Tag management will be handled by TagManager from main.js

    // Only proceed if we're on the email tab
    if (!emailTab) return;

    // Load saved email prompt from localStorage
    if (emailPrompt) {
        // Load saved email prompt
        const savedEmailPrompt = localStorage.getItem('emailPrompt');
        if (savedEmailPrompt) {
            emailPrompt.value = savedEmailPrompt;
        }

        // Load saved sender name
        const savedSenderName = localStorage.getItem('emailSenderName');
        // Save sender name when it changes
        if (emailSender) {
            emailSender.addEventListener('change', function() {
                localStorage.setItem('emailSenderName', this.value);
            });
        }
        if (savedSenderName && emailSender) {
            emailSender.value = savedSenderName;
        }
    }

    if (generateEmail) {
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
                const selectedTone = window.getSelectedValues('emailToneGroup');
                console.log('Email generation - Selected tone:', selectedTone);
                    
                const response = await fetch('/api/generate-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        type: type,
                        content: content,
                        sender: sender,
                        tone: Array.isArray(selectedTone) ? selectedTone[0] : selectedTone || 'Professionnel' // Handle both array and single value
                    })
                });

                const data = await response.json();
                if (response.ok) {
                    // Enhanced email parsing
                    const lines = data.text.split('\n');
                    const subjectLine = lines.find(line => 
                        line.toLowerCase().startsWith('objet:') || 
                        line.toLowerCase().startsWith('object:') ||
                        line.toLowerCase().startsWith('sujet:')
                    );
                    
                    if (subjectLine && emailSubject) {
                        // Extract subject, removing any prefix (Objet:, Object:, Sujet:)
                        const subjectText = subjectLine.substring(subjectLine.indexOf(':') + 1).trim();
                        emailSubject.value = subjectText;
                        
                        // Format the email body with proper spacing
                        if (emailOutput) {
                            const bodyLines = lines
                                .filter(line => !line.toLowerCase().match(/^(objet|object|sujet):/))
                                .join('\n')
                                .trim()
                                // Ensure proper spacing between sections
                                .replace(/\n{3,}/g, '\n\n');
                            emailOutput.value = bodyLines;
                        }
                    } else {
                        // Fallback if no subject is found
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

    // Handle subject copy button
    if (document.getElementById('copySubject')) {
        document.getElementById('copySubject').addEventListener('click', async function() {
            const subject = document.getElementById('emailSubject');
            if (!subject || !subject.value) return;

            try {
                await navigator.clipboard.writeText(subject.value);
                const icon = this.querySelector('i');
                icon.classList.remove('bi-files');
                icon.classList.add('bi-check2');
                setTimeout(() => {
                    icon.classList.remove('bi-check2');
                    icon.classList.add('bi-files');
                }, 2000);
            } catch (err) {
                console.error('Erreur lors de la copie:', err);
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
            if (emailSender) {
                const savedName = localStorage.getItem('emailSenderName');
                emailSender.value = savedName || '';
            }
            if (emailSubject) emailSubject.value = '';
            if (emailOutput) emailOutput.value = '';
        });
    }
});
