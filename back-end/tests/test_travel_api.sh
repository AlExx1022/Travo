#!/bin/bash

# API 基本URL
BASE_URL="http://localhost:5000/api"

# 顏色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== 開始測試旅行計劃 API =====${NC}"

# 第一步：登入並獲取令牌
echo -e "\n${BLUE}步驟 1：登入並獲取令牌${NC}"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' \
  "${BASE_URL}/auth/login")

# 解析令牌
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}登入失敗，無法獲取令牌。${NC}"
  echo "回應: $LOGIN_RESPONSE"
  exit 1
else
  echo -e "${GREEN}登入成功！已獲取令牌。${NC}"
fi

# 第二步：生成京都旅行計劃
echo -e "\n${BLUE}步驟 2：生成京都旅行計劃${NC}"
KYOTO_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "destination": "京都",
    "start_date": "2023-10-01",
    "end_date": "2023-10-03",
    "budget": "中",
    "interests": ["歷史", "美食"],
    "preference": "輕鬆",
    "companions": "個人"
  }' \
  "${BASE_URL}/travel-plans/generate")

# 檢查回應是否成功
if echo "$KYOTO_RESPONSE" | grep -q '"success":true'; then
  PLAN_ID=$(echo $KYOTO_RESPONSE | grep -o '"plan_id":"[^"]*' | sed 's/"plan_id":"//')
  echo -e "${GREEN}京都旅行計劃生成成功！計劃 ID: $PLAN_ID${NC}"
else
  echo -e "${RED}京都旅行計劃生成失敗。${NC}"
  echo "回應: $KYOTO_RESPONSE"
fi

# 第三步：生成東京旅行計劃
echo -e "\n${BLUE}步驟 3：生成東京旅行計劃${NC}"
TOKYO_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "destination": "東京",
    "start_date": "2023-11-10",
    "end_date": "2023-11-15",
    "budget": "高",
    "interests": ["購物", "科技", "現代文化"],
    "preference": "充實",
    "companions": "朋友"
  }' \
  "${BASE_URL}/travel-plans/generate")

# 檢查回應是否成功
if echo "$TOKYO_RESPONSE" | grep -q '"success":true'; then
  PLAN_ID=$(echo $TOKYO_RESPONSE | grep -o '"plan_id":"[^"]*' | sed 's/"plan_id":"//')
  echo -e "${GREEN}東京旅行計劃生成成功！計劃 ID: $PLAN_ID${NC}"
else
  echo -e "${RED}東京旅行計劃生成失敗。${NC}"
  echo "回應: $TOKYO_RESPONSE"
fi

echo -e "\n${BLUE}===== 測試完成 =====${NC}" 