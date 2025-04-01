import requests
import logging
import os
from typing import Dict, Any, List, Optional
from app.config.config import get_config
from datetime import datetime
import uuid
import re

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

# 簡單的緩存機制
place_search_cache = {}  # 用於存儲地點搜索結果
place_details_cache = {}  # 用於存儲地點詳細信息

def is_api_key_valid(max_retries: int = 2) -> bool:
    """
    檢查API金鑰是否有效
    
    Args:
        max_retries: 最大重試次數
    
    Returns:
        如果API金鑰有效返回True，否則返回False
    """
    # 使用簡單的請求測試API金鑰
    logger.info(f"開始檢查Google Places API金鑰 {GOOGLE_PLACES_API_KEY[:5]}...{GOOGLE_PLACES_API_KEY[-5:]} 有效性")
    
    if not GOOGLE_PLACES_API_KEY:
        logger.error("未設置Google Places API金鑰")
        return False
    
    # 測試不同的知名地標，如果一個失敗，嘗試另一個
    test_landmarks = ["Tokyo Tower", "Eiffel Tower", "Statue of Liberty"]
    
    for attempt in range(max_retries):
        for landmark in test_landmarks:
            try:
                params = {
                    "query": landmark,
                    "key": GOOGLE_PLACES_API_KEY
                }
                
                logger.info(f"嘗試使用地標 '{landmark}' 測試API金鑰 (嘗試 {attempt+1}/{max_retries})")
                response = requests.get(PLACES_SEARCH_URL, params=params, timeout=10)  # 添加超時
                result = response.json()
                
                if result.get("status") == "OK":
                    logger.info(f"API金鑰有效，使用地標 '{landmark}' 成功獲取結果")
                    return True
                elif result.get("status") == "REQUEST_DENIED":
                    error_message = result.get("error_message", "未知錯誤")
                    logger.warning(f"API金鑰無效或未授權: {error_message}")
                    # 如果明確指出是金鑰問題，立即返回
                    if "API key" in error_message:
                        return False
                else:
                    logger.warning(f"API測試回應狀態: {result.get('status')}, 錯誤信息: {result.get('error_message', '無')}")
            
            except requests.exceptions.Timeout:
                logger.warning(f"API請求超時，嘗試使用另一個地標")
                continue
                
            except Exception as e:
                logger.error(f"測試API金鑰時發生錯誤: {e}")
                continue
    
    logger.error(f"所有API測試嘗試均失敗，API金鑰可能無效")
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
    cache_key = query.lower()
    
    # 檢查緩存
    if cache_key in place_search_cache:
        logger.info(f"從緩存中獲取地點搜索結果: {query}")
        return place_search_cache[cache_key]
    
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
            place_search_cache[cache_key] = result["results"][0]  # 存入緩存
            return result["results"][0]
        else:
            logger.warning(f"未找到地點: {query}, 狀態: {result.get('status')}, 錯誤信息: {result.get('error_message', '無')}")
            place_search_cache[cache_key] = None  # 緩存無結果
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
    # 檢查緩存
    if place_id in place_details_cache:
        logger.info(f"從緩存中獲取地點詳細信息: {place_id}")
        return place_details_cache[place_id]
    
    logger.info(f"獲取地點詳細資訊: {place_id}")
    
    # 設置請求參數
    params = {
        "place_id": place_id,
        "fields": "name,rating,formatted_address,opening_hours,photos,types",
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
            place_details_cache[place_id] = result["result"]  # 存入緩存
            return result["result"]
        else:
            logger.warning(f"未找到地點詳細資訊: {place_id}, 狀態: {result.get('status')}, 錯誤信息: {result.get('error_message', '無')}")
            place_details_cache[place_id] = None  # 緩存無結果
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
    # 構建照片URL，使用實際的API金鑰
    photo_url = f"{PLACES_PHOTO_URL}?maxwidth={max_width}&photoreference={photo_reference}&key={GOOGLE_PLACES_API_KEY}"
    
    # 為了安全起見，不在日誌中顯示完整URL（包含API金鑰）
    safe_log_url = f"{PLACES_PHOTO_URL}?maxwidth={max_width}&photoreference={photo_reference[:10]}...&key=**HIDDEN**"
    logger.info(f"構建照片URL: {safe_log_url}")
    
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
        "景點": f"{place_name}是當地著名的景點，吸引了眾多遊客前來參觀。",
        "餐廳": f"{place_name}是一家提供美味料理的餐廳，可以品嚐到當地特色美食。",
        "文化體驗": f"{place_name}提供豐富的文化體驗活動，讓遊客深入了解當地傳統文化。",
        "購物": f"{place_name}是一個理想的購物場所，提供各種紀念品和當地特產。",
        "公園": f"{place_name}是休閒放鬆的好去處，提供美麗的自然環境和休憩空間。",
        "博物館": f"{place_name}收藏了豐富的展品，是了解當地歷史文化的重要場所。",
        "寺廟": f"{place_name}是具有歷史意義的宗教場所，展現了獨特的建築風格和文化底蘊。",
        "神社": f"{place_name}是傳統的信仰場所，體現了當地的民俗文化和宗教風貌。",
        "咖啡廳": f"{place_name}提供舒適的環境和美味的飲品，是休息和社交的理想場所。",
        "市場": f"{place_name}匯集了各種當地特色商品和美食，體現了當地的生活文化。"
    }
    
    return type_descriptions.get(place_type, f"{place_name}是一個值得遊覽的地方，提供了獨特的當地體驗。")

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

