# Reformulateur - Text Reformulation Web Application

A Flask-based web application for text reformulation, translation, and email generation using Ollama AI models.

## Features
- Text reformulation with customizable tone, format, and length
- Translation to multiple languages
- Professional email generation
- Persistent settings storage with SQLite
- PWA support for mobile use
- Responsive design for all devices
- History of recent reformulations

## Requirements
- Python 3.8+
- SQLite database (included)
- Ollama server running with desired models

## Installation
1. Clone the repository
2. Install requirements: `pip install -r requirements.txt`
3. The SQLite database will be created automatically on first run

## Running the Application
1. Ensure Ollama server is running
2. Start the application: `python main.py`
3. Access the web interface at http://localhost:5000

## Configuration
- Configure Ollama URL and model in the Configuration tab
- Customize system prompts for reformulation, translation, and email generation
