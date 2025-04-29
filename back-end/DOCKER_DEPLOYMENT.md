# Docker 部署指南

本文檔提供如何使用 Docker 容器化和部署後端應用程式的步驟。

## 本地開發與測試

### 使用 docker-compose 進行本地開發

```bash
# 啟動開發環境
docker-compose up

# 在後台運行
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止服務
docker-compose down
```

### 手動構建與運行 Docker 映像

```bash
# 構建 Docker 映像
docker build -t travo-backend .

# 運行容器
docker run -p 8080:8080 --env-file .env travo-backend

# 以生產模式運行
docker run -p 8080:8080 --env-file .env -e FLASK_ENV=production travo-backend
```

## 部署到 Google Cloud Platform (GCP)

### 1. 設置 GCP 專案並啟用 API

```bash
# 安裝 gcloud CLI (如未安裝)
# 參考: https://cloud.google.com/sdk/docs/install

# 初始化 gcloud
gcloud init

# 選擇專案
gcloud config set project YOUR_PROJECT_ID

# 啟用必要的 API
gcloud services enable containerregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. 設置環境變數和密鑰

```bash
# 將 MongoDB 連接字串存入 Secret Manager
echo -n "mongodb+srv://admin123:PiSFks0aDAKzkee4@cluster0.yrhlv5u.mongodb.net/travo?retryWrites=true&w=majority&appName=Cluster0" | \
gcloud secrets create mongo-uri --data-file=-

# 設置其他必要的密鑰
echo -n "your_secret_key_here" | gcloud secrets create secret-key --data-file=-
echo -n "YOUR_OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=-
echo -n "YOUR_GOOGLE_PLACES_API_KEY" | gcloud secrets create google-places-api-key --data-file=-
```

### 3. 構建並推送映像到 Google Container Registry

```bash
# 設置 Docker 使用 gcloud 認證
gcloud auth configure-docker

# 構建和標記映像
docker build -t gcr.io/YOUR_PROJECT_ID/travo-backend .

# 推送到容器註冊表
docker push gcr.io/YOUR_PROJECT_ID/travo-backend
```

### 4. 部署到 Cloud Run

```bash
gcloud run deploy travo-api \
  --image gcr.io/YOUR_PROJECT_ID/travo-backend \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-secrets=MONGO_URI=mongo-uri:latest,SECRET_KEY=secret-key:latest,OPENAI_API_KEY=openai-api-key:latest,GOOGLE_PLACES_API_KEY=google-places-api-key:latest \
  --set-env-vars="FLASK_ENV=production"
```

### 5. 獲取部署 URL

```bash
gcloud run services describe travo-api --platform managed --region asia-east1 --format="value(status.url)"
```

## 常見問題與解決方案

### 連接問題
- 確保在 MongoDB Atlas 中已將 GCP Cloud Run 的 IP 範圍添加到白名單

### 環境變數問題
- 檢查所有必要的環境變數是否已正確設置
- 檢查 Secret Manager 是否正確配置

### 容器無法啟動
- 檢查 Dockerfile 中的命令是否正確
- 查看 Cloud Run 日誌以獲取錯誤訊息

## 更新部署

要更新部署，只需重新構建映像並推送，然後部署新版本：

```bash
docker build -t gcr.io/YOUR_PROJECT_ID/travo-backend .
docker push gcr.io/YOUR_PROJECT_ID/travo-backend
gcloud run deploy travo-api --image gcr.io/YOUR_PROJECT_ID/travo-backend
``` 