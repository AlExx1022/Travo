import os
import json
import requests
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any
from app.config.config import get_config
from app.utils.google_places_service import enrich_travel_plan
import uuid

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 獲取配置
config = get_config()

# OpenAI API設置
OPENAI_API_KEY = config.OPENAI_API_KEY
OPENAI_API_URL = config.OPENAI_API_URL

def calculate_days(start_date: str, end_date: str) -> int:
    """計算旅行天數"""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    return (end - start).days + 1

def create_prompt(destination: str, days: int, budget: str, 
                 interests: List[str], itinerary_preference: str, 
                 travel_companions: str) -> str:
    """創建發送給GPT的提示"""
    
    # 格式化興趣列表
    interests_str = "、".join(interests)
    
    # 創建提示
    prompt = """
    你是一位專業的旅遊行程規劃師，請根據以下條件設計 **{days} 天的 {destination} 旅遊行程**，並以 **JSON 格式** 輸出，確保符合使用者的興趣與需求。  

    ### **使用者需求**  
    - **目的地**：{destination}  
    - **旅行日期**：{days}天  
    - **預算**：{budget}TWD（請根據預算選擇合適的體驗）  
    - **興趣**：{interests_str}（請根據這些興趣挑選景點和活動）  
    - **行程偏好**：{preference}（輕鬆：2~3 個行程/天，緊湊：3~4 個行程/天，無限制：可安排更多）  
    - **旅行對象**：{travel_companions}（請根據對象調整推薦，例如親子友善、浪漫行程等）  

    ### **輸出格式**
    請直接輸出 **JSON**，結構如下：
    ```json
    {{
      "days": [
        {{
          "day": 1,
          "schedule": [
            {{
              "time": "08:00",
              "type": "景點/餐廳",
              "name": "名稱",
              "lat": 35.6655,
              "lng": 139.7707
            }}
          ]
        }}
      ]
    }}
    ```
    """.format(
        days=days,
        destination=destination,
        budget=budget,
        interests_str=interests_str,
        preference=itinerary_preference,
        travel_companions=travel_companions
    )
    
    return prompt

def call_openai_api(prompt: str) -> Dict[str, Any]:
    """呼叫OpenAI API生成旅遊計畫"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENAI_API_KEY}"
    }
    
    data = {
        "model": "gpt-4-turbo",
        "messages": [
            {"role": "system", "content": "你是一位專業的旅遊規劃師，擅長根據使用者需求創建詳細的旅遊行程。"},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "max_tokens": 4000
    }
    
    try:
        response = requests.post(OPENAI_API_URL, headers=headers, json=data)
        response.raise_for_status()
        
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        
        # 嘗試從回應中提取JSON
        try:
            # 找到JSON部分
            json_start = content.find('{')
            json_end = content.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = content[json_start:json_end]
                return json.loads(json_str)
            else:
                logger.error(f"無法從回應中找到JSON: {content}")
                return {"error": "無法解析回應"}
        except json.JSONDecodeError as e:
            logger.error(f"JSON解析錯誤: {e}, 原始內容: {content}")
            return {"error": "無法解析回應", "raw_content": content}
            
    except requests.exceptions.RequestException as e:
        logger.error(f"API請求錯誤: {e}")
        return {"error": f"API請求錯誤: {str(e)}"}

def generate_travel_plan(destination: str, start_date: str, end_date: str, 
                        budget: str, interests: List[str], 
                        itinerary_preference: str, travel_companions: str) -> Dict[str, Any]:
    """生成完整的旅遊計畫"""
    # 計算旅行天數
    days = calculate_days(start_date, end_date)
    
    # 創建提示
    prompt = create_prompt(
        destination=destination,
        days=days,
        budget=budget,
        interests=interests,
        itinerary_preference=itinerary_preference,
        travel_companions=travel_companions
    )
    
    # 呼叫OpenAI API
    travel_plan = call_openai_api(prompt)
    
    # 添加必要的字段
    plan_id = f"plan_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    current_time = datetime.now()
    
    # 轉換簡化的數據結構為需要的格式
    days_data = travel_plan.get("days", [])
    
    # 添加標準元數據字段
    result = {
        "plan_id": plan_id,
        "title": f"{destination}{days}日遊",
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "duration_days": days,
        "budget": budget,
        "interests": interests,
        "itinerary_preference": itinerary_preference,
        "travel_companions": travel_companions,
        "created_at": current_time,
        "updated_at": current_time,
        "is_public": False,
        "version": 1,
        "days": [],
    }
    
    # 處理日程安排
    if days_data:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        
        for i, day_data in enumerate(days_data):
            day_date = start_dt + timedelta(days=i)
            date_str = day_date.strftime("%Y-%m-%d")
            
            # 創建符合後端結構的日程
            day = {
                "date": date_str,
                "day": day_data.get("day", i + 1),
                "activities": []
            }
            
            # 處理行程
            schedule = day_data.get("schedule", [])
            for item in schedule:
                # 為每個活動分配唯一的 UUID
                activity_id = str(uuid.uuid4())
                
                activity = {
                    "id": activity_id,  # 添加唯一ID
                    "time": item.get("time", ""),
                    "name": item.get("name", ""),
                    "location": f"{item.get('name', '')}",
                    "description": "",
                    "lat": item.get("lat", 0),
                    "lng": item.get("lng", 0),
                    "type": item.get("type", "景點"),
                    "duration_minutes": 60,  # 預設活動時長
                    "place_id": "",  # 預設空的place_id
                    "address": "",  # 預設空地址
                    "photos": []  # 預設空照片列表
                }
                
                # 記錄活動ID的生成
                logger.info(f"為新活動 '{activity['name']}' 生成UUID: {activity_id}")
                
                day["activities"].append(activity)
            
            result["days"].append(day)
    
    return result 