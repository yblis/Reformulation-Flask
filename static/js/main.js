document.addEventListener('DOMContentLoaded', function() {
    // Text statistics functions
    function countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    function calculateReadingTime(wordCount) {
        const wordsPerMinute = 200;
        const minutes = Math.ceil(wordCount / wordsPerMinute);
        return `${minutes} min`;
    }

    function updateTextStatistics(textArea, charCountId, wordCountId, readTimeId) {
        if (!textArea) return;

        const text = textArea.value;
        const charCount = text.length;
        const wordCount = countWords(text);
        const readTime = calculateReadingTime(wordCount);

        document.getElementById(charCountId).textContent = charCount;
        document.getElementById(wordCountId).textContent = wordCount;
        document.getElementById(readTimeId).textContent = readTime;
    }

    // Setup text statistics for all text areas
    const textAreas = [
        {
            input: document.getElementById('contextText'),
            charCount: 'contextCharCount',
            wordCount: 'contextWordCount',
            readTime: 'contextReadTime'
        },
        {
            input: document.getElementById('inputText'),
            charCount: 'inputCharCount',
            wordCount: 'inputWordCount',
            readTime: 'inputReadTime'
        },
        {
            input: document.getElementById('translationInput'),
            charCount: 'translationCharCount',
            wordCount: 'translationWordCount',
            readTime: 'translationReadTime'
        }
    ];

    textAreas.forEach(({input, charCount, wordCount, readTime}) => {
        if (input) {
            // Initial update
            updateTextStatistics(input, charCount, wordCount, readTime);

            // Real-time updates
            input.addEventListener('input', () => {
                updateTextStatistics(input, charCount, wordCount, readTime);
            });
        }
    });

    // Existing code...
    // [Rest of the existing main.js content]
});
