#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
測試旅行計劃生成 API 的簡單獨立腳本
使用方法：python test_generate_api.py --token YOUR_TOKEN
"""

import argparse
import requests
import json
import logging
from datetime import datetime, timedelta

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API 基本URL
BASE_URL = "http://localhost:5000/api"

def test_generate_travel_plan(token):
    """測試生成旅行計劃 API"""
    
    # 計算未來的日期（3個月後開始的5天行程）
    today = datetime.now()
    start_date = today + timedelta(days=90)  # 3個月後
    end_date = start_date + timedelta(days=4)  # 5天行程
    
    # 準備請求數據
    payload = {
        "destination": "京都",
        "start_date": start_date.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "budget": "50000",
        "interests": ["歷史", "文化", "寺廟", "美食"],
        "preference": "放鬆",
        "companions": "夫妻"
    }
    
    # 設置請求頭
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    generate_url = f"{BASE_URL}/travel-plans/generate"
    logger.info(f"發送請求到: {generate_url}")
    logger.info(f"使用認證令牌: {token[:10]}...{token[-5:] if len(token) > 15 else ''}")
    logger.info(f"請求數據: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    
    try:
        # 發送 POST 請求
        response = requests.post(generate_url, headers=headers, json=payload)
        
        # 檢查響應
        logger.info(f"收到響應，狀態碼: {response.status_code}")
        
        try:
            result = response.json()
            logger.info(f"響應數據: {json.dumps(result, ensure_ascii=False, indent=2)}")
            
            if response.status_code == 201:
                logger.info("請求成功!")
                plan_id = result.get('plan_id')
                logger.info(f"生成的旅行計劃 ID: {plan_id}")
                
                # 嘗試獲取生成的計劃詳情
                if plan_id:
                    logger.info(f"嘗試獲取計劃詳情...")
                    get_plan_url = f"{BASE_URL}/travel-plans/{plan_id}"
                    plan_response = requests.get(get_plan_url, headers=headers)
                    
                    if plan_response.status_code == 200:
                        plan_data = plan_response.json()
                        logger.info(f"成功獲取計劃 {plan_id} 的詳情")
                        # 儲存計劃詳情到檔案
                        with open(f"plan_{plan_id}.json", "w", encoding="utf-8") as f:
                            json.dump(plan_data, f, ensure_ascii=False, indent=2)
                        logger.info(f"已將計劃詳情保存到 plan_{plan_id}.json")
                    else:
                        logger.error(f"獲取計劃詳情失敗，狀態碼: {plan_response.status_code}")
                
                return plan_id
            else:
                logger.error(f"請求失敗，狀態碼: {response.status_code}")
                logger.error(f"錯誤信息: {result.get('message', '未知錯誤')}")
                return None
        except json.JSONDecodeError:
            logger.error("無法解析響應為 JSON")
            logger.error(f"原始響應: {response.text[:500]}")
            return None
            
    except Exception as e:
        logger.error(f"發送請求時發生錯誤: {e}")
        return None

def login(email, password):
    """登入並獲取認證令牌"""
    url = f"{BASE_URL}/auth/login"
    payload = {
        "email": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    logger.info(f"正在登入 ({email})...")
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload))
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success"):
                logger.info(f"登入成功! 用戶ID: {data.get('user_id')}")
                return data.get("token")
            else:
                logger.error(f"登入失敗: {data.get('message')}")
                return None
        else:
            logger.error(f"請求失敗，狀態碼: {response.status_code}")
            return None
    except Exception as e:
        logger.error(f"登入過程中發生錯誤: {e}")
        return None

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='測試旅行計劃生成 API')
    
    # 可以直接提供令牌或登入信息
    token_group = parser.add_mutually_exclusive_group(required=True)
    token_group.add_argument('--token', type=str, help='使用現有的認證令牌')
    token_group.add_argument('--login', action='store_true', help='使用登入獲取令牌')
    
    # 登入信息
    parser.add_argument('--email', type=str, help='登入用的電子郵件')
    parser.add_argument('--password', type=str, help='登入用的密碼')
    
    args = parser.parse_args()
    
    # 獲取令牌
    token = None
    if args.token:
        token = args.token
        logger.info("使用提供的令牌")
    elif args.login:
        if not args.email or not args.password:
            logger.error("使用登入選項時必須提供電子郵件和密碼")
            exit(1)
        
        token = login(args.email, args.password)
        if not token:
            logger.error("登入失敗，無法獲取令牌")
            exit(1)
    
    # 測試生成計劃
    plan_id = test_generate_travel_plan(token)
    
    if plan_id:
        logger.info(f"測試完成，生成的計劃 ID: {plan_id}")
    else:
        logger.error("測試失敗，未能生成旅行計劃") 