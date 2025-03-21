#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import sys
from pymongo import MongoClient
from tabulate import tabulate
from bson import ObjectId
import os
from dotenv import load_dotenv

# 載入環境變數
load_dotenv()

# 獲取MongoDB連接字串
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
DB_NAME = os.getenv('DB_NAME', 'travo')

def connect_to_mongodb():
    """連接到MongoDB"""
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        print(f"成功連接到MongoDB: {DB_NAME}")
        return db
    except Exception as e:
        print(f"連接MongoDB時發生錯誤: {str(e)}")
        return None

def get_collections(db):
    """獲取所有集合名稱"""
    try:
        collections = db.list_collection_names()
        return collections
    except Exception as e:
        print(f"獲取集合列表時發生錯誤: {str(e)}")
        return []

def display_collections(collections):
    """顯示所有集合"""
    print("\n資料庫中的集合:")
    for i, collection in enumerate(collections, 1):
        print(f"{i}. {collection}")

def get_travel_plans(db):
    """獲取所有旅行計劃"""
    try:
        plans = list(db.travel_plans.find())
        return plans
    except Exception as e:
        print(f"獲取旅行計劃時發生錯誤: {str(e)}")
        return []

def display_plan_summary(plans):
    """顯示旅行計劃摘要"""
    if not plans:
        print("沒有找到旅行計劃!")
        return
    
    table_data = []
    for plan in plans:
        created_at = plan.get('created_at').isoformat().split('T')[0] if plan.get('created_at') else '未知'
        table_data.append([
            str(plan.get('_id')),
            plan.get('title', '未知標題'),
            plan.get('destination', '未知目的地'),
            plan.get('start_date', '未知'),
            plan.get('end_date', '未知'),
            created_at,
            plan.get('user_id', '未知用戶')
        ])
    
    headers = ["計劃ID", "標題", "目的地", "開始日期", "結束日期", "創建日期", "用戶ID"]
    print(tabulate(table_data, headers=headers, tablefmt="pretty"))

def get_plan_details(db, plan_id):
    """獲取單個旅行計劃詳細信息"""
    try:
        plan = db.travel_plans.find_one({"_id": ObjectId(plan_id)})
        return plan
    except Exception as e:
        print(f"獲取計劃詳細信息時發生錯誤: {str(e)}")
        return None

def display_plan_details(plan):
    """顯示旅行計劃詳細信息"""
    if not plan:
        print("無法獲取計劃詳細信息!")
        return
    
    print("\n" + "="*50)
    print(f"計劃ID: {plan.get('_id')}")
    print(f"計劃標題: {plan.get('title', '未知標題')}")
    print(f"目的地: {plan.get('destination', '未知目的地')}")
    print(f"日期: {plan.get('start_date', '未知')} 至 {plan.get('end_date', '未知')}")
    print(f"預算: {plan.get('budget', '未知')}")
    print(f"用戶ID: {plan.get('user_id', '未知用戶')}")
    print("="*50)
    
    # 顯示每天行程
    print("\n每日行程:")
    for day in plan.get("days", []):
        print(f"\n第 {day.get('day', '?')} 天: {day.get('date', '未知日期')} - {day.get('summary', '無摘要')}")
        
        if day.get("schedule"):
            for idx, place in enumerate(day["schedule"], 1):
                print(f"  {idx}. {place.get('name', '未知地點')} ({place.get('time', '未知時間')})")
                print(f"     類型: {place.get('type', '未知類型')}")
                print(f"     評分: {place.get('rating', '無評分')}")
                print(f"     地址: {place.get('address', '無地址信息')}")
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

def save_plan_to_file(plan, filename=None):
    """將旅行計劃保存為JSON文件"""
    if not plan:
        print("沒有計劃數據可供保存!")
        return
    
    if not filename:
        filename = f"{plan.get('destination', 'unknown')}_{plan.get('start_date', 'unknown')}_{plan.get('_id')}.json"
    
    # 將ObjectId轉換為字符串
    plan_copy = json.loads(json.dumps(plan, default=str))
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(plan_copy, f, ensure_ascii=False, indent=2)
    
    print(f"\n計劃已保存至 {filename}")

def get_users(db):
    """獲取所有用戶"""
    try:
        users = list(db.users.find())
        return users
    except Exception as e:
        print(f"獲取用戶列表時發生錯誤: {str(e)}")
        return []

def display_users(users):
    """顯示所有用戶"""
    if not users:
        print("沒有找到用戶!")
        return
    
    table_data = []
    for user in users:
        created_at = user.get('created_at').isoformat().split('T')[0] if user.get('created_at') else '未知'
        table_data.append([
            str(user.get('_id')),
            user.get('email', '未知郵箱'),
            user.get('username', '未知用戶名'),
            created_at
        ])
    
    headers = ["用戶ID", "郵箱", "用戶名", "創建日期"]
    print(tabulate(table_data, headers=headers, tablefmt="pretty"))

def main():
    # 連接到MongoDB
    db = connect_to_mongodb()
    
    if not db:
        print("無法連接到數據庫，程序終止。")
        sys.exit(1)
    
    # 獲取並顯示集合
    collections = get_collections(db)
    display_collections(collections)
    
    while True:
        print("\n" + "-"*50)
        print("請選擇操作:")
        print("1. 查看所有旅行計劃")
        print("2. 查看特定旅行計劃詳情")
        print("3. 查看所有用戶")
        print("4. 導出旅行計劃到JSON文件")
        print("q. 退出程序")
        
        choice = input("\n請輸入選項: ")
        
        if choice == '1':
            plans = get_travel_plans(db)
            display_plan_summary(plans)
            
        elif choice == '2':
            plan_id = input("請輸入要查看的計劃ID: ")
            try:
                plan = get_plan_details(db, plan_id)
                if plan:
                    display_plan_details(plan)
                else:
                    print("找不到該計劃，請確認ID是否正確。")
            except Exception as e:
                print(f"查詢計劃時發生錯誤: {str(e)}")
            
        elif choice == '3':
            users = get_users(db)
            display_users(users)
            
        elif choice == '4':
            plan_id = input("請輸入要導出的計劃ID: ")
            try:
                plan = get_plan_details(db, plan_id)
                if plan:
                    filename = input("請輸入保存的文件名 (留空使用默認名稱): ")
                    if filename.strip():
                        save_plan_to_file(plan, filename)
                    else:
                        save_plan_to_file(plan)
                else:
                    print("找不到該計劃，請確認ID是否正確。")
            except Exception as e:
                print(f"導出計劃時發生錯誤: {str(e)}")
            
        elif choice.lower() == 'q':
            print("程序已退出。")
            break
            
        else:
            print("無效選項，請重新選擇。")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n程序已中斷。")
    except Exception as e:
        print(f"\n發生錯誤: {str(e)}") 