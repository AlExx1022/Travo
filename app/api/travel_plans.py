import logging
import json
from datetime import datetime
from bson.objectid import ObjectId
from flask import request, jsonify, current_app
import jwt
from app.models.travel_plan import TravelPlan
from app.api import api_bp

# 設置日誌
logger = logging.getLogger(__name__)

# 身份驗證裝飾器
def token_required(f):
    def decorated(*args, **kwargs):
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
        
        # 將用戶ID添加到請求中
        request.user_id = user_id
        return f(*args, **kwargs)
    
    # 保留原始函數名稱
    decorated.__name__ = f.__name__
    return decorated

@api_bp.route('/travel-plans', methods=['GET'])
@token_required
def get_travel_plans():
    """獲取用戶的旅行計劃列表"""
    user_id = request.user_id
    
    # 獲取分頁參數
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    skip = (page - 1) * limit
    
    # 查詢用戶的旅行計劃
    plans = TravelPlan.find_by_user(user_id, limit=limit, skip=skip)
    
    # 格式化計劃數據
    formatted_plans = []
    for plan in plans:
        formatted_plan = {
            'plan_id': str(plan['_id']),
            'title': plan['title'],
            'destination': plan['destination'],
            'start_date': plan['start_date'],
            'end_date': plan['end_date'],
            'created_at': plan['created_at'].isoformat(),
            'updated_at': plan['updated_at'].isoformat(),
            'is_public': plan['is_public']
        }
        formatted_plans.append(formatted_plan)
    
    return jsonify({
        'success': True,
        'plans': formatted_plans,
        'page': page,
        'limit': limit,
        'total': len(formatted_plans)  # 注意：這只是當前頁的數量，不是總數
    }), 200

@api_bp.route('/travel-plans/<plan_id>', methods=['GET'])
@token_required
def get_travel_plan(plan_id):
    """獲取特定旅行計劃的詳情"""
    user_id = request.user_id
    
    # 查詢旅行計劃
    plan = TravelPlan.find_by_id(plan_id)
    
    if not plan:
        return jsonify({
            'success': False,
            'message': '找不到旅行計劃'
        }), 404
    
    # 檢查權限（只有計劃擁有者或公開計劃可以查看）
    if str(plan['user_id']) != user_id and not plan['is_public']:
        return jsonify({
            'success': False,
            'message': '無權查看此旅行計劃'
        }), 403
    
    # 格式化計劃數據
    formatted_plan = {
        'plan_id': str(plan['_id']),
        'user_id': str(plan['user_id']),
        'title': plan['title'],
        'created_at': plan['created_at'].isoformat(),
        'updated_at': plan['updated_at'].isoformat(),
        'is_public': plan['is_public'],
        'version': plan['version'],
        'destination': plan['destination'],
        'start_date': plan['start_date'],
        'end_date': plan['end_date'],
        'days': plan['days'],
        'transportation': plan['transportation'],
        'accommodation': plan['accommodation'],
        'budget_estimate': plan['budget_estimate'],
        'weather_forecast': plan['weather_forecast'],
        'additional_info': plan['additional_info']
    }
    
    return jsonify({
        'success': True,
        'plan': formatted_plan
    }), 200

@api_bp.route('/travel-plans', methods=['POST'])
@token_required
def create_travel_plan():
    """創建新的旅行計劃"""
    user_id = request.user_id
    data = request.get_json()
    
    # 檢查必要字段
    if not data:
        return jsonify({
            'success': False,
            'message': '缺少旅行計劃數據'
        }), 400
    
    # 創建旅行計劃
    plan_id, error = TravelPlan.create_plan(user_id, data)
    
    if error:
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    return jsonify({
        'success': True,
        'message': '旅行計劃創建成功',
        'plan_id': str(plan_id)
    }), 201

@api_bp.route('/travel-plans/<plan_id>', methods=['PUT'])
@token_required
def update_travel_plan(plan_id):
    """更新旅行計劃"""
    user_id = request.user_id
    data = request.get_json()
    
    # 檢查必要字段
    if not data:
        return jsonify({
            'success': False,
            'message': '缺少更新數據'
        }), 400
    
    # 更新旅行計劃
    success, error = TravelPlan.update_plan(plan_id, data, user_id)
    
    if not success:
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    return jsonify({
        'success': True,
        'message': '旅行計劃更新成功'
    }), 200

@api_bp.route('/travel-plans/<plan_id>', methods=['DELETE'])
@token_required
def delete_travel_plan(plan_id):
    """刪除旅行計劃"""
    user_id = request.user_id
    
    # 刪除旅行計劃
    success, error = TravelPlan.delete_plan(plan_id, user_id)
    
    if not success:
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    return jsonify({
        'success': True,
        'message': '旅行計劃刪除成功'
    }), 200

@api_bp.route('/travel-plans/public', methods=['GET'])
def get_public_plans():
    """獲取公開的旅行計劃列表"""
    # 獲取分頁參數
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    skip = (page - 1) * limit
    
    # 查詢公開的旅行計劃
    plans = TravelPlan.find_public_plans(limit=limit, skip=skip)
    
    # 格式化計劃數據
    formatted_plans = []
    for plan in plans:
        formatted_plan = {
            'plan_id': str(plan['_id']),
            'title': plan['title'],
            'destination': plan['destination'],
            'start_date': plan['start_date'],
            'end_date': plan['end_date'],
            'created_at': plan['created_at'].isoformat(),
            'updated_at': plan['updated_at'].isoformat()
        }
        formatted_plans.append(formatted_plan)
    
    return jsonify({
        'success': True,
        'plans': formatted_plans,
        'page': page,
        'limit': limit,
        'total': len(formatted_plans)
    }), 200

@api_bp.route('/travel-plans/search', methods=['GET'])
def search_travel_plans():
    """搜索旅行計劃"""
    # 獲取搜索參數
    query = request.args.get('q', '')
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    skip = (page - 1) * limit
    
    # 搜索旅行計劃
    plans = TravelPlan.search_plans(query, limit=limit, skip=skip)
    
    # 格式化計劃數據
    formatted_plans = []
    for plan in plans:
        formatted_plan = {
            'plan_id': str(plan['_id']),
            'title': plan['title'],
            'destination': plan['destination'],
            'start_date': plan['start_date'],
            'end_date': plan['end_date'],
            'created_at': plan['created_at'].isoformat(),
            'updated_at': plan['updated_at'].isoformat()
        }
        formatted_plans.append(formatted_plan)
    
    return jsonify({
        'success': True,
        'plans': formatted_plans,
        'page': page,
        'limit': limit,
        'total': len(formatted_plans),
        'query': query
    }), 200 