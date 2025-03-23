#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
測試旅遊計劃豐富功能的腳本
讀取一個簡單的旅遊計劃，然後使用 Google Places API 豐富它
"""

import os
import json
import logging
from datetime import datetime
from app.utils.google_places_service import enrich_travel_plan, is_api_key_valid

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# JSON序列化的日期時間處理
def json_serialize_datetime(obj):
    """JSON序列化處理器，將datetime對象轉換為ISO格式字符串"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

# 測試用的旅遊計劃樣本
SAMPLE_TRAVEL_PLAN = {
    "plan_id": "test_plan_" + datetime.now().strftime("%Y%m%d%H%M%S"),
    "title": "京都4日遊",
    "destination": "京都",
    "start_date": "2024-07-15",
    "end_date": "2024-07-18",
    "duration_days": 4,
    "budget": "中等",
    "interests": ["歷史", "文化", "寺廟"],
    "itinerary_preference": "放鬆",
    "travel_companions": "夫妻",
    "days": [
        {
            "day": 1,
            "schedule": [
                {
                    "time": "09:00",
                    "type": "景點",
                    "name": "伏見稻荷大社",
                    "lat": 34.9671,
                    "lng": 135.7727
                },
                {
                    "time": "13:00",
                    "type": "餐廳",
                    "name": "錦市場",
                    "lat": 35.0050,
                    "lng": 135.7651
                },
                {
                    "time": "15:30",
                    "type": "景點",
                    "name": "清水寺",
                    "lat": 34.9948,
                    "lng": 135.7850
                }
            ]
        },
        {
            "day": 2,
            "schedule": [
                {
                    "time": "09:30",
                    "type": "景點",
                    "name": "金閣寺",
                    "lat": 35.0394,
                    "lng": 135.7292
                },
                {
                    "time": "13:30",
                    "type": "景點",
                    "name": "龍安寺",
                    "lat": 35.0346,
                    "lng": 135.7183
                },
                {
                    "time": "16:00",
                    "type": "文化體驗",
                    "name": "嵐山竹林",
                    "lat": 35.0169,
                    "lng": 135.6745
                }
            ]
        },
        {
            "day": 3,
            "schedule": [
                {
                    "time": "10:00",
                    "type": "景點",
                    "name": "二條城",
                    "lat": 35.0142,
                    "lng": 135.7480
                },
                {
                    "time": "14:00",
                    "type": "購物",
                    "name": "祇園",
                    "lat": 35.0036,
                    "lng": 135.7755
                }
            ]
        },
        {
            "day": 4,
            "schedule": [
                {
                    "time": "09:00",
                    "type": "景點",
                    "name": "銀閣寺",
                    "lat": 35.0271,
                    "lng": 135.7982
                },
                {
                    "time": "12:00",
                    "type": "餐廳",
                    "name": "京都拉麵小路",
                    "lat": 34.9858,
                    "lng": 135.7588
                },
                {
                    "time": "15:00",
                    "type": "文化體驗",
                    "name": "和服體驗",
                    "lat": 35.0036,
                    "lng": 135.7680
                }
            ]
        }
    ]
}

def check_photo_urls(enriched_plan):
    """
    檢查豐富後的旅遊計劃中的照片URL數量及其可訪問性
    
    Args:
        enriched_plan: 豐富後的旅遊計劃
        
    Returns:
        (int, int): (照片總數, 可訪問的照片數)
    """
    total_photos = 0
    accessible_photos = 0
    
    for day in enriched_plan.get("days", []):
        for activity in day.get("activities", []):
            photos = activity.get("photos", [])
            total_photos += len(photos)
            
            # 簡單檢查URL是否有效 (僅根據格式)
            for photo_url in photos:
                if (photo_url.startswith("http") and 
                    "maps.googleapis.com" in photo_url and 
                    "photoreference" in photo_url):
                    accessible_photos += 1
    
    return total_photos, accessible_photos

def main():
    """主函數"""
    # 1. 檢查API金鑰有效性
    logger.info("檢查 Google Places API 金鑰有效性...")
    if not is_api_key_valid():
        logger.error("API金鑰無效，無法繼續測試")
        return
    
    # 2. 創建輸出目錄
    output_dir = "enriched_plans"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 3. 豐富旅遊計劃
    logger.info("開始豐富旅遊計劃...")
    logger.info(f"原始計劃: {SAMPLE_TRAVEL_PLAN['title']} ({SAMPLE_TRAVEL_PLAN['destination']})")
    
    try:
        enriched_plan = enrich_travel_plan(SAMPLE_TRAVEL_PLAN)
        
        if not enriched_plan:
            logger.error("豐富旅遊計劃失敗")
            return
        
        # 4. 保存結果
        output_file = f"{output_dir}/enriched_plan_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enriched_plan, f, ensure_ascii=False, indent=2)
        
        logger.info(f"豐富後的旅遊計劃已保存到: {output_file}")
        
        # 5. 統計照片
        total_photos, accessible_photos = check_photo_urls(enriched_plan)
        logger.info(f"照片統計: 總數 {total_photos}，初步檢查有效 {accessible_photos} ({accessible_photos/total_photos*100:.1f}% 如果總數不為0)")
        
        # 6. 顯示一些關鍵信息
        logger.info("\n豐富後的旅遊計劃摘要:")
        logger.info(f"計劃ID: {enriched_plan.get('plan_id')}")
        logger.info(f"目的地: {enriched_plan.get('destination')}")
        logger.info(f"日期: {enriched_plan.get('start_date')} 至 {enriched_plan.get('end_date')}")
        logger.info(f"天數: {len(enriched_plan.get('days', []))}")
        
        # 7. 輸出每天的活動概要
        for i, day in enumerate(enriched_plan.get("days", [])):
            logger.info(f"\n第 {i+1} 天:")
            for j, activity in enumerate(day.get("activities", [])):
                logger.info(f"  {j+1}. {activity.get('time')} - {activity.get('name')} ({activity.get('type')})")
                logger.info(f"     評分: {activity.get('rating', '未知')}")
                logger.info(f"     照片數: {len(activity.get('photos', []))}")
        
    except Exception as e:
        logger.error(f"豐富旅遊計劃過程中發生錯誤: {e}")
    
    logger.info("\n測試完成!")

if __name__ == "__main__":
    main() 