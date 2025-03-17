from flask import Blueprint, request, jsonify
from app.utils.gpt_service import generate_travel_plan

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/generate_plan', methods=['POST'])
def generate_plan():
    """
    根據使用者輸入產生旅遊計畫
    
    預期的JSON格式:
    {
        "destination": "東京",
        "travel_dates": {
            "start": "2023-10-01",
            "end": "2023-10-05"
        },
        "budget": "中",
        "interests": ["歷史", "美食", "文化體驗"],
        "itinerary_preference": "輕鬆",
        "travel_companions": "家庭"
    }
    """
    try:
        data = request.get_json()
        
        # 驗證必要的欄位
        required_fields = ['destination', 'travel_dates', 'budget', 'interests', 'itinerary_preference', 'travel_companions']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"缺少必要欄位: {field}"}), 400
        
        # 計算旅行天數
        start_date = data['travel_dates']['start']
        end_date = data['travel_dates']['end']
        
        # 呼叫GPT服務生成旅遊計畫
        travel_plan = generate_travel_plan(
            destination=data['destination'],
            start_date=start_date,
            end_date=end_date,
            budget=data['budget'],
            interests=data['interests'],
            itinerary_preference=data['itinerary_preference'],
            travel_companions=data['travel_companions']
        )
        
        return jsonify(travel_plan), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@api_bp.route('/get_plan/<plan_id>', methods=['GET'])
def get_plan(plan_id):
    """取得指定ID的旅遊計畫"""
    # 這裡將來會從資料庫獲取計畫
    return jsonify({"message": "此功能尚未實現"}), 501

@api_bp.route('/update_plan/<plan_id>', methods=['PUT'])
def update_plan(plan_id):
    """更新指定ID的旅遊計畫"""
    # 這裡將來會更新資料庫中的計畫
    return jsonify({"message": "此功能尚未實現"}), 501

@api_bp.route('/delete_plan/<plan_id>', methods=['DELETE'])
def delete_plan(plan_id):
    """刪除指定ID的旅遊計畫"""
    # 這裡將來會從資料庫刪除計畫
    return jsonify({"message": "此功能尚未實現"}), 501 