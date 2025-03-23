#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json
import time
import getpass
import argparse  # 添加參數解析庫
import logging
from datetime import datetime, timedelta

# 設置日誌
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API 基本URL
BASE_URL = "http://localhost:5000/api"

def register(name, email, password):
    """註冊新用戶"""
    url = f"{BASE_URL}/auth/register"
    payload = {
        "name": name,
        "email": email,
        "password": password
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    print("正在註冊新用戶...")
    response = requests.post(url, headers=headers, data=json.dumps(payload))
    
    if response.status_code in [200, 201]:
        data = response.json()
        if data.get("success", False):
            print(f"註冊成功! 用戶名: {name}")
            return True
        else:
            print(f"註冊失敗: {data.get('message', '未知錯誤')}")
            if "已存在" in str(data):
                print("該用戶可能已經存在，將嘗試直接登入。")
                return True
            return False
    else:
        print(f"請求失敗，狀態碼: {response.status_code}")
        # 如果是409錯誤（用戶已存在），我們可以嘗試登入
        if response.status_code == 409:
            print("該用戶可能已經存在，將嘗試直接登入。")
            return True
        return False

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

def get_travel_plan(token, plan_id):
    """獲取旅行計劃詳情"""
    url = f"{BASE_URL}/travel-plans/{plan_id}"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"正在獲取計劃 ID: {plan_id} 的詳細資訊...")
    print(f"使用 API 路徑: {url}")
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"獲取成功! 響應狀態碼: {response.status_code}")
        
        # 如果響應是嵌套在 'plan' 字段中的數據結構，提取主要計劃數據
        if isinstance(data, dict) and 'plan' in data:
            print("檢測到'plan'字段，提取計劃數據")
            plan_data = data['plan']
            return plan_data
        return data
    else:
        print(f"獲取計劃失敗，狀態碼: {response.status_code}")
        print(f"響應內容: {response.text[:200]}...")
        
        # 如果計劃無法獲取，輸出更多診斷信息
        if response.status_code == 404:
            print("旅行計劃不存在或已被刪除。")
        elif response.status_code == 401:
            print("認證失敗，請檢查您的認證令牌是否有效。")
        elif response.status_code == 403:
            print("您沒有權限查看此旅行計劃。")
        
        # 嘗試獲取所有旅行計劃列表以幫助診斷
        print("\n嘗試獲取所有旅行計劃列表...")
        list_url = f"{BASE_URL}/travel-plans"
        list_response = requests.get(list_url, headers=headers)
        
        if list_response.status_code == 200:
            try:
                plans_data = list_response.json()
                if 'plans' in plans_data and isinstance(plans_data['plans'], list):
                    plans = plans_data['plans']
                    print(f"找到 {len(plans)} 個旅行計劃:")
                    for i, plan in enumerate(plans, 1):
                        plan_id_value = plan.get('plan_id')
                        title = plan.get('title', '未命名計劃')
                        destination = plan.get('destination', '未知目的地')
                        print(f"  {i}. ID: {plan_id_value} - {title} ({destination})")
                        
                        # 檢查是否是我們要查找的計劃
                        if plan_id_value == plan_id:
                            print(f"找到目標計劃! ID: {plan_id}")
                else:
                    print("獲取計劃列表的響應格式不符合預期")
            except Exception as e:
                print(f"解析計劃列表時出錯: {str(e)}")
        else:
            print(f"獲取計劃列表失敗，狀態碼: {list_response.status_code}")
        
        return None

