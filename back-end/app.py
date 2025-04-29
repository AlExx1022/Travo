# app.py
from flask import Flask

def create_app():
    app = Flask(__name__)
    # 在這裡添加路由和配置
    return app

# def create_app():
#     app = Flask(__name__)
#     # 在這裡添加路由和配置
#     return app

# # 僅在本地開發時使用內建伺服器
# if __name__ == '__main__':
#     app = create_app()
#     app.run(debug=True, host='0.0.0.0', port=8080)  # 這會啟動內建伺服器