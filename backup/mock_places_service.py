import json
import logging
import os
import random
from typing import Dict, Any, List, Optional

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 模擬數據目錄
MOCK_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "mock_data")
os.makedirs(MOCK_DATA_DIR, exist_ok=True)

# 確保模擬數據目錄存在
if not os.path.exists(MOCK_DATA_DIR):
    os.makedirs(MOCK_DATA_DIR)

# 模擬數據文件路徑
MOCK_PLACES_FILE = os.path.join(MOCK_DATA_DIR, "mock_places.json")

# 初始化模擬數據
def initialize_mock_data():
    """初始化模擬數據"""
    if os.path.exists(MOCK_PLACES_FILE):
        logger.info(f"模擬數據已存在: {MOCK_PLACES_FILE}")
        return
        
    logger.info("初始化模擬地點數據")
    
    # 創建一些模擬地點
    mock_places = {
        # 京都景點
        "京都金閣寺": {
            "name": "金閣寺",
            "formatted_address": "日本京都府京都市北區金閣寺町1",
            "geometry": {
                "location": {"lat": 35.0394, "lng": 135.7292}
            },
            "place_id": "mock_kinkakuji",
            "rating": 4.7,
            "opening_hours": {
                "weekday_text": [
                    "星期一: 09:00 – 17:00",
                    "星期二: 09:00 – 17:00",
                    "星期三: 09:00 – 17:00",
                    "星期四: 09:00 – 17:00",
                    "星期五: 09:00 – 17:00",
                    "星期六: 09:00 – 17:00",
                    "星期日: 09:00 – 17:00"
                ]
            },
            "photos": [
                {"photo_reference": "mock_kinkakuji_photo1"},
                {"photo_reference": "mock_kinkakuji_photo2"}
            ],
            "website": "https://www.shokoku-ji.jp/kinkakuji/",
            "formatted_phone_number": "+81 75-461-0013",
            "price_level": 2
        },
        "京都清水寺": {
            "name": "清水寺",
            "formatted_address": "日本京都府京都市東山區清水1-294",
            "geometry": {
                "location": {"lat": 34.9948, "lng": 135.7850}
            },
            "place_id": "mock_kiyomizudera",
            "rating": 4.6,
            "opening_hours": {
                "weekday_text": [
                    "星期一: 06:00 – 18:00",
                    "星期二: 06:00 – 18:00",
                    "星期三: 06:00 – 18:00",
                    "星期四: 06:00 – 18:00",
                    "星期五: 06:00 – 18:00",
                    "星期六: 06:00 – 18:00",
                    "星期日: 06:00 – 18:00"
                ]
            },
            "photos": [
                {"photo_reference": "mock_kiyomizudera_photo1"},
                {"photo_reference": "mock_kiyomizudera_photo2"}
            ],
            "website": "https://www.kiyomizudera.or.jp/",
            "formatted_phone_number": "+81 75-551-1234",
            "price_level": 2
        },
        "京都伏見稻荷大社": {
            "name": "伏見稻荷大社",
            "formatted_address": "日本京都府京都市伏見區深草藪之內町68",
            "geometry": {
                "location": {"lat": 34.9671, "lng": 135.7727}
            },
            "place_id": "mock_fushimiinari",
            "rating": 4.8,
            "opening_hours": {
                "weekday_text": [
                    "星期一: 24小時營業",
                    "星期二: 24小時營業",
                    "星期三: 24小時營業",
                    "星期四: 24小時營業",
                    "星期五: 24小時營業",
                    "星期六: 24小時營業",
                    "星期日: 24小時營業"
                ]
            },
            "photos": [
                {"photo_reference": "mock_fushimiinari_photo1"},
                {"photo_reference": "mock_fushimiinari_photo2"}
            ],
            "website": "http://inari.jp/",
            "formatted_phone_number": "+81 75-641-7331",
            "price_level": 0
        },
        
        # 東京景點
        "東京晴空塔": {
            "name": "東京晴空塔",
            "formatted_address": "日本東京都墨田區押上1-1-2",
            "geometry": {
                "location": {"lat": 35.7100, "lng": 139.8107}
            },
            "place_id": "mock_tokyoskytree",
            "rating": 4.5,
            "opening_hours": {
                "weekday_text": [
                    "星期一: 10:00 – 21:00",
                    "星期二: 10:00 – 21:00",
                    "星期三: 10:00 – 21:00",
                    "星期四: 10:00 – 21:00",
                    "星期五: 10:00 – 21:00",
                    "星期六: 10:00 – 21:00",
                    "星期日: 10:00 – 21:00"
                ]
            },
            "photos": [
                {"photo_reference": "mock_tokyoskytree_photo1"},
                {"photo_reference": "mock_tokyoskytree_photo2"}
            ],
            "website": "http://www.tokyo-skytree.jp/",
            "formatted_phone_number": "+81 570-550-634",
            "price_level": 3
        },
        "東京迪士尼樂園": {
            "name": "東京迪士尼樂園",
            "formatted_address": "日本千葉縣浦安市舞濱1-1",
            "geometry": {
                "location": {"lat": 35.6329, "lng": 139.8804}
            },
            "place_id": "mock_tokyodisney",
            "rating": 4.7,
            "opening_hours": {
                "weekday_text": [
                    "星期一: 08:00 – 22:00",
                    "星期二: 08:00 – 22:00",
                    "星期三: 08:00 – 22:00",
                    "星期四: 08:00 – 22:00",
                    "星期五: 08:00 – 22:00",
                    "星期六: 08:00 – 22:00",
                    "星期日: 08:00 – 22:00"
                ]
            },
            "photos": [
                {"photo_reference": "mock_tokyodisney_photo1"},
                {"photo_reference": "mock_tokyodisney_photo2"}
            ],
            "website": "https://www.tokyodisneyresort.jp/",
            "formatted_phone_number": "+81 45-330-5211",
            "price_level": 3
        }
    }
    
    # 保存模擬數據
    with open(MOCK_PLACES_FILE, "w", encoding="utf-8") as f:
        json.dump(mock_places, f, ensure_ascii=False, indent=2)
    
    logger.info(f"模擬數據已保存到: {MOCK_PLACES_FILE}")

