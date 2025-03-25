# TRAVO - 智能旅行規劃系統

TRAVO 是一個智能旅行規劃系統，使用 AI 技術為用戶創建個性化的旅行行程，並整合了 Google Places API 提供豐富的目的地信息。

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
- SQLAlchemy 用於數據庫操作
- OpenAI API 用於生成旅行計劃
- Google Places API 用於獲取地點信息

## 專案結構

```
front-end/
├── src/
│   ├── components/         # 可重用組件
│   │   ├── Header.tsx      # 網站頭部導航
│   │   └── Logo.tsx        # Logo 組件
│   ├── contexts/
│   │   └── AuthContext.tsx # 認證上下文
│   ├── pages/
│   │   ├── HomePage.tsx    # 首頁
│   │   └── auth/           # 認證頁面
│   │       ├── LoginPage.tsx
│   │       └── RegisterPage.tsx
│   ├── App.tsx             # 應用程序入口點和路由配置
│   └── main.tsx            # 渲染入口點
```

## 功能模塊

### 用戶認證系統
- 使用 JWT 進行用戶認證
- 使用 localStorage 存儲認證令牌
- 使用 Context API 在應用程序中共享認證狀態

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
python run.py
```

## 下一步計劃

- 實現旅行規劃頁面
- 添加用戶個人資料頁面
- 實現旅行歷史和收藏功能
- 添加社交分享功能

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
