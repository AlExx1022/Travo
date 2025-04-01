import logging
import json
from datetime import datetime
from bson.objectid import ObjectId
from flask import request, jsonify, current_app
import jwt
from app.models.travel_plan import TravelPlan
from app.api import api_bp
from app.utils.gpt_service import generate_travel_plan as gpt_generate_travel_plan
from app.utils.google_places_service import enrich_travel_plan, is_api_key_valid
import re

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
        'budget': plan.get('budget', '0'),  # 確保包含預算欄位
        'travelers': plan.get('travelers', 1),  # 確保包含人數欄位
        'days': plan['days']
    }
    
    # 記錄日誌，確認欄位存在
    logger.info(f"旅行計劃詳情 - ID: {plan_id}, 預算: {formatted_plan['budget']}, 人數: {formatted_plan['travelers']}")
    
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
        # 如果錯誤是一個字典並且包含錯誤代碼
        if isinstance(error, dict) and 'error_code' in error:
            if error['error_code'] == 'permission_denied':
                # 權限錯誤
                return jsonify({
                    'success': False,
                    'message': error.get('message', '無權更新此計劃'),
                    'error_code': error['error_code']
                }), 403
            else:
                # 其他錯誤代碼
                return jsonify({
                    'success': False,
                    'message': error.get('message', '更新計劃失敗'),
                    'error_code': error['error_code']
                }), 400
        else:
            # 處理原來的字符串錯誤訊息
            return jsonify({
                'success': False,
                'message': error if isinstance(error, str) else '更新計劃失敗'
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

@api_bp.route('/travel-plans/generate', methods=['POST'])
@token_required
def generate_travel_plan():
    """
    自動生成旅行計劃並存儲到數據庫
    
    預期的JSON格式:
    {
        "destination": "東京",
        "start_date": "2023-10-01",
        "end_date": "2023-10-05",
        "budget": "30000",
        "travelers": 2,
        "interests": ["歷史", "美食", "文化體驗"],
        "preference": "輕鬆",
        "companions": "家庭"
    }
    """
    user_id = request.user_id
    data = request.get_json()
    
    # 驗證必要的欄位
    required_fields = ['destination', 'start_date', 'end_date']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'缺少必要欄位: {field}'
            }), 400
    
    try:
        # 呼叫生成服務
        plan_data = gpt_generate_travel_plan(
            destination=data['destination'],
            start_date=data['start_date'],
            end_date=data['end_date'],
            budget=data.get('budget', '30000'),
            interests=data.get('interests', []),
            itinerary_preference=data.get('preference', '輕鬆'),
            travel_companions=data.get('companions', '個人')
        )
        
        # 使用 Google Places API 豐富旅行計劃
        try:
            # 檢查 Google Places API 金鑰是否有效
            if is_api_key_valid():
                logger.info(f"開始使用 Google Places API 豐富旅行計劃: {data['destination']}")
                plan_data = enrich_travel_plan(plan_data)
                logger.info("Google Places API 豐富旅行計劃完成")
            else:
                logger.warning("Google Places API 金鑰無效，將使用原始計劃")
        except Exception as e:
            logger.warning(f"豐富旅行計劃時發生錯誤，將使用原始計劃: {str(e)}")
        
        # 確保計劃有user_id (這可能已經在gpt_service.py中設置了，但為確保安全再次設置)
        plan_data['user_id'] = user_id
        
        # 確保預算和人數信息存在
        plan_data['budget'] = data.get('budget', '30000')  # 使用請求中的預算，默認為30000
        plan_data['travelers'] = data.get('travelers', 1)  # 使用請求中的人數，默認為1人
        
        # 記錄將要保存的預算和人數
        logger.info(f"準備保存旅行計劃 - 目的地: {data['destination']}, 預算: {plan_data['budget']}, 人數: {plan_data['travelers']}")
        
        # 存儲到數據庫
        plan_id, error = TravelPlan.create_plan(user_id, plan_data)
        if error:
            return jsonify({
                'success': False,
                'message': error
            }), 400
            
        return jsonify({
            'success': True,
            'message': '旅行計劃生成成功',
            'plan_id': str(plan_id)
        }), 201
        
    except Exception as e:
        logger.error(f"生成旅行計劃時發生錯誤: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'生成計劃時發生錯誤: {str(e)}'
        }), 500

