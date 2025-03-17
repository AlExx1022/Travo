import logging
import json
from datetime import datetime, timedelta
from flask import request, jsonify, current_app
import jwt
from app.models.user import User
from app.api import api_bp

# 設置日誌
logger = logging.getLogger(__name__)

@api_bp.route('/auth/register', methods=['POST'])
def register():
    """用戶註冊API"""
    data = request.get_json()
    
    # 檢查必要字段
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({
            'success': False,
            'message': '缺少必要的註冊信息'
        }), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # 簡單的郵箱格式驗證
    if '@' not in email or '.' not in email:
        return jsonify({
            'success': False,
            'message': '無效的郵箱格式'
        }), 400
    
    # 簡單的密碼強度驗證
    if len(password) < 8:
        return jsonify({
            'success': False,
            'message': '密碼長度必須至少為8個字符'
        }), 400
    
    # 創建用戶
    user_id, error = User.create_user(email, password)
    
    if error:
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    # 生成JWT令牌
    token = generate_token(str(user_id))
    
    return jsonify({
        'success': True,
        'message': '註冊成功',
        'token': token,
        'user_id': str(user_id)
    }), 201

@api_bp.route('/auth/login', methods=['POST'])
def login():
    """用戶登錄API"""
    data = request.get_json()
    
    # 檢查必要字段
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({
            'success': False,
            'message': '缺少必要的登錄信息'
        }), 400
    
    email = data.get('email')
    password = data.get('password')
    
    # 驗證用戶
    user = User.authenticate(email, password)
    
    if not user:
        return jsonify({
            'success': False,
            'message': '郵箱或密碼不正確'
        }), 401
    
    # 生成JWT令牌
    token = generate_token(str(user['_id']))
    
    return jsonify({
        'success': True,
        'message': '登錄成功',
        'token': token,
        'user_id': str(user['_id'])
    }), 200

@api_bp.route('/auth/profile', methods=['GET'])
def get_profile():
    """獲取用戶資料API"""
    # 從請求頭獲取令牌
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({
            'success': False,
            'message': '未提供有效的認證令牌'
        }), 401
    
    token = auth_header.split(' ')[1]
    
    # 驗證令牌
    try:
        payload = jwt.decode(
            token, 
            current_app.config.get('SECRET_KEY', 'dev_key'),
            algorithms=['HS256']
        )
        user_id = payload['sub']
    except jwt.ExpiredSignatureError:
        return jsonify({
            'success': False,
            'message': '認證令牌已過期'
        }), 401
    except jwt.InvalidTokenError:
        return jsonify({
            'success': False,
            'message': '無效的認證令牌'
        }), 401
    
    # 獲取用戶資料
    user = User.find_by_id(user_id)
    if not user:
        return jsonify({
            'success': False,
            'message': '用戶不存在'
        }), 404
    
    # 返回用戶資料（不包含密碼）
    user_data = {
        'user_id': str(user['_id']),
        'email': user['email'],
        'profile': user['profile'],
        'created_at': user['created_at'].isoformat(),
        'is_active': user['is_active']
    }
    
    return jsonify({
        'success': True,
        'user': user_data
    }), 200

def generate_token(user_id):
    """生成JWT令牌"""
    payload = {
        'sub': user_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(days=1)  # 令牌有效期1天
    }
    
    return jwt.encode(
        payload,
        current_app.config.get('SECRET_KEY', 'dev_key'),
        algorithm='HS256'
    ) 