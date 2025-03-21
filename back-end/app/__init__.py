import os
from flask import Flask
from flask_cors import CORS

def create_app(test_config=None):
    """創建並配置Flask應用"""
    # 創建應用實例
    app = Flask(__name__, instance_relative_config=True)
    
    # 配置應用
    app.config.from_mapping(
        SECRET_KEY=os.environ.get('SECRET_KEY', 'dev_key'),
        MONGO_URI=os.environ.get('MONGO_URI', 'mongodb://localhost:27017'),
    )
    
    # 如果提供了測試配置，則使用測試配置
    if test_config is not None:
        app.config.update(test_config)
    
    # 確保實例文件夾存在
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    # 啟用CORS
    CORS(app)
    
    # 註冊API藍圖
    from app.api import api_bp
    app.register_blueprint(api_bp)
    
    # 簡單的首頁路由
    @app.route('/')
    def index():
        return {
            'message': 'Travo API 服務正在運行',
            'version': '1.0.0'
        }
    
    return app 