#!/bin/bash

# API 基本URL
BASE_URL="http://localhost:5000/api"

# 顏色設定
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# 清除螢幕
clear

echo -e "${BLUE}===== TRAVO API 測試工具 =====${NC}"
echo -e "${YELLOW}確保後端服務器正在運行於 ${BASE_URL} ${NC}"

# 測試伺服器連接
echo -e "\n${PURPLE}檢查伺服器連接...${NC}"
SERVER_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/auth/login" -m 5)
if [ "$SERVER_CHECK" == "000" ]; then
  echo -e "${RED}無法連接到伺服器，請確保 Flask 應用正在運行。${NC}"
  exit 1
elif [ "$SERVER_CHECK" == "404" ]; then
  echo -e "${YELLOW}警告：伺服器運行中，但登入端點無法訪問。請檢查 API 路徑。${NC}"
  echo "嘗試的端點: ${BASE_URL}/auth/login"
else
  echo -e "${GREEN}伺服器連接正常 (HTTP 狀態碼: $SERVER_CHECK)${NC}"
fi

# 設定用戶資訊
TEST_USER_NAME="測試用戶"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASSWORD="password123"

# 第一步：註冊新用戶
echo -e "\n${PURPLE}步驟 1：註冊新用戶${NC}"
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"$TEST_USER_NAME\",
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"$TEST_USER_PASSWORD\"
  }" \
  "${BASE_URL}/auth/register")

# 檢查註冊回應
if echo "$REGISTER_RESPONSE" | grep -q '"success":true' || echo "$REGISTER_RESPONSE" | grep -q '"id":\|"_id":\|"userId":'; then
  echo -e "${GREEN}用戶註冊成功！${NC}"
  echo -e "用戶名: ${TEST_USER_NAME}"
  echo -e "電子郵件: ${TEST_USER_EMAIL}"
  echo -e "密碼: ${TEST_USER_PASSWORD}"
  echo $REGISTER_RESPONSE | python -m json.tool
else
  # 如果註冊失敗，可能是用戶已存在，繼續嘗試登入
  echo -e "${YELLOW}用戶可能已存在，將嘗試直接登入。${NC}"
  echo "回應: $REGISTER_RESPONSE"
fi

# 第二步：登入並獲取令牌
echo -e "\n${PURPLE}步驟 2：登入並獲取令牌${NC}"
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"$TEST_USER_PASSWORD\"
  }" \
  "${BASE_URL}/auth/login")

echo -e "${GREEN}登入原始回應:${NC} $LOGIN_RESPONSE"

# 使用 Python 檢查成功標誌和提取令牌
JSON_CHECK=$(echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success') == True:
        print('success')
    else:
        print('failure')
except Exception as e:
    print('error: ' + str(e))
")

# 根據 Python 檢查結果處理
if [ "$JSON_CHECK" == "success" ]; then
  # 提取令牌和用戶 ID
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('token', ''))
except Exception as e:
    print('')
  ")
  
  USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('user_id', ''))
except Exception as e:
    print('')
  ")

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}無法從響應中提取令牌。${NC}"
    echo "登入響應 JSON 格式不符預期。"
    exit 1
  else
    echo -e "${GREEN}登入成功！已獲取令牌。${NC}"
    # 截斷長令牌顯示
    SHORTENED_TOKEN="${TOKEN:0:20}...${TOKEN: -20}"
    echo -e "令牌: ${SHORTENED_TOKEN}"
    echo -e "用戶 ID: ${USER_ID}"
  fi
elif [ "$JSON_CHECK" == "failure" ]; then
  echo -e "${RED}登入失敗，API 回應中 success 欄位不為 true。${NC}"
  echo "回應: $LOGIN_RESPONSE"
  exit 1
else
  # JSON 解析錯誤
  echo -e "${RED}無法解析 JSON 響應。錯誤: ${JSON_CHECK#error: }${NC}"
  echo "原始回應: $LOGIN_RESPONSE"
  
  # 嘗試使用正則表達式提取令牌
  echo -e "${YELLOW}嘗試使用備用方法提取令牌...${NC}"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | sed 's/"token":"//')
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}備用提取方法也失敗，無法繼續。${NC}"
    exit 1
  else
    echo -e "${GREEN}使用備用方法成功提取令牌！${NC}"
    SHORTENED_TOKEN="${TOKEN:0:20}...${TOKEN: -20}"
    echo -e "令牌: ${SHORTENED_TOKEN}"
  fi
fi

# 第三步：獲取用戶資料
echo -e "\n${PURPLE}步驟 3：獲取用戶資料${NC}"
PROFILE_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/auth/profile")

echo -e "${GREEN}用戶資料：${NC}"
echo $PROFILE_RESPONSE | python -m json.tool || echo $PROFILE_RESPONSE

# 第四步：獲取所有旅行計劃
echo -e "\n${PURPLE}步驟 4：獲取所有旅行計劃${NC}"
ALL_PLANS_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/travel-plans")

echo -e "${GREEN}所有旅行計劃：${NC}"
echo $ALL_PLANS_RESPONSE | python -m json.tool || echo $ALL_PLANS_RESPONSE

# 第五步：生成京都旅行計劃
echo -e "\n${PURPLE}步驟 5：生成京都旅行計劃${NC}"
echo -e "${YELLOW}注意：這可能需要幾秒鐘...${NC}"
KYOTO_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --max-time 120 \
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

