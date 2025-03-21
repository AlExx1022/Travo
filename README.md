# AI旅遊推薦系統 (TRAVO)

這是一個使用ChatGPT API生成旅遊行程推薦的應用程式，並使用Google Places API豐富景點資訊。

## 功能特點

- 根據使用者輸入的目的地、旅行日期、預算、興趣及行程偏好生成旅遊計畫
- 使用ChatGPT生成推薦景點
- 使用Google Places API豐富景點資訊，包括地址、評分、營業時間、照片等
- 自動安排每日行程
- 提供完整的RESTful API端點
- 支援使用者帳號系統（註冊、登入、個人資料管理）
- 允許儲存、更新和刪除旅遊計畫

## 技術架構

- 後端：Flask (Python)
- 前端：計劃使用 Next.js + Tailwind CSS
- AI：OpenAI GPT API
- 地點資訊：Google Places API
- 資料庫：MongoDB

## 安裝與設置

1. 克隆此儲存庫
2. 安裝依賴：
   ```
   cd back-end
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

   # MongoDB設置
   MONGODB_URI=your_mongodb_uri

   # 應用設置
   FLASK_ENV=development
   DEBUG=True
   SECRET_KEY=your_secret_key
   JWT_SECRET_KEY=your_jwt_secret_key
   ```
4. 運行後端應用：
   ```
   cd back-end
   python app.py
   ```

## API使用說明

### 使用者認證

#### 註冊新使用者

**端點**：`/api/auth/register`

**方法**：POST

**請求格式**：
```json
{
    "name": "使用者名稱",
    "email": "user@example.com",
    "password": "password123"
}
```

#### 使用者登入

**端點**：`/api/auth/login`

**方法**：POST

**請求格式**：
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

### 旅遊計畫管理

#### 生成旅遊計畫

**端點**：`/api/travel-plans/generate`

**方法**：POST

**請求格式**：
```json
{
    "destination": "東京",
    "start_date": "2023-10-01",
    "end_date": "2023-10-05",
    "budget": "中",
    "interests": ["歷史", "美食", "文化體驗"],
    "preference": "輕鬆",
    "companions": "家庭"
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
    "preference": "輕鬆",
    "companions": "家庭",
    "created_at": "2023-09-15T12:34:56.789Z"
  }
}
```

#### 獲取所有旅遊計畫

**端點**：`/api/travel-plans`

**方法**：GET

#### 獲取特定旅遊計畫

**端點**：`/api/travel-plans/<plan_id>`

**方法**：GET

#### 更新旅遊計畫

**端點**：`/api/travel-plans/<plan_id>`

**方法**：PUT

#### 刪除旅遊計畫

**端點**：`/api/travel-plans/<plan_id>`

**方法**：DELETE

## 測試工具

本專案包含多個測試工具，用於測試不同功能：

1. API測試腳本：
   ```
   cd back-end/tests
   ./test_travel_api.sh
   ```

2. Python版API測試：
   ```
   cd back-end/tests
   python test_travel_plan_api.py
   ```

3. 資料庫查看工具：
   ```
   cd back-end/tools
   python view_database.py
   ```

4. API旅遊計畫查看工具：
   ```
   cd back-end/tools
   python view_travel_plans.py
   ```

## 專案結構

```
travo/
├── back-end/                  # 後端應用程序目錄
│   ├── app/                   # 應用程序主目錄
│   │   ├── api/               # API路由
│   │   │   ├── auth.py        # 認證相關API
│   │   │   ├── routes.py      # 基本路由設置
│   │   │   └── travel_plans.py # 旅遊計畫相關API
│   │   ├── config/            # 配置文件
│   │   ├── models/            # 數據模型
│   │   │   ├── db.py          # 資料庫連接
│   │   │   ├── travel_plan.py # 旅遊計畫模型
│   │   │   └── user.py        # 使用者模型
│   │   └── utils/             # 實用工具
│   │       ├── google_places_service.py  # Google Places API服務
│   │       └── gpt_service.py            # OpenAI GPT服務
│   ├── tests/                 # 測試目錄
│   ├── tools/                 # 工具目錄
│   ├── app.py                 # 應用程序入口點
│   └── requirements.txt       # 依賴項
├── front-end/                 # 前端應用程序目錄 (待開發)
├── docs/                      # 文檔目錄
│   ├── TRAVO_說明文件.md      # 系統說明文件
│   └── api_spec.md            # API規格文件
└── .env                       # 環境變數
```

## 已完成功能

- [x] 使用OpenAI GPT API生成旅遊計畫
- [x] 使用Google Places API豐富景點資訊
- [x] 提供完整的RESTful API
- [x] 實現MongoDB資料庫存儲行程
- [x] 添加使用者認證功能（JWT）
- [x] 實現旅遊計畫CRUD操作
- [x] 開發API測試工具和腳本
- [x] 開發資料庫查看工具
- [x] 編寫詳細的API文檔和系統說明

## 進行中的工作

- [ ] 開發前端界面 (Next.js + Tailwind CSS)

## 未來計畫

- [ ] 實現行程分享功能
- [ ] 添加行程自動推薦功能
- [ ] 優化Google Places API調用（實現緩存）
- [ ] 添加更多的旅遊偏好選項
- [ ] 實現景點搜尋和篩選功能
- [ ] 添加多語言支持
- [ ] 增加景點評論和評分功能
- [ ] 實現行程匯出功能（PDF、行事曆） 