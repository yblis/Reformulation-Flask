// Initialize EasyMDE on textareas
document.addEventListener('DOMContentLoaded', function() {
    // Array of textarea IDs that need Markdown editor
    const textareaIds = [
        'contextText',
        'inputText',
        'correctionInput',
        'translationInput',
        'emailContent'
    ];

    // Configure and initialize EasyMDE for each textarea
    const editors = textareaIds.map(id => {
        const textarea = document.getElementById(id);
        if (textarea) {
            return new EasyMDE({
                element: textarea,
                autofocus: false,
                spellChecker: false,
                status: false,
                minHeight: '200px',
                toolbar: [
                    'bold', 'italic', 'heading',
                    '|', 'quote', 'unordered-list', 'ordered-list',
                    '|', 'link'
                ],
                hideIcons: ['guide', 'preview'],
                renderingConfig: { 
                    singleLineBreaks: false, 
                    codeSyntaxHighlighting: false 
                },
                placeholder: textarea.placeholder,
                initialValue: textarea.value,
                indentWithTabs: false,
                styleSelectedText: true,
                forceSync: true,
                sideBySideFullscreen: false,
                maxHeight: '400px',
            });
        }
        return null;
    }).filter(editor => editor !== null);

    // Update character/word counts when editor content changes
    editors.forEach(editor => {
        editor.codemirror.on('change', () => {
            const textareaId = editor.element.id;
            const text = editor.value();
            
            // Update character count
            const charCountEl = document.getElementById(`${textareaId}CharCount`);
            if (charCountEl) {
                charCountEl.textContent = text.length;
            }

            // Update word count
            const wordCountEl = document.getElementById(`${textareaId}WordCount`);
            if (wordCountEl) {
                const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
                wordCountEl.textContent = wordCount;
            }

            // Update paragraph count
            const paraCountEl = document.getElementById(`${textareaId}ParaCount`);
            if (paraCountEl) {
                const paraCount = text.trim() ? text.trim().split(/\n\s*\n/).length : 0;
                paraCountEl.textContent = paraCount;
            }
        });
    });
});
