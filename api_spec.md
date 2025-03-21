# Travo 旅遊計劃系統 API 規格文檔

本文檔詳細說明了 Travo 旅遊計劃系統的所有 API 端點、使用方法和測試範例。

## 基本資訊

- **基礎 URL**: `http://localhost:5000/api`
- **身份驗證**: 大部分 API 需要 JWT Token，在請求頭中使用 `Authorization: Bearer {token}` 格式提供

## 目錄

1. [用戶認證 API](#用戶認證-api)
2. [旅行計劃 API](#旅行計劃-api)

---

## 用戶認證 API

### 1. 用戶註冊

- **URL**: `/auth/register`
- **方法**: `POST`
- **描述**: 創建新用戶並返回 JWT Token
- **需要身份驗證**: 否
- **請求體**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **成功回應** (201 Created):
```json
{
  "success": true,
  "message": "註冊成功",
  "token": "eyJ0eXA...",
  "user_id": "67d7d190dc53d80cf563d5e9"
}
```
- **Postman 測試範例**:
  - 方法: `POST`
  - URL: `http://localhost:5000/api/auth/register`
  - Headers: `Content-Type: application/json`
  - Body (raw, JSON):
  ```json
  {
    "email": "newuser@example.com",
    "password": "securepass123"
  }
  ```

### 2. 用戶登錄

- **URL**: `/auth/login`
- **方法**: `POST`
- **描述**: 驗證用戶憑證並返回 JWT Token
- **需要身份驗證**: 否
- **請求體**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
- **成功回應** (200 OK):
```json
{
  "success": true,
  "message": "登錄成功",
  "token": "eyJ0eXA...",
  "user_id": "67d7d190dc53d80cf563d5e9"
}
```
- **Postman 測試範例**:
  - 方法: `POST`
  - URL: `http://localhost:5000/api/auth/login`
  - Headers: `Content-Type: application/json`
  - Body (raw, JSON):
  ```json
  {
    "email": "test@example.com",
    "password": "password123"
  }
  ```

### 3. 獲取用戶資料

- **URL**: `/auth/profile`
- **方法**: `GET`
- **描述**: 獲取當前登錄用戶的資料
- **需要身份驗證**: 是
- **成功回應** (200 OK):
```json
{
  "success": true,
  "user": {
    "email": "user@example.com",
    "user_id": "67d7d190dc53d80cf563d5e9",
    "created_at": "2023-10-15T08:30:45.123Z"
  }
}
```
- **Postman 測試範例**:
  - 方法: `GET`
  - URL: `http://localhost:5000/api/auth/profile`
  - Headers: 
    - `Content-Type: application/json`
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`

---

## 旅行計劃 API

### 1. 獲取用戶旅行計劃列表

- **URL**: `/travel-plans`
- **方法**: `GET`
- **描述**: 獲取當前用戶的所有旅行計劃
- **需要身份驗證**: 是
- **查詢參數**:
  - `page`: 頁碼 (默認: 1)
  - `limit`: 每頁項目數 (默認: 10)
- **成功回應** (200 OK):
```json
{
  "success": true,
  "plans": [
    {
      "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0",
      "title": "東京5日遊",
      "destination": "東京",
      "start_date": "2023-12-01",
      "end_date": "2023-12-05",
      "created_at": "2023-10-20T14:30:45.123Z",
      "updated_at": "2023-10-20T14:30:45.123Z",
      "is_public": false
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```
- **Postman 測試範例**:
  - 方法: `GET`
  - URL: `http://localhost:5000/api/travel-plans?page=1&limit=10`
  - Headers: 
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`

### 2. 獲取特定旅行計劃詳情

- **URL**: `/travel-plans/{plan_id}`
- **方法**: `GET`
- **描述**: 獲取指定ID的旅行計劃詳細資訊
- **需要身份驗證**: 是
- **路徑參數**:
  - `plan_id`: 旅行計劃ID
- **成功回應** (200 OK):
```json
{
  "success": true,
  "plan": {
    "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0",
    "user_id": "67d7d190dc53d80cf563d5e9",
    "title": "東京5日遊",
    "destination": "東京",
    "start_date": "2023-12-01",
    "end_date": "2023-12-05",
    "created_at": "2023-10-20T14:30:45.123Z",
    "updated_at": "2023-10-20T14:30:45.123Z",
    "is_public": false,
    "version": "1.0",
    "days": [...],
    "transportation": {...},
    "accommodation": {...},
    "budget_estimate": {...},
    "weather_forecast": {...},
    "additional_info": {...}
  }
}
```
- **Postman 測試範例**:
  - 方法: `GET`
  - URL: `http://localhost:5000/api/travel-plans/67d8a1b2c3d4e5f6g7h8i9j0`
  - Headers: 
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`

### 3. 創建新旅行計劃

- **URL**: `/travel-plans`
- **方法**: `POST`
- **描述**: 手動創建新的旅行計劃
- **需要身份驗證**: 是
- **請求體**:
```json
{
  "title": "自製東京之旅",
  "destination": "東京",
  "start_date": "2023-12-01",
  "end_date": "2023-12-05",
  "days": [...],
  "transportation": {...},
  "accommodation": {...},
  "budget_estimate": {...},
  "weather_forecast": {...},
  "additional_info": {...}
}
```
- **成功回應** (201 Created):
```json
{
  "success": true,
  "message": "旅行計劃創建成功",
  "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0"
}
```
- **Postman 測試範例**:
  - 方法: `POST`
  - URL: `http://localhost:5000/api/travel-plans`
  - Headers: 
    - `Content-Type: application/json`
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`
  - Body (raw, JSON):
  ```json
  {
    "title": "自製東京之旅",
    "destination": "東京",
    "start_date": "2023-12-01",
    "end_date": "2023-12-05",
    "days": [
      {
        "day": 1,
        "date": "2023-12-01",
        "summary": "抵達東京，參觀淺草寺和晴空塔",
        "schedule": [
          {
            "time": "10:00",
            "name": "淺草寺",
            "type": "景點",
            "lat": 35.7148,
            "lng": 139.7967,
            "description": "東京最古老的寺廟，有雷門和仲見世通"
          }
        ]
      }
    ],
    "transportation": {
      "arrival": {
        "type": "飛機",
        "details": "抵達成田機場"
      },
      "departure": {
        "type": "飛機",
        "details": "從羽田機場出發"
      },
      "local": {
        "options": [
          {
            "type": "地鐵",
            "details": "使用東京地鐵通票"
          }
        ]
      }
    },
    "accommodation": {
      "name": "東京新宿京王廣場酒店",
      "address": "東京都新宿區西新宿2-2-1",
      "lat": 35.6895,
      "lng": 139.6917,
      "description": "位於新宿商業區，交通便利"
    }
  }
  ```

### 4. 自動生成旅行計劃

- **URL**: `/travel-plans/generate`
- **方法**: `POST`
- **描述**: 自動生成旅行計劃並儲存到數據庫
- **需要身份驗證**: 是
- **請求體**:
```json
{
  "destination": "東京",
  "start_date": "2023-12-01",
  "end_date": "2023-12-05",
  "budget": "中",
  "interests": ["歷史", "美食", "文化體驗"],
  "preference": "輕鬆",
  "companions": "家庭"
}
```
- **成功回應** (201 Created):
```json
{
  "success": true,
  "message": "旅行計劃生成成功",
  "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0"
}
```
- **Postman 測試範例**:
  - 方法: `POST`
  - URL: `http://localhost:5000/api/travel-plans/generate`
  - Headers: 
    - `Content-Type: application/json`
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`
  - Body (raw, JSON):
  ```json
  {
    "destination": "京都",
    "start_date": "2023-12-01",
    "end_date": "2023-12-03",
    "budget": "中",
    "interests": ["歷史", "文化體驗"],
    "preference": "輕鬆",
    "companions": "家庭"
  }
  ```

### 5. 更新旅行計劃

- **URL**: `/travel-plans/{plan_id}`
- **方法**: `PUT`
- **描述**: 更新指定ID的旅行計劃
- **需要身份驗證**: 是
- **路徑參數**:
  - `plan_id`: 旅行計劃ID
- **請求體**:
```json
{
  "title": "修改後的東京之旅",
  "is_public": true,
  "days": [...]
}
```
- **成功回應** (200 OK):
```json
{
  "success": true,
  "message": "旅行計劃更新成功"
}
```
- **Postman 測試範例**:
  - 方法: `PUT`
  - URL: `http://localhost:5000/api/travel-plans/67d8a1b2c3d4e5f6g7h8i9j0`
  - Headers: 
    - `Content-Type: application/json`
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`
  - Body (raw, JSON):
  ```json
  {
    "title": "修改後的京都之旅",
    "is_public": true,
    "days": [
      {
        "day": 1,
        "date": "2023-12-01",
        "summary": "抵達京都，參觀清水寺",
        "schedule": [
          {
            "time": "14:00",
            "name": "清水寺",
            "type": "景點",
            "lat": 34.9949,
            "lng": 135.7851,
            "description": "京都最著名的寺廟之一，擁有壯觀的木造平台"
          }
        ]
      }
    ]
  }
  ```

### 6. 刪除旅行計劃

- **URL**: `/travel-plans/{plan_id}`
- **方法**: `DELETE`
- **描述**: 刪除指定ID的旅行計劃
- **需要身份驗證**: 是
- **路徑參數**:
  - `plan_id`: 旅行計劃ID
- **成功回應** (200 OK):
```json
{
  "success": true,
  "message": "旅行計劃刪除成功"
}
```
- **Postman 測試範例**:
  - 方法: `DELETE`
  - URL: `http://localhost:5000/api/travel-plans/67d8a1b2c3d4e5f6g7h8i9j0`
  - Headers: 
    - `Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2N2Q3ZDE5MGRjNTNkODBjZjU2M2Q1ZTkiLCJpYXQiOjE3NDI1MzM5NTcsImV4cCI6MTc0MjYyMDM1N30.uC8Zko-D-A-aJK3VmXthYw4wri7PST3g5grKKbJNgVM`

### 7. 獲取公開旅行計劃

- **URL**: `/travel-plans/public`
- **方法**: `GET`
- **描述**: 獲取所有公開的旅行計劃
- **需要身份驗證**: 否
- **查詢參數**:
  - `page`: 頁碼 (默認: 1)
  - `limit`: 每頁項目數 (默認: 10)
- **成功回應** (200 OK):
```json
{
  "success": true,
  "plans": [
    {
      "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0",
      "title": "東京5日遊",
      "destination": "東京",
      "start_date": "2023-12-01",
      "end_date": "2023-12-05",
      "created_at": "2023-10-20T14:30:45.123Z",
      "updated_at": "2023-10-20T14:30:45.123Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1
}
```
- **Postman 測試範例**:
  - 方法: `GET`
  - URL: `http://localhost:5000/api/travel-plans/public?page=1&limit=10`

### 8. 搜索旅行計劃

- **URL**: `/travel-plans/search`
- **方法**: `GET`
- **描述**: 根據關鍵字搜索旅行計劃
- **需要身份驗證**: 否
- **查詢參數**:
  - `q`: 搜索關鍵字
  - `page`: 頁碼 (默認: 1)
  - `limit`: 每頁項目數 (默認: 10)
- **成功回應** (200 OK):
```json
{
  "success": true,
  "plans": [
    {
      "plan_id": "67d8a1b2c3d4e5f6g7h8i9j0",
      "title": "東京5日遊",
      "destination": "東京",
      "start_date": "2023-12-01",
      "end_date": "2023-12-05",
      "created_at": "2023-10-20T14:30:45.123Z",
      "updated_at": "2023-10-20T14:30:45.123Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "query": "東京"
}
```
- **Postman 測試範例**:
  - 方法: `GET`
  - URL: `http://localhost:5000/api/travel-plans/search?q=東京&page=1&limit=10`

---

## 錯誤處理

所有 API 在發生錯誤時會返回適當的 HTTP 狀態碼和錯誤訊息：

```json
{
  "success": false,
  "message": "錯誤訊息描述"
}
```

常見的錯誤狀態碼：
- `400 Bad Request`: 請求參數錯誤或缺失
- `401 Unauthorized`: 未提供有效的認證令牌或令牌已過期
- `403 Forbidden`: 無權訪問指定資源
- `404 Not Found`: 請求的資源不存在
- `500 Internal Server Error`: 服務器內部錯誤

---

## 注意事項

1. JWT Token 的有效期為一天，過期後需要重新登錄獲取新的 Token
2. 所有時間戳均使用 ISO 8601 格式 (例如: "2023-10-20T14:30:45.123Z")
3. 所有 ID 使用 MongoDB ObjectId 格式，作為字符串傳輸
4. 旅行計劃生成依賴於外部 API (OpenAI, Google Places)，可能需要較長時間響應 