@api_bp.route('/travel-plans/<plan_id>/activities', methods=['POST'])
@token_required
def add_activity(plan_id):
    """添加單一活動到旅行計劃中的指定天數
    
    預期的JSON格式:
    {
        "day_index": 0,  // 第幾天的索引 (從0開始)
        "activity": {
            "name": "活動名稱",
            "location": "地點",
            "type": "景點",
            "time": "09:00",
            "duration_minutes": 60,
            "lat": 25.123,
            "lng": 121.456,
            "place_id": "google_place_id",
            "address": "詳細地址",
            "rating": 4.5,
            "photos": ["photo_url1", "photo_url2"],
            "description": "活動描述"
        }
    }
    """
    user_id = request.user_id
    data = request.get_json()
    
    # 記錄API調用
    logger.info(f"[POST] /travel-plans/{plan_id}/activities - 用戶: {user_id}")
    
    # 檢查必要字段
    if not data or 'day_index' not in data or 'activity' not in data:
        logger.error("[add_activity] 缺少必要欄位：day_index 或 activity")
        return jsonify({
            'success': False,
            'message': '缺少必要欄位：day_index 或 activity'
        }), 400
    
    # 獲取旅行計劃
    plan = TravelPlan.find_by_id(plan_id)
    if not plan:
        logger.error(f"[add_activity] 找不到旅行計劃 ID: {plan_id}")
        return jsonify({
            'success': False,
            'message': '找不到旅行計劃'
        }), 404
    
    # 檢查權限
    if str(plan['user_id']) != user_id:
        logger.warning(f"[add_activity] 用戶 {user_id} 無權修改計劃 {plan_id}")
        return jsonify({
            'success': False,
            'message': '無權修改此旅行計劃'
        }), 403
    
    # 獲取活動數據
    day_index = int(data['day_index'])
    activity = data['activity']
    
    # 驗證日期索引是否有效
    if day_index < 0 or day_index >= len(plan['days']):
        logger.error(f"[add_activity] 無效的日期索引: {day_index}，有效範圍: 0-{len(plan['days'])-1}")
        return jsonify({
            'success': False,
            'message': f'無效的日期索引: {day_index}，有效範圍: 0-{len(plan["days"])-1}'
        }), 400
    
    # 確保活動有唯一ID
    if 'id' not in activity or not activity['id'] or activity['id'] == 'undefined':
        import uuid
        activity['id'] = str(uuid.uuid4())
        logger.info(f"[add_activity] 為新活動生成UUID: {activity['id']}")
    
    # 檢查活動ID是否為有效的UUID格式
    if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', activity['id'], re.I):
        # 如果不是UUID格式，重新生成一個UUID
        import uuid
        original_id = activity['id']
        activity['id'] = str(uuid.uuid4())
        logger.info(f"[add_activity] 活動ID不是有效的UUID格式，已將 {original_id} 替換為 {activity['id']}")
    
    # 添加活動到指定天數
    logger.info(f"[add_activity] 添加活動到第 {day_index+1} 天: {activity['name']}, ID: {activity['id']}")
    plan['days'][day_index]['activities'].append(activity)
    
    # 確保不包含 _id 欄位，避免 MongoDB 錯誤
    if "_id" in plan:
        logger.info(f"[add_activity] 從計劃數據中移除 _id 欄位，避免 MongoDB 錯誤")
        plan_copy = plan.copy()
        del plan_copy["_id"]
    else:
        plan_copy = plan
    
    # 更新旅行計劃
    success, error = TravelPlan.update_plan(plan_id, plan_copy, user_id)
    
    if not success:
        logger.error(f"[add_activity] 更新旅行計劃失敗: {error}")
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    return jsonify({
        'success': True,
        'message': '活動添加成功',
        'activity_id': activity['id']
    }), 201

