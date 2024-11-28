// Gestion des états de chargement
function showLoading(element) {
    element.classList.add('loading');
    element.disabled = true;
    const originalText = element.textContent;
    element.setAttribute('data-original-text', originalText);
    element.innerHTML = `<span class="spinner"></span> ${originalText}...`;
}

function hideLoading(element) {
    element.classList.remove('loading');
    element.disabled = false;
    element.textContent = element.getAttribute('data-original-text');
}

// Gestion des notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto-suppression après 5 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Confirmation pour les actions importantes
function confirmAction(message) {
    return new Promise((resolve) => {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.innerHTML = `
            <div class="confirm-content">
                <p>${message}</p>
                <div class="confirm-buttons">
                    <button class="btn btn-secondary" data-action="cancel">Annuler</button>
                    <button class="btn btn-primary" data-action="confirm">Confirmer</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        setTimeout(() => dialog.classList.add('show'), 100);
        
        dialog.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            if (action) {
                dialog.classList.remove('show');
                setTimeout(() => {
                    dialog.remove();
                    resolve(action === 'confirm');
                }, 300);
            }
        });
    });
}

// Gestionnaire d'erreurs global pour les requêtes fetch
async function fetchWithErrorHandling(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Une erreur est survenue');
        }
        
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

// Gestion des formulaires avec validation
function setupFormValidation(formElement, validationRules = {}) {
    const inputs = formElement.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
        input.addEventListener('input', () => validateInput(input, validationRules[input.name]));
    });
    
    return {
        validate: () => {
            let isValid = true;
            inputs.forEach(input => {
                if (!validateInput(input, validationRules[input.name])) {
                    isValid = false;
                }
            });
            return isValid;
        }
    };
}

function validateInput(input, rules) {
    if (!rules) return true;
    
    let isValid = true;
    const value = input.value.trim();
    
    if (rules.required && !value) {
        showInputError(input, 'Ce champ est requis');
        isValid = false;
    } else if (rules.minLength && value.length < rules.minLength) {
        showInputError(input, `Minimum ${rules.minLength} caractères`);
        isValid = false;
    } else if (rules.pattern && !rules.pattern.test(value)) {
        showInputError(input, rules.message || 'Format invalide');
        isValid = false;
    } else {
        clearInputError(input);
    }
    
    return isValid;
}

function showInputError(input, message) {
    clearInputError(input);
    input.classList.add('is-invalid');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'invalid-feedback';
    errorDiv.textContent = message;
    input.parentNode.appendChild(errorDiv);
}

function clearInputError(input) {
    input.classList.remove('is-invalid');
    const errorDiv = input.parentNode.querySelector('.invalid-feedback');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// Gestion des transitions entre les onglets
function setupTabTransitions() {
    const tabs = document.querySelectorAll('.nav-tabs .nav-link');
    const tabContents = document.querySelectorAll('.tab-pane');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('href');
            
            // Animation de sortie
            tabContents.forEach(content => {
                if (content.classList.contains('show')) {
                    content.style.opacity = '0';
                    content.style.transform = 'translateX(-10px)';
                }
            });
            
            // Animation d'entrée
            setTimeout(() => {
                tabContents.forEach(content => content.classList.remove('show', 'active'));
                tabs.forEach(t => t.classList.remove('active'));
                
                tab.classList.add('active');
                const targetContent = document.querySelector(targetId);
                if (targetContent) {
                    targetContent.classList.add('show', 'active');
                    targetContent.style.opacity = '1';
                    targetContent.style.transform = 'translateX(0)';
                }
            }, 300);
        });
    });
}

// Amélioration du retour visuel des actions
function setupActionFeedback() {
    const buttons = document.querySelectorAll('button:not(.nav-link)');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (!button.classList.contains('loading')) {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple-effect');
                
                const rect = button.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                ripple.style.width = ripple.style.height = `${size}px`;
                
                button.appendChild(ripple);
                
                setTimeout(() => ripple.remove(), 1000);
            }
        });
    });
}

// Initialisation des améliorations UI
document.addEventListener('DOMContentLoaded', () => {
    setupTabTransitions();
    setupActionFeedback();
});

// Export des fonctions
window.UITools = {
    showLoading,
    hideLoading,
    showNotification,
    confirmAction,
    fetchWithErrorHandling,
    setupFormValidation,
    setupTabTransitions,
    setupActionFeedback
};
