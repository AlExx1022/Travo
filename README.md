# AI旅遊推薦系統

這是一個使用ChatGPT API生成旅遊行程推薦的應用程式，並使用Google Places API豐富景點資訊。

## 功能特點

- 根據使用者輸入的目的地、旅行日期、預算、興趣及行程偏好生成旅遊計畫
- 使用ChatGPT生成推薦景點
- 使用Google Places API豐富景點資訊，包括地址、評分、營業時間、照片等
- 自動安排每日行程
- 提供API端點以便前端應用調用

## 技術架構

- 後端：Flask (Python)
- AI：OpenAI GPT API
- 地點資訊：Google Places API
- 資料庫：MongoDB (尚未實現)

## 安裝與設置

1. 克隆此儲存庫
2. 安裝依賴：
   ```
   pip install -r requirements.txt
   ```
3. 設置環境變數：
   - 創建 `.env` 文件，並設置以下變數：
   ```
   # OpenAI API設置
   OPENAI_API_KEY=your_openai_api_key
   OPENAI_API_URL=https://api.openai.com/v1/chat/completions

   # Google Places API設置
   GOOGLE_PLACES_API_KEY=your_google_places_api_key

   # 應用設置
   FLASK_ENV=development
   DEBUG=True
   SECRET_KEY=your_secret_key
   ```
4. 運行應用：
   ```
   python app.py
   ```

## API使用說明

### 生成旅遊計畫

**端點**：`/api/generate_plan`

**方法**：POST

**請求格式**：
```json
{
    "destination": "東京",
    "travel_dates": {
        "start": "2023-10-01",
        "end": "2023-10-05"
    },
    "budget": "中",
    "interests": ["歷史", "美食", "文化體驗"],
    "itinerary_preference": "輕鬆",
    "travel_companions": "家庭"
}
```

**回應格式**：
```json
{
  "days": [
    {
      "day": 1,
      "schedule": [
        {
          "time": "08:00",
          "type": "景點",
          "name": "淺草寺",
          "lat": 35.7147,
          "lng": 139.7967,
          "address": "2 Chome-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan",
          "rating": 4.5,
          "opening_hours": ["Monday: 6:00 AM – 5:00 PM", ...],
          "photos": ["https://maps.googleapis.com/maps/api/place/photo?...", ...],
          "website": "https://www.senso-ji.jp/",
          "phone": "+81 3-3842-0181"
        },
        ...
      ]
    },
    ...
  ],
  "metadata": {
    "destination": "東京",
    "start_date": "2023-10-01",
    "end_date": "2023-10-05",
    "budget": "中",
    "interests": ["歷史", "美食", "文化體驗"],
    "itinerary_preference": "輕鬆",
    "travel_companions": "家庭",
    "created_at": "2023-09-15T12:34:56.789Z"
  }
}
```

## 測試

本專案包含多個測試腳本，用於測試不同功能：

1. 測試Google Places API：
   ```
   cd tests
   python test_google_places_api.py
   ```

2. 測試應用程序與Google Places API的整合：
   ```
   cd tests
   python test_app_places_integration.py
   ```

3. 測試旅遊計畫API：
   ```
   cd tests
   python test_travel_plan_api.py
   ```

測試結果將保存在 `tests/results` 目錄中。

## 專案結構

```
travo/
├── app/                    # 應用程序主目錄
│   ├── api/                # API路由
│   ├── config/             # 配置文件
│   ├── models/             # 數據模型
│   ├── static/             # 靜態文件
│   ├── templates/          # 模板文件
│   └── utils/              # 實用工具
│       ├── google_places_service.py  # Google Places API服務
│       └── gpt_service.py            # OpenAI GPT服務
├── tests/                  # 測試目錄
│   └── results/            # 測試結果
├── app.py                  # 應用程序入口點
├── .env                    # 環境變數
└── requirements.txt        # 依賴項
```

## 已完成功能

- [x] 使用OpenAI GPT API生成旅遊計畫
- [x] 使用Google Places API豐富景點資訊
- [x] 提供API端點生成旅遊計畫

## 未來計畫

- [ ] 實現MongoDB資料庫存儲行程
- [ ] 添加使用者認證功能
- [ ] 實現行程分享功能
- [ ] 開發前端界面
- [ ] 添加多語言支持 