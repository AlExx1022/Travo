# app.py
from flask import Flask

def create_app():
    app = Flask(__name__)
    # 在這裡添加路由和配置
    return app

# 不要在這裡執行 app.run()
# 如果要部署，Flask 應該由 Gunicorn 啟動，不需要在 app.py 中運行
