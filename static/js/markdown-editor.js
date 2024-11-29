// Initialize TinyMCE on textareas
document.addEventListener('DOMContentLoaded', function() {
    // Array of textarea IDs that need rich text editor
    const textareaIds = [
        'contextText',
        'inputText',
        'correctionInput',
        'translationInput',
        'emailContent'
    ];

    // Configure and initialize TinyMCE for each textarea
    textareaIds.forEach(id => {
        const textarea = document.getElementById(id);
        if (textarea) {
            tinymce.init({
                selector: `#${id}`,
                menubar: false,
                inline: false,
                plugins: 'lists link',
                toolbar: 'bold italic | bullist numlist | link',
                content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }',
                skin: 'oxide-dark',
                content_css: 'dark',
                min_height: 200,
                max_height: 500,
                readonly: false,
                branding: false,
                elementpath: false,
                statusbar: false,
                resize: true,
                paste_as_text: true,
                placeholder: textarea.placeholder,
                setup: function(editor) {
                    // Update character/word/paragraph counts when content changes
                    editor.on('KeyUp Change', function() {
                        const content = editor.getContent();
                        const plainText = content.replace(/<[^>]*>/g, ''); // Strip HTML tags

                        // Update character count
                        const charCountEl = document.getElementById(`${id}CharCount`);
                        if (charCountEl) {
                            charCountEl.textContent = plainText.length;
                            charCountEl.classList.add('updating');
                            setTimeout(() => charCountEl.classList.remove('updating'), 200);
                        }

                        // Update word count
                        const wordCountEl = document.getElementById(`${id}WordCount`);
                        if (wordCountEl) {
                            const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
                            wordCountEl.textContent = wordCount;
                            wordCountEl.classList.add('updating');
                            setTimeout(() => wordCountEl.classList.remove('updating'), 200);
                        }

                        // Update paragraph count
                        const paraCountEl = document.getElementById(`${id}ParaCount`);
                        if (paraCountEl) {
                            const paraCount = content.trim() ? content.split(/<\/p><p>|<\/p>\s*<p>/).length : 0;
                            paraCountEl.textContent = paraCount;
                            paraCountEl.classList.add('updating');
                            setTimeout(() => paraCountEl.classList.remove('updating'), 200);
                        }
                    });
                },
                init_instance_callback: function(editor) {
                    // Set initial content if textarea has value
                    if (textarea.value) {
                        editor.setContent(textarea.value);
                    }
                }
            });
        }
    });
});

// Function to get Markdown content from TinyMCE editor
function getMarkdownContent(editorId) {
    const editor = tinymce.get(editorId);
    if (editor) {
        const content = editor.getContent();
        // Convert HTML to Markdown (basic conversion)
        return content
            .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
            .replace(/<em>(.*?)<\/em>/g, '*$1*')
            .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
            .replace(/<ul>(.*?)<\/ul>/g, '$1\n')
            .replace(/<li>(.*?)<\/li>/g, '- $1\n')
            .replace(/<ol>(.*?)<\/ol>/g, '$1\n')
            .replace(/<li value="\d+">(.*?)<\/li>/g, '1. $1\n')
            .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
            .trim();
    }
    return '';
}
