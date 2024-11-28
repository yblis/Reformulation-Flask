# Reformulateur - Text Reformulation Web Application

A Flask-based web application for text reformulation, translation, and email generation using multiple AI providers and local Ollama models.

## Features
- Text reformulation with customizable tone, format, and length
- Translation to multiple languages
- Professional email generation
- Advanced text correction with:
  - Grammar correction
  - Spelling correction
  - Style improvement
  - Punctuation correction
  - Syntax correction
  - Synonym suggestions with interactive display
- Support for multiple AI providers:
  - OpenAI
  - Anthropic
  - Google Gemini
  - Groq
  - Local Ollama models
- Persistent settings storage with SQLite
- Real-time character count and text statistics
- History of recent reformulations
- PWA support for mobile use
- Responsive design for all devices

## Requirements
- Python 3.8+
- SQLite database (included)
- Ollama server (optional)

## Installation

1. Install Python requirements:
```bash
pip install -r requirements.txt
```

2. Configure environment variables in `.env`:
```bash
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_API_KEY=your_google_key
GROQ_API_KEY=your_groq_key
```

3. Start the Flask server:
```bash
python app.py
```

4. For local Ollama support (optional):
- Install Ollama from https://ollama.ai
- Start the Ollama service
- Configure the Ollama URL in the application settings

## Configuration
1. Access the Configuration tab to:
   - Select your preferred AI provider
   - Configure API keys for each provider
   - Select models for each provider
   - Customize system prompts for reformulation, translation, and email generation

2. API Provider Setup:
   - OpenAI: Requires API key from https://platform.openai.com
   - Anthropic: Requires API key from https://console.anthropic.com
   - Google Gemini: Requires API key from https://makersuite.google.com
   - Groq: Requires API key from https://console.groq.com
   - Ollama: Requires local installation, no API key needed

## Usage
1. Select the desired functionality tab:
   - Reformulation: Rewrite text with specific tone, format, and length
   - Translation: Translate text between multiple languages
   - Correction: Fix grammar, spelling, style, and get synonym suggestions
   - Email Generation: Create professional emails from templates
2. Enter your text and configure options:
   - For reformulation: Choose tone, format, and length
   - For translation: Select target language
   - For correction: Toggle grammar, spelling, style, punctuation, syntax, and synonyms options
   - For email: Select email type and provide context
3. Use the history tab to view and reuse past reformulations