# 使用 Python 解析複雜 JSON 提取計劃 ID
KYOTO_PLAN_ID=$(echo "$KYOTO_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # 嘗試不同可能的鍵
    plan_id = data.get('plan_id', '') or data.get('id', '') or data.get('_id', '')
    if not plan_id and 'data' in data:
        plan_id = data['data'].get('plan_id', '') or data['data'].get('id', '') or data['data'].get('_id', '')
    print(plan_id)
except Exception as e:
    print('')
")

if [ -n "$KYOTO_PLAN_ID" ]; then
  echo -e "${GREEN}京都旅行計劃生成成功！計劃 ID: $KYOTO_PLAN_ID${NC}"
  
  # 獲取京都計劃詳情
  echo -e "\n${BLUE}獲取京都計劃詳情${NC}"
  KYOTO_DETAILS=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE_URL}/travel-plans/$KYOTO_PLAN_ID")
  
  echo -e "${GREEN}京都計劃詳情 (部分資訊)：${NC}"
  echo $KYOTO_DETAILS | python -m json.tool | head -n 20 || echo $KYOTO_DETAILS
  echo -e "${YELLOW}...[輸出被截斷]...${NC}"
else
  echo -e "${RED}京都旅行計劃生成失敗或無法提取計劃 ID。${NC}"
  echo -e "${YELLOW}生成回應 (可能很長，只顯示前 300 字節)：${NC}"
  echo "${KYOTO_RESPONSE:0:300}..."
  # 繼續執行其他步驟而不是退出
  echo -e "${YELLOW}將跳過後續依賴此計劃 ID 的步驟。${NC}"
  # 設置一個虛擬 ID，以便腳本可以繼續
  KYOTO_PLAN_ID="invalid_id_placeholder"
fi

# 第六步：生成東京旅行計劃
echo -e "\n${PURPLE}步驟 6：生成東京旅行計劃${NC}"
echo -e "${YELLOW}注意：這可能需要幾秒鐘...${NC}"
TOKYO_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  --max-time 120 \
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

# 使用相同的 Python 方法解析東京計劃 ID
TOKYO_PLAN_ID=$(echo "$TOKYO_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # 嘗試不同可能的鍵
    plan_id = data.get('plan_id', '') or data.get('id', '') or data.get('_id', '')
    if not plan_id and 'data' in data:
        plan_id = data['data'].get('plan_id', '') or data['data'].get('id', '') or data['data'].get('_id', '')
    print(plan_id)
except Exception as e:
    print('')
")

if [ -n "$TOKYO_PLAN_ID" ]; then
  echo -e "${GREEN}東京旅行計劃生成成功！計劃 ID: $TOKYO_PLAN_ID${NC}"
  
  # 獲取東京計劃詳情
  echo -e "\n${BLUE}獲取東京計劃詳情${NC}"
  TOKYO_DETAILS=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "${BASE_URL}/travel-plans/$TOKYO_PLAN_ID")
  
  echo -e "${GREEN}東京計劃詳情 (部分資訊)：${NC}"
  echo $TOKYO_DETAILS | python -m json.tool | head -n 20 || echo $TOKYO_DETAILS
  echo -e "${YELLOW}...[輸出被截斷]...${NC}"
  
  # 更新東京計劃
  echo -e "\n${PURPLE}步驟 7：更新東京計劃${NC}"
  UPDATE_RESPONSE=$(curl -s -X PUT \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "metadata": {
        "preference": "活躍",
        "notes": "測試更新功能"
      }
    }' \
    "${BASE_URL}/travel-plans/$TOKYO_PLAN_ID")
  
  echo -e "${GREEN}更新回應：${NC}"
  echo $UPDATE_RESPONSE | python -m json.tool || echo $UPDATE_RESPONSE
  
  # 只有當京都計劃成功創建時才嘗試刪除
  if [ "$KYOTO_PLAN_ID" != "invalid_id_placeholder" ]; then
    echo -e "\n${PURPLE}步驟 8：刪除京都計劃${NC}"
    DELETE_RESPONSE=$(curl -s -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "${BASE_URL}/travel-plans/$KYOTO_PLAN_ID")
    
    echo -e "${GREEN}刪除回應：${NC}"
    echo $DELETE_RESPONSE | python -m json.tool || echo $DELETE_RESPONSE
  else
    echo -e "\n${YELLOW}跳過步驟 8：因為京都計劃未成功創建，所以不執行刪除操作。${NC}"
  fi
else
  echo -e "${RED}東京旅行計劃生成失敗或無法提取計劃 ID。${NC}"
  echo -e "${YELLOW}生成回應 (可能很長，只顯示前 300 字節)：${NC}"
  echo "${TOKYO_RESPONSE:0:300}..."
fi

# 查看剩餘的旅行計劃
echo -e "\n${PURPLE}步驟 9：查看剩餘的旅行計劃${NC}"
REMAINING_PLANS=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "${BASE_URL}/travel-plans")

echo -e "${GREEN}剩餘旅行計劃：${NC}"
echo $REMAINING_PLANS | python -m json.tool || echo $REMAINING_PLANS

echo -e "\n${BLUE}===== 測試完成 =====${NC}"
echo -e "${GREEN}所有 API 功能已測試！${NC}"
echo -e "${YELLOW}備註：您可以將此腳本作為演示工具，或使用 Postman 進行更詳細的 API 展示。${NC}" 