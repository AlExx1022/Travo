# TRAVO 旅行計劃生成系統說明文件

## 一、系統概述

TRAVO 是一個智能旅行計劃生成系統，使用 OpenAI GPT 和 Google Places API 自動生成個性化旅行計劃。系統通過 RESTful API 提供服務，使用 Flask 作為後端框架，MongoDB 作為數據庫。

## 二、文件結構

```
travo/
├── app/                      # 主應用目錄
│   ├── api/                  # API 端點
│   │   ├── auth.py           # 認證相關 API
│   │   ├── routes.py         # 路由設定
│   │   └── travel_plans.py   # 旅行計劃相關 API
│   ├── config/               # 配置文件
│   ├── models/               # 數據模型
│   │   ├── db.py             # 數據庫連接
│   │   ├── travel_plan.py    # 旅行計劃模型
│   │   └── user.py           # 用戶模型
│   ├── utils/                # 工具函數
│   │   ├── gpt_service.py    # OpenAI GPT 服務
│   │   └── google_places_service.py  # Google Places API 服務
│   └── __init__.py           # 應用初始化
├── app.py                    # 應用入口點
├── .env                      # 環境變數
├── requirements.txt          # 依賴包
├── view_travel_plans.py      # 通過 API 查看旅行計劃工具
├── view_database.py          # 直接從數據庫查看旅行計劃工具
├── test_travel_plan_api.py   # API 測試工具 (Python)
└── test_travel_api.sh        # API 測試工具 (Shell)
```

## 三、系統流程

### 1. 用戶認證流程

1. 用戶通過 `/api/auth/register` 註冊帳號
2. 用戶通過 `/api/auth/login` 登入獲取 JWT token
3. 後續請求使用 Bearer token 進行認證

### 2. 旅行計劃生成流程

```
用戶輸入
  │
  ▼
API接收請求 (/api/travel-plans/generate)
  │
  ▼
參數驗證與處理
  │
  ▼
調用 gpt_service.generate_travel_plan()
  │
  ├───► 計算旅行天數 (calculate_days)
  │
  ├───► 創建 GPT 提示 (create_prompt)
  │
  ├───► 調用 OpenAI API (call_openai_api)
  │    
  ▼
調用 google_places_service.enrich_travel_plan()
  │
  ├───► 處理旅行計劃元數據
  │
  ├───► 遍歷每日行程
  │
  ├───► 遍歷每個景點
  │
  ├───► 調用 Google Places API 搜索景點
  │
  ├───► 調用 Google Places API 獲取景點詳細信息
  │
  ├───► 整合景點信息到行程中
  │    
  ▼
保存到 MongoDB
  │
  ▼
返回旅行計劃給用戶
```

### 3. 旅行計劃查詢流程

1. 用戶通過 `/api/travel-plans` 獲取所有旅行計劃
2. 用戶通過 `/api/travel-plans/<plan_id>` 獲取特定旅行計劃詳情

## 四、使用的 API

### 1. 外部 API

| API | 用途 | 位置 |
|-----|------|------|
| **OpenAI GPT API** | 生成旅行計劃初始內容 | app/utils/gpt_service.py |
| **Google Places API - Text Search** | 搜索景點基本信息 | app/utils/google_places_service.py |
| **Google Places API - Place Details** | 獲取景點詳細信息 | app/utils/google_places_service.py |
| **Google Places API - Place Photos** | 獲取景點照片 | app/utils/google_places_service.py |

### 2. 內部 API 端點

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/auth/register` | POST | 用戶註冊 |
| `/api/auth/login` | POST | 用戶登入獲取 token |
| `/api/auth/profile` | GET | 獲取用戶資料 |
| `/api/travel-plans` | GET | 獲取所有旅行計劃 |
| `/api/travel-plans` | POST | 創建新旅行計劃 |
| `/api/travel-plans/<plan_id>` | GET | 獲取特定旅行計劃 |
| `/api/travel-plans/<plan_id>` | PUT | 更新旅行計劃 |
| `/api/travel-plans/<plan_id>` | DELETE | 刪除旅行計劃 |
| `/api/travel-plans/generate` | POST | 生成旅行計劃 |

## 五、測試工具使用方法

### 1. view_travel_plans.py

通過 API 查看旅行計劃的工具，需要先登入獲取 token。

```bash
python view_travel_plans.py
```

功能：
- 登入系統
- 列出所有旅行計劃
- 查看特定旅行計劃詳情
- 將旅行計劃導出為 JSON 文件

### 2. view_database.py

直接從 MongoDB 數據庫查看旅行計劃和用戶數據的工具。

```bash
python view_database.py
```

功能：
- 連接 MongoDB 數據庫
- 顯示數據庫中的集合
- 查看所有旅行計劃
- 查看特定旅行計劃詳情
- 查看所有用戶
- 將旅行計劃導出為 JSON 文件

### 3. test_travel_plan_api.py

用 Python 測試旅行計劃生成 API 的工具。

```bash
python test_travel_plan_api.py
```

### 4. test_travel_api.sh

用 Shell 腳本測試旅行計劃生成 API 的工具。

```bash
./test_travel_api.sh
```

## 六、旅行計劃數據結構

```json
{
  "plan_id": "唯一ID",
  "user_id": "用戶ID",
  "title": "旅行標題",
  "destination": "目的地",
  "start_date": "開始日期",
  "end_date": "結束日期",
  "duration_days": 天數,
  "budget": "預算等級",
  "interests": ["興趣1", "興趣2", ...],
  "itinerary_preference": "行程偏好",
  "travel_companions": "同行者類型",
  "days": [
    {
      "day": 天數,
      "date": "日期",
      "summary": "日期摘要",
      "schedule": [
        {
          "name": "景點名稱",
          "time": "訪問時間",
          "description": "景點描述",
          "type": "景點類型",
          "address": "地址",
          "location": {
            "lat": 緯度,
            "lng": 經度
          },
          "rating": 評分,
          "photos": ["照片URL1", "照片URL2", ...],
          "website": "網站",
          "phone": "電話",
          "price_level": 價格等級,
          "tags": ["標籤1", "標籤2", ...],
          "tips": "小提示"
        }
      ]
    }
  ],
  "transportation": {
    "airport_to_hotel": "交通方式",
    "local": "當地交通",
    "hotel_to_airport": "交通方式"
  },
  "accommodation": {
    "recommendation": "推薦",
    "areas": ["區域1", "區域2", ...],
    "options": ["選項1", "選項2", ...]
  },
  "budget_estimate": "預算估算",
  "weather_forecast": "天氣預報",
  "additional_info": {
    "local_customs": "當地習俗",
    "safety_tips": "安全提示",
    "useful_phrases": "有用的短語"
  },
  "created_at": "創建時間",
  "updated_at": "更新時間",
  "is_public": 是否公開,
  "version": "版本號"
}
```

## 七、已修復的問題

1. `google_places_service.py` 中的 `enrich_travel_plan` 函數無法訪問 `travel_plan["metadata"]` 的問題
2. 更新程式碼以直接從 plan 對象中獲取數據，使用 `get` 方法安全地獲取字段值
3. 修復了 `days` 數組的迭代方式，確保程式能夠處理空數組 