import requests
import logging
import os
from typing import Dict, Any, List, Optional
from app.config.config import get_config
from datetime import datetime

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 獲取配置
config = get_config()

# Google Places API設置
GOOGLE_PLACES_API_KEY = config.GOOGLE_PLACES_API_KEY
PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
PLACES_PHOTO_URL = "https://maps.googleapis.com/maps/api/place/photo"

logger.info(f"Google Places API Key: {GOOGLE_PLACES_API_KEY[:5]}...{GOOGLE_PLACES_API_KEY[-5:]}")

def is_api_key_valid() -> bool:
    """檢查API金鑰是否有效"""
    # 使用簡單的請求測試API金鑰
    params = {
        "query": "Tokyo Tower",
        "key": GOOGLE_PLACES_API_KEY
    }
    
    try:
        response = requests.get(PLACES_SEARCH_URL, params=params)
        result = response.json()
        
        if result.get("status") == "REQUEST_DENIED":
            logger.warning(f"API金鑰無效或未授權: {result.get('error_message')}")
            return False
        else:
            logger.info(f"API金鑰有效，回應狀態: {result.get('status')}")
            return True
    except Exception as e:
        logger.error(f"測試API金鑰時發生錯誤: {e}")
        return False

def search_place(place_name: str, destination: str) -> Optional[Dict[str, Any]]:
    """
    使用Google Places API搜索地點
    
    Args:
        place_name: 景點名稱
        destination: 目的地（城市或地區）
    
    Returns:
        包含地點資訊的字典，如果未找到則返回None
    """
    # 構建查詢字符串（結合目的地和景點名稱）
    query = f"{destination} {place_name}"
    logger.info(f"搜索地點: {query}")
    
    # 設置請求參數
    params = {
        "query": query,
        "key": GOOGLE_PLACES_API_KEY
    }
    
    try:
        # 發送請求
        logger.info(f"發送請求到: {PLACES_SEARCH_URL}")
        response = requests.get(PLACES_SEARCH_URL, params=params)
        response.raise_for_status()
        
        # 解析回應
        result = response.json()
        logger.info(f"搜索地點回應狀態: {result.get('status')}")
        
        # 檢查是否有結果
        if result["status"] == "OK" and len(result["results"]) > 0:
            # 返回第一個結果
            logger.info(f"找到地點: {result['results'][0].get('name')}")
            return result["results"][0]
        else:
            logger.warning(f"未找到地點: {query}, 狀態: {result.get('status')}, 錯誤信息: {result.get('error_message', '無')}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"搜索地點時發生錯誤: {e}")
        return None

def get_place_details(place_id: str) -> Optional[Dict[str, Any]]:
    """
    使用Google Places API獲取地點詳細資訊
    
    Args:
        place_id: Google Places API的地點ID
    
    Returns:
        包含地點詳細資訊的字典，如果未找到則返回None
    """
    logger.info(f"獲取地點詳細資訊: {place_id}")
    
    # 設置請求參數
    params = {
        "place_id": place_id,
        "fields": "name,rating,formatted_address,opening_hours,photos,reviews,website,formatted_phone_number,price_level,types",
        "key": GOOGLE_PLACES_API_KEY
    }
    
    try:
        # 發送請求
        logger.info(f"發送請求到: {PLACES_DETAILS_URL}")
        response = requests.get(PLACES_DETAILS_URL, params=params)
        response.raise_for_status()
        
        # 解析回應
        result = response.json()
        logger.info(f"獲取地點詳細資訊回應狀態: {result.get('status')}")
        
        # 檢查是否有結果
        if result["status"] == "OK":
            # 返回結果
            logger.info(f"找到地點詳細資訊: {result['result'].get('name')}")
            return result["result"]
        else:
            logger.warning(f"未找到地點詳細資訊: {place_id}, 狀態: {result.get('status')}, 錯誤信息: {result.get('error_message', '無')}")
            return None
            
    except requests.exceptions.RequestException as e:
        logger.error(f"獲取地點詳細資訊時發生錯誤: {e}")
        return None

def get_photo_url(photo_reference: str, max_width: int = 400) -> Optional[str]:
    """
    構建Google Places API照片URL
    
    Args:
        photo_reference: 照片參考ID
        max_width: 照片最大寬度
    
    Returns:
        照片URL
    """
    # 構建照片URL
    photo_url = f"{PLACES_PHOTO_URL}?maxwidth={max_width}&photoreference={photo_reference}&key={GOOGLE_PLACES_API_KEY}"
    logger.info(f"構建照片URL: {photo_url[:50]}...")
    return photo_url

def get_place_description(place_name: str, place_type: str) -> str:
    """
    生成地點描述
    
    Args:
        place_name: 地點名稱
        place_type: 地點類型
    
    Returns:
        地點描述
    """
    # 這裡可以使用更複雜的邏輯，例如調用OpenAI API生成描述
    # 目前使用簡單的模板
    type_descriptions = {
        "景點": f"{place_name}是京都著名的景點，吸引了眾多遊客前來參觀。",
        "餐廳": f"{place_name}是一家提供美味料理的餐廳，可以品嚐到當地特色美食。",
        "文化體驗": f"{place_name}提供豐富的文化體驗活動，讓遊客深入了解京都傳統文化。",
        "購物": f"{place_name}是一個理想的購物場所，提供各種紀念品和當地特產。"
    }
    
    return type_descriptions.get(place_type, f"{place_name}是一個值得遊覽的地方。")

def get_place_tips(place_type: str) -> str:
    """
    生成地點參觀提示
    
    Args:
        place_type: 地點類型
    
    Returns:
        參觀提示
    """
    tips = {
        "景點": "建議在上午參觀以避開人潮，參觀時間約需1-2小時。",
        "餐廳": "推薦品嚐當地特色料理，用餐高峰期可能需要等位。",
        "文化體驗": "建議提前預約，穿著舒適的衣物參加體驗活動。",
        "購物": "比較價格後再購買，部分商店可能提供退稅服務。"
    }
    
    return tips.get(place_type, "建議提前查詢開放時間，做好行程安排。")

def get_place_tags(place_type: str, place_details: Dict[str, Any]) -> List[str]:
    """
    生成地點標籤
    
    Args:
        place_type: 地點類型
        place_details: 地點詳細資訊
    
    Returns:
        標籤列表
    """
    tags = []
    
    # 添加基本標籤
    if place_type == "景點":
        tags.append("景點")
    elif place_type == "餐廳":
        tags.append("美食")
        if place_details.get("price_level"):
            price_tags = {1: "經濟實惠", 2: "中等價位", 3: "高級餐廳", 4: "豪華餐廳"}
            tags.append(price_tags.get(place_details.get("price_level"), ""))
    elif place_type == "文化體驗":
        tags.append("文化體驗")
    
    # 從Google Places API的類型中提取標籤
    if place_details.get("types"):
        type_mapping = {
            "tourist_attraction": "旅遊景點",
            "temple": "寺廟",
            "shrine": "神社",
            "museum": "博物館",
            "park": "公園",
            "restaurant": "餐廳",
            "cafe": "咖啡廳",
            "shopping_mall": "購物中心",
            "store": "商店"
        }
        
        for place_type in place_details.get("types", []):
            if place_type in type_mapping:
                tags.append(type_mapping[place_type])
    
    # 去除重複標籤
    return list(set(tags))

def estimate_duration(place_type: str) -> int:
    """
    估計停留時間（分鐘）
    
    Args:
        place_type: 地點類型
    
    Returns:
        預計停留時間（分鐘）
    """
    durations = {
        "景點": 120,  # 2小時
        "餐廳": 90,   # 1.5小時
        "文化體驗": 150,  # 2.5小時
        "購物": 60    # 1小時
    }
    
    return durations.get(place_type, 90)

def enrich_place_info(place_name: str, destination: str, lat: float, lng: float, place_type: str) -> Dict[str, Any]:
    """
    豐富景點資訊
    
    Args:
        place_name: 景點名稱
        destination: 目的地（城市或地區）
        lat: 緯度
        lng: 經度
        place_type: 地點類型
    
    Returns:
        包含豐富資訊的景點字典
    """
    logger.info(f"豐富景點資訊: {place_name}, {destination}")
    
    # 初始化豐富的景點資訊
    enriched_place = {
        "name": place_name,
        "type": place_type,
        "duration_minutes": estimate_duration(place_type),
        "lat": lat,
        "lng": lng,
        "place_id": None,
        "address": None,
        "rating": None,
        "opening_hours": None,
        "photos": [],
        "thumbnail": None,
        "website": None,
        "phone": None,
        "price_level": None,
        "description": get_place_description(place_name, place_type),
        "tips": get_place_tips(place_type),
        "tags": []
    }
    
    # 搜索地點
    place_result = search_place(place_name, destination)
    
    if place_result:
        logger.info(f"成功搜索到地點: {place_name}")
        
        # 更新經緯度（使用更準確的值）
        if "geometry" in place_result and "location" in place_result["geometry"]:
            enriched_place["lat"] = place_result["geometry"]["location"]["lat"]
            enriched_place["lng"] = place_result["geometry"]["location"]["lng"]
            logger.info(f"更新經緯度: {enriched_place['lat']}, {enriched_place['lng']}")
        
        # 獲取地點ID
        place_id = place_result.get("place_id")
        enriched_place["place_id"] = place_id
        
        if place_id:
            logger.info(f"獲取到地點ID: {place_id}")
            
            # 獲取地點詳細資訊
            place_details = get_place_details(place_id)
            
            if place_details:
                logger.info(f"成功獲取地點詳細資訊: {place_name}")
                
                # 更新地址
                enriched_place["address"] = place_details.get("formatted_address")
                logger.info(f"地址: {enriched_place['address']}")
                
                # 更新評分
                enriched_place["rating"] = place_details.get("rating")
                logger.info(f"評分: {enriched_place['rating']}")
                
                # 更新營業時間
                if "opening_hours" in place_details and "weekday_text" in place_details["opening_hours"]:
                    enriched_place["opening_hours"] = place_details["opening_hours"]["weekday_text"]
                    logger.info(f"營業時間: {enriched_place['opening_hours']}")
                
                # 更新照片
                if "photos" in place_details:
                    for photo in place_details["photos"][:3]:  # 最多取3張照片
                        photo_reference = photo.get("photo_reference")
                        if photo_reference:
                            photo_url = get_photo_url(photo_reference)
                            enriched_place["photos"].append(photo_url)
                    
                    # 設置縮略圖（使用第一張照片，但寬度較小）
                    if place_details["photos"] and place_details["photos"][0].get("photo_reference"):
                        thumbnail_reference = place_details["photos"][0].get("photo_reference")
                        enriched_place["thumbnail"] = get_photo_url(thumbnail_reference, max_width=200)
                    
                    logger.info(f"照片數量: {len(enriched_place['photos'])}")
                
                # 更新網站
                enriched_place["website"] = place_details.get("website")
                logger.info(f"網站: {enriched_place['website']}")
                
                # 更新電話
                enriched_place["phone"] = place_details.get("formatted_phone_number")
                logger.info(f"電話: {enriched_place['phone']}")
                
                # 更新價格等級
                enriched_place["price_level"] = place_details.get("price_level")
                logger.info(f"價格等級: {enriched_place['price_level']}")
                
                # 生成標籤
                enriched_place["tags"] = get_place_tags(place_type, place_details)
                logger.info(f"標籤: {enriched_place['tags']}")
            else:
                logger.warning(f"未能獲取地點詳細資訊: {place_name}")
        else:
            logger.warning(f"未獲取到地點ID: {place_name}")
    else:
        logger.warning(f"未能搜索到地點: {place_name}")
    
    return enriched_place

def enrich_travel_plan(travel_plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    豐富整個旅遊計畫
    
    Args:
        travel_plan: 原始旅遊計畫
    
    Returns:
        豐富後的旅遊計畫
    """
    # 獲取目的地
    destination = travel_plan["metadata"]["destination"]
    logger.info(f"開始豐富旅遊計畫: {destination}")
    
    # 創建新的旅遊計畫結構
    enriched_plan = {
        "plan_id": travel_plan.get("plan_id", f"plan_{datetime.now().strftime('%Y%m%d%H%M%S')}"),
        "user_id": travel_plan.get("user_id", "anonymous"),
        "title": travel_plan.get("title", f"{destination}旅遊計畫"),
        "metadata": {
            "destination": destination,
            "start_date": travel_plan["metadata"]["start_date"],
            "end_date": travel_plan["metadata"]["end_date"],
            "duration_days": len(travel_plan["days"]),
            "budget": travel_plan["metadata"]["budget"],
            "interests": travel_plan["metadata"]["interests"],
            "itinerary_preference": travel_plan["metadata"]["itinerary_preference"],
            "travel_companions": travel_plan["metadata"]["travel_companions"],
            "created_at": travel_plan["metadata"].get("created_at", datetime.now().isoformat()),
            "updated_at": datetime.now().isoformat(),
            "is_public": travel_plan["metadata"].get("is_public", False),
            "version": "1.0"
        },
        "summary": travel_plan.get("summary", f"這是一個{len(travel_plan['days'])}天的{destination}旅行計畫，專注於{', '.join(travel_plan['metadata']['interests'])}。行程安排{travel_plan['metadata']['itinerary_preference']}，適合{travel_plan['metadata']['travel_companions']}。"),
        "days": []
    }
    
    # 遍歷每天的行程
    for day_data in travel_plan["days"]:
        day_number = day_data["day"]
        logger.info(f"處理第 {day_number} 天")
        
        # 計算日期
        # 這裡假設start_date格式為YYYY-MM-DD
        
        # 創建新的日程結構
        enriched_day = {
            "day": day_number,
            "date": day_data.get("date", ""),  # 如果原始數據中有日期則使用，否則留空
            "summary": day_data.get("summary", f"第{day_number}天的行程"),
            "schedule": []
        }
        
        # 遍歷每個景點
        for i, place in enumerate(day_data["schedule"]):
            logger.info(f"處理景點 {i+1}: {place['name']}")
            
            # 豐富景點資訊
            enriched_place = enrich_place_info(
                place_name=place["name"],
                destination=destination,
                lat=place.get("lat", 0),
                lng=place.get("lng", 0),
                place_type=place.get("type", "景點")
            )
            
            # 保留原始的時間
            enriched_place["time"] = place["time"]
            
            # 添加到日程中
            enriched_day["schedule"].append(enriched_place)
        
        # 添加到計畫中
        enriched_plan["days"].append(enriched_day)
    
    # 添加交通、住宿、預算和其他資訊
    # 這些資訊可以從原始計畫中獲取，或者使用默認值
    
    enriched_plan["transportation"] = travel_plan.get("transportation", {
        "arrival": {
            "type": "未指定",
            "details": "未提供到達交通資訊"
        },
        "departure": {
            "type": "未指定",
            "details": "未提供離開交通資訊"
        },
        "local": {
            "options": [
                {
                    "type": "公共交通",
                    "details": "可使用當地公共交通系統"
                }
            ]
        }
    })
    
    enriched_plan["accommodation"] = travel_plan.get("accommodation", {
        "name": "未指定",
        "address": "未提供住宿資訊",
        "lat": 0,
        "lng": 0,
        "rating": None,
        "price_level": None,
        "website": None,
        "phone": None,
        "description": "未提供住宿詳細資訊"
    })
    
    enriched_plan["budget_estimate"] = travel_plan.get("budget_estimate", {
        "currency": "JPY",
        "accommodation": 0,
        "transportation": 0,
        "food": 0,
        "activities": 0,
        "shopping": 0,
        "total": 0,
        "per_person": 0,
        "notes": "未提供預算估計"
    })
    
    enriched_plan["weather_forecast"] = travel_plan.get("weather_forecast", {
        "average_temperature": "未知",
        "conditions": "未提供天氣資訊",
        "packing_tips": "建議查詢最新天氣預報"
    })
    
    enriched_plan["additional_info"] = travel_plan.get("additional_info", {
        "local_customs": "請尊重當地習俗和文化",
        "emergency_contacts": {
            "police": "110",
            "ambulance": "119",
            "tourist_information": "未提供"
        },
        "useful_phrases": []
    })
    
    return enriched_plan 