#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import time

# API 基本URL
BASE_URL = "http://localhost:5000/api"

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
    
    print("正在登入...")
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            print(f"登入成功! 用戶ID: {data.get('user_id')}")
            return data.get("token")
        else:
            print(f"登入失敗: {data.get('message')}")
            return None
    else:
        print(f"請求失敗，狀態碼: {response.status_code}")
        return None

def generate_travel_plan(token, plan_data):
    """生成旅行計劃"""
    url = f"{BASE_URL}/travel-plans/generate"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    print("正在生成旅行計劃...")
    print(f"目的地: {plan_data.get('destination')}")
    print(f"日期: {plan_data.get('start_date')} 至 {plan_data.get('end_date')}")
    
    response = requests.post(url, headers=headers, data=json.dumps(plan_data))
    
    print(f"回應狀態碼: {response.status_code}")
    return response.json()

def main():
    # 登入資訊
    email = "test@example.com"
    password = "password123"
    
    # 獲取令牌
    token = login(email, password)
    
    if not token:
        print("未能獲取令牌，無法繼續。")
        return
    
    # 準備京都旅行計劃數據
    kyoto_plan = {
        "destination": "京都",
        "start_date": "2023-10-01",
        "end_date": "2023-10-03",
        "budget": "中",
        "interests": ["歷史", "美食"],
        "preference": "輕鬆",
        "companions": "個人"
    }
    
    # 生成旅行計劃
    print("\n===== 生成京都旅行計劃 =====")
    result = generate_travel_plan(token, kyoto_plan)
    
    # 輸出結果
    print("\n結果:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result.get("success"):
        print(f"\n成功創建旅行計劃! 計劃ID: {result.get('plan_id')}")
    else:
        print(f"\n創建旅行計劃失敗: {result.get('message')}")
        
    # 準備東京旅行計劃數據
    tokyo_plan = {
        "destination": "東京",
        "start_date": "2023-11-10",
        "end_date": "2023-11-15",
        "budget": "高",
        "interests": ["購物", "科技", "現代文化"],
        "preference": "充實",
        "companions": "朋友"
    }
    
    # 等待一下再發送第二個請求
    time.sleep(2)
    
    # 生成第二個旅行計劃
    print("\n\n===== 生成東京旅行計劃 =====")
    result = generate_travel_plan(token, tokyo_plan)
    
    # 輸出結果
    print("\n結果:")
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    if result.get("success"):
        print(f"\n成功創建旅行計劃! 計劃ID: {result.get('plan_id')}")
    else:
        print(f"\n創建旅行計劃失敗: {result.get('message')}")

if __name__ == "__main__":
    main() 