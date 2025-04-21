# TRAVO - 智能旅行規劃系統

TRAVO 是一個智能旅行規劃系統，使用 AI 技術為用戶創建個性化的旅行行程，並整合了 Google Maps 和 Places API 提供豐富的目的地信息和視覺體驗。

## 最近更新

- 2023.04.10: 完成首頁設計與實現，整合 Google Maps JavaScript API 顯示世界著名景點照片，優化用戶體驗。
- 2023.04.02: 完成旅行計劃活動刪除功能，解決資料庫操作中的不可變欄位問題，提升用戶體驗。
- 2023.03.25: 將前端認證系統從模擬改為連接實際後端 API，完整支持用戶註冊與登入功能。

## 功能

- **美觀的首頁設計**：展示世界著名景點照片和旅行計劃功能介紹
- **個性化旅行規劃**：根據用戶偏好智能生成旅行計劃
- **旅行活動管理**：支持添加、編輯和刪除旅行活動，包含離線操作的容錯機制
- **使用者認證**：完整的註冊和登入功能
- **豐富的目的地資訊**：整合 Google Places API 提供詳細的景點資訊和照片
- **個性化推薦**：根據用戶偏好和歷史記錄推薦旅行目的地和活動
- **旅行計劃查看與分享**：瀏覽自己與他人的旅行計劃

## 技術堆疊

### 前端
- React + TypeScript
- React Router v6 
- Tailwind CSS 用於 UI 設計
- Context API 用於狀態管理
- Google Maps JavaScript API 用於獲取地點照片和資訊
- React Slick 用於照片輪播功能

### 後端
- Flask (Python)
- MongoDB 用於數據儲存
- JWT 用於認證
- SQLAlchemy 用於數據庫操作
- OpenAI API 用於生成旅行計劃
- Google Places API 用於獲取地點信息

## 專案結構

### 前端 (React)
```
front-end/
├── src/
│   ├── components/            # 可重用組件
│   │   ├── Header.tsx         # 網站頭部導航
│   │   ├── Logo.tsx           # Logo 組件
│   │   └── travel-plan/       # 旅行計劃相關組件
│   │       ├── ActivityForm.tsx     # 活動表單
│   │       ├── DaySection.tsx       # 日程區塊
│   │       ├── ImageCarousel.tsx    # 圖片輪播
│   │       ├── PlanMap.tsx          # 行程地圖
│   │       ├── RatingDisplay.tsx    # 評分顯示
│   │       └── TimelineConnector.tsx # 時間軸連接器
│   ├── contexts/
│   │   └── AuthContext.tsx    # 認證上下文
│   ├── services/
│   │   ├── apiService.ts      # API 基礎服務
│   │   ├── authService.ts     # 認證服務
│   │   └── travelPlanService.ts # 旅行計劃服務
│   ├── types/
│   │   └── TravelPlan.ts      # 旅行計劃類型定義
│   ├── pages/
│   │   ├── HomePage.tsx       # 首頁 (完成) - 展示景點照片和功能介紹
│   │   ├── ExplorePage.tsx    # 探索頁面 - 瀏覽公開旅行計劃
│   │   ├── BuildPage.tsx      # 建立旅行計劃頁面
│   │   ├── TravelPlanPage.tsx # 旅行計劃編輯頁面
│   │   ├── ViewTravelPlanPage.tsx # 查看旅行計劃頁面
│   │   ├── MyTravelPlansPage.tsx  # 我的旅行計劃頁面
│   │   └── auth/              # 認證頁面
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   ├── routes/
│   │   └── index.tsx         # 路由配置
│   ├── App.tsx              # 應用程序入口點
│   └── main.tsx             # 渲染入口點
```

### 後端 (Flask)
```
back-end/
├── app/
│   ├── api/
│   │   ├── auth.py            # 認證相關 API 端點
│   │   └── travel_plans.py    # 旅行計劃相關 API 端點 (支持照片數據)
│   ├── models/
│   │   ├── db.py              # 數據庫連接配置
│   │   ├── user.py            # 用戶模型
│   │   └── travel_plan.py     # 旅行計劃模型
│   ├── utils/
│   │   ├── google_places_service.py # Google Places API 服務
│   │   └── gpt_service.py     # OpenAI GPT 服務
│   ├── config/
│   │   └── config.py          # 應用配置
│   └── __init__.py            # 應用初始化
├── tools/                     # 工具腳本
├── tests/                     # 測試文件
├── enriched_plans/            # 豐富化的旅行計劃數據
├── app.py                     # 應用程序入口點
└── requirements.txt           # 依賴項
```

## 已完成功能模塊

### 用戶認證系統 ✅
- 使用 JWT 進行用戶認證
- 支持用戶註冊和登錄
- 密碼加密儲存
- 前端使用 Context API 在應用程序中共享認證狀態

### 首頁 ✅
- 公司簡介和產品特點展示
- 熱門目的地照片展示（使用 Google Maps JavaScript API）
- 景點輪播功能（使用 React Slick）
- 響應式設計，適配不同設備
- 豐富的視覺體驗和直觀的操作界面

### 探索頁面 ✅
- 瀏覽公開的旅行計劃
- 查看旅行計劃詳情和活動照片
- 支持熱門旅行計劃推薦

### 旅行計劃管理 ✅
- 查看個人旅行計劃列表
- 旅行計劃的創建與編輯
- 旅行計劃的共享和隱私設置
- 活動的添加、編輯和刪除

### 旅行計劃生成 ✅
- 使用 OpenAI GPT 自動生成旅行計劃
- 根據用戶輸入的目的地、日期、預算和偏好生成個性化行程
- 整合 Google Places API 獲取景點詳細信息
- 支持保存和共享旅行計劃

### 地圖與活動視覺化 ✅
- 旅行計劃地圖顯示
- 活動時間軸展示
- 景點圖片輪播

## 安裝與運行

### 前端
```bash
cd front-end
npm install
npm run dev
```

### 後端
```bash
cd back-end
pip install -r requirements.txt
python app.py
```

## 環境變數設置
前端需要以下環境變數：
```
VITE_API_BASE_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

後端需要以下環境變數：
```
FLASK_APP=app.py
FLASK_ENV=development
SECRET_KEY=your_secret_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MONGODB_URI=your_mongodb_uri
```