@api_bp.route('/travel-plans/<plan_id>/activities/<activity_id>', methods=['PUT'])
@token_required
def update_activity(plan_id, activity_id):
    """更新旅行計劃中的特定活動
    
    預期的JSON格式:
    {
        "day_index": 0,  // 可選，如果活動需要移到其他天
        "activity": {
            "name": "更新的活動名稱",
            "location": "更新的地點",
            ...
        }
    }
    """
    user_id = request.user_id
    data = request.get_json()
    
    # 記錄API調用
    logger.info(f"[PUT] /travel-plans/{plan_id}/activities/{activity_id} - 用戶: {user_id}")
    
    # 檢查必要字段
    if not data or 'activity' not in data:
        logger.error("[update_activity] 缺少必要欄位：activity")
        return jsonify({
            'success': False,
            'message': '缺少必要欄位：activity'
        }), 400
    
    # 獲取旅行計劃
    plan = TravelPlan.find_by_id(plan_id)
    if not plan:
        logger.error(f"[update_activity] 找不到旅行計劃 ID: {plan_id}")
        return jsonify({
            'success': False,
            'message': '找不到旅行計劃'
        }), 404
    
    # 檢查權限
    if str(plan['user_id']) != user_id:
        logger.warning(f"[update_activity] 用戶 {user_id} 無權修改計劃 {plan_id}")
        return jsonify({
            'success': False,
            'message': '無權修改此旅行計劃'
        }), 403
    
    # 尋找活動
    activity_found = False
    source_day_index = None
    source_activity_index = None
    
    # 檢查是否是索引格式 (idx-X-Y)
    index_match = re.match(r'idx-(\d+)-(\d+)', activity_id)
    if index_match:
        day_idx = int(index_match.group(1))
        act_idx = int(index_match.group(2))
        
        logger.info(f"[update_activity] 檢測到索引格式: 天數索引={day_idx}, 活動索引={act_idx}")
        
        # 檢查索引是否有效
        if 0 <= day_idx < len(plan['days']):
            if plan['days'][day_idx].get('activities') and 0 <= act_idx < len(plan['days'][day_idx]['activities']):
                activity_found = True
                source_day_index = day_idx
                source_activity_index = act_idx
                logger.info(f"[update_activity] 通過索引找到活動: 天數索引={day_idx}, 活動索引={act_idx}")
            else:
                logger.warning(f"[update_activity] 在第 {day_idx+1} 天中找不到索引為 {act_idx} 的活動")
        else:
            logger.warning(f"[update_activity] 無效的天數索引: {day_idx}, 有效範圍: 0-{len(plan['days'])-1}")
    else:
        # 在所有天數中查找指定活動
        for day_i, day in enumerate(plan['days']):
            if not activity_found and day.get('activities'): 
                for act_i, act in enumerate(day['activities']):
                    if act.get('id') == activity_id:
                        activity_found = True
                        source_day_index = day_i
                        source_activity_index = act_i
                        logger.info(f"[update_activity] 通過ID找到活動: ID={activity_id}, 天數索引={day_i}, 活動索引={act_i}")
                        break
    
    if not activity_found:
        logger.warning(f"[update_activity] 找不到ID為 {activity_id} 的活動")
        return jsonify({
            'success': False,
            'message': f'找不到ID為 {activity_id} 的活動'
        }), 404
    
    # 獲取更新後的活動數據
    updated_activity = data['activity']
    
    # 確保保留原活動ID
    if not 'id' in updated_activity or not updated_activity['id'] or updated_activity['id'] == 'undefined':
        import uuid
        updated_activity['id'] = str(uuid.uuid4())
        logger.info(f"[update_activity] 為更新的活動生成新UUID: {updated_activity['id']}")
    elif updated_activity.get('id') != activity_id:
        logger.warning(f"[update_activity] 活動ID不一致，使用原ID: {activity_id}，而非: {updated_activity.get('id')}")
        updated_activity['id'] = activity_id
    
    # 檢查是否需要移動到其他天
    target_day_index = data.get('day_index', source_day_index)
    
    # 驗證目標日期索引是否有效
    if target_day_index < 0 or target_day_index >= len(plan['days']):
        logger.error(f"[update_activity] 無效的目標日期索引: {target_day_index}，有效範圍: 0-{len(plan['days'])-1}")
        return jsonify({
            'success': False,
            'message': f'無效的目標日期索引: {target_day_index}，有效範圍: 0-{len(plan["days"])-1}'
        }), 400
    
    # 如果需要移動到其他天
    if target_day_index != source_day_index:
        # 從原天數中移除活動
        removed_activity = plan['days'][source_day_index]['activities'].pop(source_activity_index)
        # 添加到目標天數
        plan['days'][target_day_index]['activities'].append(updated_activity)
        logger.info(f"[update_activity] 活動 {updated_activity['id']} 從第 {source_day_index+1} 天移動到第 {target_day_index+1} 天")
    else:
        # 在原天數中更新活動
        plan['days'][source_day_index]['activities'][source_activity_index] = updated_activity
        logger.info(f"[update_activity] 在第 {source_day_index+1} 天更新活動 {updated_activity['id']}")
    
    # 確保不包含 _id 欄位，避免 MongoDB 錯誤
    if "_id" in plan:
        logger.info(f"[update_activity] 從計劃數據中移除 _id 欄位，避免 MongoDB 錯誤")
        plan_copy = plan.copy()
        del plan_copy["_id"]
    else:
        plan_copy = plan
    
    # 更新旅行計劃
    success, error = TravelPlan.update_plan(plan_id, plan_copy, user_id)
    
    if not success:
        logger.error(f"[update_activity] 更新旅行計劃失敗: {error}")
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    logger.info(f"[update_activity] 成功更新活動 {updated_activity['id']}")
    return jsonify({
        'success': True,
        'message': '活動更新成功',
        'activity': updated_activity
    }), 200