# 加載模擬數據
def load_mock_places():
    """加載模擬地點數據"""
    if not os.path.exists(MOCK_PLACES_FILE):
        initialize_mock_data()
        
    try:
        with open(MOCK_PLACES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"加載模擬數據時發生錯誤: {e}")
        return {}

# 模擬Google Places API的文本搜索功能
def mock_search_place(place_name: str, destination: str) -> Optional[Dict[str, Any]]:
    """
    模擬Google Places API的文本搜索功能
    
    Args:
        place_name: 景點名稱
        destination: 目的地（城市或地區）
    
    Returns:
        包含地點資訊的字典，如果未找到則返回None
    """
    # 構建查詢字符串
    query = f"{destination} {place_name}".lower()
    logger.info(f"模擬搜索地點: {query}")
    
    # 加載模擬數據
    mock_places = load_mock_places()
    
    # 搜索匹配的地點
    for key, place in mock_places.items():
        if (place_name.lower() in key.lower() and destination.lower() in key.lower()) or \
           (place_name.lower() in place["name"].lower() and destination.lower() in place["formatted_address"].lower()):
            logger.info(f"找到模擬地點: {place['name']}")
            return place
    
    # 如果沒有精確匹配，嘗試部分匹配
    for key, place in mock_places.items():
        if place_name.lower() in key.lower() or place_name.lower() in place["name"].lower():
            logger.info(f"找到部分匹配的模擬地點: {place['name']}")
            return place
    
    # 如果仍然沒有找到，返回與目的地相關的隨機地點
    destination_places = [place for key, place in mock_places.items() if destination.lower() in key.lower()]
    if destination_places:
        random_place = random.choice(destination_places)
        logger.info(f"返回隨機模擬地點: {random_place['name']}")
        return random_place
    
    # 如果沒有找到任何地點，返回None
    logger.warning(f"未找到模擬地點: {query}")
    return None

# 模擬Google Places API的地點詳細資訊功能
def mock_get_place_details(place_id: str) -> Optional[Dict[str, Any]]:
    """
    模擬Google Places API的地點詳細資訊功能
    
    Args:
        place_id: 模擬地點ID
    
    Returns:
        包含地點詳細資訊的字典，如果未找到則返回None
    """
    logger.info(f"模擬獲取地點詳細資訊: {place_id}")
    
    # 加載模擬數據
    mock_places = load_mock_places()
    
    # 搜索匹配的地點
    for place in mock_places.values():
        if place["place_id"] == place_id:
            logger.info(f"找到模擬地點詳細資訊: {place['name']}")
            return place
    
    # 如果沒有找到，返回None
    logger.warning(f"未找到模擬地點詳細資訊: {place_id}")
    return None

