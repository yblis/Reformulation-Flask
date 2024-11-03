# Reformulateur - Text Reformulation Web Application

A Flask-based web application for text reformulation, translation, and email generation using multiple AI providers and local Ollama models.

## Features
- Text reformulation with customizable tone, format, and length
- Translation to multiple languages
- Professional email generation
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

## Screenshots

### Rephrase
<img width="1152" alt="image" src="https://github.com/user-attachments/assets/8f832c76-ee18-4197-8abf-69fef21e3fef">
<img width="1148" alt="image" src="https://github.com/user-attachments/assets/6fe63f80-1b2f-47e2-809f-ffe4eb3a2629">


### Translate
<img width="1159" alt="image" src="https://github.com/user-attachments/assets/9159dcdc-761f-419c-8d31-317b2578d602">

### Build emails
<img width="1155" alt="image" src="https://github.com/user-attachments/assets/e3b4941b-0620-421a-a84e-b4139039554a">


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
OLLAMA_URL=your_ollama_url
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
   - Email Generation: Create professional emails from templates
2. Enter your text and configure options
3. Use the history tab to view and reuse past reformulations