def display_travel_plan(plan_data):
    """美化顯示旅行計劃"""
    if not plan_data:
        print("沒有可顯示的計劃數據。")
        return
    
    # 調試信息
    print("\n調試信息:")
    print(f"計劃數據類型: {type(plan_data)}")
    if isinstance(plan_data, dict):
        print(f"計劃數據頂層鍵: {list(plan_data.keys())}")
    
    print("\n" + "="*60)
    print(f"【{plan_data.get('destination', '未知目的地')}旅行計劃】")
    if 'title' in plan_data:
        print(f"計劃名稱: {plan_data.get('title', '無標題')}")
    print("="*60)
    
    # 顯示計劃元數據
    print(f"日期: {plan_data.get('start_date', '無開始日期')} 至 {plan_data.get('end_date', '無結束日期')}")
    
    # 顯示預算信息
    if 'budget_estimate' in plan_data and isinstance(plan_data['budget_estimate'], dict):
        budget = plan_data['budget_estimate']
        print("\n【預算估計】")
        
        total = 0
        for category, amount in budget.items():
            # 嘗試提取數字部分
            if isinstance(amount, str):
                try:
                    # 移除非數字字符
                    numeric_part = ''.join(c for c in amount if c.isdigit())
                    if numeric_part:
                        amount_value = int(numeric_part)
                        total += amount_value
                except:
                    pass
            print(f"  {category}: {amount}")
        
        print(f"  總計: 約 {total} TWD (如果適用)")
    
    # 顯示行程安排
    print("\n【行程安排】")
    if 'days' in plan_data and isinstance(plan_data['days'], list) and plan_data['days']:
        for i, day in enumerate(plan_data['days'], 1):
            if not isinstance(day, dict):
                continue
                
            date_info = day.get('date', f'第 {i} 天')
            print(f"\n★ {date_info} ★")
            
            if 'activities' in day and isinstance(day['activities'], list) and day['activities']:
                for j, activity in enumerate(day['activities'], 1):
                    if not isinstance(activity, dict):
                        continue
                        
                    time_info = activity.get('time', '無時間')
                    name = activity.get('name', '未命名活動')
                    location = activity.get('location', '無地點')
                    
                    print(f"  {j}. {time_info}: {name}")
                    print(f"     📍 {location}")
                    
                    if 'description' in activity and activity['description']:
                        desc = activity['description']
                        # 截斷長描述，只顯示前100個字符
                        if len(desc) > 100:
                            desc = desc[:97] + "..."
                        print(f"     ℹ️ {desc}")
                    
                    if 'duration' in activity:
                        print(f"     ⏱️ 持續時間: {activity.get('duration')}")
                    
                    if 'opening_hours' in activity:
                        print(f"     🕒 開放時間: {activity.get('opening_hours')}")
            else:
                print("  沒有安排活動")
    else:
        print("  沒有行程安排。")
    
    print("="*60)

