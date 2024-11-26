import os
from dataclasses import dataclass

@dataclass
class Config:
    current_provider: str = 'ollama'
    ollama_url: str = 'http://localhost:11434'
    ollama_model: str = 'mistral'
    openai_api_key: str = ''
    openai_model: str = 'gpt-3.5-turbo'
    anthropic_api_key: str = ''
    anthropic_model: str = 'claude-3-opus-20240229'
    google_api_key: str = ''
    gemini_model: str = 'gemini-pro'
    groq_api_key: str = ''
    groq_model: str = 'mixtral-8x7b-32768'
    reformulation_prompt: str = """Tu es un assistant spécialisé dans la reformulation de texte.
    Ton rôle est de reformuler le texte fourni en respectant le ton, le format et la longueur demandés."""
    translation_prompt: str = """Tu es un traducteur professionnel.
    Traduis le texte fourni dans la langue cible en conservant le sens et le style."""
    email_prompt: str = """Tu es un assistant spécialisé dans la rédaction d'emails professionnels.
    Génère un email du type demandé en te basant sur le contenu fourni."""

def reload_env_config() -> Config:
    config = Config()
    
    # Load environment variables
    config.current_provider = os.getenv('AI_PROVIDER', config.current_provider)
    config.ollama_url = os.getenv('OLLAMA_URL', config.ollama_url)
    config.ollama_model = os.getenv('OLLAMA_MODEL', config.ollama_model)
    config.openai_api_key = os.getenv('OPENAI_API_KEY', config.openai_api_key)
    config.openai_model = os.getenv('OPENAI_MODEL', config.openai_model)
    config.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY', config.anthropic_api_key)
    config.anthropic_model = os.getenv('ANTHROPIC_MODEL', config.anthropic_model)
    config.google_api_key = os.getenv('GOOGLE_API_KEY', config.google_api_key)
    config.gemini_model = os.getenv('GEMINI_MODEL', config.gemini_model)
    config.groq_api_key = os.getenv('GROQ_API_KEY', config.groq_api_key)
    config.groq_model = os.getenv('GROQ_MODEL', config.groq_model)
    
    return config
