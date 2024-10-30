# Reformulateur - Text Reformulation Web Application

A Flask-based web application for text reformulation, translation, and email generation using Ollama AI models.

## Features
- Text reformulation with customizable tone, format, and length
- Translation to multiple languages
- Professional email generation
- Persistent settings storage
- PWA support for mobile use
- Responsive design for all devices

## Requirements
- Python 3.8+
- PostgreSQL database
- Ollama server running with desired models

## Installation
1. Clone the repository
2. Install requirements: `pip install -r requirements.txt`
3. Set up PostgreSQL database and environment variables:
   - DATABASE_URL
   - PGDATABASE
   - PGHOST
   - PGPORT
   - PGUSER
   - PGPASSWORD

## Running the Application
1. Ensure Ollama server is running
2. Start the application: `python main.py`
3. Access the web interface at http://localhost:5000

## Configuration
- Configure Ollama URL and model in the Configuration tab
- Customize system prompts for reformulation, translation, and email generation
