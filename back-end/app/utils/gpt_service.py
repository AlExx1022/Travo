import os
import json
import requests
from datetime import datetime, timedelta
import logging
from typing import List, Dict, Any
from app.config.config import get_config
from app.utils.google_places_service import enrich_travel_plan

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
    
    # 將預算轉換為TWD格式
    budget_map = {
        "低": "10000-20000",
        "中": "20000-40000",
        "高": "40000以上"
    }
    budget_twd = budget_map.get(budget, "20000-40000") + "TWD"
    
    # 將行程偏好轉換為適當格式
    preference = itinerary_preference
    
    # 格式化興趣列表
    interests_str = "、".join(interests)
    
    # 創建提示
    prompt = """
    你是一位專業的旅遊行程規劃師，請根據以下條件設計 **{days} 天的 {destination} 旅遊行程**，並以 **JSON 格式** 輸出，確保符合使用者的興趣與需求。  

    ### **使用者需求**  
    - **目的地**：{destination}  
    - **旅行天數**：{days}天  
    - **預算**：{budget_twd}（請根據預算選擇合適的體驗）  
    - **興趣**：{interests_str}（請根據這些興趣挑選景點和活動）  
    - **行程偏好**：{preference}（輕鬆：2~3 個行程/天，緊湊：3~4 個行程/天，無限制：可安排更多）  
    - **旅行對象**：{travel_companions}（請根據對象調整推薦，例如親子友善、浪漫行程等）  

    ### **輸出格式**
    請直接輸出 **JSON**，結構如下：
    ```json
    {{
      "title": "{destination}{days}日遊",
      "summary": "這是一個為期{days}天的{destination}旅行計畫，專注於{interests_str}。行程安排{preference}，適合{travel_companions}。",
      "days": [
        {{
          "day": 1,
          "date": "YYYY-MM-DD",
          "summary": "第1天的行程簡介，包含主要景點和活動。",
          "schedule": [
            {{
              "time": "09:00",
              "name": "景點名稱",
              "type": "景點/餐廳/文化體驗/購物",
              "lat": 35.6655,
              "lng": 139.7707,
              "description": "簡短的景點描述，包括特色和推薦理由。"
            }}
          ]
        }}
      ],
      "transportation": {{
        "arrival": {{
          "type": "飛機/火車/巴士",
          "details": "到達交通的詳細資訊"
        }},
        "departure": {{
          "type": "飛機/火車/巴士",
          "details": "離開交通的詳細資訊"
        }},
        "local": {{
          "options": [
            {{
              "type": "地鐵/巴士/計程車",
              "details": "當地交通選項的詳細資訊"
            }}
          ]
        }}
      }},
      "accommodation": {{
        "name": "推薦住宿名稱",
        "address": "住宿地址",
        "lat": 35.6895,
        "lng": 139.6917,
        "description": "住宿描述，包括特色和推薦理由"
      }},
      "budget_estimate": {{
        "currency": "TWD",
        "accommodation": 15000,
        "transportation": 5000,
        "food": 10000,
        "activities": 8000,
        "shopping": 7000,
        "total": 45000,
        "per_person": 22500,
        "notes": "預算估計說明"
      }},
      "weather_forecast": {{
        "average_temperature": "預計平均溫度",
        "conditions": "天氣狀況描述",
        "packing_tips": "根據天氣的打包建議"
      }},
      "additional_info": {{
        "local_customs": "當地習俗和禮儀提示",
        "emergency_contacts": {{
          "police": "警察電話",
          "ambulance": "救護車電話",
          "tourist_information": "旅遊資訊中心電話"
        }},
        "useful_phrases": [
          {{
            "japanese": "こんにちは",
            "pronunciation": "Konnichiwa",
            "meaning": "你好"
          }}
        ]
      }}
    }}
    ```

    請注意以下要點：
    1. 每天安排的景點數量應符合用戶的行程偏好
    2. 景點選擇應考慮用戶的興趣和預算
    3. 提供每個景點的經緯度座標（盡可能準確）
    4. 為每天的行程提供簡短摘要
    5. 提供合理的交通、住宿和預算建議
    6. 根據目的地提供實用的天氣和文化資訊

    請直接輸出JSON格式，不要添加其他說明文字。
    """.format(
        days=days,
        destination=destination,
        budget_twd=budget_twd,
        interests_str=interests_str,
        preference=preference,
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
    
    # 生成計畫ID（這將被MongoDB的_id取代，但保留供內部使用）
    plan_id = f"plan_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # 添加元數據
    current_time = datetime.now()
    
    # 添加計畫ID和用戶ID（如果尚未存在）
    if "plan_id" not in travel_plan:
        travel_plan["plan_id"] = plan_id
    
    # 添加標準元數據字段
    travel_plan["title"] = travel_plan.get("title", f"{destination}{days}日遊")
    travel_plan["destination"] = destination
    travel_plan["start_date"] = start_date
    travel_plan["end_date"] = end_date
    travel_plan["duration_days"] = days
    travel_plan["budget"] = budget
    travel_plan["interests"] = interests
    travel_plan["itinerary_preference"] = itinerary_preference
    travel_plan["travel_companions"] = travel_companions
    travel_plan["created_at"] = current_time
    travel_plan["updated_at"] = current_time
    travel_plan["is_public"] = False
    travel_plan["version"] = 1
    
    # 添加日期到每天的行程中（如果尚未存在）
    if "days" in travel_plan:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        for i, day in enumerate(travel_plan["days"]):
            if "date" not in day or not day["date"]:
                day_date = start_dt + timedelta(days=i)
                day["date"] = day_date.strftime("%Y-%m-%d")
    
    # 添加豐富的地點資訊
    enriched_plan = enrich_travel_plan(travel_plan)
    return enriched_plan 