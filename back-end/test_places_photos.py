#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Google Places API 照片測試腳本
這個腳本用於測試從Google Places API獲取的照片URL的可訪問性
"""

import os
import sys
import json
import logging
import requests
import webbrowser
from datetime import datetime

# 添加應用根目錄到路徑
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 導入所需模塊
from app.utils.google_places_service import (
    is_api_key_valid, 
    search_place, 
    get_place_details,
    get_photo_url
)

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def verify_photo_url(photo_url, timeout=10):
    """
    驗證照片URL是否可訪問
    
    Args:
        photo_url: 照片URL
        timeout: 請求超時時間（秒）
        
    Returns:
        (bool, str): (是否可訪問, 狀態說明)
    """
    try:
        # 只獲取頭部信息，不下載整個圖片
        response = requests.head(photo_url, timeout=timeout)
        response.raise_for_status()
        
        # 檢查內容類型是否為圖片
        content_type = response.headers.get('Content-Type', '')
        if content_type.startswith('image/'):
            return True, f"可訪問 (狀態碼: {response.status_code}, 內容類型: {content_type})"
        else:
            return False, f"URL可訪問但非圖片 (狀態碼: {response.status_code}, 內容類型: {content_type})"
            
    except requests.exceptions.RequestException as e:
        return False, f"無法訪問 (錯誤: {str(e)})"

def test_photo_for_place(place_name, destination):
    """
    測試特定地點的照片
    
    Args:
        place_name: 地點名稱
        destination: 目的地（城市或地區）
        
    Returns:
        list: 測試結果列表，每個元素為 (photo_url, is_accessible, status_message)
    """
    logger.info(f"測試地點照片: {place_name} 在 {destination}")
    results = []
    
    # 1. 搜索地點
    place_result = search_place(place_name, destination)
    if not place_result:
        logger.error(f"未找到地點: {place_name}")
        return results
        
    # 2. 獲取地點ID
    place_id = place_result.get('place_id')
    if not place_id:
        logger.error(f"未獲取到地點ID: {place_name}")
        return results
        
    # 3. 獲取地點詳細信息
    place_details = get_place_details(place_id)
    if not place_details:
        logger.error(f"未獲取到地點詳細信息: {place_name}")
        return results
        
    # 4. 獲取照片URL
    if 'photos' not in place_details or not place_details['photos']:
        logger.warning(f"地點無照片: {place_name}")
        return results
        
    # 5. 測試每張照片的URL
    logger.info(f"找到 {len(place_details['photos'])} 張照片，開始測試...")
    for i, photo in enumerate(place_details['photos'][:3]):  # 最多測試3張
        photo_reference = photo.get('photo_reference')
        if not photo_reference:
            continue
            
        # 獲取照片URL
        photo_url = get_photo_url(photo_reference)
        logger.info(f"測試照片 {i+1}: {photo_url[:50]}...{photo_url[-20:]}")
        
        # 測試照片URL可訪問性
        is_accessible, status = verify_photo_url(photo_url)
        
        if is_accessible:
            logger.info(f"✅ 照片 {i+1} 可訪問: {status}")
        else:
            logger.error(f"❌ 照片 {i+1} 無法訪問: {status}")
            
        # 保存結果
        results.append((photo_url, is_accessible, status))
    
    return results

def open_accessible_photos(results):
    """
    在瀏覽器中打開可訪問的照片
    
    Args:
        results: 測試結果列表，每個元素為 (photo_url, is_accessible, status_message)
    """
    accessible_urls = [url for url, is_accessible, _ in results if is_accessible]
    
    if not accessible_urls:
        logger.warning("沒有可訪問的照片")
        return
    
    logger.info(f"找到 {len(accessible_urls)} 張可訪問的照片")
    
    # 詢問用戶是否打開照片
    while True:
        response = input(f"是否在瀏覽器中打開 {len(accessible_urls)} 張可訪問的照片？(y/n): ").strip().lower()
        if response == 'y':
            for i, url in enumerate(accessible_urls):
                logger.info(f"打開照片 {i+1}...")
                webbrowser.open(url)
            break
        elif response == 'n':
            logger.info("不打開照片")
            break
        else:
            logger.warning("請輸入 'y' 或 'n'")

def main():
    """主函數"""
    logger.info("開始 Google Places API 照片URL測試")
    
    # 檢查API金鑰有效性
    logger.info("驗證 Google Places API 金鑰...")
    if not is_api_key_valid():
        logger.error("Google Places API 金鑰無效，無法繼續測試")
        return
    
    # 測試地點列表
    test_locations = [
        ("東京鐵塔", "東京"),
        ("淺草寺", "東京"),
        ("明治神宮", "東京"),
        ("新宿御苑", "東京"),
        ("上野公園", "東京")
    ]
    
    # 保存所有結果
    all_results = []
    
    # 執行測試
    for place_name, destination in test_locations:
        logger.info(f"\n===== 測試 {place_name} =====")
        results = test_photo_for_place(place_name, destination)
        
        if results:
            # 統計結果
            total_photos = len(results)
            accessible_photos = sum(1 for _, is_accessible, _ in results if is_accessible)
            logger.info(f"測試結果: {accessible_photos}/{total_photos} 張照片可訪問 ({accessible_photos/total_photos*100:.1f}%)")
            
            # 添加到所有結果
            all_results.extend(results)
        else:
            logger.warning(f"未找到 {place_name} 的照片")
    
    # 總結果
    if all_results:
        total_all = len(all_results)
        accessible_all = sum(1 for _, is_accessible, _ in all_results if is_accessible)
        logger.info(f"\n===== 總結果 =====")
        logger.info(f"總計測試了 {len(test_locations)} 個地點，{total_all} 張照片")
        logger.info(f"可訪問: {accessible_all}/{total_all} ({accessible_all/total_all*100:.1f}%)")
        
        # 詢問用戶是否打開照片
        open_accessible_photos(all_results)
    else:
        logger.warning("未找到任何照片")
    
    logger.info("測試完成")

if __name__ == "__main__":
    main() 