def enrich_place_info(place_name: str, destination: str, lat: float, lng: float, place_type: str, activity_id: str = None) -> Dict[str, Any]:
    """
    豐富景點資訊
    
    Args:
        place_name: 景點名稱
        destination: 目的地（城市或地區）
        lat: 緯度
        lng: 經度
        place_type: 地點類型
        activity_id: 活動唯一ID，如果沒有則生成新ID
    
    Returns:
        包含豐富資訊的景點字典
    """
    logger.info(f"豐富景點資訊: {place_name}, {destination}")
    
    # 如果沒有提供活動ID，生成一個新的
    if not activity_id:
        activity_id = str(uuid.uuid4())
        logger.info(f"為活動 '{place_name}' 生成新ID: {activity_id}")
    else:
        # 檢查ID是否為有效的UUID格式
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', activity_id, re.I):
            original_id = activity_id
            activity_id = str(uuid.uuid4())
            logger.info(f"活動 '{place_name}' 的ID不是有效的UUID格式，已將 {original_id} 替換為 {activity_id}")
        else:
            logger.info(f"使用提供的活動ID: {activity_id} 用於 '{place_name}'")
    
    # 初始化豐富的景點資訊
    enriched_place = {
        "id": activity_id,  # 確保活動有唯一ID
        "name": place_name,
        "location": place_name,
        "type": place_type,
        "time": "",  # 將在 enrich_travel_plan 中從原始數據填充
        "duration_minutes": estimate_duration(place_type),
        "lat": lat,
        "lng": lng,
        "place_id": None,
        "address": None,
        "rating": None,
        "photos": [],
        "description": ""
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
                
                # 更新營業時間 (僅如果地點有營業時間)
                if "opening_hours" in place_details and "weekday_text" in place_details["opening_hours"]:
                    enriched_place["opening_hours"] = place_details["opening_hours"]["weekday_text"]
                    logger.info(f"營業時間: {enriched_place['opening_hours']}")
                
                # 更新照片 (最多三張)
                if "photos" in place_details:
                    photo_count = 0
                    for photo in place_details["photos"][:3]:
                        photo_reference = photo.get("photo_reference")
                        if photo_reference:
                            try:
                                photo_url = get_photo_url(photo_reference)
                                enriched_place["photos"].append(photo_url)
                                photo_count += 1
                                logger.info(f"添加照片 {photo_count}: {photo_url[:50]}...")
                            except Exception as e:
                                logger.error(f"獲取照片URL時發生錯誤: {e}")
                    
                    logger.info(f"總共添加照片數量: {photo_count}")
                else:
                    logger.warning(f"地點無照片資訊: {place_name}")
                
                # 生成描述 (如果還沒有描述)
                if not enriched_place.get("description"):
                    enriched_place["description"] = get_place_description(place_name, place_type)
                    logger.info(f"描述: {enriched_place['description'][:30]}...")
            else:
                logger.warning(f"未能獲取地點詳細資訊: {place_name}")
        else:
            logger.warning(f"未獲取到地點ID: {place_name}")
    else:
        logger.warning(f"未能搜索到地點: {place_name}")
        # 使用簡單描述
        if not enriched_place.get("description"):
            enriched_place["description"] = get_place_description(place_name, place_type)
    
    return enriched_place

def enrich_travel_plan(travel_plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    豐富整個旅遊計畫
    
    Args:
        travel_plan: 原始旅遊計畫
    
    Returns:
        豐富後的旅遊計畫
    """
    # 初始化UUID統計
    total_activities = 0
    preserved_ids = 0
    generated_ids = 0
    replaced_ids = 0
    
    import re
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    
    # 檢查傳入的旅遊計畫是否有效
    if not travel_plan:
        logger.error("傳入的旅遊計畫為空")
        return {}
    
    # 獲取目的地
    destination = travel_plan.get("destination")
    if not destination:
        logger.error("旅遊計畫中缺少目的地資訊")
        return travel_plan
    
    logger.info(f"開始豐富旅遊計畫: {destination}")
    
    # 獲取計畫ID或生成新ID
    plan_id = travel_plan.get("plan_id")
    if not plan_id:
        plan_id = f"plan_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        logger.info(f"生成新的計畫ID: {plan_id}")
    
    # 處理日期時間值
    created_at = travel_plan.get("created_at", datetime.now())
    if isinstance(created_at, datetime):
        created_at = created_at.isoformat()
    
    updated_at = datetime.now()
    updated_at_str = updated_at.isoformat()
    
    # 創建新的旅遊計畫結構
    enriched_plan = {
        "plan_id": plan_id,
        "user_id": travel_plan.get("user_id", "anonymous"),
        "title": travel_plan.get("title", f"{destination}旅遊計畫"),
        "destination": destination,
        "start_date": travel_plan.get("start_date"),
        "end_date": travel_plan.get("end_date"),
        "duration_days": travel_plan.get("duration_days", len(travel_plan.get("days", []))),
        "budget": travel_plan.get("budget"),
        "interests": travel_plan.get("interests", []),
        "itinerary_preference": travel_plan.get("itinerary_preference", "輕鬆"),
        "travel_companions": travel_plan.get("travel_companions", "個人"),
        "created_at": created_at,
        "updated_at": updated_at_str,  # 使用字符串格式
        "is_public": travel_plan.get("is_public", False),
        "version": travel_plan.get("version", 1),
        "days": []
    }
    
    # 檢查是否有日程資料
    days_data = travel_plan.get("days", [])
    if not days_data:
        logger.warning("旅遊計畫中沒有日程資料")
        return enriched_plan
    
    # 遍歷每天的行程
    try:
        for i, day_data in enumerate(days_data):
            day_number = day_data.get("day", i + 1)
            logger.info(f"處理第 {day_number} 天行程")
            
            # 創建新的日程結構
            enriched_day = {
                "day": day_number,
                "date": day_data.get("date", ""),  # 如果原始數據中有日期則使用，否則留空
                "activities": []
            }
            
            # 檢查是否使用 activities 或 schedule 結構
            activities_list = day_data.get("activities", [])
            if not activities_list and "schedule" in day_data:
                activities_list = day_data.get("schedule", [])
                logger.info(f"使用 schedule 結構: {len(activities_list)} 個活動")
            else:
                logger.info(f"使用 activities 結構: {len(activities_list)} 個活動")
            
            if not activities_list:
                logger.warning(f"第 {day_number} 天沒有活動資料")
                enriched_plan["days"].append(enriched_day)
                continue
            
            # 遍歷每個景點/活動
            for j, place in enumerate(activities_list):
                total_activities += 1
                place_name = place.get("name", place.get("location", "未知地點"))
                logger.info(f"處理第 {day_number} 天第 {j+1} 個景點: {place_name}")
                
                # 檢查活動是否已有ID
                activity_id = place.get("id")
                if not activity_id:
                    activity_id = str(uuid.uuid4())
                    place["id"] = activity_id
                    logger.info(f"為活動 '{place_name}' 生成新ID: {activity_id}")
                    generated_ids += 1
                elif not re.match(uuid_pattern, activity_id, re.I):
                    original_id = activity_id
                    activity_id = str(uuid.uuid4())
                    place["id"] = activity_id
                    logger.info(f"替換非UUID格式ID: {original_id} → {activity_id}")
                    replaced_ids += 1
                else:
                    logger.info(f"保留原始UUID: {activity_id}")
                    preserved_ids += 1
                
                try:
                    # 豐富景點資訊
                    enriched_place = enrich_place_info(
                        place_name=place_name,
                        destination=destination,
                        lat=place.get("lat", 0),
                        lng=place.get("lng", 0),
                        place_type=place.get("type", "景點"),
                        activity_id=activity_id  # 確保傳遞活動ID
                    )
                    
                    # 保留原始的時間和其他可能的欄位
                    enriched_place["time"] = place.get("time", "未指定時間")
                    if "description" in place and place["description"]:
                        enriched_place["description"] = place["description"]
                    
                    # 添加到日程中
                    enriched_day["activities"].append(enriched_place)
                    logger.info(f"成功添加景點 {place_name} 的豐富資訊，ID: {activity_id}")
                except Exception as e:
                    logger.error(f"處理景點 {place_name} 時發生錯誤: {e}")
                    # 如果豐富失敗，仍添加原始景點資訊，但確保有ID
                    place["id"] = activity_id
                    enriched_day["activities"].append(place)
            
            # 添加到計畫中
            enriched_plan["days"].append(enriched_day)
            logger.info(f"完成第 {day_number} 天行程處理，共 {len(enriched_day['activities'])} 個活動")
    
    except Exception as e:
        logger.error(f"豐富旅遊計畫時發生錯誤: {e}")
        # 發生錯誤時仍然返回部分處理的結果
    
    logger.info(f"完成豐富旅遊計畫: {destination}，共 {len(enriched_plan['days'])} 天行程，總計 {total_activities} 個活動")
    logger.info(f"UUID統計 - 保留原始ID: {preserved_ids}, 生成新ID: {generated_ids}, 替換無效ID: {replaced_ids}")
    
    # 確保所有datetime對象都被轉換為字符串
    def convert_datetime(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, datetime):
                    obj[key] = value.isoformat()
                elif isinstance(value, dict) or isinstance(value, list):
                    convert_datetime(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, datetime):
                    obj[i] = item.isoformat()
                elif isinstance(item, dict) or isinstance(item, list):
                    convert_datetime(item)
        return obj
    
    # 處理整個數據結構
    enriched_plan = convert_datetime(enriched_plan)
    
    return enriched_plan 