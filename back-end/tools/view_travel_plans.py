#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import requests
import sys
from tabulate import tabulate

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
            return data.get("token"), data.get("user_id")
        else:
            print(f"登入失敗: {data.get('message')}")
            return None, None
    else:
        print(f"請求失敗，狀態碼: {response.status_code}")
        return None, None

def get_travel_plans(token):
    """獲取用戶的所有旅行計劃"""
    url = f"{BASE_URL}/travel-plans"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print("正在獲取旅行計劃列表...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"獲取旅行計劃失敗，狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        return None

def get_travel_plan_details(token, plan_id):
    """獲取特定旅行計劃的詳細信息"""
    url = f"{BASE_URL}/travel-plans/{plan_id}"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"正在獲取計劃 {plan_id} 的詳細信息...")
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        print(f"獲取計劃詳細信息失敗，狀態碼: {response.status_code}")
        print(f"回應內容: {response.text}")
        return None

def display_plan_summary(plans):
    """顯示旅行計劃摘要"""
    if not plans or not plans.get("plans"):
        print("沒有找到旅行計劃!")
        return
    
    table_data = []
    for plan in plans["plans"]:
        table_data.append([
            plan.get("plan_id"),
            plan.get("title"),
            plan.get("destination"),
            plan.get("start_date"),
            plan.get("end_date"),
            plan.get("created_at").split("T")[0]
        ])
    
    headers = ["計劃ID", "標題", "目的地", "開始日期", "結束日期", "創建日期"]
    print(tabulate(table_data, headers=headers, tablefmt="pretty"))

def display_plan_details(plan_data):
    """顯示旅行計劃詳細信息"""
    if not plan_data or not plan_data.get("plan"):
        print("無法獲取計劃詳細信息!")
        return
    
    plan = plan_data["plan"]
    
    print("\n" + "="*50)
    print(f"計劃標題: {plan.get('title')}")
    print(f"目的地: {plan.get('destination')}")
    print(f"日期: {plan.get('start_date')} 至 {plan.get('end_date')}")
    print(f"預算: {plan.get('budget_estimate')}")
    print("="*50)
    
    # 顯示每天行程
    print("\n每日行程:")
    for day in plan.get("days", []):
        print(f"\n第 {day.get('day')} 天: {day.get('date')} - {day.get('summary')}")
        
        if day.get("schedule"):
            for idx, place in enumerate(day["schedule"], 1):
                print(f"  {idx}. {place.get('name')} ({place.get('time')})")
                print(f"     類型: {place.get('type')}")
                print(f"     評分: {place.get('rating') or '無評分'}")
                print(f"     地址: {place.get('address') or '無地址信息'}")
                if place.get("tips"):
                    print(f"     小提示: {place.get('tips')}")
    
    # 顯示交通信息
    if plan.get("transportation"):
        print("\n交通信息:")
        for key, value in plan.get("transportation", {}).items():
            print(f"  {key}: {value}")
    
    # 顯示住宿信息
    if plan.get("accommodation"):
        print("\n住宿信息:")
        for key, value in plan.get("accommodation", {}).items():
            print(f"  {key}: {value}")
    
    # 顯示其他信息
    if plan.get("additional_info"):
        print("\n額外信息:")
        for key, value in plan.get("additional_info", {}).items():
            print(f"  {key}: {value}")

def save_plan_to_file(plan_data, filename=None):
    """將旅行計劃保存為JSON文件"""
    if not plan_data:
        print("沒有計劃數據可供保存!")
        return
    
    plan = plan_data.get("plan", {})
    if not filename:
        filename = f"{plan.get('destination')}_{plan.get('start_date')}_{plan.get('plan_id')}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
    
    print(f"\n計劃已保存至 {filename}")

def main():
    # 登入資訊
    email = "test@example.com"
    password = "password123"
    
    # 獲取令牌
    token, user_id = login(email, password)
    
    if not token:
        print("未能獲取令牌，無法繼續。")
        return
    
    # 獲取旅行計劃列表
    plans = get_travel_plans(token)
    
    if not plans:
        print("未能獲取旅行計劃列表。")
        return
    
    # 顯示旅行計劃摘要
    print("\n您的旅行計劃:")
    display_plan_summary(plans)
    
    # 詢問用戶是否查看特定計劃的詳細信息
    while True:
        choice = input("\n請輸入要查看的計劃ID (輸入 'q' 退出): ")
        
        if choice.lower() == 'q':
            break
        
        # 獲取並顯示計劃詳細信息
        plan_data = get_travel_plan_details(token, choice)
        
        if plan_data and plan_data.get("success"):
            display_plan_details(plan_data)
            
            # 詢問是否保存計劃到文件
            save_choice = input("\n是否保存此計劃到JSON文件? (y/n): ")
            if save_choice.lower() == 'y':
                save_plan_to_file(plan_data)
        else:
            print("無法獲取計劃詳細信息，請確認計劃ID是否正確。")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n程序已中斷。")
    except Exception as e:
        print(f"\n發生錯誤: {str(e)}") 