@api_bp.route('/travel-plans/<plan_id>/activities/<activity_id>', methods=['DELETE'])
@token_required
def delete_activity(plan_id, activity_id):
    """從旅行計劃中刪除特定活動
    
    活動可以通過ID、名稱或位置索引來識別:
    - 如果activity_id是一個UUID，嘗試按ID匹配
    - 如果不是UUID，嘗試按活動名稱匹配
    - 如果格式為'idx-X-Y'（X是天數索引，Y是活動索引），則按位置刪除
    """
    user_id = request.user_id
    
    # 記錄API調用
    logger.info(f"[DELETE] /travel-plans/{plan_id}/activities/{activity_id} - 用戶: {user_id}")
    
    # 檢查參數有效性
    if not activity_id or activity_id == 'undefined':
        logger.error(f"[delete_activity] 請求刪除活動時提供了無效的活動ID: {activity_id}")
        return jsonify({
            'success': False,
            'message': '無效的活動ID',
            'error_code': 'invalid_activity_id'
        }), 400
    
    # 檢查計劃ID有效性
    if not plan_id or plan_id == 'undefined':
        logger.error(f"[delete_activity] 請求刪除活動時提供了無效的計劃ID: {plan_id}")
        return jsonify({
            'success': False,
            'message': '無效的計劃ID',
            'error_code': 'invalid_plan_id'
        }), 400
    
    # 獲取旅行計劃
    plan = TravelPlan.find_by_id(plan_id)
    if not plan:
        logger.error(f"[delete_activity] 找不到旅行計劃 ID: {plan_id}")
        return jsonify({
            'success': False,
            'message': '找不到旅行計劃',
            'error_code': 'plan_not_found'
        }), 404
    
    # 保存修改前的計劃副本用於記錄差異
    original_plan = {
        "days": [{"day": i+1, "activity_count": len(day.get("activities", [])), "activity_ids": [a.get("id") for a in day.get("activities", [])]} for i, day in enumerate(plan.get("days", []))]
    }
    
    # 詳細檢查權限
    plan_user_id = plan.get('user_id', '')
    plan_user_id_str = str(plan_user_id)
    logger.info(f"[delete_activity] 計劃擁有者ID: {plan_user_id_str}, 當前用戶ID: {user_id}")
    
    if plan_user_id_str != user_id:
        logger.warning(f"[delete_activity] 權限錯誤: 用戶 {user_id} 無權刪除計劃 {plan_id} 中的活動")
        logger.warning(f"[delete_activity] 權限詳情: 計劃擁有者={plan_user_id_str}, 請求用戶={user_id}, ID是否匹配={plan_user_id_str == user_id}")
        return jsonify({
            'success': False,
            'message': '您沒有權限修改此旅行計劃',
            'error_code': 'permission_denied'
        }), 403
    
    # 尋找活動
    activity_found = False
    deleted_activity = None
    activity_day_index = None
    activity_index = None
    
    # 檢查是否是索引格式 (idx-X-Y)
    index_match = re.match(r'idx-(\d+)-(\d+)', activity_id)
    if index_match:
        day_idx = int(index_match.group(1))
        act_idx = int(index_match.group(2))
        
        logger.info(f"[delete_activity] 檢測到索引格式: 天數索引={day_idx}, 活動索引={act_idx}")
        
        # 檢查索引是否有效
        if 0 <= day_idx < len(plan['days']):
            if plan['days'][day_idx].get('activities') and 0 <= act_idx < len(plan['days'][day_idx]['activities']):
                # 通過索引刪除
                deleted_activity = plan['days'][day_idx]['activities'].pop(act_idx)
                activity_found = True
                activity_day_index = day_idx
                activity_index = act_idx
                logger.info(f"[delete_activity] 已從第 {day_idx+1} 天刪除索引為 {act_idx} 的活動")
            else:
                logger.warning(f"[delete_activity] 在第 {day_idx+1} 天中找不到索引為 {act_idx} 的活動")
        else:
            logger.warning(f"[delete_activity] 無效的天數索引: {day_idx}, 有效範圍: 0-{len(plan['days'])-1}")
    else:
        # 檢查是否為UUID格式
        is_uuid_format = re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', activity_id, re.I)
        if is_uuid_format:
            logger.info(f"[delete_activity] 檢測到UUID格式的活動ID: {activity_id}")
        else:
            logger.info(f"[delete_activity] 非UUID格式的活動ID: {activity_id}，將嘗試按名稱匹配")
        
        # 嘗試依據ID或名稱查找活動
        for day_i, day in enumerate(plan['days']):
            if not activity_found and day.get('activities'):
                for act_i, act in enumerate(day['activities']):
                    # 檢查ID
                    if act.get('id') == activity_id:
                        deleted_activity = plan['days'][day_i]['activities'].pop(act_i)
                        activity_found = True
                        activity_day_index = day_i
                        activity_index = act_i
                        logger.info(f"[delete_activity] 已從第 {day_i+1} 天刪除ID為 {activity_id} 的活動")
                        break
                    # 如果沒有ID匹配，嘗試按名稱匹配
                    elif not is_uuid_format and act.get('name') == activity_id:
                        deleted_activity = plan['days'][day_i]['activities'].pop(act_i)
                        activity_found = True
                        activity_day_index = day_i
                        activity_index = act_i
                        logger.info(f"[delete_activity] 已從第 {day_i+1} 天刪除名稱為 '{activity_id}' 的活動")
                        break
    
    if not activity_found:
        logger.warning(f"[delete_activity] 找不到ID為 {activity_id} 的活動，無法刪除")
        return jsonify({
            'success': False,
            'message': f'找不到ID為 {activity_id} 的活動'
        }), 404
    
    # 更新旅行計劃前的計劃狀態
    modified_plan = {
        "days": [{"day": i+1, "activity_count": len(day.get("activities", [])), "activity_ids": [a.get("id") for a in day.get("activities", [])]} for i, day in enumerate(plan.get("days", []))]
    }
    
    # 記錄計劃活動變更的詳細信息
    logger.info(f"[delete_activity] 計劃 {plan_id} 修改前狀態: {original_plan}")
    logger.info(f"[delete_activity] 計劃 {plan_id} 修改後狀態: {modified_plan}")
    
    # 確保不包含 _id 欄位，避免 MongoDB 錯誤
    if "_id" in plan:
        logger.info(f"[delete_activity] 從計劃數據中移除 _id 欄位，避免 MongoDB 錯誤")
        plan_copy = plan.copy()
        del plan_copy["_id"]
    else:
        plan_copy = plan
        
    # 更新旅行計劃
    success, error = TravelPlan.update_plan(plan_id, plan_copy, user_id)
    
    if not success:
        logger.error(f"[delete_activity] 更新旅行計劃時發生錯誤: {error}")
        # 如果更新失敗，但我們確實找到並刪除了活動，這是一個奇怪的情況
        # 可能需要考慮回滾刪除操作
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    # 獲取更新後的計劃以確認刪除已應用到數據庫
    updated_plan = TravelPlan.find_by_id(plan_id)
    updated_plan_summary = {
        "days": [{"day": i+1, "activity_count": len(day.get("activities", [])), "activity_ids": [a.get("id") for a in day.get("activities", [])]} for i, day in enumerate(updated_plan.get("days", []))]
    }
    logger.info(f"[delete_activity] 計劃 {plan_id} 更新後數據庫狀態: {updated_plan_summary}")
    
    # 驗證活動是否確實從數據庫中刪除
    is_activity_still_present = False
    for day in updated_plan.get("days", []):
        if any(act.get("id") == activity_id for act in day.get("activities", [])):
            is_activity_still_present = True
            break
    
    if is_activity_still_present:
        logger.error(f"[delete_activity] 警告：儘管操作成功，活動 {activity_id} 仍存在於數據庫中!")
    
    # 返回被刪除的活動信息，以便前端確認
    response_data = {
        'success': True,
        'message': '活動刪除成功',
        'db_verification': not is_activity_still_present  # 表示數據庫驗證結果
    }
    
    # 添加被刪除的活動信息
    if deleted_activity:
        response_data['deleted_activity'] = {
            'id': deleted_activity.get('id', ''),
            'name': deleted_activity.get('name', '未命名活動'),
            'day_index': activity_day_index,
            'activity_index': activity_index
        }
    
    logger.info(f"[delete_activity] 成功刪除活動並更新旅行計劃")
    return jsonify(response_data), 200