def main():
    parser = argparse.ArgumentParser(description='TRAVO 旅行計劃 API 測試工具')
    parser.add_argument('--auto', action='store_true', help='自動模式，使用默認設置')
    parser.add_argument('--email', type=str, help='用戶電子郵件')
    parser.add_argument('--password', type=str, help='用戶密碼')
    parser.add_argument('--destination', type=str, default='東京', help='旅行目的地')
    parser.add_argument('--start_date', type=str, default='2023-10-01', help='開始日期 (YYYY-MM-DD)')
    parser.add_argument('--end_date', type=str, default='2023-10-06', help='結束日期 (YYYY-MM-DD)')
    parser.add_argument('--getonly', action='store_true', help='只獲取現有計劃，不創建新計劃')
    parser.add_argument('--plan_id', type=str, help='要獲取的特定計劃ID')
    
    args = parser.parse_args()
    
    print("==== TRAVO 旅行計劃 API 測試工具 ====")
    print("請確保後端服務正在運行於: " + BASE_URL)
    
    # 檢測是否應該使用自動模式
    use_auto_mode = args.auto or args.email or args.getonly
    
    # 自動模式或者使用命令行參數
    if use_auto_mode:
        email = args.email or 'test@example.com'
        password = args.password or 'password123'
        is_register = False
        name = 'Test User'
        print(f"\n自動模式: 使用帳號 {email}")
    else:
        print("\n1. 首先，您需要註冊或登入")
        
        # 獲取用戶輸入
        while True:
            choice = input("\n選擇操作 [1: 註冊新用戶, 2: 使用現有帳號登入]: ")
            if choice in ['1', '2']:
                break
            print("無效選擇，請輸入 1 或 2")
        
        # 獲取用戶資訊
        email = input("請輸入電子郵件: ")
        password = getpass.getpass("請輸入密碼: ")
        
        is_register = (choice == '1')
        
        if is_register:
            name = input("請輸入用戶名: ")
    
    # 執行註冊或登入
    if use_auto_mode:
        # 自動模式嘗試直接登入
        token = login(email, password)
        if not token and not args.getonly:
            print("登入失敗，嘗試註冊...")
            register_success = register(name, email, password)
            if register_success:
                token = login(email, password)
    else:
        # 互動模式按照用戶選擇
        if is_register:
            register_success = register(name, email, password)
            if not register_success:
                print("註冊失敗，無法繼續。")
                return
        
        # 獲取令牌
        token = login(email, password)
    
    if not token:
        print("未能獲取令牌，無法繼續。")
        return
    
    # 如果指定了只獲取現有計劃
    if args.getonly and args.plan_id:
        print(f"\n正在獲取指定計劃: {args.plan_id}")
        plan_details = get_travel_plan(token, args.plan_id)
        if plan_details:
            display_travel_plan(plan_details)
        else:
            print(f"無法獲取計劃 {args.plan_id} 的詳情。")
        return
    
    # 獲取旅行計劃參數
    if use_auto_mode:
        destination = args.destination
        start_date = args.start_date
        end_date = args.end_date
        budget = '中'
        preference = '平衡'
        companion = '個人'
        interests = ['美食', '歷史', '購物']
        print(f"\n自動模式: 生成 {destination} 旅行計劃 ({start_date} 至 {end_date})")
    else:
        print("\n===== 輸入旅行計劃資訊 =====")
        
        # 提供目的地選擇或自定義輸入
        print("\n選擇目的地或自定義輸入:")
        print("1. 東京")
        print("2. 京都")
        print("3. 大阪")
        print("4. 台北")
        print("5. 香港")
        print("6. 自定義")
        
        while True:
            destination_choice = input("請選擇 [1-6]: ")
            if destination_choice in ['1', '2', '3', '4', '5', '6']:
                break
            print("無效選擇，請輸入 1-6 之間的數字")
        
        # 根據選擇設置目的地
        destinations = {
            '1': '東京',
            '2': '京都',
            '3': '大阪',
            '4': '台北',
            '5': '香港'
        }
        
        if destination_choice == '6':
            destination = input("請輸入目的地: ")
        else:
            destination = destinations[destination_choice]
        
        # 獲取日期
        start_date = input("請輸入開始日期 (YYYY-MM-DD): ")
        end_date = input("請輸入結束日期 (YYYY-MM-DD): ")
        
        # 選擇預算
        print("\n選擇預算:")
        print("1. 低")
        print("2. 中")
        print("3. 高")
        
        while True:
            budget_choice = input("請選擇 [1-3]: ")
            if budget_choice in ['1', '2', '3']:
                break
            print("無效選擇，請輸入 1-3 之間的數字")
        
        budgets = {
            '1': '低',
            '2': '中',
            '3': '高'
        }
        budget = budgets[budget_choice]
        
        # 選擇喜好
        print("\n選擇旅行風格:")
        print("1. 輕鬆")
        print("2. 充實")
        print("3. 平衡")
        
        while True:
            preference_choice = input("請選擇 [1-3]: ")
            if preference_choice in ['1', '2', '3']:
                break
            print("無效選擇，請輸入 1-3 之間的數字")
        
        preferences = {
            '1': '輕鬆',
            '2': '充實',
            '3': '平衡'
        }
        preference = preferences[preference_choice]
        
        # 選擇同伴
        print("\n選擇同伴類型:")
        print("1. 個人")
        print("2. 朋友")
        print("3. 家庭")
        print("4. 情侶")
        
        while True:
            companion_choice = input("請選擇 [1-4]: ")
            if companion_choice in ['1', '2', '3', '4']:
                break
            print("無效選擇，請輸入 1-4 之間的數字")
        
        companions = {
            '1': '個人',
            '2': '朋友',
            '3': '家庭',
            '4': '情侶'
        }
        companion = companions[companion_choice]
        
        # 選擇興趣 (允許多選)
        print("\n選擇興趣 (可多選，用逗號分隔):")
        print("1. 美食")
        print("2. 歷史")
        print("3. 購物")
        print("4. 藝術")
        print("5. 自然")
        print("6. 科技")
        print("7. 現代文化")
        print("8. 傳統文化")
        
        interest_options = {
            '1': '美食',
            '2': '歷史',
            '3': '購物',
            '4': '藝術',
            '5': '自然',
            '6': '科技',
            '7': '現代文化',
            '8': '傳統文化'
        }
        
        interest_choices = input("請選擇 (例如: 1,3,5): ")
        interests = []
        
        for choice in interest_choices.split(','):
            choice = choice.strip()
            if choice in interest_options:
                interests.append(interest_options[choice])
    
    # 準備旅行計劃數據
    travel_plan = {
        "destination": destination,
        "start_date": start_date,
        "end_date": end_date,
        "budget": budget,
        "interests": interests,
        "preference": preference,
        "companions": companion
    }
    
    # 生成旅行計劃
    print(f"\n===== 生成{destination}旅行計劃 =====")
    result = generate_travel_plan(token, travel_plan)
    
    # 調試：顯示原始響應摘要
    print(f"\n生成計劃API響應 (摘要):")
    result_str = json.dumps(result, ensure_ascii=False)
    print(f"響應長度: {len(result_str)} 字節")
    print(f"響應預覽: {result_str[:200]}...")
    
    # 分析結果
    plan_id = None
    if isinstance(result, dict):
        # 打印頂層鍵以幫助調試
        print(f"響應頂層鍵: {list(result.keys())}")
        
        # 嘗試從不同可能的鍵獲取計劃ID
        plan_id = result.get('plan_id') or result.get('id') or result.get('_id')
        if not plan_id and 'data' in result:
            data = result.get('data', {})
            if isinstance(data, dict):
                print(f"數據層鍵: {list(data.keys())}")
                plan_id = data.get('plan_id') or data.get('id') or data.get('_id')
    
    if plan_id:
        print(f"\n成功創建{destination}旅行計劃! 計劃ID: {plan_id}")
        
        # 增加延遲等待後端處理完成
        print("等待3秒讓後端完成數據處理...")
        time.sleep(3)
        
        # 獲取並顯示完整計劃
        plan_details = get_travel_plan(token, plan_id)
        if plan_details:
            display_travel_plan(plan_details)
        else:
            print(f"無法獲取{destination}計劃詳情。")
            print("嘗試使用原始響應數據顯示：")
            display_travel_plan(result)
    else:
        print(f"\n創建{destination}旅行計劃失敗或無法提取計劃ID。")
        print("\n原始回應:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\n===== 測試完成 =====")
    print("API 操作已完成！您可以在系統中查看創建的旅行計劃。")

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
    
    logger.info(f"發送請求到 {BASE_URL}/travel-plans/generate")
    logger.info(f"請求數據: {json.dumps(payload, ensure_ascii=False, indent=2)}")
    
    try:
        # 發送 POST 請求
        response = requests.post(f"{BASE_URL}/travel-plans/generate", headers=headers, json=payload)
        
        # 檢查響應
        if response.status_code == 201:
            logger.info("請求成功!")
            result = response.json()
            logger.info(f"響應數據: {json.dumps(result, ensure_ascii=False, indent=2)}")
            logger.info(f"生成的旅行計劃 ID: {result.get('plan_id')}")
            return result.get('plan_id')
        else:
            logger.error(f"請求失敗，狀態碼: {response.status_code}")
            logger.error(f"錯誤信息: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"發送請求時發生錯誤: {e}")
        return None

if __name__ == "__main__":
    # 執行主流程
    print("執行主要測試流程...")
    main()
    
    # 如果需要單獨測試生成旅行計劃功能，請取消下面的註釋並提供有效的令牌
    # print("\n單獨測試生成旅行計劃API...")
    # test_token = "your_valid_token_here"  # 替換為有效的身份驗證令牌
    # test_generate_travel_plan(test_token) 