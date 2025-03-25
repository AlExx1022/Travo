# TRAVO - 智能旅行規劃系統

TRAVO 是一個智能旅行規劃系統，使用 AI 技術為用戶創建個性化的旅行行程，並整合了 Google Places API 提供豐富的目的地信息。

## 最近更新

- 2023.03.25: 將前端認證系統從模擬改為連接實際後端 API，完整支持用戶註冊與登入功能。

## 功能

- **個性化旅行規劃**：根據用戶偏好智能生成旅行計劃
- **使用者認證**：完整的註冊和登入功能
- **豐富的目的地資訊**：整合 Google Places API 提供詳細的景點資訊
- **個性化推薦**：根據用戶偏好和歷史記錄推薦旅行目的地和活動

## 技術堆疊

### 前端
- React + TypeScript
- React Router v6 
- Tailwind CSS 用於 UI 設計
- Context API 用於狀態管理

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
│   ├── components/         # 可重用組件
│   │   ├── Header.tsx      # 網站頭部導航
│   │   └── Logo.tsx        # Logo 組件
│   ├── contexts/
│   │   └── AuthContext.tsx # 認證上下文 (整合後端API)
│   ├── services/
│   │   └── authService.ts  # 認證服務 (API 客戶端)
│   ├── pages/
│   │   ├── HomePage.tsx    # 首頁
│   │   └── auth/           # 認證頁面
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   ├── App.tsx             # 應用程序入口點和路由配置
│   └── main.tsx            # 渲染入口點
```

### 後端 (Flask)
```
back-end/
├── app/
│   ├── api/
│   │   ├── auth.py         # 認證相關 API 端點
│   │   └── travel_plans.py # 旅行計劃相關 API 端點
│   ├── models/
│   │   ├── user.py         # 用戶模型
│   │   └── travel_plan.py  # 旅行計劃模型
│   └── utils/              # 工具函數
├── app.py                  # 應用程序入口點
└── requirements.txt        # 依賴項
```

## 功能模塊

### 用戶認證系統
- 使用 JWT 進行用戶認證
- 使用 MongoDB 存儲用戶信息
- 密碼加密儲存
- 前端使用 Context API 在應用程序中共享認證狀態

### 首頁
- 公司簡介和產品特點
- 熱門目的地展示
- 無需登入即可訪問

### 旅行規劃 (建設中)
- 使用 AI 自動生成旅行計劃
- 根據用戶輸入的目的地、日期、預算和偏好生成個性化行程
- 整合 Google Places API 獲取景點詳細信息

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

## 下一步計劃

- 實現旅行規劃頁面
- 添加用戶個人資料頁面
- 實現旅行歷史和收藏功能
- 添加社交分享功能 