# 添加新的API路由，支持基於索引的活動刪除
@api_bp.route('/travel-plans/<plan_id>/days/<int:day_index>/activities/<int:activity_index>', methods=['DELETE'])
@token_required
def delete_activity_by_index(plan_id, day_index, activity_index):
    """基於天數索引和活動索引刪除活動
    
    允許直接使用索引位置刪除活動，無需知道活動ID
    """
    user_id = request.user_id
    
    # 記錄索引刪除請求
    logger.info(f"收到基於索引的活動刪除請求: 計劃ID={plan_id}, 天數索引={day_index}, 活動索引={activity_index}")
    
    # 獲取旅行計劃
    plan = TravelPlan.find_by_id(plan_id)
    if not plan:
        logger.error(f"找不到旅行計劃 ID: {plan_id}")
        return jsonify({
            'success': False,
            'message': '找不到旅行計劃'
        }), 404
    
    # 檢查權限
    if str(plan['user_id']) != user_id:
        logger.warning(f"用戶 {user_id} 無權刪除計劃 {plan_id} 中的活動")
        return jsonify({
            'success': False,
            'message': '無權修改此旅行計劃',
            'error_code': 'permission_denied'
        }), 403
    
    # 檢查索引是否有效
    if day_index < 0 or day_index >= len(plan['days']):
        logger.error(f"無效的天數索引: {day_index}, 有效範圍為 0-{len(plan['days'])-1}")
        return jsonify({
            'success': False,
            'message': f'無效的天數索引: {day_index}, 有效範圍為 0-{len(plan["days"])-1}'
        }), 400
    
    # 檢查活動索引是否有效
    if 'activities' not in plan['days'][day_index]:
        plan['days'][day_index]['activities'] = []
    
    if activity_index < 0 or activity_index >= len(plan['days'][day_index]['activities']):
        logger.error(f"無效的活動索引: {activity_index}, 有效範圍為 0-{len(plan['days'][day_index]['activities'])-1}")
        return jsonify({
            'success': False,
            'message': f'無效的活動索引: {activity_index}, 有效範圍為 0-{len(plan["days"][day_index]["activities"])-1}'
        }), 400
    
    # 刪除指定索引的活動
    deleted_activity = plan['days'][day_index]['activities'].pop(activity_index)
    logger.info(f"已從計劃 {plan_id} 的第 {day_index+1} 天刪除索引為 {activity_index} 的活動")
    
    # 確保不包含 _id 欄位，避免 MongoDB 錯誤
    if "_id" in plan:
        logger.info(f"[delete_activity_by_index] 從計劃數據中移除 _id 欄位，避免 MongoDB 錯誤")
        plan_copy = plan.copy()
        del plan_copy["_id"]
    else:
        plan_copy = plan
    
    # 更新旅行計劃
    success, error = TravelPlan.update_plan(plan_id, plan_copy, user_id)
    
    if not success:
        logger.error(f"更新旅行計劃失敗: {error}")
        return jsonify({
            'success': False,
            'message': error
        }), 400
    
    return jsonify({
        'success': True,
        'message': f'活動已成功刪除',
        'deleted_activity': deleted_activity
    }), 200 