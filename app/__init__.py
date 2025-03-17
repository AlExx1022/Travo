from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # 啟用CORS以允許前端訪問
    
    # 導入並註冊藍圖
    from app.api.routes import api_bp
    app.register_blueprint(api_bp)
    
    return app 