# 模擬Google Places API的照片URL
def mock_get_photo_url(photo_reference: str, max_width: int = 400) -> str:
    """
    模擬Google Places API的照片URL
    
    Args:
        photo_reference: 照片參考ID
        max_width: 照片最大寬度
    
    Returns:
        模擬照片URL
    """
    # 根據照片參考ID返回不同的模擬URL
    if "kinkakuji" in photo_reference:
        return "https://upload.wikimedia.org/wikipedia/commons/0/0f/Kinkaku-ji_the_Golden_Temple_in_Kyoto_overlooking_the_lake_-_high_rez.JPG"
    elif "kiyomizudera" in photo_reference:
        return "https://upload.wikimedia.org/wikipedia/commons/0/0b/Kiyomizu-dera_in_Kyoto-r.jpg"
    elif "fushimiinari" in photo_reference:
        return "https://upload.wikimedia.org/wikipedia/commons/e/e8/Fushimi_Inari_Shrine_Kyoto_Japan.jpg"
    elif "tokyoskytree" in photo_reference:
        return "https://upload.wikimedia.org/wikipedia/commons/4/4e/Tokyo_Skytree_2014_%E2%85%A2.jpg"
    elif "tokyodisney" in photo_reference:
        return "https://upload.wikimedia.org/wikipedia/commons/e/e4/Tokyo_Disneyland_-_panoramio.jpg"
    else:
        # 默認返回一個隨機的日本風景照片
        default_photos = [
            "https://upload.wikimedia.org/wikipedia/commons/d/d4/Tokyo_Tower_at_night_2.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/c/c2/Mount_Fuji_from_Mount_Tenjo.jpg",
            "https://upload.wikimedia.org/wikipedia/commons/7/7b/Asakusa_Kannon_Temple_Pagoda_-_Tokyo%2C_Japan.jpg"
        ]
        return random.choice(default_photos)

# 模擬豐富景點資訊
def mock_enrich_place_info(place_name: str, destination: str, lat: float, lng: float) -> Dict[str, Any]:
    """
    模擬豐富景點資訊
    
    Args:
        place_name: 景點名稱
        destination: 目的地（城市或地區）
        lat: 緯度
        lng: 經度
    
    Returns:
        包含豐富資訊的景點字典
    """
    logger.info(f"模擬豐富景點資訊: {place_name}, {destination}")
    
    # 初始化豐富的景點資訊
    enriched_place = {
        "name": place_name,
        "lat": lat,
        "lng": lng,
        "address": None,
        "rating": None,
        "opening_hours": None,
        "photos": [],
        "website": None,
        "phone": None,
        "price_level": None
    }
    
    # 搜索地點
    place_result = mock_search_place(place_name, destination)
    
    if place_result:
        # 更新經緯度（使用更準確的值）
        if "geometry" in place_result and "location" in place_result["geometry"]:
            enriched_place["lat"] = place_result["geometry"]["location"]["lat"]
            enriched_place["lng"] = place_result["geometry"]["location"]["lng"]
        
        # 更新地址
        enriched_place["address"] = place_result.get("formatted_address")
        
        # 更新評分
        enriched_place["rating"] = place_result.get("rating")
        
        # 更新營業時間
        if "opening_hours" in place_result and "weekday_text" in place_result["opening_hours"]:
            enriched_place["opening_hours"] = place_result["opening_hours"]["weekday_text"]
        
        # 更新照片
        if "photos" in place_result:
            for photo in place_result["photos"][:3]:  # 最多取3張照片
                photo_reference = photo.get("photo_reference")
                if photo_reference:
                    photo_url = mock_get_photo_url(photo_reference)
                    enriched_place["photos"].append(photo_url)
        
        # 更新網站
        enriched_place["website"] = place_result.get("website")
        
        # 更新電話
        enriched_place["phone"] = place_result.get("formatted_phone_number")
        
        # 更新價格等級
        enriched_place["price_level"] = place_result.get("price_level")
    
    return enriched_place

# 模擬豐富整個旅遊計畫
def mock_enrich_travel_plan(travel_plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    模擬豐富整個旅遊計畫
    
    Args:
        travel_plan: 原始旅遊計畫
    
    Returns:
        豐富後的旅遊計畫
    """
    # 獲取目的地
    destination = travel_plan["metadata"]["destination"]
    logger.info(f"開始模擬豐富旅遊計畫: {destination}")
    
    # 遍歷每天的行程
    for day in travel_plan["days"]:
        logger.info(f"處理第 {day['day']} 天")
        
        # 遍歷每個景點
        for i, place in enumerate(day["schedule"]):
            logger.info(f"處理景點 {i+1}: {place['name']}")
            
            # 豐富景點資訊
            enriched_place = mock_enrich_place_info(
                place_name=place["name"],
                destination=destination,
                lat=place["lat"],
                lng=place["lng"]
            )
            
            # 保留原始的時間和類型
            enriched_place["time"] = place["time"]
            enriched_place["type"] = place["type"]
            
            # 更新景點資訊
            day["schedule"][i] = enriched_place
    
    return travel_plan

# 初始化模擬數據
initialize_mock_data() 