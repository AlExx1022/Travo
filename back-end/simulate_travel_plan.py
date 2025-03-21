import json
import logging
import argparse
from datetime import datetime
from dotenv import load_dotenv

# 加載環境變數
load_dotenv()

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 導入應用程序模塊
from app.utils.gpt_service import generate_travel_plan
from app.utils.google_places_service import enrich_travel_plan, is_api_key_valid

def get_user_input():
    """從用戶獲取旅遊計畫參數"""
    print("\n===== 旅遊計畫生成器 =====\n")
    
    destination = input("請輸入目的地 (例如: 東京, 巴黎, 紐約): ")
    start_date = input("請輸入開始日期 (格式: YYYY-MM-DD): ")
    end_date = input("請輸入結束日期 (格式: YYYY-MM-DD): ")
    
    print("\n預算選項: 低, 中, 高")
    budget = input("請選擇預算: ")
    
    print("\n請輸入您的興趣 (多個興趣請用逗號分隔)")
    print("例如: 歷史,美食,藝術,自然,購物,文化體驗")
    interests_input = input("您的興趣: ")
    interests = [interest.strip() for interest in interests_input.split(",")]
    
    print("\n行程偏好選項: 輕鬆, 適中, 緊湊")
    itinerary_preference = input("請選擇行程偏好: ")
    
    print("\n旅行同伴選項: 獨自, 情侶, 家庭, 朋友")
    travel_companions = input("請選擇旅行同伴: ")
    
    return {
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
        "interests": interests,
        "itinerary_preference": itinerary_preference,
        "travel_companions": travel_companions
    }

def simulate_travel_plan_flow(params=None):
    """模擬完整的旅遊計畫生成流程"""
    logger.info("開始模擬完整旅遊計畫流程")
    
    # 如果沒有提供參數，則從用戶獲取輸入
    if params is None:
        params = get_user_input()
    
    # 從參數中獲取旅遊信息
    destination = params["destination"]
    start_date = params["start_date"]
    end_date = params["end_date"]
    budget = params["budget"]
    interests = params["interests"]
    itinerary_preference = params["itinerary_preference"]
    travel_companions = params["travel_companions"]
    
    # 生成輸出文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    original_file = f"original_travel_plan_{destination.lower()}_{timestamp}.json"
    enriched_file = f"enriched_travel_plan_{destination.lower()}_{timestamp}.json"
    
    logger.info(f"目的地: {destination}")
    logger.info(f"旅行日期: {start_date} 至 {end_date}")
    logger.info(f"預算: {budget}")
    logger.info(f"興趣: {', '.join(interests)}")
    logger.info(f"行程偏好: {itinerary_preference}")
    logger.info(f"旅行同伴: {travel_companions}")
    
    # 步驟1: 檢查Google Places API是否有效
    logger.info("步驟1: 檢查Google Places API是否有效")
    
    if not is_api_key_valid():
        logger.error("Google Places API金鑰無效，無法繼續")
        return False
    
    logger.info("Google Places API金鑰有效")
    
    # 步驟2: 使用ChatGPT生成旅遊計畫
    logger.info("步驟2: 使用ChatGPT生成旅遊計畫")
    
    try:
        travel_plan = generate_travel_plan(
            destination=destination,
            start_date=start_date,
            end_date=end_date,
            budget=budget,
            interests=interests,
            itinerary_preference=itinerary_preference,
            travel_companions=travel_companions
        )
        
        logger.info("成功生成旅遊計畫")
        
        # 保存原始旅遊計畫
        with open(original_file, "w", encoding="utf-8") as f:
            json.dump(travel_plan, f, ensure_ascii=False, indent=2)
        
        logger.info(f"原始旅遊計畫已保存到 {original_file}")
        
        # 顯示旅遊計畫摘要
        logger.info("旅遊計畫摘要:")
        for day in travel_plan["days"]:
            logger.info(f"第 {day['day']} 天:")
            for place in day["schedule"]:
                logger.info(f"  {place['time']} - {place['name']} ({place['type']})")
        
    except Exception as e:
        logger.error(f"生成旅遊計畫時發生錯誤: {e}")
        return False
    
    # 步驟3: 使用Google Places API豐富旅遊計畫
    logger.info("步驟3: 使用Google Places API豐富旅遊計畫")
    
    try:
        enriched_plan = enrich_travel_plan(travel_plan)
        
        logger.info("成功豐富旅遊計畫")
        
        # 保存豐富後的旅遊計畫
        with open(enriched_file, "w", encoding="utf-8") as f:
            json.dump(enriched_plan, f, ensure_ascii=False, indent=2)
        
        logger.info(f"豐富後的旅遊計畫已保存到 {enriched_file}")
        
        # 顯示豐富後的旅遊計畫摘要
        logger.info("豐富後的旅遊計畫摘要:")
        for day in enriched_plan["days"]:
            logger.info(f"第 {day['day']} 天:")
            for place in day["schedule"]:
                logger.info(f"  {place['time']} - {place['name']} ({place['type']})")
                logger.info(f"    地址: {place.get('address')}")
                logger.info(f"    評分: {place.get('rating')}")
                logger.info(f"    照片數量: {len(place.get('photos', []))}")
                logger.info(f"    網站: {place.get('website')}")
                logger.info(f"    電話: {place.get('phone')}")
        
        return True
        
    except Exception as e:
        logger.error(f"豐富旅遊計畫時發生錯誤: {e}")
        return False

def parse_args():
    """解析命令行參數"""
    parser = argparse.ArgumentParser(description="旅遊計畫生成器")
    parser.add_argument("--destination", help="旅遊目的地")
    parser.add_argument("--start-date", help="開始日期 (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="結束日期 (YYYY-MM-DD)")
    parser.add_argument("--budget", help="預算 (低/中/高)")
    parser.add_argument("--interests", help="興趣，用逗號分隔")
    parser.add_argument("--preference", help="行程偏好 (輕鬆/適中/緊湊)")
    parser.add_argument("--companions", help="旅行同伴 (獨自/情侶/家庭/朋友)")
    
    return parser.parse_args()

if __name__ == "__main__":
    logger.info("開始模擬完整的旅遊計畫生成流程")
    
    # 解析命令行參數
    args = parse_args()
    
    # 檢查是否提供了命令行參數
    if args.destination and args.start_date and args.end_date:
        # 使用命令行參數
        params = {
            "destination": args.destination,
            "start_date": args.start_date,
            "end_date": args.end_date,
            "budget": args.budget or "中",
            "interests": args.interests.split(",") if args.interests else ["歷史", "美食", "文化體驗"],
            "itinerary_preference": args.preference or "輕鬆",
            "travel_companions": args.companions or "獨自"
        }
        logger.info("使用命令行參數")
    else:
        # 沒有提供足夠的命令行參數，使用交互式輸入
        params = None
        logger.info("使用交互式輸入")
    
    # 記錄開始時間
    start_time = datetime.now()
    logger.info(f"開始時間: {start_time}")
    
    # 執行模擬
    success = simulate_travel_plan_flow(params)
    
    # 記錄結束時間
    end_time = datetime.now()
    logger.info(f"結束時間: {end_time}")
    logger.info(f"耗時: {end_time - start_time}")
    
    # 顯示結果
    if success:
        logger.info("模擬成功完成")
    else:
        logger.error("模擬失敗")
    
    logger.info("模擬完成") 