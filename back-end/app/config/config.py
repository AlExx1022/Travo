import os
from dotenv import load_dotenv

# 加載.env文件中的環境變數
load_dotenv()

class Config:
    """基本配置類"""
    # OpenAI API設置
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_API_URL = os.getenv('OPENAI_API_URL', 'https://api.openai.com/v1/chat/completions')

    # Google Places API設置
    GOOGLE_PLACES_API_KEY = os.getenv('GOOGLE_PLACES_API_KEY', '')
    
    # MongoDB設置 (未來使用)
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/travel_app')
    
    # 應用設置
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev_secret_key')
    DEBUG = os.getenv('DEBUG', 'True').lower() in ('true', '1', 't')

class DevelopmentConfig(Config):
    """開發環境配置"""
    DEBUG = True

class ProductionConfig(Config):
    """生產環境配置"""
    DEBUG = False

# 根據環境變數選擇配置
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

def get_config():
    """獲取當前環境的配置"""
    env = os.getenv('FLASK_ENV', 'default')
    return config.get(env, config['default']) 