from flask import Blueprint

# 創建API藍圖
api_bp = Blueprint('api', __name__, url_prefix='/api')

# 導入路由
from app.api import auth, travel_plans

# 註冊路由
# 註冊路由的代碼會在各個模塊中自動執行 